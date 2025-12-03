/**
 * Background Job Timeline Endpoint
 * GET /api/v1/admin/background-jobs/{jobId}/timeline
 * 
 * Returns timeline events for a background job (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ jobId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Admin or Owner role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { jobId } = params;

    // Get job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('background_jobs')
      .select('id, created_at, started_at, completed_at, failed_at')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Job not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Build timeline from job data
    const timeline = [];
    
    if (job.created_at) {
      timeline.push({
        timestamp: job.created_at,
        event: 'Job Queued',
        details: { job_id: job.id },
      });
    }

    if (job.started_at) {
      timeline.push({
        timestamp: job.started_at,
        event: 'Job Started',
        details: { job_id: job.id },
      });
    }

    if (job.completed_at) {
      timeline.push({
        timestamp: job.completed_at,
        event: 'Job Completed',
        details: { job_id: job.id },
      });
    }

    if (job.failed_at) {
      timeline.push({
        timestamp: job.failed_at,
        event: 'Job Failed',
        details: { job_id: job.id },
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const response = successResponse(
      timeline,
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching job timeline:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch job timeline',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

