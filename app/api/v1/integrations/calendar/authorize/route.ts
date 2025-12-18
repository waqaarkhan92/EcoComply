/**
 * Calendar OAuth Authorization Route
 * Initiates OAuth flow for Google Calendar or Outlook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { googleCalendarClient, outlookCalendarClient } from '@/lib/integrations/calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    // Validate provider
    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create state parameter with user ID and provider
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        provider,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Get authorization URL
    let authUrl: string;
    if (provider === 'google') {
      authUrl = googleCalendarClient.getAuthUrl(state);
    } else {
      authUrl = outlookCalendarClient.getAuthUrl(state);
    }

    // Redirect to OAuth provider
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization', details: error.message },
      { status: 500 }
    );
  }
}
