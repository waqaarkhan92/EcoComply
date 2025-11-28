/**
 * Logout Endpoint
 * POST /api/v1/auth/logout
 * 
 * Invalidate refresh token (logout)
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId, extractToken } from '@/lib/api/middleware';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Get token from request
    const token = extractToken(request);

    if (token) {
      // Sign out the user (invalidates the session)
      await supabaseAdmin.auth.signOut();
    }

    // Return success response
    return successResponse(
      {
        message: 'Logged out successfully',
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Logout error:', error);
    // Even if there's an error, return success (logout should always succeed)
    return successResponse(
      {
        message: 'Logged out successfully',
      },
      200,
      { request_id: requestId }
    );
  }
}

