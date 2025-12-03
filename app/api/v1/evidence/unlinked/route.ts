/**
 * Unlinked Evidence Endpoint
 * GET /api/v1/evidence/unlinked
 * 
 * Returns evidence items that are not linked to any obligations
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, createCursor } from '@/lib/api/pagination';

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

    // Get unlinked evidence (evidence without obligation links)
    // This query finds evidence that doesn't have any entries in evidence_obligation_links
    let query = supabaseAdmin
      .from('evidence')
      .select(`
        id,
        site_id,
        company_id,
        file_name,
        file_type,
        file_size_bytes,
        mime_type,
        uploaded_at,
        uploaded_by,
        enforcement_status,
        is_temporary,
        enforcement_exempt
      `)
      .is('deleted_at', null)
      .not('enforcement_status', 'eq', 'LINKED')
      .order('uploaded_at', { ascending: false });

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.enforcement_status) {
      query = query.eq('enforcement_status', filters.enforcement_status);
    }
    if (filters['file_name']) {
      query = query.ilike('file_name', `%${filters['file_name']}%`);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: evidence, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch unlinked evidence',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = evidence && evidence.length > limit;
    const results = hasMore ? evidence.slice(0, limit) : evidence || [];

    // Calculate days since upload and enforcement status for each item
    const now = new Date();
    const enrichedResults = results.map((item: any) => {
      const uploadedAt = new Date(item.uploaded_at);
      const daysSinceUpload = Math.floor((now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine enforcement status if not already set
      let enforcementStatus = item.enforcement_status;
      if (!enforcementStatus || enforcementStatus === 'PENDING_LINK') {
        if (daysSinceUpload < 7) {
          enforcementStatus = 'PENDING_LINK';
        } else if (daysSinceUpload < 14) {
          enforcementStatus = 'UNLINKED_WARNING';
        } else if (daysSinceUpload < 30) {
          enforcementStatus = 'UNLINKED_CRITICAL';
        } else {
          enforcementStatus = 'UNLINKED_ARCHIVED';
        }
      }

      return {
        ...item,
        days_since_upload: daysSinceUpload,
        enforcement_status: enforcementStatus,
      };
    });

    // Get suggested obligations for each evidence item (simplified - can be enhanced)
    // This would typically use AI/ML to suggest based on filename, date, etc.
    // For now, we'll return empty suggestions array

    const enrichedWithSuggestions = enrichedResults.map((item: any) => ({
      ...item,
      suggested_obligations: [], // TODO: Implement suggestion logic
    }));

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && enrichedWithSuggestions.length > 0) {
      const lastItem = enrichedWithSuggestions[enrichedWithSuggestions.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.uploaded_at);
    }

    const response = paginatedResponse(
      enrichedWithSuggestions,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching unlinked evidence:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch unlinked evidence',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

