/**
 * Link Evidence to Obligation
 * POST /api/v1/evidence/{evidenceId}/link
 * 
 * Links existing evidence to an obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { evidenceId } = params;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.obligation_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'obligation_id is required',
        422,
        { obligation_id: 'obligation_id is required' },
        { request_id: requestId }
      );
    }

    // Check if evidence exists and user has access (RLS will enforce)
    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence_items')
      .select('id, site_id')
      .eq('id', evidenceId)
      .eq('is_archived', false)
      .single();

    if (evidenceError || !evidence) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Evidence not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check if obligation exists and user has access (RLS will enforce)
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id')
      .eq('id', body.obligation_id)
      .is('deleted_at', null)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify evidence and obligation belong to same site
    if (evidence.site_id !== obligation.site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Evidence and obligation must belong to the same site',
        422,
        { error: 'Site mismatch between evidence and obligation' },
        { request_id: requestId }
      );
    }

    // Check if link already exists
    const { data: existingLink } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('id')
      .eq('obligation_id', body.obligation_id)
      .eq('evidence_id', evidenceId)
      .is('unlinked_at', null)
      .single();

    if (existingLink) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        'Evidence is already linked to this obligation',
        409,
        { error: 'Link already exists' },
        { request_id: requestId }
      );
    }

    // Get compliance period (from body or calculate from current date)
    const compliancePeriod = body.compliance_period || `Q${Math.floor((new Date().getMonth() + 3) / 3)}-${new Date().getFullYear()}`;

    // Create link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .insert({
        obligation_id: body.obligation_id,
        evidence_id: evidenceId,
        compliance_period: compliancePeriod,
        notes: body.notes || null,
        linked_by: user.id,
      })
      .select('obligation_id, evidence_id, linked_at, compliance_period')
      .single();

    if (linkError || !link) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to link evidence to obligation',
        500,
        { error: linkError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    return successResponse(link, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Link evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

