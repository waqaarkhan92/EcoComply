/**
 * Permit Workflow Detail Endpoints
 * GET /api/v1/module-1/permit-workflows/{id} - Get permit workflow
 * PUT /api/v1/module-1/permit-workflows/{id} - Update permit workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const requestId = getRequestId(request);
  const { workflowId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const { data: workflow, error } = await supabaseAdmin
      .from('permit_workflows')
      .select(`
        *,
        documents(id, document_name, document_type),
        sites(id, site_name)
      `)
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(workflow, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-workflows/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const requestId = getRequestId(request);
  const { workflowId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const body = await request.json();
    const {
      status,
      submitted_date,
      regulator_response_deadline,
      regulator_response_date,
      regulator_comments,
      approval_date,
      evidence_ids,
      workflow_notes,
    } = body;

    // Get existing workflow to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('permit_workflows')
      .select('id, company_id')
      .eq('id', workflowId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this workflow', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (submitted_date !== undefined) updateData.submitted_date = submitted_date;
    if (regulator_response_deadline !== undefined) updateData.regulator_response_deadline = regulator_response_deadline;
    if (regulator_response_date !== undefined) updateData.regulator_response_date = regulator_response_date;
    if (regulator_comments !== undefined) updateData.regulator_comments = regulator_comments;
    if (approval_date !== undefined) updateData.approval_date = approval_date;
    if (evidence_ids !== undefined) updateData.evidence_ids = evidence_ids;
    if (workflow_notes !== undefined) updateData.workflow_notes = workflow_notes;

    if (status === 'APPROVED' && !approval_date) {
      updateData.approval_date = new Date().toISOString().split('T')[0];
      updateData.approved_by = user.id;
    }

    const { data: workflow, error } = await supabaseAdmin
      .from('permit_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update permit workflow', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(workflow, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/permit-workflows/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

