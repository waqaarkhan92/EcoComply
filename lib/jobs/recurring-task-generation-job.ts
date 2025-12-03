/**
 * Recurring Task Generation Job
 * 
 * Generates recurring tasks from schedules dynamically based on:
 * - Schedule-based triggers (periodic schedules)
 * - Event-based triggers (e.g., "6 months from commissioning")
 * - Conditional triggers (based on conditions)
 * 
 * Runs: Daily at 2 AM
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface RecurringTaskGenerationJobData {
  company_id?: string;
  site_id?: string;
}

export async function processRecurringTaskGenerationJob(job: Job<RecurringTaskGenerationJobData>): Promise<void> {
  const { company_id, site_id } = job.data;
  const result = await generateRecurringTasks(company_id, site_id);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate recurring tasks');
  }
  
  console.log(`Recurring task generation completed: ${result.tasksCreated} tasks created from ${result.schedulesProcessed} schedules`);
}

interface Schedule {
  id: string;
  company_id: string;
  site_id: string;
  schedule_type: string;
  recurrence_pattern: any;
  next_due_date: Date | null;
  is_active: boolean;
}

interface RecurringTask {
  schedule_id: string;
  obligation_id: string | null;
  company_id: string;
  site_id: string;
  task_type: string;
  task_title: string;
  task_description: string | null;
  due_date: string;
  status: string;
  trigger_type: string;
  trigger_data: any;
}

export async function generateRecurringTasks(companyId?: string, siteId?: string) {
  console.log('Starting recurring task generation job...');

  try {
    // First, check for event-based trigger rules that are due
    let triggerRulesQuery = supabaseAdmin
      .from('recurrence_trigger_rules')
      .select(`
        *,
        schedules!inner(*),
        recurrence_events(*)
      `)
      .eq('is_active', true)
      .or('next_execution_date.is.null,next_execution_date.lte.' + new Date().toISOString().split('T')[0]);
    
    if (companyId) {
      triggerRulesQuery = triggerRulesQuery.eq('company_id', companyId);
    }
    if (siteId) {
      triggerRulesQuery = triggerRulesQuery.eq('site_id', siteId);
    }
    
    const { data: triggerRules, error: triggerRulesError } = await triggerRulesQuery;
    
    // Also get regular schedules
    let scheduleQuery = supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', new Date().toISOString().split('T')[0]);
    
    if (companyId) {
      scheduleQuery = scheduleQuery.eq('company_id', companyId);
    }
    if (siteId) {
      scheduleQuery = scheduleQuery.eq('site_id', siteId);
    }
    
    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return { success: false, error: scheduleError.message };
    }

    if (!schedules || schedules.length === 0) {
      console.log('No schedules due for task generation');
      return { success: true, tasksCreated: 0 };
    }

    console.log(`Found ${schedules.length} schedules and ${triggerRules?.length || 0} trigger rules due for task generation`);

    const tasksToCreate: RecurringTask[] = [];

    // Process event-based trigger rules first
    if (triggerRules && triggerRules.length > 0) {
      for (const rule of triggerRules) {
        if (rule.rule_type === 'EVENT_BASED' && rule.recurrence_events) {
          const event = rule.recurrence_events;
          const schedule = rule.schedules;
          
          // Calculate due date based on event date + offset
          const eventDate = new Date(event.event_date);
          const offsetMonths = rule.rule_config?.offset_months || 0;
          eventDate.setMonth(eventDate.getMonth() + offsetMonths);
          
          const taskType = mapScheduleTypeToTaskType(schedule.schedule_type);
          const taskTitle = `${schedule.schedule_name || 'Scheduled Task'} - ${event.event_name}`;
          
          tasksToCreate.push({
            schedule_id: schedule.id,
            obligation_id: rule.obligation_id,
            company_id: rule.company_id,
            site_id: rule.site_id,
            task_type: taskType,
            task_title: taskTitle,
            task_description: schedule.description || `Triggered by event: ${event.event_name}`,
            due_date: eventDate.toISOString().split('T')[0],
            status: 'PENDING',
            trigger_type: 'EVENT_BASED',
            trigger_data: {
              trigger_rule_id: rule.id,
              event_id: event.id,
              rule_config: rule.rule_config,
            },
          });
          
          // Update trigger rule execution tracking
          const nextExecution = new Date(eventDate);
          nextExecution.setMonth(nextExecution.getMonth() + (rule.rule_config?.recurrence_interval_months || 12));
          
          await supabaseAdmin
            .from('recurrence_trigger_rules')
            .update({
              last_executed_at: new Date().toISOString(),
              next_execution_date: nextExecution.toISOString().split('T')[0],
              execution_count: (rule.execution_count || 0) + 1,
            })
            .eq('id', rule.id);
        }
      }
    }

    // Process regular schedules
    for (const schedule of schedules) {
      // Determine task type from schedule
      const taskType = mapScheduleTypeToTaskType(schedule.schedule_type);
      
      // Generate task title and description
      const taskTitle = `${schedule.schedule_name || 'Scheduled Task'} - ${new Date(schedule.next_due_date).toLocaleDateString()}`;
      const taskDescription = schedule.description || null;

      // Get related obligation if schedule is linked
      let obligationId: string | null = null;
      if (schedule.obligation_id) {
        obligationId = schedule.obligation_id;
      }

      // Calculate due date (next_due_date from schedule)
      const dueDate = schedule.next_due_date 
        ? new Date(schedule.next_due_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Determine trigger type
      let triggerType = 'SCHEDULE';
      if (schedule.event_based_trigger) {
        triggerType = 'EVENT_BASED';
      } else if (schedule.conditional_trigger) {
        triggerType = 'CONDITIONAL';
      }

      tasksToCreate.push({
        schedule_id: schedule.id,
        obligation_id: obligationId,
        company_id: schedule.company_id,
        site_id: schedule.site_id,
        task_type: taskType,
        task_title: taskTitle,
        task_description: taskDescription,
        due_date: dueDate,
        status: 'PENDING',
        trigger_type: triggerType,
        trigger_data: {
          schedule_id: schedule.id,
          recurrence_pattern: schedule.recurrence_pattern,
          event_trigger: schedule.event_based_trigger,
          conditional_trigger: schedule.conditional_trigger,
        },
      });
    }

    if (tasksToCreate.length === 0) {
      console.log('No tasks to create');
      return { success: true, tasksCreated: 0 };
    }

    // Insert tasks in batch
    const { data: createdTasks, error: insertError } = await supabaseAdmin
      .from('recurring_tasks')
      .insert(tasksToCreate)
      .select();

    if (insertError) {
      console.error('Error creating recurring tasks:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`Successfully created ${createdTasks?.length || 0} recurring tasks`);

    // Update schedules' next_due_date based on recurrence pattern
    for (const schedule of schedules) {
      if (schedule.recurrence_pattern) {
        const nextDueDate = calculateNextDueDate(
          new Date(schedule.next_due_date || new Date()),
          schedule.recurrence_pattern
        );

        await supabaseAdmin
          .from('schedules')
          .update({ next_due_date: nextDueDate.toISOString().split('T')[0] })
          .eq('id', schedule.id);
      }
    }

    return {
      success: true,
      tasksCreated: createdTasks?.length || 0,
      schedulesProcessed: schedules.length,
    };
  } catch (error: any) {
    console.error('Error in recurring task generation job:', error);
    return { success: false, error: error.message };
  }
}

function mapScheduleTypeToTaskType(scheduleType: string): string {
  const mapping: Record<string, string> = {
    MONITORING: 'MONITORING',
    SAMPLING: 'SAMPLING',
    INSPECTION: 'INSPECTION',
    MAINTENANCE: 'MAINTENANCE',
    REPORTING: 'REPORTING',
    EVIDENCE_COLLECTION: 'EVIDENCE_COLLECTION',
  };

  return mapping[scheduleType] || 'MONITORING';
}

function calculateNextDueDate(currentDate: Date, recurrencePattern: any): Date {
  // Simple implementation - can be enhanced based on recurrence pattern structure
  const nextDate = new Date(currentDate);
  
  if (recurrencePattern.interval === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + (recurrencePattern.interval_value || 1));
  } else if (recurrencePattern.interval === 'WEEKLY') {
    nextDate.setDate(nextDate.getDate() + (7 * (recurrencePattern.interval_value || 1)));
  } else if (recurrencePattern.interval === 'DAILY') {
    nextDate.setDate(nextDate.getDate() + (recurrencePattern.interval_value || 1));
  } else if (recurrencePattern.interval === 'YEARLY') {
    nextDate.setFullYear(nextDate.getFullYear() + (recurrencePattern.interval_value || 1));
  }

  return nextDate;
}

