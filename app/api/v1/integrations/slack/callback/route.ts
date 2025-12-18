/**
 * Slack OAuth Callback Endpoint
 * GET /api/v1/integrations/slack/callback
 * Handles OAuth callback and exchanges code for access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestId } from '@/lib/api/middleware';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // company_id
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      logger.error({ error }, 'Slack OAuth error');
      const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
      redirectUrl.searchParams.set('error', 'oauth_denied');
      return NextResponse.redirect(redirectUrl.toString());
    }

    if (!code || !state) {
      const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
      redirectUrl.searchParams.set('error', 'invalid_callback');
      return NextResponse.redirect(redirectUrl.toString());
    }

    const companyId = state;

    // Get Slack credentials
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.BASE_URL}/api/v1/integrations/slack/callback`;

    if (!clientId || !clientSecret) {
      logger.error('Slack credentials not configured');
      const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
      redirectUrl.searchParams.set('error', 'config_error');
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      logger.error({ error: tokenData.error }, 'Slack token exchange failed');
      const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Extract integration data
    const accessToken = tokenData.access_token;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name;
    const botUserId = tokenData.bot_user_id;

    // Store integration in database
    const { data: existingIntegration } = await supabaseAdmin
      .from('slack_integrations')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabaseAdmin
        .from('slack_integrations')
        .update({
          team_id: teamId,
          team_name: teamName,
          access_token: accessToken,
          bot_user_id: botUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId);

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to update Slack integration');
        const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
        redirectUrl.searchParams.set('error', 'database_error');
        return NextResponse.redirect(redirectUrl.toString());
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabaseAdmin
        .from('slack_integrations')
        .insert({
          company_id: companyId,
          team_id: teamId,
          team_name: teamName,
          access_token: accessToken,
          bot_user_id: botUserId,
          notification_settings: {
            deadline_reminders: true,
            overdue_alerts: true,
            compliance_alerts: true,
            evidence_uploads: true,
          },
        });

      if (insertError) {
        logger.error({ error: insertError }, 'Failed to create Slack integration');
        const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
        redirectUrl.searchParams.set('error', 'database_error');
        return NextResponse.redirect(redirectUrl.toString());
      }
    }

    logger.info({ companyId, teamId }, 'Slack integration connected');

    // Redirect to settings page with success message
    const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
    redirectUrl.searchParams.set('success', 'connected');
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack callback error');
    const redirectUrl = new URL('/dashboard/settings/integrations/slack', process.env.BASE_URL!);
    redirectUrl.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(redirectUrl.toString());
  }
}
