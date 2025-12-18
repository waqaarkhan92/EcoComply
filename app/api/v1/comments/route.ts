/**
 * Comments Endpoints
 * GET /api/v1/comments - List comments for an entity
 * POST /api/v1/comments - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  ErrorCodes,
} from '@/lib/api/response';
import { requireAuth, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { commentService } from '@/lib/services/comment-service';

/**
 * GET /api/v1/comments
 * Get comments for a specific entity
 * Query params: entity_type, entity_id, limit, cursor
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');

    // Validate required parameters
    if (!entityType) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'entity_type is required',
        422,
        { entity_type: 'This field is required' },
        { request_id: requestId }
      );
    }

    if (!entityId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'entity_id is required',
        422,
        { entity_id: 'This field is required' },
        { request_id: requestId }
      );
    }

    // Validate entity_type
    const validEntityTypes = ['obligation', 'evidence', 'document', 'pack'];
    if (!validEntityTypes.includes(entityType)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid entity_type',
        422,
        {
          entity_type: `Must be one of: ${validEntityTypes.join(', ')}`,
        },
        { request_id: requestId }
      );
    }

    // Validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid limit parameter',
          422,
          { limit: 'Limit must be a positive integer between 1 and 100' },
          { request_id: requestId }
        );
      }
      limit = parsedLimit;
    }

    // Get comments using the service
    const { comments, hasMore, nextCursor } = await commentService.getComments(
      entityType,
      entityId,
      {
        limit,
        cursor: cursor || undefined,
      }
    );

    const response = paginatedResponse(
      comments,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get comments error:', error);
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
 * POST /api/v1/comments
 * Create a new comment
 * Body: entity_type, entity_id, content, mentions?, parent_id?
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

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

    const { entity_type, entity_id, content, mentions, parent_id } = body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!entity_type) {
      errors.entity_type = 'This field is required';
    } else {
      const validEntityTypes = ['obligation', 'evidence', 'document', 'pack'];
      if (!validEntityTypes.includes(entity_type)) {
        errors.entity_type = `Must be one of: ${validEntityTypes.join(', ')}`;
      }
    }

    if (!entity_id) {
      errors.entity_id = 'This field is required';
    }

    if (!content) {
      errors.content = 'This field is required';
    } else if (typeof content !== 'string' || content.trim().length === 0) {
      errors.content = 'Comment content cannot be empty';
    }

    // Validate mentions if provided
    if (mentions !== undefined) {
      if (!Array.isArray(mentions)) {
        errors.mentions = 'Must be an array of user IDs';
      } else {
        // Validate each mention is a UUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const invalidMentions = mentions.filter(
          (id) => typeof id !== 'string' || !uuidRegex.test(id)
        );
        if (invalidMentions.length > 0) {
          errors.mentions = 'All mentions must be valid UUIDs';
        }
      }
    }

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      if (typeof parent_id !== 'string') {
        errors.parent_id = 'Must be a valid UUID';
      } else {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(parent_id)) {
          errors.parent_id = 'Must be a valid UUID';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        422,
        errors,
        { request_id: requestId }
      );
    }

    // Create comment using the service
    const comment = await commentService.createComment({
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      content,
      mentions: mentions || undefined,
      parentId: parent_id || undefined,
    });

    const response = successResponse(comment, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create comment error:', error);

    // Handle validation errors from the service
    if (
      error.message.includes('Invalid entity_type') ||
      error.message.includes('cannot be empty') ||
      error.message.includes('Parent comment not found') ||
      error.message.includes('same entity')
    ) {
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
