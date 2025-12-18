/**
 * Comment Individual Endpoints
 * PATCH /api/v1/comments/{commentId} - Update a comment
 * DELETE /api/v1/comments/{commentId} - Delete a comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { commentService } from '@/lib/services/comment-service';

/**
 * PATCH /api/v1/comments/{commentId}
 * Update a comment's content
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ commentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { commentId } = params;

    // Validate commentId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(commentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid comment ID format',
        422,
        { comment_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Check if comment exists and belongs to user
    const existingComment = await commentService.getComment(commentId);
    if (!existingComment) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Comment not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify ownership
    if (existingComment.user_id !== user.id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'You can only edit your own comments',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Parse request body
    let body;
    try {
      body = await parseRequestBody(request);
    } catch (parseError: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        parseError.message,
        422,
        null,
        { request_id: requestId }
      );
    }

    const { content } = body;

    // Validate required fields
    if (!content) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        422,
        { content: 'This field is required' },
        { request_id: requestId }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        422,
        { content: 'Comment content cannot be empty' },
        { request_id: requestId }
      );
    }

    // Update comment using the service
    const updatedComment = await commentService.updateComment(commentId, { content });

    const response = successResponse(updatedComment, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update comment error:', error);

    // Handle validation errors from the service
    if (error.message.includes('cannot be empty') || error.message.includes('not found')) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message,
        422,
        null,
        { request_id: requestId }
      );
    }

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

/**
 * DELETE /api/v1/comments/{commentId}
 * Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ commentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { commentId } = params;

    // Validate commentId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(commentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid comment ID format',
        422,
        { comment_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Check if comment exists and belongs to user
    const existingComment = await commentService.getComment(commentId);
    if (!existingComment) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Comment not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify ownership
    if (existingComment.user_id !== user.id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'You can only delete your own comments',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Delete comment using the service
    await commentService.deleteComment(commentId);

    const response = successResponse(
      { message: 'Comment deleted successfully', comment_id: commentId },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
