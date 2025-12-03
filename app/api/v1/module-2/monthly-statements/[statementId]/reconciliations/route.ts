/**
 * Statement Reconciliations Endpoints
 * GET /api/v1/module-2/monthly-statements/{id}/reconciliations - List reconciliations for statement
 * POST /api/v1/module-2/monthly-statements/{id}/reconciliations - Create reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, createCursor } from '@/lib/api/pagination';
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

    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);

    let query = supabaseAdmin
      .from('statement_reconciliations')
      .select('*')
      .eq('monthly_statement_id', statementId);

    // Apply filters
    if (filters.reconciliation_status) query = query.eq('reconciliation_status', filters.reconciliation_status);

    query = query.order('reconciliation_date', { ascending: false }).limit(limit + 1);

    const { data: reconciliations, error } = await query;

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch reconciliations', 500, { error: error.message }, { request_id: requestId });
    }

    const hasMore = (reconciliations || []).length > limit;
    const data = hasMore ? (reconciliations || []).slice(0, limit) : (reconciliations || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/monthly-statements/{id}/reconciliations:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function POST(
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

    // Verify statement exists
    const { data: statement, error: statementError } = await supabaseAdmin
      .from('monthly_statements')
      .select('id, company_id, site_id, total_volume_m3')
      .eq('id', statementId)
      .single();

    if (statementError || !statement) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Monthly statement not found', 404, {}, { request_id: requestId });
    }

    if (statement.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this statement', 403, {}, { request_id: requestId });
    }

    const body = await request.json();
    const {
      reconciliation_date,
      actual_volume_m3,
      reconciliation_notes,
    } = body;

    // Validate required fields
    if (!reconciliation_date || actual_volume_m3 === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields',
        400,
        { required: ['reconciliation_date', 'actual_volume_m3'] },
        { request_id: requestId }
      );
    }

    // Calculate variance
    const statementVolume = parseFloat(statement.total_volume_m3);
    const actualVolume = parseFloat(actual_volume_m3);
    const varianceM3 = actualVolume - statementVolume;
    const variancePercent = statementVolume !== 0 ? (varianceM3 / statementVolume) * 100 : 0;

    // Determine status based on variance
    let reconciliationStatus = 'RECONCILED';
    if (Math.abs(variancePercent) > 5) {
      reconciliationStatus = 'DISCREPANCY';
    }

    // Create reconciliation
    const { data: reconciliation, error } = await supabaseAdmin
      .from('statement_reconciliations')
      .insert({
        monthly_statement_id: statementId,
        company_id: user.company_id,
        site_id: statement.site_id,
        reconciliation_date,
        statement_volume_m3: statementVolume,
        actual_volume_m3: actualVolume,
        variance_m3: varianceM3,
        variance_percent: variancePercent,
        reconciliation_status: reconciliationStatus,
        reconciliation_notes: reconciliation_notes || null,
        reconciled_by: user.id,
        reconciled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create reconciliation', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(reconciliation, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/monthly-statements/{id}/reconciliations:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

