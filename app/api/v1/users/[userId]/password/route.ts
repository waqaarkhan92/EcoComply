/**
 * User Password Endpoint
 * PUT /api/v1/users/{userId}/password - Change user password
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: currentUser } = authResult;

    const { userId } = params;

    // Users can change their own password, or Admins can change any user's password in their company
    if (userId !== currentUser.id && !currentUser.roles.includes('OWNER') && !currentUser.roles.includes('ADMIN')) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.current_password || !body.new_password) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Current password and new password are required',
        422,
        { 
          current_password: body.current_password ? undefined : 'Current password is required',
          new_password: body.new_password ? undefined : 'New password is required'
        },
        { request_id: requestId }
      );
    }

    // Validate new password strength
    if (body.new_password.length < 8) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'New password must be at least 8 characters',
        422,
        { new_password: 'Password must be at least 8 characters long' },
        { request_id: requestId }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id')
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

    // Verify user has access (same company or own user)
    if (user.company_id !== currentUser.company_id && userId !== currentUser.id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // If changing own password, verify current password
    if (userId === currentUser.id) {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: body.current_password,
      });

      if (signInError) {
        return errorResponse(
          ErrorCodes.UNAUTHORIZED,
          'Current password is incorrect',
          401,
          { current_password: 'Current password is incorrect' },
          { request_id: requestId }
        );
      }
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: body.new_password }
    );

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update password',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Password updated successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, currentUser.id, response);
  } catch (error: any) {
    console.error('Update password error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
