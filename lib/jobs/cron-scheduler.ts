/**
 * Cron Scheduler
 * Schedules recurring background jobs
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 1.1
 */

import { Queue } from 'bullmq';
import { getQueue, QUEUE_NAMES } from '../queue/queue-manager';
import { supabaseAdmin } from '../supabase/server';

/**
 * Schedule all recurring jobs
 * Call this on worker startup
 */
export async function scheduleRecurringJobs(): Promise<void> {
  console.log('Scheduling recurring background jobs...');

  // Monitoring Schedule Job (hourly)
  await scheduleJob('MONITORING_SCHEDULE', QUEUE_NAMES.MONITORING_SCHEDULE, '0 * * * *', {});

  // Deadline Alert Job (every 6 hours)
  await scheduleJob('DEADLINE_ALERT', QUEUE_NAMES.DEADLINE_ALERTS, '0 */6 * * *', {});

  // Evidence Reminder Job (daily at 9 AM)
  await scheduleJob('EVIDENCE_REMINDER', QUEUE_NAMES.EVIDENCE_REMINDERS, '0 9 * * *', {});

  // Permit Renewal Reminder Job (daily at 8 AM)
  await scheduleJob('PERMIT_RENEWAL_REMINDER', QUEUE_NAMES.DEADLINE_ALERTS, '0 8 * * *', {});

  // Module 2 Sampling Job (daily at 8 AM)
  await scheduleJob('MODULE_2_SAMPLING', QUEUE_NAMES.MODULE_2_SAMPLING, '0 8 * * *', {});

  // Module 3 Run Hours Job (daily at 7 AM)
  await scheduleJob('MODULE_3_RUN_HOURS', QUEUE_NAMES.MODULE_3_RUN_HOURS, '0 7 * * *', {});

  // Cross-Sell Triggers Job (every 6 hours)
  await scheduleJob('CROSS_SELL_TRIGGERS', QUEUE_NAMES.CROSS_SELL_TRIGGERS, '0 */6 * * *', {});

  // Consultant Sync Job (daily at 6 AM)
  await scheduleJob('CONSULTANT_SYNC', QUEUE_NAMES.CONSULTANT_SYNC, '0 6 * * *', {});

  // Evidence Retention Job (daily at 2 AM)
  await scheduleJob('EVIDENCE_RETENTION', QUEUE_NAMES.MONITORING_SCHEDULE, '0 2 * * *', {});

  // Notification Delivery Job (every 5 minutes)
  await scheduleJob('NOTIFICATION_DELIVERY', QUEUE_NAMES.DEADLINE_ALERTS, '*/5 * * * *', {});

  // Escalation Check Job (every hour)
  await scheduleJob('ESCALATION_CHECK', QUEUE_NAMES.DEADLINE_ALERTS, '0 * * * *', {});

  // Daily Digest Job (daily at 8 AM)
  await scheduleJob('DAILY_DIGEST_DELIVERY', QUEUE_NAMES.DEADLINE_ALERTS, '0 8 * * *', { digest_type: 'DAILY' });

  // Weekly Digest Job (Monday at 8 AM)
  await scheduleJob('WEEKLY_DIGEST_DELIVERY', QUEUE_NAMES.DEADLINE_ALERTS, '0 8 * * 1', { digest_type: 'WEEKLY' });

  // Compliance Clock Update Job (every hour)
  await scheduleJob('update-compliance-clocks', QUEUE_NAMES.COMPLIANCE_CLOCK_UPDATE, '0 * * * *', {});

  // Recurring Task Generation Job (daily at 2:00 AM)
  await scheduleJob('generate-recurring-tasks', QUEUE_NAMES.RECURRING_TASK_GENERATION, '0 2 * * *', {});

  // Evidence Expiry Tracking Job (daily at 3:00 AM)
  await scheduleJob('update-evidence-expiry-tracking', QUEUE_NAMES.EVIDENCE_EXPIRY_TRACKING, '0 3 * * *', {});

  // SLA Breach Timers Job (hourly)
  await scheduleJob('UPDATE_SLA_BREACH_TIMERS', QUEUE_NAMES.SLA_BREACH_ALERTS, '0 * * * *', {});

  // Compliance Clock Update Job (daily at 00:01 UTC)
  await scheduleJob('UPDATE_COMPLIANCE_CLOCKS', QUEUE_NAMES.COMPLIANCE_CLOCK_UPDATE, '1 0 * * *', {});

  // Process Escalations Job (daily at 00:30 UTC)
  await scheduleJob('PROCESS_ESCALATIONS', QUEUE_NAMES.DEADLINE_ALERTS, '30 0 * * *', {});

  // Auto-Create Renewal Workflows Job (daily at 01:00 UTC)
  await scheduleJob('AUTO_CREATE_RENEWAL_WORKFLOWS', QUEUE_NAMES.PERMIT_WORKFLOWS, '0 1 * * *', {});

  // Check Regulator Response Deadlines Job (daily at 09:00 UTC)
  await scheduleJob('CHECK_REGULATOR_RESPONSE_DEADLINES', QUEUE_NAMES.PERMIT_WORKFLOWS, '0 9 * * *', {});

  // Monitor Corrective Action Items Job (daily at 08:00 UTC)
  await scheduleJob('MONITOR_CORRECTIVE_ACTION_ITEMS', QUEUE_NAMES.CORRECTIVE_ACTIONS, '0 8 * * *', {});

  // Auto-Transition Corrective Actions Job (hourly)
  await scheduleJob('AUTO_TRANSITION_CORRECTIVE_ACTIONS', QUEUE_NAMES.CORRECTIVE_ACTIONS, '0 * * * *', {});

  // Auto-Validate Consignment Notes Job (every 5 minutes)
  await scheduleJob('AUTO_VALIDATE_CONSIGNMENT_NOTES', QUEUE_NAMES.VALIDATION_PROCESSING, '*/5 * * * *', {});

  // Flag Pending Runtime Validations Job (daily at 10:00 UTC)
  await scheduleJob('FLAG_PENDING_RUNTIME_VALIDATIONS', QUEUE_NAMES.RUNTIME_MONITORING, '0 10 * * *', {});

  // Execute Pending Recurrence Triggers Job (hourly)
  await scheduleJob('EXECUTE_PENDING_RECURRENCE_TRIGGERS', QUEUE_NAMES.TRIGGER_EXECUTION, '0 * * * *', {});

  // Refresh Compliance Dashboard Job (every 15 minutes)
  await scheduleJob('REFRESH_COMPLIANCE_DASHBOARD', QUEUE_NAMES.DASHBOARD_REFRESH, '*/15 * * * *', {});

  // Detect Breaches and Trigger Alerts Job (every 15 minutes) - HIGH PRIORITY
  await scheduleJob('DETECT_BREACHES_AND_ALERTS', QUEUE_NAMES.SLA_BREACH_ALERTS, '*/15 * * * *', {});

  // Enhanced Features V2 Jobs

  // Evidence Gap Detection Job (every 6 hours)
  await scheduleJob('EVIDENCE_GAP_DETECTION', QUEUE_NAMES.EVIDENCE_GAP_DETECTION, '0 */6 * * *', {});

  // Risk Score Calculation Job (daily at 4 AM)
  await scheduleJob('RISK_SCORE_CALCULATION', QUEUE_NAMES.RISK_SCORE_CALCULATION, '0 4 * * *', {});

  // Review Queue Escalation Job (every 4 hours per Implementation Blueprint Section 7.5)
  await scheduleJob('REVIEW_QUEUE_ESCALATION', QUEUE_NAMES.REVIEW_QUEUE_ESCALATION, '0 */4 * * *', {});

  console.log('All recurring jobs scheduled');
}

/**
 * Schedule a recurring job
 */
async function scheduleJob(
  jobType: string,
  queueName: string,
  cronPattern: string,
  jobData: any
): Promise<void> {
  const queue = getQueue(queueName);

  // Create recurring job using BullMQ's repeatable job feature
  // BullMQ handles the scheduling, we just need to add the repeatable job
  await queue.add(
    jobType,
    jobData,
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: `recurring-${jobType}`,
    }
  );

  console.log(`Scheduled recurring job: ${jobType} (${cronPattern})`);
}

/**
 * Manually trigger a job (for testing or one-off execution)
 */
export async function triggerJob(
  jobType: string,
  queueName: string,
  jobData: any
): Promise<string> {
  const queue = getQueue(queueName);

  // Create background_jobs record
  const { data: jobRecord, error } = await supabaseAdmin
    .from('background_jobs')
    .insert({
      job_type: jobType,
      status: 'PENDING',
      priority: 'NORMAL',
      is_recurring: false,
      payload: JSON.stringify(jobData),
    })
    .select('id')
    .single();

  if (error || !jobRecord) {
    throw new Error(`Failed to create job record: ${error?.message || 'Unknown error'}`);
  }

  // Enqueue job
  const job = await queue.add(jobType, jobData, {
    jobId: jobRecord.id,
  });

  return job.id!;
}

