/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 * Uses Redis (Upstash) when available, falls back to in-memory for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, ErrorCodes } from './response';
import { getRequestId } from './middleware';

// In-memory rate limit store (fallback when Redis is not available)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configuration per endpoint type
export const RATE_LIMIT_CONFIG = {
  default: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Auth endpoints - strict limits to prevent brute force attacks
  auth_login: {
    limit: 5,
    windowMs: 60 * 1000, // 5 attempts per minute
  },
  auth_signup: {
    limit: 3,
    windowMs: 60 * 1000, // 3 signups per minute per IP
  },
  auth_password_reset: {
    limit: 3,
    windowMs: 60 * 1000, // 3 reset requests per minute
  },
  document_upload: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  ai_extraction: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  evidence_upload: {
    limit: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  audit_pack_generation: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  status_polling: {
    limit: 60, // Allow 60 requests per minute for status/obligations polling (1 per second)
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Get endpoint type from request path
 */
function getEndpointType(pathname: string): RateLimitType {
  // Auth endpoints - check first for security
  if (pathname.includes('/auth/login')) {
    return 'auth_login';
  }
  if (pathname.includes('/auth/signup')) {
    return 'auth_signup';
  }
  if (pathname.includes('/auth/forgot-password') || pathname.includes('/auth/reset-password')) {
    return 'auth_password_reset';
  }
  if (pathname.includes('/documents') && pathname.match(/\/documents$/)) {
    return 'document_upload';
  }
  // Status polling endpoints (extraction-status, obligations) need higher limits
  if (pathname.includes('/extraction-status') || pathname.includes('/obligations')) {
    return 'status_polling';
  }
  if (pathname.includes('/ai-extraction') || pathname.includes('/extract')) {
    return 'ai_extraction';
  }
  if (pathname.includes('/evidence') && pathname.match(/\/evidence$/)) {
    return 'evidence_upload';
  }
  if (pathname.includes('/audit-packs') || pathname.includes('/packs')) {
    return 'audit_pack_generation';
  }
  return 'default';
}

/**
 * Check if the endpoint is an auth endpoint that requires IP-based rate limiting
 */
export function isAuthEndpoint(pathname: string): boolean {
  return (
    pathname.includes('/auth/login') ||
    pathname.includes('/auth/signup') ||
    pathname.includes('/auth/forgot-password') ||
    pathname.includes('/auth/reset-password')
  );
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for client IP (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a generic identifier
  return 'unknown-ip';
}

/**
 * Check rate limit for auth endpoints using IP + optional email
 * This is specifically for unauthenticated endpoints where userId is not available
 */
export async function checkAuthRateLimit(
  request: NextRequest,
  email?: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> {
  const pathname = request.nextUrl.pathname;
  const endpointType = getEndpointType(pathname);
  const config = RATE_LIMIT_CONFIG[endpointType];

  const clientIp = getClientIp(request);

  // Create rate limit key based on IP and optionally email
  // This prevents both IP-based brute force and targeted email attacks
  const ipKey = `auth:ip:${clientIp}:${endpointType}`;
  const emailKey = email ? `auth:email:${email.toLowerCase()}:${endpointType}` : null;

  // Check IP-based rate limit
  const hasRedis =
    (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN);

  let ipResult: { allowed: boolean; remaining: number; resetAt: number };
  let emailResult: { allowed: boolean; remaining: number; resetAt: number } | null = null;

  if (hasRedis) {
    try {
      ipResult = await rateLimitRedis(ipKey, config.limit, config.windowMs);
      if (emailKey) {
        // Also check email-specific limit (same limit applies)
        emailResult = await rateLimitRedis(emailKey, config.limit, config.windowMs);
      }
    } catch (error) {
      // Fall back to memory store
      ipResult = rateLimitMemory(ipKey, config.limit, config.windowMs);
      if (emailKey) {
        emailResult = rateLimitMemory(emailKey, config.limit, config.windowMs);
      }
    }
  } else {
    ipResult = rateLimitMemory(ipKey, config.limit, config.windowMs);
    if (emailKey) {
      emailResult = rateLimitMemory(emailKey, config.limit, config.windowMs);
    }
  }

  // Block if either IP or email limit is exceeded
  const blocked = !ipResult.allowed || (emailResult && !emailResult.allowed);
  const remaining = emailResult
    ? Math.min(ipResult.remaining, emailResult.remaining)
    : ipResult.remaining;
  const resetAt = emailResult
    ? Math.max(ipResult.resetAt, emailResult.resetAt)
    : ipResult.resetAt;

  return {
    allowed: !blocked,
    remaining,
    resetAt,
    limit: config.limit,
  };
}

/**
 * Rate limiting middleware for auth endpoints
 * Uses IP-based limiting instead of userId
 */
export async function authRateLimitMiddleware(
  request: NextRequest,
  email?: string
): Promise<NextResponse | null> {
  const requestId = getRequestId(request);

  try {
    const result = await checkAuthRateLimit(request, email);

    if (!result.allowed) {
      const resetSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

      const response = errorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Too many attempts. Please try again later.',
        429,
        {
          limit: result.limit,
          reset_at: new Date(result.resetAt).toISOString(),
          retry_after_seconds: resetSeconds,
        },
        { request_id: requestId }
      );

      response.headers.set('X-Rate-Limit-Limit', String(result.limit));
      response.headers.set('X-Rate-Limit-Remaining', '0');
      response.headers.set('X-Rate-Limit-Reset', String(Math.floor(result.resetAt / 1000)));
      response.headers.set('Retry-After', String(resetSeconds));

      return response;
    }

    return null;
  } catch (error: any) {
    console.error('Auth rate limit check error:', error);
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Rate limit using Redis (Upstash)
 */
async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    // Dynamic import to avoid errors when Redis is not configured
    const { Redis } = await import('@upstash/redis');
    
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
    
    if (!redisUrl || !redisToken) {
      throw new Error('Redis URL or token not configured');
    }
    
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const redisKey = `rate_limit:${key}:${windowStart}`;

    // Get current count
    const count = await redis.get<number>(redisKey) || 0;

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + windowMs,
      };
    }

    // Increment count
    await redis.incr(redisKey);
    await redis.expire(redisKey, Math.ceil(windowMs / 1000));

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: windowStart + windowMs,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fall through to memory store
    throw error;
  }
}

/**
 * Rate limit using in-memory store (fallback)
 */
function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = now - (now % windowMs);
  const storeKey = `${key}:${windowStart}`;

  const current = memoryStore.get(storeKey) || { count: 0, resetAt: windowStart + windowMs };

  // Clean up expired entries
  if (current.resetAt < now) {
    memoryStore.delete(storeKey);
    current.count = 0;
    current.resetAt = windowStart + windowMs;
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  // Increment count
  current.count++;
  memoryStore.set(storeKey, current);

  // Clean up old entries periodically (every 100 requests)
  if (memoryStore.size > 1000) {
    const cutoff = now - windowMs * 2;
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetAt < cutoff) {
        memoryStore.delete(key);
      }
    }
  }

  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
  };
}

/**
 * Check rate limit for a user (without incrementing)
 * Used for getting current rate limit status without affecting the count
 */
export async function getRateLimitStatus(
  userId: string,
  request: NextRequest
): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> {
  const pathname = request.nextUrl.pathname;
  const endpointType = getEndpointType(pathname);
  const config = RATE_LIMIT_CONFIG[endpointType];

  // Create rate limit key
  const key = `${userId}:${endpointType}`;

  // Try Redis first if available
  const hasRedis =
    (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN);

  if (hasRedis) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
      
      if (redisUrl && redisToken) {
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const now = Date.now();
        const windowStart = now - (now % config.windowMs);
        const redisKey = `rate_limit:${key}:${windowStart}`;
        
        const count = await redis.get<number>(redisKey) || 0;
        const remaining = Math.max(0, config.limit - count);
        
        return {
          allowed: count < config.limit,
          remaining,
          resetAt: windowStart + config.windowMs,
          limit: config.limit,
        };
      }
    } catch (error) {
      // Fall back to memory store
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis rate limit status check failed, using memory store:', error);
      }
    }
  }

  // Use memory store (fallback)
  const now = Date.now();
  const windowStart = now - (now % config.windowMs);
  const storeKey = `${key}:${windowStart}`;
  const current = memoryStore.get(storeKey) || { count: 0, resetAt: windowStart + config.windowMs };
  
  if (current.resetAt < now) {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: windowStart + config.windowMs,
      limit: config.limit,
    };
  }

  return {
    allowed: current.count < config.limit,
    remaining: Math.max(0, config.limit - current.count),
    resetAt: current.resetAt,
    limit: config.limit,
  };
}

/**
 * Check rate limit for a user (increments counter)
 */
export async function checkRateLimit(
  userId: string,
  request: NextRequest
): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> {
  const pathname = request.nextUrl.pathname;
  const endpointType = getEndpointType(pathname);
  const config = RATE_LIMIT_CONFIG[endpointType];

  // Create rate limit key
  const key = `${userId}:${endpointType}`;

  // Try Redis first if available
  const hasRedis =
    (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN);

  if (hasRedis) {
    try {
      const result = await rateLimitRedis(key, config.limit, config.windowMs);
      return { ...result, limit: config.limit };
    } catch (error) {
      // Fall back to memory store
      // Only log warning in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis rate limiting failed, using memory store:', error);
      }
    }
  }

  // Use memory store (fallback)
  const result = rateLimitMemory(key, config.limit, config.windowMs);
  return { ...result, limit: config.limit };
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  const requestId = getRequestId(request);

  try {
    const result = await checkRateLimit(userId, request);

    if (!result.allowed) {
      const resetSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

      const response = errorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        429,
        {
          limit: result.limit,
          reset_at: new Date(result.resetAt).toISOString(),
        },
        { request_id: requestId }
      );

      // Add rate limit headers (spec format: X-Rate-Limit-*)
      response.headers.set('X-Rate-Limit-Limit', String(result.limit));
      response.headers.set('X-Rate-Limit-Remaining', '0');
      response.headers.set('X-Rate-Limit-Reset', String(Math.floor(result.resetAt / 1000)));
      response.headers.set('Retry-After', String(resetSeconds));

      return response;
    }

    // Add rate limit headers to successful responses
    const pathname = request.nextUrl.pathname;
    const endpointType = getEndpointType(pathname);
    const config = RATE_LIMIT_CONFIG[endpointType];

    // Create a response placeholder (will be replaced by actual response)
    // We'll need to add headers in the actual endpoint handlers
    return null;
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Add rate limit headers to response (without incrementing counter)
 * Use this after the rate limit check has already been performed
 */
export async function addRateLimitHeaders(
  request: NextRequest,
  userId: string,
  response: NextResponse
): Promise<NextResponse> {
  try {
    const result = await getRateLimitStatus(userId, request);
    // Use spec-compliant header format: X-Rate-Limit-*
    response.headers.set('X-Rate-Limit-Limit', String(result.limit));
    response.headers.set('X-Rate-Limit-Remaining', String(result.remaining));
    response.headers.set('X-Rate-Limit-Reset', String(Math.floor(result.resetAt / 1000)));
    return response;
  } catch (error) {
    // On error, return response without headers
    return response;
  }
}

