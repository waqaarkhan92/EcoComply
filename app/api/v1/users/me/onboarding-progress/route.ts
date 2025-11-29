/**
 * Onboarding Progress Endpoints
 * GET /api/v1/users/me/onboarding-progress - Get current user's onboarding progress
 * PUT /api/v1/users/me/onboarding-progress - Update onboarding progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get all onboarding progress records for this user
    const { data: progressRecords, error } = await supabaseAdmin
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch onboarding progress',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Group by flow_type and determine current state
    const flows: Record<string, any> = {};
    const allSteps = [
      'SIGNUP',
      'EMAIL_VERIFICATION',
      'SITE_CREATION',
      'UPLOAD_METHOD_SELECTION',
      'PERMIT_UPLOAD',
      'EXCEL_IMPORT',
      'EXTRACTION_REVIEW',
      'IMPORT_PREVIEW',
      'IMPORT_CONFIRMATION',
      'EVIDENCE_TUTORIAL',
      'DASHBOARD_INTRO',
      'COMPLETE',
    ];

    const requiredSteps = [
      'SIGNUP',
      'SITE_CREATION',
      'UPLOAD_METHOD_SELECTION',
      'PERMIT_UPLOAD', // Or EXCEL_IMPORT path
      'EXTRACTION_REVIEW', // Or IMPORT_PREVIEW + IMPORT_CONFIRMATION
      'COMPLETE',
    ];

    for (const record of progressRecords || []) {
      if (!flows[record.flow_type]) {
        flows[record.flow_type] = {
          flow_type: record.flow_type,
          completed_steps: [],
          skipped_steps: [],
          current_step: null,
          completion_percentage: 0,
          is_complete: false,
        };
      }

      if (record.completed_at) {
        flows[record.flow_type].completed_steps.push(record.step);
      }
      if (record.skipped) {
        flows[record.flow_type].skipped_steps.push(record.step);
      }
    }

    // Determine current step and completion for FIRST_TIME flow
    const firstTimeFlow = flows['FIRST_TIME'] || {
      flow_type: 'FIRST_TIME',
      completed_steps: [],
      skipped_steps: [],
      current_step: 'SIGNUP',
      completion_percentage: 0,
      is_complete: false,
    };

    // Find current step (first incomplete required step)
    for (const step of allSteps) {
      if (!firstTimeFlow.completed_steps.includes(step) && !firstTimeFlow.skipped_steps.includes(step)) {
        firstTimeFlow.current_step = step;
        break;
      }
    }

    // Calculate completion percentage
    const completedRequired = firstTimeFlow.completed_steps.filter((s: string) =>
      requiredSteps.includes(s)
    ).length;
    firstTimeFlow.completion_percentage = Math.round(
      (completedRequired / requiredSteps.length) * 100
    );

    // Check if complete
    firstTimeFlow.is_complete = firstTimeFlow.completed_steps.includes('COMPLETE');

    const response = successResponse(
      {
        user_id: user.id,
        ...firstTimeFlow,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get onboarding progress error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const { flow_type, step, completed, skipped, data } = body;

    if (!flow_type || !step) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'flow_type and step are required',
        422,
        { flow_type: 'flow_type is required', step: 'step is required' },
        { request_id: requestId }
      );
    }

    // Check if record exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_onboarding_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('flow_type', flow_type)
      .eq('step', step)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.skipped = false;
        updateData.skipped_at = null;
      }
      if (skipped) {
        updateData.skipped = true;
        updateData.skipped_at = new Date().toISOString();
        updateData.completed_at = null;
      }
      if (data) {
        updateData.data = data;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_onboarding_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to update onboarding progress',
          500,
          { error: updateError.message },
          { request_id: requestId }
        );
      }

      result = updated;
    } else {
      // Create new record
      const insertData: any = {
        user_id: user.id,
        flow_type,
        step,
        data: data || {},
      };

      if (completed) {
        insertData.completed_at = new Date().toISOString();
      }
      if (skipped) {
        insertData.skipped = true;
        insertData.skipped_at = new Date().toISOString();
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('user_onboarding_progress')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to create onboarding progress',
          500,
          { error: insertError.message },
          { request_id: requestId }
        );
      }

      result = inserted;
    }

    // If step is COMPLETE, update users.onboarding_completed_at
    if (step === 'COMPLETE' && completed) {
      await supabaseAdmin
        .from('users')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    const response = successResponse(
      {
        step: result.step,
        completed_at: result.completed_at,
        skipped: result.skipped,
        completion_percentage: 0, // Will be calculated on GET
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update onboarding progress error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

