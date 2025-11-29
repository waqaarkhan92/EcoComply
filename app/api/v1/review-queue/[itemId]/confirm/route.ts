/**
 * Confirm Review Queue Item
 * PUT /api/v1/review-queue/{itemId}/confirm
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { itemId } = params;

    // Get review queue item
    const { data: item, error: itemError } = await supabaseAdmin
      .from('review_queue_items')
      .select('id, obligation_id, review_status, document_id')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Review queue item not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (item.review_status !== 'PENDING') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Item has already been reviewed',
        422,
        { review_status: item.review_status },
        { request_id: requestId }
      );
    }

    // Update review queue item
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('review_queue_items')
      .update({
        review_status: 'CONFIRMED',
        review_action: 'CONFIRMED',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to confirm review item',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // If there's an associated obligation, update its review_status
    if (item.obligation_id) {
      await supabaseAdmin
        .from('obligations')
        .update({
          review_status: 'CONFIRMED',
          status: 'PENDING', // Activate the obligation
        })
        .eq('id', item.obligation_id);
    }

    const response = successResponse(
      {
        id: updatedItem.id,
        review_status: updatedItem.review_status,
        reviewed_by: updatedItem.reviewed_by,
        reviewed_at: updatedItem.reviewed_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Confirm review item error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

