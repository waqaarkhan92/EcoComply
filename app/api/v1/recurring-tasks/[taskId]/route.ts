/**
 * Recurring Task Detail Endpoints
 * GET /api/v1/recurring-tasks/{id} - Get recurring task
 * PUT /api/v1/recurring-tasks/{id} - Update recurring task
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = getRequestId(request);
  const { taskId } = await params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { data: task, error } = await supabaseAdmin
      .from('recurring_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurring task not found', 404, {}, { request_id: requestId });
    }

    const response = successResponse(task, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/recurring-tasks/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = getRequestId(request);
  const { taskId } = await params;

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      task_title,
      task_description,
      due_date,
      status,
      assigned_to,
      completion_notes,
    } = body;

    // Get existing task to verify access
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurring_tasks')
      .select('id, company_id, status')
      .eq('id', taskId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Recurring task not found', 404, {}, { request_id: requestId });
    }

    if (existing.company_id !== user.company_id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this task', 403, {}, { request_id: requestId });
    }

    const updateData: any = {};

    if (task_title !== undefined) updateData.task_title = task_title;
    if (task_description !== undefined) updateData.task_description = task_description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (status !== undefined) {
      updateData.status = status;
      // If marking as completed, set completed_at and completed_by
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      }
    }
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (completion_notes !== undefined) updateData.completion_notes = completion_notes;

    const { data: task, error } = await supabaseAdmin
      .from('recurring_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update recurring task', 500, { error: error.message }, { request_id: requestId });
    }

    const response = successResponse(task, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/recurring-tasks/{id}:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500, { error: error.message }, { request_id: requestId });
  }
}

