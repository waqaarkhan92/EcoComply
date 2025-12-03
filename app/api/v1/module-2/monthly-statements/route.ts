/**
 * Monthly Statements Endpoints
 * GET /api/v1/module-2/monthly-statements - List monthly statements
 * POST /api/v1/module-2/monthly-statements - Create monthly statement
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_2', user.company_id);

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('monthly_statements')
      .select(`
        *,
        documents!inner(id, document_name),
        sites!inner(id, site_name)
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.water_company_name) query = query.ilike('water_company_name', `%${filters.water_company_name}%`);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('statement_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: statements, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch monthly statements', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (statements || []).length > limit;
    const data = hasMore ? (statements || []).slice(0, limit) : (statements || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/monthly-statements:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_2', user.company_id);

    const body = await request.json();
    const {
      document_id,
      site_id,
      statement_period_start,
      statement_period_end,
      statement_date,
      total_volume_m3,
      total_charge,
      statement_reference,
      water_company_name,
      statement_data,
      document_path,
    } = body;

    // Validate required fields
    if (!document_id || !site_id || !statement_period_start || !statement_period_end || !statement_date || !total_volume_m3 || !water_company_name) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['document_id', 'site_id', 'statement_period_start', 'statement_period_end', 'statement_date', 'total_volume_m3', 'water_company_name'] },
        { request_id: requestId }
      );
    }

    // Verify document exists and user has access
    const { data: document, error: documentError } = await supabaseAdmin
      .from('documents')
      .select('id, company_id, site_id')
      .eq('id', document_id)
      .single();

    if (documentError || !document) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Document not found', 404, {}, { request_id: requestId });
    }

    if (document.company_id !== user.company_id || document.site_id !== site_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this document', 403, {}, { request_id: requestId });
    }

    // Create monthly statement
    const { data: statement, error } = await supabaseAdmin
      .from('monthly_statements')
      .insert({
        document_id,
        company_id: user.company_id,
        site_id,
        statement_period_start,
        statement_period_end,
        statement_date,
        total_volume_m3,
        total_charge: total_charge || null,
        statement_reference: statement_reference || null,
        water_company_name,
        statement_data: statement_data || {},
        document_path: document_path || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create monthly statement', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(statement, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/monthly-statements:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

