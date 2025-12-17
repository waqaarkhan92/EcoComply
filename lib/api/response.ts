/**
 * Standard API Response Utilities
 * Provides consistent response formatting across all API endpoints
 */

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id?: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    cursor?: string;
    limit: number;
    has_more: boolean;
  };
}

/**
 * Add rate limit headers to a NextResponse
 * Spec requires: X-Rate-Limit-Limit, X-Rate-Limit-Remaining, X-Rate-Limit-Reset
 */
export function addRateLimitHeadersToResponse(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number,
  retryAfter?: number
): NextResponse {
  response.headers.set('X-Rate-Limit-Limit', String(limit));
  response.headers.set('X-Rate-Limit-Remaining', String(remaining));
  response.headers.set('X-Rate-Limit-Reset', String(Math.floor(resetAt / 1000)));
  if (retryAfter !== undefined) {
    response.headers.set('Retry-After', String(retryAfter));
  }
  return response;
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: { request_id?: string }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: {
        request_id: meta?.request_id,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any,
  meta?: { request_id?: string }
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
      meta: {
        request_id: meta?.request_id,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  cursor?: string,
  limit: number = 20,
  hasMore: boolean = false,
  meta?: { request_id?: string }
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      data,
      pagination: {
        cursor,
        limit,
        has_more: hasMore,
      },
      meta: {
        request_id: meta?.request_id,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}

/**
 * Add cache control headers to a response
 * @param response - The NextResponse to add headers to
 * @param maxAge - Cache duration in seconds (default: 60)
 * @param staleWhileRevalidate - Stale-while-revalidate duration (default: 30)
 * @returns The response with cache headers
 */
export function addCacheHeaders<T>(
  response: NextResponse<T>,
  maxAge: number = 60,
  staleWhileRevalidate: number = 30
): NextResponse<T> {
  response.headers.set(
    'Cache-Control',
    `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  return response;
}

/**
 * Create a cached success response (for GET endpoints with relatively static data)
 */
export function cachedSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: { request_id?: string },
  cacheSeconds: number = 60
): NextResponse<ApiResponse<T>> {
  const response = NextResponse.json(
    {
      data,
      meta: {
        request_id: meta?.request_id,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
  return addCacheHeaders(response, cacheSeconds, Math.floor(cacheSeconds / 2));
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Validation
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const;

