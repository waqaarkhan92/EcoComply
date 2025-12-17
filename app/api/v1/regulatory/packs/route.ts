/**
 * Regulatory Packs Endpoints
 * GET /api/v1/regulatory/packs - List regulatory packs
 * POST /api/v1/regulatory/packs - Generate a new regulatory pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams } from '@/lib/api/pagination';
import type { PackType, PackStatus, PackConfiguration } from '@/lib/types/regulatory';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const searchParams = request.nextUrl.searchParams;

    // Support both ?companyId=xxx and ?filter[companyId]=xxx formats
    const companyId = filters.companyId || searchParams.get('companyId');
    const status = filters.status || searchParams.get('status');
    const packType = filters.packType || searchParams.get('packType');

    let query = supabaseAdmin
      .from('regulatory_packs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (status) {
      query = query.eq('status', status as PackStatus);
    }
    if (packType) {
      query = query.eq('pack_type', packType as PackType);
    }

    const { data: packs, error } = await query;

    if (error) {
      console.error('Error fetching regulatory packs:', error);
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch regulatory packs',
        500,
        undefined,
        { request_id: requestId }
      );
    }

    // Fetch site names for the packs (site_ids is stored as array in regulatory_packs)
    const allSiteIds = [...new Set((packs || []).flatMap(p => p.site_ids || []))];
    let sitesMap: Record<string, { id: string; name: string }> = {};

    if (allSiteIds.length > 0) {
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .in('id', allSiteIds);

      if (sites) {
        sitesMap = sites.reduce((acc, site) => {
          acc[site.id] = site;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }
    }

    // Transform data to include site details
    const transformedPacks = (packs || []).map(pack => ({
      ...pack,
      sites: (pack.site_ids || []).map((id: string) => sitesMap[id]).filter(Boolean),
    }));

    const hasMore = transformedPacks.length > limit;
    const resultPacks = hasMore ? transformedPacks.slice(0, limit) : transformedPacks;

    return paginatedResponse(
      resultPacks,
      hasMore ? resultPacks[resultPacks.length - 1]?.id : undefined,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/regulatory/packs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

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

    // Create pack record (site_ids array is stored directly in the table)
    const { data: pack, error: packError } = await supabaseAdmin
      .from('regulatory_packs')
      .insert({
        company_id: companyId,
        pack_type: packType,
        site_ids: siteIds,
        document_ids: documentIds || [],
        generation_date: new Date().toISOString(),
        status: 'GENERATING' as PackStatus,
        configuration: configuration || {},
        blocking_failures: [],
        warnings: [],
        passed_rules: [],
        generated_by: user.id,
      })
      .select()
      .single();

    if (packError) {
      console.error('Error creating regulatory pack:', packError);
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create regulatory pack',
        500,
        { error: packError.message },
        { request_id: requestId }
      );
    }

    // TODO: Queue pack generation job
    // For now, we'll just return the pack in GENERATING status
    // The actual generation would be handled by a background job

    return successResponse(
      { packId: pack.id, status: pack.status },
      201,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in POST /api/v1/regulatory/packs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
