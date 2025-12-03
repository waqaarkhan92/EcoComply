/**
 * Module 2: Corrective Action Close Endpoint
 * POST /api/v1/module-2/corrective-actions/{id}/close - Close corrective action with justification
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
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
    const { resolution_notes, regulator_justification, closure_requires_approval } = body;

    // Get existing action to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('corrective_actions')
      .select('id, company_id, status, closure_requires_approval')
      .eq('id', actionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Corrective action not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this corrective action', 403, {}, { request_id: requestId });
    }

    if (existing.status === 'CLOSED') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Corrective action is already closed',
        400,
        {},
        { request_id: requestId }
      );
    }

    // If closure requires approval, set approved_by
    const updateData: any = {
      status: 'CLOSED',
      completed_date: new Date().toISOString().split('T')[0],
      lifecycle_phase: 'CLOSURE',
    };

    if (resolution_notes) updateData.resolution_notes = resolution_notes;
    if (regulator_justification) updateData.regulator_justification = regulator_justification;
    if (closure_requires_approval !== undefined) updateData.closure_requires_approval = closure_requires_approval;

    // If approval is required and not yet approved, set approved_by
    if (closure_requires_approval && !existing.closure_requires_approval) {
      updateData.closure_approved_by = user.id;
      updateData.closure_approved_at = new Date().toISOString();
    }

    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .update(updateData)
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to close corrective action', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(action, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/corrective-actions/{id}/close:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

