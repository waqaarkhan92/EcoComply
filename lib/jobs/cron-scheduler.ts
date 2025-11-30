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

