/**
 * Pack Download Link Endpoint
 * GET /api/v1/packs/{packId}/download-link - Get shared download link
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { packId } = params;

    // Verify pack exists
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, storage_path, status')
      .eq('id', packId)
      .maybeSingle();

    if (packError || !pack) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Pack not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (pack.status !== 'COMPLETED') {
      return errorResponse(
        ErrorCodes.UNPROCESSABLE_ENTITY,
        'Pack must be completed before generating download link',
        422,
        { status: pack.status },
        { request_id: requestId }
      );
    }

    // Get active shared link distribution
    const { data: distribution, error: distError } = await supabaseAdmin
      .from('pack_distributions')
      .select('id, shared_link_token, distributed_at, expires_at')
      .eq('pack_id', packId)
      .eq('distribution_method', 'SHARED_LINK')
      .is('shared_link_token', null, { foreignTable: null })
      .order('distributed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (distError || !distribution || !distribution.shared_link_token) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'No active shared link found for this pack',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check if link has expired
    if (distribution.expires_at) {
      const expiresAt = new Date(distribution.expires_at);
      if (expiresAt < new Date()) {
        return errorResponse(
          ErrorCodes.UNPROCESSABLE_ENTITY,
          'Shared link has expired',
          422,
          { expires_at: distribution.expires_at },
          { request_id: requestId }
        );
      }
    }

    // Generate download URL
    // In production, this would be a signed URL with expiration
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
    const downloadUrl = `${baseUrl}/api/v1/packs/${packId}/download?token=${distribution.shared_link_token}`;

    const response = successResponse(
      {
        pack_id: packId,
        download_url: downloadUrl,
        shared_link_token: distribution.shared_link_token,
        expires_at: distribution.expires_at,
        view_count: distribution.view_count || 0,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get pack download link error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

