// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay is expensive - only sample 1% of sessions, 100% of errors
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out non-critical errors
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    // Filter out known non-critical errors
    const error = hint.originalException as Error;
    if (error?.message) {
      // Ignore network errors that are user-side issues
      if (error.message.includes('NetworkError') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Load failed') ||
          error.message.includes('ChunkLoadError')) {
        return null;
      }
    }

    return event;
  },

  // Set user context when available
  initialScope: {
    tags: {
      app: 'ecocomply',
      environment: process.env.NODE_ENV,
    },
  },
});
