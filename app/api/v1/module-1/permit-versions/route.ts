/**
 * Module 1: Permit Versions Endpoints
 * GET /api/v1/module-1/permit-versions - List permit versions
 * POST /api/v1/module-1/permit-versions - Create permit version
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('permit_versions')
      .select(`
        id,
        document_id,
        company_id,
        site_id,
        version_number,
        version_date,
        effective_date,
        expiry_date,
        version_type,
        change_summary,
        redline_document_url,
        impact_analysis,
        is_current,
        created_at,
        updated_at
      `);

    if (filters.document_id) query = query.eq('document_id', filters.document_id);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.version_type) query = query.eq('version_type', filters.version_type);
    if (filters.is_current !== undefined) query = query.eq('is_current', filters.is_current === 'true');

    if (sort.length === 0) {
      query = query.order('version_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: versions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch permit versions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (versions || []).length > limit;
    const data = hasMore ? (versions || []).slice(0, limit) : (versions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-versions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      document_id,
      version_number,
      version_date,
      effective_date,
      expiry_date,
      version_type,
      change_summary,
      redline_document_url,
      impact_analysis,
      is_current,
    } = body;

    if (!document_id || !version_number || !version_date || !version_type) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields', 400, { required: ['document_id', 'version_number', 'version_date', 'version_type'] }, { request_id: requestId });
    }

    // Get document to get company_id and site_id
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('company_id, site_id')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Document not found', 404, {}, { request_id: requestId });
    }

    const { data: version, error } = await supabaseAdmin
      .from('permit_versions')
      .insert({
        document_id,
        company_id: document.company_id,
        site_id: document.site_id,
        version_number,
        version_date,
        effective_date: effective_date || null,
        expiry_date: expiry_date || null,
        version_type,
        change_summary: change_summary || null,
        redline_document_url: redline_document_url || null,
        impact_analysis: impact_analysis || {},
        is_current: is_current || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create permit version', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(version, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/permit-versions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}



