/**
 * Worker Manager
 * Manages BullMQ workers for background job processing
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 1.1
 */

import { Worker, WorkerOptions } from 'bullmq';
import { getRedisConnection } from '../queue/queue-manager';
import { QUEUE_NAMES } from '../queue/queue-manager';
import { processDocumentJob } from '../jobs/document-processing-job';

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

  // Document Processing Worker
  const documentWorker = createWorker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      if (job.name === 'DOCUMENT_EXTRACTION') {
        await processDocumentJob(job);
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

