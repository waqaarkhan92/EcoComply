/**
 * Module 4: Chain Break Alert Resolution Endpoint
 * POST /api/v1/module-4/chain-break-alerts/{id}/resolve - Resolve chain break alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ alertId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
    const { alertId } = params;
    const body = await request.json();

    // Get existing alert to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('chain_break_alerts')
      .select('id, company_id, is_resolved')
      .eq('id', alertId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Chain break alert not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this chain break alert',
        403,
        {},
        { request_id: requestId }
      );
    }

    if (existing.is_resolved) {
      return errorResponse(
        ErrorCodes.CONFLICT,
        'Alert is already resolved',
        409,
        {},
        { request_id: requestId }
      );
    }

    // Resolve alert
    const { data: alert, error: updateError } = await supabaseAdmin
      .from('chain_break_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: body.resolution_notes || null,
      })
      .eq('id', alertId)
      .select()
      .single();

    if (updateError || !alert) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to resolve chain break alert',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(alert, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/chain-break-alerts/[id]/resolve:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

