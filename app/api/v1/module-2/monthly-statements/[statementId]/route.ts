/**
 * Monthly Statement Detail Endpoints
 * GET /api/v1/module-2/monthly-statements/{id} - Get monthly statement
 * PUT /api/v1/module-2/monthly-statements/{id} - Update monthly statement
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { requireModule } from '@/lib/api/module-check';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> }
) {
  const requestId = getRequestId(request);
  const { statementId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_2', user.company_id);

    const { data: statement, error } = await supabaseAdmin
      .from('monthly_statements')
      .select(`
        *,
        documents(id, document_name),
        sites(id, site_name)
      `)
      .eq('id', statementId)
      .single();

    if (error || !statement) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Monthly statement not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(statement, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/monthly-statements/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> }
) {
  const requestId = getRequestId(request);
  const { statementId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    await requireModule('MODULE_2', user.company_id);

    const body = await request.json();
    const {
      statement_period_start,
      statement_period_end,
      statement_date,
      total_volume_m3,
      total_charge,
      statement_reference,
      water_company_name,
      statement_data,
      document_path,
    } = body;

    // Get existing statement to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('monthly_statements')
      .select('id, company_id')
      .eq('id', statementId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Monthly statement not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this statement', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (statement_period_start !== undefined) updateData.statement_period_start = statement_period_start;
    if (statement_period_end !== undefined) updateData.statement_period_end = statement_period_end;
    if (statement_date !== undefined) updateData.statement_date = statement_date;
    if (total_volume_m3 !== undefined) updateData.total_volume_m3 = total_volume_m3;
    if (total_charge !== undefined) updateData.total_charge = total_charge;
    if (statement_reference !== undefined) updateData.statement_reference = statement_reference;
    if (water_company_name !== undefined) updateData.water_company_name = water_company_name;
    if (statement_data !== undefined) updateData.statement_data = statement_data;
    if (document_path !== undefined) updateData.document_path = document_path;

    const { data: statement, error } = await supabaseAdmin
      .from('monthly_statements')
      .update(updateData)
      .eq('id', statementId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update monthly statement', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(statement, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-2/monthly-statements/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

