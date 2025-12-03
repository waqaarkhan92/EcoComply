/**
 * Module 4: Expiring Contractor Licences Endpoint
 * GET /api/v1/module-4/contractor-licences/expiring - List expiring licences
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const searchParams = request.nextUrl.searchParams;
    const daysAhead = parseInt(searchParams.get('days_ahead') || '30', 10);

    // Calculate expiry threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    // Get expiring licences
    const { data: licences, error } = await supabaseAdmin
      .from('contractor_licences')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_valid', true)
      .lte('expiry_date', thresholdDate.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch expiring licences',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Calculate days until expiry for each licence
    const licencesWithDays = (licences || []).map((licence: any) => {
      const expiryDate = new Date(licence.expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...licence,
        days_until_expiry: daysUntilExpiry,
      };
    });

    const response = successResponse(
      {
        licences: licencesWithDays,
        count: licencesWithDays.length,
        days_ahead: daysAhead,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/contractor-licences/expiring:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

