/**
 * Queue Manager
 * Manages BullMQ queues and workers
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 1.1
 */

import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../env';

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

