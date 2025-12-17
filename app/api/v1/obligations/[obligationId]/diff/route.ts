/**
 * Obligation Diff API
 * GET /api/v1/obligations/[obligationId]/diff - Compare two versions of an obligation
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 8
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { computeObjectDiff, computeTextDiff } from '@/lib/services/diff-service';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { obligationId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const v1 = searchParams.get('v1'); // Version 1 (older)
    const v2 = searchParams.get('v2'); // Version 2 (newer)

    // Verify obligation belongs to user's company
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, company_id')
      .eq('id', obligationId)
      .eq('company_id', user.company_id)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Fetch audit logs with changes for this obligation
    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action,
        changes,
        created_at,
        user_id,
        users(full_name, email)
      `)
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligationId)
      .order('created_at', { ascending: true });

    const { data: versions, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch versions',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    if (!versions || versions.length === 0) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'No version history found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // If specific versions requested, find them
    let version1: any = null;
    let version2: any = null;

    if (v1 && v2) {
      version1 = versions.find(v => v.id === v1);
      version2 = versions.find(v => v.id === v2);

      if (!version1 || !version2) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'One or both versions not found',
          404,
          {},
          { request_id: requestId }
        );
      }
    } else {
      // Default: compare last two versions
      if (versions.length >= 2) {
        version1 = versions[versions.length - 2];
        version2 = versions[versions.length - 1];
      } else {
        // Only one version, compare with empty state
        version1 = { changes: { old: {} } };
        version2 = versions[0];
      }
    }

    // Extract old and new states
    const oldState = version1.changes?.old || version1.changes?.new || {};
    const newState = version2.changes?.new || version2.changes?.old || {};

    // Compute object diff
    const fieldDiffs = computeObjectDiff(oldState, newState);

    // Compute text diff for description/original_text if present
    let textDiff = null;
    if (oldState.original_text || newState.original_text) {
      textDiff = computeTextDiff(
        oldState.original_text || '',
        newState.original_text || ''
      );
    }

    const response = successResponse(
      {
        data: {
          obligation_id: obligationId,
          version1: {
            id: version1.id,
            created_at: version1.created_at,
            user: version1.users || null,
          },
          version2: {
            id: version2.id,
            created_at: version2.created_at,
            user: version2.users || null,
          },
          field_changes: fieldDiffs,
          text_diff: textDiff,
          summary: {
            total_changes: fieldDiffs.length,
            added: fieldDiffs.filter(d => d.type === 'added').length,
            removed: fieldDiffs.filter(d => d.type === 'removed').length,
            modified: fieldDiffs.filter(d => d.type === 'modified').length,
          },
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error computing obligation diff:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
