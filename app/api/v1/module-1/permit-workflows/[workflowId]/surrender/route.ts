/**
 * Permit Surrender Endpoints
 * GET /api/v1/module-1/permit-workflows/{id}/surrender - Get surrender details
 * POST /api/v1/module-1/permit-workflows/{id}/surrender - Create surrender details
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

    // Verify workflow exists and is SURRENDER type
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('permit_workflows')
      .select('id, workflow_type, company_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    if (workflow.workflow_type !== 'SURRENDER') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Workflow is not a SURRENDER type', 400, {}, { request_id: requestId });
    }

    const { data: surrender, error } = await supabaseAdmin
      .from('permit_surrenders')
      .select('*')
      .eq('workflow_id', workflowId)
      .single();

    if (error || !surrender) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Surrender details not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(surrender, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-workflows/{id}/surrender:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(
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

    // Verify workflow exists and is SURRENDER type
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('permit_workflows')
      .select('id, workflow_type, document_id, company_id, site_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    if (workflow.workflow_type !== 'SURRENDER') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Workflow is not a SURRENDER type', 400, {}, { request_id: requestId });
    }

    // Check if surrender already exists
    const { data: existing } = await supabaseAdmin
      .from('permit_surrenders')
      .select('id')
      .eq('workflow_id', workflowId)
      .single();

    if (existing) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Surrender details already exist for this workflow', 409, {}, { request_id: requestId });
    }

    const body = await request.json();
    const { surrender_reason, surrender_date, final_inspection_date, final_report_evidence_id, obligations_closed, site_decommission_complete } = body;

    // Validate required fields
    if (!surrender_reason) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['surrender_reason'] },
        { request_id: requestId }
      );
    }

    // Create surrender
    const { data: surrender, error } = await supabaseAdmin
      .from('permit_surrenders')
      .insert({
        document_id: workflow.document_id,
        workflow_id: workflowId,
        company_id: workflow.company_id,
        site_id: workflow.site_id,
        surrender_reason,
        surrender_date: surrender_date || null,
        final_inspection_date: final_inspection_date || null,
        final_report_evidence_id: final_report_evidence_id || null,
        obligations_closed: obligations_closed || [],
        site_decommission_complete: site_decommission_complete || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create surrender', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(surrender, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/permit-workflows/{id}/surrender:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

