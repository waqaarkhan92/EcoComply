/**
 * Regulator Question State Transition Endpoint
 * POST /api/v1/regulator-questions/{questionId}/transition
 * 
 * Transitions a regulator question to a new state
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

const validTransitions: Record<string, string[]> = {
  OPEN: ['RESPONSE_SUBMITTED', 'RESPONSE_OVERDUE'],
  RESPONSE_SUBMITTED: ['RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED'],
  RESPONSE_ACKNOWLEDGED: ['FOLLOW_UP_REQUIRED', 'CLOSED'],
  FOLLOW_UP_REQUIRED: ['CLOSED'],
  RESPONSE_OVERDUE: ['RESPONSE_SUBMITTED'],
  CLOSED: [],
};

export async function POST(
  request: NextRequest, props: { params: Promise<{ questionId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { questionId } = params;
    const body = await request.json();
  const { new_state, reason } = body;

    if (!new_state) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'new_state is required',
        422,
        { new_state: 'new_state is required' },
        { request_id: requestId }
      );
    }

    // Get current question
  const { data: question, error: questionError } = await supabaseAdmin
      .from('regulator_questions')
      .select('id, status, site_id, company_id')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      if (questionError?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Question not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch question',
        500,
        { error: questionError?.message },
        { request_id: requestId }
      );
    }

    // Check if transition is valid
    const currentState = question.status;
    const allowedTransitions = validTransitions[currentState] || [];

    if (!allowedTransitions.includes(new_state)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid state transition from ${currentState} to ${new_state}`,
        422,
        { 
          current_state: currentState,
          new_state: new_state,
          allowed_transitions: allowedTransitions,
        },
        { request_id: requestId }
      );
    }

    // Check permissions for certain transitions
    if (['RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED'].includes(new_state)) {
      const roleResult = await requireRole(request, ['OWNER', 'ADMIN']);
      if (roleResult instanceof NextResponse) {
        return roleResult;
      }
    }

    // Update question status
  const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('regulator_questions')
      .update({
        status: new_state,
        updated_at: new Date().toISOString(),
        // Set specific fields based on state
        ...(new_state === 'RESPONSE_ACKNOWLEDGED' && {
          regulator_acknowledged: true,
        }),
        ...(new_state === 'CLOSED' && {
          closed_date: new Date().toISOString(),
        }),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to transition question state',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // Create audit log entry
    await supabaseAdmin.from('audit_logs').insert({
      action_type: 'REGULATOR_QUESTION_STATUS_CHANGED',
      entity_type: 'REGULATOR_QUESTION',
      entity_id: questionId,
      user_id: user.id,
      changes: {
        previous_status: currentState,
        new_status: new_state,
        reason: reason || null,
      },
    });

    const response = successResponse(
      {
        question: updatedQuestion,
        message: `Question transitioned from ${currentState} to ${new_state}`,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error transitioning question state:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to transition question state',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

