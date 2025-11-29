/**
 * Review Queue Endpoints
 * GET /api/v1/review-queue - List review queue items
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

    // Build query - RLS will automatically filter by user's company/site access
    let query = supabaseAdmin
      .from('review_queue_items')
      .select(`
        id,
        document_id,
        obligation_id,
        review_type,
        is_blocking,
        priority,
        hallucination_risk,
        original_data,
        review_status,
        review_action,
        reviewed_by,
        reviewed_at,
        review_notes,
        edited_data,
        created_at,
        updated_at,
        documents:document_id (
          id,
          file_name,
          document_type,
          site_id
        ),
        obligations:obligation_id (
          id,
          obligation_title,
          obligation_description,
          confidence_score,
          is_subjective
        )
      `)
      .order('priority', { ascending: false })
      .order('is_blocking', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.site_id) {
      // Filter by site via document
      query = query.eq('documents.site_id', filters.site_id);
    }
    if (filters.review_status) {
      query = query.eq('review_status', filters.review_status);
    }
    if (filters.review_type) {
      query = query.eq('review_type', filters.review_type);
    }
    if (filters.is_blocking !== undefined) {
      query = query.eq('is_blocking', filters.is_blocking === 'true');
    }
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }

    // Apply sorting
    for (const sortItem of sort) {
      if (sortItem.field === 'priority') {
        query = query.order('priority', { ascending: sortItem.direction === 'asc' });
      } else if (sortItem.field === 'created_at') {
        query = query.order('created_at', { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: items, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch review queue items',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = items && items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items || [];

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
    console.error('Get review queue error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

