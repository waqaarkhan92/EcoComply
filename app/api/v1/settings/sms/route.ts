/**
 * GET /api/v1/settings/sms
 * Get SMS notification settings for the authenticated user
 *
 * PUT /api/v1/settings/sms
 * Update SMS notification settings for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { smsNotificationService } from '@/lib/services/sms-notification-service';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

const updateSMSSettingsSchema = z.object({
  sms_enabled: z.boolean().optional(),
  critical_alerts: z.boolean().optional(),
  overdue_notifications: z.boolean().optional(),
  breach_alerts: z.boolean().optional(),
});

/**
 * GET SMS notification settings
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: authUser } = authResult;

    // Get user's phone and verification status
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('phone, phone_verified, sms_notifications_enabled, notification_preferences')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Get SMS preferences
    const preferences = await smsNotificationService.getSMSPreferences(authUser.id);

    return NextResponse.json({
      phone_number: user.phone || null,
      phone_verified: user.phone_verified || false,
      sms_enabled: user.sms_notifications_enabled || false,
      preferences: preferences || {
        critical_alerts: false,
        overdue_notifications: false,
        breach_alerts: false,
      },
    });
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT Update SMS notification settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: authUser } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateSMSSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const settings = validation.data;

    // Check if user has verified phone number before enabling SMS
    if (settings.sms_enabled) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('phone_verified')
        .eq('id', authUser.id)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          {
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      if (!user.phone_verified) {
        return NextResponse.json(
          {
            error: 'Phone number must be verified before enabling SMS notifications',
          },
          { status: 400 }
        );
      }
    }

    // Update SMS preferences
    const result = await smsNotificationService.updateSMSPreferences(authUser.id, settings);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to update SMS settings',
        },
        { status: 500 }
      );
    }

    // Get updated settings
    const updatedPreferences = await smsNotificationService.getSMSPreferences(authUser.id);

    return NextResponse.json({
      success: true,
      message: 'SMS settings updated successfully',
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE Remove phone number and disable SMS notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: authUser } = authResult;

    // Remove phone number and disable SMS
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        phone: null,
        phone_verified: false,
        sms_notifications_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (updateError) {
      console.error('Failed to remove phone number:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to remove phone number',
        },
        { status: 500 }
      );
    }

    // Delete all verification records for this user
    await supabaseAdmin.from('phone_verifications').delete().eq('user_id', authUser.id);

    return NextResponse.json({
      success: true,
      message: 'Phone number removed successfully',
    });
  } catch (error) {
    console.error('Error removing phone number:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
