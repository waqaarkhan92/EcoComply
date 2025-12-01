/**
 * Start Workers Now
 * Manually start workers to process documents
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function startWorkers() {
  console.log('🚀 Starting workers manually...\n');
  
  try {
    const { autoStartWorkers } = await import('../lib/workers/auto-start');
    autoStartWorkers();
    
    // Wait a bit to see if they start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Workers should be starting. Check the logs above for confirmation.');
    console.log('💡 If you see "Redis not available", make sure REDIS_URL is set in .env.local');
    console.log('💡 Workers will process any pending document extraction jobs.\n');
    
    // Keep the process alive
    console.log('Workers are running. Press Ctrl+C to stop.\n');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down workers...');
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {
      // Just keep the process running
    }, 10000);
    
  } catch (error: any) {
    console.error('❌ Failed to start workers:', error.message || error);
    console.error('\n💡 Make sure all environment variables are set in .env.local');
    process.exit(1);
  }
}

startWorkers();

