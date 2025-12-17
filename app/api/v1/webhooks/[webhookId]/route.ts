/**
 * Webhook Endpoint
 * GET /api/v1/webhooks/{webhookId} - Get webhook details
 * PUT /api/v1/webhooks/{webhookId} - Update webhook
 * DELETE /api/v1/webhooks/{webhookId} - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ webhookId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { webhookId } = params;

    // Get webhook - RLS will filter by company
  const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('id, url, events, is_active, last_delivery_at, last_delivery_status, created_at, updated_at')
      .eq('id', webhookId)
      .eq('company_id', user.company_id)
      .single();

    if (error || !webhook) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Webhook not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch webhook',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(webhook, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest, props: { params: Promise<{ webhookId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { webhookId } = params;

    // Parse request body
    const body = await request.json();

    // Check if webhook exists and user has access
  const { data: existingWebhook, error: checkError } = await supabaseAdmin
      .from('webhooks')
      .select('id, company_id')
      .eq('id', webhookId)
      .eq('company_id', user.company_id)
      .single();

    if (checkError || !existingWebhook) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Webhook not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Build updates
    const updates: any = {};

    if (body.url !== undefined) {
      // Validate URL format
      try {
        new URL(body.url);
        updates.url = body.url;
      } catch {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid URL format',
          422,
          { url: 'Must be a valid URL' },
          { request_id: requestId }
        );
      }
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Events must be a non-empty array',
          422,
          { events: 'Events must be a non-empty array' },
          { request_id: requestId }
        );
      }

      // Validate event types
      const validEvents = [
        'document.extracted',
        'obligation.deadline_approaching',
        'obligation.overdue',
        'audit_pack.generated',
        'module.activated',
      ];
      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid event types',
          422,
          { events: `Invalid events: ${invalidEvents.join(', ')}` },
          { request_id: requestId }
        );
      }
      updates.events = body.events;
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active === true;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No fields to update',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Update webhook
    updates.updated_at = new Date().toISOString();

  const { data: updatedWebhook, error: updateError } = await supabaseAdmin
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select('id, url, events, is_active, updated_at')
      .single();

    if (updateError || !updatedWebhook) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update webhook',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedWebhook, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest, props: { params: Promise<{ webhookId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { webhookId } = params;

    // Check if webhook exists and user has access
  const { data: existingWebhook, error: checkError } = await supabaseAdmin
      .from('webhooks')
      .select('id, company_id')
      .eq('id', webhookId)
      .eq('company_id', user.company_id)
      .single();

    if (checkError || !existingWebhook) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Webhook not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Delete webhook
  const { error: deleteError } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete webhook',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Webhook deleted successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
