/**
 * Calendar Integration Status Route
 * Get connection status and available calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { googleCalendarClient, outlookCalendarClient } from '@/lib/integrations/calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's calendar integrations
    const { data: integrations, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    // Fetch available calendars for each integration
    const integrationsWithCalendars = await Promise.all(
      (integrations || []).map(async (integration) => {
        try {
          let calendars = [];

          if (integration.provider === 'google') {
            calendars = await googleCalendarClient.listCalendars(
              integration.access_token,
              integration.refresh_token || undefined
            );
          } else {
            calendars = await outlookCalendarClient.listCalendars(
              integration.access_token
            );
          }

          return {
            id: integration.id,
            provider: integration.provider,
            calendar_id: integration.calendar_id,
            sync_enabled: integration.sync_enabled,
            last_synced_at: integration.last_synced_at,
            calendars,
            connected: true,
          };
        } catch (error: any) {
          console.error(`Failed to fetch calendars for ${integration.provider}:`, error);
          return {
            id: integration.id,
            provider: integration.provider,
            calendar_id: integration.calendar_id,
            sync_enabled: integration.sync_enabled,
            last_synced_at: integration.last_synced_at,
            calendars: [],
            connected: false,
            error: error.message,
          };
        }
      })
    );

    return NextResponse.json({
      integrations: integrationsWithCalendars,
    });
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update calendar integration settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, calendar_id, sync_enabled } = body;

    // Validate provider
    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Update integration
    const updateData: any = {};
    if (calendar_id !== undefined) updateData.calendar_id = calendar_id;
    if (sync_enabled !== undefined) updateData.sync_enabled = sync_enabled;

    const { error } = await supabase
      .from('calendar_integrations')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration', details: error.message },
      { status: 500 }
    );
  }
}
