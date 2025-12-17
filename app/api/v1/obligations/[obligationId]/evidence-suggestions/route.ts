/**
 * Evidence Suggestions API
 * GET /api/v1/obligations/[obligationId]/evidence-suggestions - Get cached AI suggestions
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 9
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { evidenceAnalysisService } from '@/lib/ai/evidence-analysis-service';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { obligationId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Verify obligation belongs to user's company
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, company_id')
      .eq('id', obligationId)
      .eq('company_id', user.company_id)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Get cached suggestions
    const suggestions = await evidenceAnalysisService.getSuggestions(obligationId);

    if (!suggestions) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'No suggestions found. Use POST /analyze-evidence to generate suggestions.',
        404,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        data: suggestions,
        obligation_id: obligationId,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching evidence suggestions:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
