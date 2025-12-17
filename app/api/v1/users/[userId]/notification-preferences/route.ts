/**
 * Notification Preferences Endpoints
 * GET /api/v1/users/{userId}/notification-preferences - Get preferences
 * PUT /api/v1/users/{userId}/notification-preferences - Update preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ userId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { userId } = params;

    // Check permissions: user can only view their own preferences, or Admin can view any
    if (user.id !== userId) {
      const adminCheck = await requireRole(request, ['OWNER', 'ADMIN']);
      if (adminCheck instanceof NextResponse) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions to view notification preferences',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Get user notification preferences from settings
    // Note: This assumes preferences are stored in user settings JSONB field
    // If a separate table exists, query that instead
  const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, settings')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Extract notification preferences from settings
    const preferences = userData.settings?.notification_preferences || [];

    const response = successResponse(
      {
        user_id: userId,
        preferences: preferences.length > 0 ? preferences : [],
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get notification preferences error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest, props: { params: Promise<{ userId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { userId } = params;

    // Check permissions
    if (user.id !== userId) {
      const adminCheck = await requireRole(request, ['OWNER', 'ADMIN']);
      if (adminCheck instanceof NextResponse) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions to update notification preferences',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Parse request body
    const body = await request.json();

    // Validate request
    if (!body.notification_type || !body.channel_preference || !body.frequency_preference || body.enabled === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        422,
        { 
          required: ['notification_type', 'channel_preference', 'frequency_preference', 'enabled'] 
        },
        { request_id: requestId }
      );
    }

    const validChannels = ['EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS', 'IN_APP_ONLY', 'ALL_CHANNELS'];
    if (!validChannels.includes(body.channel_preference)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid channel_preference',
        422,
        { channel_preference: `Must be one of: ${validChannels.join(', ')}` },
        { request_id: requestId }
      );
    }

    const validFrequencies = ['IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'NEVER'];
    if (!validFrequencies.includes(body.frequency_preference)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid frequency_preference',
        422,
        { frequency_preference: `Must be one of: ${validFrequencies.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Get current user settings
  const { data: userData, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();

    if (getUserError || !userData) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update notification preferences in settings
    const currentSettings = userData.settings || {};
    const currentPreferences = currentSettings.notification_preferences || [];
    
    // Find and update existing preference or add new one
    const preferenceIndex = currentPreferences.findIndex(
      (p: any) => p.notification_type === body.notification_type
    );

    const updatedPreference = {
      notification_type: body.notification_type,
      channel_preference: body.channel_preference,
      frequency_preference: body.frequency_preference,
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    };

    if (preferenceIndex >= 0) {
      currentPreferences[preferenceIndex] = updatedPreference;
    } else {
      currentPreferences.push(updatedPreference);
    }

    // Update user settings
  const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        settings: {
          ...currentSettings,
          notification_preferences: currentPreferences,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, updated_at')
      .single();

    if (updateError || !updatedUser) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update notification preferences',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        id: userId,
        user_id: userId,
        ...updatedPreference,
        updated_at: updatedUser.updated_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

