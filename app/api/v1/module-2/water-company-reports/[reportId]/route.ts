/**
 * Module 2: Water Company Report Status Endpoint
 * GET /api/v1/module-2/water-company-reports/{reportId} - Get report status/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { reportId } = resolvedParams;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid report ID format',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Check job status from queue
    try {
      const queue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);
      const job = await queue.getJob(reportId);

      if (!job) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Report not found',
          404,
          {},
          { request_id: requestId }
        );
      }

      const jobState = await job.getState();
      const jobData = job.data as any;

      // Verify company access
      if (jobData.company_id !== user.company_id) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Access denied to this report',
          403,
          {},
          { request_id: requestId }
        );
      }

      // Get document details
      const { data: document } = await supabaseAdmin
        .from('documents')
        .select('id, reference_number, water_company')
        .eq('id', jobData.document_id)
        .single();

      // Format response based on job state
      if (jobState === 'completed') {
        const result = job.returnvalue as any;
        const completedResponse = successResponse(
          {
            id: reportId,
            consent_id: jobData.document_id,
            status: 'COMPLETED',
            download_url: result?.download_url || null,
            generated_at: result?.generated_at || new Date().toISOString(),
          },
          200,
          { request_id: requestId }
        );
        return await addRateLimitHeaders(request, user.id, completedResponse);
      } else if (jobState === 'failed') {
        const error = job.failedReason;
        const failedResponse = successResponse(
          {
            id: reportId,
            consent_id: jobData.document_id,
            status: 'FAILED',
            error_message: error || 'Report generation failed',
          },
          200,
          { request_id: requestId }
        );
        return await addRateLimitHeaders(request, user.id, failedResponse);
      } else {
        // Job is still processing (active, waiting, delayed)
        const processingResponse = successResponse(
          {
            id: reportId,
            consent_id: jobData.document_id,
            status: 'PROCESSING',
            progress: job.progress || 0,
          },
          202,
          { request_id: requestId }
        );
        return await addRateLimitHeaders(request, user.id, processingResponse);
      }
    } catch (queueError) {
      console.error('Error checking job status:', queueError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to check report status',
        500,
        { error: queueError instanceof Error ? queueError.message : 'Unknown error' },
        { request_id: requestId }
      );
    }
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/water-company-reports/[reportId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

