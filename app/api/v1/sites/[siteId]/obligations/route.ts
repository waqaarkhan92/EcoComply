/**
 * Site Obligations Endpoint
 * GET /api/v1/sites/{siteId}/obligations - List obligations for site
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

    // Build query
    let query = supabaseAdmin
      .from('obligations')
      .select('id, original_text, obligation_title, obligation_description, category, status, review_status, deadline_date, created_at')
      .eq('site_id', siteId)
      .is('deleted_at', null);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.review_status) {
      query = query.eq('review_status', filters.review_status);
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Default sort by created_at desc
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: obligations, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch obligations',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = obligations && obligations.length > limit;
    const results = hasMore ? obligations.slice(0, limit) : obligations || [];

    // Create cursor for next page (if there are more results)
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
    console.error('Get site obligations error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
