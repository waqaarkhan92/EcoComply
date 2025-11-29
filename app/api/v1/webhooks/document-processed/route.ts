/**
 * Document Processed Webhook Endpoint
 * POST /api/v1/webhooks/document-processed - Receive document processing completion webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // This endpoint receives webhooks from internal job processors
    // It may not require standard authentication but should verify webhook signature
    
    // Parse request body
    const body = await request.json();

    if (!body.document_id || !body.status) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: document_id, status',
        422,
        { required: ['document_id', 'status'] },
        { request_id: requestId }
      );
    }

    // Update document status
    const updates: any = {
      extraction_status: body.status === 'COMPLETED' ? 'EXTRACTED' : body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'COMPLETED') {
      updates.extraction_completed_at = new Date().toISOString();
      updates.obligation_count = body.obligation_count || 0;
    } else if (body.status === 'FAILED') {
      updates.extraction_error = body.error_message || 'Processing failed';
      updates.extraction_status = 'PROCESSING_FAILED';
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', body.document_id);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update document status',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    return successResponse(
      { message: 'Document status updated', document_id: body.document_id },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Document processed webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

