/**
 * Mark All Notifications as Read
 * PUT /api/v1/notifications/read-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Update all unread notifications for this user
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .is('read_at', null)
      .select('id');

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to mark notifications as read',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        marked_count: updated?.length || 0,
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

