/**
 * Worker Manager
 * Manages BullMQ workers for background job processing
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 1.1
 */

import { Worker, WorkerOptions } from 'bullmq';
import { getRedisConnection } from '../queue/queue-manager';
import { QUEUE_NAMES } from '../queue/queue-manager';
import { processDocumentJob } from '../jobs/document-processing-job';
import { processMonitoringScheduleJob } from '../jobs/monitoring-schedule-job';
import { processDeadlineAlertJob } from '../jobs/deadline-alert-job';
import { processEvidenceReminderJob } from '../jobs/evidence-reminder-job';
import { processExcelImportJob } from '../jobs/excel-import-job';
import { processPackGenerationJob } from '../jobs/pack-generation-job';

// Worker instances
const workers: Map<string, Worker> = new Map();

/**
 * Create a worker for a queue
 */
export function createWorker<T = any>(
  queueName: string,
  processor: (job: any) => Promise<void>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  const connection = getRedisConnection();

  return new Worker<T>(
    queueName,
    async (job) => {
      console.log(`Processing job ${job.id} of type ${job.name} in queue ${queueName}`);
      await processor(job);
    },
    {
      connection,
      concurrency: 5, // Process 5 jobs concurrently per worker
      limiter: {
        max: 10, // Max 10 jobs per queue
        duration: 1000, // Per second
      },
      ...options,
    }
  );
}

/**
 * Start all workers
 */
export function startAllWorkers(): void {
  console.log('Starting background job workers...');

  // Document Processing Worker (handles both document extraction and Excel import)
  const documentWorker = createWorker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      if (job.name === 'DOCUMENT_EXTRACTION') {
        await processDocumentJob(job);
      } else if (job.name === 'EXCEL_IMPORT_PROCESSING') {
        await processExcelImportJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 3, // Lower concurrency for document processing (CPU intensive)
    }
  );

  documentWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  documentWorker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.DOCUMENT_PROCESSING, documentWorker);

  // Monitoring Schedule Worker
  const monitoringWorker = createWorker(
    QUEUE_NAMES.MONITORING_SCHEDULE,
    async (job) => {
      if (job.name === 'MONITORING_SCHEDULE') {
        await processMonitoringScheduleJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  monitoringWorker.on('completed', (job) => {
    console.log(`Monitoring schedule job ${job.id} completed`);
  });

  monitoringWorker.on('failed', (job, error) => {
    console.error(`Monitoring schedule job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.MONITORING_SCHEDULE, monitoringWorker);

  // Deadline Alerts Worker
  const deadlineAlertsWorker = createWorker(
    QUEUE_NAMES.DEADLINE_ALERTS,
    async (job) => {
      if (job.name === 'DEADLINE_ALERT') {
        await processDeadlineAlertJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 10, // Higher concurrency for alert jobs
    }
  );

  deadlineAlertsWorker.on('completed', (job) => {
    console.log(`Deadline alert job ${job.id} completed`);
  });

  deadlineAlertsWorker.on('failed', (job, error) => {
    console.error(`Deadline alert job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.DEADLINE_ALERTS, deadlineAlertsWorker);

  // Evidence Reminders Worker
  const evidenceRemindersWorker = createWorker(
    QUEUE_NAMES.EVIDENCE_REMINDERS,
    async (job) => {
      if (job.name === 'EVIDENCE_REMINDER') {
        await processEvidenceReminderJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 10, // Higher concurrency for reminder jobs
    }
  );

  evidenceRemindersWorker.on('completed', (job) => {
    console.log(`Evidence reminder job ${job.id} completed`);
  });

  evidenceRemindersWorker.on('failed', (job, error) => {
    console.error(`Evidence reminder job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.EVIDENCE_REMINDERS, evidenceRemindersWorker);

  // Audit Pack Generation Worker
  const packGenerationWorker = createWorker(
    QUEUE_NAMES.AUDIT_PACK_GENERATION,
    async (job) => {
      if (job.name === 'AUDIT_PACK_GENERATION') {
        await processPackGenerationJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 2, // Lower concurrency for PDF generation (CPU intensive)
    }
  );

  packGenerationWorker.on('completed', (job) => {
    console.log(`Pack generation job ${job.id} completed`);
  });

  packGenerationWorker.on('failed', (job, error) => {
    console.error(`Pack generation job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.AUDIT_PACK_GENERATION, packGenerationWorker);

  console.log('All workers started successfully');
}

/**
 * Stop all workers (for graceful shutdown)
 */
export async function stopAllWorkers(): Promise<void> {
  console.log('Stopping all workers...');
  await Promise.all(Array.from(workers.values()).map((worker) => worker.close()));
  workers.clear();
  console.log('All workers stopped');
}

