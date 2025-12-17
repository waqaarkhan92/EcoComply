/**
 * Notification Unread Endpoint
 * PUT /api/v1/notifications/{notificationId}/unread - Mark notification as unread
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest, props: { params: Promise<{ notificationId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { notificationId } = params;

    // Check if notification exists and belongs to user
  const { data: notification, error: checkError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !notification) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Notification not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update notification
  const { data: updatedNotification, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({
        read_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select('id, read_at, updated_at')
      .single();

    if (updateError || !updatedNotification) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to mark notification as unread',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedNotification, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Mark notification as unread error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

