/**
 * Close Regulator Question Endpoint
 * PUT /api/v1/regulator-questions/{questionId}/close - Close regulator question
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest, props: { params: Promise<{ questionId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { questionId } = params;

    // Get existing question
  const { data: existingQuestion, error: getError } = await supabaseAdmin
      .from('regulator_questions')
      .select('id, status')
      .eq('id', questionId)
      .single();

    if (getError || !existingQuestion) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Regulator question not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update question status to CLOSED
  const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('regulator_questions')
      .update({
        status: 'CLOSED',
        closed_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select('id, status, closed_date, updated_at')
      .single();

    if (updateError || !updatedQuestion) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to close regulator question',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedQuestion, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Close regulator question error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

