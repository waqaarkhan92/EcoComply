/**
 * Module 1: Permit Version Impact Analysis Endpoint
 * GET /api/v1/module-1/permit-versions/{id}/impact-analysis - Get impact analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const requestId = getRequestId(request);
  const { versionId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    // Get version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('permit_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit version not found', 404, {}, { request_id: requestId });
    }

    // Get obligation versions
    const { data: obligationVersions } = await supabaseAdmin
      .from('obligation_versions')
      .select(`
        *,
        obligations:obligation_id (
          id,
          obligation_text,
          obligation_type,
          condition_reference
        )
      `)
      .eq('permit_version_id', versionId);

    // Calculate impact metrics
    const newObligations = obligationVersions?.filter((ov: any) => ov.is_new) || [];
    const modifiedObligations = obligationVersions?.filter((ov: any) => ov.is_modified) || [];
    const removedObligations = obligationVersions?.filter((ov: any) => ov.is_removed) || [];

    const impactAnalysis = {
      version_id: version.id,
      version_number: version.version_number,
      version_type: version.version_type,
      impact_metrics: {
        new_obligations: newObligations.length,
        modified_obligations: modifiedObligations.length,
        removed_obligations: removedObligations.length,
        total_changes: newObligations.length + modifiedObligations.length + removedObligations.length,
      },
      obligation_changes: {
        new: newObligations,
        modified: modifiedObligations,
        removed: removedObligations,
      },
      stored_analysis: version.impact_analysis,
    };

    const response = successResponse(impactAnalysis, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-versions/{id}/impact-analysis:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}



