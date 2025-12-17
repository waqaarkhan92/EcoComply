/**
 * Calendar Token Management API
 * DELETE /api/v1/calendar/tokens/[tokenId] - Revoke a calendar token
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 7
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { icalService } from '@/lib/services/ical-service';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ tokenId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { tokenId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const success = await icalService.revokeToken(tokenId, user.company_id);

    if (!success) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Calendar token not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Calendar token revoked successfully' },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error revoking calendar token:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
