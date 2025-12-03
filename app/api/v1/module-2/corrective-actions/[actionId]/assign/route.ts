/**
 * Module 2: Corrective Action Assign Endpoint
 * POST /api/v1/module-2/corrective-actions/{id}/assign - Assign owner to corrective action
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
    const { assigned_to } = body;

    if (!assigned_to) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required field',
        400,
        { required: ['assigned_to'] },
        { request_id: requestId }
      );
    }

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

    // Verify assigned user belongs to same company
    const { data: assignedUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, company_id')
      .eq('id', assigned_to)
      .single();

    if (userError || !assignedUser || assignedUser.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'User not found or does not belong to your company', 404, {}, { request_id: requestId });
    }

    // Update action
    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .update({ assigned_to })
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to assign corrective action', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(action, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/corrective-actions/{id}/assign:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

