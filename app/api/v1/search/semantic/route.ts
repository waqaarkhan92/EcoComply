/**
 * Semantic Search API
 * POST /api/v1/search/semantic - Natural language search using embeddings
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { embeddingService } from '@/lib/ai/embedding-service';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const { query, entity_types, limit = 20 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Search query is required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate entity_types if provided
    const validEntityTypes = ['obligation', 'document', 'evidence', 'site'];
    if (entity_types && !entity_types.every((t: string) => validEntityTypes.includes(t))) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid entity_types. Must be one of: obligation, document, evidence, site',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Perform semantic search
    const results = await embeddingService.semanticSearch(
      user.company_id,
      query.trim(),
      {
        entityTypes: entity_types,
        limit: Math.min(limit, 100),
        minSimilarity: 0.4,
      }
    );

    // Enrich results with additional metadata
    const enrichedResults = await enrichSearchResults(results);

    const response = successResponse(
      {
        data: enrichedResults,
        query: query.trim(),
        total: enrichedResults.length,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in semantic search API:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

async function enrichSearchResults(results: any[]): Promise<any[]> {
  const enriched = [];

  // Group by entity type for efficient fetching
  const byType: Record<string, string[]> = {};
  for (const result of results) {
    if (!byType[result.entity_type]) {
      byType[result.entity_type] = [];
    }
    byType[result.entity_type].push(result.entity_id);
  }

  // Fetch additional data for each type
  const entityData: Record<string, Record<string, any>> = {};

  if (byType.obligation?.length) {
    const { data } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, obligation_description, category, review_status, site_id, sites(name)')
      .in('id', byType.obligation);

    if (data) {
      entityData.obligation = {};
      for (const item of data) {
        entityData.obligation[item.id] = item;
      }
    }
  }

  if (byType.document?.length) {
    const { data } = await supabaseAdmin
      .from('documents')
      .select('id, title, document_type, status, created_at')
      .in('id', byType.document);

    if (data) {
      entityData.document = {};
      for (const item of data) {
        entityData.document[item.id] = item;
      }
    }
  }

  if (byType.site?.length) {
    const { data } = await supabaseAdmin
      .from('sites')
      .select('id, name, address, city, compliance_score')
      .in('id', byType.site);

    if (data) {
      entityData.site = {};
      for (const item of data) {
        entityData.site[item.id] = item;
      }
    }
  }

  if (byType.evidence?.length) {
    const { data } = await supabaseAdmin
      .from('evidence_items')
      .select('id, file_name, evidence_type, status, created_at')
      .in('id', byType.evidence);

    if (data) {
      entityData.evidence = {};
      for (const item of data) {
        entityData.evidence[item.id] = item;
      }
    }
  }

  // Merge results with metadata
  for (const result of results) {
    const metadata = entityData[result.entity_type]?.[result.entity_id] || {};
    enriched.push({
      ...result,
      metadata,
    });
  }

  return enriched;
}
