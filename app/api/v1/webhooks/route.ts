/**
 * Webhook Management Endpoints
 * GET /api/v1/webhooks - List webhooks
 * POST /api/v1/webhooks - Create webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will filter by company
    let query = supabaseAdmin
      .from('webhooks')
      .select('id, url, events, is_active, last_delivery_at, last_delivery_status, created_at, updated_at')
      .eq('company_id', user.company_id);

    // Apply filters
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Default sort by created_at desc
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: webhooks, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch webhooks',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = webhooks && webhooks.length > limit;
    const results = hasMore ? webhooks.slice(0, limit) : webhooks || [];

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
    console.error('Get webhooks error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.url || typeof body.url !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'URL is required',
        422,
        { url: 'URL is required' },
        { request_id: requestId }
      );
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Events array is required and must not be empty',
        422,
        { events: 'Events array is required' },
        { request_id: requestId }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid URL format',
        422,
        { url: 'Must be a valid URL' },
        { request_id: requestId }
      );
    }

    // Validate event types
    const validEvents = [
      'document.extracted',
      'obligation.deadline_approaching',
      'obligation.overdue',
      'audit_pack.generated',
      'module.activated',
    ];
    const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid event types',
        422,
        { events: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Generate secret if not provided
    const secret = body.secret || crypto.randomBytes(32).toString('hex');

    // Create webhook
    const { data: webhook, error: createError } = await supabaseAdmin
      .from('webhooks')
      .insert({
        company_id: user.company_id,
        url: body.url,
        events: body.events,
        secret: secret, // In production, this should be encrypted
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: user.id,
      })
      .select('id, url, events, is_active, created_at')
      .single();

    if (createError || !webhook) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create webhook',
        500,
        { error: createError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(webhook, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
