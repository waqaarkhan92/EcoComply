/**
 * Module 2: Corrective Actions Endpoints
 * GET /api/v1/module-2/corrective-actions - List corrective actions
 * POST /api/v1/module-2/corrective-actions - Create corrective action
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
      .from('corrective_actions')
      .select(`
        id,
        exceedance_id,
        parameter_id,
        company_id,
        site_id,
        action_type,
        action_title,
        action_description,
        assigned_to,
        due_date,
        status,
        lifecycle_phase,
        completed_date,
        verified_by,
        verified_at,
        verification_notes,
        evidence_ids,
        resolution_notes,
        root_cause_analysis,
        impact_assessment,
        regulator_notification_required,
        regulator_justification,
        closure_approved_by,
        closure_approved_at,
        closure_requires_approval,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.lifecycle_phase) query = query.eq('lifecycle_phase', filters.lifecycle_phase);
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('due_date', { ascending: true });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: actions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch corrective actions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (actions || []).length > limit;
    const data = hasMore ? (actions || []).slice(0, limit) : (actions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/corrective-actions:', error);
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
      exceedance_id,
      parameter_id,
      site_id,
      action_type,
      action_title,
      action_description,
      assigned_to,
      due_date,
      lifecycle_phase,
      evidence_ids,
      root_cause_analysis,
      impact_assessment,
      regulator_notification_required,
    } = body;

    // Validate required fields
    if (!site_id || !action_type || !action_title || !action_description || !due_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['site_id', 'action_type', 'action_title', 'action_description', 'due_date'] },
        { request_id: requestId }
      );
    }

    // Validate action_type enum
    const validActionTypes = ['IMMEDIATE_RESPONSE', 'ROOT_CAUSE_ANALYSIS', 'PREVENTIVE_MEASURE', 'PROCESS_CHANGE', 'EQUIPMENT_UPGRADE'];
    if (!validActionTypes.includes(action_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid action_type',
        400,
        { action_type: `Must be one of: ${validActionTypes.join(', ')}` },
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

    // Create corrective action
    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .insert({
        exceedance_id: exceedance_id || null,
        parameter_id: parameter_id || null,
        company_id: user.company_id,
        site_id,
        action_type,
        action_title,
        action_description,
        assigned_to: assigned_to || null,
        due_date,
        status: 'OPEN',
        lifecycle_phase: lifecycle_phase || 'TRIGGER',
        evidence_ids: evidence_ids || [],
        root_cause_analysis: root_cause_analysis || null,
        impact_assessment: impact_assessment || {},
        regulator_notification_required: regulator_notification_required || false,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create corrective action', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(action, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/corrective-actions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

