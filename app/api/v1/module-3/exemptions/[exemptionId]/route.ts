/**
 * Module 3: Exemption Detail Endpoints
 * GET /api/v1/module-3/exemptions/{id} - Get exemption
 * PUT /api/v1/module-3/exemptions/{id} - Update exemption
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exemptionId: string }> }
) {
  const requestId = getRequestId(request);
  const { exemptionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const { data: exemption, error } = await supabaseAdmin
      .from('exemptions')
      .select('*')
      .eq('id', exemptionId)
      .single();

    if (error || !exemption) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exemption not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(exemption, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/exemptions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ exemptionId: string }> }
) {
  const requestId = getRequestId(request);
  const { exemptionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      exemption_type,
      start_date,
      end_date,
      duration_hours,
      exemption_reason,
      evidence_ids,
      compliance_verified,
      verification_notes,
    } = body;

    // Get existing exemption to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('exemptions')
      .select('id, company_id')
      .eq('id', exemptionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exemption not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this exemption', 403, {}, { request_id: requestId });
    }

    // Validate exemption_type if provided
    if (exemption_type) {
      const validExemptionTypes = ['TESTING', 'EMERGENCY_OPERATION', 'MAINTENANCE', 'OTHER'];
      if (!validExemptionTypes.includes(exemption_type)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid exemption_type',
          400,
          { exemption_type: `Must be one of: ${validExemptionTypes.join(', ')}` },
          { request_id: requestId }
        );
      }
    }

    const updateData: any = {};

    if (exemption_type !== undefined) updateData.exemption_type = exemption_type;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours;
    if (exemption_reason !== undefined) updateData.exemption_reason = exemption_reason;
    if (evidence_ids !== undefined) updateData.evidence_ids = evidence_ids;
    if (compliance_verified !== undefined) {
      updateData.compliance_verified = compliance_verified;
      if (compliance_verified) {
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
      }
    }
    if (verification_notes !== undefined) updateData.verification_notes = verification_notes;

    const { data: exemption, error } = await supabaseAdmin
      .from('exemptions')
      .update(updateData)
      .eq('id', exemptionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update exemption', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(exemption, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/exemptions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

