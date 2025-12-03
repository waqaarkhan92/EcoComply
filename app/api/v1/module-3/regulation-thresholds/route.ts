/**
 * Regulation Thresholds Endpoints
 * GET /api/v1/module-3/regulation-thresholds - List regulation thresholds
 * POST /api/v1/module-3/regulation-thresholds - Create regulation threshold
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

    await requireModule('MODULE_3', user.company_id);

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('regulation_thresholds')
      .select('*');

    // Apply filters
    if (filters.threshold_type) query = query.eq('threshold_type', filters.threshold_type);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: thresholds, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch regulation thresholds', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (thresholds || []).length > limit;
    const data = hasMore ? (thresholds || []).slice(0, limit) : (thresholds || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/regulation-thresholds:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_3', user.company_id);

    const body = await request.json();
    const {
      threshold_type,
      capacity_min_mw,
      capacity_max_mw,
      monitoring_frequency,
      stack_test_frequency,
      reporting_frequency,
      regulation_reference,
    } = body;

    // Validate required fields
    if (!threshold_type || !capacity_min_mw || !monitoring_frequency || !stack_test_frequency || !reporting_frequency) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['threshold_type', 'capacity_min_mw', 'monitoring_frequency', 'stack_test_frequency', 'reporting_frequency'] },
        { request_id: requestId }
      );
    }

    // Validate threshold_type enum
    const validThresholdTypes = ['MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'CUSTOM'];
    if (!validThresholdTypes.includes(threshold_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid threshold_type',
        400,
        { threshold_type: `Must be one of: ${validThresholdTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Create regulation threshold
    const { data: threshold, error } = await supabaseAdmin
      .from('regulation_thresholds')
      .insert({
        company_id: user.company_id,
        threshold_type,
        capacity_min_mw: parseFloat(capacity_min_mw),
        capacity_max_mw: capacity_max_mw ? parseFloat(capacity_max_mw) : null,
        monitoring_frequency,
        stack_test_frequency,
        reporting_frequency,
        regulation_reference: regulation_reference || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create regulation threshold', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(threshold, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/regulation-thresholds:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

