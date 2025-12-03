/**
 * Module 4: Contractor Licences Endpoints
 * GET /api/v1/module-4/contractor-licences - List contractor licences
 * POST /api/v1/module-4/contractor-licences - Create contractor licence
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
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('contractor_licences')
      .select('*')
      .eq('company_id', user.company_id);

    if (filters.is_valid !== undefined) {
      query = query.eq('is_valid', filters.is_valid === 'true');
    }
    if (filters.licence_type) {
      query = query.eq('licence_type', filters.licence_type);
    }
    if (filters['expiry_date[lte]']) {
      query = query.lte('expiry_date', filters['expiry_date[lte]']);
    }

    if (sort.length === 0) {
      query = query.order('expiry_date', { ascending: true });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: licences, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch contractor licences',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const hasMore = (licences || []).length > limit;
    const data = hasMore ? (licences || []).slice(0, limit) : (licences || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/contractor-licences:', error);
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
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();

    // Validate required fields
    if (!body.contractor_name) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'contractor_name is required',
        422,
        { contractor_name: 'contractor_name is required' },
        { request_id: requestId }
      );
    }
    if (!body.licence_number) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'licence_number is required',
        422,
        { licence_number: 'licence_number is required' },
        { request_id: requestId }
      );
    }
    if (!body.licence_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'licence_type is required',
        422,
        { licence_type: 'licence_type is required' },
        { request_id: requestId }
      );
    }
    if (!body.expiry_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'expiry_date is required',
        422,
        { expiry_date: 'expiry_date is required' },
        { request_id: requestId }
      );
    }

    // Create contractor licence
    const { data: licence, error: createError } = await supabaseAdmin
      .from('contractor_licences')
      .insert({
        company_id: user.company_id,
        contractor_name: body.contractor_name,
        licence_number: body.licence_number,
        licence_type: body.licence_type,
        waste_types_allowed: body.waste_types_allowed || [],
        issued_date: body.issued_date || null,
        expiry_date: body.expiry_date,
        is_valid: body.is_valid !== undefined ? body.is_valid : true,
        verification_notes: body.verification_notes || null,
        metadata: body.metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !licence) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create contractor licence',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(licence, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/contractor-licences:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

