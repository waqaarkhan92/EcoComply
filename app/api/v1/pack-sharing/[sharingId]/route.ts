/**
 * Pack Sharing Detail Endpoints
 * GET /api/v1/pack-sharing/{id} - Get pack sharing record
 * PUT /api/v1/pack-sharing/{id} - Update pack sharing record
 * DELETE /api/v1/pack-sharing/{id} - Deactivate pack sharing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sharingId: string }> }
) {
  const requestId = getRequestId(request);
  const { sharingId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { data: sharing, error } = await supabaseAdmin
      .from('pack_sharing')
      .select(`
        *,
        audit_packs!inner(
          id,
          pack_name,
          pack_type,
          site_id
        )
      `)
      .eq('id', sharingId)
      .single();

    if (error || !sharing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Pack sharing record not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(sharing, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/pack-sharing/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sharingId: string }> }
) {
  const requestId = getRequestId(request);
  const { sharingId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      expires_at,
      is_active,
      metadata,
    } = body;

    // Get existing sharing to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('pack_sharing')
      .select('id, company_id')
      .eq('id', sharingId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Pack sharing record not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this sharing record', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at).toISOString() : undefined;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: sharing, error } = await supabaseAdmin
      .from('pack_sharing')
      .update(updateData)
      .eq('id', sharingId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update pack sharing record', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(sharing, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/pack-sharing/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sharingId: string }> }
) {
  const requestId = getRequestId(request);
  const { sharingId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Get existing sharing to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('pack_sharing')
      .select('id, company_id')
      .eq('id', sharingId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Pack sharing record not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this sharing record', 403, {}, { request_id: requestId });
    }

    // Deactivate instead of delete
    const { data: sharing, error } = await supabaseAdmin
      .from('pack_sharing')
      .update({ is_active: false })
      .eq('id', sharingId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to deactivate pack sharing', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(sharing, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/pack-sharing/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

