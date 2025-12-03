/**
 * Compliance Clock Dashboard Endpoint
 * GET /api/v1/compliance-clocks/dashboard - Get aggregated dashboard metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id') || user.company_id;
    const siteId = searchParams.get('site_id');

    // Build query for dashboard metrics
    let query = supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id, status, criticality, days_remaining, clock_name, entity_type, target_date, module_id')
      .eq('company_id', companyId);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: clocks, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch compliance clocks',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Calculate aggregated metrics
    const totalClocks = clocks?.length || 0;
    const overdueCount = clocks?.filter((c: any) => c.status === 'OVERDUE').length || 0;
    const upcomingCount = clocks?.filter((c: any) => c.status === 'ACTIVE' && c.days_remaining <= 30 && c.days_remaining > 0).length || 0;
    const redCount = clocks?.filter((c: any) => c.criticality === 'RED').length || 0;
    const amberCount = clocks?.filter((c: any) => c.criticality === 'AMBER').length || 0;
    const greenCount = clocks?.filter((c: any) => c.criticality === 'GREEN').length || 0;

    // Get most urgent clocks (top 10)
    const urgentClocks = (clocks || [])
      .filter((c: any) => c.status === 'ACTIVE' || c.status === 'OVERDUE')
      .sort((a: any, b: any) => a.days_remaining - b.days_remaining)
      .slice(0, 10)
      .map((c: any) => ({
        id: c.id,
        clock_name: c.clock_name,
        entity_type: c.entity_type,
        days_remaining: c.days_remaining,
        criticality: c.criticality,
        status: c.status,
        target_date: c.target_date,
      }));

    const response = successResponse(
      {
        total_clocks: totalClocks,
        overdue_count: overdueCount,
        upcoming_count: upcomingCount,
        criticality_breakdown: {
          red: redCount,
          amber: amberCount,
          green: greenCount,
        },
        urgent_clocks: urgentClocks,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/compliance-clocks/dashboard:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

