/**
 * Slack Integration Status Endpoint
 * GET /api/v1/integrations/slack/status
 * Check if Slack is connected for the current company
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { errorResponse, successResponse, ErrorCodes } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { createSlackClient } from '@/lib/integrations/slack/slack-client';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Fetch Slack integration for the company
    const { data: integration, error } = await supabaseAdmin
      .from('slack_integrations')
      .select('id, team_id, team_name, default_channel_id, default_channel_name, notification_settings, created_at')
      .eq('company_id', user.company_id)
      .single();

    if (error || !integration) {
      // Not connected
      const response = successResponse(
        {
          connected: false,
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, response);
    }

    // Integration exists - return status
    const response = successResponse(
      {
        connected: true,
        team_id: integration.team_id,
        team_name: integration.team_name,
        default_channel_id: integration.default_channel_id,
        default_channel_name: integration.default_channel_name,
        notification_settings: integration.notification_settings,
        connected_at: integration.created_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Slack status error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
