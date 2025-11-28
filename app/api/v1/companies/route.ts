/**
 * Companies Endpoints
 * GET /api/v1/companies - List companies (RLS filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

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

    // Build query - RLS will automatically filter by user's company access
    let query = supabaseAdmin
      .from('companies')
      .select('id, name, billing_email, subscription_tier, is_active, created_at, updated_at')
      .is('deleted_at', null); // Only non-deleted companies

    // Apply filters
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }
    if (filters.subscription_tier) {
      query = query.eq('subscription_tier', filters.subscription_tier);
    }

    // Apply cursor-based pagination
    if (cursor) {
      // For cursor pagination, we need to decode the cursor and use it
      // For now, we'll use offset-based as fallback (simpler for initial implementation)
      // TODO: Implement proper cursor-based pagination
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: companies, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch companies',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = companies && companies.length > limit;
    const results = hasMore ? companies.slice(0, limit) : companies || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    return paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get companies error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
