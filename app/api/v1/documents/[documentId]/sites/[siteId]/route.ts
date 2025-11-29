/**
 * Document Site Unassignment Endpoint
 * DELETE /api/v1/documents/{documentId}/sites/{siteId} - Unassign document from site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string; siteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId, siteId } = params;

    // Verify document exists and is assigned to this site
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (document.site_id !== siteId) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document is not assigned to this site',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Unassign by setting site_id to null
    // Note: This might not be the desired behavior - you may want to keep a history
    // For now, we'll set it to null as per the DELETE endpoint pattern
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        site_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to unassign document from site',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Document unassigned successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Unassign document from site error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

