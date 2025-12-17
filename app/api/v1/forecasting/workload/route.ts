/**
 * Resource Forecasting - Workload API
 * GET /api/v1/forecasting/workload - Get forecasted workload hours
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 11
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
    const weeks_ahead = parseInt(searchParams.get('weeks_ahead') || '4');

    // Get upcoming deadlines
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + weeks_ahead * 7);

    let deadlinesQuery = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        status,
        obligations(
          id,
          title,
          site_id,
          sites(name)
        )
      `)
      .eq('obligations.sites.company_id', user.company_id)
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .in('status', ['PENDING', 'IN_PROGRESS']);

    if (site_id) {
      deadlinesQuery = deadlinesQuery.eq('obligations.site_id', site_id);
    }

    const { data: deadlines } = await deadlinesQuery;

    // Get historical completion metrics for average time estimates
    const { data: metrics } = await supabaseAdmin
      .from('obligation_completion_metrics')
      .select('obligation_id, time_to_complete_hours, complexity_score')
      .eq('company_id', user.company_id);

    // Calculate average time per obligation
    const avgTimeByObligation: Record<string, number> = {};
    const avgTimeGlobal: number[] = [];

    for (const metric of metrics || []) {
      if (metric.time_to_complete_hours) {
        avgTimeGlobal.push(metric.time_to_complete_hours);
        if (!avgTimeByObligation[metric.obligation_id]) {
          avgTimeByObligation[metric.obligation_id] = metric.time_to_complete_hours;
        } else {
          avgTimeByObligation[metric.obligation_id] =
            (avgTimeByObligation[metric.obligation_id] + metric.time_to_complete_hours) / 2;
        }
      }
    }

    const globalAvgHours = avgTimeGlobal.length > 0
      ? avgTimeGlobal.reduce((a, b) => a + b, 0) / avgTimeGlobal.length
      : 2; // Default 2 hours if no data

    // Group deadlines by week
    const weeklyWorkload: Record<string, { week_start: string; deadline_count: number; estimated_hours: number; deadlines: any[] }> = {};

    for (const deadline of deadlines || []) {
      const dueDate = new Date(deadline.due_date);
      const weekStart = getWeekStart(dueDate);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyWorkload[weekKey]) {
        weeklyWorkload[weekKey] = {
          week_start: weekKey,
          deadline_count: 0,
          estimated_hours: 0,
          deadlines: [],
        };
      }

      const obligationId = (deadline as any).obligations?.id;
      const estimatedHours = avgTimeByObligation[obligationId] || globalAvgHours;

      weeklyWorkload[weekKey].deadline_count++;
      weeklyWorkload[weekKey].estimated_hours += estimatedHours;
      weeklyWorkload[weekKey].deadlines.push({
        id: deadline.id,
        due_date: deadline.due_date,
        obligation_title: (deadline as any).obligations?.title,
        site_name: (deadline as any).obligations?.sites?.name,
        estimated_hours: estimatedHours,
      });
    }

    // Sort by week
    const forecast = Object.values(weeklyWorkload).sort((a, b) =>
      a.week_start.localeCompare(b.week_start)
    );

    const totalEstimatedHours = forecast.reduce((sum, week) => sum + week.estimated_hours, 0);
    const totalDeadlines = forecast.reduce((sum, week) => sum + week.deadline_count, 0);

    const response = successResponse(
      {
        data: {
          forecast,
          summary: {
            weeks_ahead,
            total_deadlines: totalDeadlines,
            total_estimated_hours: Math.round(totalEstimatedHours * 10) / 10,
            average_hours_per_week: Math.round((totalEstimatedHours / weeks_ahead) * 10) / 10,
          },
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error generating workload forecast:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
