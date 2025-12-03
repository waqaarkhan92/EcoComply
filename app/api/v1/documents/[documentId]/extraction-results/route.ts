/**
 * Document Extraction Results Endpoint
 * GET /api/v1/documents/{documentId}/extraction-results - Get extraction results
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
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

    // Get document - RLS will enforce access control
    // Note: extraction_completed_at and obligation_count columns don't exist
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, extraction_status, updated_at')
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

    // If extraction is in progress, return current status
    // Note: EXTRACTING status doesn't exist in DB, only PROCESSING
    if (document.extraction_status === 'PROCESSING') {
      const inProgressResponse = successResponse(
        {
          document_id: documentId,
          extraction_status: 'IN_PROGRESS',
          obligations: [],
          extraction_logs: null,
          created_at: document.updated_at || new Date().toISOString(),
        },
        202, // Accepted - extraction in progress
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, inProgressResponse);
    }

    // If extraction failed, return error status
    if (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' || document.extraction_status === 'EXTRACTION_FAILED') {
      const failedResponse = successResponse(
        {
          document_id: documentId,
          extraction_status: 'FAILED',
          obligations: [],
          extraction_logs: null,
          created_at: document.updated_at || new Date().toISOString(),
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, failedResponse);
    }

    // Get obligations extracted from this document
    const { data: obligations, error: obligationsError } = await supabaseAdmin
      .from('obligations')
      .select(`
        id,
        original_text,
        obligation_title,
        obligation_description,
        category,
        confidence_score,
        review_status,
        is_subjective,
        deadline_date,
        frequency,
        created_at
      `)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (obligationsError) {
      console.error('Error fetching obligations:', obligationsError);
    }

    // Get latest extraction log
    const { data: extractionLogs, error: logsError } = await supabaseAdmin
      .from('extraction_logs')
      .select('*')
      .eq('document_id', documentId)
      .order('extraction_timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logsError) {
      console.error('Error fetching extraction logs:', logsError);
    }

    // Build extraction logs summary
    const extractionLogsSummary = extractionLogs
      ? {
          input_tokens: extractionLogs.metadata?.input_tokens || 0,
          output_tokens: extractionLogs.metadata?.output_tokens || 0,
          estimated_cost: extractionLogs.metadata?.estimated_cost || 0,
          rule_library_hits: extractionLogs.metadata?.rule_library_hit ? 1 : 0,
          api_calls_made: extractionLogs.metadata?.rule_library_hit ? 0 : 1,
        }
      : undefined;

    const response = successResponse(
      {
        document_id: documentId,
        extraction_status: document.extraction_status === 'EXTRACTED' ? 'COMPLETED' : 'PENDING',
        obligations: (obligations || []).map((ob) => ({
          id: ob.id,
          original_text: ob.original_text,
          obligation_title: ob.obligation_title,
          obligation_description: ob.obligation_description,
          category: ob.category,
          confidence_score: ob.confidence_score,
          review_status: ob.review_status,
        })),
        extraction_logs: extractionLogsSummary,
        created_at: document.updated_at || new Date().toISOString(),
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get extraction results error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
