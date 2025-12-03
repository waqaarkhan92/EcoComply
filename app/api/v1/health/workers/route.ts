/**
 * Worker Health Check & Auto-Start Endpoint
 * GET /api/v1/health/workers - Check if workers are running and start them if needed
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Force Node.js runtime (not Edge)

export async function GET(request: NextRequest) {
  try {
    // Lazy imports to avoid loading at module level
    const { getQueue, QUEUE_NAMES, getRedisConnection } = await import('@/lib/queue/queue-manager');
    const { ensureWorkersStarted, areWorkersRunning } = await import('@/lib/workers/worker-auto-start');

    // Automatically start workers if not running
    await ensureWorkersStarted();

    // Check Redis connection
    let redisConnected = false;
    try {
      const redis = getRedisConnection();
      await redis.ping();
      redisConnected = true;
    } catch (error: any) {
      return NextResponse.json({
        status: 'error',
        redis: {
          connected: false,
          error: error.message,
        },
        workers: {
          running: false,
          error: 'Redis not connected',
        },
        message: 'Cannot start workers: Redis is not available. Check REDIS_URL environment variable.',
      }, { status: 503 });
    }

    // Check queue status
    const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    // Check if workers are running
    const workersRunning = areWorkersRunning();

    return NextResponse.json({
      status: workersRunning && redisConnected ? 'healthy' : 'starting',
      redis: {
        connected: redisConnected,
      },
      workers: {
        running: workersRunning,
        queue: {
          waiting,
          active,
          completed,
          failed,
        },
      },
      message: workersRunning
        ? 'Workers are running and processing jobs'
        : 'Workers are starting...',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}






