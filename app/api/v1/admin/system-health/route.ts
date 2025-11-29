/**
 * Admin System Health Endpoint
 * GET /api/v1/admin/system-health - System health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Check database connection
    const { error: dbError } = await supabaseAdmin
      .from('system_settings')
      .select('setting_key')
      .limit(1);

    // Get background job stats
    const { data: jobStats } = await supabaseAdmin
      .from('background_jobs')
      .select('status')
      .limit(1000);

    const jobCounts = {
      pending: jobStats?.filter((j: any) => j.status === 'PENDING').length || 0,
      processing: jobStats?.filter((j: any) => j.status === 'PROCESSING').length || 0,
      completed: jobStats?.filter((j: any) => j.status === 'COMPLETED').length || 0,
      failed: jobStats?.filter((j: any) => j.status === 'FAILED').length || 0,
    };

    // Get dead letter queue count
    const { data: dlqCount } = await supabaseAdmin
      .from('dead_letter_queue')
      .select('id', { count: 'exact', head: true });

    const health = {
      status: dbError ? 'degraded' : 'healthy',
      database: {
        connected: !dbError,
        error: dbError?.message || null,
      },
      background_jobs: {
        ...jobCounts,
        total: jobStats?.length || 0,
      },
      dead_letter_queue: {
        count: dlqCount?.length || 0,
      },
      timestamp: new Date().toISOString(),
    };

    return successResponse(health, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Get system health error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

