/**
 * Permit Variation Endpoints
 * GET /api/v1/module-1/permit-workflows/{id}/variation - Get variation details
 * POST /api/v1/module-1/permit-workflows/{id}/variation - Create variation details
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

    // Verify workflow exists and is VARIATION type
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('permit_workflows')
      .select('id, workflow_type, company_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    if (workflow.workflow_type !== 'VARIATION') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Workflow is not a VARIATION type', 400, {}, { request_id: requestId });
    }

    const { data: variation, error } = await supabaseAdmin
      .from('permit_variations')
      .select('*')
      .eq('workflow_id', workflowId)
      .single();

    if (error || !variation) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Variation details not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(variation, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-workflows/{id}/variation:', error);
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

    // Verify workflow exists and is VARIATION type
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('permit_workflows')
      .select('id, workflow_type, document_id, company_id, site_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit workflow not found', 404, {}, { request_id: requestId });
    }

    if (workflow.workflow_type !== 'VARIATION') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Workflow is not a VARIATION type', 400, {}, { request_id: requestId });
    }

    // Check if variation already exists
    const { data: existing } = await supabaseAdmin
      .from('permit_variations')
      .select('id')
      .eq('workflow_id', workflowId)
      .single();

    if (existing) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Variation details already exist for this workflow', 409, {}, { request_id: requestId });
    }

    const body = await request.json();
    const {
      variation_type,
      variation_description,
      requested_changes,
      impact_assessment,
      obligations_affected,
    } = body;

    // Validate required fields
    if (!variation_type || !variation_description) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['variation_type', 'variation_description'] },
        { request_id: requestId }
      );
    }

    // Create variation
    const { data: variation, error } = await supabaseAdmin
      .from('permit_variations')
      .insert({
        document_id: workflow.document_id,
        workflow_id: workflowId,
        company_id: workflow.company_id,
        site_id: workflow.site_id,
        variation_type,
        variation_description,
        requested_changes: requested_changes || {},
        impact_assessment: impact_assessment || {},
        obligations_affected: obligations_affected || [],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create variation', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(variation, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/permit-workflows/{id}/variation:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

