/**
 * Extraction Complete Webhook Endpoint
 * POST /api/v1/webhooks/extraction-complete - Receive extraction completion webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // This endpoint receives webhooks when extraction is complete
    // It may not require standard authentication but should verify webhook signature
    
    // Parse request body
    const body = await request.json();

    if (!body.document_id || !body.extraction_status) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: document_id, extraction_status',
        422,
        { required: ['document_id', 'extraction_status'] },
        { request_id: requestId }
      );
    }

    // Update document with extraction results
    const updates: any = {
      extraction_status: body.extraction_status,
      updated_at: new Date().toISOString(),
    };

    if (body.extraction_status === 'EXTRACTED' || body.extraction_status === 'COMPLETED') {
      updates.extraction_completed_at = new Date().toISOString();
      if (body.obligation_count !== undefined) {
        updates.obligation_count = body.obligation_count;
      }
    }

    if (body.error_message) {
      updates.extraction_error = body.error_message;
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', body.document_id);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update document extraction status',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // Create notification if extraction completed successfully
    if (body.extraction_status === 'EXTRACTED' || body.extraction_status === 'COMPLETED') {
      // Get document to find user
      const { data: document } = await supabaseAdmin
        .from('documents')
        .select('site_id, company_id')
        .eq('id', body.document_id)
        .single();

      if (document) {
        // Get site users to notify
        const { data: siteUsers } = await supabaseAdmin
          .from('user_site_assignments')
          .select('user_id')
          .eq('site_id', document.site_id)
          .limit(10);

        if (siteUsers && siteUsers.length > 0) {
          // Create notifications for each user
          const notifications = siteUsers.map((su: any) => ({
            user_id: su.user_id,
            company_id: document.company_id,
            site_id: document.site_id,
            notification_type: 'SYSTEM_ALERT',
            channel: 'IN_APP',
            priority: 'NORMAL',
            subject: 'Document Extraction Complete',
            body_text: `Document extraction completed. ${body.obligation_count || 0} obligations extracted.`,
            entity_type: 'documents',
            entity_id: body.document_id,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
          }));

          await supabaseAdmin.from('notifications').insert(notifications);
        }
      }
    }

    return successResponse(
      { message: 'Extraction status updated', document_id: body.document_id },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Extraction complete webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

