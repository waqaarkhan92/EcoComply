/**
 * Calendar Tokens API
 * GET /api/v1/calendar/tokens - List calendar tokens
 * POST /api/v1/calendar/tokens - Create new calendar token
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 7
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { icalService } from '@/lib/services/ical-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const tokens = await icalService.listUserTokens(user.id, user.company_id);

    // Enrich with site names
    const siteIds = tokens.filter(t => t.site_id).map(t => t.site_id);
    let siteNames: Record<string, string> = {};

    if (siteIds.length > 0) {
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .in('id', siteIds);

      if (sites) {
        siteNames = Object.fromEntries(sites.map(s => [s.id, s.name]));
      }
    }

    const enrichedTokens = tokens.map(token => ({
      ...token,
      site_name: token.site_id ? siteNames[token.site_id] : null,
      feed_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${token.id}`,
    }));

    const response = successResponse(
      { data: enrichedTokens },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error listing calendar tokens:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const { token_type, site_id, name } = body;

    if (!token_type || !['USER', 'SITE'].includes(token_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'token_type must be USER or SITE',
        400,
        {},
        { request_id: requestId }
      );
    }

    if (token_type === 'SITE' && !site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required for SITE tokens',
        400,
        {},
        { request_id: requestId }
      );
    }

    let result;

    if (token_type === 'USER') {
      result = await icalService.createUserToken(user.company_id, user.id, name);
    } else {
      // Verify site belongs to company
      const { data: site } = await supabaseAdmin
        .from('sites')
        .select('id')
        .eq('id', site_id)
        .eq('company_id', user.company_id)
        .single();

      if (!site) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Site not found',
          404,
          {},
          { request_id: requestId }
        );
      }

      result = await icalService.createSiteToken(user.company_id, site_id, name);
    }

    const feedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${result.token}`;

    const response = successResponse(
      {
        data: {
          id: result.id,
          token: result.token,
          feed_url: feedUrl,
          token_type,
          site_id: site_id || null,
          name: name || (token_type === 'USER' ? 'Personal Calendar' : 'Site Calendar'),
        },
        message: 'Calendar token created successfully',
      },
      201,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error creating calendar token:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
