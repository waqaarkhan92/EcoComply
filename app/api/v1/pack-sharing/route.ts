/**
 * Pack Sharing Endpoints
 * GET /api/v1/pack-sharing - List pack sharing records
 * POST /api/v1/pack-sharing - Create pack sharing record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('pack_sharing')
      .select(`
        id,
        pack_id,
        company_id,
        shared_by,
        access_token,
        distribution_method,
        distributed_to,
        shared_at,
        expires_at,
        is_active,
        access_count,
        last_accessed_at,
        metadata,
        created_at,
        updated_at,
        audit_packs!inner(
          id,
          pack_name,
          pack_type,
          site_id
        )
      `);

    // Apply filters
    if (filters.pack_id) query = query.eq('pack_id', filters.pack_id);
    if (filters.distribution_method) query = query.eq('distribution_method', filters.distribution_method);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('shared_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: sharing, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch pack sharing records', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (sharing || []).length > limit;
    const data = hasMore ? (sharing || []).slice(0, limit) : (sharing || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/pack-sharing:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      pack_id,
      distribution_method,
      distributed_to,
      expires_at,
      metadata,
    } = body;

    // Validate required fields
    if (!pack_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['pack_id'] },
        { request_id: requestId }
      );
    }

    // Verify pack exists and user has access
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, company_id, site_id')
      .eq('id', pack_id)
      .single();

    if (packError || !pack) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Pack not found', 404, {}, { request_id: requestId });
    }

    if (pack.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this pack', 403, {}, { request_id: requestId });
    }

    // Generate secure access token if not provided
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiry (default 30 days if not specified)
    let expiresAtDate: string | null = null;
    if (expires_at) {
      expiresAtDate = new Date(expires_at).toISOString();
    } else {
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      expiresAtDate = defaultExpiry.toISOString();
    }

    // Create pack sharing record
    const { data: sharing, error } = await supabaseAdmin
      .from('pack_sharing')
      .insert({
        pack_id,
        company_id: user.company_id,
        shared_by: user.id,
        access_token: accessToken,
        distribution_method: distribution_method || null,
        distributed_to: distributed_to || null,
        expires_at: expiresAtDate,
        is_active: true,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create pack sharing record', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(sharing, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/pack-sharing:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

