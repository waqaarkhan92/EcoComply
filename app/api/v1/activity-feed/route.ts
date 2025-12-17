/**
 * Activity Feed API
 * GET /api/v1/activity-feed - Get recent activities
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 6
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { activityFeedService, ActivityType } from '@/lib/services/activity-feed-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const user_id = searchParams.get('user_id');
    const activity_types = searchParams.get('activity_types');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    const activityTypeArray = activity_types
      ? (activity_types.split(',') as ActivityType[])
      : undefined;

    const { activities, total } = await activityFeedService.getCompanyActivities(
      user.company_id,
      {
        siteId: site_id || undefined,
        userId: user_id || undefined,
        activityTypes: activityTypeArray,
        limit,
        offset,
      }
    );

    const response = successResponse(
      {
        data: activities,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching activity feed:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
