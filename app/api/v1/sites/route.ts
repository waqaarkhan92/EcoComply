/**
 * Sites Endpoints
 * GET /api/v1/sites - List sites (RLS filtered)
 * POST /api/v1/sites - Create site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
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

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('sites')
      .select('id, company_id, name, address_line_1, address_line_2, city, postcode, country, regulator, water_company, grace_period_days, is_active, created_at, updated_at')
      .is('deleted_at', null); // Only non-deleted sites

    // Apply filters
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.regulator) {
      query = query.eq('regulator', filters.regulator);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: sites, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch sites',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = sites && sites.length > limit;
    const results = hasMore ? sites.slice(0, limit) : sites || [];

    // Create cursor for next page (if there are more results)
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
    console.error('Get sites error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.length < 2 || body.name.length > 100) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Site name is required and must be between 2 and 100 characters',
        422,
        { name: 'Site name is required and must be between 2 and 100 characters' },
        { request_id: requestId }
      );
    }

    // Validate regulator if provided
    const validRegulators = ['EA', 'SEPA', 'NRW', 'NIEA'];
    if (body.regulator && !validRegulators.includes(body.regulator)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid regulator',
        422,
        { regulator: `Must be one of: ${validRegulators.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Use user's company_id if not provided (or validate if provided)
    const companyId = body.company_id || user.company_id;

    // Verify user has access to this company (RLS will enforce, but we check here too)
    if (body.company_id && body.company_id !== user.company_id && !user.is_consultant) {
      // For consultants, check if they have access to this company
      const { data: assignment } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', body.company_id)
        .eq('status', 'ACTIVE')
        .single();

      if (!assignment) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'You do not have access to this company',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Create site
    const siteData: any = {
      company_id: companyId,
      name: body.name,
      address_line_1: body.address_line_1 || null,
      address_line_2: body.address_line_2 || null,
      city: body.city || null,
      postcode: body.postcode || null,
      country: body.country || 'GB',
      regulator: body.regulator || null,
      water_company: body.water_company || null,
      grace_period_days: body.grace_period_days || 7,
      is_active: true,
    };

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .insert(siteData)
      .select('id, company_id, name, regulator, created_at')
      .single();

    if (error || !site) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create site',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(site, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create site error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
