/**
 * Background Job Workers
 * Entry point for worker service
 * Run this as a separate process: npm run worker
 */

import { startAllWorkers, stopAllWorkers } from '../lib/workers/worker-manager';
import { scheduleRecurringJobs } from '../lib/jobs/cron-scheduler';

// Start all workers
startAllWorkers();

// Schedule recurring jobs
scheduleRecurringJobs().catch((error) => {
  console.error('Failed to schedule recurring jobs:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers...');
  await stopAllWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers...');
  await stopAllWorkers();
  process.exit(0);
});

console.log('Background job workers started. Press Ctrl+C to stop.');

