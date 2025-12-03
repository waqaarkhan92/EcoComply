/**
 * Module 3: Exemptions Endpoints
 * GET /api/v1/module-3/exemptions - List exemptions
 * POST /api/v1/module-3/exemptions - Create exemption
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    let query = supabaseAdmin
      .from('exemptions')
      .select(`
        id,
        generator_id,
        company_id,
        site_id,
        exemption_type,
        start_date,
        end_date,
        duration_hours,
        exemption_reason,
        evidence_ids,
        compliance_verified,
        verified_by,
        verified_at,
        verification_notes,
        created_at,
        updated_at,
        created_by
      `);

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.generator_id) query = query.eq('generator_id', filters.generator_id);
    if (filters.exemption_type) query = query.eq('exemption_type', filters.exemption_type);
    if (filters.compliance_verified !== undefined) query = query.eq('compliance_verified', filters.compliance_verified === 'true');

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('start_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    query = query.limit(limit + 1);

    const { data: exemptions, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch exemptions', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (exemptions || []).length > limit;
    const data = hasMore ? (exemptions || []).slice(0, limit) : (exemptions || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/exemptions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const {
      generator_id,
      exemption_type,
      start_date,
      end_date,
      duration_hours,
      exemption_reason,
      evidence_ids,
    } = body;

    // Validate required fields
    if (!generator_id || !exemption_type || !start_date || !exemption_reason) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['generator_id', 'exemption_type', 'start_date', 'exemption_reason'] },
        { request_id: requestId }
      );
    }

    // Validate exemption_type enum
    const validExemptionTypes = ['TESTING', 'EMERGENCY_OPERATION', 'MAINTENANCE', 'OTHER'];
    if (!validExemptionTypes.includes(exemption_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid exemption_type',
        400,
        { exemption_type: `Must be one of: ${validExemptionTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Verify generator exists and user has access
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id, site_id')
      .eq('id', generator_id)
      .single();

    if (genError || !generator) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Generator not found', 404, {}, { request_id: requestId });
    }

    if (generator.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this generator', 403, {}, { request_id: requestId });
    }

    // Create exemption
    const { data: exemption, error } = await supabaseAdmin
      .from('exemptions')
      .insert({
        generator_id,
        company_id: user.company_id,
        site_id: generator.site_id,
        exemption_type,
        start_date,
        end_date: end_date || null,
        duration_hours: duration_hours || null,
        exemption_reason,
        evidence_ids: evidence_ids || [],
        compliance_verified: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create exemption', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(exemption, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/exemptions:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

