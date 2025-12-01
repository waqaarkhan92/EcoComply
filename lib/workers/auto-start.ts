/**
 * Auto-start workers in production
 * This ensures workers are always running when the app starts
 * 
 * Workers will ALWAYS start when the app starts to ensure PDF extraction works
 */

import { startAllWorkers, stopAllWorkers } from './worker-manager';
import { scheduleRecurringJobs } from '../jobs/cron-scheduler';

let workersStarted = false;
let workersStarting = false;
let shutdownHandlersRegistered = false;

/**
 * Start workers automatically when the app starts
 * This ensures PDF extraction and other background jobs always work
 * 
 * This function is safe to call multiple times - it will only start workers once
 */
export function autoStartWorkers(): void {
  // Always start workers when the app starts (ensures PDF extraction works)
  if (workersStarted) {
    return; // Already started
  }
  
  if (workersStarting) {
    return; // Already in progress
  }
  
  workersStarting = true;
  
  // Use setImmediate to avoid blocking the current execution
  setImmediate(() => {
    try {
      console.log('🚀 Auto-starting background workers (PDF extraction, etc.)...');
      console.log('📋 This ensures documents are automatically extracted when uploaded');
      startAllWorkers();
      scheduleRecurringJobs().catch((error) => {
        console.error('Failed to schedule recurring jobs:', error);
      });
      workersStarted = true;
      workersStarting = false;
      console.log('✅ Background workers started successfully - PDF extraction is ready!');
      console.log('📝 Workers will automatically process any uploaded documents');
      
      // Graceful shutdown handlers (only register once per process)
      if (!shutdownHandlersRegistered) {
        const workerShutdown = async () => {
          console.log('Shutdown signal received, shutting down workers...');
          await stopAllWorkers();
          process.exit(0);
        };
        process.once('SIGTERM', workerShutdown);
        process.once('SIGINT', workerShutdown);
        shutdownHandlersRegistered = true;
      }
    } catch (error) {
      workersStarting = false;
      console.error('❌ Failed to start workers:', error);
      // Don't crash the app if workers fail to start, but log the error
    }
  });
}

