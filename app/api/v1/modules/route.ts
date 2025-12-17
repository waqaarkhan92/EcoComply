/**
 * Modules Endpoints
 * GET /api/v1/modules - List available modules
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parseFilterParams, parseSortParams } from '@/lib/api/pagination';
import { addCacheHeaders, checkConditionalRequest, notModifiedResponse, generateETag } from '@/lib/api/cache-headers';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse filter and sort params
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query
    let query = supabaseAdmin
      .from('modules')
      .select('id, module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, created_at, updated_at');

    // Apply filters
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }
    if (filters.is_default !== undefined) {
      query = query.eq('is_default', filters.is_default === 'true');
    }
    if (filters.module_code) {
      query = query.eq('module_code', filters.module_code);
    }
    if (filters.requires_module_id !== undefined) {
      if (filters.requires_module_id === 'null' || filters.requires_module_id === null) {
        query = query.is('requires_module_id', null);
      } else {
        query = query.eq('requires_module_id', filters.requires_module_id);
      }
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by module_code
      query = query.order('module_code', { ascending: true });
    }

    const { data: modules, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch modules',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const responseData = modules || [];

    // Generate ETag for conditional requests
    const etag = generateETag(responseData);

    // Check if client has valid cached version (304 Not Modified)
    if (checkConditionalRequest(request, etag)) {
      return notModifiedResponse(etag);
    }

    // Build response with cache headers (modules rarely change)
    let response = successResponse(responseData, 200, { request_id: requestId });
    response = addCacheHeaders(response, 'public-long', { etag, data: responseData });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get modules error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

