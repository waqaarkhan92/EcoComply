/**
 * Module 4: Validation Rule Endpoints
 * GET /api/v1/module-4/validation-rules/{id} - Get validation rule details
 * PUT /api/v1/module-4/validation-rules/{id} - Update validation rule
 * DELETE /api/v1/module-4/validation-rules/{id} - Delete validation rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { ruleId } = params;

  const { data: rule, error } = await supabaseAdmin
      .from('validation_rules')
      .select('*')
      .eq('id', ruleId)
      .single();

    if (error || !rule) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Validation rule not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (rule.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this validation rule',
        403,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/validation-rules/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest, props: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { ruleId } = params;
    const body = await request.json();

    // Get existing rule to verify access
  const { data: existing, error: fetchError } = await supabaseAdmin
      .from('validation_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Validation rule not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this validation rule',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Update rule
    const updateData: any = {};

    if (body.rule_name !== undefined) updateData.rule_name = body.rule_name;
    if (body.rule_description !== undefined) updateData.rule_description = body.rule_description;
    if (body.rule_config !== undefined) updateData.rule_config = body.rule_config;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.waste_stream_id !== undefined) updateData.waste_stream_id = body.waste_stream_id;

  const { data: rule, error: updateError } = await supabaseAdmin
      .from('validation_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (updateError || !rule) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update validation rule',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(rule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-4/validation-rules/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ ruleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { ruleId } = params;

    // Get existing rule to verify access
  const { data: existing, error: fetchError } = await supabaseAdmin
      .from('validation_rules')
      .select('id, company_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Validation rule not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this validation rule',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Delete validation rule
  const { error: deleteError } = await supabaseAdmin
      .from('validation_rules')
      .delete()
      .eq('id', ruleId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete validation rule',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-4/validation-rules/[id]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

