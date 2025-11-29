/**
 * Get Unread Notification Count
 * GET /api/v1/notifications/unread-count
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get unread count for IN_APP notifications only (for bell icon)
    const { count: inAppCount, error: inAppError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'IN_APP')
      .is('read_at', null);

    if (inAppError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch unread count',
        500,
        { error: inAppError.message },
        { request_id: requestId }
      );
    }

    // Get unread counts by channel
    const { count: emailCount, error: emailError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'EMAIL')
      .is('read_at', null);

    const { count: smsCount, error: smsError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'SMS')
      .is('read_at', null);

    const response = successResponse(
      {
        unread_count: inAppCount || 0,
        unread_by_channel: {
          EMAIL: emailCount || 0,
          IN_APP: inAppCount || 0,
          SMS: smsCount || 0,
        },
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

