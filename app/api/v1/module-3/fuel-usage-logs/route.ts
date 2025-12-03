import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/module-3/fuel-usage-logs
 * List fuel usage logs for generators
 */
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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Get filter values from query params (parseFilterParams doesn't handle nested filters)
    const searchParams = request.nextUrl.searchParams;
    const generatorId = filters.generator_id as string | undefined || searchParams.get('filter[generator_id]');
    const dateGte = searchParams.get('filter[date][gte]');
    const dateLte = searchParams.get('filter[date][lte]');

    let query = supabaseAdmin
      .from('fuel_usage_logs')
      .select('*, generator:generators(generator_identifier, generator_type), evidence:evidence_items(id, file_name)', { count: 'exact' });

    // Apply filters
    if (generatorId) {
      query = query.eq('generator_id', generatorId);
    }
    if (dateGte) {
      query = query.gte('log_date', dateGte);
    }
    if (dateLte) {
      query = query.lte('log_date', dateLte);
    }

    // Apply sorting
    if (sort.length > 0) {
      const firstSort = sort[0];
      query = query.order(firstSort.field, { ascending: firstSort.direction === 'asc' });
    } else {
      query = query.order('log_date', { ascending: false });
    }

    // Apply pagination
    if (cursor) {
      query = query.lt('id', cursor);
    }
    query = query.limit(limit + 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching fuel usage logs:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch fuel usage logs',
        500,
        {},
        { request_id: requestId }
      );
    }

    const hasMore = data && data.length > limit;
    const results = hasMore ? data.slice(0, limit) : (data || []);
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : undefined;

    return paginatedResponse(results, nextCursor, limit, hasMore);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/fuel-usage-logs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

/**
 * POST /api/v1/module-3/fuel-usage-logs
 * Create a new fuel usage log entry
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      generator_id,
      log_date,
      fuel_type,
      quantity,
      unit = 'LITRES',
      sulphur_content_percentage,
      sulphur_content_mg_per_kg,
      entry_method = 'MANUAL',
      source_maintenance_record_id,
      integration_system,
      integration_reference,
      evidence_id,
      notes,
    } = body;

    // Validation
    if (!generator_id || !log_date || !fuel_type || quantity === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: generator_id, log_date, fuel_type, quantity',
        422,
        {},
        { request_id: requestId }
      );
    }

    if (quantity < 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Quantity must be >= 0',
        422,
        {},
        { request_id: requestId }
      );
    }

    // Get generator to verify company_id and site_id
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .select('company_id, document:documents(site_id)')
      .eq('id', generator_id)
      .single();

    if (genError || !generator) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const siteId = (generator.document as any)?.site_id;
    if (!siteId) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Create fuel usage log
    const { data: fuelLog, error: insertError } = await supabaseAdmin
      .from('fuel_usage_logs')
      .insert({
        generator_id,
        company_id: generator.company_id,
        site_id: siteId,
        log_date,
        fuel_type,
        quantity,
        unit,
        sulphur_content_percentage,
        sulphur_content_mg_per_kg,
        entry_method,
        source_maintenance_record_id,
        integration_system,
        integration_reference,
        evidence_id,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating fuel usage log:', insertError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create fuel usage log',
        500,
        {},
        { request_id: requestId }
      );
    }

    return successResponse(fuelLog, 201);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/fuel-usage-logs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

