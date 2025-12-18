/**
 * Slack OAuth Authorization Endpoint
 * GET /api/v1/integrations/slack/authorize
 * Redirects to Slack OAuth page
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { errorResponse, ErrorCodes } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get Slack credentials from environment
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.BASE_URL}/api/v1/integrations/slack/callback`;

    if (!clientId) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Slack integration not configured',
        500,
        { error: 'Missing SLACK_CLIENT_ID environment variable' },
        { request_id: requestId }
      );
    }

    // Required OAuth scopes for the bot
    const scopes = [
      'channels:read',
      'chat:write',
      'chat:write.public',
      'groups:read',
      'users:read',
      'users:read.email',
    ];

    // Build Slack OAuth URL
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', clientId);
    slackAuthUrl.searchParams.set('scope', scopes.join(','));
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
    slackAuthUrl.searchParams.set('state', user.company_id); // Use company_id as state

    // Redirect to Slack OAuth page
    return NextResponse.redirect(slackAuthUrl.toString());
  } catch (error: any) {
    console.error('Slack authorize error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
