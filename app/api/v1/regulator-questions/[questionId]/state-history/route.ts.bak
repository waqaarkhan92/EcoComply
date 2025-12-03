/**
 * Regulator Question State History Endpoint
 * GET /api/v1/regulator-questions/{questionId}/state-history
 * 
 * Returns the state transition history for a regulator question
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ questionId: string } }
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

    // Get question - RLS will enforce access control
    const { data: question, error: questionError } = await supabaseAdmin
      .from('regulator_questions')
      .select('id, site_id, company_id')
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

    // Get state history from audit logs
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action_type,
        changes,
        user_id,
        created_at
      `)
      .eq('entity_type', 'REGULATOR_QUESTION')
      .eq('entity_id', questionId)
      .in('action_type', [
        'REGULATOR_QUESTION_RAISED',
        'REGULATOR_RESPONSE_SUBMITTED',
        'REGULATOR_QUESTION_STATUS_CHANGED'
      ])
      .order('created_at', { ascending: true });

    if (auditError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch state history',
        500,
        { error: auditError.message },
        { request_id: requestId }
      );
    }

    // Transform audit logs into state transitions
    const transitions = auditLogs?.map((log, index) => {
      const changes = log.changes as any;
      const previousLog = index > 0 ? auditLogs[index - 1] : undefined;
      
      let fromState = 'UNKNOWN';
      let toState = 'UNKNOWN';

      if (log.action_type === 'REGULATOR_QUESTION_RAISED') {
        fromState = 'UNKNOWN';
        toState = 'OPEN';
      } else if (log.action_type === 'REGULATOR_RESPONSE_SUBMITTED') {
        fromState = previousLog ? (previousLog.changes as any)?.status || 'OPEN' : 'OPEN';
        toState = 'RESPONSE_SUBMITTED';
      } else if (log.action_type === 'REGULATOR_QUESTION_STATUS_CHANGED') {
        fromState = changes?.previous_status || 'UNKNOWN';
        toState = changes?.new_status || 'UNKNOWN';
      }

      return {
        id: log.id,
        from_state: fromState,
        to_state: toState,
        transitioned_at: log.created_at,
        transitioned_by: log.user_id,
        transition_reason: changes?.reason || null,
      };
    }) || [];

    const response = successResponse(
      transitions,
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching state history:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch state history',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

