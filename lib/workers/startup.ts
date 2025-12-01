/**
 * Worker Startup
 * Ensures workers start immediately when the app starts
 * This runs on server initialization
 */

import { autoStartWorkers } from './auto-start';

// Start workers immediately when this module is loaded (server-side only)
if (typeof window === 'undefined') {
  // Only run on server
  console.log('🔧 Worker startup module loaded - initializing workers...');
  autoStartWorkers();
}
