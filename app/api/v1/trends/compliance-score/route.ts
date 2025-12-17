/**
 * Compliance Score Trends API
 * GET /api/v1/trends/compliance-score - Get compliance score trends over time
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 12
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
    const period = searchParams.get('period') || '30d';
    const granularity = searchParams.get('granularity') || 'daily';

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);

    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 30);

    // Get compliance score history from risk history table
    let query = supabaseAdmin
      .from('compliance_risk_history')
      .select('risk_score, risk_level, recorded_at, site_id')
      .eq('company_id', user.company_id)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: history, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch trends',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Aggregate by granularity
    const aggregated: Record<string, { scores: number[]; date: string }> = {};

    for (const record of history || []) {
      let key: string;
      const date = new Date(record.recorded_at);

      if (granularity === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!aggregated[key]) {
        aggregated[key] = { scores: [], date: key };
      }
      // Convert risk score to compliance score (inverse relationship)
      const complianceScore = 100 - record.risk_score;
      aggregated[key].scores.push(complianceScore);
    }

    // Calculate averages
    const trends = Object.entries(aggregated)
      .map(([date, data]) => ({
        date,
        score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        data_points: data.scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend direction
    let trend_direction = 'stable';
    if (trends.length >= 2) {
      const recentAvg = trends.slice(-3).reduce((a, b) => a + b.score, 0) / Math.min(3, trends.length);
      const olderAvg = trends.slice(0, 3).reduce((a, b) => a + b.score, 0) / Math.min(3, trends.length);
      if (recentAvg > olderAvg + 5) trend_direction = 'improving';
      else if (recentAvg < olderAvg - 5) trend_direction = 'declining';
    }

    const response = successResponse(
      {
        data: trends,
        period,
        granularity,
        trend_direction,
        site_id: site_id || 'all',
        start_date: startDate.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching compliance score trends:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
