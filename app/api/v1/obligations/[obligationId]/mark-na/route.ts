/**
 * Mark Obligation as Not Applicable
 * PUT /api/v1/obligations/{obligationId}/mark-na
 * 
 * Marks an obligation as NOT_APPLICABLE with required reason for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { obligationId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { obligationId } = params;

    // Parse request body
    const body = await request.json();

    // Validate required reason
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 1) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Reason is required for marking obligation as not applicable',
        422,
        { reason: 'Reason is required and must be a non-empty string' },
        { request_id: requestId }
      );
    }

    // Check if obligation exists and user has access (RLS will enforce)
    const { data: existingObligation, error: checkError } = await supabaseAdmin
      .from('obligations')
      .select('id, status, review_status')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingObligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update obligation status and review_status
    const updates = {
      status: 'NOT_APPLICABLE',
      review_status: 'NOT_APPLICABLE',
      review_notes: body.reason.trim(), // Store reason in review_notes for audit trail
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedObligation, error: updateError } = await supabaseAdmin
      .from('obligations')
      .update(updates)
      .eq('id', obligationId)
      .select('id, status, review_status, updated_at')
      .single();

    if (updateError || !updatedObligation) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to mark obligation as not applicable',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Log to audit_logs
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          entity_type: 'obligations',
          entity_id: obligationId,
          action: 'MARK_NOT_APPLICABLE',
          user_id: user.id,
          changes: {
            previous_status: existingObligation.status,
            previous_review_status: existingObligation.review_status,
            new_status: 'NOT_APPLICABLE',
            new_review_status: 'NOT_APPLICABLE',
            reason: body.reason.trim(),
          },
          metadata: {
            reason: body.reason.trim(),
          },
        });
    } catch (auditError) {
      // Log but don't fail if audit logging fails
      console.error('Failed to log to audit_logs:', auditError);
    }

    return successResponse(updatedObligation, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Mark obligation as not applicable error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

