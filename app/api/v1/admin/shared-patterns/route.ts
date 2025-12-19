/**
 * Shared Pattern Management API Route
 * Manages cross-customer pattern sharing for AI cost reduction
 * Owner-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

/**
 * GET /api/v1/admin/shared-patterns
 * List shared patterns with optional filtering
 *
 * Query parameters:
 * - regulator: Filter by regulator (e.g., "EA", "OFWAT")
 * - documentType: Filter by document type (e.g., "PERMIT", "COMPLIANCE_REPORT")
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require OWNER role
    const authResult = await requireRole(request, ['OWNER']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const service = getSharedPatternService();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const regulator = searchParams.get('regulator') || undefined;
    const documentType = searchParams.get('documentType') || undefined;

    // Fetch shared patterns
    const patterns = await service.getSharedPatterns({
      regulator,
      documentType,
    });

    return successResponse(
      {
        patterns,
        count: patterns.length,
        filters: {
          regulator: regulator || null,
          documentType: documentType || null,
        },
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Shared patterns GET error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to fetch shared patterns',
      500,
      null,
      { request_id: requestId }
    );
  }
}

/**
 * POST /api/v1/admin/shared-patterns
 * Promote a pattern candidate to a shared global pattern
 *
 * Request body:
 * {
 *   "patternId": "uuid-of-pattern-candidate"
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require OWNER role
    const authResult = await requireRole(request, ['OWNER']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const service = getSharedPatternService();

    // Parse request body
    let body: { patternId?: string };
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

    // Validate patternId
    if (!body.patternId) {
      return errorResponse(
        ErrorCodes.MISSING_FIELD,
        'patternId is required',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Check pattern eligibility
    const eligibility = await service.checkPatternForPromotion(body.patternId);

    if (!eligibility.eligible) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        eligibility.reason || 'Pattern not eligible for promotion',
        422,
        { patternId: body.patternId },
        { request_id: requestId }
      );
    }

    // Promote the pattern
    const promotedPattern = await service.promoteToSharedPattern(body.patternId);

    return successResponse(
      {
        pattern: promotedPattern,
        message: 'Pattern successfully promoted to shared global pattern',
      },
      201,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Shared patterns POST error:', error);

    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        error.message,
        404,
        null,
        { request_id: requestId }
      );
    }

    if (error.message?.includes('not eligible')) {
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
      error.message || 'Failed to promote pattern',
      500,
      null,
      { request_id: requestId }
    );
  }
}
