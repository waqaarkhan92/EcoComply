/**
 * Admin Background Jobs Endpoint
 * GET /api/v1/admin/background-jobs - List background jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - filter by user's company
    let query = supabaseAdmin
      .from('background_jobs')
      .select('id, job_type, status, priority, entity_type, entity_id, created_at, updated_at, started_at, completed_at')
      .eq('company_id', user.company_id);

    // Apply filters
    if (filters.job_type) {
      query = query.eq('job_type', filters.job_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by created_at descending
      query = query.order('created_at', { ascending: false });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      query = query.lt('created_at', parsedCursor.created_at);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: jobs, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch background jobs',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = jobs && jobs.length > limit;
    const results = hasMore ? jobs.slice(0, limit) : jobs || [];

    // Create cursor for next page
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
    console.error('Get background jobs error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

