/**
 * Module 1: Compliance Decision Detail Endpoints
 * GET /api/v1/module-1/compliance-decisions/{id} - Get compliance decision
 * PUT /api/v1/module-1/compliance-decisions/{id} - Update compliance decision
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  const requestId = getRequestId(request);
  const { decisionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const { data: decision, error } = await supabaseAdmin
      .from('compliance_decisions')
      .select(`
        id,
        company_id,
        site_id,
        obligation_id,
        decision_type,
        decision_date,
        decision_maker,
        rationale,
        evidence_references,
        impact_assessment,
        review_date,
        reviewed_by,
        review_notes,
        is_active,
        metadata,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('id', decisionId)
      .single();

    if (error || !decision) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Compliance decision not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(decision, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/compliance-decisions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  const requestId = getRequestId(request);
  const { decisionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      decision_type,
      decision_date,
      rationale,
      evidence_references,
      impact_assessment,
      review_date,
      review_notes,
      is_active,
      metadata,
    } = body;

    // Get existing decision to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('compliance_decisions')
      .select('id, company_id')
      .eq('id', decisionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Compliance decision not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this compliance decision', 403, {}, { request_id: requestId });
    }

    // Validate decision_type if provided
    if (decision_type) {
      const validDecisionTypes = ['COMPLIANCE', 'NON_COMPLIANCE', 'PARTIAL_COMPLIANCE', 'NOT_APPLICABLE', 'DEFERRED'];
      if (!validDecisionTypes.includes(decision_type)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid decision_type',
          400,
          { decision_type: `Must be one of: ${validDecisionTypes.join(', ')}` },
          { request_id: requestId }
        );
      }
    }

    const updateData: any = {
      updated_by: user.id,
    };

    if (decision_type !== undefined) updateData.decision_type = decision_type;
    if (decision_date !== undefined) updateData.decision_date = decision_date;
    if (rationale !== undefined) updateData.rationale = rationale;
    if (evidence_references !== undefined) updateData.evidence_references = evidence_references;
    if (impact_assessment !== undefined) updateData.impact_assessment = impact_assessment;
    if (review_date !== undefined) updateData.review_date = review_date;
    if (review_notes !== undefined) updateData.review_notes = review_notes;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (metadata !== undefined) updateData.metadata = metadata;

    // If review_notes is provided, also set reviewed_by
    if (review_notes !== undefined && review_notes !== null) {
      updateData.reviewed_by = user.id;
    }

    const { data: decision, error } = await supabaseAdmin
      .from('compliance_decisions')
      .update(updateData)
      .eq('id', decisionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update compliance decision', 500, { error: error.message }, { request_id: requestId });
    }

    if (!decision) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Compliance decision not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(decision, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/compliance-decisions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

