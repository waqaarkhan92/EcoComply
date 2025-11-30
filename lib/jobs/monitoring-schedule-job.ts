/**
 * Monitoring Schedule Job
 * Recurring obligation checks, deadline calculations, and schedule maintenance
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 2.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface MonitoringScheduleJobData {
  company_id?: string;
  site_id?: string;
  force_recalculate?: boolean;
}

export async function processMonitoringScheduleJob(job: Job<MonitoringScheduleJobData>): Promise<void> {
  const { company_id, site_id, force_recalculate = false } = job.data;

  try {
    // Step 1: Query active obligations
    let query = supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        site_id,
        frequency,
        deadline_date,
        status,
        schedules!inner(id, frequency, base_date, next_due_date, status)
      `)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null);

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
      console.log('No active obligations found');
      return;
    }

    // Step 2: Process each obligation
    let updated = 0;
    let deadlinesCreated = 0;

    for (const obligation of obligations) {
      try {
        // Calculate next deadline based on frequency
        if (obligation.frequency && obligation.frequency !== 'ONE_TIME' && obligation.frequency !== 'EVENT_TRIGGERED') {
          const schedule = (obligation as any).schedules?.[0];
          const nextDueDate = calculateNextDeadline(
            obligation.frequency,
            schedule?.base_date || obligation.deadline_date || new Date().toISOString()
          );

          // Update schedule if next_due_date has changed
          if (schedule && (force_recalculate || schedule.next_due_date !== nextDueDate)) {
            await supabaseAdmin
              .from('schedules')
              .update({
                next_due_date: nextDueDate,
                updated_at: new Date().toISOString(),
              })
              .eq('id', schedule.id);

            updated++;
          }

          // Create deadline record if it doesn't exist
          const { data: existingDeadline } = await supabaseAdmin
            .from('deadlines')
            .select('id')
            .eq('obligation_id', obligation.id)
            .eq('due_date', nextDueDate)
            .single();

          if (!existingDeadline) {
            await supabaseAdmin.from('deadlines').insert({
              obligation_id: obligation.id,
              due_date: nextDueDate,
              status: 'PENDING',
              is_active: true,
            });
            deadlinesCreated++;
          }

          // Update obligation status based on deadline
          const now = new Date();
          const dueDate = new Date(nextDueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          let newStatus = obligation.status;
          if (daysUntilDue <= 0) {
            newStatus = 'OVERDUE';
          } else if (daysUntilDue <= 7) {
            newStatus = 'DUE_SOON';
          }

          if (newStatus !== obligation.status) {
            await supabaseAdmin
              .from('obligations')
              .update({
                status: newStatus,
                deadline_date: nextDueDate,
                updated_at: new Date().toISOString(),
              })
              .eq('id', obligation.id);
          }
        }
      } catch (error: any) {
        console.error(`Error processing obligation ${obligation.id}:`, error);
        // Continue with next obligation
      }
    }

    console.log(`Monitoring schedule job completed: ${updated} schedules updated, ${deadlinesCreated} deadlines created`);
  } catch (error: any) {
    console.error('Monitoring schedule job failed:', error);
    throw error;
  }
}

/**
 * Calculate next deadline from frequency and base date
 */
function calculateNextDeadline(frequency: string, baseDate: string): string {
  const base = new Date(baseDate);
  const now = new Date();

  switch (frequency) {
    case 'DAILY':
      base.setDate(base.getDate() + 1);
      break;
    case 'WEEKLY':
      base.setDate(base.getDate() + 7);
      break;
    case 'MONTHLY':
      base.setMonth(base.getMonth() + 1);
      break;
    case 'QUARTERLY':
      base.setMonth(base.getMonth() + 3);
      break;
    case 'ANNUAL':
      base.setFullYear(base.getFullYear() + 1);
      break;
    default:
      return baseDate;
  }

  // If calculated date is in the past, calculate from today
  if (base < now) {
    const today = new Date();
    switch (frequency) {
      case 'DAILY':
        today.setDate(today.getDate() + 1);
        break;
      case 'WEEKLY':
        today.setDate(today.getDate() + 7);
        break;
      case 'MONTHLY':
        today.setMonth(today.getMonth() + 1);
        break;
      case 'QUARTERLY':
        today.setMonth(today.getMonth() + 3);
        break;
      case 'ANNUAL':
        today.setFullYear(today.getFullYear() + 1);
        break;
    }
    return today.toISOString().split('T')[0];
  }

  return base.toISOString().split('T')[0];
}

