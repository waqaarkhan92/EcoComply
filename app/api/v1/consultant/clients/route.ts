/**
 * Consultant Clients Endpoint
 * GET /api/v1/consultant/clients
 * 
 * List consultant's assigned clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, createCursor } from '@/lib/api/pagination';
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

    // Parse pagination params
    const { limit, cursor } = parsePaginationParams(request);
    const status = new URL(request.url).searchParams.get('status') || 'ACTIVE';

    // Get client assignments
    let query = supabaseAdmin
      .from('consultant_client_assignments')
      .select('client_company_id, assigned_at, status')
      .eq('consultant_id', user.id)
      .eq('status', status)
      .order('assigned_at', { ascending: false })
      .limit(limit + 1);

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch client assignments',
        500,
        { error: assignmentsError.message },
        { request_id: requestId }
      );
    }

    const hasMore = assignments && assignments.length > limit;
    const results = hasMore ? assignments.slice(0, limit) : assignments || [];

    // Get company names
    const companyIds = results.map((a: any) => a.client_company_id);
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .in('id', companyIds);

    const companyMap = new Map((companies || []).map((c: any) => [c.id, c]));

    // Enrich with site counts and compliance summaries
    const enrichedResults = await Promise.all(
      results.map(async (assignment: any) => {
        const companyId = assignment.client_company_id;
        const company = companyMap.get(companyId);

        // Get sites for this company
        const { data: sites, error: sitesError } = await supabaseAdmin
          .from('sites')
          .select('id')
          .eq('company_id', companyId);

        const siteCount = sitesError ? 0 : (sites?.length || 0);

        // Get compliance summary (simplified)
        const { data: obligations, error: obligationsError } = await supabaseAdmin
          .from('obligations')
          .select('id, status')
          .in('site_id', sites?.map((s: any) => s.id) || []);

        const totalObligations = obligations?.length || 0;
        const overdueCount = obligations?.filter((o: any) => o.status === 'OVERDUE').length || 0;
        const complianceScore = totalObligations > 0
          ? (obligations?.filter((o: any) => o.status === 'COMPLETED').length || 0) / totalObligations
          : 0;

        return {
          client_company_id: companyId,
          company_name: company?.name || 'Unknown Company',
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          site_count: siteCount,
          compliance_summary: {
            total_obligations: totalObligations,
            overdue_count: overdueCount,
            compliance_score: Math.round(complianceScore * 100) / 100,
          },
        };
      })
    );

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && enrichedResults.length > 0) {
      const lastItem = enrichedResults[enrichedResults.length - 1];
      nextCursor = createCursor(lastItem.client_company_id, lastItem.assigned_at);
    }

    const response = paginatedResponse(
      enrichedResults,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get consultant clients error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

