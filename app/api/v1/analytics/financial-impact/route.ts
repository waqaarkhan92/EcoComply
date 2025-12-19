/**
 * Financial Impact API Route
 * Returns financial risk assessment including fine exposure, remediation costs, and insurance risk
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { financialImpactService } from '@/lib/services/financial-impact-service';

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
    const companyId = searchParams.get('companyId');
    const siteId = searchParams.get('siteId') || undefined;

    // Validate required parameters
    if (!companyId) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'companyId is required',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to the company
    if (user.company_id !== companyId && !user.is_consultant) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this company',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Generate financial impact assessment
    const result = await financialImpactService.generateFinancialImpact(
      companyId,
      siteId
    );

    return successResponse(result, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Financial Impact API error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to generate financial impact assessment',
      500,
      null,
      { request_id: requestId }
    );
  }
}
