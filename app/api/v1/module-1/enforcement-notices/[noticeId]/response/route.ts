/**
 * Module 1: Enforcement Notice Response Endpoint
 * POST /api/v1/module-1/enforcement-notices/{id}/response - Submit response to enforcement notice
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const requestId = getRequestId(request);
  const { noticeId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const { response_text, response_document_url, submitted_date } = body;

    // Validate required fields
    if (!response_text) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['response_text'] },
        { request_id: requestId }
      );
    }

    // Get existing notice to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('enforcement_notices')
      .select('id, company_id, status')
      .eq('id', noticeId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Enforcement notice not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this enforcement notice', 403, {}, { request_id: requestId });
    }

    // Check if notice is already closed
    if (existing.status === 'CLOSED') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot submit response to closed enforcement notice',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Update notice with response
    const updateData: any = {
      status: 'RESPONDED',
      response_submitted_at: submitted_date || new Date().toISOString(),
      response_notes: response_text,
      updated_by: user.id,
    };

    if (response_document_url) {
      updateData.response_document_url = response_document_url;
    }

    const { data: notice, error } = await supabaseAdmin
      .from('enforcement_notices')
      .update(updateData)
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to submit response', 500, { error: error.message }, { request_id: requestId });
    }

    if (!notice) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Enforcement notice not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(notice, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/enforcement-notices/{id}/response:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

