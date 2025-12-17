/**
 * Reset Password Endpoint
 * POST /api/v1/auth/reset-password - Reset password with token
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';
import { authRateLimitMiddleware } from '@/lib/api/rate-limit';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  refresh_token: z.string().min(1, 'Refresh token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(8, 'Password confirmation is required'),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ['password_confirm'],
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Check rate limit first (IP-based)
    const rateLimitResponse = await authRateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    let body;
    try {
      const rawBody = await request.json();
      body = resetPasswordSchema.parse(rawBody);
    } catch (error: any) {
      const validationErrors = error.errors?.reduce((acc: any, err: any) => {
        acc[err.path.join('.')] = err.message;
        return acc;
      }, {}) || { error: 'Validation failed' };

      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        422,
        validationErrors,
        { request_id: requestId }
      );
    }

    const { access_token, refresh_token, password } = body;

    // Set the session using the tokens from the reset link
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData.user) {
      return errorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired reset link. Please request a new password reset.',
        401,
        null,
        { request_id: requestId }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update password. Please try again.',
        500,
        null,
        { request_id: requestId }
      );
    }

    // Sign out the user (they'll need to log in with new password)
    await supabaseAdmin.auth.signOut();

    return successResponse(
      {
        message: 'Password has been reset successfully. Please log in with your new password.',
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Reset password error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      null,
      { request_id: requestId }
    );
  }
}
