/**
 * SLA Breach Timers Job
 * Updates SLA breach duration for overdue deadlines
 * Runs hourly via cron
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface UpdateSLABreachTimersJobInput {
  company_id?: string;
  batch_size?: number;
}

export async function processSLABreachTimersJob(job: Job<UpdateSLABreachTimersJobInput>): Promise<void> {
  const { company_id, batch_size = 500 } = job.data;

  try {
    // Step 1: Query overdue deadlines with SLA breach
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        obligation_id,
        due_date,
        sla_target_date,
        sla_breached_at,
        sla_breach_duration_hours,
        status,
        company_id
      `)
      .not('sla_breached_at', 'is', null)
      .eq('status', 'OVERDUE')
      .order('sla_breached_at', { ascending: true })
      .limit(batch_size);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: deadlines, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch overdue deadlines: ${fetchError.message}`);
    }

    if (!deadlines || deadlines.length === 0) {
      console.log('No overdue deadlines with SLA breach found');
      return;
    }

    // Step 2: Calculate breach duration for each deadline
    const updates = deadlines.map((deadline) => {
      if (!deadline.sla_breached_at) {
        return null;
      }

      const breachStartTime = new Date(deadline.sla_breached_at).getTime();
      const now = Date.now();
      const breachDurationHours = Math.floor((now - breachStartTime) / (1000 * 60 * 60));

      return {
        id: deadline.id,
        sla_breach_duration_hours: breachDurationHours,
      };
    }).filter(Boolean) as Array<{ id: string; sla_breach_duration_hours: number }>;

    // Step 3: Batch update breach durations
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from('deadlines')
        .update({
          sla_breach_duration_hours: update.sla_breach_duration_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Failed to update deadline ${update.id}:`, updateError);
      }
    }

    // Step 4: Escalate long-running breaches (> 24 hours)
    const longRunningBreaches = updates.filter((u) => u.sla_breach_duration_hours > 24);

    if (longRunningBreaches.length > 0) {
      // Get obligation details for escalation notifications
      const deadlineIds = longRunningBreaches.map((b) => b.id);
      const { data: deadlineDetails, error: detailsError } = await supabaseAdmin
        .from('deadlines')
        .select(`
          id,
          obligation_id,
          sla_breach_duration_hours,
          obligations!inner(id, summary, assigned_to, company_id)
        `)
        .in('id', deadlineIds);

      if (!detailsError && deadlineDetails) {
        // Group by company for batch notification
        const breachesByCompany = new Map<string, typeof deadlineDetails>();

        for (const deadline of deadlineDetails) {
          const companyId = (deadline.obligations as any)?.company_id;
          if (companyId) {
            if (!breachesByCompany.has(companyId)) {
              breachesByCompany.set(companyId, []);
            }
            breachesByCompany.get(companyId)!.push(deadline);
          }
        }

        // Create escalation notifications for managers/admins
        for (const [companyId, breaches] of breachesByCompany.entries()) {
          // Get managers and admins for this company
          const { data: managers, error: managersError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name')
            .eq('company_id', companyId)
            .in('role', ['MANAGER', 'ADMIN', 'OWNER']);

          if (!managersError && managers && managers.length > 0) {
            const notifications = managers.flatMap((manager) =>
              breaches.map((breach) => ({
                user_id: manager.id,
                notification_type: 'SLA_BREACH_ESCALATION',
                priority: 'URGENT',
                subject: 'SLA Breach Exceeds 24 Hours',
                body_text: `Obligation "${(breach.obligations as any)?.summary || 'Unknown'}" has been in SLA breach for ${breach.sla_breach_duration_hours} hours.`,
                entity_type: 'deadline',
                entity_id: breach.id,
                created_at: new Date().toISOString(),
              }))
            );

            if (notifications.length > 0) {
              const { error: notifyError } = await supabaseAdmin
                .from('notifications')
                .insert(notifications);

              if (notifyError) {
                console.error('Failed to create escalation notifications:', notifyError);
              } else {
                console.log(`Created ${notifications.length} escalation notifications for ${breaches.length} breaches`);
              }
            }
          }
        }
      }
    }

    console.log(`Updated SLA breach durations for ${updates.length} deadlines`);
    if (longRunningBreaches.length > 0) {
      console.log(`Escalated ${longRunningBreaches.length} long-running breaches (> 24 hours)`);
    }
  } catch (error: any) {
    console.error('Error in SLA breach timers job:', error);
    throw error;
  }
}

