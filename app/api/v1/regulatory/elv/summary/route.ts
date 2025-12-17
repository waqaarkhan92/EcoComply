/**
 * ELV Summary Data
 * GET /api/v1/regulatory/elv/summary - Get ELV compliance summary for a site
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const siteId = request.nextUrl.searchParams.get('siteId');
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!siteId || !companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'siteId and companyId query parameters are required',
        422,
        { siteId: !siteId ? 'Required' : undefined, companyId: !companyId ? 'Required' : undefined },
        { request_id: requestId }
      );
    }

    // Fetch ELV conditions
    const { data: conditions, error: conditionsError } = await supabaseAdmin
      .from('elv_conditions')
      .select('*')
      .eq('site_id', siteId)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (conditionsError) {
      console.error('Error fetching ELV conditions:', conditionsError);
      return errorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch ELV conditions',
        500,
        undefined,
        { request_id: requestId }
      );
    }

    const conditionIds = (conditions || []).map(c => c.id);

    // Fetch latest monitoring results for each condition
    let compliantCount = 0;
    let nonCompliantCount = 0;
    const recentExceedances: any[] = [];

    if (conditionIds.length > 0) {
      // Get the latest result for each condition
      const { data: results, error: resultsError } = await supabaseAdmin
        .from('elv_monitoring_results')
        .select('*')
        .in('elv_condition_id', conditionIds)
        .order('test_date', { ascending: false });

      if (!resultsError && results) {
        // Group by condition and take latest
        const latestByCondition = new Map<string, any>();
        results.forEach(result => {
          if (!latestByCondition.has(result.elv_condition_id)) {
            latestByCondition.set(result.elv_condition_id, result);
          }
        });

        latestByCondition.forEach((result, conditionId) => {
          if (result.is_compliant) {
            compliantCount++;
          } else {
            nonCompliantCount++;
            // Add to recent exceedances
            const condition = conditions?.find(c => c.id === conditionId);
            if (condition) {
              recentExceedances.push({
                condition,
                result,
              });
            }
          }
        });
      }
    }

    // Count upcoming and overdue monitoring
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let upcomingMonitoring = 0;
    let overdueMonitoring = 0;

    (conditions || []).forEach(condition => {
      if (condition.next_monitoring_due) {
        const dueDate = new Date(condition.next_monitoring_due);
        if (dueDate < now) {
          overdueMonitoring++;
        } else if (dueDate <= thirtyDaysFromNow) {
          upcomingMonitoring++;
        }
      }
    });

    return successResponse(
      {
        totalConditions: conditions?.length || 0,
        compliantConditions: compliantCount,
        nonCompliantConditions: nonCompliantCount,
        upcomingMonitoring,
        overdueMonitoring,
        recentExceedances: recentExceedances.slice(0, 5), // Limit to 5 most recent
      },
      200,
      { request_id: requestId }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/regulatory/elv/summary:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      undefined,
      { request_id: requestId }
    );
  }
}
