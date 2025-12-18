/**
 * Slack Integration Management Endpoints
 * PATCH /api/v1/integrations/slack - Update Slack integration settings
 * DELETE /api/v1/integrations/slack - Disconnect Slack integration
 * GET /api/v1/integrations/slack/channels - Get available Slack channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { errorResponse, successResponse, ErrorCodes } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { createSlackClient } from '@/lib/integrations/slack/slack-client';
import { logger } from '@/lib/logger';

/**
 * PATCH - Update Slack integration settings
 */
export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await parseRequestBody(request);

    const { default_channel_id, default_channel_name, notification_settings } = body;

    // Fetch existing integration
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('slack_integrations')
      .select('id, access_token')
      .eq('company_id', user.company_id)
      .single();

    if (fetchError || !integration) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Slack integration not found',
        404,
        { error: 'No Slack integration exists for this company' },
        { request_id: requestId }
      );
    }

    // Verify channel if provided
    if (default_channel_id) {
      const client = createSlackClient(integration.access_token);
      const channelInfo = await client.getChannelInfo(default_channel_id);

      if (!channelInfo.ok) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid Slack channel',
          422,
          { error: 'The specified channel does not exist or bot does not have access' },
          { request_id: requestId }
        );
      }
    }

    // Update integration
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (default_channel_id !== undefined) updateData.default_channel_id = default_channel_id;
    if (default_channel_name !== undefined) updateData.default_channel_name = default_channel_name;
    if (notification_settings !== undefined) updateData.notification_settings = notification_settings;

    const { data: updatedIntegration, error: updateError } = await supabaseAdmin
      .from('slack_integrations')
      .update(updateData)
      .eq('company_id', user.company_id)
      .select('id, team_id, team_name, default_channel_id, default_channel_name, notification_settings')
      .single();

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update Slack integration');
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update Slack integration',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      updatedIntegration,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack PATCH error');
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

/**
 * DELETE - Disconnect Slack integration
 */
export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Delete integration
    const { error } = await supabaseAdmin
      .from('slack_integrations')
      .delete()
      .eq('company_id', user.company_id);

    if (error) {
      logger.error({ error }, 'Failed to delete Slack integration');
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to disconnect Slack integration',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    logger.info({ companyId: user.company_id }, 'Slack integration disconnected');

    const response = successResponse(
      { message: 'Slack integration disconnected successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack DELETE error');
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
