/**
 * Auto-start workers in production
 * This ensures workers are always running when the app starts
 *
 * Uses distributed locking to prevent multiple instances from running duplicate workers
 */

import { startAllWorkers, stopAllWorkers } from './worker-manager';
import { scheduleRecurringJobs } from '../jobs/cron-scheduler';
import { getRedisConnection } from '../queue/queue-manager';

let workersStarted = false;
let workersStarting = false;
let shutdownHandlersRegistered = false;
let leaderLockInterval: ReturnType<typeof setInterval> | null = null;

// Lock settings for distributed coordination
const LEADER_LOCK_KEY = 'ecocomply:worker:leader';
const LEADER_LOCK_TTL = 30; // 30 seconds TTL
const LOCK_REFRESH_INTERVAL = 10000; // Refresh lock every 10 seconds
const INSTANCE_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Try to acquire the leader lock using Redis SET NX EX
 * Only the leader instance runs workers to prevent duplicate processing
 */
async function tryAcquireLeaderLock(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    // SET key value NX EX seconds - atomic operation
    const result = await redis.set(LEADER_LOCK_KEY, INSTANCE_ID, 'EX', LEADER_LOCK_TTL, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('Failed to acquire leader lock:', error);
    return false;
  }
}

/**
 * Refresh the leader lock (only if we own it)
 */
async function refreshLeaderLock(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    // Only refresh if we own the lock (Lua script for atomicity)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, LEADER_LOCK_KEY, INSTANCE_ID, LEADER_LOCK_TTL);
    return result === 1;
  } catch (error) {
    console.error('Failed to refresh leader lock:', error);
    return false;
  }
}

/**
 * Release the leader lock (only if we own it)
 */
async function releaseLeaderLock(): Promise<void> {
  try {
    const redis = getRedisConnection();
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, LEADER_LOCK_KEY, INSTANCE_ID);
  } catch (error) {
    console.error('Failed to release leader lock:', error);
  }
}

/**
 * Start workers automatically when the app starts
 * Uses distributed locking to ensure only one instance runs workers
 *
 * This function is safe to call multiple times - it will only start workers once
 */
export function autoStartWorkers(): void {
  // Skip in development by default to avoid slowness from hot reload
  const isDev = process.env.NODE_ENV === 'development';
  const enableWorkersInDev = process.env.ENABLE_WORKERS_IN_DEV === 'true';

  if (isDev && !enableWorkersInDev) {
    console.log('⏭️ Skipping background workers in dev (set ENABLE_WORKERS_IN_DEV=true to enable)');
    return;
  }

  if (workersStarted || workersStarting) {
    return;
  }

  workersStarting = true;

  setImmediate(async () => {
    try {
      // Try to acquire leader lock for distributed coordination
      const isLeader = await tryAcquireLeaderLock();

      if (!isLeader) {
        console.log(`⏳ Instance ${INSTANCE_ID.substring(0, 12)} waiting - another instance is the worker leader`);
        workersStarting = false;

        // Retry becoming leader periodically (in case current leader dies)
        setTimeout(() => {
          workersStarted = false;
          autoStartWorkers();
        }, LEADER_LOCK_TTL * 1000);
        return;
      }

      console.log(`🚀 Instance ${INSTANCE_ID.substring(0, 12)} is the worker leader`);
      console.log('📋 Starting background workers (PDF extraction, etc.)...');

      startAllWorkers();
      scheduleRecurringJobs().catch((error) => {
        console.error('Failed to schedule recurring jobs:', error);
      });

      workersStarted = true;
      workersStarting = false;
      console.log('✅ Background workers started successfully');

      // Refresh leader lock periodically
      leaderLockInterval = setInterval(async () => {
        const stillLeader = await refreshLeaderLock();
        if (!stillLeader) {
          console.warn('⚠️ Lost leader lock, stopping workers');
          await stopAllWorkers();
          workersStarted = false;
          if (leaderLockInterval) {
            clearInterval(leaderLockInterval);
            leaderLockInterval = null;
          }
          // Try to become leader again
          setTimeout(() => autoStartWorkers(), 5000);
        }
      }, LOCK_REFRESH_INTERVAL);

      // Graceful shutdown handlers
      if (!shutdownHandlersRegistered) {
        const workerShutdown = async () => {
          console.log('Shutdown signal received, releasing leader lock and stopping workers...');
          if (leaderLockInterval) {
            clearInterval(leaderLockInterval);
          }
          await releaseLeaderLock();
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
    }
  });
}

