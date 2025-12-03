/**
 * Escalation Workflow Detail API Endpoints
 * GET /api/v1/escalation-workflows/{workflowId} - Get escalation workflow
 * PATCH /api/v1/escalation-workflows/{workflowId} - Update escalation workflow
 * DELETE /api/v1/escalation-workflows/{workflowId} - Delete escalation workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ workflowId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { workflowId } = params;

    const { data: workflow, error } = await supabaseAdmin
      .from('escalation_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('company_id', user.company_id)
      .single();

    if (error || !workflow) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Escalation workflow not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch escalation workflow',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(workflow, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get escalation workflow error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PATCH(
  request: NextRequest, props: { params: Promise<{ workflowId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { workflowId } = params;
    const body = await request.json();

    // Verify workflow exists and belongs to company
    const { data: existingWorkflow, error: getError } = await supabaseAdmin
      .from('escalation_workflows')
      .select('id, company_id')
      .eq('id', workflowId)
      .single();

    if (getError || !existingWorkflow) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Escalation workflow not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (existingWorkflow.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Validate recipients if provided
    const recipients = [
      body.level_1_recipients,
      body.level_2_recipients,
      body.level_3_recipients,
      body.level_4_recipients,
    ].filter((r) => r !== undefined);

    for (const recipientList of recipients) {
      if (Array.isArray(recipientList) && recipientList.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id')
          .in('id', recipientList)
          .eq('company_id', user.company_id)
          .eq('is_active', true)
          .is('deleted_at', null);

        if (usersError || !users || users.length !== recipientList.length) {
          return errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid recipient user IDs. All recipients must be active users in your company.',
            400,
            null,
            { request_id: requestId }
          );
        }
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.obligation_category !== undefined) {
      updateData.obligation_category = body.obligation_category || null;
    }
    if (body.level_1_days !== undefined) updateData.level_1_days = body.level_1_days;
    if (body.level_2_days !== undefined) updateData.level_2_days = body.level_2_days;
    if (body.level_3_days !== undefined) updateData.level_3_days = body.level_3_days;
    if (body.level_4_days !== undefined) updateData.level_4_days = body.level_4_days;
    if (body.level_1_recipients !== undefined) {
      updateData.level_1_recipients = body.level_1_recipients || [];
    }
    if (body.level_2_recipients !== undefined) {
      updateData.level_2_recipients = body.level_2_recipients || [];
    }
    if (body.level_3_recipients !== undefined) {
      updateData.level_3_recipients = body.level_3_recipients || [];
    }
    if (body.level_4_recipients !== undefined) {
      updateData.level_4_recipients = body.level_4_recipients || [];
    }
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Update workflow
    const { data: updatedWorkflow, error: updateError } = await supabaseAdmin
      .from('escalation_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update escalation workflow',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedWorkflow, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update escalation workflow error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ workflowId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner role only
    const authResult = await requireRole(request, ['OWNER']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { workflowId } = params;

    // Verify workflow exists and belongs to company
    const { data: existingWorkflow, error: getError } = await supabaseAdmin
      .from('escalation_workflows')
      .select('id, company_id')
      .eq('id', workflowId)
      .single();

    if (getError || !existingWorkflow) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Escalation workflow not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (existingWorkflow.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Delete workflow
    const { error: deleteError } = await supabaseAdmin
      .from('escalation_workflows')
      .delete()
      .eq('id', workflowId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete escalation workflow',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse({ id: workflowId, deleted: true }, 200, {
      request_id: requestId,
    });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete escalation workflow error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

