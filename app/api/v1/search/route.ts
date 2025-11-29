/**
 * Global Search Endpoint
 * GET /api/v1/search?q={query}
 * 
 * Search across documents, obligations, sites, and other entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

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
    const query = searchParams.get('q');
    const entityType = searchParams.get('type'); // Optional: 'documents', 'obligations', 'sites', 'all'

    if (!query || query.trim().length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required query parameter: q',
        422,
        { q: 'Search query is required' },
        { request_id: requestId }
      );
    }

    const searchTerm = query.trim();
    const results: any = {
      documents: [],
      obligations: [],
      sites: [],
      total_results: 0,
    };

    // Search documents
    if (!entityType || entityType === 'all' || entityType === 'documents') {
      const { data: documents, error: docError } = await supabaseAdmin
        .from('documents')
        .select('id, title, document_type, status, site_id, created_at')
        .eq('company_id', user.company_id)
        .or(`title.ilike.%${searchTerm}%,permit_number.ilike.%${searchTerm}%,extracted_text.ilike.%${searchTerm}%`)
        .is('deleted_at', null)
        .limit(20);

      if (!docError && documents) {
        results.documents = documents;
      }
    }

    // Search obligations
    if (!entityType || entityType === 'all' || entityType === 'obligations') {
      const { data: obligations, error: oblError } = await supabaseAdmin
        .from('obligations')
        .select('id, obligation_title, obligation_description, status, site_id, created_at')
        .eq('company_id', user.company_id)
        .or(`obligation_title.ilike.%${searchTerm}%,obligation_description.ilike.%${searchTerm}%,original_text.ilike.%${searchTerm}%`)
        .is('deleted_at', null)
        .limit(20);

      if (!oblError && obligations) {
        results.obligations = obligations;
      }
    }

    // Search sites
    if (!entityType || entityType === 'all' || entityType === 'sites') {
      const { data: sites, error: sitesError } = await supabaseAdmin
        .from('sites')
        .select('id, name, regulator, address_line_1, city, created_at')
        .eq('company_id', user.company_id)
        .or(`name.ilike.%${searchTerm}%,address_line_1.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        .is('deleted_at', null)
        .limit(20);

      if (!sitesError && sites) {
        results.sites = sites;
      }
    }

    results.total_results = results.documents.length + results.obligations.length + results.sites.length;

    const response = successResponse(results, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Search error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

