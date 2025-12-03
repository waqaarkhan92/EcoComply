/**
 * Condition Permissions Endpoints
 * GET /api/v1/module-1/condition-permissions - List condition permissions
 * POST /api/v1/module-1/condition-permissions - Create condition permission
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
      .from('condition_permissions')
      .select(`
        *,
        users!inner(id, email, full_name),
        documents!inner(id, document_name)
      `);

    // Apply filters
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.document_id) query = query.eq('document_id', filters.document_id);
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

    const { data: permissions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch condition permissions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (permissions || []).length > limit;
    const data = hasMore ? (permissions || []).slice(0, limit) : (permissions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/condition-permissions:', error);
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
      user_id,
      document_id,
      condition_reference,
      site_id,
      permission_type,
    } = body;

    // Validate required fields
    if (!user_id || !document_id || !condition_reference || !site_id || !permission_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['user_id', 'document_id', 'condition_reference', 'site_id', 'permission_type'] },
        { request_id: requestId }
      );
    }

    // Validate permission_type enum
    const validPermissionTypes = ['VIEW', 'EDIT', 'MANAGE', 'FULL'];
    if (!validPermissionTypes.includes(permission_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid permission_type',
        400,
        { permission_type: `Must be one of: ${validPermissionTypes.join(', ')}` },
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

    // Create condition permission
    const { data: permission, error } = await supabaseAdmin
      .from('condition_permissions')
      .insert({
        user_id,
        document_id,
        condition_reference,
        company_id: user.company_id,
        site_id,
        permission_type,
        granted_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create condition permission', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(permission, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-1/condition-permissions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

