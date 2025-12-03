/**
 * Module 3: Runtime Monitoring Endpoints
 * GET /api/v1/module-3/runtime-monitoring - List runtime monitoring records
 * POST /api/v1/module-3/runtime-monitoring - Create runtime monitoring record
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

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('runtime_monitoring')
      .select(`
        id,
        generator_id,
        company_id,
        site_id,
        run_date,
        runtime_hours,
        run_duration,
        reason_code,
        data_source,
        integration_system,
        integration_reference,
        raw_data,
        evidence_linkage_id,
        is_verified,
        verified_by,
        verified_at,
        notes,
        entry_reason_notes,
        validation_status,
        validated_by,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.generator_id) query = query.eq('generator_id', filters.generator_id);
    if (filters.reason_code) query = query.eq('reason_code', filters.reason_code);
    if (filters.data_source) query = query.eq('data_source', filters.data_source);
    if (filters.run_date) query = query.eq('run_date', filters.run_date);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('run_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: records, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch runtime monitoring records', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (records || []).length > limit;
    const data = hasMore ? (records || []).slice(0, limit) : (records || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/runtime-monitoring:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      generator_id,
      run_date,
      run_duration,
      reason_code,
      evidence_linkage_id,
      entry_reason_notes,
      notes,
    } = body;

    // Validate required fields
    if (!generator_id || !run_date || !run_duration || !reason_code) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['generator_id', 'run_date', 'run_duration', 'reason_code'] },
        { request_id: requestId }
      );
    }

    // Validate reason_code enum
    const validReasonCodes = ['Test', 'Emergency', 'Maintenance', 'Normal'];
    if (!validReasonCodes.includes(reason_code)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid reason_code',
        400,
        { reason_code: `Must be one of: ${validReasonCodes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify generator exists and user has access
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id, site_id')
      .eq('id', generator_id)
      .single();

    if (genError || !generator) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Generator not found', 404, {}, { request_id: requestId });
    }

    if (generator.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this generator', 403, {}, { request_id: requestId });
    }

    // Create runtime monitoring record
    const { data: record, error } = await supabaseAdmin
      .from('runtime_monitoring')
      .insert({
        generator_id,
        company_id: user.company_id,
        site_id: generator.site_id,
        run_date,
        runtime_hours: run_duration, // For manual entry, runtime_hours = run_duration
        run_duration,
        reason_code,
        data_source: 'MANUAL',
        evidence_linkage_id: evidence_linkage_id || null,
        entry_reason_notes: entry_reason_notes || null,
        notes: notes || null,
        validation_status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create runtime monitoring record', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(record, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/runtime-monitoring:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

