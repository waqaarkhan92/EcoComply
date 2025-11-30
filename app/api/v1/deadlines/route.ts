/**
 * Deadlines Endpoints
 * GET /api/v1/deadlines - List deadlines
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
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
    let limit: number;
    let cursor: string | null;
    try {
      const pagination = parsePaginationParams(request);
      limit = pagination.limit;
      cursor = pagination.cursor;
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message || 'Invalid pagination parameters',
        422,
        { limit: 'Limit must be a positive integer between 1 and 100' },
        { request_id: requestId }
      );
    }
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        schedule_id,
        obligation_id,
        site_id,
        company_id,
        due_date,
        status,
        compliance_period,
        is_late,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.obligation_id) {
      query = query.eq('obligation_id', filters.obligation_id);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.compliance_period) {
      query = query.eq('compliance_period', filters.compliance_period);
    }
    if (filters.due_date) {
      // Support date range filters
      if (filters.due_date.gte) {
        query = query.gte('due_date', filters.due_date.gte);
      }
      if (filters.due_date.lte) {
        query = query.lte('due_date', filters.due_date.lte);
      }
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
      try {
        const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        query = query.lt('created_at', parsedCursor.created_at);
      } catch {
        // Invalid cursor, ignore
      }
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
    const hasMore = (deadlines || []).length > limit;
    const results = hasMore ? (deadlines || []).slice(0, limit) : (deadlines || []);

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
    console.error('Get deadlines error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

