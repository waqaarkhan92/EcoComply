/**
 * Execute Pending Recurrence Triggers Job
 * Executes scheduled recurrence triggers based on next_execution_date
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 14.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface ExecutePendingRecurrenceTriggersJobInput {
  company_id?: string;
  batch_size?: number;
}

enum TriggerType {
  SCHEDULED = 'SCHEDULED',
  EVENT_BASED = 'EVENT_BASED',
  CONDITIONAL = 'CONDITIONAL',
}

export async function processExecutePendingRecurrenceTriggersJob(
  job: Job<ExecutePendingRecurrenceTriggersJobInput>
): Promise<void> {
  const { company_id, batch_size = 100 } = job.data;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Step 1: Query triggers ready for execution
    let query = supabaseAdmin
      .from('recurrence_trigger_rules')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_date', todayStr)
      .order('next_execution_date', { ascending: true })
      .limit(batch_size);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: triggers, error: triggersError } = await query;

    if (triggersError) {
      throw new Error(`Failed to fetch recurrence triggers: ${triggersError.message}`);
    }

    if (!triggers || triggers.length === 0) {
      console.log('No recurrence triggers ready for execution found');
      return;
    }

    let executed = 0;
    let succeeded = 0;
    let failed = 0;

    // Step 2-5: Process each trigger
    for (const trigger of triggers) {
      try {
        executed++;

        // Step 2: Evaluate trigger expression
        let shouldFire = false;

        switch (trigger.trigger_type) {
          case TriggerType.SCHEDULED:
            // Check if current date matches schedule
            shouldFire = trigger.next_execution_date
              ? new Date(trigger.next_execution_date) <= now
              : false;
            break;

          case TriggerType.EVENT_BASED:
            // Check for triggering events since last execution
            const lastExecuted = trigger.last_executed_at
              ? new Date(trigger.last_executed_at)
              : new Date(0);

            const { data: events } = await supabaseAdmin
              .from('recurrence_events')
              .select('id')
              .eq('event_type', trigger.trigger_expression)
              .gte('occurred_at', lastExecuted.toISOString())
              .lte('occurred_at', now.toISOString())
              .limit(1);

            shouldFire = !!(events && events.length > 0);
            break;

          case TriggerType.CONDITIONAL:
            // Conditional triggers are handled by ProcessTriggerConditionsJob
            // Skip them here
            continue;

          default:
            console.warn(`Unknown trigger type: ${trigger.trigger_type}`);
            continue;
        }

        if (!shouldFire) {
          continue;
        }

        // Step 3: Create target entity
        let createdEntityId: string | null = null;
        let createdEntityType: string | null = null;

        const templateData = trigger.template_data || {};
        const ruleConfig = trigger.rule_config || {};

        if (trigger.target_entity_type === 'SCHEDULE') {
          // Create schedule record
          const { data: schedule, error: scheduleError } = await supabaseAdmin
            .from('schedules')
            .insert({
              obligation_id: templateData.obligation_id,
              frequency: templateData.frequency || ruleConfig.frequency,
              base_date: templateData.base_date || todayStr,
              next_due_date: templateData.next_due_date || null,
              status: 'ACTIVE',
            })
            .select('id')
            .single();

          if (scheduleError || !schedule) {
            throw new Error(`Failed to create schedule: ${scheduleError?.message || 'Unknown error'}`);
          }

          createdEntityId = schedule.id;
          createdEntityType = 'schedule';
        } else if (trigger.target_entity_type === 'DEADLINE') {
          // Create deadline record
          const { data: deadline, error: deadlineError } = await supabaseAdmin
            .from('deadlines')
            .insert({
              obligation_id: templateData.obligation_id,
              schedule_id: templateData.schedule_id || null,
              due_date: templateData.due_date || todayStr,
              status: 'PENDING',
              compliance_period_start: templateData.compliance_period_start || null,
              compliance_period_end: templateData.compliance_period_end || null,
            })
            .select('id')
            .single();

          if (deadlineError || !deadline) {
            throw new Error(`Failed to create deadline: ${deadlineError?.message || 'Unknown error'}`);
          }

          createdEntityId = deadline.id;
          createdEntityType = 'deadline';
        } else {
          console.warn(`Unknown target entity type: ${trigger.target_entity_type}`);
          continue;
        }

        // Step 4: Record trigger execution
        const executionResult = 'SUCCESS';
        const { error: executionError } = await supabaseAdmin
          .from('recurrence_trigger_executions')
          .insert({
            trigger_rule_id: trigger.id,
            event_id: trigger.trigger_type === TriggerType.EVENT_BASED ? templateData.event_id : null,
            schedule_id: createdEntityType === 'schedule' ? createdEntityId : null,
            execution_date: now.toISOString(),
            next_due_date: templateData.next_due_date || null,
            execution_result: executionResult,
            execution_data: {
              created_entity_type: createdEntityType,
              created_entity_id: createdEntityId,
              execution_context: {
                trigger_type: trigger.trigger_type,
                trigger_expression: trigger.trigger_expression,
              },
            },
          });

        if (executionError) {
          console.error(`Failed to record trigger execution:`, executionError);
        }

        // Step 5: Update trigger rule
        const nextExecutionDate = calculateNextExecutionDate(trigger, ruleConfig, now);

        const { error: updateError } = await supabaseAdmin
          .from('recurrence_trigger_rules')
          .update({
            last_executed_at: now.toISOString(),
            execution_count: (trigger.execution_count || 0) + 1,
            next_execution_date: nextExecutionDate,
            updated_at: now.toISOString(),
          })
          .eq('id', trigger.id);

        if (updateError) {
          console.error(`Failed to update trigger rule:`, updateError);
        }

        succeeded++;
      } catch (error: any) {
        console.error(`Error executing trigger ${trigger.id}:`, error);

        // Record failed execution
        await supabaseAdmin
          .from('recurrence_trigger_executions')
          .insert({
            trigger_rule_id: trigger.id,
            event_id: null,
            schedule_id: null,
            execution_date: now.toISOString(),
            next_due_date: null,
            execution_result: 'FAILED',
            execution_data: {
              error: error.message,
            },
          });

        failed++;
      }
    }

    console.log(
      `Execute pending recurrence triggers completed: ${executed} processed, ${succeeded} succeeded, ${failed} failed`
    );
  } catch (error: any) {
    console.error('Error in execute pending recurrence triggers job:', error);
    throw error;
  }
}

function calculateNextExecutionDate(trigger: any, ruleConfig: any, currentDate: Date): string {
  if (trigger.trigger_type !== TriggerType.SCHEDULED) {
    // For non-scheduled triggers, don't auto-calculate next execution
    return trigger.next_execution_date || currentDate.toISOString().split('T')[0];
  }

  const frequency = ruleConfig.frequency || 'MONTHLY';
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'ANNUAL':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // Default to monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate.toISOString().split('T')[0];
}

