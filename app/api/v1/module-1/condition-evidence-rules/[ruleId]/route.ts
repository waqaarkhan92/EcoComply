/**
 * Condition Evidence Rule Detail Endpoints
 * GET /api/v1/module-1/condition-evidence-rules/{id} - Get condition evidence rule
 * PUT /api/v1/module-1/condition-evidence-rules/{id} - Update condition evidence rule
 * DELETE /api/v1/module-1/condition-evidence-rules/{id} - Delete condition evidence rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const { data: rule, error } = await supabaseAdmin
      .from('condition_evidence_rules')
      .select(`
        *,
        documents(id, document_name),
        obligations(id, summary)
      `)
      .eq('id', ruleId)
      .single();

    if (error || !rule) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition evidence rule not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/condition-evidence-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const body = await request.json();
    const {
      allowed_evidence_types,
      required_evidence_types,
      evidence_requirements,
      is_active,
    } = body;

    // Get existing rule to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('condition_evidence_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition evidence rule not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this rule', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (allowed_evidence_types !== undefined) updateData.allowed_evidence_types = allowed_evidence_types;
    if (required_evidence_types !== undefined) updateData.required_evidence_types = required_evidence_types;
    if (evidence_requirements !== undefined) updateData.evidence_requirements = evidence_requirements;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: rule, error } = await supabaseAdmin
      .from('condition_evidence_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update condition evidence rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/condition-evidence-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);
  const { ruleId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    // Get existing rule to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('condition_evidence_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition evidence rule not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this rule', 403, {}, { request_id: requestId });
    }

    const { error } = await supabaseAdmin
      .from('condition_evidence_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete condition evidence rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse({ id: ruleId, deleted: true }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-1/condition-evidence-rules/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

