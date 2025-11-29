/**
 * Site Deadlines Endpoint
 * GET /api/v1/sites/{siteId}/deadlines - List deadlines for site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { siteId } = params;

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (site.company_id !== user.company_id) {
      // Check consultant access
      const { data: consultantAccess } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', site.company_id)
        .eq('status', 'ACTIVE')
        .single();

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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - get deadlines for obligations in this site
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        obligation_id,
        schedule_id,
        due_date,
        status,
        compliance_period,
        completed_at,
        completed_by,
        is_late,
        created_at,
        updated_at
      `)
      .eq('site_id', siteId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.due_date && filters.due_date.gte) {
      query = query.gte('due_date', filters.due_date.gte);
    }
    if (filters.due_date && filters.due_date.lte) {
      query = query.lte('due_date', filters.due_date.lte);
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Default sort by due_date asc
    if (sort.length === 0) {
      query = query.order('due_date', { ascending: true });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: deadlines, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch deadlines',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = deadlines && deadlines.length > limit;
    const results = hasMore ? deadlines.slice(0, limit) : deadlines || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.due_date || lastItem.created_at);
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
    console.error('Get site deadlines error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

