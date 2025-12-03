/**
 * Evidence Expiry Tracking Endpoints
 * GET /api/v1/evidence/expiring - List expiring evidence
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
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('evidence_expiry_tracking')
      .select(`
        id,
        evidence_id,
        company_id,
        site_id,
        expiry_date,
        days_until_expiry,
        reminder_days,
        reminders_sent,
        is_expired,
        expired_at,
        renewal_required,
        renewal_evidence_id,
        renewal_date,
        created_at,
        updated_at,
        evidence_items!inner(
          id,
          title,
          file_name,
          file_url,
          evidence_type,
          uploaded_at
        )
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.is_expired !== undefined) {
      query = query.eq('is_expired', filters.is_expired === 'true');
    }
    if (filters.days_until_expiry) {
      const days = parseInt(filters.days_until_expiry);
      query = query.lte('days_until_expiry', days).gte('days_until_expiry', 0);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('days_until_expiry', { ascending: true });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: expiring, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch expiring evidence', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (expiring || []).length > limit;
    const data = hasMore ? (expiring || []).slice(0, limit) : (expiring || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/evidence/expiring:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

