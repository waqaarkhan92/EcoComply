/**
 * Check Worker Status
 * Verifies if the PDF extraction worker is running
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../lib/queue/queue-manager';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not set in .env.local');
  process.exit(1);
}

async function checkWorkerStatus() {
  console.log('🔍 Checking worker status...\n');

  let redis: Redis | null = null;

  try {
    // Connect to Redis
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    await redis.ping();
    console.log('✅ Redis connection: OK\n');

    // Check for active workers in the document processing queue
    const documentQueue = new Queue(QUEUE_NAMES.DOCUMENT_PROCESSING, {
      connection: redis,
    });

    // Get active workers
    const workers = await documentQueue.getWorkers();
    console.log(`📊 Active workers for ${QUEUE_NAMES.DOCUMENT_PROCESSING}: ${workers.length}`);

    if (workers.length > 0) {
      console.log('✅ Worker is RUNNING\n');
      workers.forEach((worker, index) => {
        console.log(`   Worker ${index + 1}: ${worker.name || 'unnamed'}`);
      });
    } else {
      console.log('❌ Worker is NOT running\n');
      console.log('💡 To start the worker, run: npm run worker');
      console.log('   Or use PM2: npm run start:worker');
    }

    // Check queue stats
    console.log('\n📈 Queue Statistics:');
    const waiting = await documentQueue.getWaitingCount();
    const active = await documentQueue.getActiveCount();
    const completed = await documentQueue.getCompletedCount();
    const failed = await documentQueue.getFailedCount();

    console.log(`   Waiting: ${waiting}`);
    console.log(`   Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);

    if (waiting > 0 && workers.length === 0) {
      console.log('\n⚠️  WARNING: There are jobs waiting but no workers are running!');
      console.log('   Start the worker to process these jobs.');
    }

    await documentQueue.close();
    await redis.quit();

    process.exit(workers.length > 0 ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Error checking worker status:', error.message);
    if (redis) {
      await redis.quit();
    }
    process.exit(1);
  }
}

checkWorkerStatus();

