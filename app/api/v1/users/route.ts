/**
 * Users Endpoints
 * GET /api/v1/users - List users (RLS filtered)
 * POST /api/v1/users - Create/invite user
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { sendEmail } from '@/lib/services/email-service';
import { userInvitationEmail } from '@/lib/templates/email-templates';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's company access
    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, company_id, phone, email_verified, is_active, created_at, updated_at')
      .is('deleted_at', null); // Only non-deleted users

    // Apply filters
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: users, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch users',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = users && users.length > limit;
    const results = hasMore ? users.slice(0, limit) : users || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    return paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get users error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Email is required',
        422,
        { email: 'Email is required' },
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

    // Validate password if provided (for direct user creation)
    if (body.password && body.password.length < 8) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Password must be at least 8 characters',
        422,
        { password: 'Password must be at least 8 characters long' },
        { request_id: requestId }
      );
    }

    // Use user's company_id if not provided
    const companyId = body.company_id || user.company_id;

    // Get company name and inviter name for email
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    // Verify user has access to this company
    if (body.company_id && body.company_id !== user.company_id && !user.is_consultant) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'You do not have access to this company',
        403,
        null,
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
        { email: 'This email is already registered' },
        { request_id: requestId }
      );
    }

    // Create Supabase Auth user (if password provided)
    let authUserId: string | null = null;
    if (body.password) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        password: body.password,
        email_confirm: false, // Email verification will be handled separately
        user_metadata: {
          full_name: body.full_name,
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

      authUserId = authUser.user.id;
    }

    // Create user record
    const userData: any = {
      id: authUserId || undefined, // Link to auth.users.id if created
      email: body.email.toLowerCase(),
      full_name: body.full_name || null,
      company_id: companyId,
      phone: body.phone || null,
      email_verified: false,
      is_active: true,
    };

    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select('id, email, full_name, company_id, created_at')
      .single();

    if (userError || !newUser) {
      // Rollback: Delete auth user if created
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create user record',
        500,
        { error: userError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Send invitation email (if no password provided = invitation)
    if (!body.password) {
      try {
        const baseUrl = env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.oblicore.com';
        const invitationUrl = `${baseUrl}/signup?email=${encodeURIComponent(newUser.email)}&company_id=${companyId}`;
        
        const emailTemplate = userInvitationEmail({
          recipient_email: newUser.email,
          inviter_name: user.full_name || undefined,
          company_name: company?.name || 'Your Company',
          invitation_url: invitationUrl,
          expires_in_days: 7,
        });

        const emailResult = await sendEmail({
          to: newUser.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        if (!emailResult.success) {
          console.error(`Failed to send invitation email to ${newUser.email}:`, emailResult.error);
          // Don't fail user creation, just log the error
        }
      } catch (emailError: any) {
        console.error(`Error sending invitation email to ${newUser.email}:`, emailError);
        // Don't fail user creation, just log the error
      }
    }

    const response = successResponse(newUser, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create user error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

