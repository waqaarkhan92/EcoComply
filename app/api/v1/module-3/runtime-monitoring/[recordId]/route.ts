/**
 * Module 3: Runtime Monitoring Detail Endpoints
 * GET /api/v1/module-3/runtime-monitoring/{id} - Get runtime monitoring record
 * PUT /api/v1/module-3/runtime-monitoring/{id} - Update runtime monitoring record
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

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const { data: record, error } = await supabaseAdmin
      .from('runtime_monitoring')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error || !record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Runtime monitoring record not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/runtime-monitoring/{id}:', error);
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

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      run_date,
      run_duration,
      runtime_hours,
      reason_code,
      evidence_linkage_id,
      entry_reason_notes,
      notes,
      validation_status,
    } = body;

    // Get existing record to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('runtime_monitoring')
      .select('id, company_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Runtime monitoring record not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this record', 403, {}, { request_id: requestId });
    }

    // Validate reason_code if provided
    if (reason_code) {
      const validReasonCodes = ['Test', 'Emergency', 'Maintenance', 'Normal'];
      if (!validReasonCodes.includes(reason_code)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid reason_code',
          400,
          { reason_code: `Must be one of: ${validReasonCodes.join(', ')}` },
          { request_id: requestId }
        );
      }
    }

    const updateData: any = {};

    if (run_date !== undefined) updateData.run_date = run_date;
    if (run_duration !== undefined) {
      updateData.run_duration = run_duration;
      // Update runtime_hours to match run_duration for manual entries
      if (!runtime_hours) {
        updateData.runtime_hours = run_duration;
      }
    }
    if (runtime_hours !== undefined) updateData.runtime_hours = runtime_hours;
    if (reason_code !== undefined) updateData.reason_code = reason_code;
    if (evidence_linkage_id !== undefined) updateData.evidence_linkage_id = evidence_linkage_id;
    if (entry_reason_notes !== undefined) updateData.entry_reason_notes = entry_reason_notes;
    if (notes !== undefined) updateData.notes = notes;
    if (validation_status !== undefined) {
      updateData.validation_status = validation_status;
      if (validation_status === 'APPROVED') {
        updateData.validated_by = user.id;
      }
    }

    const { data: record, error } = await supabaseAdmin
      .from('runtime_monitoring')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update runtime monitoring record', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(record, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/runtime-monitoring/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

