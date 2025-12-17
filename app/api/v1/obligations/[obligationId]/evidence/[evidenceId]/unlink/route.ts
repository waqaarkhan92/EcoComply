/**
 * Unlink Evidence from Obligation Endpoint
 * DELETE /api/v1/obligations/{obligationId}/evidence/{evidenceId}/unlink - Unlink evidence from obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ obligationId: string; evidenceId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const params = await props.params;
  const { obligationId, evidenceId } = params;

    // Verify obligation exists
  const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify evidence link exists
  const { data: link, error: linkError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('id')
      .eq('obligation_id', obligationId)
      .eq('evidence_id', evidenceId)
      .is('unlinked_at', null)
      .maybeSingle();

    if (linkError || !link) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Evidence link not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Soft unlink by setting unlinked_at
  const { error: updateError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .update({
        unlinked_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to unlink evidence',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // Get site_id for compliance score update
  const { data: obligationWithSite } = await supabaseAdmin
      .from('obligations')
      .select('site_id')
      .eq('id', obligationId)
      .single();

    // Update compliance scores (evidence unlinking affects score)
    if (obligationWithSite) {
      try {
        const { updateComplianceScores } = await import('@/lib/services/compliance-score-service');
        await updateComplianceScores(obligationWithSite.site_id);
      } catch (error) {
        console.error('Error updating compliance scores:', error);
        // Don't fail the request if score update fails
      }
    }

  const { user } = authResult;
    const response = successResponse(
      { message: 'Evidence unlinked successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
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

