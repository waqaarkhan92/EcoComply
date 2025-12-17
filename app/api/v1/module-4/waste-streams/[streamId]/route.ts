/**
 * Module 4: Waste Stream Endpoints
 * GET /api/v1/module-4/waste-streams/{id} - Get waste stream details
 * PUT /api/v1/module-4/waste-streams/{id} - Update waste stream
 * DELETE /api/v1/module-4/waste-streams/{id} - Delete waste stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 4 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) {
      return moduleCheck;
    }

    const { streamId } = await params;

    // Get waste stream - RLS will enforce access control
    const { data: wasteStream, error } = await supabaseAdmin
      .from('waste_streams')
      .select('*')
      .eq('id', streamId)
      .is('deleted_at', null)
      .single();

    if (error || !wasteStream) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Waste stream not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(wasteStream, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/waste-streams/[id]:', error);
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
  request: NextRequest, props: { params: Promise<{ streamId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 4 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) {
      return moduleCheck;
    }

    const { streamId } = await props.params;

    // Parse request body
    const body = await request.json();

    // Get existing waste stream to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('waste_streams')
      .select('id, company_id')
      .eq('id', streamId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Waste stream not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this waste stream',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Update waste stream
    const updateData: any = {
      updated_by: user.id,
    };

    if (body.ewc_code !== undefined) updateData.ewc_code = body.ewc_code;
    if (body.waste_description !== undefined) updateData.waste_description = body.waste_description;
    if (body.waste_category !== undefined) updateData.waste_category = body.waste_category;
    if (body.hazard_code !== undefined) updateData.hazard_code = body.hazard_code;
    if (body.permit_reference !== undefined) updateData.permit_reference = body.permit_reference;
    if (body.volume_limit_m3 !== undefined) updateData.volume_limit_m3 = body.volume_limit_m3;
    if (body.storage_duration_limit_days !== undefined) updateData.storage_duration_limit_days = body.storage_duration_limit_days;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const { data: wasteStream, error: updateError } = await supabaseAdmin
      .from('waste_streams')
      .update(updateData)
      .eq('id', streamId)
      .select()
      .single();

    if (updateError || !wasteStream) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update waste stream',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(wasteStream, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-4/waste-streams/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ streamId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 4 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) {
      return moduleCheck;
    }

    const { streamId } = await props.params;

    // Get existing waste stream to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('waste_streams')
      .select('id, company_id')
      .eq('id', streamId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Waste stream not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this waste stream',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Soft delete waste stream
    const { error: deleteError } = await supabaseAdmin
      .from('waste_streams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', streamId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete waste stream',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-4/waste-streams/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

