/**
 * Module 2: Sampling Logistics Endpoints
 * GET /api/v1/module-2/sampling-logistics - List sampling logistics records
 * POST /api/v1/module-2/sampling-logistics - Create sampling logistics record
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

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('sampling_logistics')
      .select(`
        id,
        parameter_id,
        company_id,
        site_id,
        scheduled_date,
        sample_id,
        stage,
        reminder_sent_at,
        collection_scheduled_at,
        collected_at,
        collected_by,
        courier_booked_at,
        courier_reference,
        in_transit_at,
        lab_received_at,
        lab_reference,
        lab_processing_at,
        certificate_received_at,
        certificate_document_id,
        evidence_linked_at,
        evidence_id,
        lab_result_id,
        notes,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.parameter_id) query = query.eq('parameter_id', filters.parameter_id);
    if (filters.stage) query = query.eq('stage', filters.stage);
    if (filters.scheduled_date) query = query.eq('scheduled_date', filters.scheduled_date);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('scheduled_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: records, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch sampling logistics', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (records || []).length > limit;
    const data = hasMore ? (records || []).slice(0, limit) : (records || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/sampling-logistics:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      parameter_id,
      site_id,
      scheduled_date,
      sample_id,
      stage,
      notes,
    } = body;

    // Validate required fields
    if (!parameter_id || !site_id || !scheduled_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['parameter_id', 'site_id', 'scheduled_date'] },
        { request_id: requestId }
      );
    }

    // Validate stage enum
    const validStages = ['SCHEDULED', 'REMINDER_SENT', 'COLLECTION_SCHEDULED', 'COLLECTED', 'COURIER_BOOKED', 'IN_TRANSIT', 'LAB_RECEIVED', 'LAB_PROCESSING', 'CERTIFICATE_RECEIVED', 'EVIDENCE_LINKED', 'COMPLETED'];
    if (stage && !validStages.includes(stage)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid stage',
        400,
        { stage: `Must be one of: ${validStages.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify parameter exists and user has access
    const { data: parameter, error: paramError } = await supabaseAdmin
      .from('parameters')
      .select('id, company_id, site_id')
      .eq('id', parameter_id)
      .single();

    if (paramError || !parameter) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Parameter not found', 404, {}, { request_id: requestId });
    }

    if (parameter.company_id !== user.company_id || parameter.site_id !== site_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Parameter does not belong to this site', 403, {}, { request_id: requestId });
    }

    // Create sampling logistics record
    const { data: record, error } = await supabaseAdmin
      .from('sampling_logistics')
      .insert({
        parameter_id,
        company_id: user.company_id,
        site_id,
        scheduled_date,
        sample_id: sample_id || null,
        stage: stage || 'SCHEDULED',
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create sampling logistics record', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(record, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/sampling-logistics:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

