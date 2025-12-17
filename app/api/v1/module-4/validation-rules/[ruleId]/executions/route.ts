/**
 * Validation Execution History Endpoint
 * GET /api/v1/module-4/validation-rules/{ruleId}/executions
 * 
 * Returns execution history for a validation rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { parsePaginationParams, parseFilterParams, createCursor } from '@/lib/api/pagination';

export async function GET(
  request: NextRequest, props: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { ruleId } = params;

    // Get validation rule - RLS will enforce access control
  const { data: rule, error: ruleError } = await supabaseAdmin
      .from('validation_rules')
      .select('id, waste_stream_id, site_id')
      .eq('id', ruleId)
      .single();

    if (ruleError || !rule) {
      if (ruleError?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Validation rule not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch validation rule',
        500,
        { error: ruleError?.message },
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
  const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);

    // Get execution history from validation_executions table
    let query = supabaseAdmin
      .from('validation_executions')
      .select('id, validation_rule_id, consignment_note_id, executed_at, execution_status, validation_result, error_message, duration_ms')
      .eq('validation_rule_id', ruleId)
      .order('executed_at', { ascending: false });

    // Apply filters
    if (filters.execution_status) {
      query = query.eq('execution_status', filters.execution_status);
    }
    if (filters['executed_at[gte]']) {
      query = query.gte('executed_at', filters['executed_at[gte]']);
    }
    if (filters['executed_at[lte]']) {
      query = query.lte('executed_at', filters['executed_at[lte]']);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

  const { data: executions, error: executionsError } = await query;

    if (executionsError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch execution history',
        500,
        { error: executionsError.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = executions && executions.length > limit;
    const results = hasMore ? executions.slice(0, limit) : executions || [];

    // Get summary statistics
  const { data: allExecutions } = await supabaseAdmin
      .from('validation_executions')
      .select('execution_status, duration_ms')
      .eq('validation_rule_id', ruleId);

    const totalExecutions = allExecutions?.length || 0;
    const successCount = allExecutions?.filter(e => e.execution_status === 'PASSED').length || 0;
    const failureCount = allExecutions?.filter(e => e.execution_status === 'FAILED').length || 0;
    const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0;
    const failureRate = totalExecutions > 0 ? Math.round((failureCount / totalExecutions) * 100) : 0;
    const avgExecutionTime = allExecutions && allExecutions.length > 0
      ? Math.round(allExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / allExecutions.length)
      : 0;

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.executed_at);
    }

    const response = successResponse(
      {
        executions: results,
        pagination: {
          cursor: nextCursor,
          limit,
          has_more: hasMore,
        },
        stats: {
          total_executions: totalExecutions,
          success_rate: successRate,
          failure_rate: failureRate,
          avg_execution_time: avgExecutionTime,
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching validation execution history:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch validation execution history',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

