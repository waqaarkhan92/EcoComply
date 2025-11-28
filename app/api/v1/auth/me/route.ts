/**
 * Get Current User Endpoint
 * GET /api/v1/auth/me
 * 
 * Get current authenticated user details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // Get full user details from database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, company_id, email_verified, is_active, created_at')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404,
        { error: userError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Get user roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    // Get user's assigned sites
    const { data: siteAssignments } = await supabaseAdmin
      .from('user_site_assignments')
      .select('site_id')
      .eq('user_id', user.id);

    // Return user data
    return successResponse(
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        company_id: userData.company_id,
        roles: roles?.map((r: { role: string }) => r.role) || [],
        sites: siteAssignments?.map((s: { site_id: string }) => s.site_id) || [],
        email_verified: userData.email_verified,
        is_active: userData.is_active,
        created_at: userData.created_at,
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get current user error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

