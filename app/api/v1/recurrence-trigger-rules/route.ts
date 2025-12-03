/**
 * Recurrence Trigger Rules Endpoints
 * GET /api/v1/recurrence-trigger-rules - List recurrence trigger rules
 * POST /api/v1/recurrence-trigger-rules - Create recurrence trigger rule
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
      .from('recurrence_trigger_rules')
      .select(`
        *,
        schedules!inner(id, schedule_name),
        recurrence_events(id, event_name, event_type, event_date)
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.schedule_id) query = query.eq('schedule_id', filters.schedule_id);
    if (filters.rule_type) query = query.eq('rule_type', filters.rule_type);
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

    const { data: rules, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch recurrence trigger rules', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (rules || []).length > limit;
    const data = hasMore ? (rules || []).slice(0, limit) : (rules || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-trigger-rules:', error);
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
      obligation_id,
      site_id,
      rule_type,
      rule_config,
      trigger_expression,
      event_id,
    } = body;

    // Validate required fields
    if (!schedule_id || !site_id || !rule_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['schedule_id', 'site_id', 'rule_type'] },
        { request_id: requestId }
      );
    }

    // Validate rule_type enum
    const validRuleTypes = ['DYNAMIC_OFFSET', 'EVENT_BASED', 'CONDITIONAL', 'FIXED'];
    if (!validRuleTypes.includes(rule_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid rule_type',
        400,
        { rule_type: `Must be one of: ${validRuleTypes.join(', ')}` },
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

    // Calculate next_execution_date based on rule type
    let nextExecutionDate: string | null = null;
    if (rule_type === 'EVENT_BASED' && event_id) {
      const { data: event } = await supabaseAdmin
        .from('recurrence_events')
        .select('event_date')
        .eq('id', event_id)
        .single();
      
      if (event && rule_config?.offset_months) {
        const eventDate = new Date(event.event_date);
        eventDate.setMonth(eventDate.getMonth() + (rule_config.offset_months || 0));
        nextExecutionDate = eventDate.toISOString().split('T')[0];
      }
    }

    // Create recurrence trigger rule
    const { data: rule, error } = await supabaseAdmin
      .from('recurrence_trigger_rules')
      .insert({
        schedule_id,
        obligation_id: obligation_id || null,
        company_id: user.company_id,
        site_id,
        rule_type,
        rule_config: rule_config || {},
        trigger_expression: trigger_expression || null,
        event_id: event_id || null,
        is_active: true,
        next_execution_date: nextExecutionDate,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create recurrence trigger rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(rule, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/recurrence-trigger-rules:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

