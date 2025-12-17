/**
 * Background Job Detail Endpoint
 * GET /api/v1/admin/background-jobs/{jobId}
 * 
 * Returns detailed information about a specific background job (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ jobId: string }> }
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
  const { data: job, error } = await supabaseAdmin
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Job not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch job',
        500,
        { error: error?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      job,
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch job',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

