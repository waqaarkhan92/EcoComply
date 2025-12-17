/**
 * Link Evidence to Obligation
 * POST /api/v1/evidence/{evidenceId}/link
 * 
 * Links an evidence item to an obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ evidenceId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Staff, Admin, or Owner role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { evidenceId } = params;
    const body = await request.json();
  const { obligation_id } = body;

    if (!obligation_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'obligation_id is required',
        422,
        { obligation_id: 'obligation_id is required' },
        { request_id: requestId }
      );
    }

    // Verify evidence exists and user has access
  const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence_items')
      .select('id, site_id, company_id, enforcement_status')
      .eq('id', evidenceId)
      .is('deleted_at', null)
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

    // Verify obligation exists and user has access
  const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id, company_id, document_id')
      .eq('id', obligation_id)
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

    // Validate site matching based on obligations_shared setting
    // Check if the obligation's document has multi-site assignments
  const { data: documentAssignments, error: assignmentsError } = await supabaseAdmin
      .from('document_site_assignments')
      .select('site_id, obligations_shared, is_primary')
      .eq('document_id', obligation.document_id)
      .order('is_primary', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching document site assignments:', assignmentsError);
      // Continue without validation if we can't fetch assignments
    }

    // Determine if obligations are shared
    let obligationsShared = false;
    let isMultiSiteDocument = false;
    let assignedSiteIds: string[] = [];

    if (documentAssignments && documentAssignments.length > 0) {
      isMultiSiteDocument = documentAssignments.length > 1;
      assignedSiteIds = documentAssignments.map(a => a.site_id);

      // Check if any assignment has obligations_shared = true
      // For multi-site documents, obligations_shared determines the linking rules
      obligationsShared = documentAssignments.some(a => a.obligations_shared === true);
    }

    // Validation Rules:
    // 1. If obligations_shared = false (replicated): evidence.site_id MUST match obligation.site_id
    // 2. If obligations_shared = true (shared): evidence can be from any assigned site
    // 3. For single-site documents: evidence.site_id must match obligation.site_id

    if (!obligationsShared) {
      // Replicated obligations OR single-site document
      // Evidence MUST be from the same site as the obligation
      if (evidence.site_id !== obligation.site_id) {
        // Fetch site names for better error message
        const { data: evidenceSite } = await supabaseAdmin
          .from('sites')
          .select('name')
          .eq('id', evidence.site_id)
          .single();

        const { data: obligationSite } = await supabaseAdmin
          .from('sites')
          .select('name')
          .eq('id', obligation.site_id)
          .single();

        const evidenceSiteName = evidenceSite?.name || 'Unknown Site';
        const obligationSiteName = obligationSite?.name || 'Unknown Site';

        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          isMultiSiteDocument
            ? `Cannot link evidence from "${evidenceSiteName}" to obligation at "${obligationSiteName}". This is a replicated obligation (obligations_shared = false), so evidence must be from the same site as the obligation. Please use site-specific evidence or change the document to use shared obligations.`
            : `Cannot link evidence from "${evidenceSiteName}" to obligation at "${obligationSiteName}". Evidence must be from the same site as the obligation.`,
          422,
          {
            evidence_site_id: evidence.site_id,
            evidence_site_name: evidenceSiteName,
            obligation_site_id: obligation.site_id,
            obligation_site_name: obligationSiteName,
            obligations_shared: false,
            is_multi_site: isMultiSiteDocument,
            validation_rule: 'site_match_required',
          },
          { request_id: requestId }
        );
      }
    } else {
      // Shared obligations (obligations_shared = true)
      // Evidence can be from ANY assigned site
      if (!assignedSiteIds.includes(evidence.site_id)) {
        // Evidence is from a site not assigned to this document
        const { data: evidenceSite } = await supabaseAdmin
          .from('sites')
          .select('name')
          .eq('id', evidence.site_id)
          .single();

        const evidenceSiteName = evidenceSite?.name || 'Unknown Site';

        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `Cannot link evidence from "${evidenceSiteName}". This document uses shared obligations, but the evidence must be from one of the assigned sites.`,
          422,
          {
            evidence_site_id: evidence.site_id,
            evidence_site_name: evidenceSiteName,
            assigned_site_ids: assignedSiteIds,
            obligations_shared: true,
            validation_rule: 'evidence_must_be_from_assigned_site',
          },
          { request_id: requestId }
        );
      }
    }

    // Check if link already exists
  const { data: existingLink } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('id')
      .eq('evidence_id', evidenceId)
      .eq('obligation_id', obligation_id)
      .maybeSingle();

    if (existingLink) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Evidence is already linked to this obligation',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Create link
  const { data: link, error: linkError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .insert({
        evidence_id: evidenceId,
        obligation_id: obligation_id,
        linked_by: user.id,
        linked_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (linkError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to link evidence',
        500,
        { error: linkError.message },
        { request_id: requestId }
      );
    }

    // Update evidence enforcement status to LINKED
  const { error: updateError } = await supabaseAdmin
      .from('evidence_items')
      .update({
        enforcement_status: 'LINKED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', evidenceId);

    if (updateError) {
      console.error('Failed to update evidence enforcement status:', updateError);
      // Don't fail the request, link was created successfully
    }

    // Create audit log entry
    await supabaseAdmin.from('audit_logs').insert({
      action_type: 'EVIDENCE_LINKED',
      entity_type: 'EVIDENCE',
      entity_id: evidenceId,
      user_id: user.id,
      changes: {
        obligation_id: obligation_id,
        linked_at: new Date().toISOString(),
      },
    });

    const response = successResponse(
      {
        link_id: link.id,
        message: 'Evidence linked to obligation successfully',
      },
      201,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error linking evidence:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to link evidence',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
