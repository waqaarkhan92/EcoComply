/**
 * Calendar Sync Route
 * Manually trigger sync of all deadlines to calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { calendarSyncService } from '@/lib/integrations/calendar';

export async function POST(request: NextRequest) {
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

    // Check if user has any active integrations
    const { data: integrations, error: intError } = await supabase
      .from('calendar_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('sync_enabled', true);

    if (intError) {
      throw new Error(`Failed to check integrations: ${intError.message}`);
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json(
        { error: 'No active calendar integrations found' },
        { status: 400 }
      );
    }

    // Trigger sync
    const result = await calendarSyncService.syncAllDeadlines(user.id);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      message: `Synced ${result.synced} deadlines${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync deadlines', details: error.message },
      { status: 500 }
    );
  }
}
