/**
 * Document Preview Endpoint
 * GET /api/v1/documents/{documentId}/preview - Preview document (if supported format)
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
    const pageParam = request.nextUrl.searchParams.get('page');
    const pageNumber = pageParam ? parseInt(pageParam, 10) : undefined;

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
      .select('id, storage_path, mime_type, page_count')
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

    // Check if preview is supported
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!document.mime_type || !supportedTypes.includes(document.mime_type)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Preview not available for this file type',
        415,
        { mime_type: document.mime_type },
        { request_id: requestId }
      );
    }

    // Validate page number if provided
    if (pageNumber !== undefined && pageNumber !== null) {
      if (isNaN(pageNumber) || pageNumber < 1) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid page number. Must be a positive integer',
          422,
          { page: 'Must be a positive integer' },
          { request_id: requestId }
        );
      }

      // Check if page number exceeds document page count (if known)
      if (document.page_count && pageNumber > document.page_count) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `Page number exceeds document page count. Document has ${document.page_count} page(s)`,
          422,
          { page: `Document has ${document.page_count} page(s)` },
          { request_id: requestId }
        );
      }
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
    let buffer = Buffer.from(arrayBuffer);

    // Handle PDF page extraction if page parameter is specified
    if (document.mime_type === 'application/pdf' && pageNumber !== null && pageNumber !== undefined) {
      try {
        const { PDFDocument } = await import('pdf-lib');

        // Load the PDF document
        const sourcePdf = await PDFDocument.load(buffer);
        const totalPages = sourcePdf.getPageCount();

        // Validate page number against actual page count
        if (pageNumber > totalPages) {
          return errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `Page number exceeds document page count. Document has ${totalPages} page(s)`,
            422,
            { page: `Document has ${totalPages} page(s)` },
            { request_id: requestId }
          );
        }
        
        // Create a new PDF with just the requested page
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNumber - 1]); // pdf-lib uses 0-based indexing
        newPdf.addPage(copiedPage);
        
        // Convert to buffer
        const pdfBytes = await newPdf.save();
        buffer = Buffer.from(pdfBytes);
      } catch (pdfError: any) {
        // If pdf-lib is not available or extraction fails, log error and return full PDF
        console.warn('PDF page extraction failed, returning full document:', pdfError.message);
        // Continue to return full PDF as fallback
      }
    }

    // For images, page parameter is ignored (images are single-page)

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type || 'application/pdf',
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Preview document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

