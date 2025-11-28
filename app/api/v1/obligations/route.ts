/**
 * Obligations Endpoints
 * GET /api/v1/obligations - List obligations (RLS filtered)
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

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('obligations')
      .select('id, document_id, site_id, obligation_title, obligation_description, category, frequency, deadline_date, status, review_status, is_subjective, confidence_score, created_at, updated_at')
      .is('deleted_at', null); // Only non-deleted obligations

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.review_status) {
      query = query.eq('review_status', filters.review_status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.is_subjective !== undefined) {
      query = query.eq('is_subjective', filters.is_subjective === 'true');
    }
    if (filters['deadline_date[gte]']) {
      query = query.gte('deadline_date', filters['deadline_date[gte]']);
    }
    if (filters['deadline_date[lte]']) {
      query = query.lte('deadline_date', filters['deadline_date[lte]']);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
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

    // Get evidence counts for each obligation
    const obligationIds = (obligations || []).map((o: any) => o.id);
    const { data: evidenceLinks } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('obligation_id')
      .in('obligation_id', obligationIds);

    // Count evidence per obligation
    const countsMap: Record<string, number> = {};
    evidenceLinks?.forEach((link: any) => {
      countsMap[link.obligation_id] = (countsMap[link.obligation_id] || 0) + 1;
    });

    // Add evidence_count to each obligation
    const obligationsWithCounts = (obligations || []).map((obligation: any) => ({
      ...obligation,
      evidence_count: countsMap[obligation.id] || 0,
    }));

    // Check if there are more results
    const hasMore = obligationsWithCounts.length > limit;
    const results = hasMore ? obligationsWithCounts.slice(0, limit) : obligationsWithCounts;

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
    console.error('Get obligations error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

