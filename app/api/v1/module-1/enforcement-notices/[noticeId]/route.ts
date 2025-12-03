/**
 * Module 1: Enforcement Notice Detail Endpoints
 * GET /api/v1/module-1/enforcement-notices/{id} - Get enforcement notice
 * PUT /api/v1/module-1/enforcement-notices/{id} - Update enforcement notice
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const requestId = getRequestId(request);
  const { noticeId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const { data: notice, error } = await supabaseAdmin
      .from('enforcement_notices')
      .select(`
        id,
        company_id,
        site_id,
        document_id,
        notice_number,
        notice_date,
        notice_type,
        regulator,
        subject,
        description,
        requirements,
        deadline_date,
        status,
        response_submitted_at,
        response_document_url,
        response_notes,
        closed_at,
        closed_by,
        closure_notes,
        metadata,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('id', noticeId)
      .single();

    if (error || !notice) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Enforcement notice not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(notice, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/enforcement-notices/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
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
    const {
      notice_number,
      notice_date,
      notice_type,
      regulator,
      subject,
      description,
      requirements,
      deadline_date,
      metadata,
    } = body;

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

    // Validate notice_type if provided
    if (notice_type) {
      const validNoticeTypes = ['WARNING', 'NOTICE', 'VARIATION', 'SUSPENSION', 'REVOCATION', 'PROSECUTION'];
      if (!validNoticeTypes.includes(notice_type)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid notice_type',
          400,
          { notice_type: `Must be one of: ${validNoticeTypes.join(', ')}` },
          { request_id: requestId }
        );
      }
    }

    const updateData: any = {
      updated_by: user.id,
    };

    if (notice_number !== undefined) updateData.notice_number = notice_number;
    if (notice_date !== undefined) updateData.notice_date = notice_date;
    if (notice_type !== undefined) updateData.notice_type = notice_type;
    if (regulator !== undefined) updateData.regulator = regulator;
    if (subject !== undefined) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (deadline_date !== undefined) updateData.deadline_date = deadline_date;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: notice, error } = await supabaseAdmin
      .from('enforcement_notices')
      .update(updateData)
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update enforcement notice', 500, { error: error.message }, { request_id: requestId });
    }

    if (!notice) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Enforcement notice not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(notice, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/enforcement-notices/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

