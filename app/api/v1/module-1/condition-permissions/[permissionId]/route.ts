/**
 * Condition Permission Detail Endpoints
 * GET /api/v1/module-1/condition-permissions/{id} - Get condition permission
 * PUT /api/v1/module-1/condition-permissions/{id} - Update condition permission
 * DELETE /api/v1/module-1/condition-permissions/{id} - Revoke condition permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  const requestId = getRequestId(request);
  const { permissionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const { data: permission, error } = await supabaseAdmin
      .from('condition_permissions')
      .select(`
        *,
        users(id, email, full_name),
        documents(id, document_name)
      `)
      .eq('id', permissionId)
      .single();

    if (error || !permission) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition permission not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(permission, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/condition-permissions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  const requestId = getRequestId(request);
  const { permissionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    const body = await request.json();
    const { permission_type, is_active } = body;

    // Get existing permission to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('condition_permissions')
      .select('id, company_id')
      .eq('id', permissionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition permission not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this permission', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (permission_type !== undefined) {
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
      updateData.permission_type = permission_type;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
      if (!is_active) {
        updateData.revoked_at = new Date().toISOString();
        updateData.revoked_by = user.id;
      } else {
        updateData.revoked_at = null;
        updateData.revoked_by = null;
      }
    }

    const { data: permission, error } = await supabaseAdmin
      .from('condition_permissions')
      .update(updateData)
      .eq('id', permissionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update condition permission', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(permission, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/condition-permissions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  const requestId = getRequestId(request);
  const { permissionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_1', user.company_id);

    // Get existing permission to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('condition_permissions')
      .select('id, company_id')
      .eq('id', permissionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Condition permission not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this permission', 403, {}, { request_id: requestId });
    }

    // Revoke permission (soft delete by setting is_active = false)
    const { data: permission, error } = await supabaseAdmin
      .from('condition_permissions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('id', permissionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to revoke condition permission', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(permission, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-1/condition-permissions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

