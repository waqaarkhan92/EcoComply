/**
 * Module 2: Sampling Logistics Detail Endpoints
 * GET /api/v1/module-2/sampling-logistics/{id} - Get sampling logistics record
 * PUT /api/v1/module-2/sampling-logistics/{id} - Update sampling logistics record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const requestId = getRequestId(request);
  const { recordId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const { data: record, error } = await supabaseAdmin
      .from('sampling_logistics')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error || !record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Sampling logistics record not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/sampling-logistics/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
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
    const {
      scheduled_date,
      sample_id,
      stage,
      reminder_sent_at,
      collection_scheduled_at,
      collected_at,
      collected_by,
      courier_booked_at,
      courier_reference,
      in_transit_at,
      lab_received_at,
      lab_reference,
      lab_processing_at,
      certificate_received_at,
      certificate_document_id,
      evidence_linked_at,
      evidence_id,
      lab_result_id,
      notes,
    } = body;

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

    // Validate stage if provided
    if (stage) {
      const validStages = ['SCHEDULED', 'REMINDER_SENT', 'COLLECTION_SCHEDULED', 'COLLECTED', 'COURIER_BOOKED', 'IN_TRANSIT', 'LAB_RECEIVED', 'LAB_PROCESSING', 'CERTIFICATE_RECEIVED', 'EVIDENCE_LINKED', 'COMPLETED'];
      if (!validStages.includes(stage)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid stage',
          400,
          { stage: `Must be one of: ${validStages.join(', ')}` },
          { request_id: requestId }
        );
      }
    }

    const updateData: any = {
      updated_by: user.id,
    };

    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (sample_id !== undefined) updateData.sample_id = sample_id;
    if (stage !== undefined) updateData.stage = stage;
    if (reminder_sent_at !== undefined) updateData.reminder_sent_at = reminder_sent_at;
    if (collection_scheduled_at !== undefined) updateData.collection_scheduled_at = collection_scheduled_at;
    if (collected_at !== undefined) updateData.collected_at = collected_at;
    if (collected_by !== undefined) updateData.collected_by = collected_by;
    if (courier_booked_at !== undefined) updateData.courier_booked_at = courier_booked_at;
    if (courier_reference !== undefined) updateData.courier_reference = courier_reference;
    if (in_transit_at !== undefined) updateData.in_transit_at = in_transit_at;
    if (lab_received_at !== undefined) updateData.lab_received_at = lab_received_at;
    if (lab_reference !== undefined) updateData.lab_reference = lab_reference;
    if (lab_processing_at !== undefined) updateData.lab_processing_at = lab_processing_at;
    if (certificate_received_at !== undefined) updateData.certificate_received_at = certificate_received_at;
    if (certificate_document_id !== undefined) updateData.certificate_document_id = certificate_document_id;
    if (evidence_linked_at !== undefined) updateData.evidence_linked_at = evidence_linked_at;
    if (evidence_id !== undefined) updateData.evidence_id = evidence_id;
    if (lab_result_id !== undefined) updateData.lab_result_id = lab_result_id;
    if (notes !== undefined) updateData.notes = notes;

    const { data: record, error } = await supabaseAdmin
      .from('sampling_logistics')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update sampling logistics record', 500, { error: error.message }, { request_id: requestId });
    }

    if (!record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Sampling logistics record not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-2/sampling-logistics/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

