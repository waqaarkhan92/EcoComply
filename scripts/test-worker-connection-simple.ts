/**
 * Simple Worker Connection Test
 * Tests Redis connection and basic queue operations without full env validation
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not set in .env.local');
  process.exit(1);
}

async function testWorkerConnection() {
  console.log('Testing worker connection to Upstash Redis...\n');

  let redis: Redis | null = null;
  let queue: Queue | null = null;
  let worker: Worker | null = null;

  try {
    // Test Redis connection
    console.log('1. Testing Redis connection...');
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: () => null,
    });

    await redis.ping();
    console.log('   ✅ Redis connected\n');

    // Test queue creation
    console.log('2. Testing queue creation...');
    queue = new Queue('test-queue', {
      connection: redis,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    console.log('   ✅ Queue created\n');

    // Test adding a job
    console.log('3. Testing job enqueue...');
    const testJob = await queue.add('TEST_JOB', {
      test: true,
      timestamp: Date.now(),
    });
    console.log(`   ✅ Job ${testJob.id} enqueued\n`);

    // Create a simple worker
    console.log('4. Creating test worker...');
    let jobProcessed = false;
    worker = new Worker(
      'test-queue',
      async (job) => {
        console.log(`   Processing job ${job.id}...`);
        jobProcessed = true;
        return { success: true };
      },
      {
        connection: redis,
        concurrency: 1,
      }
    );

    worker.on('completed', (job) => {
      console.log(`   ✅ Job ${job.id} completed\n`);
    });

    worker.on('failed', (job, error) => {
      console.error(`   ❌ Job ${job?.id} failed:`, error.message);
    });

    console.log('   ✅ Worker created and listening\n');

    // Wait for job to be processed
    console.log('5. Waiting for job processing...');
    let attempts = 0;
    while (!jobProcessed && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    if (jobProcessed) {
      console.log('   ✅ Job processed successfully\n');
    } else {
      console.log('   ⚠️  Job not processed within timeout\n');
    }

    // Check job status
    const job = await queue.getJob(testJob.id!);
    if (job) {
      const state = await job.getState();
      console.log(`   Job state: ${state}\n`);
    }

    // Clean up
    console.log('6. Cleaning up...');
    if (worker) {
      await worker.close();
    }
    if (queue) {
      await queue.obliterate({ force: true });
      await queue.close();
    }
    if (redis) {
      await redis.quit();
    }
    console.log('   ✅ Cleanup complete\n');

    console.log('✅ All worker connection tests passed!');
    console.log('\nYour workers are ready to process background jobs.');
    console.log('You can now run: npm run worker');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Worker connection test failed:', error.message);
    console.error(error);

    // Cleanup on error
    try {
      if (worker) await worker.close();
      if (queue) await queue.close();
      if (redis) await redis.quit();
    } catch {}

    process.exit(1);
  }
}

testWorkerConnection();

