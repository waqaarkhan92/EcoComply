/**
 * Reports Endpoints
 * GET /api/v1/reports - List available reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

const AVAILABLE_REPORTS = [
  {
    id: 'compliance_summary',
    name: 'Compliance Summary Report',
    description: 'Overview of compliance status across all sites',
    type: 'SUMMARY',
  },
  {
    id: 'deadline_report',
    name: 'Deadline Report',
    description: 'Upcoming and overdue deadlines',
    type: 'DEADLINE',
  },
  {
    id: 'obligation_report',
    name: 'Obligation Report',
    description: 'Detailed obligation tracking report',
    type: 'OBLIGATION',
  },
  {
    id: 'evidence_report',
    name: 'Evidence Report',
    description: 'Evidence completeness report',
    type: 'EVIDENCE',
  },
];

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const response = successResponse(AVAILABLE_REPORTS, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('List reports error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

