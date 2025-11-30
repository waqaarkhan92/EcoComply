/**
 * Worker Manager
 * Manages BullMQ workers for background job processing
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 1.1
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
import { processModule2SamplingJob } from '../jobs/module-2-sampling-job';
import { processModule3RunHoursJob } from '../jobs/module-3-run-hours-job';
import { processAERGenerationJob } from '../jobs/aer-generation-job';
import { processPackDistributionJob } from '../jobs/pack-distribution-job';
import { processCrossSellTriggersJob } from '../jobs/cross-sell-triggers-job';
import { processConsultantSyncJob } from '../jobs/consultant-sync-job';
import { processPermitRenewalReminderJob } from '../jobs/permit-renewal-reminder-job';
import { processReportGenerationJob } from '../jobs/report-generation-job';
import { processEvidenceRetentionJob } from '../jobs/evidence-retention-job';
import { processNotificationDeliveryJob } from '../jobs/notification-delivery-job';
import { processEscalationCheckJob } from '../jobs/escalation-check-job';
import { processDigestDeliveryJob } from '../jobs/digest-delivery-job';

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

  // Monitoring Schedule Worker (handles both monitoring schedule and evidence retention)
  const monitoringWorker = createWorker(
    QUEUE_NAMES.MONITORING_SCHEDULE,
    async (job) => {
      if (job.name === 'MONITORING_SCHEDULE') {
        await processMonitoringScheduleJob(job);
      } else if (job.name === 'EVIDENCE_RETENTION') {
        await processEvidenceRetentionJob(job);
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

  // Deadline Alerts Worker (handles deadline alerts, permit renewal reminders, and notification delivery)
  const deadlineAlertsWorker = createWorker(
    QUEUE_NAMES.DEADLINE_ALERTS,
    async (job) => {
      if (job.name === 'DEADLINE_ALERT') {
        await processDeadlineAlertJob(job);
      } else if (job.name === 'PERMIT_RENEWAL_REMINDER') {
        await processPermitRenewalReminderJob(job);
      } else if (job.name === 'NOTIFICATION_DELIVERY') {
        await processNotificationDeliveryJob(job);
      } else if (job.name === 'ESCALATION_CHECK') {
        await processEscalationCheckJob(job);
      } else if (job.name === 'DAILY_DIGEST_DELIVERY' || job.name === 'WEEKLY_DIGEST_DELIVERY') {
        await processDigestDeliveryJob(job);
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

  // Module 2 Sampling Worker
  const module2SamplingWorker = createWorker(
    QUEUE_NAMES.MODULE_2_SAMPLING,
    async (job) => {
      if (job.name === 'MODULE_2_SAMPLING') {
        await processModule2SamplingJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  module2SamplingWorker.on('completed', (job) => {
    console.log(`Module 2 sampling job ${job.id} completed`);
  });

  module2SamplingWorker.on('failed', (job, error) => {
    console.error(`Module 2 sampling job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.MODULE_2_SAMPLING, module2SamplingWorker);

  // Module 3 Run Hours Worker
  const module3RunHoursWorker = createWorker(
    QUEUE_NAMES.MODULE_3_RUN_HOURS,
    async (job) => {
      if (job.name === 'MODULE_3_RUN_HOURS') {
        await processModule3RunHoursJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  module3RunHoursWorker.on('completed', (job) => {
    console.log(`Module 3 run hours job ${job.id} completed`);
  });

  module3RunHoursWorker.on('failed', (job, error) => {
    console.error(`Module 3 run hours job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.MODULE_3_RUN_HOURS, module3RunHoursWorker);

  // AER Generation Worker
  const aerGenerationWorker = createWorker(
    QUEUE_NAMES.AER_GENERATION,
    async (job) => {
      if (job.name === 'AER_GENERATION') {
        await processAERGenerationJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 2, // Lower concurrency for PDF generation
    }
  );

  aerGenerationWorker.on('completed', (job) => {
    console.log(`AER generation job ${job.id} completed`);
  });

  aerGenerationWorker.on('failed', (job, error) => {
    console.error(`AER generation job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.AER_GENERATION, aerGenerationWorker);

  // Pack Distribution Worker
  const packDistributionWorker = createWorker(
    QUEUE_NAMES.PACK_DISTRIBUTION,
    async (job) => {
      if (job.name === 'PACK_DISTRIBUTION') {
        await processPackDistributionJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  packDistributionWorker.on('completed', (job) => {
    console.log(`Pack distribution job ${job.id} completed`);
  });

  packDistributionWorker.on('failed', (job, error) => {
    console.error(`Pack distribution job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.PACK_DISTRIBUTION, packDistributionWorker);

  // Cross-Sell Triggers Worker
  const crossSellTriggersWorker = createWorker(
    QUEUE_NAMES.CROSS_SELL_TRIGGERS,
    async (job) => {
      if (job.name === 'CROSS_SELL_TRIGGERS') {
        await processCrossSellTriggersJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 3, // Lower concurrency for analysis jobs
    }
  );

  crossSellTriggersWorker.on('completed', (job) => {
    console.log(`Cross-sell triggers job ${job.id} completed`);
  });

  crossSellTriggersWorker.on('failed', (job, error) => {
    console.error(`Cross-sell triggers job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.CROSS_SELL_TRIGGERS, crossSellTriggersWorker);

  // Consultant Sync Worker
  const consultantSyncWorker = createWorker(
    QUEUE_NAMES.CONSULTANT_SYNC,
    async (job) => {
      if (job.name === 'CONSULTANT_SYNC') {
        await processConsultantSyncJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  consultantSyncWorker.on('completed', (job) => {
    console.log(`Consultant sync job ${job.id} completed`);
  });

  consultantSyncWorker.on('failed', (job, error) => {
    console.error(`Consultant sync job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.CONSULTANT_SYNC, consultantSyncWorker);

  // Report Generation Worker
  const reportGenerationWorker = createWorker(
    QUEUE_NAMES.REPORT_GENERATION,
    async (job) => {
      if (job.name === 'REPORT_GENERATION') {
        await processReportGenerationJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 2, // Lower concurrency for PDF generation (CPU intensive)
    }
  );

  reportGenerationWorker.on('completed', (job) => {
    console.log(`Report generation job ${job.id} completed`);
  });

  reportGenerationWorker.on('failed', (job, error) => {
    console.error(`Report generation job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.REPORT_GENERATION, reportGenerationWorker);

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

