/**
 * Condition Evidence Rules Endpoints
 * GET /api/v1/module-1/condition-evidence-rules - List condition evidence rules
 * POST /api/v1/module-1/condition-evidence-rules - Create condition evidence rule
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

    await requireModule('MODULE_1', user.company_id);

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('condition_evidence_rules')
      .select(`
        *,
        documents!inner(id, document_name),
        obligations(id, summary)
      `);

    // Apply filters
    if (filters.document_id) query = query.eq('document_id', filters.document_id);
    if (filters.obligation_id) query = query.eq('obligation_id', filters.obligation_id);
    if (filters.condition_reference) query = query.eq('condition_reference', filters.condition_reference);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
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
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch condition evidence rules', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (rules || []).length > limit;
    const data = hasMore ? (rules || []).slice(0, limit) : (rules || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/condition-evidence-rules:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const body = await request.json();
    const {
      document_id,
      obligation_id,
      condition_reference,
      site_id,
      allowed_evidence_types,
      required_evidence_types,
      evidence_requirements,
    } = body;

    // Validate required fields
    if (!document_id || !condition_reference || !site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['document_id', 'condition_reference', 'site_id'] },
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

    // Create condition evidence rule
    const { data: rule, error } = await supabaseAdmin
      .from('condition_evidence_rules')
      .insert({
        document_id,
        obligation_id: obligation_id || null,
        condition_reference,
        company_id: user.company_id,
        site_id,
        allowed_evidence_types: allowed_evidence_types || [],
        required_evidence_types: required_evidence_types || [],
        evidence_requirements: evidence_requirements || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create condition evidence rule', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(rule, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/condition-evidence-rules:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

