/**
 * User Activity Reports API
 * GET /api/v1/reports/user-activity - Get user activity report
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 13
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
    const user_id = searchParams.get('user_id') || user.id;
    const site_id = searchParams.get('site_id');
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);

    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 30);

    // Get user info
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .eq('id', user_id)
      .eq('company_id', user.company_id)
      .single();

    if (userError || !targetUser) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Get activity feed for user
    let activityQuery = supabaseAdmin
      .from('activity_feed')
      .select('activity_type, created_at, entity_type')
      .eq('company_id', user.company_id)
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    if (site_id) {
      activityQuery = activityQuery.eq('site_id', site_id);
    }

    const { data: activities } = await activityQuery;

    // Get obligations completed by user
    const { data: completedObligations } = await supabaseAdmin
      .from('deadlines')
      .select('id, completed_at')
      .eq('completed_by', user_id)
      .gte('completed_at', startDate.toISOString());

    // Get evidence uploaded by user
    const { data: uploadedEvidence } = await supabaseAdmin
      .from('evidence_items')
      .select('id, created_at')
      .eq('uploaded_by', user_id)
      .gte('created_at', startDate.toISOString());

    // Get audit log entries
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action, created_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    // Aggregate by activity type
    const activityByType: Record<string, number> = {};
    for (const activity of activities || []) {
      activityByType[activity.activity_type] = (activityByType[activity.activity_type] || 0) + 1;
    }

    // Aggregate by day
    const activityByDay: Record<string, number> = {};
    for (const activity of activities || []) {
      const day = activity.created_at.split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    }

    const summary = {
      user_id: targetUser.id,
      user_name: targetUser.full_name,
      user_email: targetUser.email,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      },
      totals: {
        total_actions: activities?.length || 0,
        obligations_completed: completedObligations?.length || 0,
        evidence_uploaded: uploadedEvidence?.length || 0,
        audit_log_entries: auditLogs?.length || 0,
      },
      by_activity_type: activityByType,
      by_day: Object.entries(activityByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };

    const response = successResponse(
      { data: summary },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error generating user activity report:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
