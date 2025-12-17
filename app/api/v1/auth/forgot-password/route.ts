/**
 * Forgot Password Endpoint
 * POST /api/v1/auth/forgot-password - Request password reset email
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';
import { authRateLimitMiddleware } from '@/lib/api/rate-limit';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
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
      body = forgotPasswordSchema.parse(rawBody);
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid email address',
        422,
        { email: 'Please provide a valid email address' },
        { request_id: requestId }
      );
    }

    const { email } = body;

    // Check if user exists (but don't reveal if they don't for security)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent email enumeration attacks
    // Supabase will only send email if user exists
    if (user) {
      // Send password reset email via Supabase Auth
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
        }
      );

      if (resetError) {
        console.error('Password reset email error:', resetError);
        // Still return success to prevent enumeration
      }
    }

    // Always return success message (security best practice)
    return successResponse(
      {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      null,
      { request_id: requestId }
    );
  }
}
