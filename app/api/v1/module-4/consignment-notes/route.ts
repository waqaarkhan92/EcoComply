/**
 * Module 4: Consignment Notes Endpoints
 * GET /api/v1/module-4/consignment-notes - List consignment notes
 * POST /api/v1/module-4/consignment-notes - Create consignment note
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
      .from('consignment_notes')
      .select(`
        id,
        waste_stream_id,
        company_id,
        site_id,
        consignment_note_number,
        consignment_date,
        carrier_id,
        carrier_name,
        carrier_licence_number,
        destination_site,
        waste_description,
        ewc_code,
        quantity_m3,
        quantity_kg,
        validation_status,
        pre_validation_status,
        created_at,
        updated_at
      `);

    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.waste_stream_id) query = query.eq('waste_stream_id', filters.waste_stream_id);
    if (filters.validation_status) query = query.eq('validation_status', filters.validation_status);
    if (filters['consignment_date[gte]']) query = query.gte('consignment_date', filters['consignment_date[gte]']);
    if (filters['consignment_date[lte]']) query = query.lte('consignment_date', filters['consignment_date[lte]']);

    if (sort.length === 0) {
      query = query.order('consignment_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: notes, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch consignment notes',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const hasMore = (notes || []).length > limit;
    const data = hasMore ? (notes || []).slice(0, limit) : (notes || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/consignment-notes:', error);
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
    if (!body.waste_stream_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'waste_stream_id is required',
        422,
        { waste_stream_id: 'waste_stream_id is required' },
        { request_id: requestId }
      );
    }
    if (!body.consignment_note_number) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'consignment_note_number is required',
        422,
        { consignment_note_number: 'consignment_note_number is required' },
        { request_id: requestId }
      );
    }
    if (!body.consignment_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'consignment_date is required',
        422,
        { consignment_date: 'consignment_date is required' },
        { request_id: requestId }
      );
    }
    if (!body.carrier_name) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'carrier_name is required',
        422,
        { carrier_name: 'carrier_name is required' },
        { request_id: requestId }
      );
    }
    if (!body.destination_site) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'destination_site is required',
        422,
        { destination_site: 'destination_site is required' },
        { request_id: requestId }
      );
    }
    if (!body.waste_description) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'waste_description is required',
        422,
        { waste_description: 'waste_description is required' },
        { request_id: requestId }
      );
    }
    if (!body.ewc_code) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'ewc_code is required',
        422,
        { ewc_code: 'ewc_code is required' },
        { request_id: requestId }
      );
    }
    if (!body.quantity_m3) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'quantity_m3 is required',
        422,
        { quantity_m3: 'quantity_m3 is required' },
        { request_id: requestId }
      );
    }

    // Verify waste stream exists and user has access
    const { data: wasteStream, error: streamError } = await supabaseAdmin
      .from('waste_streams')
      .select('id, site_id, company_id')
      .eq('id', body.waste_stream_id)
      .is('deleted_at', null)
      .single();

    if (streamError || !wasteStream) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Waste stream not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (wasteStream.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this waste stream',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Check if consignment note number is unique
    const { data: existing } = await supabaseAdmin
      .from('consignment_notes')
      .select('id')
      .eq('consignment_note_number', body.consignment_note_number)
      .single();

    if (existing) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        'Consignment note number already exists',
        409,
        { consignment_note_number: body.consignment_note_number },
        { request_id: requestId }
      );
    }

    // Create consignment note
    const { data: consignmentNote, error: createError } = await supabaseAdmin
      .from('consignment_notes')
      .insert({
        waste_stream_id: body.waste_stream_id,
        company_id: user.company_id,
        site_id: wasteStream.site_id,
        consignment_note_number: body.consignment_note_number,
        consignment_date: body.consignment_date,
        carrier_id: body.carrier_id || null,
        carrier_name: body.carrier_name,
        carrier_licence_number: body.carrier_licence_number || null,
        destination_site: body.destination_site,
        waste_description: body.waste_description,
        ewc_code: body.ewc_code,
        quantity_m3: body.quantity_m3,
        quantity_kg: body.quantity_kg || null,
        validation_status: 'PENDING',
        pre_validation_status: 'NOT_VALIDATED',
        document_id: body.document_id || null,
        evidence_id: body.evidence_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create consignment note',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: consignmentNote.id,
        consignment_note_number: consignmentNote.consignment_note_number,
        validation_status: consignmentNote.validation_status,
        created_at: consignmentNote.created_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/consignment-notes:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

