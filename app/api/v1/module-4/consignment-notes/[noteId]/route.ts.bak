/**
 * Module 4: Consignment Note Endpoints
 * GET /api/v1/module-4/consignment-notes/{id} - Get consignment note details
 * PUT /api/v1/module-4/consignment-notes/{id} - Update consignment note
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ noteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
    const { noteId } = params;

    // Get consignment note - RLS will enforce access control
    const { data: consignmentNote, error } = await supabaseAdmin
      .from('consignment_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error || !consignmentNote) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(consignmentNote, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/consignment-notes/[id]:', error);
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
  request: NextRequest, props: { params: Promise<{ noteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
    const { noteId } = params;
    const body = await request.json();

    // Get existing consignment note to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, company_id')
      .eq('id', noteId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consignment note',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Update consignment note
    const updateData: any = {};

    if (body.consignment_date !== undefined) updateData.consignment_date = body.consignment_date;
    if (body.carrier_id !== undefined) updateData.carrier_id = body.carrier_id;
    if (body.carrier_name !== undefined) updateData.carrier_name = body.carrier_name;
    if (body.carrier_licence_number !== undefined) updateData.carrier_licence_number = body.carrier_licence_number;
    if (body.destination_site !== undefined) updateData.destination_site = body.destination_site;
    if (body.waste_description !== undefined) updateData.waste_description = body.waste_description;
    if (body.ewc_code !== undefined) updateData.ewc_code = body.ewc_code;
    if (body.quantity_m3 !== undefined) updateData.quantity_m3 = body.quantity_m3;
    if (body.quantity_kg !== undefined) updateData.quantity_kg = body.quantity_kg;
    if (body.document_id !== undefined) updateData.document_id = body.document_id;
    if (body.evidence_id !== undefined) updateData.evidence_id = body.evidence_id;

    const { data: consignmentNote, error: updateError } = await supabaseAdmin
      .from('consignment_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update consignment note',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(consignmentNote, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-4/consignment-notes/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

