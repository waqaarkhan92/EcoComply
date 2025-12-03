/**
 * Module 4: End-Point Proofs Endpoints
 * GET /api/v1/module-4/end-point-proofs - List end-point proofs
 * POST /api/v1/module-4/end-point-proofs - Create end-point proof
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
      .from('end_point_proofs')
      .select('*');

    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.consignment_note_id) query = query.eq('consignment_note_id', filters.consignment_note_id);
    if (filters.end_point_type) query = query.eq('end_point_type', filters.end_point_type);
    if (filters.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified === 'true');

    if (sort.length === 0) {
      query = query.order('completion_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: proofs, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch end-point proofs',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const hasMore = (proofs || []).length > limit;
    const data = hasMore ? (proofs || []).slice(0, limit) : (proofs || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/end-point-proofs:', error);
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
    if (!body.consignment_note_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'consignment_note_id is required',
        422,
        { consignment_note_id: 'consignment_note_id is required' },
        { request_id: requestId }
      );
    }
    if (!body.end_point_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'end_point_type is required',
        422,
        { end_point_type: 'end_point_type is required' },
        { request_id: requestId }
      );
    }
    if (!body.end_point_facility) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'end_point_facility is required',
        422,
        { end_point_facility: 'end_point_facility is required' },
        { request_id: requestId }
      );
    }
    if (!body.completion_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'completion_date is required',
        422,
        { completion_date: 'completion_date is required' },
        { request_id: requestId }
      );
    }

    // Verify consignment note exists and user has access
    const { data: consignmentNote, error: noteError } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, company_id, site_id')
      .eq('id', body.consignment_note_id)
      .single();

    if (noteError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (consignmentNote.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consignment note',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Create end-point proof
    const { data: proof, error: createError } = await supabaseAdmin
      .from('end_point_proofs')
      .insert({
        consignment_note_id: body.consignment_note_id,
        company_id: user.company_id,
        site_id: consignmentNote.site_id,
        end_point_type: body.end_point_type,
        end_point_facility: body.end_point_facility,
        completion_date: body.completion_date,
        certificate_reference: body.certificate_reference || null,
        certificate_document_id: body.certificate_document_id || null,
        evidence_id: body.evidence_id || null,
        is_verified: body.is_verified !== undefined ? body.is_verified : false,
        verification_notes: body.verification_notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !proof) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create end-point proof',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(proof, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/end-point-proofs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

