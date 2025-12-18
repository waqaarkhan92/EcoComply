/**
 * Notifications Endpoints
 * GET /api/v1/notifications - List notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { notificationService } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');
    const unreadOnlyParam = searchParams.get('unread_only');

    // Validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid limit parameter',
          422,
          { limit: 'Limit must be a positive integer between 1 and 100' },
          { request_id: requestId }
        );
      }
      limit = parsedLimit;
    }

    const unreadOnly = unreadOnlyParam === 'true';

    // Get notifications using the service
    const { notifications, hasMore, nextCursor } = await notificationService.getNotifications(
      user.id,
      {
        limit,
        cursor: cursor || undefined,
        unreadOnly,
      }
    );

    const response = paginatedResponse(
      notifications,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

