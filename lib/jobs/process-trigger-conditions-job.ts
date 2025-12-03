/**
 * Process Trigger Conditions Job
 * Evaluates conditional triggers on relevant events (event-driven)
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 14.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface ProcessTriggerConditionsJobInput {
  event_type: string;
  event_data: Record<string, any>;
  company_id: string;
}

enum TriggerType {
  CONDITIONAL = 'CONDITIONAL',
}

export async function processProcessTriggerConditionsJob(
  job: Job<ProcessTriggerConditionsJobInput>
): Promise<void> {
  const { event_type, event_data, company_id } = job.data;

  if (!event_type || !company_id) {
    throw new Error('event_type and company_id are required');
  }

  try {
    // Step 1: Find applicable conditional triggers
    let query = supabaseAdmin
      .from('recurrence_trigger_rules')
      .select('*')
      .eq('trigger_type', TriggerType.CONDITIONAL)
      .eq('is_active', true)
      .eq('company_id', company_id);

    const { data: triggers, error: triggersError } = await query;

    if (triggersError) {
      throw new Error(`Failed to fetch conditional triggers: ${triggersError.message}`);
    }

    if (!triggers || triggers.length === 0) {
      console.log(`No conditional triggers found for event ${event_type} in company ${company_id}`);
      return;
    }

    // Filter triggers that match the event type
    const applicableTriggers = triggers.filter((trigger) => {
      const expression = trigger.trigger_expression || '';
      return expression.includes(event_type) || trigger.trigger_expression === event_type;
    });

    if (applicableTriggers.length === 0) {
      console.log(`No triggers match event type ${event_type}`);
      return;
    }

    let evaluated = 0;
    let executed = 0;
    let failed = 0;

    // Step 2: Evaluate each trigger condition
    for (const trigger of applicableTriggers) {
      try {
        evaluated++;

        // Evaluate condition against event data
        const conditionMet = await evaluateCondition(
          trigger.trigger_expression,
          trigger.rule_config || {},
          event_data
        );

        if (!conditionMet) {
          continue;
        }

        // Condition met - execute trigger (similar to ExecutePendingRecurrenceTriggersJob)
        const templateData = trigger.template_data || {};
        const ruleConfig = trigger.rule_config || {};
        const now = new Date();
        let createdEntityId: string | null = null;
        let createdEntityType: string | null = null;

        // Create target entity
        if (trigger.target_entity_type === 'SCHEDULE') {
          const { data: schedule, error: scheduleError } = await supabaseAdmin
            .from('schedules')
            .insert({
              obligation_id: templateData.obligation_id,
              frequency: templateData.frequency || ruleConfig.frequency,
              base_date: templateData.base_date || now.toISOString().split('T')[0],
              next_due_date: templateData.next_due_date || null,
              status: 'ACTIVE',
            })
            .select('id')
            .single();

          if (!scheduleError && schedule) {
            createdEntityId = schedule.id;
            createdEntityType = 'schedule';
          }
        } else if (trigger.target_entity_type === 'DEADLINE') {
          const { data: deadline, error: deadlineError } = await supabaseAdmin
            .from('deadlines')
            .insert({
              obligation_id: templateData.obligation_id,
              schedule_id: templateData.schedule_id || null,
              due_date: templateData.due_date || now.toISOString().split('T')[0],
              status: 'PENDING',
              compliance_period_start: templateData.compliance_period_start || null,
              compliance_period_end: templateData.compliance_period_end || null,
            })
            .select('id')
            .single();

          if (!deadlineError && deadline) {
            createdEntityId = deadline.id;
            createdEntityType = 'deadline';
          }
        }

        // Record execution
        if (createdEntityId) {
          await supabaseAdmin
            .from('recurrence_trigger_executions')
            .insert({
              trigger_rule_id: trigger.id,
              event_id: event_data.event_id || null,
              schedule_id: createdEntityType === 'schedule' ? createdEntityId : null,
              execution_date: now.toISOString(),
              next_due_date: templateData.next_due_date || null,
              execution_result: 'SUCCESS',
              execution_data: {
                created_entity_type: createdEntityType,
                created_entity_id: createdEntityId,
                execution_context: {
                  event_type: event_type,
                  event_data: event_data,
                },
              },
            });

          // Update trigger rule
          await supabaseAdmin
            .from('recurrence_trigger_rules')
            .update({
              last_executed_at: now.toISOString(),
              execution_count: (trigger.execution_count || 0) + 1,
              updated_at: now.toISOString(),
            })
            .eq('id', trigger.id);

          executed++;
        }
      } catch (error: any) {
        console.error(`Error processing conditional trigger ${trigger.id}:`, error);
        failed++;
      }
    }

    console.log(
      `Process trigger conditions completed: ${evaluated} evaluated, ${executed} executed, ${failed} failed`
    );
  } catch (error: any) {
    console.error('Error in process trigger conditions job:', error);
    throw error;
  }
}

async function evaluateCondition(
  triggerExpression: string,
  ruleConfig: Record<string, any>,
  eventData: Record<string, any>
): Promise<boolean> {
  try {
    // Simple condition evaluation
    // In production, this should use a proper expression evaluator

    // Check if condition expression contains event data keys
    const condition = ruleConfig.condition || triggerExpression;

    // Example conditions:
    // "waste_volume > threshold"
    // "parameter_value > limit"
    // "runtime_hours > threshold"

    if (condition.includes('volume') && condition.includes('>')) {
      const threshold = ruleConfig.threshold_value || 0;
      const volume = eventData.volume || eventData.quantity || 0;
      return volume > threshold;
    }

    if (condition.includes('runtime') && condition.includes('>')) {
      const threshold = ruleConfig.threshold_value || 0;
      const runtime = eventData.runtime_hours || eventData.runtime || 0;
      return runtime > threshold;
    }

    if (condition.includes('parameter') && condition.includes('>')) {
      const threshold = ruleConfig.threshold_value || 0;
      const value = eventData.parameter_value || eventData.value || 0;
      return value > threshold;
    }

    // Default: if condition exists and matches event type, return true
    return condition.length > 0;
  } catch (error: any) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

