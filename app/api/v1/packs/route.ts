/**
 * Pack Endpoints
 * GET /api/v1/packs - List packs (RLS filtered)
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
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's company/site access
    // Note: audit_packs table doesn't have a status column - we derive it from storage_path
    let query = supabaseAdmin
      .from('audit_packs')
      .select('id, company_id, site_id, document_id, pack_type, title, recipient_type, recipient_name, purpose, date_range_start, date_range_end, storage_path, file_size_bytes, total_obligations, complete_count, pending_count, overdue_count, evidence_count, generated_by, generation_trigger, created_at')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.pack_type) {
      query = query.eq('pack_type', filters.pack_type);
    }
    if (filters['date_range_start[gte]']) {
      query = query.gte('date_range_start', filters['date_range_start[gte]']);
    }
    if (filters['date_range_end[lte]']) {
      query = query.lte('date_range_end', filters['date_range_end[lte]']);
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: packs, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch packs',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = packs && packs.length > limit;
    const results = hasMore ? packs.slice(0, limit) : packs || [];

    // Derive status from storage_path and add file URLs for completed packs
    const resultsWithStatus = results.map((pack: any) => {
      // Derive status: 'pending' = GENERATING, actual path = COMPLETED
      const status = pack.storage_path === 'pending' ? 'GENERATING' : 'COMPLETED';

      let fileUrl = '';
      if (status === 'COMPLETED' && pack.storage_path && pack.storage_path !== 'pending') {
        const { data: urlData } = supabaseAdmin.storage
          .from('audit-packs')
          .getPublicUrl(pack.storage_path);
        fileUrl = urlData?.publicUrl || '';
      }

      return {
        ...pack,
        status,
        file_url: fileUrl,
      };
    });

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && resultsWithStatus.length > 0) {
      const lastItem = resultsWithStatus[resultsWithStatus.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      resultsWithStatus,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get packs error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

