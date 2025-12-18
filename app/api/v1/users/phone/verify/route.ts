/**
 * POST /api/v1/users/phone/verify
 * Start phone verification process by sending a verification code via SMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { twilioClient } from '@/lib/integrations/twilio/twilio-client';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

const verifyPhoneSchema = z.object({
  phone_number: z.string().min(10).max(20),
});

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    if (!twilioClient.isConfigured()) {
      return NextResponse.json(
        {
          error: 'SMS service is not configured. Please contact your administrator.',
        },
        { status: 503 }
      );
    }

    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: authUser } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validation = verifyPhoneSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { phone_number } = validation.data;

    // Format phone number (ensure E.164 format)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    // Validate phone number format (basic E.164 validation)
    if (!formattedPhone.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        {
          error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890)',
        },
        { status: 400 }
      );
    }

    // Check if there's a recent pending verification (within last 2 minutes)
    const { data: recentVerification } = await supabaseAdmin
      .from('phone_verifications')
      .select('id, created_at')
      .eq('user_id', authUser.id)
      .eq('phone_number', formattedPhone)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentVerification) {
      const createdAt = new Date(recentVerification.created_at);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      if (createdAt > twoMinutesAgo) {
        return NextResponse.json(
          {
            error: 'A verification code was recently sent. Please wait 2 minutes before requesting a new one.',
          },
          { status: 429 }
        );
      }
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification record in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('phone_verifications')
      .insert({
        user_id: authUser.id,
        phone_number: formattedPhone,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (verificationError) {
      console.error('Failed to create verification record:', verificationError);
      return NextResponse.json(
        {
          error: 'Failed to create verification record',
        },
        { status: 500 }
      );
    }

    // Send verification code via SMS
    const message = `Your EcoComply verification code is: ${verificationCode}. This code will expire in 10 minutes.`;
    const smsResult = await twilioClient.sendSMS(formattedPhone, message);

    if (!smsResult.success) {
      // Delete the verification record if SMS failed
      await supabaseAdmin.from('phone_verifications').delete().eq('id', verification.id);

      return NextResponse.json(
        {
          error: 'Failed to send verification code',
          details: smsResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in phone verification:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
