/**
 * Regulatory Pack Readiness Evaluation
 * POST /api/v1/regulatory/packs/evaluate-readiness - Evaluate pack generation readiness
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { PackEngineService } from '@/lib/services/pack-engine-service';
import type { PackType, PackConfiguration } from '@/lib/types/regulatory';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const {
      companyId,
      packType,
      siteIds,
      documentIds,
      configuration,
    } = body as {
      companyId: string;
      packType: PackType;
      siteIds: string[];
      documentIds?: string[];
      configuration?: PackConfiguration;
    };

    // Validation
    if (!companyId || !packType) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: companyId and packType are required',
        422,
        { companyId: 'Required', packType: 'Required' },
        { request_id: requestId }
      );
    }

    if (!siteIds || siteIds.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'At least one site must be selected',
        422,
        { siteIds: 'At least one site required' },
        { request_id: requestId }
      );
    }

    // Create pack engine service and evaluate readiness
    const packEngine = new PackEngineService();

    const result = await packEngine.evaluateReadiness({
      companyId,
      packType,
      siteIds,
      documentIds,
      configuration,
    });

    return successResponse(
      {
        canGenerate: result.blockingFailures.length === 0,
        blockingFailures: result.blockingFailures,
        warnings: result.warnings,
        passedRules: result.passedRules,
      },
      200,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in POST /api/v1/regulatory/packs/evaluate-readiness:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
