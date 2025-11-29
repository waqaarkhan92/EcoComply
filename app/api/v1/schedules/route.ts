/**
 * Schedules Endpoints
 * GET /api/v1/schedules - List schedules
 * POST /api/v1/schedules - Create schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { calculateNextDueDate, Frequency } from '@/lib/utils/schedule-calculator';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('schedules')
      .select(`
        id,
        obligation_id,
        frequency,
        base_date,
        next_due_date,
        last_completed_date,
        is_rolling,
        adjust_for_business_days,
        reminder_days,
        status,
        created_at,
        updated_at,
        obligations!inner(site_id, company_id)
      `);

    // Apply filters
    if (filters.obligation_id) {
      query = query.eq('obligation_id', filters.obligation_id);
    }
    if (filters.site_id) {
      query = query.eq('obligations.site_id', filters.site_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.frequency) {
      query = query.eq('frequency', filters.frequency);
    }
    if (filters.next_due_date) {
      // Support date range filters
      if (filters.next_due_date.gte) {
        query = query.gte('next_due_date', filters.next_due_date.gte);
      }
      if (filters.next_due_date.lte) {
        query = query.lte('next_due_date', filters.next_due_date.lte);
      }
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by next_due_date ascending
      query = query.order('next_due_date', { ascending: true });
    }

    // Handle cursor-based pagination
    if (cursor) {
      try {
        const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        query = query.lt('created_at', parsedCursor.created_at);
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: schedules, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch schedules',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Transform schedules (remove nested obligations, keep only needed fields)
    const transformed = (schedules || []).map((schedule: any) => ({
      id: schedule.id,
      obligation_id: schedule.obligation_id,
      frequency: schedule.frequency,
      next_due_date: schedule.next_due_date,
      status: schedule.status,
      created_at: schedule.created_at,
    }));

    // Check if there are more results
    const hasMore = transformed.length > limit;
    const results = hasMore ? transformed.slice(0, limit) : transformed;

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get schedules error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.obligation_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'obligation_id is required',
        422,
        { obligation_id: 'obligation_id is required' },
        { request_id: requestId }
      );
    }

    if (!body.frequency) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'frequency is required',
        422,
        { frequency: 'frequency is required' },
        { request_id: requestId }
      );
    }

    if (!body.start_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'start_date is required',
        422,
        { start_date: 'start_date is required' },
        { request_id: requestId }
      );
    }

    // Validate frequency enum
    const validFrequencies: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED'];
    if (!validFrequencies.includes(body.frequency)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid frequency value',
        422,
        { frequency: `Must be one of: ${validFrequencies.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify obligation exists and user has access
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id, company_id')
      .eq('id', body.obligation_id)
      .is('deleted_at', null)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (user.company_id !== obligation.company_id) {
      const { data: consultantAccess } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', obligation.company_id)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (!consultantAccess) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Parse start_date
    const baseDate = new Date(body.start_date);
    if (isNaN(baseDate.getTime())) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid start_date format. Must be ISO date string',
        422,
        { start_date: 'Must be a valid ISO date string' },
        { request_id: requestId }
      );
    }

    // Calculate next_due_date
    const adjustForBusinessDays = body.custom_schedule?.adjust_for_business_days || false;
    const nextDueDate = calculateNextDueDate(
      body.frequency,
      baseDate,
      null,
      adjustForBusinessDays
    );

    // Build schedule data
    const scheduleData: any = {
      obligation_id: body.obligation_id,
      frequency: body.frequency,
      base_date: baseDate.toISOString().split('T')[0], // Store as DATE
      next_due_date: nextDueDate.toISOString().split('T')[0], // Store as DATE
      is_rolling: body.custom_schedule?.is_rolling || false,
      adjust_for_business_days: adjustForBusinessDays,
      reminder_days: body.custom_schedule?.reminder_days || [7, 3, 1],
      status: 'ACTIVE',
    };

    // Check if schedule already exists for this obligation
    const { data: existingSchedule } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('obligation_id', body.obligation_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (existingSchedule) {
      return errorResponse(
        ErrorCodes.CONFLICT,
        'Schedule already exists for this obligation',
        409,
        { schedule_id: existingSchedule.id },
        { request_id: requestId }
      );
    }

    // Create schedule
    const { data: schedule, error: createError } = await supabaseAdmin
      .from('schedules')
      .insert(scheduleData)
      .select('id, obligation_id, frequency, base_date, next_due_date, status, created_at')
      .single();

    if (createError || !schedule) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create schedule',
        500,
        { error: createError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(schedule, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create schedule error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

