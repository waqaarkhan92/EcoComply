/**
 * Companies Endpoints
 * GET /api/v1/companies - List companies (RLS filtered)
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

    // Apply sorting first (required for cursor pagination to work correctly)
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Apply cursor-based pagination
    let cursorData: { id: string; created_at: string } | null = null;
    if (cursor) {
      const { parseCursor } = await import('@/lib/api/pagination');
      cursorData = parseCursor(cursor);
      if (cursorData) {
        // Filter by created_at >= cursor.created_at
        // We'll filter by id in JavaScript after fetching
        query = query.gte('created_at', cursorData.created_at);
      }
    }

    // Add limit and fetch one extra to check if there are more
    // Increase limit slightly to account for cursor filtering
    const fetchLimit = cursorData ? limit + 10 : limit + 1;
    query = query.limit(fetchLimit);

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

    // Apply cursor filtering in JavaScript (for composite comparison)
    let filteredCompanies = companies || [];
    if (cursorData && filteredCompanies.length > 0) {
      filteredCompanies = filteredCompanies.filter((company) => {
        const companyDate = new Date(company.created_at).getTime();
        const cursorDate = new Date(cursorData!.created_at).getTime();
        
        // Include if created_at > cursor.created_at
        if (companyDate > cursorDate) return true;
        
        // If created_at == cursor.created_at, include only if id > cursor.id
        if (companyDate === cursorDate) {
          return company.id > cursorData!.id;
        }
        
        return false;
      });
    }

    // Check if there are more results
    const hasMore = filteredCompanies.length > limit;
    const results = hasMore ? filteredCompanies.slice(0, limit) : filteredCompanies;

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
    
    // Add rate limit headers to response
    return await addRateLimitHeaders(request, user.id, response);
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
