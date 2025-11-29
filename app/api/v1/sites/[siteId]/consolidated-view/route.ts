/**
 * Site Consolidated View Endpoint
 * GET /api/v1/sites/{siteId}/consolidated-view - Get multi-site consolidated view
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { siteId } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeSitesParam = searchParams.get('include_sites');
    const includeSites = includeSitesParam ? includeSitesParam.split(',') : [];

    // Verify primary site exists and user has access
    const { data: primarySite, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, name, company_id')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single();

    if (siteError || !primarySite) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (primarySite.company_id !== user.company_id) {
      // Check consultant access
      const { data: consultantAccess } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', primarySite.company_id)
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

    // Get all sites to include (primary + additional)
    const allSiteIds = [siteId, ...includeSites].filter((id, index, self) => self.indexOf(id) === index);

    // Verify all sites belong to same company
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('id, name, company_id')
      .in('id', allSiteIds)
      .eq('company_id', primarySite.company_id)
      .is('deleted_at', null);

    if (sitesError || !sites || sites.length !== allSiteIds.length) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'One or more sites not found or do not belong to the same company',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Aggregate data across all sites
    const { count: totalObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', allSiteIds)
      .is('deleted_at', null);

    const { count: overdueObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', allSiteIds)
      .eq('status', 'OVERDUE')
      .is('deleted_at', null);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { count: dueSoonObligations } = await supabaseAdmin
      .from('deadlines')
      .select('id', { count: 'exact', head: true })
      .in('site_id', allSiteIds)
      .in('status', ['PENDING', 'DUE_SOON'])
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0]);

    const { count: completedObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', allSiteIds)
      .eq('status', 'COMPLETED')
      .is('deleted_at', null);

    // Get upcoming deadlines across all sites
    const { data: deadlines } = await supabaseAdmin
      .from('deadlines')
      .select('id, obligation_id, site_id, due_date, status')
      .in('site_id', allSiteIds)
      .in('status', ['PENDING', 'DUE_SOON'])
      .gte('due_date', now.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(20);

    // Determine overall compliance status
    let complianceStatus = 'COMPLIANT';
    if (overdueObligations && overdueObligations > 0) {
      complianceStatus = 'NON_COMPLIANT';
    } else if (dueSoonObligations && dueSoonObligations > 0) {
      complianceStatus = 'AT_RISK';
    }

    const response = successResponse(
      {
        primary_site_id: siteId,
        included_sites: allSiteIds,
        obligations: {
          total: totalObligations || 0,
          overdue: overdueObligations || 0,
          due_soon: dueSoonObligations || 0,
          completed: completedObligations || 0,
        },
        deadlines: deadlines || [],
        compliance_status: complianceStatus,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get consolidated view error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

