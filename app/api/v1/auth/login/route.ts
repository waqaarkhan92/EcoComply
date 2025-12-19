/**
 * Login Endpoint
 * POST /api/v1/auth/login
 *
 * Authenticate user and receive access/refresh tokens
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';
import { validateRequestBody } from '@/lib/validation/middleware';
import { loginSchema } from '@/lib/validation/schemas';
import { authRateLimitMiddleware } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Validate request body with Zod
    const validation = await validateRequestBody(request, loginSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const body = validation.data;

    // Check rate limit (IP + email based)
    const rateLimitResponse = await authRateLimitMiddleware(request, body.email);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate with Supabase Auth - use regular client (not service role)
    // Add timeout to prevent hanging
    const authPromise = supabase.auth.signInWithPassword({
      email: body.email.toLowerCase(),
      password: body.password,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout - Supabase not responding')), 10000)
    );

    const { data: authData, error: authError } = await Promise.race([
      authPromise,
      timeoutPromise
    ]) as Awaited<typeof authPromise>;

    if (authError || !authData.session || !authData.user) {
      // Check if error is due to unverified email
      const isTestEnv = process.env.NODE_ENV === 'test' || 
                        process.env.NODE_ENV === 'development' || 
                        process.env.DISABLE_EMAIL_VERIFICATION === 'true';
      
      if (!isTestEnv && (authError?.message?.includes('Email not confirmed') || authError?.message?.includes('email_not_confirmed'))) {
        return errorResponse(
          ErrorCodes.UNAUTHORIZED,
          'Please verify your email before logging in',
          401,
          { email: 'Email verification required. Please check your inbox.' },
          { request_id: requestId }
        );
      }

      return errorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid email or password',
        401,
        { error: 'Invalid credentials' },
        { request_id: requestId }
      );
    }

    // Get user details from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, company_id, email_verified, is_active')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'User record not found',
        500,
        { error: userError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Account is inactive',
        403,
        { error: 'Your account has been deactivated. Please contact support.' },
        { request_id: requestId }
      );
    }

    // Get user roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    // Update last_login_at
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Return success response with tokens
    return successResponse(
      {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in || 86400,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          company_id: user.company_id,
          roles: roles?.map((r: { role: string }) => r.role) || [],
          email_verified: user.email_verified,
        },
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
