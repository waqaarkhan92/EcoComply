/**
 * Recurrence Condition Detail Endpoints
 * GET /api/v1/recurrence-conditions/{id} - Get recurrence condition
 * PUT /api/v1/recurrence-conditions/{id} - Update recurrence condition
 * DELETE /api/v1/recurrence-conditions/{id} - Delete recurrence condition
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const requestId = getRequestId(request);
  const { conditionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { data: condition, error } = await supabaseAdmin
      .from('recurrence_conditions')
      .select(`
        *,
        schedules(id, schedule_name),
        recurrence_trigger_rules(id, rule_type)
      `)
      .eq('id', conditionId)
      .single();

    if (error || !condition) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence condition not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(condition, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-conditions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const requestId = getRequestId(request);
  const { conditionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      condition_type,
      condition_expression,
      condition_metadata,
      is_active,
    } = body;

    // Get existing condition to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_conditions')
      .select('id, company_id')
      .eq('id', conditionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence condition not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this condition', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (condition_type !== undefined) updateData.condition_type = condition_type;
    if (condition_expression !== undefined) updateData.condition_expression = condition_expression;
    if (condition_metadata !== undefined) updateData.condition_metadata = condition_metadata;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: condition, error } = await supabaseAdmin
      .from('recurrence_conditions')
      .update(updateData)
      .eq('id', conditionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update recurrence condition', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(condition, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/recurrence-conditions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const requestId = getRequestId(request);
  const { conditionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Get existing condition to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_conditions')
      .select('id, company_id')
      .eq('id', conditionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence condition not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this condition', 403, {}, { request_id: requestId });
    }

    const { error } = await supabaseAdmin
      .from('recurrence_conditions')
      .delete()
      .eq('id', conditionId);

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete recurrence condition', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse({ message: 'Recurrence condition deleted successfully' }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/recurrence-conditions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

