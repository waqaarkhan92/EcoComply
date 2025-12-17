/**
 * User Site Assignment Endpoint
 * DELETE /api/v1/users/{userId}/sites/{siteId} - Unassign site from user
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ userId: string; siteId: string }> }
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
  const { userId, siteId } = params;

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

    // Check if assignment exists
  const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('user_site_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_id', siteId)
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site assignment not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Delete assignment
  const { error: deleteError } = await supabaseAdmin
      .from('user_site_assignments')
      .delete()
      .eq('user_id', user.id)
      .eq('site_id', siteId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to unassign site from user',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Site unassigned successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, currentUser.id, response);
  } catch (error: any) {
    console.error('Unassign site from user error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
