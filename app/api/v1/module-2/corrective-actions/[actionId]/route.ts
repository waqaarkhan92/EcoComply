/**
 * Module 2: Corrective Action Detail Endpoints
 * GET /api/v1/module-2/corrective-actions/{id} - Get corrective action
 * PUT /api/v1/module-2/corrective-actions/{id} - Update corrective action
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const requestId = getRequestId(request);
  const { actionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (error || !action) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Corrective action not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(action, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/corrective-actions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const requestId = getRequestId(request);
  const { actionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      action_type,
      action_title,
      action_description,
      assigned_to,
      due_date,
      status,
      lifecycle_phase,
      root_cause_analysis,
      impact_assessment,
      regulator_notification_required,
      regulator_justification,
    } = body;

    // Get existing action to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('corrective_actions')
      .select('id, company_id')
      .eq('id', actionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Corrective action not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this corrective action', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (action_type !== undefined) updateData.action_type = action_type;
    if (action_title !== undefined) updateData.action_title = action_title;
    if (action_description !== undefined) updateData.action_description = action_description;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (status !== undefined) updateData.status = status;
    if (lifecycle_phase !== undefined) updateData.lifecycle_phase = lifecycle_phase;
    if (root_cause_analysis !== undefined) updateData.root_cause_analysis = root_cause_analysis;
    if (impact_assessment !== undefined) updateData.impact_assessment = impact_assessment;
    if (regulator_notification_required !== undefined) updateData.regulator_notification_required = regulator_notification_required;
    if (regulator_justification !== undefined) updateData.regulator_justification = regulator_justification;

    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .update(updateData)
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update corrective action', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(action, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-2/corrective-actions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

