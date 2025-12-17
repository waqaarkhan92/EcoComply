/**
 * Response Caching Headers Utility
 * Adds appropriate Cache-Control and ETag headers to API responses
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export type CacheStrategy =
  | 'no-store' // Never cache (sensitive data, real-time)
  | 'private' // Cache only in browser (user-specific data)
  | 'public-short' // Cache publicly for 1 minute (semi-dynamic)
  | 'public-medium' // Cache publicly for 5 minutes (infrequently changing)
  | 'public-long' // Cache publicly for 1 hour (static reference data)
  | 'immutable'; // Cache forever (versioned assets)

interface CacheConfig {
  directive: string;
  maxAge: number;
  staleWhileRevalidate?: number;
}

const CACHE_CONFIGS: Record<CacheStrategy, CacheConfig> = {
  'no-store': {
    directive: 'no-store, no-cache, must-revalidate',
    maxAge: 0,
  },
  private: {
    directive: 'private',
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 30,
  },
  'public-short': {
    directive: 'public',
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 30,
  },
  'public-medium': {
    directive: 'public',
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60,
  },
  'public-long': {
    directive: 'public',
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 300,
  },
  immutable: {
    directive: 'public, immutable',
    maxAge: 31536000, // 1 year
  },
};

/**
 * Generate ETag from response data
 */
export function generateETag(data: unknown): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Add cache headers to a NextResponse
 */
export function addCacheHeaders(
  response: NextResponse,
  strategy: CacheStrategy,
  options?: {
    /** Custom ETag value */
    etag?: string;
    /** Data to generate ETag from */
    data?: unknown;
    /** Additional Vary headers */
    vary?: string[];
    /** Custom max-age override */
    maxAge?: number;
  }
): NextResponse {
  const config = CACHE_CONFIGS[strategy];
  const maxAge = options?.maxAge ?? config.maxAge;

  // Build Cache-Control header
  let cacheControl = config.directive;
  if (maxAge > 0) {
    cacheControl += `, max-age=${maxAge}`;
    if (config.staleWhileRevalidate) {
      cacheControl += `, stale-while-revalidate=${config.staleWhileRevalidate}`;
    }
  }

  response.headers.set('Cache-Control', cacheControl);

  // Add ETag if provided or can be generated
  const etag = options?.etag ?? (options?.data ? generateETag(options.data) : null);
  if (etag) {
    response.headers.set('ETag', etag);
  }

  // Add Vary header for proper cache key generation
  const varyHeaders = ['Accept', 'Accept-Encoding', ...(options?.vary || [])];
  response.headers.set('Vary', varyHeaders.join(', '));

  return response;
}

/**
 * Check if client cache is still valid (304 Not Modified support)
 */
export function checkConditionalRequest(
  request: Request,
  currentETag: string
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (!ifNoneMatch) return false;

  // Handle multiple ETags in If-None-Match
  const clientETags = ifNoneMatch.split(',').map((tag) => tag.trim());
  return clientETags.includes(currentETag) || clientETags.includes('*');
}

/**
 * Create a 304 Not Modified response
 */
export function notModifiedResponse(etag: string): NextResponse {
  const response = new NextResponse(null, { status: 304 });
  response.headers.set('ETag', etag);
  return response;
}

/**
 * Determine cache strategy based on endpoint type
 */
export function getCacheStrategyForEndpoint(pathname: string): CacheStrategy {
  // Static reference data - cache for 1 hour
  if (
    pathname.includes('/modules') ||
    pathname.includes('/categories') ||
    pathname.includes('/frequencies') ||
    pathname.includes('/regulators')
  ) {
    return 'public-long';
  }

  // Semi-static data - cache for 5 minutes
  if (
    pathname.includes('/sites') ||
    pathname.includes('/companies')
  ) {
    return 'public-medium';
  }

  // User-specific data - private cache
  if (
    pathname.includes('/me') ||
    pathname.includes('/profile') ||
    pathname.includes('/preferences')
  ) {
    return 'private';
  }

  // Real-time or sensitive data - no cache
  if (
    pathname.includes('/auth') ||
    pathname.includes('/obligations') ||
    pathname.includes('/evidence') ||
    pathname.includes('/packs') ||
    pathname.includes('/extraction')
  ) {
    return 'no-store';
  }

  // Default to short public cache
  return 'public-short';
}

/**
 * Wrapper to add cache headers based on endpoint
 */
export function withCacheHeaders(
  response: NextResponse,
  pathname: string,
  data?: unknown
): NextResponse {
  const strategy = getCacheStrategyForEndpoint(pathname);
  return addCacheHeaders(response, strategy, { data });
}
