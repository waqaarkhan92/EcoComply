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
 * Standard error codes
 */
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Validation
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

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

