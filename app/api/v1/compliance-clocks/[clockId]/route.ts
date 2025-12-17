/**
 * Compliance Clock Endpoints
 * GET /api/v1/compliance-clocks/{id} - Get single compliance clock details
 * PATCH /api/v1/compliance-clocks/{id} - Update compliance clock (System use only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ clockId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const params = await props.params;
  const { clockId } = params;

    // Get compliance clock - RLS will enforce access control
  const { data: clock, error } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('*')
      .eq('id', clockId)
      .single();

    if (error || !clock) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Compliance clock not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(clock, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/compliance-clocks/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function PATCH(
  request: NextRequest, props: { params: Promise<{ clockId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // This endpoint is restricted to system/service role only
    // Check for service role token in headers
    const serviceRoleToken = request.headers.get('x-service-role-token');
    if (serviceRoleToken !== process.env.SERVICE_ROLE_TOKEN) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'This endpoint is restricted to system use only',
        403,
        {},
        { request_id: requestId }
      );
    }

    const params = await props.params;
  const { clockId } = params;
    const body = await request.json();

    // Update compliance clock (system updates only)
    const updateData: any = {};

    if (body.days_remaining !== undefined) updateData.days_remaining = body.days_remaining;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.criticality !== undefined) updateData.criticality = body.criticality;

  const { data: clock, error: updateError } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .update(updateData)
      .eq('id', clockId)
      .select()
      .single();

    if (updateError || !clock) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update compliance clock',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(clock, 200, { request_id: requestId });
    return response;
  } catch (error: any) {
    console.error('Error in PATCH /api/v1/compliance-clocks/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

