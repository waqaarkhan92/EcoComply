/**
 * Consultant Client Details Endpoint
 * GET /api/v1/consultant/clients/{clientId}
 * 
 * Get client company details and compliance summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Consultant role
    const authResult = await requireRole(request, ['CONSULTANT']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { clientId } = params;

    // Verify consultant has access to this client
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .select('client_company_id, status')
      .eq('consultant_id', user.id)
      .eq('client_company_id', clientId)
      .eq('status', 'ACTIVE')
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Consultant not assigned to this client',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Get client company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, subscription_tier')
      .eq('id', clientId)
      .single();

    if (companyError || !company) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Client company not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get sites
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('id, name, company_id')
      .eq('company_id', clientId);

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

    // Get compliance summary
    let totalObligations = 0;
    let overdueCount = 0;
    let approachingDeadlineCount = 0;
    let complianceScore = 0;

    if (siteIds.length > 0) {
      const { data: obligations, error: obligationsError } = await supabaseAdmin
        .from('obligations')
        .select('id, status, deadline_date')
        .in('site_id', siteIds);

      if (!obligationsError && obligations) {
        totalObligations = obligations.length;
        overdueCount = obligations.filter(o => o.status === 'OVERDUE').length;
        
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        approachingDeadlineCount = obligations.filter(o => {
          if (!o.deadline_date) return false;
          const deadline = new Date(o.deadline_date);
          return deadline <= sevenDaysFromNow && deadline >= new Date() && o.status !== 'COMPLETED';
        }).length;

        const completedCount = obligations.filter(o => o.status === 'COMPLETED').length;
        complianceScore = totalObligations > 0 ? completedCount / totalObligations : 0;
      }
    }

    // Get upcoming deadlines
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

    const deadlinesWithSite = (upcomingDeadlines || []).map(deadline => {
      const site = sites?.find(s => s.id === deadline.site_id);
      return {
        obligation_id: deadline.id,
        obligation_title: deadline.obligation_title,
        deadline_date: deadline.deadline_date,
        site_id: deadline.site_id,
        site_name: site?.name || 'Unknown Site',
      };
    });

    const response = successResponse(
      {
        company_id: company.id,
        company_name: company.name,
        subscription_tier: company.subscription_tier,
        site_count: sites?.length || 0,
        sites: sites || [],
        compliance_summary: {
          total_obligations: totalObligations,
          overdue_count: overdueCount,
          approaching_deadline_count: approachingDeadlineCount,
          compliance_score: Math.round(complianceScore * 100) / 100,
        },
        upcoming_deadlines: deadlinesWithSite,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get consultant client error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

