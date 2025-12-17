/**
 * Next.js Instrumentation Hook
 * This file runs once when the Next.js server starts
 * Perfect place to initialize workers
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Skip workers in development by default for faster hot reload
    // Set ENABLE_WORKERS_IN_DEV=true to enable workers in dev
    const isDev = process.env.NODE_ENV === 'development';
    const enableWorkersInDev = process.env.ENABLE_WORKERS_IN_DEV === 'true';

    if (isDev && !enableWorkersInDev) {
      console.log('⏭️ Skipping background workers in dev (set ENABLE_WORKERS_IN_DEV=true to enable)');
      return;
    }

    // Only run on Node.js runtime (server-side)
    console.log('🚀 Next.js server starting - initializing background workers...');

    try {
      // Import and start workers
      const { autoStartWorkers } = await import('./lib/workers/auto-start');
      autoStartWorkers();
      console.log('✅ Workers initialization triggered');
    } catch (error) {
      console.error('❌ Failed to initialize workers:', error);
      // Don't crash the app if workers fail to start
    }
  }
}

