/**
 * Background Job Workers
 * Entry point for worker service
 * Run this as a separate process: node workers/index.js
 */

import { startAllWorkers, stopAllWorkers } from '../lib/workers/worker-manager';

// Start all workers
startAllWorkers();

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

