/**
 * Escalation Check Job
 * Periodically checks for overdue obligations/deadlines and applies escalation workflows
 * Reference: docs/specs/30_Product_Business_Logic.md Section B.6.4
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 8.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  matchEscalationWorkflow,
  determineEscalationLevel,
  getEscalationRecipientsFromWorkflow,
  createOrUpdateEscalation,
  getSystemDefaultWorkflow,
  getCurrentEscalationLevel,
} from '@/lib/services/escalation-workflow-service';

export interface EscalationCheckJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEscalationCheckJob(
  job: Job<EscalationCheckJobData>
): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    // Step 1: Query all overdue obligations/deadlines from compliance_clocks_universal
    // where days_remaining < 0 (overdue)
    let clockQuery = supabaseAdmin
      .from('compliance_clocks_universal')
      .select(`
        id,
        company_id,
        site_id,
        entity_type,
        entity_id,
        days_remaining,
        clock_name,
        target_date
      `)
      .lt('days_remaining', 0)
      .eq('status', 'ACTIVE');

    if (company_id) {
      clockQuery = clockQuery.eq('company_id', company_id);
    }
    if (site_id) {
      clockQuery = clockQuery.eq('site_id', site_id);
    }

    const { data: overdueItems, error: clockError } = await clockQuery;

    if (clockError) {
      throw new Error(`Failed to fetch overdue items: ${clockError.message}`);
    }

    if (!overdueItems || overdueItems.length === 0) {
      console.log('No overdue items to check for escalation');
      return;
    }

    let escalated = 0;
    let checked = 0;

    // Step 2: Process each overdue item
    for (const item of overdueItems) {
      try {
        const daysOverdue = Math.abs(item.days_remaining);

        // Get obligation/deadline details to get category
        let obligationCategory: string | null = null;
        let entityDetails: any = null;

        if (item.entity_type === 'OBLIGATION') {
          const { data: obligation } = await supabaseAdmin
            .from('obligations')
            .select('id, category, obligation_title')
            .eq('id', item.entity_id)
            .single();

          if (obligation) {
            obligationCategory = obligation.category;
            entityDetails = obligation;
          }
        } else if (item.entity_type === 'DEADLINE') {
          const { data: deadline } = await supabaseAdmin
            .from('deadlines')
            .select(`
              id,
              obligation_id,
              obligations!inner(category, obligation_title)
            `)
            .eq('id', item.entity_id)
            .single();

          if (deadline) {
            obligationCategory = (deadline.obligations as any)?.category || null;
            entityDetails = deadline.obligations;
          }
        }

        if (!entityDetails) {
          continue; // Skip if entity not found
        }

        checked++;

        // Step 3: Match to escalation workflow
        const workflow = await matchEscalationWorkflow(
          item.company_id,
          obligationCategory,
          daysOverdue
        ) || getSystemDefaultWorkflow();

        // Step 4: Determine escalation level based on days_overdue
        const escalationLevel = determineEscalationLevel(daysOverdue, workflow);

        if (escalationLevel === 0) {
          continue; // Not yet reached threshold
        }

        // Step 5: Check current escalation status
        const currentLevel = await getCurrentEscalationLevel(
          item.entity_type.toLowerCase() as 'obligation' | 'deadline',
          item.entity_id
        );

        // If already at this level or higher, no action needed
        if (escalationLevel <= currentLevel) {
          continue;
        }

        // Step 6: Get recipients for this level
        const recipients = await getEscalationRecipientsFromWorkflow(workflow, escalationLevel);

        if (recipients.length === 0) {
          console.warn(`No recipients found for escalation level ${escalationLevel} in workflow ${workflow.id}`);
          continue;
        }

        // Step 7: Create/update escalation record
        const escalationId = await createOrUpdateEscalation(
          item.entity_type.toLowerCase() as 'obligation' | 'deadline',
          item.entity_id,
          item.company_id,
          item.site_id,
          escalationLevel,
          workflow,
          daysOverdue,
          recipients.map((r) => r.userId)
        );

        if (!escalationId) {
          continue; // Escalation record creation failed
        }

        // Step 8: Create notifications for recipients
        const notifications = recipients.map((recipient) => ({
          user_id: recipient.userId,
          company_id: item.company_id,
          site_id: item.site_id,
          recipient_email: recipient.email,
          notification_type: 'ESCALATION',
          channel: 'EMAIL',
          priority: escalationLevel >= 3 ? 'CRITICAL' : escalationLevel === 2 ? 'HIGH' : 'NORMAL',
          subject: `Level ${escalationLevel} Escalation: ${entityDetails.obligation_title || item.clock_name}`,
          body_text: `This ${item.entity_type.toLowerCase()} has been escalated to Level ${escalationLevel} after ${daysOverdue} days overdue.`,
          entity_type: item.entity_type.toLowerCase(),
          entity_id: item.entity_id,
          is_escalation: true,
          escalation_level: escalationLevel,
          escalation_state: `ESCALATED_LEVEL_${escalationLevel}`,
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: {
            escalation_id: escalationId,
            days_overdue: daysOverdue,
            workflow_id: workflow.id,
            workflow_name: (workflow as any).workflow_name || 'System Default',
          },
        }));

        await supabaseAdmin.from('notifications').insert(notifications);

        escalated++;
      } catch (error: any) {
        console.error(`Error processing escalation for ${item.entity_type} ${item.entity_id}:`, error);
        // Continue with next item
      }
    }

    console.log(
      `Escalation check job completed: ${checked} checked, ${escalated} escalated`
    );
  } catch (error: any) {
    console.error('Escalation check job failed:', error);
    throw error;
  }
}

