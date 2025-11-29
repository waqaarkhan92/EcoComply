/**
 * Document Endpoints
 * GET /api/v1/documents/{documentId} - Get document details
 * PUT /api/v1/documents/{documentId} - Update document metadata
 * DELETE /api/v1/documents/{documentId} - Soft delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = params;

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

    // Get document - RLS will enforce access control
    // Use maybeSingle() to return null instead of error when not found
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type, title, reference_number, status, extraction_status, storage_path, file_size_bytes, mime_type, page_count, created_at, updated_at')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      // PGRST116 = no rows returned (PostgREST error code)
      // Also check for other "not found" indicators
      if (
        error.code === 'PGRST116' ||
        error.message?.includes('No rows returned') ||
        error.message?.includes('not found') ||
        error.details?.includes('No rows found')
      ) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Document not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      console.error('Get document error:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch document',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    if (!document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get obligation count
    const { data: obligations } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('document_id', documentId);

    // Get file URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(document.storage_path);

    // Map document_type back to API enum
    const typeMap: Record<string, string> = {
      ENVIRONMENTAL_PERMIT: 'PERMIT',
      TRADE_EFFLUENT_CONSENT: 'CONSENT',
      MCPD_REGISTRATION: 'MCPD_REGISTRATION',
    };

    const response = successResponse(
      {
        ...document,
        document_type: typeMap[document.document_type] || document.document_type,
        file_url: urlData?.publicUrl || '',
        obligation_count: obligations?.length || 0,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get document error:', error);
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
  { params }: { params: { documentId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = params;

    // Parse request body
    const body = await request.json();

    // Validate and build updates
    const updates: any = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length < 1) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Title must be a non-empty string',
          422,
          { title: 'Title must be a non-empty string' },
          { request_id: requestId }
        );
      }
      updates.title = body.title;
    }

    if (body.reference_number !== undefined) {
      updates.reference_number = body.reference_number;
    }

    if (body.metadata !== undefined) {
      // Merge with existing metadata
      const { data: existingDoc } = await supabaseAdmin
        .from('documents')
        .select('metadata')
        .eq('id', documentId)
        .single();

      const existingMetadata = existingDoc?.metadata || {};
      updates.metadata = { ...existingMetadata, ...body.metadata };

      // Update specific fields from metadata if provided
      if (body.metadata.issue_date !== undefined) {
        updates.issue_date = body.metadata.issue_date;
      }
      if (body.metadata.expiry_date !== undefined) {
        updates.expiry_date = body.metadata.expiry_date;
      }
      if (body.metadata.effective_date !== undefined) {
        updates.effective_date = body.metadata.effective_date;
      }
    }

    // Check if document exists and user has access (RLS will enforce)
    const { data: existingDocument, error: checkError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingDocument) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update document
    updates.updated_at = new Date().toISOString();

    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select('id, title, reference_number, updated_at')
      .single();

    if (updateError || !updatedDocument) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update document',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    return successResponse(updatedDocument, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Update document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = params;

    // Check if document exists and user has access (RLS will enforce)
    const { data: existingDocument, error: checkError } = await supabaseAdmin
      .from('documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingDocument) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Soft delete document
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete document',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    // Note: We don't delete the file from storage (for compliance/audit purposes)
    // The file remains in storage but the document record is soft-deleted

    const response = successResponse(
      { message: 'Document deleted successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

