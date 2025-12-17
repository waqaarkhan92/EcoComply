/**
 * Module 3: AER Document Detail Endpoints
 * GET /api/v1/module-3/aer/[aerId] - Get AER document details/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ aerId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { aerId } = params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Fetch AER document
    const { data: aerDoc, error } = await supabaseAdmin
      .from('aer_documents')
      .select(`
        id,
        document_id,
        company_id,
        reporting_period_start,
        reporting_period_end,
        submission_deadline,
        status,
        generator_data,
        fuel_consumption_data,
        emissions_data,
        incidents_data,
        total_run_hours,
        is_validated,
        validation_errors,
        generated_file_path,
        generated_at,
        submitted_at,
        submission_reference,
        submitted_by,
        notes,
        created_at,
        updated_at,
        documents!inner(
          id,
          site_id,
          title,
          reference_number
        )
      `)
      .eq('id', aerId)
      .single();

    if (error || !aerDoc) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'AER document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Check access via RLS (company_id must match)
    if (aerDoc.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this AER document',
        403,
        {},
        { request_id: requestId }
      );
    }

    // If status is DRAFT or generation is in progress, return 202
    if (aerDoc.status === 'DRAFT' || !aerDoc.generated_file_path) {
      const generatingResponse = successResponse(
        {
          ...aerDoc,
          status: 'GENERATING',
          message: 'AER generation in progress',
        },
        202,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, generatingResponse);
    }

    // Get download URL if file exists
    let downloadUrl = null;
    if (aerDoc.generated_file_path) {
      const { data: urlData } = supabaseAdmin.storage
        .from('documents')
        .getPublicUrl(aerDoc.generated_file_path);
      downloadUrl = urlData.publicUrl;
    }

    const response = successResponse(
      {
        ...aerDoc,
        download_url: downloadUrl,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/aer/[aerId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

