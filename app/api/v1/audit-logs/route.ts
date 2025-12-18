/**
 * Audit Logs API
 * GET /api/v1/audit-logs - Query audit logs
 * Query params: entity_type, entity_id, user_id, action, limit, cursor
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { auditService, EntityType, AuditAction } from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const entity_type = searchParams.get('entity_type') as EntityType | null;
    const entity_id = searchParams.get('entity_id');
    const user_id = searchParams.get('user_id');
    const action = searchParams.get('action') as AuditAction | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const cursor = searchParams.get('cursor') || undefined;

    // Validate entity_type if provided
    if (entity_type) {
      const validEntityTypes: EntityType[] = [
        'obligation',
        'evidence',
        'document',
        'pack',
        'corrective_action',
        'deadline',
        'schedule',
      ];
      if (!validEntityTypes.includes(entity_type)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid entity_type',
          400,
          {
            entity_type: `Must be one of: ${validEntityTypes.join(', ')}`,
          },
          { request_id: requestId }
        );
      }
    }

    // Validate action if provided
    if (action) {
      const validActions: AuditAction[] = ['create', 'update', 'delete', 'status_change'];
      if (!validActions.includes(action)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid action',
          400,
          {
            action: `Must be one of: ${validActions.join(', ')}`,
          },
          { request_id: requestId }
        );
      }
    }

    let result;

    // Get audit logs based on query parameters
    if (entity_type && entity_id) {
      // Get logs for a specific entity
      result = await auditService.getAuditLogs(entity_type, entity_id, {
        limit,
        cursor,
      });
    } else if (user_id) {
      // Get logs for a specific user
      result = await auditService.getUserActivity(user_id, {
        limit,
        cursor,
      });
    } else if (entity_type) {
      // Return error - entity_type requires entity_id
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'entity_id is required when entity_type is provided',
        400,
        null,
        { request_id: requestId }
      );
    } else {
      // No filters provided - return error
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'At least one of entity_type+entity_id or user_id must be provided',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Filter by action if provided
    let logs = result.logs;
    if (action) {
      logs = logs.filter((log) => log.action === action);
    }

    const response = successResponse(
      {
        data: logs,
        pagination: {
          limit,
          cursor: cursor || null,
          has_more: result.hasMore,
          next_cursor: result.nextCursor || null,
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
