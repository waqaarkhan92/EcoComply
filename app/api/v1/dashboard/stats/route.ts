/**
 * Dashboard Stats API Endpoint
 * Provides real-time statistics for the dashboard
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // Get user's company
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const companyId = userData.company_id;

    // Get user's accessible sites
    const { data: userSites } = await supabaseAdmin
      .from('user_site_assignments')
      .select('site_id')
      .eq('user_id', user.id);

    const siteIds = userSites?.map(us => us.site_id) || [];

    // Get all sites for the company as fallback
    const { data: companySites } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // If user has no site assignments, use all company sites
    const finalSiteIds = siteIds.length > 0 ? siteIds : (companySites?.map(s => s.id) || []);

    // Parallel queries for better performance
    const [
      obligationsResult,
      overdueResult,
      dueSoonResult,
      completedThisMonthResult,
      documentsResult,
      evidenceResult,
      packsResult,
    ] = await Promise.all([
      // Total obligations
      supabaseAdmin
        .from('obligations')
        .select('id', { count: 'exact', head: true })
        .in('site_id', finalSiteIds)
        .is('deleted_at', null),

      // Overdue obligations
      supabaseAdmin
        .from('obligations')
        .select('id', { count: 'exact', head: true })
        .in('site_id', finalSiteIds)
        .eq('status', 'OVERDUE')
        .is('deleted_at', null),

      // Due soon (next 7 days)
      supabaseAdmin
        .from('deadlines')
        .select('id', { count: 'exact', head: true })
        .in('site_id', finalSiteIds)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .is('deleted_at', null),

      // Completed this month
      supabaseAdmin
        .from('deadlines')
        .select('id', { count: 'exact', head: true })
        .in('site_id', finalSiteIds)
        .eq('status', 'COMPLETED')
        .gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .is('deleted_at', null),

      // Total documents
      supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .in('site_id', finalSiteIds)
        .is('deleted_at', null),

      // Total evidence
      supabaseAdmin
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null),

      // Total packs
      supabaseAdmin
        .from('packs')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null),
    ]);

    // Get recent activity (last 5 obligations)
    const { data: recentObligations } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, status, created_at, site_id, sites!inner(name)')
      .in('site_id', finalSiteIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get upcoming deadlines (next 10)
    const { data: upcomingDeadlines } = await supabaseAdmin
      .from('deadlines')
      .select('id, due_date, obligation_id, site_id, obligations!inner(id, obligation_title), sites!inner(id, name)')
      .in('site_id', finalSiteIds)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(10);

    const stats = {
      totals: {
        sites: finalSiteIds.length,
        obligations: obligationsResult.count || 0,
        overdue: overdueResult.count || 0,
        due_soon: dueSoonResult.count || 0,
        completed_this_month: completedThisMonthResult.count || 0,
        documents: documentsResult.count || 0,
        evidence: evidenceResult.count || 0,
        packs: packsResult.count || 0,
      },
      recent_activity: recentObligations || [],
      upcoming_deadlines: upcomingDeadlines || [],
    };

    return successResponse(stats, 200);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch dashboard stats',
      500,
      { error: error.message }
    );
  }
}
