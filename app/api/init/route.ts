/**
 * Initialization Endpoint
 * Called on app startup to initialize workers and background services
 * Call this endpoint to start workers manually
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Force Node.js runtime (not Edge)

export async function GET() {
  // Lazy import to avoid loading worker code at module level
  const { ensureWorkersStarted } = await import('@/lib/workers/worker-auto-start');
  try {
    await ensureWorkersStarted();

    return NextResponse.json({
      status: 'initialized',
      message: 'Workers and background services initialized',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Initialization error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
