/**
 * Evidence Endpoints
 * GET /api/v1/evidence/{evidenceId} - Get evidence details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { evidenceId } = params;

    // Get evidence - RLS will enforce access control
    const { data: evidence, error } = await supabaseAdmin
      .from('evidence_items')
      .select('*')
      .eq('id', evidenceId)
      .eq('is_archived', false)
      .single();

    if (error || !evidence) {
      if (error?.code === 'PGRST116') {
        // No rows returned
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Evidence not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Get linked obligations
    const { data: links } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('obligation_id, linked_at, compliance_period, notes')
      .eq('evidence_id', evidenceId)
      .is('unlinked_at', null);

    // Get file URL
    const { data: urlData } = supabaseAdmin.storage
      .from('evidence')
      .getPublicUrl(evidence.storage_path);

    return successResponse(
      {
        ...evidence,
        file_url: urlData?.publicUrl || '',
        linked_obligations: links?.map((link: any) => ({
          obligation_id: link.obligation_id,
          linked_at: link.linked_at,
          compliance_period: link.compliance_period,
          notes: link.notes,
        })) || [],
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

