/**
 * Background Jobs Metrics Endpoint
 * GET /api/v1/admin/background-jobs/metrics
 * 
 * Returns metrics for background jobs (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Admin or Owner role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get job counts from background_jobs table
    const { count: totalJobs } = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true });

    const { count: activeJobs } = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: completedJobs } = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedJobs } = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Calculate success rate
    const totalProcessed = (completedJobs || 0) + (failedJobs || 0);
    const successRate = totalProcessed > 0
      ? Math.round(((completedJobs || 0) / totalProcessed) * 100)
      : 100;

    // Get average processing time
    const { data: completedJobsData } = await supabaseAdmin
      .from('background_jobs')
      .select('duration_ms')
      .eq('status', 'completed')
      .not('duration_ms', 'is', null)
      .limit(1000);

    const avgProcessingTime = completedJobsData && completedJobsData.length > 0
      ? Math.round(completedJobsData.reduce((sum, job) => sum + (job.duration_ms || 0), 0) / completedJobsData.length)
      : 0;

    // Determine queue health
    const failureRate = totalProcessed > 0 ? ((failedJobs || 0) / totalProcessed) * 100 : 0;
    let queueHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failureRate > 20) {
      queueHealth = 'unhealthy';
    } else if (failureRate > 10) {
      queueHealth = 'degraded';
    }

    const metrics = {
      total_jobs: totalJobs || 0,
      active_jobs: activeJobs || 0,
      success_rate: successRate,
      failed_jobs: failedJobs || 0,
      avg_processing_time: avgProcessingTime,
      queue_health: queueHealth,
    };

    const response = successResponse(
      metrics,
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching job metrics:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch job metrics',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

