/**
 * Evidence Gaps API
 * GET /api/v1/evidence-gaps - List evidence gaps with filters
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);

    const site_id = searchParams.get('site_id');
    const severity = searchParams.get('severity');
    const gap_type = searchParams.get('gap_type');
    const resolved = searchParams.get('resolved');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('evidence_gaps')
      .select(`
        id,
        company_id,
        site_id,
        obligation_id,
        deadline_id,
        gap_type,
        days_until_deadline,
        severity,
        detected_at,
        resolved_at,
        notified_at,
        dismissed_at,
        dismiss_reason,
        created_at,
        obligations(
          id,
          obligation_title,
          obligation_description,
          category
        ),
        sites(
          id,
          name
        ),
        deadlines(
          id,
          due_date
        )
      `, { count: 'exact' })
      .eq('company_id', user.company_id)
      .order('severity', { ascending: true })
      .order('days_until_deadline', { ascending: true })
      .range(offset, offset + limit - 1);

    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    if (severity) {
      query = query.eq('severity', severity.toUpperCase());
    }

    if (gap_type) {
      query = query.eq('gap_type', gap_type.toUpperCase());
    }

    if (resolved === 'true') {
      query = query.not('resolved_at', 'is', null);
    } else if (resolved === 'false') {
      query = query.is('resolved_at', null).is('dismissed_at', null);
    }

    const { data: gaps, error, count } = await query;

    if (error) {
      console.error('Error fetching evidence gaps:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence gaps',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        data: gaps,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in evidence gaps API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
