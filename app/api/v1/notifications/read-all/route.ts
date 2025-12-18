/**
 * Mark All Notifications as Read
 * POST/PUT /api/v1/notifications/read-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { notificationService } from '@/lib/services/notification-service';

async function handleMarkAllAsRead(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Mark all notifications as read using service
    const markedCount = await notificationService.markAllAsRead(user.id);

    const response = successResponse(
      {
        message: 'All notifications marked as read',
        marked_count: markedCount,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error);
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
export async function POST(request: NextRequest) {
  return handleMarkAllAsRead(request);
}

export async function PUT(request: NextRequest) {
  return handleMarkAllAsRead(request);
}

