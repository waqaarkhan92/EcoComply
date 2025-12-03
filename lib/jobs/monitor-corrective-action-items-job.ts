/**
 * Monitor Corrective Action Items Job
 * Sends reminders for upcoming action item due dates
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 10.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface MonitorCorrectiveActionItemsJobInput {
  company_id?: string;
  batch_size?: number;
}

const REMINDER_RULES = {
  advance_notice_days: 3,
  overdue_reminder_frequency: 1,
  escalation_threshold_days: 7,
};

function determineNotificationPriority(daysOverdue: number): 'HIGH' | 'URGENT' {
  return daysOverdue > 0 ? 'URGENT' : 'HIGH';
}

function shouldEscalateToManagers(daysOverdue: number): boolean {
  return daysOverdue > REMINDER_RULES.escalation_threshold_days;
}

export async function processMonitorCorrectiveActionItemsJob(
  job: Job<MonitorCorrectiveActionItemsJobInput>
): Promise<void> {
  const { company_id, batch_size = 200 } = job.data;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + REMINDER_RULES.advance_notice_days);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0];

    // Step 1: Query action items needing reminders (due in 3 days OR already overdue)
    let query = supabaseAdmin
      .from('corrective_action_items')
      .select(`
        id,
        item_title,
        due_date,
        assigned_to,
        status,
        corrective_action_id,
        corrective_actions!inner(
          id,
          corrective_action_name,
          company_id,
          site_id
        ),
        users!corrective_action_items_assigned_to_fkey(id, email, full_name)
      `)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .or(`due_date.eq.${todayStr},due_date.lte.${todayStr},due_date.eq.${threeDaysFromNowStr}`)
      .order('due_date', { ascending: true })
      .limit(batch_size);

    if (company_id) {
      query = query.eq('corrective_actions.company_id', company_id);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      throw new Error(`Failed to fetch corrective action items: ${itemsError.message}`);
    }

    if (!items || items.length === 0) {
      console.log('No corrective action items needing reminders found');
      return;
    }

    let remindersSent = 0;
    let escalationsSent = 0;

    // Step 2: Process each item
    for (const item of items) {
      try {
        const action = (item.corrective_action_items as any) || item.corrective_actions;
        const assignee = item.users as any;

        if (!action || !item.due_date) {
          continue;
        }

        // Calculate days overdue
        const dueDate = new Date(item.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Only process if due in 3 days or already overdue
        if (daysOverdue > 0 || item.due_date === threeDaysFromNowStr || item.due_date === todayStr) {
          const priority = determineNotificationPriority(daysOverdue);
          const notificationType = daysOverdue > 0
            ? 'CORRECTIVE_ACTION_ITEM_OVERDUE'
            : 'CORRECTIVE_ACTION_ITEM_DUE_SOON';

          const subject = daysOverdue > 0
            ? 'Corrective Action Item Overdue'
            : 'Corrective Action Item Due in 3 Days';

          const bodyText = daysOverdue > 0
            ? `The corrective action item "${item.item_title}" is ${daysOverdue} day(s) overdue. Please complete it as soon as possible.`
            : `The corrective action item "${item.item_title}" is due in 3 days. Please ensure it is completed on time.`;

          const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
          const actionUrl = `${baseUrl}/module-2/corrective-actions/${action.id}/items/${item.id}`;

          // Send reminder to assigned user
          if (assignee && assignee.email) {
            const { error: notifyError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: assignee.id,
                company_id: action.company_id,
                site_id: action.site_id,
                recipient_email: assignee.email,
                notification_type: notificationType,
                channel: 'EMAIL, IN_APP',
                priority: priority,
                subject: subject,
                body_text: bodyText,
                body_html: null,
                entity_type: 'corrective_action_item',
                entity_id: item.id,
                action_url: actionUrl,
                variables: {
                  item_title: item.item_title,
                  due_date: item.due_date,
                  days_overdue: daysOverdue,
                  corrective_action_name: action.corrective_action_name,
                  action_url: actionUrl,
                },
                status: 'PENDING',
                scheduled_for: new Date().toISOString(),
              });

            if (!notifyError) {
              remindersSent++;
            }
          }

          // Step 3: Escalate severely overdue items (> 7 days)
          if (shouldEscalateToManagers(daysOverdue)) {
            const { data: managers, error: managersError } = await supabaseAdmin
              .from('users')
              .select('id, email, full_name')
              .eq('company_id', action.company_id)
              .in('id', await getRoleUserIds(action.company_id, ['ADMIN', 'OWNER']));

            if (!managersError && managers && managers.length > 0) {
              const escalationNotifications = managers.map((manager: any) => ({
                user_id: manager.id,
                company_id: action.company_id,
                site_id: action.site_id,
                recipient_email: manager.email,
                notification_type: 'CORRECTIVE_ACTION_ITEM_OVERDUE',
                channel: 'EMAIL, IN_APP',
                priority: 'URGENT',
                subject: `URGENT: Corrective Action Item Overdue - ${daysOverdue} Days`,
                body_text: `The corrective action item "${item.item_title}" in "${action.corrective_action_name}" has been overdue for ${daysOverdue} days. Immediate attention required.`,
                body_html: null,
                entity_type: 'corrective_action_item',
                entity_id: item.id,
                action_url: actionUrl,
                variables: {
                  item_title: item.item_title,
                  due_date: item.due_date,
                  days_overdue: daysOverdue,
                  corrective_action_name: action.corrective_action_name,
                  action_url: actionUrl,
                },
                status: 'PENDING',
                scheduled_for: new Date().toISOString(),
              }));

              const { error: escalationError } = await supabaseAdmin
                .from('notifications')
                .insert(escalationNotifications);

              if (!escalationError) {
                escalationsSent += escalationNotifications.length;
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing corrective action item ${item.id}:`, error);
        continue;
      }
    }

    console.log(
      `Monitor corrective action items completed: ${remindersSent} reminders sent, ${escalationsSent} escalations sent`
    );
  } catch (error: any) {
    console.error('Error in monitor corrective action items job:', error);
    throw error;
  }
}

async function getRoleUserIds(companyId: string, roles: string[]): Promise<string[]> {
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .in('role', roles);

  if (!userRoles) return [];

  const userIds = userRoles.map((ur: any) => ur.user_id);

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .in('id', userIds);

  return users?.map((u: any) => u.id) || [];
}

