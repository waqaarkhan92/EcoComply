// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  // Filter out non-critical errors
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    const error = hint.originalException as Error;
    if (error?.message) {
      // Ignore common operational errors
      if (error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('socket hang up')) {
        return null;
      }
    }

    return event;
  },

  // Set tags for better filtering
  initialScope: {
    tags: {
      app: 'ecocomply',
      runtime: 'nodejs',
      environment: process.env.NODE_ENV,
    },
  },
});
