/**
 * Escalations Endpoint
 * GET /api/v1/escalations - List escalations
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

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

    // Build query - RLS will filter by company
    let query = supabaseAdmin
      .from('escalations')
      .select('id, obligation_id, company_id, site_id, current_level, escalation_reason, escalated_to, escalated_at, resolved_at, resolved_by')
      .eq('company_id', user.company_id);

    // Apply filters
    if (filters.obligation_id) {
      query = query.eq('obligation_id', filters.obligation_id);
    }
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.current_level) {
      query = query.eq('current_level', parseInt(filters.current_level));
    }
    if (filters.resolved_at) {
      if (filters.resolved_at === 'null') {
        query = query.is('resolved_at', null);
      } else {
        query = query.not('resolved_at', 'is', null);
      }
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Default sort by escalated_at desc
    if (sort.length === 0) {
      query = query.order('escalated_at', { ascending: false });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: escalations, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch escalations',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = escalations && escalations.length > limit;
    const results = hasMore ? escalations.slice(0, limit) : escalations || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.escalated_at);
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
    console.error('Get escalations error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

