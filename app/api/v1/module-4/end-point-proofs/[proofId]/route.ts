/**
 * Module 4: End-Point Proof Endpoints
 * GET /api/v1/module-4/end-point-proofs/{id} - Get end-point proof details
 * PUT /api/v1/module-4/end-point-proofs/{id} - Update end-point proof
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ proofId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { proofId } = params;

  const { data: proof, error } = await supabaseAdmin
      .from('end_point_proofs')
      .select('*')
      .eq('id', proofId)
      .single();

    if (error || !proof) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'End-point proof not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (proof.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this end-point proof',
        403,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(proof, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/end-point-proofs/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest, props: { params: Promise<{ proofId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { proofId } = params;
    const body = await request.json();

    // Get existing proof to verify access
  const { data: existing, error: fetchError } = await supabaseAdmin
      .from('end_point_proofs')
      .select('id, company_id')
      .eq('id', proofId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'End-point proof not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this end-point proof',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Update proof
    const updateData: any = {};

    if (body.end_point_type !== undefined) updateData.end_point_type = body.end_point_type;
    if (body.end_point_facility !== undefined) updateData.end_point_facility = body.end_point_facility;
    if (body.completion_date !== undefined) updateData.completion_date = body.completion_date;
    if (body.certificate_reference !== undefined) updateData.certificate_reference = body.certificate_reference;
    if (body.certificate_document_id !== undefined) updateData.certificate_document_id = body.certificate_document_id;
    if (body.evidence_id !== undefined) updateData.evidence_id = body.evidence_id;
    if (body.is_verified !== undefined) {
      updateData.is_verified = body.is_verified;
      if (body.is_verified) {
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
      }
    }
    if (body.verification_notes !== undefined) updateData.verification_notes = body.verification_notes;

  const { data: proof, error: updateError } = await supabaseAdmin
      .from('end_point_proofs')
      .update(updateData)
      .eq('id', proofId)
      .select()
      .single();

    if (updateError || !proof) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update end-point proof',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(proof, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-4/end-point-proofs/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

