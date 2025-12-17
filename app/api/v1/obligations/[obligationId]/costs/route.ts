/**
 * Obligation Costs API
 * GET /api/v1/obligations/[obligationId]/costs - Get costs for an obligation
 * POST /api/v1/obligations/[obligationId]/costs - Add a cost entry
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 4
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

const VALID_COST_TYPES = ['LABOR', 'CONTRACTOR', 'EQUIPMENT', 'LAB_FEES', 'CONSULTING', 'SOFTWARE', 'OTHER'];

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { obligationId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Verify obligation belongs to user's company
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, company_id, site_id')
      .eq('id', obligationId)
      .eq('company_id', user.company_id)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Fetch costs
    const { data: costs, error } = await supabaseAdmin
      .from('obligation_costs')
      .select(`
        id,
        cost_type,
        amount,
        currency,
        description,
        incurred_date,
        compliance_period_start,
        compliance_period_end,
        created_by,
        created_at,
        users:created_by(full_name, email)
      `)
      .eq('obligation_id', obligationId)
      .order('incurred_date', { ascending: false });

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch costs',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Calculate totals
    const total = costs?.reduce((sum, cost) => sum + parseFloat(cost.amount), 0) || 0;
    const byType = costs?.reduce((acc, cost) => {
      acc[cost.cost_type] = (acc[cost.cost_type] || 0) + parseFloat(cost.amount);
      return acc;
    }, {} as Record<string, number>) || {};

    const response = successResponse(
      {
        data: costs,
        summary: {
          total,
          currency: 'GBP',
          by_type: byType,
          count: costs?.length || 0,
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching obligation costs:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { obligationId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const {
      cost_type,
      amount,
      currency = 'GBP',
      description,
      incurred_date,
      compliance_period_start,
      compliance_period_end,
    } = body;

    // Validate required fields
    if (!cost_type || !VALID_COST_TYPES.includes(cost_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `cost_type must be one of: ${VALID_COST_TYPES.join(', ')}`,
        400,
        {},
        { request_id: requestId }
      );
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'amount must be a positive number',
        400,
        {},
        { request_id: requestId }
      );
    }

    if (!incurred_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'incurred_date is required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify obligation belongs to user's company
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, company_id, site_id')
      .eq('id', obligationId)
      .eq('company_id', user.company_id)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Insert cost entry
    const { data: cost, error } = await supabaseAdmin
      .from('obligation_costs')
      .insert({
        company_id: user.company_id,
        site_id: obligation.site_id,
        obligation_id: obligationId,
        cost_type,
        amount: parseFloat(amount),
        currency,
        description,
        incurred_date,
        compliance_period_start,
        compliance_period_end,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create cost entry',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        data: cost,
        message: 'Cost entry created successfully',
      },
      201,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error creating cost entry:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
