/**
 * Resend Webhook Handler
 * Handles delivery status updates from Resend
 * Reference: docs/specs/42_Backend_Notifications.md Section 9.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if Resend provides one)
    // For now, we'll trust requests from Resend
    // In production, verify the signature using Resend's webhook secret

    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const messageId = event.data?.email_id || event.email_id;
      if (!messageId) {
        console.warn('Resend webhook event missing email_id:', event);
        continue;
      }

      // Find notification by delivery_provider_id
      const { data: notifications } = await supabaseAdmin
        .from('notifications')
        .select('id, status, metadata')
        .eq('delivery_provider', 'RESEND')
        .eq('delivery_provider_id', messageId)
        .limit(1);

      if (!notifications || notifications.length === 0) {
        console.warn(`Notification not found for Resend message ID: ${messageId}`);
        continue;
      }

      const notification = notifications[0];
      const eventType = event.type || event.event;

      // Update notification status based on event type
      switch (eventType) {
        case 'email.delivered':
        case 'delivered':
          await supabaseAdmin
            .from('notifications')
            .update({
              delivery_status: 'DELIVERED',
              delivered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          break;

        case 'email.bounced':
        case 'bounced':
          await supabaseAdmin
            .from('notifications')
            .update({
              delivery_status: 'BOUNCED',
              delivery_error: event.data?.bounce_type || event.bounce_type || 'Email bounced',
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          break;

        case 'email.complained':
        case 'complained':
        case 'spamreport':
          await supabaseAdmin
            .from('notifications')
            .update({
              delivery_status: 'COMPLAINED',
              delivery_error: 'Marked as spam',
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          break;

        case 'email.opened':
        case 'opened':
          // Track opens in metadata (optional)
          await supabaseAdmin
            .from('notifications')
            .update({
              metadata: {
                ...(notification.metadata || {}),
                opened_at: new Date().toISOString(),
                open_count: ((notification.metadata?.open_count || 0) + 1),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          break;

        case 'email.clicked':
        case 'clicked':
          // Track clicks in metadata (optional)
          await supabaseAdmin
            .from('notifications')
            .update({
              metadata: {
                ...(notification.metadata || {}),
                clicked_at: new Date().toISOString(),
                click_count: ((notification.metadata?.click_count || 0) + 1),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          break;

        default:
          console.log(`Unhandled Resend webhook event type: ${eventType}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Resend webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

