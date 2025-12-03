/**
 * Regulation Threshold Detail Endpoints
 * GET /api/v1/module-3/regulation-thresholds/{id} - Get regulation threshold
 * PUT /api/v1/module-3/regulation-thresholds/{id} - Update regulation threshold
 * DELETE /api/v1/module-3/regulation-thresholds/{id} - Delete regulation threshold
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ thresholdId: string }> }
) {
  const requestId = getRequestId(request);
  const { thresholdId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_3', user.company_id);

    const { data: threshold, error } = await supabaseAdmin
      .from('regulation_thresholds')
      .select('*')
      .eq('id', thresholdId)
      .single();

    if (error || !threshold) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Regulation threshold not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(threshold, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/regulation-thresholds/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ thresholdId: string }> }
) {
  const requestId = getRequestId(request);
  const { thresholdId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_3', user.company_id);

    const body = await request.json();
    const {
      capacity_min_mw,
      capacity_max_mw,
      monitoring_frequency,
      stack_test_frequency,
      reporting_frequency,
      regulation_reference,
      is_active,
    } = body;

    // Get existing threshold to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('regulation_thresholds')
      .select('id, company_id')
      .eq('id', thresholdId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Regulation threshold not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this threshold', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (capacity_min_mw !== undefined) updateData.capacity_min_mw = parseFloat(capacity_min_mw);
    if (capacity_max_mw !== undefined) updateData.capacity_max_mw = capacity_max_mw ? parseFloat(capacity_max_mw) : undefined;
    if (monitoring_frequency !== undefined) updateData.monitoring_frequency = monitoring_frequency;
    if (stack_test_frequency !== undefined) updateData.stack_test_frequency = stack_test_frequency;
    if (reporting_frequency !== undefined) updateData.reporting_frequency = reporting_frequency;
    if (regulation_reference !== undefined) updateData.regulation_reference = regulation_reference;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: threshold, error } = await supabaseAdmin
      .from('regulation_thresholds')
      .update(updateData)
      .eq('id', thresholdId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update regulation threshold', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(threshold, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/regulation-thresholds/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ thresholdId: string }> }
) {
  const requestId = getRequestId(request);
  const { thresholdId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_3', user.company_id);

    // Get existing threshold to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('regulation_thresholds')
      .select('id, company_id')
      .eq('id', thresholdId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Regulation threshold not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this threshold', 403, {}, { request_id: requestId });
    }

    const { error } = await supabaseAdmin
      .from('regulation_thresholds')
      .delete()
      .eq('id', thresholdId);

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete regulation threshold', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse({ id: thresholdId, deleted: true }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-3/regulation-thresholds/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

