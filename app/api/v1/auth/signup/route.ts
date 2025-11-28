/**
 * Signup Endpoint
 * POST /api/v1/auth/signup
 * 
 * Register new user account with company creation
 * - Creates Supabase Auth user
 * - Creates company record
 * - Creates user record (linked to auth.users)
 * - Creates user_roles record (role = 'OWNER')
 * - Creates module_activation for Module 1 (default)
 * - Sends email verification (if enabled)
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';

interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Parse request body
    const body: SignupRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.full_name || !body.company_name) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: email, password, full_name, company_name',
        422,
        {
          missing_fields: [
            !body.email && 'email',
            !body.password && 'password',
            !body.full_name && 'full_name',
            !body.company_name && 'company_name',
          ].filter(Boolean),
        },
        { request_id: requestId }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid email format',
        422,
        { email: 'Must be a valid email address' },
        { request_id: requestId }
      );
    }

    // Validate password (min 8 characters)
    if (body.password.length < 8) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Password must be at least 8 characters',
        422,
        { password: 'Password must be at least 8 characters long' },
        { request_id: requestId }
      );
    }

    // Validate company name (min 2 characters, max 100)
    if (body.company_name.length < 2 || body.company_name.length > 100) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Company name must be between 2 and 100 characters',
        422,
        { company_name: 'Company name must be between 2 and 100 characters' },
        { request_id: requestId }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', body.email.toLowerCase())
      .single();

    if (existingUser) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        'Email already registered',
        409,
        { email: 'This email is already registered. Please log in instead.' },
        { request_id: requestId }
      );
    }

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.signUp({
      email: body.email.toLowerCase(),
      password: body.password,
      options: {
        emailRedirectTo: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/verify-email`,
        data: {
          full_name: body.full_name,
          company_name: body.company_name,
        },
      },
    });

    if (authError || !authUser.user) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create user account',
        500,
        { error: authError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Get Module 1 ID (default module)
    const { data: module1 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .eq('is_default', true)
      .single();

    if (!module1) {
      // Rollback: Delete auth user if module not found
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'System configuration error: Default module not found',
        500,
        null,
        { request_id: requestId }
      );
    }

    // Create company record
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: body.company_name,
        billing_email: body.email.toLowerCase(),
        subscription_tier: 'core',
        is_active: true,
      })
      .select()
      .single();

    if (companyError || !company) {
      // Rollback: Delete auth user if company creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create company',
        500,
        { error: companyError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Create user record (link to auth.users - id = auth.users.id)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id, // Link to auth.users.id
        email: body.email.toLowerCase(),
        full_name: body.full_name,
        company_id: company.id,
        email_verified: false, // Will be updated by auth trigger when email is verified
        is_active: true,
      })
      .select()
      .single();

    if (userError || !user) {
      // Rollback: Delete company and auth user
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create user record',
        500,
        { error: userError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Create user_roles record (role = 'OWNER')
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'OWNER',
        assigned_by: user.id, // Self-assigned for first user
      });

    if (roleError) {
      // Rollback: Delete user, company, and auth user
      await supabaseAdmin.from('users').delete().eq('id', user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to assign user role',
        500,
        { error: roleError.message },
        { request_id: requestId }
      );
    }

    // Create module_activation for Module 1 (default module)
    const { error: moduleActivationError } = await supabaseAdmin
      .from('module_activations')
      .insert({
        company_id: company.id,
        module_id: module1.id,
        status: 'ACTIVE',
        activated_by: user.id,
        billing_start_date: new Date().toISOString().split('T')[0],
      });

    if (moduleActivationError) {
      // Rollback: Delete user_roles, user, company, and auth user
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id);
      await supabaseAdmin.from('users').delete().eq('id', user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to activate default module',
        500,
        { error: moduleActivationError.message },
        { request_id: requestId }
      );
    }

    // Get session tokens (if email verification is not required, user can log in immediately)
    // Note: Supabase Auth sends verification email automatically if email confirmation is enabled
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    // If email verification is required, user needs to verify email before getting tokens
    // For now, we'll return the user data but tokens will be null until email is verified
    // The frontend should handle redirecting to email verification page

    // Try to get session (will only work if email verification is disabled)
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email.toLowerCase(),
      password: body.password,
    });

    if (sessionData?.session) {
      accessToken = sessionData.session.access_token;
      refreshToken = sessionData.session.refresh_token;
    }

    // Return success response
    return successResponse(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: accessToken ? 86400 : null, // 24 hours in seconds
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          company_id: user.company_id,
          email_verified: user.email_verified,
        },
        // If email verification is required, include message
        ...(authUser.user.email_confirmed_at === null && {
          message: 'Please check your email to verify your account before logging in.',
        }),
      },
      201,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

