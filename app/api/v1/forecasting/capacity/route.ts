/**
 * Resource Forecasting - Capacity Analysis API
 * GET /api/v1/forecasting/capacity - Get capacity analysis
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
    const weeks_ahead = parseInt(searchParams.get('weeks_ahead') || '4');
    const hours_per_week = parseFloat(searchParams.get('hours_per_week') || '40');

    // Get team members count
    const { count: teamCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', user.company_id)
      .eq('is_active', true);

    const totalCapacityHours = (teamCount || 1) * hours_per_week * weeks_ahead;

    // Get upcoming deadlines
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + weeks_ahead * 7);

    const { data: deadlines } = await supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        obligations!inner(
          id,
          site_id,
          sites!inner(company_id)
        )
      `)
      .eq('obligations.sites.company_id', user.company_id)
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .in('status', ['PENDING', 'IN_PROGRESS']);

    // Get historical completion metrics
    const { data: metrics } = await supabaseAdmin
      .from('obligation_completion_metrics')
      .select('time_to_complete_hours')
      .eq('company_id', user.company_id);

    const avgHours = metrics && metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.time_to_complete_hours || 2), 0) / metrics.length
      : 2;

    const totalEstimatedHours = (deadlines?.length || 0) * avgHours;
    const utilizationRate = totalCapacityHours > 0
      ? (totalEstimatedHours / totalCapacityHours) * 100
      : 0;

    // Determine capacity status
    let capacityStatus: 'UNDER_CAPACITY' | 'OPTIMAL' | 'AT_RISK' | 'OVER_CAPACITY';
    if (utilizationRate < 50) capacityStatus = 'UNDER_CAPACITY';
    else if (utilizationRate < 80) capacityStatus = 'OPTIMAL';
    else if (utilizationRate < 100) capacityStatus = 'AT_RISK';
    else capacityStatus = 'OVER_CAPACITY';

    const response = successResponse(
      {
        data: {
          capacity: {
            team_members: teamCount || 1,
            hours_per_week,
            weeks_ahead,
            total_capacity_hours: totalCapacityHours,
          },
          workload: {
            deadline_count: deadlines?.length || 0,
            estimated_hours: Math.round(totalEstimatedHours * 10) / 10,
            average_hours_per_deadline: Math.round(avgHours * 10) / 10,
          },
          analysis: {
            utilization_rate: Math.round(utilizationRate * 10) / 10,
            capacity_status: capacityStatus,
            surplus_hours: Math.max(0, totalCapacityHours - totalEstimatedHours),
            deficit_hours: Math.max(0, totalEstimatedHours - totalCapacityHours),
          },
          recommendations: getRecommendations(capacityStatus, utilizationRate, deadlines?.length || 0),
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error generating capacity analysis:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

function getRecommendations(status: string, utilization: number, deadlineCount: number): string[] {
  const recommendations: string[] = [];

  switch (status) {
    case 'UNDER_CAPACITY':
      recommendations.push('Consider proactive compliance reviews during available capacity');
      recommendations.push('Good time for process improvements or documentation updates');
      break;
    case 'OPTIMAL':
      recommendations.push('Current workload is well-balanced');
      recommendations.push('Monitor for any new obligations that may increase load');
      break;
    case 'AT_RISK':
      recommendations.push('Consider prioritizing critical deadlines');
      recommendations.push('Review if any tasks can be delegated or deferred');
      if (deadlineCount > 10) {
        recommendations.push('Consider batch processing similar obligations together');
      }
      break;
    case 'OVER_CAPACITY':
      recommendations.push('Immediate attention required - workload exceeds capacity');
      recommendations.push('Prioritize by risk level and regulatory importance');
      recommendations.push('Consider temporary resource allocation or consultant support');
      break;
  }

  return recommendations;
}
