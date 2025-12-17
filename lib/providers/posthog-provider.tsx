'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Initialize PostHog only on client side and in production
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // Disable automatic pageview capture, we'll do it manually
    capture_pageleave: true,
    autocapture: true,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        // In development, don't actually send events
        posthog.opt_out_capturing();
      }
    },
  });
}

/**
 * Capture custom events with PostHog
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  }
}

/**
 * Identify a user in PostHog
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.reset();
  }
}

/**
 * Track pageviews with Next.js App Router
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * PostHog Provider Component
 * Wraps the app to enable analytics tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Don't render PostHog in development or if not configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

// =============================================================================
// ANALYTICS EVENT HELPERS
// =============================================================================

/**
 * Track user signup
 */
export function trackSignup(userId: string, email: string, companyName?: string) {
  identifyUser(userId, { email, company_name: companyName });
  captureEvent('user_signed_up', {
    user_id: userId,
    email,
    company_name: companyName,
  });
}

/**
 * Track document upload
 */
export function trackDocumentUpload(
  documentId: string,
  documentType: string,
  fileSizeBytes: number
) {
  captureEvent('document_uploaded', {
    document_id: documentId,
    document_type: documentType,
    file_size_bytes: fileSizeBytes,
    file_size_mb: (fileSizeBytes / 1024 / 1024).toFixed(2),
  });
}

/**
 * Track extraction completion
 */
export function trackExtractionComplete(
  documentId: string,
  obligationCount: number,
  extractionTimeMs: number,
  confidenceScore?: number
) {
  captureEvent('extraction_completed', {
    document_id: documentId,
    obligation_count: obligationCount,
    extraction_time_ms: extractionTimeMs,
    extraction_time_seconds: (extractionTimeMs / 1000).toFixed(1),
    confidence_score: confidenceScore,
  });
}

/**
 * Track pack generation
 */
export function trackPackGenerated(
  packId: string,
  packType: string,
  itemCount: number,
  siteId?: string
) {
  captureEvent('pack_generated', {
    pack_id: packId,
    pack_type: packType,
    item_count: itemCount,
    site_id: siteId,
  });
}

/**
 * Track evidence linked
 */
export function trackEvidenceLinked(
  evidenceId: string,
  obligationId: string,
  evidenceType: string
) {
  captureEvent('evidence_linked', {
    evidence_id: evidenceId,
    obligation_id: obligationId,
    evidence_type: evidenceType,
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(featureName: string, properties?: Record<string, unknown>) {
  captureEvent('feature_used', {
    feature_name: featureName,
    ...properties,
  });
}

/**
 * Track error occurred
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  context?: Record<string, unknown>
) {
  captureEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}
