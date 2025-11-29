/**
 * Health Check Endpoint
 * GET /api/v1/health
 * 
 * Purpose: Health check endpoint for monitoring and load balancers
 * Authentication: Not required
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const { error: dbError } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .limit(1);

    const databaseStatus = dbError ? 'unhealthy' : 'healthy';

    // Check Redis connection
    let redisStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
      
      if (redisUrl && redisToken) {
        // Try Upstash Redis first
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url: redisUrl, token: redisToken });
        await redis.ping();
        redisStatus = 'healthy';
      } else if (redisUrl && redisUrl.startsWith('redis://')) {
        // Try ioredis for standard Redis
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(redisUrl, { 
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true 
        });
        await redis.connect();
        await redis.ping();
        await redis.quit();
        redisStatus = 'healthy';
      }
    } catch (error) {
      console.error('Redis health check error:', error);
      redisStatus = 'unhealthy';
    }

    // Check Supabase Storage connection
    let storageStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      // Test storage by listing buckets (non-destructive check)
      const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
      storageStatus = storageError ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Storage health check error:', error);
      storageStatus = 'unhealthy';
    }

    const overallStatus =
      databaseStatus === 'healthy' && storageStatus === 'healthy' && redisStatus === 'healthy'
        ? 'healthy'
        : 'degraded';

    return successResponse(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: databaseStatus,
          redis: redisStatus,
          storage: storageStatus,
        },
      },
      200,
      { request_id: request.headers.get('x-request-id') || undefined }
    );
  } catch (error) {
    return successResponse(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'unhealthy',
          redis: 'unhealthy',
          storage: 'unhealthy',
        },
      },
      503
    );
  }
}

