/**
 * Module 3: Generator Detail Endpoints
 * GET /api/v1/module-3/generators/[generatorId] - Get generator details
 * PUT /api/v1/module-3/generators/[generatorId] - Update generator
 * DELETE /api/v1/module-3/generators/[generatorId] - Delete generator (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { generatorId: string } }
) {
  const requestId = getRequestId(request);
  const { generatorId } = params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(generatorId)) {
    return errorResponse(
      ErrorCodes.BAD_REQUEST,
      'Invalid generator ID format',
      400,
      { generator_id: 'Must be a valid UUID' },
      { request_id: requestId }
    );
  }

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

    // Fetch generator
    const { data: generator, error } = await supabaseAdmin
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
        metadata,
        created_at,
        updated_at
      `)
      .eq('id', generatorId)
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Error fetching generator:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch generator',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    if (!generator) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Company_id is already filtered in the query above, so no need to check again

    // Calculate percentages
    const percentageOfAnnual = generator.annual_run_hour_limit > 0
      ? (generator.current_year_hours / generator.annual_run_hour_limit) * 100
      : 0;
    const percentageOfMonthly = generator.monthly_run_hour_limit && generator.monthly_run_hour_limit > 0
      ? (generator.current_month_hours / generator.monthly_run_hour_limit) * 100
      : null;

    // Get recent run-hour records
    const { data: recentRecords } = await supabaseAdmin
      .from('run_hour_records')
      .select('id, recording_date, hours_recorded, running_total_year, percentage_of_annual_limit')
      .eq('generator_id', generatorId)
      .eq('company_id', user.company_id)
      .order('recording_date', { ascending: false })
      .limit(10);

    const response = successResponse(
      {
        ...generator,
        percentage_of_annual_limit: Number(percentageOfAnnual.toFixed(2)),
        percentage_of_monthly_limit: percentageOfMonthly ? Number(percentageOfMonthly.toFixed(2)) : null,
        recent_run_hour_records: recentRecords || [],
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/generators/[generatorId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { generatorId: string } }
) {
  const requestId = getRequestId(request);
  const { generatorId } = params;

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

    // Verify generator exists and user has access
    const { data: existingGenerator, error: fetchError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id')
      .eq('id', generatorId)
      .single();

    if (fetchError || !existingGenerator) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existingGenerator.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this generator',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: any = {};

    // Allow updating these fields
    if (body.generator_identifier !== undefined) updateData.generator_identifier = body.generator_identifier;
    if (body.generator_type !== undefined) {
      const validTypes = ['MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'EMERGENCY_GENERATOR'];
      if (!validTypes.includes(body.generator_type)) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          `Invalid generator_type. Must be one of: ${validTypes.join(', ')}`,
          400,
          {},
          { request_id: requestId }
        );
      }
      updateData.generator_type = body.generator_type;
    }
    if (body.capacity_mw !== undefined) updateData.capacity_mw = Number(body.capacity_mw);
    if (body.fuel_type !== undefined) updateData.fuel_type = body.fuel_type;
    if (body.location_description !== undefined) updateData.location_description = body.location_description;
    if (body.annual_run_hour_limit !== undefined) updateData.annual_run_hour_limit = Number(body.annual_run_hour_limit);
    if (body.monthly_run_hour_limit !== undefined) updateData.monthly_run_hour_limit = body.monthly_run_hour_limit ? Number(body.monthly_run_hour_limit) : null;
    if (body.anniversary_date !== undefined) updateData.anniversary_date = body.anniversary_date;
    if (body.emissions_nox !== undefined) updateData.emissions_nox = body.emissions_nox ? Number(body.emissions_nox) : null;
    if (body.emissions_so2 !== undefined) updateData.emissions_so2 = body.emissions_so2 ? Number(body.emissions_so2) : null;
    if (body.emissions_co !== undefined) updateData.emissions_co = body.emissions_co ? Number(body.emissions_co) : null;
    if (body.emissions_particulates !== undefined) updateData.emissions_particulates = body.emissions_particulates ? Number(body.emissions_particulates) : null;
    if (body.next_stack_test_due !== undefined) updateData.next_stack_test_due = body.next_stack_test_due || null;
    if (body.next_service_due !== undefined) updateData.next_service_due = body.next_service_due || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'No valid fields to update',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Update generator
    const { data: updatedGenerator, error: updateError } = await supabaseAdmin
      .from('generators')
      .update(updateData)
      .eq('id', generatorId)
      .select()
      .single();

    if (updateError || !updatedGenerator) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update generator',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      updatedGenerator,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/generators/[generatorId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { generatorId: string } }
) {
  const requestId = getRequestId(request);
  const { generatorId } = params;

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Verify generator exists and user has access
    const { data: existingGenerator, error: fetchError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id')
      .eq('id', generatorId)
      .single();

    if (fetchError || !existingGenerator) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existingGenerator.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this generator',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabaseAdmin
      .from('generators')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', generatorId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete generator',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { id: generatorId, deleted: true },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-3/generators/[generatorId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

