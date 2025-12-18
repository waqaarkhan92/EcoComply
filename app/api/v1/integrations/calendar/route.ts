/**
 * Calendar Integration Disconnect Route
 * Remove calendar integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    // Validate provider
    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    // Delete integration (cascade will delete event mappings)
    const { error } = await supabase
      .from('calendar_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (error) {
      throw new Error(`Failed to disconnect integration: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `${provider} Calendar disconnected successfully`,
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar', details: error.message },
      { status: 500 }
    );
  }
}
