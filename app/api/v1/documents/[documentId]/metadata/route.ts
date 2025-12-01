/**
 * Document Metadata Endpoints
 * GET /api/v1/documents/{documentId}/metadata - Get document metadata
 * PUT /api/v1/documents/{documentId}/metadata - Update document metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Get document metadata - RLS will enforce access control
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('id, metadata, updated_at')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        document_id: documentId,
        metadata: document.metadata || {},
        updated_at: document.updated_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get document metadata error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Require Owner, Admin, or Staff role
    const roleCheck = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (roleCheck instanceof NextResponse) {
      return roleCheck;
    }

    const { documentId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { metadata } = body;

    // Validate metadata is an object
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid metadata format',
        422,
        { metadata: 'Must be a JSON object' },
        { request_id: requestId }
      );
    }

    // Verify document exists and user has access (RLS will enforce)
    const { data: existingDocument, error: checkError } = await supabaseAdmin
      .from('documents')
      .select('id, company_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError || !existingDocument) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update metadata
    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('id, metadata, updated_at')
      .single();

    if (updateError) {
      console.error('Update document metadata error:', updateError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update document metadata',
        500,
        { error: updateError.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const updateResponse = successResponse(
      {
        document_id: documentId,
        metadata: updatedDocument.metadata || {},
        updated_at: updatedDocument.updated_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, updateResponse);
  } catch (error: any) {
    console.error('Update document metadata error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

