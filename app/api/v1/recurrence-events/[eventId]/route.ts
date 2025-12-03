/**
 * Recurrence Event Detail Endpoints
 * GET /api/v1/recurrence-events/{id} - Get recurrence event
 * PUT /api/v1/recurrence-events/{id} - Update recurrence event
 * DELETE /api/v1/recurrence-events/{id} - Delete recurrence event
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const requestId = getRequestId(request);
  const { eventId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { data: event, error } = await supabaseAdmin
      .from('recurrence_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence event not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(event, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurrence-events/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const requestId = getRequestId(request);
  const { eventId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      event_type,
      event_name,
      event_date,
      event_metadata,
      is_active,
    } = body;

    // Get existing event to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_events')
      .select('id, company_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence event not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this event', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (event_type !== undefined) updateData.event_type = event_type;
    if (event_name !== undefined) updateData.event_name = event_name;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (event_metadata !== undefined) updateData.event_metadata = event_metadata;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: event, error } = await supabaseAdmin
      .from('recurrence_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update recurrence event', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(event, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/recurrence-events/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const requestId = getRequestId(request);
  const { eventId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Get existing event to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurrence_events')
      .select('id, company_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurrence event not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this event', 403, {}, { request_id: requestId });
    }

    const { error } = await supabaseAdmin
      .from('recurrence_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete recurrence event', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse({ message: 'Recurrence event deleted successfully' }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/recurrence-events/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

