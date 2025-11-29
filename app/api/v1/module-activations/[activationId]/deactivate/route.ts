/**
 * Module Deactivation Endpoint
 * PUT /api/v1/module-activations/{activationId}/deactivate - Deactivate module
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest,
  { params }: { params: { activationId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { activationId } = params;

    // Parse request body (optional)
    let deactivationReason: string | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      deactivationReason = body.deactivation_reason;
    } catch {
      // Body is optional
    }

    // Get activation - RLS will enforce access control
    const { data: activation, error: getError } = await supabaseAdmin
      .from('module_activations')
      .select('id, company_id, status')
      .eq('id', activationId)
      .single();

    if (getError || !activation) {
      if (getError?.code === 'PGRST116') {
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
        { error: getError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (user.company_id !== activation.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Check if already deactivated
    if (activation.status !== 'ACTIVE') {
      return errorResponse(
        ErrorCodes.UNPROCESSABLE_ENTITY,
        `Module activation is already ${activation.status}`,
        422,
        { status: activation.status },
        { request_id: requestId }
      );
    }

    // Update activation status
    const { data: updatedActivation, error: updateError } = await supabaseAdmin
      .from('module_activations')
      .update({
        status: 'INACTIVE',
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: deactivationReason || null,
        billing_end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', activationId)
      .select('id, status, deactivated_at, deactivated_by, deactivation_reason')
      .single();

    if (updateError || !updatedActivation) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to deactivate module',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedActivation, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Deactivate module error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

