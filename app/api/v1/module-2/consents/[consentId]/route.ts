/**
 * Module 2: Consent Details Endpoint
 * GET /api/v1/module-2/consents/{consentId} - Get consent details with parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consentId: string }> | { consentId: string } }
) {
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

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const consentId = resolvedParams?.consentId || (resolvedParams as any)?.consentId;

    // Validate UUID
    if (!consentId || typeof consentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(consentId)) {
      console.error('Invalid consentId:', consentId, 'Type:', typeof consentId, 'Params:', resolvedParams);
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid consent ID format',
        400,
        { consentId, type: typeof consentId },
        { request_id: requestId }
      );
    }

    // Get consent (document)
    const { data: consent, error: consentError } = await supabaseAdmin
      .from('documents')
      .select(`
        id,
        site_id,
        document_type,
        title,
        reference_number,
        regulator,
        water_company,
        status,
        extraction_status,
        storage_path,
        created_at,
        updated_at
      `)
      .eq('id', consentId)
      .eq('document_type', 'TRADE_EFFLUENT_CONSENT')
      .is('deleted_at', null)
      .maybeSingle();

    if (consentError) {
      console.error('Error fetching consent:', consentError);
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consent not found',
        404,
        { error: consentError.message },
        { request_id: requestId }
      );
    }

    if (!consent) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consent not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify site access (which implies company access via RLS)
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('company_id')
      .eq('id', consent.site_id)
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

    // Get parameters for this consent
    const { data: parameters } = await supabaseAdmin
      .from('parameters')
      .select(`
        id,
        parameter_type,
        limit_value,
        unit,
        limit_type,
        range_min,
        range_max,
        sampling_frequency,
        warning_threshold_percent,
        is_active
      `)
      .eq('document_id', consentId)
      .eq('is_active', true)
      .order('parameter_type', { ascending: true });

    // Get latest lab results for each parameter
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

    // Add current value to each parameter
    const parametersWithValues = (parameters || []).map((parameter: any) => {
      const latestResult = latestResultsMap[parameter.id];
      return {
        parameter_name: parameter.parameter_type,
        limit_value: parameter.limit_value,
        unit: parameter.unit,
        limit_type: parameter.limit_type,
        sampling_frequency: parameter.sampling_frequency,
        current_value: latestResult?.recorded_value || null,
        current_sample_date: latestResult?.sample_date || null,
        percentage_of_limit: latestResult?.percentage_of_limit || null,
        exceeded: latestResult?.is_exceedance || false,
      };
    });

    const response = successResponse(
      {
        ...consent,
        parameters: parametersWithValues,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/consents/[consentId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

