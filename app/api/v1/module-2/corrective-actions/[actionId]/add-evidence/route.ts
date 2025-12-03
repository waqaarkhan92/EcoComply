/**
 * Module 2: Corrective Action Add Evidence Endpoint
 * POST /api/v1/module-2/corrective-actions/{id}/add-evidence - Add resolution evidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const requestId = getRequestId(request);
  const { actionId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const { evidence_ids } = body;

    if (!evidence_ids || !Array.isArray(evidence_ids) || evidence_ids.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required field',
        400,
        { required: ['evidence_ids (array)'] },
        { request_id: requestId }
      );
    }

    // Get existing action to verify access and get current evidence_ids
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('corrective_actions')
      .select('id, company_id, evidence_ids')
      .eq('id', actionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Corrective action not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this corrective action', 403, {}, { request_id: requestId });
    }

    // Merge with existing evidence_ids
    const currentEvidenceIds = existing.evidence_ids || [];
    const mergedEvidenceIds = [...new Set([...currentEvidenceIds, ...evidence_ids])];

    // Update action
    const { data: action, error } = await supabaseAdmin
      .from('corrective_actions')
      .update({ evidence_ids: mergedEvidenceIds })
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to add evidence', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(action, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/corrective-actions/{id}/add-evidence:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

