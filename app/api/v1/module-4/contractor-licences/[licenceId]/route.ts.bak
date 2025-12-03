/**
 * Module 4: Contractor Licence Endpoints
 * GET /api/v1/module-4/contractor-licences/{id} - Get licence details
 * PUT /api/v1/module-4/contractor-licences/{id} - Update licence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ licenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
    const { licenceId } = params;

    const { data: licence, error } = await supabaseAdmin
      .from('contractor_licences')
      .select('*')
      .eq('id', licenceId)
      .single();

    if (error || !licence) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Contractor licence not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (licence.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this contractor licence',
        403,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(licence, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/contractor-licences/[id]:', error);
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
  request: NextRequest, props: { params: Promise<{ licenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
    const { licenceId } = params;
    const body = await request.json();

    // Get existing licence to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('contractor_licences')
      .select('id, company_id')
      .eq('id', licenceId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Contractor licence not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this contractor licence',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Update licence
    const updateData: any = {
      updated_by: user.id,
    };

    if (body.contractor_name !== undefined) updateData.contractor_name = body.contractor_name;
    if (body.licence_number !== undefined) updateData.licence_number = body.licence_number;
    if (body.licence_type !== undefined) updateData.licence_type = body.licence_type;
    if (body.waste_types_allowed !== undefined) updateData.waste_types_allowed = body.waste_types_allowed;
    if (body.issued_date !== undefined) updateData.issued_date = body.issued_date;
    if (body.expiry_date !== undefined) updateData.expiry_date = body.expiry_date;
    if (body.is_valid !== undefined) updateData.is_valid = body.is_valid;
    if (body.verification_notes !== undefined) updateData.verification_notes = body.verification_notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const { data: licence, error: updateError } = await supabaseAdmin
      .from('contractor_licences')
      .update(updateData)
      .eq('id', licenceId)
      .select()
      .single();

    if (updateError || !licence) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update contractor licence',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(licence, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-4/contractor-licences/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

