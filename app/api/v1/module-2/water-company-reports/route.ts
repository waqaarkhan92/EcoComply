/**
 * Module 2: Water Company Reports Endpoints
 * POST /api/v1/module-2/water-company-reports - Generate water company report (background job)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse request body
    const body = await request.json();
    const { document_id, date_range, parameters } = body;

    // Validate required fields
    if (!document_id) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required field: document_id',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify document exists and is a consent
    // Get site to check company access
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type, reference_number, water_company')
      .eq('id', document_id)
      .eq('document_type', 'TRADE_EFFLUENT_CONSENT')
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consent document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify site access (which implies company access via RLS)
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('company_id')
      .eq('id', document.site_id)
      .single();

    if (!site || site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consent',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Validate date range if provided
    if (date_range) {
      if (!date_range.start || !date_range.end) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'Date range must include both start and end dates',
          400,
          {},
          { request_id: requestId }
        );
      }
    }

    // Generate report job ID
    const jobId = crypto.randomUUID();

    // Queue report generation job
    try {
      const queue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);
      await queue.add('generate-water-company-report', {
        report_id: jobId,
        document_id,
        company_id: site.company_id,
        site_id: document.site_id,
        date_range: date_range || null,
        parameters: parameters || null,
        user_id: user.id,
      }, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    } catch (queueError) {
      console.error('Failed to queue report generation:', queueError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to queue report generation',
        500,
        { error: queueError instanceof Error ? queueError.message : 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Calculate estimated completion time (5 minutes for report generation)
    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + 5);

    const response = successResponse(
      {
        job_id: jobId,
        status: 'QUEUED',
        estimated_completion_time: estimatedCompletion.toISOString(),
      },
      202,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/water-company-reports:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

