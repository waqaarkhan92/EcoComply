/**
 * Site Dashboard Endpoint
 * GET /api/v1/sites/{siteId}/dashboard - Get site dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { siteId } = params;

    // Verify site exists and user has access
  const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, name, company_id, regulator, is_active')
      .eq('id', siteId)
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

    // Verify user has access to this company
    if (site.company_id !== user.company_id) {
      // Check consultant access
      const { data: consultantAccess } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', site.company_id)
        .eq('status', 'ACTIVE')
        .single();

      if (!consultantAccess) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Get dashboard statistics
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Count overdue obligations
    const { count: overdueCount } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'OVERDUE')
      .is('deleted_at', null);

    // Count due_soon obligations
    const { count: dueSoonCount } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'DUE_SOON')
      .is('deleted_at', null);

    // Count total obligations
    const { count: totalObligationsCount } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .is('deleted_at', null);

    // Count completed obligations (on track / compliant)
    const { count: completedObligationsCount } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .in('status', ['COMPLETED', 'PENDING', 'IN_PROGRESS'])
      .is('deleted_at', null);

    // Count total documents for this site
    const { count: totalDocsCount } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .is('deleted_at', null);

    // Count pending review documents
    const { count: pendingReviewDocsCount } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .in('extraction_status', ['PENDING', 'REVIEW_REQUIRED'])
      .is('deleted_at', null);

    // Count approved documents
    const { count: approvedDocsCount } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('extraction_status', 'COMPLETED')
      .is('deleted_at', null);

    // Get upcoming deadlines with obligation details
    const { data: upcomingDeadlines } = await supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        status,
        obligations:obligation_id (
          id,
          obligation_title
        )
      `)
      .eq('site_id', siteId)
      .in('status', ['PENDING', 'DUE_SOON'])
      .gte('due_date', now.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(10);

    // Get recent activity (last 10 obligations)
    const { data: recentObligations } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, status, created_at')
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate compliance score
    const totalObligations = totalObligationsCount || 0;
    const completed = completedObligationsCount || 0;
    const overdue = overdueCount || 0;
    // Compliant = total minus overdue minus due_soon
    const compliant = Math.max(0, totalObligations - overdue - (dueSoonCount || 0));
    const complianceScore = totalObligations > 0
      ? Math.round(((totalObligations - overdue) / totalObligations) * 100)
      : 100;

    // Determine compliance status
    let complianceStatus = 'COMPLIANT';
    if (overdue > 0) {
      complianceStatus = 'NON_COMPLIANT';
    } else if ((dueSoonCount || 0) > 0) {
      complianceStatus = 'AT_RISK';
    }

    // Transform upcoming_deadlines for frontend
    const transformedDeadlines = (upcomingDeadlines || []).map((d: any) => ({
      id: d.id,
      obligation_id: d.obligations?.id || '',
      obligation_title: d.obligations?.obligation_title || 'Unknown',
      due_date: d.due_date,
      status: d.status,
    }));

    const response = successResponse(
      {
        site: {
          id: site.id,
          name: site.name,
          regulator: site.regulator,
          is_active: site.is_active,
        },
        // New structure that matches frontend expectations
        obligations: {
          total: totalObligations,
          overdue: overdue,
          due_soon: dueSoonCount || 0,
          compliant: compliant,
        },
        documents: {
          total: totalDocsCount || 0,
          pending_review: pendingReviewDocsCount || 0,
          approved: approvedDocsCount || 0,
        },
        upcoming_deadlines: transformedDeadlines,
        // Keep legacy structure for backwards compatibility
        statistics: {
          total_obligations: totalObligations,
          completed_obligations: completed,
          overdue_obligations: overdue,
          upcoming_deadlines: transformedDeadlines.length,
          compliance_score: complianceScore,
          compliance_status: complianceStatus,
        },
        recent_activity: recentObligations || [],
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get site dashboard error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
