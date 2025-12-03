/**
 * Consent States Endpoints
 * GET /api/v1/module-2/consent-states - List consent states
 * POST /api/v1/module-2/consent-states - Create consent state (transition)
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
      .from('consent_states')
      .select(`
        *,
        documents!inner(id, document_name)
      `);

    // Apply filters
    if (filters.document_id) query = query.eq('document_id', filters.document_id);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.state) query = query.eq('state', filters.state);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('effective_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: states, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch consent states', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (states || []).length > limit;
    const data = hasMore ? (states || []).slice(0, limit) : (states || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/consent-states:', error);
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
      state,
      effective_date,
      expiry_date,
      previous_state_id,
      state_transition_reason,
    } = body;

    // Validate required fields
    if (!document_id || !site_id || !state || !effective_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['document_id', 'site_id', 'state', 'effective_date'] },
        { request_id: requestId }
      );
    }

    // Validate state enum
    const validStates = ['DRAFT', 'IN_FORCE', 'SUPERSEDED', 'EXPIRED'];
    if (!validStates.includes(state)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid state',
        400,
        { state: `Must be one of: ${validStates.join(', ')}` },
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

    // If previous_state_id provided, verify it exists and belongs to same document
    if (previous_state_id) {
      const { data: previousState, error: prevError } = await supabaseAdmin
        .from('consent_states')
        .select('id, document_id')
        .eq('id', previous_state_id)
        .single();

      if (prevError || !previousState || previousState.document_id !== document_id) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Previous state not found or does not match document', 404, {}, { request_id: requestId });
      }
    }

    // Create consent state (state transition)
    const { data: consentState, error } = await supabaseAdmin
      .from('consent_states')
      .insert({
        document_id,
        company_id: user.company_id,
        site_id,
        state,
        effective_date,
        expiry_date: expiry_date || null,
        previous_state_id: previous_state_id || null,
        state_transition_reason: state_transition_reason || null,
        transitioned_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create consent state', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(consentState, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/consent-states:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

