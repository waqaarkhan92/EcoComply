/**
 * Risk Scores API
 * GET /api/v1/risk-scores - Get current risk scores
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 3
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { riskScoreService } from '@/lib/services/risk-score-service';

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
    const score_type = searchParams.get('score_type');

    const scores = await riskScoreService.getRiskScores(user.company_id, {
      siteId: site_id || undefined,
      scoreType: score_type || undefined,
    });

    // Enrich with site names
    const siteIds = [...new Set(scores.filter(s => s.site_id).map(s => s.site_id))];
    let siteNames: Record<string, string> = {};

    if (siteIds.length > 0) {
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .in('id', siteIds);

      if (sites) {
        siteNames = Object.fromEntries(sites.map(s => [s.id, s.name]));
      }
    }

    const enrichedScores = scores.map(score => ({
      ...score,
      site_name: score.site_id ? siteNames[score.site_id] : null,
    }));

    const response = successResponse(
      { data: enrichedScores },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in risk scores API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
