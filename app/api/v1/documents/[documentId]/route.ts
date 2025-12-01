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

    // Debug: Log the entire params object
    const resolvedParams = await params;
    console.log('Full params object:', JSON.stringify(resolvedParams, null, 2));
    console.log('Params keys:', Object.keys(resolvedParams));
    
    // Extract documentId - try multiple possible keys
    const documentId = resolvedParams.documentId || resolvedParams.id || resolvedParams.document_id;
    
    if (!documentId) {
      console.error('Could not find documentId in params. Available keys:', Object.keys(resolvedParams));
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document ID parameter missing',
        400,
        { 
          document_id: 'Document ID parameter is missing',
          available_params: Object.keys(resolvedParams),
          received_params: resolvedParams
        },
        { request_id: requestId }
      );
    }
    
    // Debug logging
    console.log('Document ID received:', documentId);
    console.log('Document ID type:', typeof documentId);
    console.log('Document ID length:', documentId?.length);

    // Validate UUID format
    if (!documentId || typeof documentId !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Document ID is required and must be a string' },
        { request_id: requestId }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      console.error('UUID validation failed for:', documentId);
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID', received: documentId },
        { request_id: requestId }
      );
    }

    // Get document - supabaseAdmin bypasses RLS, but we still need to verify user access
    console.log('Querying document with ID:', documentId);
    console.log('User ID:', user.id);
    
    // Query document (supabaseAdmin bypasses RLS)
    // Include uploaded_by to check if user uploaded it
    // Retry logic in case of transaction timing issues
    let document = null;
    let error = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await supabaseAdmin
        .from('documents')
        .select('id, site_id, document_type, title, reference_number, status, extraction_status, storage_path, file_size_bytes, mime_type, created_at, updated_at, uploaded_by')
        .eq('id', documentId)
        .is('deleted_at', null)
        .maybeSingle();
      
      document = result.data;
      error = result.error;
      
      if (document) {
        console.log(`Document found on attempt ${attempt}`);
        break;
      }
      
      if (attempt < maxRetries) {
        console.log(`Document not found on attempt ${attempt}, retrying...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
    
    // If still not found, check without deleted_at filter
    if (!document && !error) {
      console.log('Document not found after retries, checking without deleted_at filter...');
      const { data: docWithoutFilter } = await supabaseAdmin
        .from('documents')
        .select('id, deleted_at, site_id, uploaded_by, created_at')
        .eq('id', documentId)
        .maybeSingle();
      
      if (docWithoutFilter) {
        console.log('Document exists but deleted_at is:', docWithoutFilter.deleted_at);
        // Document exists but is deleted
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Document not found',
          404,
          { document_id: documentId, reason: 'Document has been deleted' },
          { request_id: requestId }
        );
      }
    }
    
    console.log('Query result - document:', document ? `found (id: ${document.id}, site_id: ${document.site_id}, uploaded_by: ${document.uploaded_by})` : 'not found');
    console.log('Query result - error:', error ? JSON.stringify(error, null, 2) : 'none');
    
    // Handle database errors FIRST
    if (error) {
      console.error('Database error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // PGRST116 = no rows returned (PostgREST error code)
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
          { document_id: documentId, error_code: error.code },
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch document',
        500,
        { error: error?.message || 'Unknown error', error_code: error.code },
        { request_id: requestId }
      );
    }
    
    // If document found, verify user has access
    if (document) {
      // Check if user uploaded the document (they always have access to their own uploads)
      const isUploader = document.uploaded_by === user.id;
      
      // Also check site_users access
      const { data: siteAccess } = await supabaseAdmin
        .from('site_users')
        .select('site_id')
        .eq('user_id', user.id)
        .eq('site_id', document.site_id)
        .maybeSingle();
      
      console.log('User access check:', {
        site_id: document.site_id,
        is_uploader: isUploader,
        has_site_access: !!siteAccess,
        user_id: user.id,
        uploaded_by: document.uploaded_by
      });
      
      // User has access if they uploaded it OR have site_users access
      if (!isUploader && !siteAccess) {
        // User doesn't have access to this site
        console.log('User does not have access to document:', {
          user_id: user.id,
          document_id: documentId,
          site_id: document.site_id,
          uploaded_by: document.uploaded_by
        });
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Document not found',
          404,
          { document_id: documentId },
          { request_id: requestId }
        );
      }
    }
    
    // If not found, check if document exists at all (for debugging)
    if (!document && !error) {
      console.log('Document not found, checking if it exists at all...');
      
      // Check without deleted_at filter
      const { data: anyDoc } = await supabaseAdmin
        .from('documents')
        .select('id, deleted_at, site_id, uploaded_by, created_at')
        .eq('id', documentId)
        .maybeSingle();
      
      if (anyDoc) {
        console.log('Document exists but may be deleted:', {
          id: anyDoc.id,
          deleted_at: anyDoc.deleted_at,
          site_id: anyDoc.site_id,
          uploaded_by: anyDoc.uploaded_by,
          created_at: anyDoc.created_at
        });
        
        // If document is deleted, return appropriate error
        if (anyDoc.deleted_at) {
          return errorResponse(
            ErrorCodes.NOT_FOUND,
            'Document not found',
            404,
            { document_id: documentId, reason: 'Document has been deleted' },
            { request_id: requestId }
          );
        }
      } else {
        console.log('Document does not exist in database at all');
        console.log('Searching for similar IDs...');
        
        // Try to find documents with similar IDs (for debugging)
        const { data: recentDocs } = await supabaseAdmin
          .from('documents')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('Recent documents:', recentDocs);
      }
    }

    // Document not found after retries
    if (!document) {
      console.log('Document not found in database for ID:', documentId);
      // Try to check if document exists at all (even if deleted)
      const { data: anyDoc } = await supabaseAdmin
        .from('documents')
        .select('id, deleted_at')
        .eq('id', documentId)
        .maybeSingle();
      
      if (anyDoc) {
        console.log('Document exists but is deleted or user lacks access');
      } else {
        console.log('Document does not exist in database');
      }
      
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        { document_id: documentId },
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
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      // Return auth error (401 or 403) immediately
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Parse request body - handle potential JSON parsing errors
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400,
        { error: 'Request body must be valid JSON' },
        { request_id: requestId }
      );
    }

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
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      // Return auth error (401 or 403) immediately
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

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

