/**
 * Escalation Workflows API Endpoints
 * GET /api/v1/escalation-workflows - List escalation workflows
 * POST /api/v1/escalation-workflows - Create escalation workflow
 * Reference: docs/specs/40_Backend_API_Specification.md Section 18
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes, paginatedResponse } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams } from '@/lib/api/pagination';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { limit, cursor } = parsePaginationParams(request);
    const searchParams = request.nextUrl.searchParams;

    // Build query
    let query = supabaseAdmin
      .from('escalation_workflows')
      .select('*', { count: 'exact' })
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (searchParams.get('filter[is_active]') !== null) {
      const isActive = searchParams.get('filter[is_active]') === 'true';
      query = query.eq('is_active', isActive);
    }

    if (searchParams.get('filter[obligation_category]') !== null) {
      const category = searchParams.get('filter[obligation_category]');
      if (category === 'null') {
        query = query.is('obligation_category', null);
      } else {
        query = query.eq('obligation_category', category);
      }
    }

    // Apply limit
    query = query.limit(limit);

    const { data: workflows, error, count } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch escalation workflows',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = paginatedResponse(
      workflows || [],
      cursor || undefined,
      limit,
      (workflows || []).length === limit,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get escalation workflows error:', error);
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

    const body = await request.json();

    // Validate required fields
    if (!body.level_1_days || !body.level_2_days || !body.level_3_days || !body.level_4_days) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: level_1_days, level_2_days, level_3_days, level_4_days',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Validate recipients arrays
    const recipients = [
      body.level_1_recipients || [],
      body.level_2_recipients || [],
      body.level_3_recipients || [],
      body.level_4_recipients || [],
    ];

    // Verify all recipient user IDs exist and belong to company
    for (const recipientList of recipients) {
      if (recipientList.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id')
          .in('id', recipientList)
          .eq('company_id', user.company_id)
          .eq('is_active', true)
          .is('deleted_at', null);

        if (usersError || !users || users.length !== recipientList.length) {
          return errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid recipient user IDs. All recipients must be active users in your company.',
            400,
            null,
            { request_id: requestId }
          );
        }
      }
    }

    // Create escalation workflow
    const { data: workflow, error } = await supabaseAdmin
      .from('escalation_workflows')
      .insert({
        company_id: user.company_id,
        obligation_category: body.obligation_category || null,
        level_1_days: body.level_1_days,
        level_2_days: body.level_2_days,
        level_3_days: body.level_3_days,
        level_4_days: body.level_4_days,
        level_1_recipients: body.level_1_recipients || [],
        level_2_recipients: body.level_2_recipients || [],
        level_3_recipients: body.level_3_recipients || [],
        level_4_recipients: body.level_4_recipients || [],
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create escalation workflow',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(workflow, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create escalation workflow error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

