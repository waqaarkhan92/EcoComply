/**
 * Module 4: Validation Rules Endpoints
 * GET /api/v1/module-4/validation-rules - List validation rules
 * POST /api/v1/module-4/validation-rules - Create validation rule
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
      .from('validation_rules')
      .select('*')
      .eq('company_id', user.company_id);

    if (filters.waste_stream_id) query = query.eq('waste_stream_id', filters.waste_stream_id);
    if (filters.rule_type) query = query.eq('rule_type', filters.rule_type);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: rules, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch validation rules',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const hasMore = (rules || []).length > limit;
    const data = hasMore ? (rules || []).slice(0, limit) : (rules || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/validation-rules:', error);
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
    if (!body.rule_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'rule_type is required',
        422,
        { rule_type: 'rule_type is required' },
        { request_id: requestId }
      );
    }
    if (!body.rule_name) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'rule_name is required',
        422,
        { rule_name: 'rule_name is required' },
        { request_id: requestId }
      );
    }
    if (!body.rule_config) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'rule_config is required',
        422,
        { rule_config: 'rule_config is required' },
        { request_id: requestId }
      );
    }
    if (!body.severity) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'severity is required',
        422,
        { severity: 'severity is required' },
        { request_id: requestId }
      );
    }

    // Create validation rule
    const { data: rule, error: createError } = await supabaseAdmin
      .from('validation_rules')
      .insert({
        company_id: user.company_id,
        waste_stream_id: body.waste_stream_id || null,
        rule_type: body.rule_type,
        rule_name: body.rule_name,
        rule_description: body.rule_description || null,
        rule_config: body.rule_config,
        severity: body.severity,
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !rule) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create validation rule',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(rule, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/validation-rules:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

