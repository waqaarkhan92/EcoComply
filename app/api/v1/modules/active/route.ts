/**
 * Active Modules Endpoint
 * GET /api/v1/modules/active - List active modules for company
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
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

    // Get user's company
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData?.company_id) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Company not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get active module activations for company
    const { data: activations, error: activationsError } = await supabaseAdmin
      .from('module_activations')
      .select(`
        id,
        module_id,
        module:modules!module_activations_module_id_fkey (
          id,
          module_code,
          module_name,
          module_description,
          pricing_model,
          base_price
        ),
        status,
        activated_at,
        site_id
      `)
      .eq('company_id', userData.company_id)
      .eq('status', 'ACTIVE');

    if (activationsError) {
      console.error('Error fetching active modules:', activationsError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch active modules',
        500,
        { error: activationsError.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Format response
    const activeModules = (activations || []).map((activation: any) => ({
      activation_id: activation.id,
      module_id: activation.module_id,
      module_code: activation.module?.module_code,
      module_name: activation.module?.module_name,
      module_description: activation.module?.module_description,
      pricing_model: activation.module?.pricing_model,
      base_price: activation.module?.base_price,
      status: activation.status,
      activated_at: activation.activated_at,
      site_id: activation.site_id,
    }));

    const response = successResponse(
      {
        company_id: userData.company_id,
        active_modules: activeModules,
        count: activeModules.length,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get active modules error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

