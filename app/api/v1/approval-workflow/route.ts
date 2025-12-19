/**
 * Approval Workflow API Route
 * Handles multi-level approval for high-risk review queue items
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import {
  getApprovalStatus,
  submitApproval,
  getPendingLevel2Approvals,
  escalateToLevel2,
  canUserApprove,
} from '@/lib/services/approval-workflow-service';

/**
 * GET /api/v1/approval-workflow
 * Get pending Level 2 approvals for the user's company
 * Query params:
 * - itemId: Get status for specific item
 * - pendingLevel2: true to get items pending admin approval
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

    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    const pendingLevel2 = searchParams.get('pendingLevel2') === 'true';

    // Get status for specific item
    if (itemId) {
      const status = await getApprovalStatus(itemId);
      if (!status) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Approval status not found for this item',
          404,
          null,
          { request_id: requestId }
        );
      }
      return successResponse({ status }, 200, { request_id: requestId });
    }

    // Get pending Level 2 approvals
    if (pendingLevel2) {
      const items = await getPendingLevel2Approvals(user.company_id);
      return successResponse(
        { items, count: items.length },
        200,
        { request_id: requestId }
      );
    }

    // Default: Return user's approval capabilities
    const canApproveLevel1 = await canUserApprove(user.id, 1);
    const canApproveLevel2 = await canUserApprove(user.id, 2);

    return successResponse(
      {
        userId: user.id,
        capabilities: {
          canApproveLevel1,
          canApproveLevel2,
        },
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Approval workflow GET error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to fetch approval data',
      500,
      null,
      { request_id: requestId }
    );
  }
}

/**
 * POST /api/v1/approval-workflow
 * Submit an approval or rejection, or escalate to Level 2
 * Body:
 * - action: 'approve' | 'reject' | 'escalate'
 * - itemId: string (required)
 * - level: 1 | 2 (for approve/reject)
 * - comment?: string
 * - reason?: string (for escalate)
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
    let body: {
      action: 'approve' | 'reject' | 'escalate';
      itemId: string;
      level?: 1 | 2;
      comment?: string;
      reason?: string;
    };

    try {
      body = await parseRequestBody(request);
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        error.message || 'Invalid request body',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Validate required fields
    if (!body.action) {
      return errorResponse(
        ErrorCodes.MISSING_FIELD,
        'action is required (approve, reject, or escalate)',
        400,
        null,
        { request_id: requestId }
      );
    }

    if (!body.itemId) {
      return errorResponse(
        ErrorCodes.MISSING_FIELD,
        'itemId is required',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Handle escalation
    if (body.action === 'escalate') {
      if (!body.reason) {
        return errorResponse(
          ErrorCodes.MISSING_FIELD,
          'reason is required for escalation',
          400,
          null,
          { request_id: requestId }
        );
      }

      await escalateToLevel2(body.itemId, body.reason);
      return successResponse(
        {
          message: 'Item escalated to Level 2 approval',
          itemId: body.itemId,
        },
        200,
        { request_id: requestId }
      );
    }

    // Handle approve/reject
    const level = body.level || 1;

    // Check user permission
    const hasPermission = await canUserApprove(user.id, level);
    if (!hasPermission) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `You do not have permission to ${body.action} at Level ${level}`,
        403,
        null,
        { request_id: requestId }
      );
    }

    // Submit approval/rejection
    const result = await submitApproval({
      itemId: body.itemId,
      action: body.action === 'approve' ? 'APPROVE' : 'REJECT',
      level,
      userId: user.id,
      comment: body.comment,
    });

    return successResponse(
      {
        message: `Item ${body.action === 'approve' ? 'approved' : 'rejected'} at Level ${level}`,
        status: result,
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Approval workflow POST error:', error);

    // Handle permission errors
    if (error.message?.includes('permission')) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        error.message,
        403,
        null,
        { request_id: requestId }
      );
    }

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to process approval',
      500,
      null,
      { request_id: requestId }
    );
  }
}
