/**
 * Risk Score Trends API
 * GET /api/v1/risk-scores/trends - Get historical risk score trends
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 3
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const period = searchParams.get('period') || '30d';

    if (!site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Parse period
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '30d') days = 30;
    else if (period === '90d') days = 90;

    const trends = await riskScoreService.getRiskTrends(user.company_id, site_id, days);

    const response = successResponse(
      {
        data: trends,
        site_id,
        period,
        days,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in risk score trends API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
