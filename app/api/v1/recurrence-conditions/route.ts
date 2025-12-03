/**
 * Recurrence Conditions Endpoints
 * GET /api/v1/recurrence-conditions - List recurrence conditions
 * POST /api/v1/recurrence-conditions - Create recurrence condition
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('recurrence_conditions')
      .select(`
        *,
        schedules!inner(id, schedule_name),
        recurrence_trigger_rules(id, rule_type, rule_config)
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.schedule_id) query = query.eq('schedule_id', filters.schedule_id);
    if (filters.condition_type) query = query.eq('condition_type', filters.condition_type);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: conditions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch recurrence conditions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (conditions || []).length > limit;
    const data = hasMore ? (conditions || []).slice(0, limit) : (conditions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-conditions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      schedule_id,
      recurrence_trigger_rule_id,
      site_id,
      condition_type,
      condition_expression,
      condition_metadata,
    } = body;

    // Validate required fields
    if (!schedule_id || !site_id || !condition_type || !condition_expression) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['schedule_id', 'site_id', 'condition_type', 'condition_expression'] },
        { request_id: requestId }
      );
    }

    // Validate condition_type enum
    const validConditionTypes = ['EVIDENCE_PRESENT', 'DEADLINE_MET', 'STATUS_CHANGE', 'CUSTOM'];
    if (!validConditionTypes.includes(condition_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid condition_type',
        400,
        { condition_type: `Must be one of: ${validConditionTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify schedule exists and user has access
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('schedules')
      .select('id, company_id, site_id')
      .eq('id', schedule_id)
      .single();

    if (scheduleError || !schedule) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Schedule not found', 404, {}, { request_id: requestId });
    }

    if (schedule.company_id !== user.company_id || schedule.site_id !== site_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this schedule', 403, {}, { request_id: requestId });
    }

    // Create recurrence condition
    const { data: condition, error } = await supabaseAdmin
      .from('recurrence_conditions')
      .insert({
        schedule_id,
        recurrence_trigger_rule_id: recurrence_trigger_rule_id || null,
        company_id: user.company_id,
        site_id,
        condition_type,
        condition_expression,
        condition_metadata: condition_metadata || {},
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create recurrence condition', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(condition, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/recurrence-conditions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

