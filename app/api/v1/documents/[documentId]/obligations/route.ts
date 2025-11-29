/**
 * Document Obligations Endpoint
 * GET /api/v1/documents/{documentId}/obligations - Get obligations extracted from document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Verify document exists - RLS will enforce access control
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at')
      .eq('document_id', documentId)
      .is('deleted_at', null);

    // Apply filters
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
    console.error('Get document obligations error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

