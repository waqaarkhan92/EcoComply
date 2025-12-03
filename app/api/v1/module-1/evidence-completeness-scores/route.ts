/**
 * Evidence Completeness Scores Endpoints
 * GET /api/v1/module-1/evidence-completeness-scores - List evidence completeness scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('evidence_completeness_scores')
      .select(`
        *,
        obligations!inner(id, summary)
      `);

    // Apply filters
    if (filters.obligation_id) query = query.eq('obligation_id', filters.obligation_id);
    if (filters.condition_reference) query = query.eq('condition_reference', filters.condition_reference);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.compliance_period) query = query.eq('compliance_period', filters.compliance_period);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('last_calculated_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: scores, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch evidence completeness scores', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (scores || []).length > limit;
    const data = hasMore ? (scores || []).slice(0, limit) : (scores || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/evidence-completeness-scores:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

