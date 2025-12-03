/**
 * Module 2: Sampling Logistics Submit to Lab Endpoint
 * POST /api/v1/module-2/sampling-logistics/{id}/submit-lab - Submit sample to lab
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
    const { lab_reference, courier_reference } = body;

    // Get existing record to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('sampling_logistics')
      .select('id, company_id, stage')
      .eq('id', recordId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Sampling logistics record not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this record', 403, {}, { request_id: requestId });
    }

    // Update to IN_TRANSIT or LAB_RECEIVED stage
    const updateData: any = {
      stage: 'IN_TRANSIT',
      in_transit_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (courier_reference) {
      updateData.courier_reference = courier_reference;
      updateData.courier_booked_at = new Date().toISOString();
    }

    if (lab_reference) {
      updateData.lab_reference = lab_reference;
      updateData.lab_received_at = new Date().toISOString();
      updateData.stage = 'LAB_RECEIVED';
    }

    const { data: record, error } = await supabaseAdmin
      .from('sampling_logistics')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to submit to lab', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/sampling-logistics/{id}/submit-lab:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

