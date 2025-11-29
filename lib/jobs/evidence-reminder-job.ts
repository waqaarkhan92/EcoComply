/**
 * Evidence Reminder Job
 * Sends notifications for obligations requiring evidence
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 2.3
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface EvidenceReminderJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEvidenceReminderJob(job: Job<EvidenceReminderJobData>): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    const now = new Date();
    const gracePeriodDays = 7; // 7 days grace period after deadline

    // Query obligations that:
    // 1. Are active
    // 2. Have passed their deadline (deadline_date < now)
    // 3. Have no linked evidence (or evidence is archived)
    // 4. Are past grace period (deadline_date + 7 days < now)
    let query = supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        site_id,
        original_text,
        obligation_title,
        obligation_description,
        deadline_date,
        sites!inner(id, name, company_id)
      `)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .not('deadline_date', 'is', null)
      .lt('deadline_date', now.toISOString().split('T')[0]);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: obligations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    if (!obligations || obligations.length === 0) {
      console.log('No obligations requiring evidence reminders');
      return;
    }

    // Check which obligations have no linked evidence
    const obligationsNeedingEvidence: any[] = [];

    for (const obligation of obligations) {
      // Check if obligation has active evidence links
      const { data: evidenceLinks } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select('id')
        .eq('obligation_id', obligation.id)
        .is('deleted_at', null)
        .limit(1);

      if (!evidenceLinks || evidenceLinks.length === 0) {
        // Check if past grace period
        const deadlineDate = new Date(obligation.deadline_date);
        const gracePeriodEnd = new Date(deadlineDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

        if (now >= gracePeriodEnd) {
          obligationsNeedingEvidence.push(obligation);
        }
      }
    }

    if (obligationsNeedingEvidence.length === 0) {
      console.log('No obligations past grace period requiring evidence');
      return;
    }

    // Create notifications for each obligation
    let remindersCreated = 0;

    for (const obligation of obligationsNeedingEvidence) {
      try {
        const site = (obligation as any).sites;

        // Check if reminder already sent in last 24 hours
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('entity_type', 'obligation')
          .eq('entity_id', obligation.id)
          .eq('notification_type', 'EVIDENCE_REMINDER')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotification) {
          continue; // Already reminded in last 24 hours
        }

        // Get users who should receive this reminder
        const { data: users } = await supabaseAdmin
          .from('users')
          .select(`
            id,
            email,
            full_name,
            company_id,
            user_roles!inner(role)
          `)
          .eq('company_id', site.company_id)
          .in('user_roles.role', ['OWNER', 'ADMIN', 'STAFF'])
          .eq('is_active', true)
          .is('deleted_at', null);

        if (users && users.length > 0) {
          const notifications = users.map((user: any) => ({
            user_id: user.id,
            company_id: site.company_id,
            site_id: site.id,
            recipient_email: user.email,
            notification_type: 'EVIDENCE_REMINDER',
            channel: 'EMAIL',
            priority: 'HIGH',
            subject: `Evidence Required: ${obligation.obligation_title || 'Obligation'}`,
            body_text: `The obligation "${obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100) || 'Obligation'}" requires evidence. The deadline has passed and no evidence has been linked.`,
            entity_type: 'obligation',
            entity_id: obligation.id,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
          }));

          await supabaseAdmin.from('notifications').insert(notifications);
          remindersCreated++;
        }
      } catch (error: any) {
        console.error(`Error processing obligation ${obligation.id}:`, error);
        // Continue with next obligation
      }
    }

    console.log(`Evidence reminder job completed: ${remindersCreated} reminders created`);
  } catch (error: any) {
    console.error('Evidence reminder job failed:', error);
    throw error;
  }
}

