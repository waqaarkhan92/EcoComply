/**
 * Get Evidence for Obligation
 * GET /api/v1/obligations/{obligationId}/evidence
 * 
 * Lists all evidence linked to an obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, createCursor } from '@/lib/api/pagination';

export async function GET(
  request: NextRequest,
  { params }: { params: { obligationId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { obligationId } = params;

    // Parse pagination params
    const { limit, cursor } = parsePaginationParams(request);

    // Check if obligation exists and user has access (RLS will enforce)
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('id', obligationId)
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

    // Get evidence links for this obligation
    let linksQuery = supabaseAdmin
      .from('obligation_evidence_links')
      .select('evidence_id, linked_at, compliance_period, notes')
      .eq('obligation_id', obligationId)
      .is('unlinked_at', null)
      .order('linked_at', { ascending: false })
      .limit(limit + 1);

    const { data: links, error: linksError } = await linksQuery;

    if (linksError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence links',
        500,
        { error: linksError.message },
        { request_id: requestId }
      );
    }

    if (!links || links.length === 0) {
      return paginatedResponse([], undefined, limit, false, { request_id: requestId });
    }

    // Get evidence IDs
    const evidenceIds = links.map((link: any) => link.evidence_id);

    // Get evidence items
    const { data: evidenceItems, error: evidenceError } = await supabaseAdmin
      .from('evidence_items')
      .select('id, file_name, file_type, evidence_type, file_size_bytes, storage_path, created_at')
      .in('id', evidenceIds)
      .eq('is_archived', false);

    if (evidenceError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence',
        500,
        { error: evidenceError.message },
        { request_id: requestId }
      );
    }

    // Combine evidence with link information
    const evidenceMap = new Map(evidenceItems?.map((e: any) => [e.id, e]) || []);
    const combined = links
      .map((link: any) => {
        const evidence = evidenceMap.get(link.evidence_id);
        if (!evidence) return null;

        // Get file URL
        const { data: urlData } = supabaseAdmin.storage
          .from('evidence')
          .getPublicUrl(evidence.storage_path);

        return {
          id: evidence.id,
          file_name: evidence.file_name,
          evidence_type: evidence.evidence_type,
          file_url: urlData?.publicUrl || '',
          file_size: evidence.file_size_bytes,
          linked_at: link.linked_at,
          compliance_period: link.compliance_period,
          notes: link.notes,
        };
      })
      .filter(Boolean);

    // Check if there are more results
    const hasMore = combined.length > limit;
    const results = hasMore ? combined.slice(0, limit) : combined;

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      if (lastItem) {
        nextCursor = createCursor(lastItem.id, lastItem.linked_at);
      }
    }

    return paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get obligation evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

