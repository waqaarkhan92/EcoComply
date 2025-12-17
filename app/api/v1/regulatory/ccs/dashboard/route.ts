/**
 * CCS Dashboard Data
 * GET /api/v1/regulatory/ccs/dashboard - Get CCS dashboard data for a site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { PackEngineService } from '@/lib/services/pack-engine-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const siteId = request.nextUrl.searchParams.get('siteId');
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!siteId || !companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'siteId and companyId query parameters are required',
        422,
        { siteId: !siteId ? 'Required' : undefined, companyId: !companyId ? 'Required' : undefined },
        { request_id: requestId }
      );
    }

    const packEngine = new PackEngineService();
    const dashboardData = await packEngine.getCcsDashboard(companyId, [siteId]);

    return successResponse(
      dashboardData,
      200,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/regulatory/ccs/dashboard:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
