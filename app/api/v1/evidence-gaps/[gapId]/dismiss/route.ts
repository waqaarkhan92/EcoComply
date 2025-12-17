/**
 * Dismiss Evidence Gap API
 * POST /api/v1/evidence-gaps/[gapId]/dismiss - Dismiss an evidence gap
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ gapId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { gapId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Dismiss reason is required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify gap exists and belongs to user's company
    const { data: gap, error: fetchError } = await supabaseAdmin
      .from('evidence_gaps')
      .select('id, company_id')
      .eq('id', gapId)
      .eq('company_id', user.company_id)
      .single();

    if (fetchError || !gap) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Evidence gap not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Update gap as dismissed
    const { data: updatedGap, error: updateError } = await supabaseAdmin
      .from('evidence_gaps')
      .update({
        dismissed_at: new Date().toISOString(),
        dismissed_by: user.id,
        dismiss_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gapId)
      .select()
      .single();

    if (updateError) {
      console.error('Error dismissing evidence gap:', updateError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to dismiss evidence gap',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        data: updatedGap,
        message: 'Evidence gap dismissed successfully',
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in dismiss evidence gap API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
