/**
 * Module 2: Exceedances Endpoints
 * GET /api/v1/module-2/exceedances - List exceedances (RLS filtered)
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
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('exceedances')
      .select(`
        id,
        parameter_id,
        lab_result_id,
        company_id,
        site_id,
        recorded_value,
        limit_value,
        percentage_of_limit,
        recorded_date,
        status,
        resolution_notes,
        resolved_by,
        resolved_at,
        corrective_action,
        notified_water_company,
        notification_date,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.parameter_id) {
      query = query.eq('parameter_id', filters.parameter_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters['recorded_date[gte]']) {
      query = query.gte('recorded_date', filters['recorded_date[gte]']);
    }
    if (filters['recorded_date[lte]']) {
      query = query.lte('recorded_date', filters['recorded_date[lte]']);
    }
    if (filters.threshold) {
      // Filter by threshold percentage (80, 90, 100)
      const thresholdNum = parseInt(filters.threshold);
      if (thresholdNum === 80) {
        query = query.gte('percentage_of_limit', 80).lt('percentage_of_limit', 90);
      } else if (thresholdNum === 90) {
        query = query.gte('percentage_of_limit', 90).lt('percentage_of_limit', 100);
      } else if (thresholdNum === 100) {
        query = query.gte('percentage_of_limit', 100);
      }
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('recorded_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: exceedances, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch exceedances',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Get parameter details for each exceedance
    const parameterIds = [...new Set((exceedances || []).map((e: any) => e.parameter_id))];
    const { data: parameters } = await supabaseAdmin
      .from('parameters')
      .select('id, parameter_type, unit')
      .in('id', parameterIds);

    const parametersMap: Record<string, any> = {};
    parameters?.forEach((p: any) => {
      parametersMap[p.id] = p;
    });

    // Add parameter details to each exceedance
    const exceedancesWithDetails = (exceedances || []).map((exceedance: any) => {
      const parameter = parametersMap[exceedance.parameter_id];
      return {
        ...exceedance,
        parameter_type: parameter?.parameter_type || null,
        unit: parameter?.unit || null,
        threshold_level: exceedance.percentage_of_limit >= 100 ? 'CRITICAL' : 
                        exceedance.percentage_of_limit >= 90 ? 'HIGH' : 
                        exceedance.percentage_of_limit >= 80 ? 'WARNING' : null,
      };
    });

    // Check if there are more results
    const hasMore = exceedancesWithDetails.length > limit;
    const data = hasMore ? exceedancesWithDetails.slice(0, limit) : exceedancesWithDetails;
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/exceedances:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

