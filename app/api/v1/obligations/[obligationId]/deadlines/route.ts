/**
 * Obligation Deadlines Endpoint
 * GET /api/v1/obligations/{obligationId}/deadlines - List deadlines for obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { obligationId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { obligationId } = params;

    // Verify obligation exists
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query
    let query = supabaseAdmin
      .from('deadlines')
      .select('id, due_date, status, compliance_period, is_late, created_at, updated_at')
      .eq('obligation_id', obligationId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by due_date ascending
      query = query.order('due_date', { ascending: true });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      query = query.lt('created_at', parsedCursor.created_at);
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
    console.error('Get obligation deadlines error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

