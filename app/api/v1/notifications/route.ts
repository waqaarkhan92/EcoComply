/**
 * Notifications Endpoints
 * GET /api/v1/notifications - List notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user_id
    let query = supabaseAdmin
      .from('notifications')
      .select('id, user_id, company_id, site_id, notification_type, channel, priority, subject, message, status, read_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.notification_type) {
      query = query.eq('notification_type', filters.notification_type);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.read_at !== undefined) {
      if (filters.read_at === null || filters.read_at === 'null') {
        query = query.is('read_at', null);
      } else {
        query = query.not('read_at', 'is', null);
      }
    }

    // Apply sorting
    for (const sortItem of sort) {
      if (sortItem.field === 'created_at') {
        query = query.order('created_at', { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: notifications, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch notifications',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = notifications && notifications.length > limit;
    const results = hasMore ? notifications.slice(0, limit) : notifications || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      results,
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

