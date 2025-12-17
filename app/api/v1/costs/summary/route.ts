/**
 * Costs Summary API
 * GET /api/v1/costs/summary - Get aggregated cost summary
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 4
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
    const period = searchParams.get('period') || '12m'; // 1m, 3m, 6m, 12m
    const group_by = searchParams.get('group_by') || 'type'; // type, site, month

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);

    if (period === '1m') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === '3m') startDate.setMonth(startDate.getMonth() - 3);
    else if (period === '6m') startDate.setMonth(startDate.getMonth() - 6);
    else startDate.setMonth(startDate.getMonth() - 12);

    // Fetch costs
    let query = supabaseAdmin
      .from('obligation_costs')
      .select(`
        id,
        site_id,
        cost_type,
        amount,
        currency,
        incurred_date,
        sites(name)
      `)
      .eq('company_id', user.company_id)
      .gte('incurred_date', startDate.toISOString().split('T')[0]);

    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: costs, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch costs',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Calculate summary
    const total = costs?.reduce((sum, cost) => sum + parseFloat(cost.amount), 0) || 0;

    let breakdown: Record<string, any> = {};

    if (group_by === 'type') {
      breakdown = costs?.reduce((acc, cost) => {
        acc[cost.cost_type] = (acc[cost.cost_type] || 0) + parseFloat(cost.amount);
        return acc;
      }, {} as Record<string, number>) || {};
    } else if (group_by === 'site') {
      for (const cost of costs || []) {
        const siteName = (cost as any).sites?.name || 'Unknown';
        if (!breakdown[siteName]) {
          breakdown[siteName] = { total: 0, site_id: cost.site_id };
        }
        breakdown[siteName].total += parseFloat(cost.amount);
      }
    } else if (group_by === 'month') {
      for (const cost of costs || []) {
        const month = cost.incurred_date.substring(0, 7); // YYYY-MM
        breakdown[month] = (breakdown[month] || 0) + parseFloat(cost.amount);
      }
      // Sort by month
      breakdown = Object.fromEntries(
        Object.entries(breakdown).sort((a, b) => a[0].localeCompare(b[0]))
      );
    }

    const response = successResponse(
      {
        data: {
          total,
          currency: 'GBP',
          period,
          start_date: startDate.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
          count: costs?.length || 0,
          breakdown,
          group_by,
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching cost summary:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
