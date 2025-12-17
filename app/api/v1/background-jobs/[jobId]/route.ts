/**
 * Background Job Detail Endpoints
 * GET /api/v1/background-jobs/{jobId} - Get job status
 * POST /api/v1/background-jobs/{jobId}/retry - Retry failed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function GET(
  request: NextRequest, props: { params: Promise<{ jobId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { jobId } = params;

    // Get job - RLS will enforce access control
  const { data: job, error } = await supabaseAdmin
      .from('background_jobs')
      .select('id, job_type, status, priority, entity_type, entity_id, result, error_message, started_at, completed_at, created_at, updated_at')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Background job not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch background job',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Calculate progress if job is running
    let progress: number | undefined;
    if (job.status === 'PROCESSING' && job.started_at) {
      // Estimate progress based on job type and elapsed time
      // This is a simplified calculation - actual progress should come from job metadata
      progress = undefined; // Would need job-specific logic
    }

    // Estimate completion time
    let estimatedCompletionTime: string | undefined;
    if (job.status === 'PROCESSING' && job.started_at) {
      const started = new Date(job.started_at);
      const estimated = new Date(started.getTime() + 5 * 60 * 1000); // 5 minutes default
      estimatedCompletionTime = estimated.toISOString();
    }

    const response = successResponse(
      {
        id: job.id,
        job_type: job.job_type,
        status: job.status,
        progress,
        result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        estimated_completion_time: estimatedCompletionTime,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get background job error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

