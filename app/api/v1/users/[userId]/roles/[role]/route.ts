/**
 * User Role Endpoint
 * DELETE /api/v1/users/{userId}/roles/{role} - Remove role from user
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ userId: string; role: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user: currentUser } = authResult;

    const params = await props.params;
  const { userId, role } = params;

    // Validate role value
    const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'CONSULTANT', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid role',
        422,
        { role: `Role must be one of: ${validRoles.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Check if user exists
  const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, company_id')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (userError || !user) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (user.company_id !== currentUser.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'You do not have access to this user',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Prevent removing OWNER role if user is the only owner
    if (role === 'OWNER') {
      const { data: ownerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'OWNER')
        .eq('company_id', user.company_id);

      if (ownerRoles && ownerRoles.length === 1 && ownerRoles[0].user_id === userId) {
        return errorResponse(
          ErrorCodes.CONFLICT,
          'Cannot remove the only owner role from the company',
          409,
          { role: 'Company must have at least one owner' },
          { request_id: requestId }
        );
      }
    }

    // Check if role assignment exists
  const { data: roleAssignment, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', role)
      .single();

    if (roleError || !roleAssignment) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Role assignment not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Remove role
  const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', role);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to remove role from user',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Role removed successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, currentUser.id, response);
  } catch (error: any) {
    console.error('Remove role from user error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
