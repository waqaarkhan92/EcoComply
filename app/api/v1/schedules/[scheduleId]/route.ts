/**
 * Schedule Detail Endpoints
 * GET /api/v1/schedules/{scheduleId} - Get schedule details
 * PUT /api/v1/schedules/{scheduleId} - Update schedule
 * DELETE /api/v1/schedules/{scheduleId} - Delete schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { calculateNextDueDate, Frequency } from '@/lib/utils/schedule-calculator';

export async function GET(
  request: NextRequest, props: { params: Promise<{ scheduleId: string }> }
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
  const { scheduleId } = params;

    // Get schedule - RLS will enforce access control
  const { data: schedule, error } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error || !schedule) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Schedule not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch schedule',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(schedule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get schedule error:', error);
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
  request: NextRequest, props: { params: Promise<{ scheduleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { scheduleId } = params;

    // Get existing schedule
  const { data: existingSchedule, error: getError } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (getError || !existingSchedule) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Schedule not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build updates
    const updates: any = {};
    const previousValues: any = {};

    if (body.frequency !== undefined) {
      const validFrequencies: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED'];
      if (!validFrequencies.includes(body.frequency)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid frequency value',
          422,
          { frequency: `Must be one of: ${validFrequencies.join(', ')}` },
          { request_id: requestId }
        );
      }
      previousValues.frequency = existingSchedule.frequency;
      updates.frequency = body.frequency;
    }

    if (body.custom_schedule !== undefined) {
      previousValues.custom_schedule = {
        adjust_for_business_days: existingSchedule.adjust_for_business_days,
        reminder_days: existingSchedule.reminder_days,
      };

      if (body.custom_schedule.adjust_for_business_days !== undefined) {
        updates.adjust_for_business_days = body.custom_schedule.adjust_for_business_days;
      }
      if (body.custom_schedule.reminder_days !== undefined) {
        updates.reminder_days = body.custom_schedule.reminder_days;
      }
    }

    // Recalculate next_due_date if frequency or base_date changed
    if (updates.frequency || body.start_date) {
      const baseDate = body.start_date ? new Date(body.start_date) : new Date(existingSchedule.base_date);
      const lastCompletedDate = existingSchedule.last_completed_date ? new Date(existingSchedule.last_completed_date) : undefined;
      const adjustForBusinessDays = updates.adjust_for_business_days !== undefined 
        ? updates.adjust_for_business_days 
        : existingSchedule.adjust_for_business_days;

      const newNextDueDate = calculateNextDueDate(
        updates.frequency || existingSchedule.frequency,
        baseDate,
        lastCompletedDate,
        adjustForBusinessDays
      );

      updates.next_due_date = newNextDueDate.toISOString().split('T')[0];
    }

    // Store previous values for audit trail
    if (Object.keys(previousValues).length > 0) {
      updates.previous_values = {
        ...existingSchedule.previous_values,
        ...previousValues,
        modified_at: existingSchedule.modified_at || existingSchedule.updated_at,
      };
      updates.modified_by = user.id;
      updates.modified_at = new Date().toISOString();
    }

    updates.updated_at = new Date().toISOString();

    // Update schedule
  const { data: updatedSchedule, error: updateError } = await supabaseAdmin
      .from('schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select('*')
      .single();

    if (updateError || !updatedSchedule) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update schedule',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const updateResponse = successResponse(updatedSchedule, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, updateResponse);
  } catch (error: any) {
    console.error('Update schedule error:', error);
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
  request: NextRequest, props: { params: Promise<{ scheduleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

  const { user } = authResult;
    const params = await props.params;
  const { scheduleId } = params;

    // Get schedule
  const { data: schedule, error: getError } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .single();

    if (getError || !schedule) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Schedule not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Archive schedule (soft delete by setting status to ARCHIVED)
  const { error: updateError } = await supabaseAdmin
      .from('schedules')
      .update({
        status: 'ARCHIVED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete schedule',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const deleteResponse = successResponse(
      { message: 'Schedule deleted successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, deleteResponse);
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

