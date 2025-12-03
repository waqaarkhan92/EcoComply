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
import { processComplianceClockUpdateJob } from '../jobs/compliance-clock-update-job';
import { processRecurringTaskGenerationJob } from '../jobs/recurring-task-generation-job';
import { processEvidenceExpiryTrackingJob } from '../jobs/evidence-expiry-tracking-job';
import { processSLABreachTimersJob } from '../jobs/sla-breach-timers-job';
import { processDetectBreachesAndAlertsJob } from '../jobs/detect-breaches-and-alerts-job';
import { processAutoCreateRenewalWorkflowsJob } from '../jobs/auto-create-renewal-workflows-job';
import { processCheckRegulatorResponseDeadlinesJob } from '../jobs/check-regulator-response-deadlines-job';
import { processMonitorCorrectiveActionItemsJob } from '../jobs/monitor-corrective-action-items-job';
import { processAutoTransitionCorrectiveActionsJob } from '../jobs/auto-transition-corrective-actions-job';
import { processAutoValidateConsignmentNotesJob } from '../jobs/auto-validate-consignment-notes-job';
import { processFlagPendingRuntimeValidationsJob } from '../jobs/flag-pending-runtime-validations-job';
import { processExecutePendingRecurrenceTriggersJob } from '../jobs/execute-pending-recurrence-triggers-job';
import { processProcessTriggerConditionsJob } from '../jobs/process-trigger-conditions-job';
import { processRefreshComplianceDashboardJob } from '../jobs/refresh-compliance-dashboard-job';

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
export async function startAllWorkers(): Promise<void> {
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

  // Deadline Alerts Worker (handles deadline alerts, permit renewal reminders, notification delivery, and escalations)
  const deadlineAlertsWorker = createWorker(
    QUEUE_NAMES.DEADLINE_ALERTS,
    async (job) => {
      if (job.name === 'DEADLINE_ALERT') {
        await processDeadlineAlertJob(job);
      } else if (job.name === 'PERMIT_RENEWAL_REMINDER') {
        await processPermitRenewalReminderJob(job);
      } else if (job.name === 'NOTIFICATION_DELIVERY') {
        await processNotificationDeliveryJob(job);
      } else if (job.name === 'ESCALATION_CHECK' || job.name === 'PROCESS_ESCALATIONS') {
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

  // Compliance Clock Update Worker
  const complianceClockWorker = createWorker(
    QUEUE_NAMES.COMPLIANCE_CLOCK_UPDATE,
    async (job) => {
      if (job.name === 'update-compliance-clocks' || job.name === 'UPDATE_COMPLIANCE_CLOCKS') {
        await processComplianceClockUpdateJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 3, // Moderate concurrency for database updates
    }
  );

  complianceClockWorker.on('completed', (job) => {
    console.log(`Compliance clock update job ${job.id} completed`);
  });

  complianceClockWorker.on('failed', (job, error) => {
    console.error(`Compliance clock update job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.COMPLIANCE_CLOCK_UPDATE, complianceClockWorker);

  // Recurring Task Generation Worker
  const recurringTaskWorker = createWorker(
    QUEUE_NAMES.RECURRING_TASK_GENERATION,
    async (job) => {
      if (job.name === 'generate-recurring-tasks') {
        await processRecurringTaskGenerationJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 1, // Low concurrency for scheduled task generation
    }
  );

  recurringTaskWorker.on('completed', (job) => {
    console.log(`Recurring task generation job ${job.id} completed`);
  });

  recurringTaskWorker.on('failed', (job, error) => {
    console.error(`Recurring task generation job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.RECURRING_TASK_GENERATION, recurringTaskWorker);

  // Evidence Expiry Tracking Worker
  const evidenceExpiryWorker = createWorker(
    QUEUE_NAMES.EVIDENCE_EXPIRY_TRACKING,
    async (job) => {
      if (job.name === 'update-evidence-expiry-tracking') {
        await processEvidenceExpiryTrackingJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 2, // Moderate concurrency for expiry tracking
    }
  );

  evidenceExpiryWorker.on('completed', (job) => {
    console.log(`Evidence expiry tracking job ${job.id} completed`);
  });

  evidenceExpiryWorker.on('failed', (job, error) => {
    console.error(`Evidence expiry tracking job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.EVIDENCE_EXPIRY_TRACKING, evidenceExpiryWorker);

  // SLA Breach Timers Worker (also handles breach detection)
  if (workers.has(QUEUE_NAMES.SLA_BREACH_ALERTS)) {
    const existingWorker = workers.get(QUEUE_NAMES.SLA_BREACH_ALERTS);
    if (existingWorker) {
      await existingWorker.close();
    }
  }

  const slaBreachTimersWorker = createWorker(
    QUEUE_NAMES.SLA_BREACH_ALERTS,
    async (job) => {
      if (job.name === 'UPDATE_SLA_BREACH_TIMERS') {
        await processSLABreachTimersJob(job);
      } else if (job.name === 'DETECT_BREACHES_AND_ALERTS') {
        await processDetectBreachesAndAlertsJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 5, // Higher concurrency for high-priority breach detection
    }
  );

  slaBreachTimersWorker.on('completed', (job) => {
    console.log(`SLA breach job ${job.id} completed`);
  });

  slaBreachTimersWorker.on('failed', (job, error) => {
    console.error(`SLA breach job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.SLA_BREACH_ALERTS, slaBreachTimersWorker);

  // Permit Workflows Worker
  const permitWorkflowsWorker = createWorker(
    QUEUE_NAMES.PERMIT_WORKFLOWS,
    async (job) => {
      if (job.name === 'AUTO_CREATE_RENEWAL_WORKFLOWS') {
        await processAutoCreateRenewalWorkflowsJob(job);
      } else if (job.name === 'CHECK_REGULATOR_RESPONSE_DEADLINES') {
        await processCheckRegulatorResponseDeadlinesJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  permitWorkflowsWorker.on('completed', (job) => {
    console.log(`Permit workflow job ${job.id} completed`);
  });

  permitWorkflowsWorker.on('failed', (job, error) => {
    console.error(`Permit workflow job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.PERMIT_WORKFLOWS, permitWorkflowsWorker);

  // Corrective Actions Worker
  const correctiveActionsWorker = createWorker(
    QUEUE_NAMES.CORRECTIVE_ACTIONS,
    async (job) => {
      if (job.name === 'MONITOR_CORRECTIVE_ACTION_ITEMS') {
        await processMonitorCorrectiveActionItemsJob(job);
      } else if (job.name === 'AUTO_TRANSITION_CORRECTIVE_ACTIONS') {
        await processAutoTransitionCorrectiveActionsJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  correctiveActionsWorker.on('completed', (job) => {
    console.log(`Corrective action job ${job.id} completed`);
  });

  correctiveActionsWorker.on('failed', (job, error) => {
    console.error(`Corrective action job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.CORRECTIVE_ACTIONS, correctiveActionsWorker);

  // Validation Processing Worker
  const validationProcessingWorker = createWorker(
    QUEUE_NAMES.VALIDATION_PROCESSING,
    async (job) => {
      if (job.name === 'AUTO_VALIDATE_CONSIGNMENT_NOTES') {
        await processAutoValidateConsignmentNotesJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  validationProcessingWorker.on('completed', (job) => {
    console.log(`Validation processing job ${job.id} completed`);
  });

  validationProcessingWorker.on('failed', (job, error) => {
    console.error(`Validation processing job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.VALIDATION_PROCESSING, validationProcessingWorker);

  // Runtime Monitoring Worker
  const runtimeMonitoringWorker = createWorker(
    QUEUE_NAMES.RUNTIME_MONITORING,
    async (job) => {
      if (job.name === 'FLAG_PENDING_RUNTIME_VALIDATIONS') {
        await processFlagPendingRuntimeValidationsJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  runtimeMonitoringWorker.on('completed', (job) => {
    console.log(`Runtime monitoring job ${job.id} completed`);
  });

  runtimeMonitoringWorker.on('failed', (job, error) => {
    console.error(`Runtime monitoring job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.RUNTIME_MONITORING, runtimeMonitoringWorker);

  // Trigger Execution Worker
  const triggerExecutionWorker = createWorker(
    QUEUE_NAMES.TRIGGER_EXECUTION,
    async (job) => {
      if (job.name === 'EXECUTE_PENDING_RECURRENCE_TRIGGERS') {
        await processExecutePendingRecurrenceTriggersJob(job);
      } else if (job.name === 'PROCESS_TRIGGER_CONDITIONS') {
        await processProcessTriggerConditionsJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  );

  triggerExecutionWorker.on('completed', (job) => {
    console.log(`Trigger execution job ${job.id} completed`);
  });

  triggerExecutionWorker.on('failed', (job, error) => {
    console.error(`Trigger execution job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.TRIGGER_EXECUTION, triggerExecutionWorker);

  // Dashboard Refresh Worker
  const dashboardRefreshWorker = createWorker(
    QUEUE_NAMES.DASHBOARD_REFRESH,
    async (job) => {
      if (job.name === 'REFRESH_COMPLIANCE_DASHBOARD') {
        await processRefreshComplianceDashboardJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      concurrency: 1, // Single concurrent refresh to avoid conflicts
    }
  );

  dashboardRefreshWorker.on('completed', (job) => {
    console.log(`Dashboard refresh job ${job.id} completed`);
  });

  dashboardRefreshWorker.on('failed', (job, error) => {
    console.error(`Dashboard refresh job ${job?.id} failed:`, error);
  });

  workers.set(QUEUE_NAMES.DASHBOARD_REFRESH, dashboardRefreshWorker);


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

