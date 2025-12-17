/**
 * Obligation Review Endpoint
 * PUT /api/v1/obligations/{obligationId}/review - Update obligation review status
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest, props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { obligationId } = params;

    // Parse request body
    const body = await request.json();

    if (!body.review_status) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'review_status is required',
        422,
        { review_status: 'review_status is required' },
        { request_id: requestId }
      );
    }

    const validStatuses = ['CONFIRMED', 'EDITED', 'REJECTED', 'PENDING_INTERPRETATION', 'INTERPRETED', 'NOT_APPLICABLE'];
    if (!validStatuses.includes(body.review_status)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid review_status',
        422,
        { review_status: `Must be one of: ${validStatuses.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Check if obligation exists
  const { data: obligation, error: checkError } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .single();

    if (checkError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update review status
    const updates: any = {
      review_status: body.review_status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (body.review_notes !== undefined) {
      updates.review_notes = body.review_notes;
    }

  const { data: updatedObligation, error: updateError } = await supabaseAdmin
      .from('obligations')
      .update(updates)
      .eq('id', obligationId)
      .select('id, review_status, reviewed_by, reviewed_at, updated_at')
      .single();

    if (updateError || !updatedObligation) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update review status',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedObligation, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update obligation review error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

