/**
 * Document Download Endpoint
 * GET /api/v1/documents/{documentId}/download - Download document file
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

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

    // Get document - RLS will enforce access control
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, storage_path, mime_type, file_size_bytes')
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

    // Download file from Supabase Storage
    const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage;
    const bucket = 'documents';
    const path = document.storage_path.replace(`${bucket}/`, '');

    const { data: fileData, error: downloadError } = await storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to download document file',
        500,
        { error: downloadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine filename
    const extension = document.mime_type === 'application/pdf' ? 'pdf' : 'file';
    const filename = `${document.title || 'document'}.${extension}`;

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type || 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'X-Request-ID': requestId,
      },
    });
  } catch (error: any) {
    console.error('Download document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

