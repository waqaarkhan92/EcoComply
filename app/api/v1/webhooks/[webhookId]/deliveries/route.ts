/**
 * Webhook Deliveries API
 * GET /api/v1/webhooks/[webhookId]/deliveries - Get delivery history
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 14
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireRole, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { webhookService } from '@/lib/services/webhook-service';

export async function GET(
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
  const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Verify webhook belongs to company
  const { data: webhook, error: webhookError } = await supabaseAdmin
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('company_id', user.company_id)
      .single();

    if (webhookError || !webhook) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Webhook not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const deliveries = await webhookService.getDeliveries(webhookId, { limit, offset });

    const response = successResponse(
      {
        data: deliveries,
        pagination: {
          page,
          limit,
          offset,
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching webhook deliveries:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
