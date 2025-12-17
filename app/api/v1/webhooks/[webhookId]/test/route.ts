/**
 * Webhook Test API
 * POST /api/v1/webhooks/[webhookId]/test - Send test event to webhook
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 14
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { webhookService } from '@/lib/services/webhook-service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ webhookId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { webhookId } = params;

    const result = await webhookService.sendTestEvent(webhookId, user.company_id);

    if (result.success) {
      const response = successResponse(
        {
          message: 'Test webhook sent successfully',
          success: true,
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, response);
    } else {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        result.error || 'Failed to send test webhook',
        500,
        { error: result.error },
        { request_id: requestId }
      );
    }
  } catch (error: any) {
    console.error('Error sending test webhook:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
