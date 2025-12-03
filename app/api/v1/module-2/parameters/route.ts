/**
 * Module 2: Parameters Endpoints
 * GET /api/v1/module-2/parameters - List parameters (RLS filtered)
 * POST /api/v1/module-2/parameters - Create parameter (manual entry)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
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
      .from('parameters')
      .select(`
        id,
        document_id,
        company_id,
        site_id,
        module_id,
        parameter_type,
        limit_value,
        unit,
        limit_type,
        range_min,
        range_max,
        sampling_frequency,
        confidence_score,
        warning_threshold_percent,
        is_active,
        created_at,
        updated_at
      `)
      .eq('is_active', true);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }
    if (filters.parameter_type) {
      query = query.eq('parameter_type', filters.parameter_type);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: parameters, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch parameters',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Get latest lab results for each parameter to calculate current values
    const parameterIds = (parameters || []).map((p: any) => p.id);
    const { data: latestResults } = await supabaseAdmin
      .from('lab_results')
      .select('parameter_id, recorded_value, sample_date, percentage_of_limit, is_exceedance')
      .in('parameter_id', parameterIds)
      .order('sample_date', { ascending: false });

    // Group results by parameter_id and get latest
    const latestResultsMap: Record<string, any> = {};
    latestResults?.forEach((result: any) => {
      if (!latestResultsMap[result.parameter_id]) {
        latestResultsMap[result.parameter_id] = result;
      }
    });

    // Add current value and exceedance status to each parameter
    const parametersWithCurrentValues = (parameters || []).map((parameter: any) => {
      const latestResult = latestResultsMap[parameter.id];
      return {
        ...parameter,
        current_value: latestResult?.recorded_value || null,
        current_sample_date: latestResult?.sample_date || null,
        percentage_of_limit: latestResult?.percentage_of_limit || null,
        exceeded: latestResult?.is_exceedance || false,
      };
    });

    // Check if there are more results
    const hasMore = parametersWithCurrentValues.length > limit;
    const data = hasMore ? parametersWithCurrentValues.slice(0, limit) : parametersWithCurrentValues;
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/parameters:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse request body
    const body = await request.json();
    const { document_id, parameter_type, limit_value, unit, limit_type, range_min, range_max, sampling_frequency, warning_threshold_percent } = body;

    // Validate required fields
    if (!document_id || !parameter_type || limit_value === undefined || !unit) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: document_id, parameter_type, limit_value, unit',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify document exists and is a consent
    // Get site to check company access
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type, module_id')
      .eq('id', document_id)
      .eq('document_type', 'TRADE_EFFLUENT_CONSENT')
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consent document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify site access (which implies company access via RLS)
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('company_id')
      .eq('id', document.site_id)
      .single();

    if (!site || site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consent',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Validate parameter_type enum
    const validTypes = ['BOD', 'COD', 'SS', 'PH', 'TEMPERATURE', 'FOG', 'AMMONIA', 'PHOSPHORUS'];
    if (!validTypes.includes(parameter_type)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        `Invalid parameter_type. Must be one of: ${validTypes.join(', ')}`,
        400,
        {},
        { request_id: requestId }
      );
    }

    // Create parameter
    const { data: parameter, error: paramError } = await supabaseAdmin
      .from('parameters')
      .insert({
        document_id,
        company_id: site.company_id,
        site_id: document.site_id,
        module_id: document.module_id,
        parameter_type,
        limit_value,
        unit,
        limit_type: limit_type || 'MAXIMUM',
        range_min: range_min || null,
        range_max: range_max || null,
        sampling_frequency: sampling_frequency || 'WEEKLY',
        warning_threshold_percent: warning_threshold_percent || 80,
        is_active: true,
      })
      .select()
      .single();

    if (paramError || !parameter) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create parameter',
        500,
        { error: paramError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(parameter, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/parameters:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

