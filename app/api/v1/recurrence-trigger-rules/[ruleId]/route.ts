/**
 * Recurrence Trigger Rule Detail Endpoints
 * GET /api/v1/recurrence-trigger-rules/{id} - Get recurrence trigger rule
 * PUT /api/v1/recurrence-trigger-rules/{id} - Update recurrence trigger rule
 * DELETE /api/v1/recurrence-trigger-rules/{id} - Delete recurrence trigger rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { data: rule, error } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .select(`
        *,
        schedules(id, schedule_name),
        recurrence_events(id, event_name, event_type, event_date)
      `)
      .eq('id', ruleId)
      .single();

    if (error || !rule) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence trigger rule not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-trigger-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      rule_type,
      rule_config,
      trigger_expression,
      event_id,
      is_active,
      next_execution_date,
    } = body;

    // Get existing rule to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence trigger rule not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this rule', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (rule_type !== undefined) updateData.rule_type = rule_type;
    if (rule_config !== undefined) updateData.rule_config = rule_config;
    if (trigger_expression !== undefined) updateData.trigger_expression = trigger_expression;
    if (event_id !== undefined) updateData.event_id = event_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (next_execution_date !== undefined) updateData.next_execution_date = next_execution_date;

    const { data: rule, error } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update recurrence trigger rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/recurrence-trigger-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Get existing rule to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence trigger rule not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this rule', 403, {}, { request_id: requestId });
    }

    const { error } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete recurrence trigger rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse({ message: 'Recurrence trigger rule deleted successfully' }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/recurrence-trigger-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

