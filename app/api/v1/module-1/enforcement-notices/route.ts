/**
 * Module 1: Enforcement Notices Endpoints
 * GET /api/v1/module-1/enforcement-notices - List enforcement notices
 * POST /api/v1/module-1/enforcement-notices - Create enforcement notice
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

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('enforcement_notices')
      .select(`
        id,
        company_id,
        site_id,
        document_id,
        notice_number,
        notice_date,
        notice_type,
        regulator,
        subject,
        description,
        requirements,
        deadline_date,
        status,
        response_submitted_at,
        response_document_url,
        response_notes,
        closed_at,
        closed_by,
        closure_notes,
        metadata,
        created_at,
        updated_at,
        created_by,
        updated_by
      `);

    // Apply filters
    if (filters.company_id) query = query.eq('company_id', filters.company_id);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.notice_type) query = query.eq('notice_type', filters.notice_type);
    if (filters.regulator) query = query.eq('regulator', filters.regulator);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('notice_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: notices, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch enforcement notices', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (notices || []).length > limit;
    const data = hasMore ? (notices || []).slice(0, limit) : (notices || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/enforcement-notices:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      site_id,
      document_id,
      notice_number,
      notice_date,
      notice_type,
      regulator,
      subject,
      description,
      requirements,
      deadline_date,
      metadata,
    } = body;

    // Validate required fields
    if (!site_id || !notice_number || !notice_date || !notice_type || !regulator || !subject || !description) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['site_id', 'notice_number', 'notice_date', 'notice_type', 'regulator', 'subject', 'description'] },
        { request_id: requestId }
      );
    }

    // Validate notice_type enum
    const validNoticeTypes = ['WARNING', 'NOTICE', 'VARIATION', 'SUSPENSION', 'REVOCATION', 'PROSECUTION'];
    if (!validNoticeTypes.includes(notice_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid notice_type',
        400,
        { notice_type: `Must be one of: ${validNoticeTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', site_id)
      .single();

    if (siteError || !site) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Site not found', 404, {}, { request_id: requestId });
    }

    if (site.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this site', 403, {}, { request_id: requestId });
    }

    // Verify document if provided
    if (document_id) {
      const { data: document, error: docError } = await supabaseAdmin
        .from('documents')
        .select('id, company_id, site_id')
        .eq('id', document_id)
        .single();

      if (docError || !document) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Document not found', 404, {}, { request_id: requestId });
      }

      if (document.company_id !== user.company_id || document.site_id !== site_id) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Document does not belong to this site', 403, {}, { request_id: requestId });
      }
    }

    // Create enforcement notice
    const { data: notice, error } = await supabaseAdmin
      .from('enforcement_notices')
      .insert({
        company_id: user.company_id,
        site_id,
        document_id: document_id || null,
        notice_number,
        notice_date,
        notice_type,
        regulator,
        subject,
        description,
        requirements: requirements || null,
        deadline_date: deadline_date || null,
        status: 'OPEN',
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create enforcement notice', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(notice, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/enforcement-notices:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

