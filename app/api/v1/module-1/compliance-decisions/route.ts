/**
 * Module 1: Compliance Decisions Endpoints
 * GET /api/v1/module-1/compliance-decisions - List compliance decisions
 * POST /api/v1/module-1/compliance-decisions - Create compliance decision
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
      .from('compliance_decisions')
      .select(`
        id,
        company_id,
        site_id,
        obligation_id,
        decision_type,
        decision_date,
        decision_maker,
        rationale,
        evidence_references,
        impact_assessment,
        review_date,
        reviewed_by,
        review_notes,
        is_active,
        metadata,
        created_at,
        updated_at,
        created_by,
        updated_by
      `);

    // Apply filters
    if (filters.company_id) query = query.eq('company_id', filters.company_id);
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.obligation_id) query = query.eq('obligation_id', filters.obligation_id);
    if (filters.decision_type) query = query.eq('decision_type', filters.decision_type);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('decision_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: decisions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch compliance decisions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (decisions || []).length > limit;
    const data = hasMore ? (decisions || []).slice(0, limit) : (decisions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/compliance-decisions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF', 'CONSULTANT']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      site_id,
      obligation_id,
      decision_type,
      decision_date,
      rationale,
      evidence_references,
      impact_assessment,
      review_date,
      metadata,
    } = body;

    // Validate required fields
    if (!site_id || !decision_type || !decision_date || !rationale) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['site_id', 'decision_type', 'decision_date', 'rationale'] },
        { request_id: requestId }
      );
    }

    // Validate decision_type enum
    const validDecisionTypes = ['COMPLIANCE', 'NON_COMPLIANCE', 'PARTIAL_COMPLIANCE', 'NOT_APPLICABLE', 'DEFERRED'];
    if (!validDecisionTypes.includes(decision_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid decision_type',
        400,
        { decision_type: `Must be one of: ${validDecisionTypes.join(', ')}` },
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

    // Verify obligation if provided
    if (obligation_id) {
      const { data: obligation, error: obligError } = await supabaseAdmin
        .from('obligations')
        .select('id, company_id, site_id')
        .eq('id', obligation_id)
        .single();

      if (obligError || !obligation) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Obligation not found', 404, {}, { request_id: requestId });
      }

      if (obligation.company_id !== user.company_id || obligation.site_id !== site_id) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Obligation does not belong to this site', 403, {}, { request_id: requestId });
      }
    }

    // Create compliance decision
    const { data: decision, error } = await supabaseAdmin
      .from('compliance_decisions')
      .insert({
        company_id: user.company_id,
        site_id,
        obligation_id: obligation_id || null,
        decision_type,
        decision_date,
        decision_maker: user.id,
        rationale,
        evidence_references: evidence_references || [],
        impact_assessment: impact_assessment || null,
        review_date: review_date || null,
        is_active: true,
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create compliance decision', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(decision, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/compliance-decisions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

