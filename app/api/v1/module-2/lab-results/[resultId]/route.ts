/**
 * Module 2: Lab Result Details Endpoint
 * GET /api/v1/module-2/lab-results/{resultId} - Get lab result details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> | { resultId: string } }
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
    const { resultId } = resolvedParams;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resultId)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid lab result ID format',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Get lab result
    const { data: labResult, error: labError } = await supabaseAdmin
      .from('lab_results')
      .select(`
        id,
        parameter_id,
        company_id,
        site_id,
        sample_date,
        sample_id,
        recorded_value,
        unit,
        percentage_of_limit,
        lab_reference,
        entry_method,
        source_file_path,
        is_exceedance,
        entered_by,
        verified_by,
        verified_at,
        notes,
        created_at,
        updated_at
      `)
      .eq('id', resultId)
      .maybeSingle();

    if (labError || !labResult) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Lab result not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify company access
    if (labResult.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this lab result',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get parameter details
    const { data: parameter } = await supabaseAdmin
      .from('parameters')
      .select('id, parameter_type, limit_value, unit, document_id')
      .eq('id', labResult.parameter_id)
      .single();

    // Get document (consent) details
    let consentId = null;
    if (parameter?.document_id) {
      const { data: document } = await supabaseAdmin
        .from('documents')
        .select('id, reference_number, water_company')
        .eq('id', parameter.document_id)
        .single();
      consentId = document?.id || null;
    }

    // Format response with parameter details
    const responseData = {
      id: labResult.id,
      consent_id: consentId,
      sample_date: labResult.sample_date,
      parameters: parameter ? [
        {
          parameter_name: parameter.parameter_type,
          value: labResult.recorded_value,
          limit: parameter.limit_value,
          unit: parameter.unit,
          percentage_of_limit: labResult.percentage_of_limit,
          exceeded: labResult.is_exceedance,
        }
      ] : [],
      lab_reference: labResult.lab_reference,
      entry_method: labResult.entry_method,
      verified_by: labResult.verified_by,
      verified_at: labResult.verified_at,
      notes: labResult.notes,
      created_at: labResult.created_at,
    };

    const response = successResponse(responseData, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/lab-results/[resultId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

