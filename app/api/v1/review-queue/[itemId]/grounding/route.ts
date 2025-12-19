/**
 * Grounding Validation API Route
 * Validates AI extractions against source documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { documentGroundingService } from '@/lib/services/document-grounding-service';

interface RouteContext {
  params: Promise<{
    itemId: string;
  }>;
}

/**
 * GET /api/v1/review-queue/[itemId]/grounding
 * Get grounding validation for a review queue item
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { itemId: id } = await context.params;

    // Fetch the review queue item to get obligation_id and document info
    const { data: reviewItem, error: reviewError } = await supabaseAdmin
      .from('review_queue_items')
      .select(`
        id,
        obligation_id,
        document_id,
        original_data,
        obligations (
          id,
          original_text,
          page_reference,
          document_id
        ),
        documents (
          id,
          extracted_text,
          metadata
        )
      `)
      .eq('id', id)
      .single();

    if (reviewError || !reviewItem) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Review item not found',
        404,
        undefined,
        { request_id: requestId }
      );
    }

    // Get the text to validate
    const extractedText =
      reviewItem.original_data?.original_text ||
      (reviewItem.obligations as any)?.original_text ||
      null;

    if (!extractedText) {
      return successResponse({
        isGrounded: false,
        matchScore: 0,
        matchedPage: null,
        matchedSegment: null,
        highlightRanges: [],
        hallucinationRisk: 'HIGH' as const,
        documentText: null,
        extractedText: null,
        matches: [],
        error: 'No extracted text available for validation',
      });
    }

    // Get the document text
    const documentText = (reviewItem.documents as any)?.extracted_text || null;

    if (!documentText) {
      return successResponse({
        isGrounded: false,
        matchScore: 0,
        matchedPage: null,
        matchedSegment: null,
        highlightRanges: [],
        hallucinationRisk: 'HIGH' as const,
        documentText: null,
        extractedText,
        matches: [],
        error: 'No document text available for validation',
      });
    }

    // Perform grounding validation
    const matches = documentGroundingService.findMatchingText(
      extractedText,
      documentText
    );

    const bestMatch = matches.length > 0 ? matches[0] : null;
    const matchScore = bestMatch ? bestMatch.matchScore : 0;

    // Determine hallucination risk
    let hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    if (matchScore >= 80) {
      hallucinationRisk = 'LOW';
    } else if (matchScore >= 50) {
      hallucinationRisk = 'MEDIUM';
    } else {
      hallucinationRisk = 'HIGH';
    }

    // Get highlight ranges
    const highlightRanges = documentGroundingService.highlightMatches(
      documentText,
      matches
    );

    // Get page reference if available
    const pageReference =
      reviewItem.original_data?.page_number ||
      (reviewItem.obligations as any)?.page_reference ||
      null;

    return successResponse({
      isGrounded: matchScore >= 50,
      matchScore,
      matchedPage: pageReference,
      matchedSegment: bestMatch?.matchedText || null,
      highlightRanges,
      hallucinationRisk,
      documentText,
      extractedText,
      matches: matches.map((m) => ({
        startIndex: m.startIndex,
        endIndex: m.endIndex,
        matchScore: m.matchScore,
        matchedText: m.matchedText,
      })),
    });
  } catch (error) {
    console.error('Error validating grounding:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to validate grounding',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
