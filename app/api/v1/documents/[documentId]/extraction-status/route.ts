/**
 * Document Extraction Status Endpoint
 * GET /api/v1/documents/{documentId}/extraction-status - Get extraction status
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

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

    // Get document extraction status - RLS will enforce access control
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select(`
        id,
        extraction_status,
        created_at,
        updated_at,
        obligation_count
      `)
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

    // Map internal status to API status
    let apiStatus: string = document.extraction_status || 'PENDING';
    
    // Normalize status values
    if (apiStatus === 'PROCESSING' || apiStatus === 'EXTRACTING') {
      apiStatus = 'IN_PROGRESS';
    } else if (apiStatus === 'EXTRACTED') {
      apiStatus = 'COMPLETED';
    } else if (apiStatus === 'PROCESSING_FAILED' || apiStatus === 'EXTRACTION_FAILED') {
      apiStatus = 'FAILED';
    }

    // Calculate progress if in progress
    let progress: number | null = null;
    if (apiStatus === 'IN_PROGRESS' && document.created_at) {
      const startTime = new Date(document.created_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      
      // Estimate progress based on time (rough estimate: 30 seconds average for extraction)
      progress = Math.min(95, Math.floor((elapsedSeconds / 30) * 100));
    } else if (apiStatus === 'COMPLETED') {
      progress = 100;
    }

    const response = successResponse(
      {
        document_id: documentId,
        status: apiStatus,
        progress: progress,
        obligation_count: document.obligation_count || 0,
        started_at: document.created_at || null,
        completed_at: apiStatus === 'COMPLETED' ? document.updated_at || null : null,
        error: null,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get extraction status error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

