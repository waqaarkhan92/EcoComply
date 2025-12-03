/**
 * Module 3: Stack Tests Endpoints
 * GET /api/v1/module-3/stack-tests - List stack tests
 * POST /api/v1/module-3/stack-tests - Create stack test record
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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('stack_tests')
      .select(`
        id,
        generator_id,
        company_id,
        test_date,
        test_company,
        test_reference,
        nox_result,
        so2_result,
        co_result,
        particulates_result,
        compliance_status,
        exceedances_found,
        exceedance_details,
        next_test_due,
        evidence_id,
        notes,
        entered_by,
        created_at,
        updated_at,
        generators!inner(
          id,
          generator_identifier,
          generator_type
        )
      `);

    // Apply filters
    if (filters.generator_id) {
      query = query.eq('generator_id', filters.generator_id);
    }
    if (filters.compliance_status) {
      query = query.eq('compliance_status', filters.compliance_status);
    }
    if (filters.test_date?.gte) {
      query = query.gte('test_date', filters.test_date.gte);
    }
    if (filters.test_date?.lte) {
      query = query.lte('test_date', filters.test_date.lte);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('test_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: tests, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch stack tests',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (tests || []).length > limit;
    const data = hasMore ? (tests || []).slice(0, limit) : (tests || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/stack-tests:', error);
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

    // Parse request body
    const body = await request.json();
    const {
      generator_id,
      test_date,
      test_company,
      test_reference,
      nox_result,
      so2_result,
      co_result,
      particulates_result,
      compliance_status = 'PENDING',
      exceedances_found = false,
      exceedance_details,
      next_test_due,
      evidence_id,
      notes,
    } = body;

    // Validate required fields
    if (!generator_id || !test_date) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: generator_id, test_date',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate compliance_status
    const validStatuses = ['PENDING', 'PASS', 'FAIL', 'NON_COMPLIANT'];
    if (!validStatuses.includes(compliance_status)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        `Invalid compliance_status. Must be one of: ${validStatuses.join(', ')}`,
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify generator exists and belongs to user's company
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id')
      .eq('id', generator_id)
      .eq('is_active', true)
      .is('deleted_at', null)
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

    if (generator.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this generator',
        403,
        {},
        { request_id: requestId }
      );
    }

    // If evidence_id is provided, verify it exists
    if (evidence_id) {
      const { data: evidence, error: evError } = await supabaseAdmin
        .from('evidence_items')
        .select('id, company_id')
        .eq('id', evidence_id)
        .single();

      if (evError || !evidence || evidence.company_id !== user.company_id) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'Invalid evidence_id',
          400,
          {},
          { request_id: requestId }
        );
      }
    }

    // Create stack test record
    const { data: test, error: testError } = await supabaseAdmin
      .from('stack_tests')
      .insert({
        generator_id,
        company_id: user.company_id,
        test_date,
        test_company: test_company || null,
        test_reference: test_reference || null,
        nox_result: nox_result ? Number(nox_result) : null,
        so2_result: so2_result ? Number(so2_result) : null,
        co_result: co_result ? Number(co_result) : null,
        particulates_result: particulates_result ? Number(particulates_result) : null,
        compliance_status,
        exceedances_found,
        exceedance_details: exceedance_details || null,
        next_test_due: next_test_due || null,
        evidence_id: evidence_id || null,
        notes: notes || null,
        entered_by: user.id,
      })
      .select()
      .single();

    if (testError || !test) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create stack test',
        500,
        { error: testError?.message },
        { request_id: requestId }
      );
    }

    // Update generator's next_stack_test_due if provided
    if (next_test_due) {
      await supabaseAdmin
        .from('generators')
        .update({ next_stack_test_due: next_test_due })
        .eq('id', generator_id);
    }

    const response = successResponse(
      test,
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/stack-tests:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

