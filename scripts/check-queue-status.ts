/**
 * Quick script to check queue status
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

async function main() {
  const redisUrl = process.env.REDIS_URL || '';

  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔍 Connecting to Redis...');
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue('document-processing', {
    connection: redis,
  });

  try {
    console.log('\n📊 Queue Status:');
    const counts = await queue.getJobCounts();
    console.log('Waiting:', counts.waiting);
    console.log('Active:', counts.active);
    console.log('Completed:', counts.completed);
    console.log('Failed:', counts.failed);
    console.log('Delayed:', counts.delayed);

    console.log('\n📋 Recent waiting jobs:');
    const waitingJobs = await queue.getWaiting(0, 5);
    for (const job of waitingJobs) {
      console.log(`  Job ${job.id}: ${job.name}`);
      console.log(`    Data:`, job.data);
    }

    console.log('\n📋 Recent active jobs:');
    const activeJobs = await queue.getActive(0, 5);
    for (const job of activeJobs) {
      console.log(`  Job ${job.id}: ${job.name}`);
      console.log(`    Data:`, job.data);
    }

    console.log('\n📋 Recent failed jobs:');
    const failedJobs = await queue.getFailed(0, 5);
    for (const job of failedJobs) {
      console.log(`  Job ${job.id}: ${job.name}`);
      console.log(`    Failed reason:`, job.failedReason);
    }

    await queue.close();
    await redis.quit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
