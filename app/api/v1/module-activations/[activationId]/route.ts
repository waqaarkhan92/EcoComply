/**
 * Module Activation Detail Endpoint
 * GET /api/v1/module-activations/{activationId} - Get module activation details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ activationId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { activationId } = params;

    // Get activation - RLS will enforce access control
  const { data: activation, error } = await supabaseAdmin
      .from('module_activations')
      .select(`
        id,
        company_id,
        site_id,
        module_id,
        status,
        activated_at,
        activated_by,
        deactivated_at,
        deactivated_by,
        deactivation_reason,
        billing_start_date,
        billing_end_date,
        created_at,
        updated_at,
        modules!inner(module_code, module_name)
      `)
      .eq('id', activationId)
      .single();

    if (error || !activation) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Module activation not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch module activation',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: activation.id,
        company_id: activation.company_id,
        site_id: activation.site_id,
        module_id: activation.module_id,
        module_name: (activation.modules as any)?.module_name || null,
        status: activation.status,
        activated_at: activation.activated_at,
        activated_by: activation.activated_by,
        deactivated_at: activation.deactivated_at,
        deactivated_by: activation.deactivated_by,
        deactivation_reason: activation.deactivation_reason,
        billing_start_date: activation.billing_start_date,
        billing_end_date: activation.billing_end_date,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get module activation error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

