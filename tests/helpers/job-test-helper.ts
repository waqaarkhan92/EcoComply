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
export async function createTestRedis(): Promise<any> {
  // Check if REDIS_URL is set and try to use real Redis
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        retryStrategy: () => null, // Don't retry in tests
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: false, // Connect immediately
      });

      // Test connection
      await redis.ping();
      return redis;
    } catch (error) {
      console.warn('Redis connection failed, using mock:', error);
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
export async function createTestQueue<T = any>(queueName: string): Promise<Queue<T>> {
  const connection = await createTestRedis();
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
export async function createTestWorker<T = any>(
  queueName: string,
  processor: (job: any) => Promise<void>
): Promise<Worker<T>> {
  const connection = await createTestRedis();
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      try {
        await processor(job);
      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 1, // Single concurrency for predictable tests
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    }
  );

  // Wait for worker to be ready
  await new Promise((resolve) => setTimeout(resolve, 500));
  return worker;
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
  let lastState: string | null = null;
  
  while (Date.now() - startTime < timeout) {
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      
      const state = await job.getState();
      if (state !== lastState) {
        console.log(`Job ${jobId} state: ${state}`);
        lastState = state;
      }
      
      if (state === 'completed') {
        return await job.returnvalue;
      }
      if (state === 'failed') {
        const failedReason = job.failedReason || 'Unknown error';
        throw new Error(`Job failed: ${failedReason}`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: any) {
      if (error.message?.includes('Job failed')) {
        throw error;
      }
      // Continue waiting on other errors
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  
  // Get final state for error message
  try {
    const job = await queue.getJob(jobId);
    const finalState = job ? await job.getState() : 'not found';
    throw new Error(`Job ${jobId} did not complete within ${timeout}ms. Final state: ${finalState}`);
  } catch (error: any) {
    throw new Error(`Job ${jobId} did not complete within ${timeout}ms. ${error.message}`);
  }
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

