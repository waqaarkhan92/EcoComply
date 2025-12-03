/**
 * Recurring Tasks Endpoints
 * GET /api/v1/recurring-tasks - List recurring tasks
 * POST /api/v1/recurring-tasks - Create recurring task (manual)
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
      .from('recurring_tasks')
      .select(`
        id,
        schedule_id,
        obligation_id,
        company_id,
        site_id,
        task_type,
        task_title,
        task_description,
        due_date,
        status,
        assigned_to,
        completed_at,
        completed_by,
        completion_notes,
        trigger_type,
        trigger_data,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.task_type) query = query.eq('task_type', filters.task_type);
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('due_date', { ascending: true });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: tasks, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch recurring tasks', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (tasks || []).length > limit;
    const data = hasMore ? (tasks || []).slice(0, limit) : (tasks || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurring-tasks:', error);
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
      task_type,
      task_title,
      task_description,
      due_date,
      assigned_to,
      trigger_type,
      trigger_data,
    } = body;

    // Validate required fields
    if (!site_id || !task_type || !task_title || !due_date || !trigger_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['site_id', 'task_type', 'task_title', 'due_date', 'trigger_type'] },
        { request_id: requestId }
      );
    }

    // Validate task_type enum
    const validTaskTypes = ['MONITORING', 'EVIDENCE_COLLECTION', 'REPORTING', 'MAINTENANCE', 'SAMPLING', 'INSPECTION'];
    if (!validTaskTypes.includes(task_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid task_type',
        400,
        { task_type: `Must be one of: ${validTaskTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Validate trigger_type enum
    const validTriggerTypes = ['SCHEDULE', 'EVENT_BASED', 'CONDITIONAL', 'MANUAL'];
    if (!validTriggerTypes.includes(trigger_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid trigger_type',
        400,
        { trigger_type: `Must be one of: ${validTriggerTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', site_id)
      .single();

    if (siteError || !site) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Site not found', 404, {}, { request_id: requestId });
    }

    if (site.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this site', 403, {}, { request_id: requestId });
    }

    // Create recurring task
    const { data: task, error } = await supabaseAdmin
      .from('recurring_tasks')
      .insert({
        schedule_id: schedule_id || null,
        obligation_id: obligation_id || null,
        company_id: user.company_id,
        site_id,
        task_type,
        task_title,
        task_description: task_description || null,
        due_date,
        status: 'PENDING',
        assigned_to: assigned_to || null,
        trigger_type,
        trigger_data: trigger_data || {},
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create recurring task', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(task, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/recurring-tasks:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

