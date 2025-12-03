/**
 * Module 2: Sampling Logistics Link Certificate Endpoint
 * POST /api/v1/module-2/sampling-logistics/{id}/link-certificate - Link lab certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const requestId = getRequestId(request);
  const { recordId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const { certificate_document_id, lab_result_id, evidence_id } = body;

    if (!certificate_document_id && !lab_result_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['certificate_document_id or lab_result_id'] },
        { request_id: requestId }
      );
    }

    // Get existing record to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('sampling_logistics')
      .select('id, company_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Sampling logistics record not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this record', 403, {}, { request_id: requestId });
    }

    // Verify document if provided
    if (certificate_document_id) {
      const { data: document, error: docError } = await supabaseAdmin
        .from('documents')
        .select('id, company_id')
        .eq('id', certificate_document_id)
        .single();

      if (docError || !document) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Document not found', 404, {}, { request_id: requestId });
      }

      if (document.company_id !== user.company_id) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Document does not belong to your company', 403, {}, { request_id: requestId });
      }
    }

    // Update record
    const updateData: any = {
      certificate_received_at: new Date().toISOString(),
      evidence_linked_at: new Date().toISOString(),
      stage: 'CERTIFICATE_RECEIVED',
      updated_by: user.id,
    };

    if (certificate_document_id) updateData.certificate_document_id = certificate_document_id;
    if (lab_result_id) updateData.lab_result_id = lab_result_id;
    if (evidence_id) updateData.evidence_id = evidence_id;

    // If both certificate and evidence are linked, mark as completed
    if (certificate_document_id && evidence_id) {
      updateData.stage = 'COMPLETED';
    }

    const { data: record, error } = await supabaseAdmin
      .from('sampling_logistics')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to link certificate', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/sampling-logistics/{id}/link-certificate:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

