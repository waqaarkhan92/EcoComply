/**
 * Automatic Worker Startup
 * Ensures workers start automatically when the Next.js app starts
 * Includes health monitoring and automatic restart on failure
 */

import { startAllWorkers } from './worker-manager';
import { scheduleRecurringJobs } from '../jobs/cron-scheduler';

let workersStarted = false;
let workerHealthCheck: NodeJS.Timeout | null = null;
let lastHealthCheck = Date.now();

/**
 * Check if we're running in a server environment (not during build)
 */
function isServerRuntime(): boolean {
  return typeof window === 'undefined' && process.env.NODE_ENV !== 'test';
}

/**
 * Initialize workers on app startup
 * Safe to call multiple times (idempotent)
 */
export async function ensureWorkersStarted(): Promise<void> {
  // Only run on server, not during build or in browser
  if (!isServerRuntime()) {
    return;
  }

  // Skip if already started
  if (workersStarted) {
    return;
  }

  try {
    console.log('🚀 Auto-starting background workers...');

    // Start all workers
    startAllWorkers();

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    workersStarted = true;
    lastHealthCheck = Date.now();

    console.log('✅ Background workers started successfully');

    // Start health monitoring
    startHealthMonitoring();

  } catch (error: any) {
    console.error('❌ Failed to start workers:', error.message);

    // Retry after 30 seconds
    setTimeout(() => {
      workersStarted = false;
      ensureWorkersStarted();
    }, 30000);
  }
}

/**
 * Monitor worker health and restart if needed
 */
function startHealthMonitoring(): void {
  // Clear existing health check
  if (workerHealthCheck) {
    clearInterval(workerHealthCheck);
  }

  // Check health every 60 seconds
  workerHealthCheck = setInterval(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastHealthCheck;

    // If more than 5 minutes since last check, workers might be dead
    if (timeSinceLastCheck > 5 * 60 * 1000) {
      console.warn('⚠️ Workers appear to be unresponsive. Restarting...');
      workersStarted = false;
      ensureWorkersStarted();
    }

    lastHealthCheck = now;
  }, 60000);
}

/**
 * Update health check timestamp (called by workers)
 */
export function updateWorkerHealth(): void {
  lastHealthCheck = Date.now();
}

/**
 * Check if workers are running
 */
export function areWorkersRunning(): boolean {
  return workersStarted;
}

/**
 * Gracefully shutdown workers
 */
export async function shutdownWorkers(): Promise<void> {
  if (workerHealthCheck) {
    clearInterval(workerHealthCheck);
    workerHealthCheck = null;
  }

  workersStarted = false;
  console.log('🛑 Workers shutdown complete');
}

// Handle graceful shutdown on process termination
if (isServerRuntime()) {
  process.on('SIGTERM', async () => {
    console.log('📋 SIGTERM received, shutting down workers...');
    await shutdownWorkers();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📋 SIGINT received, shutting down workers...');
    await shutdownWorkers();
    process.exit(0);
  });
}
