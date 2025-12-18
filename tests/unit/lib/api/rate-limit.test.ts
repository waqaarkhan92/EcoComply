/**
 * rate-limit Tests
 * Comprehensive tests for lib/api/rate-limit.ts
 * Target: 100% coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  checkAuthRateLimit,
  getRateLimitStatus,
  getClientIp,
  isAuthEndpoint,
  RATE_LIMIT_CONFIG,
  rateLimitMiddleware,
  authRateLimitMiddleware,
  addRateLimitHeaders,
} from '@/lib/api/rate-limit';

// Mock Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  })),
}));

describe('rate-limit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables for consistent testing
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  });

  describe('RATE_LIMIT_CONFIG', () => {
    it('should have default rate limit configuration', () => {
      expect(RATE_LIMIT_CONFIG.default).toBeDefined();
      expect(RATE_LIMIT_CONFIG.default.limit).toBe(100);
      expect(RATE_LIMIT_CONFIG.default.windowMs).toBe(60000);
    });

    it('should have auth-specific rate limits', () => {
      expect(RATE_LIMIT_CONFIG.auth_login.limit).toBe(5);
      expect(RATE_LIMIT_CONFIG.auth_signup.limit).toBe(3);
      expect(RATE_LIMIT_CONFIG.auth_password_reset.limit).toBe(3);
    });

    it('should have different limits for different buckets', () => {
      expect(RATE_LIMIT_CONFIG.document_upload.limit).toBe(10);
      expect(RATE_LIMIT_CONFIG.ai_extraction.limit).toBe(5);
      expect(RATE_LIMIT_CONFIG.evidence_upload.limit).toBe(20);
      expect(RATE_LIMIT_CONFIG.status_polling.limit).toBe(60);
    });
  });

  describe('isAuthEndpoint', () => {
    it('should identify login endpoint', () => {
      expect(isAuthEndpoint('/api/auth/login')).toBe(true);
    });

    it('should identify signup endpoint', () => {
      expect(isAuthEndpoint('/api/auth/signup')).toBe(true);
    });

    it('should identify password reset endpoints', () => {
      expect(isAuthEndpoint('/api/auth/forgot-password')).toBe(true);
      expect(isAuthEndpoint('/api/auth/reset-password')).toBe(true);
    });

    it('should not identify non-auth endpoints', () => {
      expect(isAuthEndpoint('/api/v1/obligations')).toBe(false);
      expect(isAuthEndpoint('/api/v1/documents')).toBe(false);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });

      expect(getClientIp(request)).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'cf-connecting-ip': '192.168.1.3',
        },
      });

      expect(getClientIp(request)).toBe('192.168.1.3');
    });

    it('should return unknown-ip when no IP headers present', () => {
      const request = new NextRequest('http://localhost/api/test');
      expect(getClientIp(request)).toBe('unknown-ip');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
          'cf-connecting-ip': '192.168.1.3',
        },
      });

      expect(getClientIp(request)).toBe('192.168.1.1');
    });
  });

  describe('checkRateLimit (memory store)', () => {
    it('should allow request within rate limit', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-123';

      const result = await checkRateLimit(userId, request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(RATE_LIMIT_CONFIG.default.limit);
      expect(result.limit).toBe(RATE_LIMIT_CONFIG.default.limit);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should block request when rate limit exceeded', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-456';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.default.limit; i++) {
        await checkRateLimit(userId, request);
      }

      // Next request should be blocked
      const result = await checkRateLimit(userId, request);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-789';

      // First request
      const result1 = await checkRateLimit(userId, request);
      expect(result1.allowed).toBe(true);

      // Wait for window to expire (simulated by mocking time)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + RATE_LIMIT_CONFIG.default.windowMs + 1000);

      // Request should be allowed again
      const result2 = await checkRateLimit(userId, request);
      expect(result2.allowed).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should use different buckets for different endpoints', async () => {
      const userId = 'user-bucket-test';

      const request1 = new NextRequest('http://localhost/api/v1/documents');
      const result1 = await checkRateLimit(userId, request1);

      const request2 = new NextRequest('http://localhost/api/v1/obligations');
      const result2 = await checkRateLimit(userId, request2);

      // Both should be allowed as they use different buckets
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should handle auth login endpoint with strict limits', async () => {
      const request = new NextRequest('http://localhost/api/auth/login');
      const userId = 'user-login';

      // Make requests up to the login limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.auth_login.limit; i++) {
        const result = await checkRateLimit(userId, request);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const blocked = await checkRateLimit(userId, request);
      expect(blocked.allowed).toBe(false);
    });

    it('should handle status polling endpoint with high limits', async () => {
      const request = new NextRequest('http://localhost/api/v1/obligations');
      const userId = 'user-polling';

      // Status polling should have a higher limit (60)
      const result = await checkRateLimit(userId, request);
      expect(result.limit).toBe(RATE_LIMIT_CONFIG.status_polling.limit);
      expect(result.limit).toBe(60);
    });
  });

  describe('checkAuthRateLimit', () => {
    it('should rate limit by IP address', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const result = await checkAuthRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_CONFIG.auth_login.limit);
    });

    it('should rate limit by IP and email', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.101',
        },
      });

      const email = 'test@example.com';
      const result = await checkAuthRateLimit(request, email);

      expect(result.allowed).toBe(true);
    });

    it('should block when IP limit exceeded', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.102',
        },
      });

      // Exhaust IP rate limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.auth_login.limit; i++) {
        await checkAuthRateLimit(request);
      }

      const result = await checkAuthRateLimit(request);
      expect(result.allowed).toBe(false);
    });

    it('should block when email limit exceeded', async () => {
      const email = 'blocked@example.com';

      // Use different IPs but same email
      for (let i = 0; i < RATE_LIMIT_CONFIG.auth_login.limit; i++) {
        const request = new NextRequest('http://localhost/api/auth/login', {
          headers: {
            'x-forwarded-for': `192.168.1.${200 + i}`,
          },
        });
        await checkAuthRateLimit(request, email);
      }

      // Next request with same email should be blocked
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.250',
        },
      });

      const result = await checkAuthRateLimit(request, email);
      expect(result.allowed).toBe(false);
    });

    it('should handle email case-insensitively', async () => {
      const request1 = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.103',
        },
      });

      const request2 = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.104',
        },
      });

      await checkAuthRateLimit(request1, 'Test@Example.com');
      const result = await checkAuthRateLimit(request2, 'test@example.com');

      // Should count towards the same limit
      expect(result.remaining).toBeLessThan(RATE_LIMIT_CONFIG.auth_login.limit);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current status without incrementing', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-status';

      const status1 = await getRateLimitStatus(userId, request);
      const status2 = await getRateLimitStatus(userId, request);

      // Both calls should return the same remaining count
      expect(status1.remaining).toBe(status2.remaining);
      expect(status1.allowed).toBe(true);
    });

    it('should reflect consumed rate limit', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-consumed';

      // Check initial status
      const status1 = await getRateLimitStatus(userId, request);
      const initialRemaining = status1.remaining;

      // Consume rate limit
      await checkRateLimit(userId, request);

      // Check status again
      const status2 = await getRateLimitStatus(userId, request);

      expect(status2.remaining).toBe(initialRemaining - 1);
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should return null when rate limit not exceeded', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-middleware';

      const response = await rateLimitMiddleware(request, userId);

      expect(response).toBeNull();
    });

    it('should return 429 response when rate limit exceeded', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-exceeded';

      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.default.limit; i++) {
        await checkRateLimit(userId, request);
      }

      const response = await rateLimitMiddleware(request, userId);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
      expect(response?.headers.get('X-Rate-Limit-Limit')).toBe(String(RATE_LIMIT_CONFIG.default.limit));
      expect(response?.headers.get('X-Rate-Limit-Remaining')).toBe('0');
      expect(response?.headers.get('Retry-After')).toBeDefined();
    });

    it('should include rate limit headers in error response', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-headers';

      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.default.limit; i++) {
        await checkRateLimit(userId, request);
      }

      const response = await rateLimitMiddleware(request, userId);

      expect(response?.headers.get('X-Rate-Limit-Limit')).toBeDefined();
      expect(response?.headers.get('X-Rate-Limit-Remaining')).toBe('0');
      expect(response?.headers.get('X-Rate-Limit-Reset')).toBeDefined();
    });
  });

  describe('authRateLimitMiddleware', () => {
    it('should return null when auth rate limit not exceeded', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.105',
        },
      });

      const response = await authRateLimitMiddleware(request);

      expect(response).toBeNull();
    });

    it('should return 429 response when auth rate limit exceeded', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.106',
        },
      });

      // Exhaust auth rate limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.auth_login.limit; i++) {
        await checkAuthRateLimit(request);
      }

      const response = await authRateLimitMiddleware(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should add rate limit headers to response', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-add-headers';
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Convert to NextResponse
      const nextResponse = new (await import('next/server')).NextResponse(
        mockResponse.body,
        {
          status: mockResponse.status,
          headers: mockResponse.headers,
        }
      );

      const responseWithHeaders = await addRateLimitHeaders(request, userId, nextResponse);

      expect(responseWithHeaders.headers.get('X-Rate-Limit-Limit')).toBeDefined();
      expect(responseWithHeaders.headers.get('X-Rate-Limit-Remaining')).toBeDefined();
      expect(responseWithHeaders.headers.get('X-Rate-Limit-Reset')).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-error';
      const mockResponse = new (await import('next/server')).NextResponse(
        JSON.stringify({ data: 'test' }),
        { status: 200 }
      );

      // Should not throw even if there's an error
      const response = await addRateLimitHeaders(request, userId, mockResponse);

      expect(response).toBeDefined();
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit after window expires', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-reset';

      // Use up all requests
      for (let i = 0; i < RATE_LIMIT_CONFIG.default.limit; i++) {
        await checkRateLimit(userId, request);
      }

      // Verify blocked
      const blocked = await checkRateLimit(userId, request);
      expect(blocked.allowed).toBe(false);

      // Mock time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + RATE_LIMIT_CONFIG.default.windowMs + 1000);

      // Should be allowed again
      const allowed = await checkRateLimit(userId, request);
      expect(allowed.allowed).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-concurrent';

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => checkRateLimit(userId, request));
      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('remaining');
        expect(result).toHaveProperty('resetAt');
      });
    });

    it('should handle unknown IP gracefully', async () => {
      const request = new NextRequest('http://localhost/api/auth/login');
      const ip = getClientIp(request);

      expect(ip).toBe('unknown-ip');

      // Should still be able to rate limit
      const result = await checkAuthRateLimit(request);
      expect(result.allowed).toBe(true);
    });

    it('should handle different endpoint types correctly', async () => {
      const userId = 'user-endpoints';

      const endpoints = [
        { path: '/api/auth/login', expectedLimit: RATE_LIMIT_CONFIG.auth_login.limit },
        { path: '/api/auth/signup', expectedLimit: RATE_LIMIT_CONFIG.auth_signup.limit },
        { path: '/api/v1/documents', expectedLimit: RATE_LIMIT_CONFIG.document_upload.limit },
        { path: '/api/v1/ai-extraction', expectedLimit: RATE_LIMIT_CONFIG.ai_extraction.limit },
        { path: '/api/v1/evidence', expectedLimit: RATE_LIMIT_CONFIG.evidence_upload.limit },
        { path: '/api/v1/obligations', expectedLimit: RATE_LIMIT_CONFIG.status_polling.limit },
        { path: '/api/v1/other', expectedLimit: RATE_LIMIT_CONFIG.default.limit },
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost${endpoint.path}`);
        const result = await checkRateLimit(userId, request);
        expect(result.limit).toBe(endpoint.expectedLimit);
      }
    });
  });

  describe('Redis Fallback', () => {
    it('should fall back to memory store when Redis fails', async () => {
      // Set Redis env vars but mock will fail
      process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

      // Mock Redis to throw an error
      const { Redis } = await import('@upstash/redis');
      (Redis as any).mockImplementationOnce(() => ({
        get: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      }));

      const request = new NextRequest('http://localhost/api/v1/test');
      const userId = 'user-fallback';

      // Should fall back to memory store and still work
      const result = await checkRateLimit(userId, request);
      expect(result.allowed).toBe(true);
    });
  });
});
