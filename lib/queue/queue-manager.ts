/**
 * Queue Manager
 * Manages BullMQ queues and workers with configurable concurrency and priority
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 1.1
 */

import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../env';

// Job priority levels (lower number = higher priority)
export const JOB_PRIORITY = {
  CRITICAL: 1, // System-critical jobs (alerts, breaches)
  HIGH: 2, // User-facing operations (extraction, pack generation)
  NORMAL: 3, // Standard background tasks
  LOW: 4, // Batch operations, cleanup
  BULK: 5, // Bulk imports, large batch jobs
} as const;

export type JobPriorityLevel = keyof typeof JOB_PRIORITY;

// Concurrency configuration (from environment or defaults)
export const QUEUE_CONCURRENCY = {
  // Document processing - CPU intensive, limit concurrency
  'document-processing': parseInt(process.env.QUEUE_CONCURRENCY_DOCUMENT || '3', 10),
  // Deadline alerts - quick jobs, can run more concurrently
  'deadline-alerts': parseInt(process.env.QUEUE_CONCURRENCY_ALERTS || '10', 10),
  // Pack generation - memory intensive
  'audit-pack-generation': parseInt(process.env.QUEUE_CONCURRENCY_PACKS || '2', 10),
  // Monitoring tasks
  'monitoring-schedule': parseInt(process.env.QUEUE_CONCURRENCY_MONITORING || '5', 10),
  // Default for unspecified queues
  default: parseInt(process.env.QUEUE_CONCURRENCY_DEFAULT || '5', 10),
} as const;

// Queue names
export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  MONITORING_SCHEDULE: 'monitoring-schedule',
  DEADLINE_ALERTS: 'deadline-alerts',
  EVIDENCE_REMINDERS: 'evidence-reminders',
  AUDIT_PACK_GENERATION: 'audit-pack-generation',
  PACK_DISTRIBUTION: 'pack-distribution',
  EXCEL_IMPORT: 'document-processing', // Same queue as document processing
  MODULE_2_SAMPLING: 'module-2-sampling',
  MODULE_3_RUN_HOURS: 'module-3-run-hours',
  AER_GENERATION: 'aer-generation',
  CROSS_SELL_TRIGGERS: 'cross-sell-triggers',
  CONSULTANT_SYNC: 'consultant-sync',
  REPORT_GENERATION: 'report-generation',
  EVIDENCE_RETENTION: 'monitoring-schedule', // Same queue as monitoring schedule
  NOTIFICATION_DELIVERY: 'deadline-alerts', // Same queue as deadline alerts (high priority)
  COMPLIANCE_CLOCK_UPDATE: 'compliance-clock-update',
  RECURRING_TASK_GENERATION: 'recurring-task-generation',
  EVIDENCE_EXPIRY_TRACKING: 'evidence-expiry-tracking',
  SLA_BREACH_ALERTS: 'sla-breach-alerts',
  PERMIT_WORKFLOWS: 'permit-workflows',
  CORRECTIVE_ACTIONS: 'corrective-actions',
  VALIDATION_PROCESSING: 'validation-processing',
  RUNTIME_MONITORING: 'runtime-monitoring',
  TRIGGER_EXECUTION: 'trigger-execution',
  DASHBOARD_REFRESH: 'dashboard-refresh',
  // Enhanced Features V2
  EVIDENCE_GAP_DETECTION: 'evidence-gap-detection',
  RISK_SCORE_CALCULATION: 'risk-score-calculation',
  // Review Queue Escalation
  REVIEW_QUEUE_ESCALATION: 'review-queue-escalation',
} as const;

// Redis connection
let redisConnection: Redis | null = null;

/**
 * Get Redis connection
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required for background jobs');
    }

    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisConnection.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redisConnection;
}

/**
 * Create a BullMQ queue
 */
export function createQueue<T = any>(
  queueName: string,
  options?: Partial<QueueOptions>
): Queue<T> {
  const connection = getRedisConnection();

  return new Queue<T>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3, // 1 initial + 2 retries = 3 total attempts
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2s delay
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        // CRITICAL: Extended retention for compliance auditing
        // Failed jobs should be kept longer to allow investigation
        // and to ensure no data loss goes unnoticed
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days (was 7)
        count: 10000, // Keep up to 10k failed jobs
      },
    },
    ...options,
  });
}

/**
 * Get or create a queue
 */
const queues: Map<string, Queue> = new Map();

export function getQueue<T = any>(queueName: string): Queue<T> {
  if (!queues.has(queueName)) {
    queues.set(queueName, createQueue<T>(queueName));
  }
  return queues.get(queueName)! as Queue<T>;
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((queue) => queue.close()));
  queues.clear();

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

/**
 * Get concurrency setting for a queue
 */
export function getQueueConcurrency(queueName: string): number {
  return (QUEUE_CONCURRENCY as Record<string, number>)[queueName] ?? QUEUE_CONCURRENCY.default;
}

/**
 * Create job options with priority
 */
export function createJobOptions(
  priority: JobPriorityLevel = 'NORMAL',
  additionalOptions?: Partial<JobsOptions>
): JobsOptions {
  return {
    priority: JOB_PRIORITY[priority],
    ...additionalOptions,
  };
}

/**
 * Add a job to a queue with priority support
 */
export async function addJobWithPriority<T>(
  queueName: string,
  jobName: string,
  data: T,
  priority: JobPriorityLevel = 'NORMAL',
  options?: Partial<JobsOptions>
): Promise<string> {
  const queue = getQueue<T>(queueName);
  const jobOptions = createJobOptions(priority, options);
  const job = await queue.add(jobName, data, jobOptions);
  return job.id || '';
}

/**
 * Add a critical job (highest priority, immediate execution)
 */
export async function addCriticalJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  options?: Partial<JobsOptions>
): Promise<string> {
  return addJobWithPriority(queueName, jobName, data, 'CRITICAL', options);
}

/**
 * Add a bulk job (lowest priority, background processing)
 */
export async function addBulkJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  options?: Partial<JobsOptions>
): Promise<string> {
  return addJobWithPriority(queueName, jobName, data, 'BULK', options);
}

/**
 * Get queue health stats
 */
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

/**
 * Get all queue stats (for health check endpoint)
 */
export async function getAllQueueStats(): Promise<Record<string, Awaited<ReturnType<typeof getQueueStats>>>> {
  const stats: Record<string, Awaited<ReturnType<typeof getQueueStats>>> = {};
  for (const [name] of queues) {
    stats[name] = await getQueueStats(name);
  }
  return stats;
}

