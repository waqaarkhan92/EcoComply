/**
 * POST /api/v1/users/phone/verify/confirm
 * Verify the phone number with the verification code
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

const confirmVerificationSchema = z.object({
  code: z.string().length(6),
  phone_number: z.string().min(10).max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: authUser } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validation = confirmVerificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { code, phone_number } = validation.data;

    // Build query to find verification record
    let query = supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('verification_code', code)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    // If phone number is provided, filter by it
    if (phone_number) {
      const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
      query = query.eq('phone_number', formattedPhone);
    }

    const { data: verification, error: verificationError } = await query.single();

    if (verificationError || !verification) {
      return NextResponse.json(
        {
          error: 'Invalid or expired verification code',
        },
        { status: 400 }
      );
    }

    // Check if code has expired
    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: 'Verification code has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Mark verification as verified
    const { error: updateVerificationError } = await supabaseAdmin
      .from('phone_verifications')
      .update({
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    if (updateVerificationError) {
      console.error('Failed to update verification record:', updateVerificationError);
      return NextResponse.json(
        {
          error: 'Failed to verify code',
        },
        { status: 500 }
      );
    }

    // Update user's phone number and phone_verified status
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        phone: verification.phone_number,
        phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (updateUserError) {
      console.error('Failed to update user phone verification:', updateUserError);
      return NextResponse.json(
        {
          error: 'Failed to update user phone verification',
        },
        { status: 500 }
      );
    }

    // Clean up old verification records for this user
    await supabaseAdmin
      .from('phone_verifications')
      .delete()
      .eq('user_id', authUser.id)
      .neq('id', verification.id);

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      phone_number: verification.phone_number,
    });
  } catch (error) {
    console.error('Error in phone verification confirmation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
