/**
 * Consultant Dashboard Endpoint
 * GET /api/v1/consultant/dashboard
 * 
 * Returns aggregated dashboard data for consultant across all assigned clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Consultant role
    const authResult = await requireRole(request, ['CONSULTANT']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get all active client assignments
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .select('client_company_id, assigned_at, status')
      .eq('consultant_id', user.id)
      .eq('status', 'ACTIVE');

    if (assignmentsError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch client assignments',
        500,
        { error: assignmentsError.message },
        { request_id: requestId }
      );
    }

    const clientCompanyIds = assignments?.map(a => a.client_company_id) || [];

    if (clientCompanyIds.length === 0) {
      // No clients assigned - return empty dashboard
      const emptyResponse = successResponse(
        {
          total_clients: 0,
          active_clients: 0,
          total_sites: 0,
          compliance_overview: {
            total_obligations: 0,
            overdue_count: 0,
            approaching_deadline_count: 0,
            avg_compliance_score: 0,
          },
          recent_activity: [],
          upcoming_deadlines: [],
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, emptyResponse);
    }

    // Get client companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .in('id', clientCompanyIds);

    if (companiesError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch client companies',
        500,
        { error: companiesError.message },
        { request_id: requestId }
      );
    }

    // Get total sites across all clients
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .in('company_id', clientCompanyIds);

    if (sitesError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch sites',
        500,
        { error: sitesError.message },
        { request_id: requestId }
      );
    }

    const siteIds = sites?.map(s => s.id) || [];

    // Get aggregated obligations data
    let totalObligations = 0;
    let overdueCount = 0;
    let approachingDeadlineCount = 0;
    let complianceScores: number[] = [];

    if (siteIds.length > 0) {
      // Get obligations for all client sites
      const { data: obligations, error: obligationsError } = await supabaseAdmin
        .from('obligations')
        .select('id, status, deadline_date')
        .in('site_id', siteIds);

      if (!obligationsError && obligations) {
        totalObligations = obligations.length;
        overdueCount = obligations.filter(o => o.status === 'OVERDUE').length;
        
        // Count approaching deadlines (next 7 days)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        approachingDeadlineCount = obligations.filter(o => {
          if (!o.deadline_date) return false;
          const deadline = new Date(o.deadline_date);
          return deadline <= sevenDaysFromNow && deadline >= new Date() && o.status !== 'COMPLETED';
        }).length;
      }

      // Calculate compliance scores per site (simplified - can be enhanced)
      // For now, use a simple calculation: (completed + in_progress) / total
      if (obligations && obligations.length > 0) {
        const sitesWithObligations = new Set(obligations.map(o => o.site_id));
        for (const siteId of sitesWithObligations) {
          const siteObligations = obligations.filter(o => o.site_id === siteId);
          const completed = siteObligations.filter(o => o.status === 'COMPLETED').length;
          const inProgress = siteObligations.filter(o => o.status === 'IN_PROGRESS').length;
          const score = siteObligations.length > 0 
            ? (completed + inProgress * 0.5) / siteObligations.length 
            : 0;
          complianceScores.push(score);
        }
      }
    }

    const avgComplianceScore = complianceScores.length > 0
      ? complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length
      : 0;

    // Get recent activity (pack generations, document uploads)
    const { data: recentPacks, error: packsError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, company_id, pack_type, created_at')
      .in('company_id', clientCompanyIds)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentActivity = (recentPacks || []).map(pack => {
      const company = companies?.find(c => c.id === pack.company_id);
      return {
        client_company_id: pack.company_id,
        client_name: company?.name || 'Unknown Client',
        activity_type: 'PACK_GENERATED',
        activity_description: `${pack.pack_type.replace(/_/g, ' ')} pack generated`,
        timestamp: pack.created_at,
      };
    });

    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingDeadlines, error: deadlinesError } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, deadline_date, site_id')
      .in('site_id', siteIds)
      .gte('deadline_date', new Date().toISOString().split('T')[0])
      .lte('deadline_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .neq('status', 'COMPLETED')
      .order('deadline_date', { ascending: true })
      .limit(20);

    const deadlinesWithClient = (upcomingDeadlines || []).map(deadline => {
      const site = sites?.find(s => s.id === deadline.site_id);
      const company = companies?.find(c => c.id === site?.company_id);
      return {
        client_company_id: site?.company_id,
        client_name: company?.name || 'Unknown Client',
        deadline_date: deadline.deadline_date,
        obligation_title: deadline.obligation_title,
      };
    });

    const response = successResponse(
      {
        total_clients: clientCompanyIds.length,
        active_clients: clientCompanyIds.length, // All assignments are ACTIVE
        total_sites: siteIds.length,
        compliance_overview: {
          total_obligations: totalObligations,
          overdue_count: overdueCount,
          approaching_deadline_count: approachingDeadlineCount,
          avg_compliance_score: Math.round(avgComplianceScore * 100) / 100,
        },
        recent_activity: recentActivity,
        upcoming_deadlines: deadlinesWithClient,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Consultant dashboard error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

