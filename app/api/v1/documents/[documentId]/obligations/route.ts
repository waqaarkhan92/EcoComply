/**
 * Document Obligations Endpoint
 * GET /api/v1/documents/{documentId}/obligations - Get obligations extracted from document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

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

    // Verify document exists
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, extraction_status')
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
    let limit: number;
    let cursor: string | null;
    let filters: Record<string, any>;
    let sort: Array<{ field: string; direction: 'asc' | 'desc' }>;

    try {
      const paginationParams = parsePaginationParams(request);
      limit = paginationParams.limit;
      cursor = paginationParams.cursor;
      filters = parseFilterParams(request);
      sort = parseSortParams(request);
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message || 'Invalid request parameters',
        422,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at, original_text')
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
    console.error('Obligations API error:', error.message);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
