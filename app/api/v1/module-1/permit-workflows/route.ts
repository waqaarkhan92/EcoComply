/**
 * Permit Workflows Endpoints
 * GET /api/v1/module-1/permit-workflows - List permit workflows
 * POST /api/v1/module-1/permit-workflows - Create permit workflow
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
      .from('permit_workflows')
      .select(`
        *,
        documents!inner(id, document_name, document_type),
        sites!inner(id, site_name)
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.document_id) query = query.eq('document_id', filters.document_id);
    if (filters.workflow_type) query = query.eq('workflow_type', filters.workflow_type);
    if (filters.status) query = query.eq('status', filters.status);

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: workflows, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch permit workflows', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (workflows || []).length > limit;
    const data = hasMore ? (workflows || []).slice(0, limit) : (workflows || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-workflows:', error);
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
      site_id,
      workflow_type,
      status,
      submitted_date,
      regulator_response_deadline,
      evidence_ids,
      workflow_notes,
    } = body;

    // Validate required fields
    if (!document_id || !site_id || !workflow_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['document_id', 'site_id', 'workflow_type'] },
        { request_id: requestId }
      );
    }

    // Validate workflow_type enum
    const validWorkflowTypes = ['VARIATION', 'RENEWAL', 'SURRENDER'];
    if (!validWorkflowTypes.includes(workflow_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid workflow_type',
        400,
        { workflow_type: `Must be one of: ${validWorkflowTypes.join(', ')}` },
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

    // Create permit workflow
    const { data: workflow, error } = await supabaseAdmin
      .from('permit_workflows')
      .insert({
        document_id,
        company_id: user.company_id,
        site_id,
        workflow_type,
        status: status || 'DRAFT',
        submitted_date: submitted_date || null,
        regulator_response_deadline: regulator_response_deadline || null,
        evidence_ids: evidence_ids || [],
        workflow_notes: workflow_notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create permit workflow', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(workflow, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/permit-workflows:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

