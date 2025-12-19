/**
 * ELV Headroom Analytics API Route
 * Returns emission limit value (ELV) headroom analysis for a site
 * Calculates the difference between actual emissions and permit limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { elvHeadroomService } from '@/lib/services/elv-headroom-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const siteId = searchParams.get('siteId');

    // Validate required parameters
    if (!siteId) {
      return errorResponse(
        ErrorCodes.MISSING_FIELD,
        'Missing required parameter: siteId',
        400,
        { field: 'siteId' },
        { request_id: requestId }
      );
    }

    // Fetch ELV headroom summary for the site
    const elvSummary = await elvHeadroomService.getSiteELVSummary(siteId);

    return successResponse(elvSummary, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('ELV Headroom API error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to fetch ELV headroom data',
      500,
      null,
      { request_id: requestId }
    );
  }
}
