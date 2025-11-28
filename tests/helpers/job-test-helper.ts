/**
 * Job Test Helper
 * Utilities for testing background jobs
 */

import { Queue } from 'bullmq';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { MockRedis } from './mock-redis';

let mockRedisInstance: any = null;

/**
 * Create a test Redis connection (in-memory mock or real Redis if available)
 */
export function createTestRedis(): any {
  // Check if REDIS_URL is set and try to use real Redis
  if (process.env.REDIS_URL) {
    try {
      return new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry in tests
        lazyConnect: true, // Don't connect immediately
      });
    } catch {
      // Fall back to mock
    }
  }

  // Use mock Redis for tests
  if (!mockRedisInstance) {
    mockRedisInstance = new MockRedis();
  }
  return mockRedisInstance;
}

/**
 * Create a test queue
 */
export function createTestQueue<T = any>(queueName: string): Queue<T> {
  const connection = createTestRedis();
  return new Queue<T>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 1, // Single attempt for faster tests
      removeOnComplete: true,
      removeOnFail: true,
    },
  });
}

/**
 * Create a test worker
 */
export function createTestWorker<T = any>(
  queueName: string,
  processor: (job: any) => Promise<void>
): Worker<T> {
  const connection = createTestRedis();
  return new Worker<T>(
    queueName,
    async (job) => {
      await processor(job);
    },
    {
      connection,
      concurrency: 1, // Single concurrency for predictable tests
    }
  );
}

/**
 * Wait for a job to complete
 */
export async function waitForJob(
  queue: Queue,
  jobId: string,
  timeout: number = 10000
): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const job = await queue.getJob(jobId);
    if (job && (await job.getState()) === 'completed') {
      return await job.returnvalue;
    }
    if (job && (await job.getState()) === 'failed') {
      throw new Error(`Job failed: ${job.failedReason}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
}

/**
 * Clean up test queues and workers
 */
export async function cleanupTestQueue(queue: Queue, worker?: Worker): Promise<void> {
  if (worker) {
    await worker.close();
  }
  await queue.close();
  await queue.obliterate({ force: true });
}

