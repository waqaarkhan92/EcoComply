/**
 * Slack Channels Endpoint
 * GET /api/v1/integrations/slack/channels
 * Get list of available Slack channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { errorResponse, successResponse, ErrorCodes } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { createSlackClient } from '@/lib/integrations/slack/slack-client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Fetch Slack integration
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('slack_integrations')
      .select('access_token')
      .eq('company_id', user.company_id)
      .single();

    if (fetchError || !integration) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Slack integration not found',
        404,
        { error: 'No Slack integration exists for this company. Please connect Slack first.' },
        { request_id: requestId }
      );
    }

    // Get channels from Slack
    const client = createSlackClient(integration.access_token);
    const channels = await client.getChannels();

    const response = successResponse(
      { channels },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack channels error');
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
