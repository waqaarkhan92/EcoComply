/**
 * Module 3: Maintenance Record Detail Endpoints
 * GET /api/v1/module-3/maintenance-records/[recordId] - Get maintenance record details
 * PUT /api/v1/module-3/maintenance-records/[recordId] - Update maintenance record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const requestId = getRequestId(request);
  const { recordId } = params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Fetch maintenance record
    const { data: record, error } = await supabaseAdmin
      .from('maintenance_records')
      .select(`
        id,
        generator_id,
        company_id,
        maintenance_date,
        maintenance_type,
        description,
        run_hours_at_service,
        service_provider,
        service_reference,
        next_service_due,
        evidence_id,
        notes,
        entered_by,
        created_at,
        updated_at,
        generators!inner(
          id,
          generator_identifier,
          generator_type
        )
      `)
      .eq('id', recordId)
      .single();

    if (error || !record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Maintenance record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Check access via RLS (company_id must match)
    if (record.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this maintenance record',
        403,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(
      record,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/maintenance-records/[recordId]:', error);
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
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const requestId = getRequestId(request);
  const { recordId } = params;

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Verify record exists and user has access
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('maintenance_records')
      .select('id, company_id, generator_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Maintenance record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existingRecord.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this maintenance record',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: any = {};

    // Allow updating these fields
    if (body.maintenance_date !== undefined) updateData.maintenance_date = body.maintenance_date;
    if (body.maintenance_type !== undefined) updateData.maintenance_type = body.maintenance_type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.run_hours_at_service !== undefined) updateData.run_hours_at_service = body.run_hours_at_service ? Number(body.run_hours_at_service) : null;
    if (body.service_provider !== undefined) updateData.service_provider = body.service_provider;
    if (body.service_reference !== undefined) updateData.service_reference = body.service_reference;
    if (body.next_service_due !== undefined) updateData.next_service_due = body.next_service_due || null;
    if (body.evidence_id !== undefined) updateData.evidence_id = body.evidence_id || null;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'No valid fields to update',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Update maintenance record
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('maintenance_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update maintenance record',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    // Update generator's next_service_due if next_service_due was updated
    if (updateData.next_service_due !== undefined) {
      await supabaseAdmin
        .from('generators')
        .update({ next_service_due: updateData.next_service_due })
        .eq('id', existingRecord.generator_id);
    }

    const response = successResponse(
      updatedRecord,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/maintenance-records/[recordId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

