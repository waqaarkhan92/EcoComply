/**
 * Automatic Frequency Calculation Endpoint
 * POST /api/v1/module-3/generators/{id}/calculate-frequency - Calculate monitoring frequencies based on generator capacity
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ generatorId: string }> }
) {
  const requestId = getRequestId(request);
  const { generatorId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_3', user.company_id);

    // Get generator details
    const { data: generator, error: generatorError } = await supabaseAdmin
      .from('generators')
      .select('id, capacity_mw, company_id, site_id')
      .eq('id', generatorId)
      .single();

    if (generatorError || !generator) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Generator not found', 404, {}, { request_id: requestId });
    }

    if (generator.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this generator', 403, {}, { request_id: requestId });
    }

    // Find matching regulation threshold based on capacity
    const { data: thresholds, error: thresholdsError } = await supabaseAdmin
      .from('regulation_thresholds')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .lte('capacity_min_mw', generator.capacity_mw)
      .or(`capacity_max_mw.is.null,capacity_max_mw.gte.${generator.capacity_mw}`)
      .order('capacity_min_mw', { ascending: false })
      .limit(1);

    if (thresholdsError) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to find matching threshold', 500, { error: thresholdsError.message }, { request_id: requestId });
    }

    if (!thresholds || thresholds.length === 0) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'No matching regulation threshold found for generator capacity', 404, {}, { request_id: requestId });
    }

    const threshold = thresholds[0];

    // Create frequency calculation record
    const { data: calculation, error: calcError } = await supabaseAdmin
      .from('frequency_calculations')
      .insert({
        generator_id: generatorId,
        regulation_threshold_id: threshold.id,
        company_id: user.company_id,
        site_id: generator.site_id,
        calculation_date: new Date().toISOString().split('T')[0],
        generator_capacity_mw: generator.capacity_mw,
        calculated_monitoring_frequency: threshold.monitoring_frequency,
        calculated_stack_test_frequency: threshold.stack_test_frequency,
        calculated_reporting_frequency: threshold.reporting_frequency,
        calculation_details: {
          threshold_type: threshold.threshold_type,
          capacity_range: {
            min: threshold.capacity_min_mw,
            max: threshold.capacity_max_mw,
          },
        },
      })
      .select()
      .single();

    if (calcError) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create frequency calculation', 500, { error: calcError.message }, { request_id: requestId });
    }

    const response = successResponse(calculation, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/generators/{id}/calculate-frequency:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

