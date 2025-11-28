/**
 * Cron Scheduler
 * Schedules recurring background jobs
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 1.1
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

