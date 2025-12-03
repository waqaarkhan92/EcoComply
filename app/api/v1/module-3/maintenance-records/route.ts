/**
 * Module 3: Maintenance Records Endpoints
 * GET /api/v1/module-3/maintenance-records - List maintenance records
 * POST /api/v1/module-3/maintenance-records - Create maintenance record
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
      .from('maintenance_records')
      .select(`
        id,
        generator_id,
        company_id,
        maintenance_date,
        maintenance_type,
        description,
        run_hours_at_service,
        service_provider,
        service_reference,
        next_service_due,
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
    if (filters.maintenance_type) {
      query = query.eq('maintenance_type', filters.maintenance_type);
    }
    if (filters.maintenance_date?.gte) {
      query = query.gte('maintenance_date', filters.maintenance_date.gte);
    }
    if (filters.maintenance_date?.lte) {
      query = query.lte('maintenance_date', filters.maintenance_date.lte);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('maintenance_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: records, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch maintenance records',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (records || []).length > limit;
    const data = hasMore ? (records || []).slice(0, limit) : (records || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/maintenance-records:', error);
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
      maintenance_date,
      maintenance_type,
      description,
      run_hours_at_service,
      service_provider,
      service_reference,
      next_service_due,
      evidence_id,
      notes,
    } = body;

    // Validate required fields
    if (!generator_id || !maintenance_date || !maintenance_type) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: generator_id, maintenance_date, maintenance_type',
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

    // Create maintenance record
    const { data: record, error: recordError } = await supabaseAdmin
      .from('maintenance_records')
      .insert({
        generator_id,
        company_id: user.company_id,
        maintenance_date,
        maintenance_type,
        description: description || null,
        run_hours_at_service: run_hours_at_service ? Number(run_hours_at_service) : null,
        service_provider: service_provider || null,
        service_reference: service_reference || null,
        next_service_due: next_service_due || null,
        evidence_id: evidence_id || null,
        notes: notes || null,
        entered_by: user.id,
      })
      .select()
      .single();

    if (recordError || !record) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create maintenance record',
        500,
        { error: recordError?.message },
        { request_id: requestId }
      );
    }

    // If run_hours_at_service is provided, optionally create a run-hour record
    // This is handled by the frontend or a background job, but we could do it here
    // For now, we'll just update the generator's next_service_due if provided
    if (next_service_due) {
      await supabaseAdmin
        .from('generators')
        .update({ next_service_due })
        .eq('id', generator_id);
    }

    const response = successResponse(
      record,
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/maintenance-records:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

