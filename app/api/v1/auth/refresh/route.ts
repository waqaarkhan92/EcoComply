/**
 * Refresh Token Endpoint
 * POST /api/v1/auth/refresh
 * 
 * Refresh an expired access token using a valid refresh token
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';

interface RefreshRequest {
  refresh_token: string;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Parse request body
    const body: RefreshRequest = await request.json();

    // Validate required fields
    if (!body.refresh_token) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required field: refresh_token',
        422,
        { refresh_token: 'Refresh token is required' },
        { request_id: requestId }
      );
    }

    // Refresh the session using the refresh token
    const { data: sessionData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
      refresh_token: body.refresh_token,
    });

    if (refreshError || !sessionData.session) {
      return errorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired refresh token',
        401,
        { error: refreshError?.message || 'Token refresh failed' },
        { request_id: requestId }
      );
    }

    // Return new tokens
    return successResponse(
      {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in || 86400, // 24 hours in seconds
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

