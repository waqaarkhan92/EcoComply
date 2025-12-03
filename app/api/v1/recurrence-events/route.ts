/**
 * Recurrence Events Endpoints
 * GET /api/v1/recurrence-events - List recurrence events
 * POST /api/v1/recurrence-events - Create recurrence event
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
      .from('recurrence_events')
      .select('*');

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.event_type) query = query.eq('event_type', filters.event_type);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('event_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: events, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch recurrence events', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (events || []).length > limit;
    const data = hasMore ? (events || []).slice(0, limit) : (events || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-events:', error);
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
      site_id,
      event_type,
      event_name,
      event_date,
      event_metadata,
    } = body;

    // Validate required fields
    if (!site_id || !event_type || !event_name || !event_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['site_id', 'event_type', 'event_name', 'event_date'] },
        { request_id: requestId }
      );
    }

    // Validate event_type enum
    const validEventTypes = ['COMMISSIONING', 'PERMIT_ISSUED', 'RENEWAL', 'VARIATION', 'ENFORCEMENT', 'CUSTOM'];
    if (!validEventTypes.includes(event_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid event_type',
        400,
        { event_type: `Must be one of: ${validEventTypes.join(', ')}` },
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

    // Create recurrence event
    const { data: event, error } = await supabaseAdmin
      .from('recurrence_events')
      .insert({
        company_id: user.company_id,
        site_id,
        event_type,
        event_name,
        event_date,
        event_metadata: event_metadata || {},
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create recurrence event', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(event, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/recurrence-events:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

