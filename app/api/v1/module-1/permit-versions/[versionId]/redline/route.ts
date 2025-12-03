/**
 * Module 1: Permit Version Redline Endpoint
 * GET /api/v1/module-1/permit-versions/{id}/redline - Get redline comparison
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

    // Get current version
    const { data: currentVersion, error: currentError } = await supabaseAdmin
      .from('permit_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (currentError || !currentVersion) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit version not found', 404, {}, { request_id: requestId });
    }

    // Get previous version for comparison
    const { data: previousVersion } = await supabaseAdmin
      .from('permit_versions')
      .select('*')
      .eq('document_id', currentVersion.document_id)
      .lt('version_number', currentVersion.version_number)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    // Get obligation versions for both versions
    const { data: currentObligations } = await supabaseAdmin
      .from('obligation_versions')
      .select('*')
      .eq('permit_version_id', currentVersion.id);

    const { data: previousObligations } = previousVersion
      ? await supabaseAdmin
          .from('obligation_versions')
          .select('*')
          .eq('permit_version_id', previousVersion.id)
      : { data: null };

    const redline = {
      current_version: currentVersion,
      previous_version: previousVersion,
      obligation_changes: {
        new: currentObligations?.filter((ov: any) => ov.is_new) || [],
        modified: currentObligations?.filter((ov: any) => ov.is_modified) || [],
        removed: previousObligations?.filter((ov: any) => !currentObligations?.some((co: any) => co.obligation_id === ov.obligation_id)) || [],
      },
    };

    const response = successResponse(redline, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-versions/{id}/redline:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}


