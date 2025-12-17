/**
 * CCS Assessments Endpoints
 * GET /api/v1/regulatory/ccs/assessments - List CCS assessments
 * POST /api/v1/regulatory/ccs/assessments - Create new assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams } from '@/lib/api/pagination';
import type { AssessedBy, ComplianceBand } from '@/lib/types/regulatory';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { limit } = parsePaginationParams(request);
    const companyId = request.nextUrl.searchParams.get('companyId');
    const siteId = request.nextUrl.searchParams.get('siteId');
    const year = request.nextUrl.searchParams.get('year');

    if (!companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'companyId query parameter is required',
        422,
        { companyId: 'Required' },
        { request_id: requestId }
      );
    }

    let query = supabaseAdmin
      .from('ccs_assessments')
      .select(`
        *,
        site:sites(id, name)
      `)
      .eq('company_id', companyId)
      .order('assessment_date', { ascending: false })
      .limit(limit + 1);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    if (year) {
      query = query.eq('compliance_year', parseInt(year));
    }

    const { data: assessments, error } = await query;

    if (error) {
      console.error('Error fetching CCS assessments:', error);
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch CCS assessments',
        500,
        undefined,
        { request_id: requestId }
      );
    }

    const hasMore = (assessments || []).length > limit;
    const result = hasMore ? assessments!.slice(0, limit) : assessments || [];

    return paginatedResponse(
      result,
      hasMore ? result[result.length - 1]?.id : undefined,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/regulatory/ccs/assessments:', error);
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
      siteId,
      companyId,
      complianceYear,
      assessmentDate,
      totalScore,
      assessedBy,
      carReference,
      carIssuedDate,
      appealDeadline,
      notes,
    } = body;

    // Validation
    if (!siteId || !companyId || !complianceYear || !assessmentDate) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        422,
        {
          siteId: !siteId ? 'Required' : undefined,
          companyId: !companyId ? 'Required' : undefined,
          complianceYear: !complianceYear ? 'Required' : undefined,
          assessmentDate: !assessmentDate ? 'Required' : undefined,
        },
        { request_id: requestId }
      );
    }

    // Calculate compliance band based on score
    let complianceBand: ComplianceBand | null = null;
    if (typeof totalScore === 'number') {
      if (totalScore === 0) complianceBand = 'A';
      else if (totalScore <= 30) complianceBand = 'B';
      else if (totalScore <= 60) complianceBand = 'C';
      else if (totalScore <= 100) complianceBand = 'D';
      else if (totalScore <= 150) complianceBand = 'E';
      else complianceBand = 'F';
    }

    const { data: assessment, error } = await supabaseAdmin
      .from('ccs_assessments')
      .insert({
        site_id: siteId,
        company_id: companyId,
        compliance_year: complianceYear,
        assessment_date: assessmentDate,
        total_score: totalScore || 0,
        compliance_band: complianceBand,
        assessed_by: assessedBy as AssessedBy,
        car_reference: carReference,
        car_issued_date: carIssuedDate,
        appeal_deadline: appealDeadline,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating CCS assessment:', error);
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create CCS assessment',
        500,
        undefined,
        { request_id: requestId }
      );
    }

    return successResponse(
      assessment,
      201,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in POST /api/v1/regulatory/ccs/assessments:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
