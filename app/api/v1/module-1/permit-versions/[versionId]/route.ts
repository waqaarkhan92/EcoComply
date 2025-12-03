/**
 * Module 1: Permit Version Detail Endpoints
 * GET /api/v1/module-1/permit-versions/{id} - Get permit version
 * PUT /api/v1/module-1/permit-versions/{id} - Update permit version
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

    const { data: version, error } = await supabaseAdmin
      .from('permit_versions')
      .select(`
        id,
        document_id,
        company_id,
        site_id,
        version_number,
        version_date,
        effective_date,
        expiry_date,
        version_type,
        change_summary,
        redline_document_url,
        impact_analysis,
        is_current,
        metadata,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('id', versionId)
      .single();

    if (error || !version) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit version not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(version, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-versions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
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

    const body = await request.json();
    const {
      version_date,
      effective_date,
      expiry_date,
      version_type,
      change_summary,
      redline_document_url,
      impact_analysis,
      is_current,
    } = body;

    const updateData: any = {
      updated_by: user.id,
    };

    if (version_date !== undefined) updateData.version_date = version_date;
    if (effective_date !== undefined) updateData.effective_date = effective_date;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (version_type !== undefined) updateData.version_type = version_type;
    if (change_summary !== undefined) updateData.change_summary = change_summary;
    if (redline_document_url !== undefined) updateData.redline_document_url = redline_document_url;
    if (impact_analysis !== undefined) updateData.impact_analysis = impact_analysis;
    if (is_current !== undefined) updateData.is_current = is_current;

    const { data: version, error } = await supabaseAdmin
      .from('permit_versions')
      .update(updateData)
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update permit version', 500, { error: error.message }, { request_id: requestId });
    }

    if (!version) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Permit version not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(version, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-1/permit-versions/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}



