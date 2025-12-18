/**
 * Notification Read Endpoint
 * POST/PUT /api/v1/notifications/{notificationId}/read - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { notificationService } from '@/lib/services/notification-service';

async function handleMarkAsRead(
  request: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
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
      .select('id, user_id, read_at')
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

    // Check if already read
    if (notification.read_at) {
      return successResponse(
        { message: 'Notification already marked as read', notification_id: notificationId },
        200,
        { request_id: requestId }
      );
    }

    // Mark as read using service
    await notificationService.markAsRead(notificationId);

    const response = successResponse(
      { message: 'Notification marked as read', notification_id: notificationId },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

// Support both POST and PUT methods
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
) {
  return handleMarkAsRead(request, props);
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
) {
  return handleMarkAsRead(request, props);
}
