/**
 * Module 2: Reconciliation Calculate Endpoint
 * POST /api/v1/module-2/reconciliation/calculate - Calculate reconciliation for a parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) return moduleCheck;

    const body = await request.json();
    const { parameter_id, date_range_start, date_range_end } = body;

    // Validate required fields
    if (!parameter_id || !date_range_start || !date_range_end) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['parameter_id', 'date_range_start', 'date_range_end'] },
        { request_id: requestId }
      );
    }

    // Verify parameter exists and user has access
    const { data: parameter, error: paramError } = await supabaseAdmin
      .from('parameters')
      .select('id, company_id, limit_value, unit')
      .eq('id', parameter_id)
      .single();

    if (paramError || !parameter) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Parameter not found', 404, {}, { request_id: requestId });
    }

    if (parameter.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this parameter', 403, {}, { request_id: requestId });
    }

    // Fetch lab results for the date range
    const { data: labResults, error: labError } = await supabaseAdmin
      .from('lab_results')
      .select('recorded_value, unit, sample_date')
      .eq('parameter_id', parameter_id)
      .gte('sample_date', date_range_start)
      .lte('sample_date', date_range_end)
      .order('sample_date', { ascending: true });

    if (labError) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch lab results', 500, { error: labError.message }, { request_id: requestId });
    }

    // Fetch discharge volumes for the date range
    const { data: dischargeVolumes, error: volumeError } = await supabaseAdmin
      .from('discharge_volumes')
      .select('volume_m3, recording_date')
      .eq('site_id', parameter.company_id) // Note: This should match the parameter's site
      .gte('recording_date', date_range_start)
      .lte('recording_date', date_range_end)
      .order('recording_date', { ascending: true });

    if (volumeError) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch discharge volumes', 500, { error: volumeError.message }, { request_id: requestId });
    }

    // Calculate total exposure: concentration × volume
    // For simplicity, we'll calculate average concentration and total volume
    let totalExposure = 0;
    let totalVolume = 0;
    let averageConcentration = 0;

    if (labResults && labResults.length > 0) {
      const totalConcentration = labResults.reduce((sum, result) => sum + parseFloat(result.recorded_value.toString()), 0);
      averageConcentration = totalConcentration / labResults.length;
    }

    if (dischargeVolumes && dischargeVolumes.length > 0) {
      totalVolume = dischargeVolumes.reduce((sum, volume) => sum + parseFloat(volume.volume_m3.toString()), 0);
    }

    // Calculate exposure (concentration × volume)
    totalExposure = averageConcentration * totalVolume;

    // Calculate breach likelihood score (0-100)
    // Higher concentration relative to limit = higher breach likelihood
    const limitValue = parseFloat(parameter.limit_value.toString());
    const concentrationRatio = limitValue > 0 ? (averageConcentration / limitValue) * 100 : 0;
    const breachLikelihoodScore = Math.min(100, Math.max(0, concentrationRatio));

    // Determine risk level
    let riskLevel = 'LOW';
    if (breachLikelihoodScore >= 80) {
      riskLevel = 'HIGH';
    } else if (breachLikelihoodScore >= 50) {
      riskLevel = 'MEDIUM';
    }

    const result = {
      parameter_id,
      date_range_start,
      date_range_end,
      total_exposure: totalExposure,
      average_concentration: averageConcentration,
      total_volume: totalVolume,
      breach_likelihood_score: breachLikelihoodScore,
      risk_level: riskLevel,
      limit_value: limitValue,
      calculation_timestamp: new Date().toISOString(),
    };

    const response = successResponse(result, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/reconciliation/calculate:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

