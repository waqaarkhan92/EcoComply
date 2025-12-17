/**
 * Evidence Gaps Summary API
 * GET /api/v1/evidence-gaps/summary - Get aggregated gap counts
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 1
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

    // Get counts by severity
    let query = supabaseAdmin
      .from('evidence_gaps')
      .select('severity, gap_type, site_id', { count: 'exact' })
      .eq('company_id', user.company_id)
      .is('resolved_at', null)
      .is('dismissed_at', null);

    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: gaps, error } = await query;

    if (error) {
      console.error('Error fetching evidence gaps summary:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence gaps summary',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Aggregate counts
    const summary = {
      total: gaps?.length || 0,
      by_severity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      },
      by_gap_type: {
        NO_EVIDENCE: 0,
        EXPIRED_EVIDENCE: 0,
        INSUFFICIENT_EVIDENCE: 0,
      },
      by_site: {} as Record<string, number>,
    };

    if (gaps) {
      for (const gap of gaps) {
        // Count by severity
        if (gap.severity in summary.by_severity) {
          summary.by_severity[gap.severity as keyof typeof summary.by_severity]++;
        }

        // Count by gap type
        if (gap.gap_type in summary.by_gap_type) {
          summary.by_gap_type[gap.gap_type as keyof typeof summary.by_gap_type]++;
        }

        // Count by site
        if (gap.site_id) {
          summary.by_site[gap.site_id] = (summary.by_site[gap.site_id] || 0) + 1;
        }
      }
    }

    // Get site names for the by_site breakdown
    if (Object.keys(summary.by_site).length > 0) {
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .in('id', Object.keys(summary.by_site));

      if (sites) {
        const siteNames: Record<string, { name: string; count: number }> = {};
        for (const site of sites) {
          siteNames[site.id] = {
            name: site.name,
            count: summary.by_site[site.id],
          };
        }
        (summary as any).by_site_detailed = siteNames;
      }
    }

    const response = successResponse({ data: summary }, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in evidence gaps summary API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
