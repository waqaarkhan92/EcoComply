/**
 * Module 4: Chain Break Alerts Endpoints
 * GET /api/v1/module-4/chain-break-alerts - List chain break alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('chain_break_alerts')
      .select('*');

    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.consignment_note_id) query = query.eq('consignment_note_id', filters.consignment_note_id);
    if (filters.alert_type) query = query.eq('alert_type', filters.alert_type);
    if (filters.alert_severity) query = query.eq('alert_severity', filters.alert_severity);
    if (filters.is_resolved !== undefined) query = query.eq('is_resolved', filters.is_resolved === 'true');

    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: alerts, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch chain break alerts',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const hasMore = (alerts || []).length > limit;
    const data = hasMore ? (alerts || []).slice(0, limit) : (alerts || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/chain-break-alerts:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

