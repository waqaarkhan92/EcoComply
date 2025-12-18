/**
 * Calendar OAuth Callback Route
 * Handles OAuth callback from Google Calendar or Outlook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { googleCalendarClient, outlookCalendarClient } from '@/lib/integrations/calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Authorization failed';
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=${encodeURIComponent(errorDescription)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=Invalid callback parameters`
      );
    }

    // Decode state
    let stateData: { userId: string; provider: 'google' | 'outlook'; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=Invalid state parameter`
      );
    }

    // Validate state timestamp (should be within last 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=Authorization expired. Please try again.`
      );
    }

    // Verify user is authenticated and matches state
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=Unauthorized`
      );
    }

    // Exchange code for tokens
    let tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      expiry_date?: number;
    };

    if (stateData.provider === 'google') {
      tokens = await googleCalendarClient.exchangeToken(code);
    } else {
      tokens = await outlookCalendarClient.exchangeToken(code);
    }

    // Calculate token expiration
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Get list of calendars to select default
    let defaultCalendarId: string | null = null;
    try {
      if (stateData.provider === 'google') {
        const calendars = await googleCalendarClient.listCalendars(
          tokens.access_token,
          tokens.refresh_token
        );
        const primaryCalendar = calendars.find(c => c.primary);
        defaultCalendarId = primaryCalendar?.id || calendars[0]?.id || null;
      } else {
        const calendars = await outlookCalendarClient.listCalendars(tokens.access_token);
        const defaultCalendar = calendars.find(c => c.isDefaultCalendar);
        defaultCalendarId = defaultCalendar?.id || calendars[0]?.id || null;
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
      // Continue without default calendar, user can select later
    }

    // Store integration in database
    const { error: dbError } = await supabase
      .from('calendar_integrations')
      .upsert(
        {
          user_id: user.id,
          provider: stateData.provider,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          calendar_id: defaultCalendarId,
          sync_enabled: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=${encodeURIComponent('Failed to save integration')}`
      );
    }

    // Redirect to settings page with success message
    return NextResponse.redirect(
      `${process.env.BASE_URL}/dashboard/settings?tab=calendar&success=${stateData.provider} Calendar connected successfully`
    );
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      `${process.env.BASE_URL}/dashboard/settings?tab=calendar&error=${encodeURIComponent(error.message || 'Failed to complete authorization')}`
    );
  }
}
