/**
 * Document Site Assignment Endpoint
 * POST /api/v1/documents/{documentId}/sites - Assign document to site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Parse request body
    const body = await request.json();

    if (!body.site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }

    // Verify document exists
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, company_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify site exists and belongs to same company
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', body.site_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check if document is already assigned to this site
    if (document.site_id === body.site_id) {
      return errorResponse(
        ErrorCodes.CONFLICT,
        'Document is already assigned to this site',
        409,
        { site_id: body.site_id },
        { request_id: requestId }
      );
    }

    // Update document site_id
    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        site_id: body.site_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('id, site_id, updated_at')
      .single();

    if (updateError || !updatedDocument) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to assign document to site',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        document_id: documentId,
        site_id: body.site_id,
        is_primary: body.is_primary || false,
        obligations_shared: body.obligations_shared !== false, // Default to true
        created_at: updatedDocument.updated_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Assign document to site error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

