import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/module-3/sulphur-content-reports
 * List sulphur content reports for generators
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
    const dateGte = searchParams.get('filter[test_date][gte]');
    const dateLte = searchParams.get('filter[test_date][lte]');
    const complianceStatus = filters.compliance_status as string | undefined || searchParams.get('filter[compliance_status]');

    let query = supabaseAdmin
      .from('sulphur_content_reports')
      .select('*, generator:generators(generator_identifier, generator_type), evidence:evidence_items(id, file_name)', { count: 'exact' });

    // Apply filters
    if (generatorId) {
      query = query.eq('generator_id', generatorId);
    }
    if (dateGte) {
      query = query.gte('test_date', dateGte);
    }
    if (dateLte) {
      query = query.lte('test_date', dateLte);
    }
    if (complianceStatus) {
      query = query.eq('compliance_status', complianceStatus);
    }

    // Apply sorting
    if (sort.length > 0) {
      const firstSort = sort[0];
      query = query.order(firstSort.field, { ascending: firstSort.direction === 'asc' });
    } else {
      query = query.order('test_date', { ascending: false });
    }

    // Apply pagination
    if (cursor) {
      query = query.lt('id', cursor);
    }
    query = query.limit(limit + 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching sulphur content reports:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch sulphur content reports',
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
    console.error('Error in GET /api/v1/module-3/sulphur-content-reports:', error);
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
 * POST /api/v1/module-3/sulphur-content-reports
 * Create a new sulphur content report entry
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
      fuel_type,
      test_date,
      batch_reference,
      supplier_name,
      sulphur_content_percentage,
      sulphur_content_mg_per_kg,
      test_method,
      test_standard,
      test_laboratory,
      test_certificate_reference,
      regulatory_limit_percentage,
      regulatory_limit_mg_per_kg,
      compliance_status = 'PENDING',
      exceedance_details,
      evidence_id,
      notes,
    } = body;

    // Validation
    if (!fuel_type || !test_date || sulphur_content_percentage === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: fuel_type, test_date, sulphur_content_percentage',
        422,
        {},
        { request_id: requestId }
      );
    }

    // Calculate compliance status if regulatory limits provided
    let calculatedStatus = compliance_status;
    if (regulatory_limit_percentage !== undefined && sulphur_content_percentage > regulatory_limit_percentage) {
      calculatedStatus = 'EXCEEDED';
    } else if (regulatory_limit_mg_per_kg !== undefined && sulphur_content_mg_per_kg && sulphur_content_mg_per_kg > regulatory_limit_mg_per_kg) {
      calculatedStatus = 'EXCEEDED';
    } else if (regulatory_limit_percentage !== undefined || regulatory_limit_mg_per_kg !== undefined) {
      calculatedStatus = 'COMPLIANT';
    }

    // Get company_id and site_id
    let companyId: string;
    let siteId: string;

    if (generator_id) {
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

      companyId = generator.company_id;
      siteId = (generator.document as any)?.site_id;
      if (!siteId) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Generator document not found',
          404,
          {},
          { request_id: requestId }
        );
      }
    } else {
      // If no generator_id, need company_id and site_id in request
      if (!body.company_id || !body.site_id) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Missing required fields: generator_id or (company_id and site_id)',
          422,
          {},
          { request_id: requestId }
        );
      }
      companyId = body.company_id;
      siteId = body.site_id;
    }

    // Create sulphur content report
    const { data: report, error: insertError } = await supabaseAdmin
      .from('sulphur_content_reports')
      .insert({
        generator_id,
        company_id: companyId,
        site_id: siteId,
        fuel_type,
        test_date,
        batch_reference,
        supplier_name,
        sulphur_content_percentage,
        sulphur_content_mg_per_kg,
        test_method,
        test_standard,
        test_laboratory,
        test_certificate_reference,
        regulatory_limit_percentage,
        regulatory_limit_mg_per_kg,
        compliance_status: calculatedStatus,
        exceedance_details: calculatedStatus === 'EXCEEDED' ? exceedance_details : null,
        evidence_id,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating sulphur content report:', insertError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create sulphur content report',
        500,
        {},
        { request_id: requestId }
      );
    }

    return successResponse(report, 201);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/sulphur-content-reports:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

