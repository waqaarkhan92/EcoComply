/**
 * Unlink Evidence from Obligation
 * DELETE /api/v1/obligations/{obligationId}/evidence/{evidenceId}
 * 
 * Unlinks evidence from an obligation (soft delete via unlinked_at)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { obligationId: string; evidenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { obligationId, evidenceId } = params;

    // Check if link exists
    const { data: link, error: linkError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('id')
      .eq('obligation_id', obligationId)
      .eq('evidence_id', evidenceId)
      .is('unlinked_at', null)
      .single();

    if (linkError || !link) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Evidence link not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Soft delete link (set unlinked_at)
    const { error: unlinkError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .update({
        unlinked_at: new Date().toISOString(),
        unlinked_by: user.id,
        unlink_reason: 'User request',
      })
      .eq('id', link.id);

    if (unlinkError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to unlink evidence',
        500,
        { error: unlinkError.message },
        { request_id: requestId }
      );
    }

    return successResponse(
      { message: 'Evidence unlinked successfully' },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Unlink evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

