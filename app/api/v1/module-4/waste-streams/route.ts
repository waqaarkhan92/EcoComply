/**
 * Module 4: Waste Streams Endpoints
 * GET /api/v1/module-4/waste-streams - List waste streams
 * POST /api/v1/module-4/waste-streams - Create waste stream
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

    // Check Module 4 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 4 ID
    const { data: module4 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_4')
      .single();

    if (!module4) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 4 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    let limit: number;
    let cursor: string | null;
    try {
      const pagination = parsePaginationParams(request);
      limit = pagination.limit;
      cursor = pagination.cursor;
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message || 'Invalid pagination parameters',
        422,
        { limit: 'Limit must be a positive integer between 1 and 100' },
        { request_id: requestId }
      );
    }
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('waste_streams')
      .select(`
        id,
        company_id,
        site_id,
        module_id,
        ewc_code,
        waste_description,
        waste_category,
        hazard_code,
        permit_reference,
        volume_limit_m3,
        storage_duration_limit_days,
        is_active,
        metadata,
        created_at,
        updated_at
      `)
      .eq('module_id', module4.id)
      .is('deleted_at', null);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }
    if (filters.ewc_code) {
      query = query.eq('ewc_code', filters.ewc_code);
    }
    if (filters.waste_category) {
      query = query.eq('waste_category', filters.waste_category);
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

    const { data: wasteStreams, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch waste streams',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (wasteStreams || []).length > limit;
    const data = hasMore ? (wasteStreams || []).slice(0, limit) : (wasteStreams || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/waste-streams:', error);
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

    // Check Module 4 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 4 ID
    const { data: module4 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_4')
      .single();

    if (!module4) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 4 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }
    if (!body.ewc_code) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'ewc_code is required',
        422,
        { ewc_code: 'ewc_code is required' },
        { request_id: requestId }
      );
    }
    if (!body.waste_description) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'waste_description is required',
        422,
        { waste_description: 'waste_description is required' },
        { request_id: requestId }
      );
    }

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', body.site_id)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this site',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Create waste stream
    const { data: wasteStream, error: createError } = await supabaseAdmin
      .from('waste_streams')
      .insert({
        company_id: user.company_id,
        site_id: body.site_id,
        module_id: module4.id,
        ewc_code: body.ewc_code,
        waste_description: body.waste_description,
        waste_category: body.waste_category || null,
        hazard_code: body.hazard_code || null,
        permit_reference: body.permit_reference || null,
        volume_limit_m3: body.volume_limit_m3 || null,
        storage_duration_limit_days: body.storage_duration_limit_days || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        metadata: body.metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !wasteStream) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create waste stream',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: wasteStream.id,
        site_id: wasteStream.site_id,
        ewc_code: wasteStream.ewc_code,
        waste_description: wasteStream.waste_description,
        is_active: wasteStream.is_active,
        created_at: wasteStream.created_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/waste-streams:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

