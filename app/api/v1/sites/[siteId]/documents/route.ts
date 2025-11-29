/**
 * Site Documents Endpoint
 * GET /api/v1/sites/{siteId}/documents - List documents for site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { siteId } = params;

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (site.company_id !== user.company_id) {
      // Check consultant access
      const { data: consultantAccess } = await supabaseAdmin
        .from('consultant_client_assignments')
        .select('id')
        .eq('consultant_id', user.id)
        .eq('client_company_id', site.company_id)
        .eq('status', 'ACTIVE')
        .single();

      if (!consultantAccess) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - get documents linked to this site via document_site_assignments
    let query = supabaseAdmin
      .from('document_site_assignments')
      .select(`
        documents (
          id,
          title,
          document_type,
          status,
          extraction_status,
          file_name,
          file_size,
          created_at,
          updated_at
        )
      `)
      .eq('site_id', siteId);

    const { data: assignments, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch documents',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Extract documents from assignments
    const documents = (assignments || [])
      .map((assignment: any) => assignment.documents)
      .filter((doc: any) => doc !== null);

    // Apply filters (client-side for now, can be optimized with better query)
    let filteredDocs = documents;
    if (filters.document_type) {
      filteredDocs = filteredDocs.filter((doc: any) => doc.document_type === filters.document_type);
    }
    if (filters.status) {
      filteredDocs = filteredDocs.filter((doc: any) => doc.status === filters.status);
    }

    // Apply sorting
    if (sort.length > 0) {
      filteredDocs.sort((a: any, b: any) => {
        for (const sortItem of sort) {
          const aVal = a[sortItem.field];
          const bVal = b[sortItem.field];
          if (aVal !== bVal) {
            return sortItem.direction === 'asc' 
              ? (aVal > bVal ? 1 : -1)
              : (aVal < bVal ? 1 : -1);
          }
        }
        return 0;
      });
    } else {
      // Default sort by created_at desc
      filteredDocs.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Pagination
    const hasMore = filteredDocs.length > limit;
    const results = hasMore ? filteredDocs.slice(0, limit) : filteredDocs;

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get site documents error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
