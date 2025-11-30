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
import { supabaseAdmin, supabase } from '@/lib/supabase/server';
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
    // Parse request body - handle potential JSON parsing errors
    let body: SignupRequest;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        422,
        { error: jsonError.message || 'Request body must be valid JSON' },
        { request_id: requestId }
      );
    }

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

    // Check if user exists in Supabase Auth FIRST (this is the source of truth)
    // This handles orphaned users (exist in Auth but not in our DB)
    const emailLower = body.email.toLowerCase();
    console.log(`[SIGNUP] Checking for existing user: ${emailLower}`);
    
    const { data: authUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    if (listUsersError) {
      console.error('[SIGNUP] Error listing users:', listUsersError);
    }
    
    const existingAuthUser = authUsers?.users.find(u => u.email?.toLowerCase() === emailLower);
    
    if (existingAuthUser) {
      console.log(`[SIGNUP] Found user in Auth: ${existingAuthUser.id}, email: ${existingAuthUser.email}`);
      
      // Check if user also exists in our database
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();
      
      if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[SIGNUP] Error checking user in database:', userCheckError);
      }
      
      if (existingUser) {
        // User exists in both Auth and DB - truly exists
        console.log('[SIGNUP] User exists in both Auth and DB - rejecting signup');
        return errorResponse(
          ErrorCodes.ALREADY_EXISTS,
          'This email is already registered. Please try logging in instead.',
          409,
          { email: 'Email already exists' },
          { request_id: requestId }
        );
      } else {
        // User exists in Auth but NOT in our DB - orphaned user
        // Delete it so we can recreate properly
        console.warn(`[SIGNUP] Found orphaned auth user (${existingAuthUser.id}), deleting to allow recreation...`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
        if (deleteError) {
          console.error('[SIGNUP] Failed to delete orphaned user:', deleteError);
          // Try to continue anyway - maybe the create will work
          console.warn('[SIGNUP] Continuing despite delete error - will attempt to create user');
        } else {
          console.log('[SIGNUP] ✅ Orphaned auth user deleted successfully');
        }
      }
    } else {
      // User doesn't exist in Auth - check DB just to be safe
      console.log('[SIGNUP] User not found in Auth, checking database...');
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();
      
      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('[SIGNUP] Error checking user in database:', userCheckError);
      }
      
      if (existingUser) {
        // User exists in DB but not in Auth - this shouldn't happen, but handle it
        console.warn('[SIGNUP] User exists in DB but not in Auth - this is unusual');
        return errorResponse(
          ErrorCodes.ALREADY_EXISTS,
          'This email is already registered. Please try logging in instead.',
          409,
          { email: 'Email already exists' },
          { request_id: requestId }
        );
      }
      console.log('[SIGNUP] User does not exist in Auth or DB - proceeding with creation');
    }

    // Create Supabase Auth user using admin API (bypasses email validation)
    // In test/development environment, auto-confirm email to allow immediate login
    const isTestEnv = process.env.NODE_ENV === 'test' || 
                      process.env.NODE_ENV === 'development' || 
                      process.env.DISABLE_EMAIL_VERIFICATION === 'true';
    
    console.log('[SIGNUP] Attempting to create auth user...');
    console.log('[SIGNUP] Email:', body.email.toLowerCase());
    console.log('[SIGNUP] Is test env:', isTestEnv);
    console.log('[SIGNUP] Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
    
    // Use regular client (anon key) for signUp - service role causes "Database error granting user"
    // Service role bypasses normal auth flows and can cause permission errors
    // Try signUp without any options first to avoid Supabase internal errors
    let signUpData: any = null;
    let signUpError: any = null;
    
    try {
      const result = await supabase.auth.signUp({
        email: body.email.toLowerCase(),
        password: body.password,
        options: {
          data: {
            full_name: body.full_name,
            company_name: body.company_name,
          },
        },
      });
      
      signUpData = result.data;
      signUpError = result.error;
    } catch (err: any) {
      console.error('[SIGNUP] SignUp exception:', err);
      signUpError = {
        message: err.message || 'Failed to create user',
        status: 500,
      };
    }
    
    const authUser = signUpData;
    const authError = signUpError;

    if (authError) {
      console.error('[SIGNUP] ========== AUTH ERROR ==========');
      console.error('[SIGNUP] Error code:', authError.status);
      console.error('[SIGNUP] Error message:', authError.message);
      console.error('[SIGNUP] Error name:', authError.name);
      console.error('[SIGNUP] Full error object:', JSON.stringify(authError, null, 2));
      console.error('[SIGNUP] Error stack:', authError.stack);
      console.error('[SIGNUP] =================================');
      
      // Check if user already exists
      if (authError?.message?.includes('already registered') || 
          authError?.message?.includes('already exists') ||
          authError?.message?.includes('Database error creating new user') ||
          authError?.status === 422) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `This email is already registered or invalid. Error: ${authError.message}`,
          409,
          { email: 'Email already exists', supabase_error: authError.message },
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to create user account. Supabase error: ${authError.message || 'Unknown error'}`,
        500,
        { error: authError.message || 'Unknown error', status: authError.status },
        { request_id: requestId }
      );
    }
    
    if (!authUser?.user) {
      console.error('[SIGNUP] No user returned from createUser');
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create user account: No user returned',
        500,
        { error: 'No user returned from Supabase' },
        { request_id: requestId }
      );
    }
    
    console.log('[SIGNUP] ✅ Auth user created:', authUser.user.id);

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
    // Use service role client to bypass RLS during signup
    // Note: Even with service role, RLS policies may still be evaluated
    // The policy should allow INSERT when user doesn't exist yet (signup case)
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
    // In test environment, mark email as verified immediately
    // Note: We insert without email_verified first, then update it, to avoid conflicts with Supabase functions
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id, // Link to auth.users.id
        email: body.email.toLowerCase(),
        full_name: body.full_name,
        company_id: company.id,
        email_verified: false, // Set to false initially, then update
        is_active: true,
      })
      .select()
      .single();

    // Update email_verified after user record is created (avoids conflicts with Supabase functions)
    if (user && !userError) {
      await supabaseAdmin
        .from('users')
        .update({
          email_verified: isTestEnv || authUser.user.email_confirmed_at !== null,
        })
        .eq('id', user.id);
    }

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

    // Generate session tokens for the newly created user
    // In development/test mode, we auto-confirm email so we can get tokens immediately
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    // If email is auto-confirmed, try to sign in to get tokens
    // Use regular client (not admin) for signInWithPassword
    if (isTestEnv || process.env.NODE_ENV === 'development') {
      // Wait a moment for Supabase to process the user creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use regular client (anon key) for sign in, not service role
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: body.email.toLowerCase(),
        password: body.password,
      });

      if (loginData?.session) {
        accessToken = loginData.session.access_token;
        refreshToken = loginData.session.refresh_token;
        console.log('[SIGNUP] ✅ Successfully got session tokens');
      } else if (loginError) {
        console.warn('[SIGNUP] Failed to get tokens after signup:', loginError.message);
        // User was created successfully, but we couldn't get tokens
        // Frontend will need to redirect to login page
      }
    } else {
      // Production mode - email verification required
      console.log('[SIGNUP] Email verification required - no tokens generated');
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


