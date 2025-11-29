/**
 * Module 2: Discharge Volumes Endpoints
 * GET /api/v1/module-2/discharge-volumes - List discharge volumes
 * POST /api/v1/module-2/discharge-volumes - Create discharge volume record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
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

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('discharge_volumes')
      .select(`
        id,
        document_id,
        company_id,
        site_id,
        recording_date,
        volume_m3,
        measurement_method,
        notes,
        entered_by,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }
    if (filters['recording_date[gte]']) {
      query = query.gte('recording_date', filters['recording_date[gte]']);
    }
    if (filters['recording_date[lte]']) {
      query = query.lte('recording_date', filters['recording_date[lte]']);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('recording_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: volumes, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch discharge volumes',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (volumes || []).length > limit;
    const data = hasMore ? (volumes || []).slice(0, limit) : (volumes || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].created_at) : null;

    const response = paginatedResponse(data, nextCursor, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/discharge-volumes:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse request body
    const body = await request.json();
    const { document_id, recording_date, volume_m3, measurement_method, notes } = body;

    // Validate required fields
    if (!document_id || !recording_date || volume_m3 === undefined) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: document_id, recording_date, volume_m3',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate volume is positive
    if (volume_m3 < 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Volume must be a positive number',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify document exists and is a consent
    // Get site to check company access
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type')
      .eq('id', document_id)
      .eq('document_type', 'TRADE_EFFLUENT_CONSENT')
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consent document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify site access (which implies company access via RLS)
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('company_id')
      .eq('id', document.site_id)
      .single();

    if (!site || site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consent',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Create discharge volume record
    const { data: volume, error: volumeError } = await supabaseAdmin
      .from('discharge_volumes')
      .insert({
        document_id,
        company_id: site.company_id,
        site_id: document.site_id,
        recording_date,
        volume_m3,
        measurement_method: measurement_method || null,
        notes: notes || null,
        entered_by: user.id,
      })
      .select()
      .single();

    if (volumeError || !volume) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create discharge volume record',
        500,
        { error: volumeError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        ...volume,
        consent_id: document_id, // Alias for API consistency
        date: volume.recording_date, // Alias for API consistency
        source: 'MANUAL', // Default source
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/discharge-volumes:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

