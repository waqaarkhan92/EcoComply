/**
 * Module 2: Discharge Volume Details Endpoint
 * GET /api/v1/module-2/discharge-volumes/{volumeId} - Get discharge volume details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ volumeId: string }> | { volumeId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { volumeId } = resolvedParams;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(volumeId)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid discharge volume ID format',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Get discharge volume
    const { data: volume, error: volumeError } = await supabaseAdmin
      .from('discharge_volumes')
      .select(`
        id,
        document_id,
        company_id,
        site_id,
        recording_date,
        volume_m3,
        measurement_method,
        notes,
        entered_by,
        created_at,
        updated_at
      `)
      .eq('id', volumeId)
      .maybeSingle();

    if (volumeError || !volume) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Discharge volume record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify company access
    if (volume.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this discharge volume record',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Format response with API aliases
    const response = successResponse(
      {
        ...volume,
        consent_id: volume.document_id, // Alias for API consistency
        date: volume.recording_date, // Alias for API consistency
        source: 'MANUAL', // Default source
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/discharge-volumes/[volumeId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

