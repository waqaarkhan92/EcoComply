/**
 * Regulatory Dashboard Stats
 * GET /api/v1/regulatory/dashboard/stats - Get compliance dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import type { RegulatoryDashboardStats, ComplianceBand } from '@/lib/types/regulatory';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'companyId query parameter is required',
        422,
        { companyId: 'Required' },
        { request_id: requestId }
      );
    }

    // Fetch all required data in parallel
    const [
      sitesResult,
      ccsAssessmentsResult,
      incidentsResult,
      capasResult,
      monitoringResult,
      packsResult,
      adoptionResult,
    ] = await Promise.all([
      // Total sites
      supabaseAdmin
        .from('sites')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .is('deleted_at', null),

      // CCS assessments for current year
      supabaseAdmin
        .from('ccs_assessments')
        .select('id, site_id, compliance_band')
        .eq('company_id', companyId)
        .eq('compliance_year', new Date().getFullYear()),

      // Active incidents
      supabaseAdmin
        .from('regulatory_incidents')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .in('status', ['OPEN', 'INVESTIGATING']),

      // Open CAPAs
      supabaseAdmin
        .from('regulatory_capas')
        .select('id, target_date, status')
        .eq('company_id', companyId)
        .in('status', ['OPEN', 'IN_PROGRESS']),

      // Upcoming monitoring (next 30 days)
      supabaseAdmin
        .from('elv_conditions')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .gte('next_monitoring_due', new Date().toISOString())
        .lte('next_monitoring_due', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .is('deleted_at', null),

      // Packs pending generation
      supabaseAdmin
        .from('regulatory_packs')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('status', 'GENERATING'),

      // Company adoption config
      supabaseAdmin
        .from('company_regulatory_config')
        .select('adoption_mode, adoption_mode_expiry')
        .eq('company_id', companyId)
        .single(),
    ]);

    const totalSites = sitesResult.count || 0;
    const ccsAssessments = ccsAssessmentsResult.data || [];
    const sitesWithCcsAssessment = new Set(ccsAssessments.map(a => a.site_id)).size;

    // Calculate compliance band distribution
    const bandCounts: Record<ComplianceBand, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    ccsAssessments.forEach(assessment => {
      if (assessment.compliance_band) {
        bandCounts[assessment.compliance_band as ComplianceBand]++;
      }
    });

    const complianceBandDistribution = (['A', 'B', 'C', 'D', 'E', 'F'] as ComplianceBand[]).map(band => ({
      band,
      count: bandCounts[band],
      percentage: totalSites > 0 ? (bandCounts[band] / totalSites) * 100 : 0,
      sites: [], // Would need additional query to populate
    }));

    // Calculate overdue CAPAs
    const capas = capasResult.data || [];
    const overdueCapas = capas.filter(capa =>
      capa.target_date && new Date(capa.target_date) < new Date()
    ).length;

    const stats: RegulatoryDashboardStats = {
      totalSites,
      sitesWithCcsAssessment,
      complianceBandDistribution,
      activeIncidents: incidentsResult.count || 0,
      openCapas: capas.length,
      overdueCapas,
      upcomingMonitoring: monitoringResult.count || 0,
      packsPendingGeneration: packsResult.count || 0,
      firstYearModeActive: adoptionResult.data?.adoption_mode === 'FIRST_YEAR',
      firstYearModeExpiry: adoptionResult.data?.adoption_mode_expiry,
    };

    return successResponse(
      stats,
      200,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/regulatory/dashboard/stats:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
