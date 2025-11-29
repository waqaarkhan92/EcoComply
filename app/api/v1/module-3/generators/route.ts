/**
 * Module 3: Generators Endpoints
 * GET /api/v1/module-3/generators - List generators
 * POST /api/v1/module-3/generators - Create generator
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

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 3 ID
    const { data: module3 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_3')
      .single();

    if (!module3) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 3 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - Filter by company_id since we're using supabaseAdmin (bypasses RLS)
    let query = supabaseAdmin
      .from('generators')
      .select(`
        id,
        document_id,
        company_id,
        generator_identifier,
        generator_type,
        capacity_mw,
        fuel_type,
        location_description,
        annual_run_hour_limit,
        monthly_run_hour_limit,
        anniversary_date,
        emissions_nox,
        emissions_so2,
        emissions_co,
        emissions_particulates,
        current_year_hours,
        current_month_hours,
        next_stack_test_due,
        next_service_due,
        is_active,
        created_at,
        updated_at
      `)
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .is('deleted_at', null);

    // Apply filters
    if (filters.site_id) {
      // Get site's document IDs to filter generators
      const { data: siteDocs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('site_id', filters.site_id)
        .eq('module_id', module3.id)
        .eq('document_type', 'MCPD_REGISTRATION');
      
      if (siteDocs && siteDocs.length > 0) {
        const docIds = siteDocs.map((d: any) => d.id);
        query = query.in('document_id', docIds);
      } else {
        // No documents for this site, return empty result
        const emptyResponse = paginatedResponse([], null, { request_id: requestId });
        return await addRateLimitHeaders(request, user.id, emptyResponse);
      }
    }
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }
    if (filters.generator_type) {
      query = query.eq('generator_type', filters.generator_type);
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

    const { data: generators, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch generators',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Calculate percentage used for each generator
    const generatorsWithStats = await Promise.all(
      (generators || []).map(async (generator: any) => {
        const percentageOfAnnual = generator.annual_run_hour_limit > 0
          ? (generator.current_year_hours / generator.annual_run_hour_limit) * 100
          : 0;
        const percentageOfMonthly = generator.monthly_run_hour_limit && generator.monthly_run_hour_limit > 0
          ? (generator.current_month_hours / generator.monthly_run_hour_limit) * 100
          : null;

        return {
          ...generator,
          percentage_of_annual_limit: Number(percentageOfAnnual.toFixed(2)),
          percentage_of_monthly_limit: percentageOfMonthly ? Number(percentageOfMonthly.toFixed(2)) : null,
        };
      })
    );

    // Check if there are more results
    const hasMore = (generatorsWithStats || []).length > limit;
    const data = hasMore ? (generatorsWithStats || []).slice(0, limit) : (generatorsWithStats || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].created_at) : null;

    const response = paginatedResponse(data, nextCursor, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/generators:', error);
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

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 3 ID
    const { data: module3 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_3')
      .single();

    if (!module3) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 3 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      document_id,
      generator_identifier,
      generator_type,
      capacity_mw,
      fuel_type,
      location_description,
      annual_run_hour_limit,
      monthly_run_hour_limit,
      anniversary_date,
      emissions_nox,
      emissions_so2,
      emissions_co,
      emissions_particulates,
      next_stack_test_due,
      next_service_due,
    } = body;

    // Validate required fields
    if (!document_id || !generator_identifier || !generator_type || !capacity_mw || !fuel_type || !anniversary_date) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: document_id, generator_identifier, generator_type, capacity_mw, fuel_type, anniversary_date',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate generator_type
    const validTypes = ['MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'EMERGENCY_GENERATOR'];
    if (!validTypes.includes(generator_type)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        `Invalid generator_type. Must be one of: ${validTypes.join(', ')}`,
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify document exists and belongs to user's company
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, module_id, document_type, sites!inner(company_id)')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const documentCompanyId = (document as any).sites?.company_id;
    if (documentCompanyId !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this document',
        403,
        {},
        { request_id: requestId }
      );
    }

    if (document.module_id !== module3.id || document.document_type !== 'MCPD_REGISTRATION') {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Document must be an MCPD_REGISTRATION for Module 3',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Create generator
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .insert({
        document_id,
        company_id: user.company_id,
        generator_identifier,
        generator_type,
        capacity_mw: Number(capacity_mw),
        fuel_type,
        location_description: location_description || null,
        annual_run_hour_limit: annual_run_hour_limit || 500,
        monthly_run_hour_limit: monthly_run_hour_limit || null,
        anniversary_date,
        emissions_nox: emissions_nox ? Number(emissions_nox) : null,
        emissions_so2: emissions_so2 ? Number(emissions_so2) : null,
        emissions_co: emissions_co ? Number(emissions_co) : null,
        emissions_particulates: emissions_particulates ? Number(emissions_particulates) : null,
        next_stack_test_due: next_stack_test_due || null,
        next_service_due: next_service_due || null,
        current_year_hours: 0,
        current_month_hours: 0,
        is_active: true,
      })
      .select()
      .single();

    if (genError || !generator) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create generator',
        500,
        { error: genError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: generator.id,
        document_id: generator.document_id,
        generator_identifier: generator.generator_identifier,
        generator_type: generator.generator_type,
        capacity_mw: generator.capacity_mw,
        fuel_type: generator.fuel_type,
        annual_run_hour_limit: generator.annual_run_hour_limit,
        monthly_run_hour_limit: generator.monthly_run_hour_limit,
        current_year_hours: generator.current_year_hours,
        current_month_hours: generator.current_month_hours,
        percentage_of_annual_limit: 0,
        created_at: generator.created_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/generators:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

