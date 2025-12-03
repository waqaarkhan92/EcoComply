/**
 * User Sites Endpoints
 * GET /api/v1/users/{userId}/sites - List sites assigned to user
 * POST /api/v1/users/{userId}/sites - Assign site to user
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ userId: string } }
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

    // Users can view their own sites, or Admins can view any user's sites in their company
    if (userId !== currentUser.id && !currentUser.roles.includes('OWNER') && !currentUser.roles.includes('ADMIN')) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
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

    // Get user's site assignments with site details
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('user_site_assignments')
      .select(`
        site_id,
        assigned_at,
        sites (
          id,
          name,
          company_id
        )
      `)
      .eq('user_id', user.id);

    if (assignmentsError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch site assignments',
        500,
        { error: assignmentsError.message },
        { request_id: requestId }
      );
    }

    const sites = (assignments || []).map((assignment: any) => ({
      id: assignment.site_id,
      site_id: assignment.site_id,
      site_name: assignment.sites?.name || 'Unknown Site',
      assigned_at: assignment.assigned_at,
    }));

    const response = successResponse(sites, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, currentUser.id, response);
  } catch (error: any) {
    console.error('Get user sites error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(
  request: NextRequest, props: { params: Promise<{ userId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: currentUser } = authResult;

    const { userId } = params;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.site_id || typeof body.site_id !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Site ID is required',
        422,
        { site_id: 'Site ID is required' },
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

    // Check if site exists and belongs to same company
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', body.site_id)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify site belongs to same company
    if (site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Site does not belong to the same company as the user',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('user_site_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_id', body.site_id)
      .single();

    if (existingAssignment) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        'User is already assigned to this site',
        409,
        { site_id: 'User is already assigned to this site' },
        { request_id: requestId }
      );
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('user_site_assignments')
      .insert({
        user_id: userId,
        site_id: body.site_id,
        assigned_at: new Date().toISOString(),
      })
      .select('site_id, assigned_at')
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to assign site to user',
        500,
        { error: assignmentError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: assignment.site_id,
        site_id: assignment.site_id,
        assigned_at: assignment.assigned_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, currentUser.id, response);
  } catch (error: any) {
    console.error('Assign site to user error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
