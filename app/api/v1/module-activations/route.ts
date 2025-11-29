/**
 * Module Activations Endpoints
 * GET /api/v1/module-activations - List module activations (RLS filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's company access
    let query = supabaseAdmin
      .from('module_activations')
      .select(`
        id,
        company_id,
        site_id,
        module_id,
        status,
        activated_at,
        activated_by,
        deactivated_at,
        deactivated_by,
        deactivation_reason,
        billing_start_date,
        billing_end_date,
        created_at,
        updated_at,
        modules!inner(module_code, module_name)
      `);

    // Apply filters
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.module_id) {
      query = query.eq('module_id', filters.module_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.site_id !== undefined) {
      if (filters.site_id === 'null' || filters.site_id === null) {
        query = query.is('site_id', null);
      } else {
        query = query.eq('site_id', filters.site_id);
      }
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by activated_at descending
      query = query.order('activated_at', { ascending: false });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      query = query.lt('created_at', parsedCursor.created_at);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: activations, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch module activations',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Transform data to include module_name from joined modules table
    const transformed = (activations || []).map((activation: any) => ({
      id: activation.id,
      company_id: activation.company_id,
      site_id: activation.site_id,
      module_id: activation.module_id,
      module_name: activation.modules?.module_name || null,
      status: activation.status,
      activated_at: activation.activated_at,
      activated_by: activation.activated_by,
      deactivated_at: activation.deactivated_at,
      deactivated_by: activation.deactivated_by,
      deactivation_reason: activation.deactivation_reason,
      billing_start_date: activation.billing_start_date,
      billing_end_date: activation.billing_end_date,
      created_at: activation.created_at,
      updated_at: activation.updated_at,
    }));

    // Check if there are more results
    const hasMore = transformed.length > limit;
    const results = hasMore ? transformed.slice(0, limit) : transformed;

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
    console.error('Get module activations error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

