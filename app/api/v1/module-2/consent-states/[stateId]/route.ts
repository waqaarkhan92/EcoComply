/**
 * Consent State Detail Endpoints
 * GET /api/v1/module-2/consent-states/{id} - Get consent state
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateId: string }> }
) {
  const requestId = getRequestId(request);
  const { stateId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_2', user.company_id);

    const { data: state, error } = await supabaseAdmin
      .from('consent_states')
      .select(`
        *,
        documents(id, document_name),
        consent_states!consent_states_previous_state_id_fkey(id, state, effective_date)
      `)
      .eq('id', stateId)
      .single();

    if (error || !state) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Consent state not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(state, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/consent-states/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

