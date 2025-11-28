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

    // Check storage (Supabase Storage is always available if DB is healthy)
    const storageStatus = databaseStatus === 'healthy' ? 'healthy' : 'unhealthy';

    // TODO: Check Redis connection (when Redis is set up in Phase 4)
    const redisStatus = 'healthy'; // Placeholder until Redis is configured

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

