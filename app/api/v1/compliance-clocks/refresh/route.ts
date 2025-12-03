/**
 * Compliance Clock Refresh Endpoint
 * POST /api/v1/compliance-clocks/refresh - Manually trigger compliance clock recalculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const companyId = body.company_id || user.company_id;
    const siteId = body.site_id;
    const entityType = body.entity_type;

    // Queue compliance clock update job
    try {
      const queue = getQueue(QUEUE_NAMES.COMPLIANCE_CLOCK_UPDATE);
      await queue.add('update-compliance-clocks', {
        company_id: companyId,
        site_id: siteId,
        entity_type: entityType,
      });
    } catch (queueError: any) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to queue compliance clock update job',
        500,
        { error: queueError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        message: 'Compliance clock update job queued',
        company_id: companyId,
        site_id: siteId || null,
        entity_type: entityType || null,
      },
      202,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/compliance-clocks/refresh:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

