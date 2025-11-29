/**
 * Deadline Alert Job
 * Sends notifications for upcoming deadlines (7/3/1 day warnings)
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 2.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface DeadlineAlertJobData {
  company_id?: string;
  site_id?: string;
}

export async function processDeadlineAlertJob(job: Job<DeadlineAlertJobData>): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    const now = new Date();
    const alertsCreated = {
      '7_DAYS': 0,
      '3_DAYS': 0,
      '1_DAY': 0,
    };

    // Calculate alert dates
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0];

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysDate = threeDaysFromNow.toISOString().split('T')[0];

    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayDate = oneDayFromNow.toISOString().split('T')[0];

    // Query deadlines due in 7, 3, or 1 days
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        obligation_id,
        due_date,
        status,
        obligations!inner(
          id,
          company_id,
          site_id,
          original_text,
          obligation_title,
          obligation_description,
          category,
          sites!inner(id, name, company_id)
        )
      `)
      .eq('status', 'PENDING')
      .in('due_date', [sevenDaysDate, threeDaysDate, oneDayDate]);

    if (company_id) {
      query = query.eq('obligations.company_id', company_id);
    }
    if (site_id) {
      query = query.eq('obligations.site_id', site_id);
    }

    const { data: deadlines, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines: ${error.message}`);
    }

    if (!deadlines || deadlines.length === 0) {
      console.log('No deadlines requiring alerts');
      return;
    }

    // Process each deadline
    for (const deadline of deadlines) {
      try {
        const obligation = (deadline as any).obligations;
        const site = (obligation as any).sites;
        const daysUntilDue = Math.ceil(
          (new Date(deadline.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine alert level
        let alertLevel: '7_DAYS' | '3_DAYS' | '1_DAY' | null = null;
        let priority: 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';

        if (daysUntilDue === 7) {
          alertLevel = '7_DAYS';
          priority = 'NORMAL';
        } else if (daysUntilDue === 3) {
          alertLevel = '3_DAYS';
          priority = 'HIGH';
        } else if (daysUntilDue === 1) {
          alertLevel = '1_DAY';
          priority = 'URGENT';
        }

        if (!alertLevel) {
          continue;
        }

        // Check if notification already sent for this deadline and alert level
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('entity_type', 'deadline')
          .eq('entity_id', deadline.id)
          .eq('notification_type', `DEADLINE_WARNING_${alertLevel}`)
          .single();

        if (existingNotification) {
          continue; // Already notified
        }

        // Get users who should receive this alert (Admin, Owner, Staff assigned to site)
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

        // Create notifications for each user
        if (users && users.length > 0) {
          const notifications = users.map((user: any) => ({
            user_id: user.id,
            company_id: site.company_id,
            site_id: site.id,
            recipient_email: user.email,
            notification_type: `DEADLINE_WARNING_${alertLevel}`,
            channel: 'EMAIL',
            priority,
            subject: `Deadline Alert: ${obligation.obligation_title || 'Obligation'} due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
            body_text: `The obligation "${obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100) || 'Obligation'}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (${deadline.due_date}).`,
            entity_type: 'deadline',
            entity_id: deadline.id,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
          }));

          await supabaseAdmin.from('notifications').insert(notifications);
          alertsCreated[alertLevel]++;
        }
      } catch (error: any) {
        console.error(`Error processing deadline ${deadline.id}:`, error);
        // Continue with next deadline
      }
    }

    console.log(
      `Deadline alert job completed: ${alertsCreated['7_DAYS']} (7d), ${alertsCreated['3_DAYS']} (3d), ${alertsCreated['1_DAY']} (1d) alerts created`
    );
  } catch (error: any) {
    console.error('Deadline alert job failed:', error);
    throw error;
  }
}

