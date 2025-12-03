/**
 * Module 3: MCPD Registration Detail Endpoints
 * GET /api/v1/module-3/mcpd-registrations/[registrationId] - Get MCPD registration details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ registrationId: string } }
) {
  const requestId = getRequestId(request);
  const { registrationId } = params;

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

    // Fetch registration (document) and verify access
    const { data: registration, error: regError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type, title, reference_number, regulator, status, extraction_status, file_path, file_url, created_at, updated_at')
      .eq('id', registrationId)
      .eq('document_type', 'MCPD_REGISTRATION')
      .eq('module_id', module3.id)
      .is('deleted_at', null)
      .single();

    if (regError || !registration) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'MCPD registration not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify site belongs to user's company
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', registration.site_id)
      .single();

    if (siteError || !site || site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this registration',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get associated generators
    const { data: generators } = await supabaseAdmin
      .from('generators')
      .select(`
        id,
        generator_identifier,
        generator_type,
        capacity_mw,
        fuel_type,
        annual_run_hour_limit,
        monthly_run_hour_limit,
        current_year_hours,
        current_month_hours,
        anniversary_date,
        next_stack_test_due,
        next_service_due,
        is_active
      `)
      .eq('document_id', registrationId)
      .eq('is_active', true)
      .is('deleted_at', null);

    // Calculate percentages for each generator
    const generatorsWithStats = (generators || []).map((gen: any) => {
      const percentageOfAnnual = gen.annual_run_hour_limit > 0
        ? (gen.current_year_hours / gen.annual_run_hour_limit) * 100
        : 0;
      const percentageOfMonthly = gen.monthly_run_hour_limit && gen.monthly_run_hour_limit > 0
        ? (gen.current_month_hours / gen.monthly_run_hour_limit) * 100
        : undefined;

      return {
        ...gen,
        percentage_of_annual_limit: Number(percentageOfAnnual.toFixed(2)),
        percentage_of_monthly_limit: percentageOfMonthly ? Number(percentageOfMonthly.toFixed(2)) : null,
      };
    });

    const response = successResponse(
      {
        ...registration,
        generators: generatorsWithStats,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/mcpd-registrations/[registrationId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

