/**
 * Obligation Endpoints
 * GET /api/v1/obligations/{obligationId} - Get obligation details
 * PUT /api/v1/obligations/{obligationId} - Update obligation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { recordCorrection } from '@/lib/ai/correction-tracking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { obligationId } = await params;
    
    console.log(`[Obligations API] GET obligation: ${obligationId}`);
    console.log(`[Obligations API] obligationId type: ${typeof obligationId}`);
    console.log(`[Obligations API] obligationId value:`, obligationId);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!obligationId || !uuidRegex.test(obligationId)) {
      console.error(`[Obligations API] Invalid obligation ID:`, obligationId);
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid obligation ID format',
        400,
        { obligation_id: 'Must be a valid UUID', received: obligationId },
        { request_id: requestId }
      );
    }

    // Get obligation - RLS will enforce access control
    // Use maybeSingle() to return null instead of error when not found
    const { data: obligation, error } = await supabaseAdmin
      .from('obligations')
      .select('*')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      // PGRST116 = no rows returned (PostgREST error code)
      // Also check for other "not found" indicators
      if (
        error.code === 'PGRST116' ||
        error.message?.includes('No rows returned') ||
        error.message?.includes('not found') ||
        error.details?.includes('No rows found')
      ) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Obligation not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      console.error('Get obligation error:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch obligation',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    if (!obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get evidence count
    const { data: evidenceLinks } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('evidence_id')
      .eq('obligation_id', obligationId);

    // Get schedules
    const { data: schedules } = await supabaseAdmin
      .from('schedules')
      .select('id, frequency, base_date, next_due_date, last_completed_date, status')
      .eq('obligation_id', obligationId);

    // Get deadlines
    const { data: deadlines } = await supabaseAdmin
      .from('deadlines')
      .select('id, due_date, compliance_period, status')
      .eq('obligation_id', obligationId)
      .order('due_date', { ascending: true });

    const response = successResponse(
      {
        ...obligation,
        evidence_count: evidenceLinks?.length || 0,
        linked_evidence: evidenceLinks?.map((link: any) => link.evidence_id) || [],
        schedules: schedules || [],
        deadlines: deadlines || [],
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get obligation error:', error);
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
  request: NextRequest,
  { params }: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      // Return auth error (401 or 403) immediately
      return authResult;
    }
    const { user } = authResult;

    const { obligationId } = await params;

    // Parse request body - handle potential JSON parsing errors
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400,
        { error: 'Request body must be valid JSON' },
        { request_id: requestId }
      );
    }

    // Check if obligation exists and user has access (RLS will enforce)
    const { data: existingObligation, error: checkError } = await supabaseAdmin
      .from('obligations')
      .select('*')
      .eq('id', obligationId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingObligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Validate: cannot change document_id
    if (body.document_id && body.document_id !== existingObligation.document_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot change document_id',
        422,
        { document_id: 'document_id cannot be changed after creation' },
        { request_id: requestId }
      );
    }

    // Build updates
    const updates: any = {};

    if (body.obligation_title !== undefined) {
      if (typeof body.obligation_title !== 'string' || body.obligation_title.length < 1) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Obligation title must be a non-empty string',
          422,
          { obligation_title: 'Obligation title must be a non-empty string' },
          { request_id: requestId }
        );
      }
      updates.obligation_title = body.obligation_title;
    }

    if (body.obligation_description !== undefined) {
      updates.obligation_description = body.obligation_description;
    }

    if (body.category !== undefined) {
      const validCategories = ['MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE'];
      if (!validCategories.includes(body.category)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid category',
          422,
          { category: `Must be one of: ${validCategories.join(', ')}` },
          { request_id: requestId }
        );
      }
      updates.category = body.category;
    }

    if (body.frequency !== undefined) {
      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED'];
      if (!validFrequencies.includes(body.frequency)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid frequency',
          422,
          { frequency: `Must be one of: ${validFrequencies.join(', ')}` },
          { request_id: requestId }
        );
      }
      updates.frequency = body.frequency;
    }

    if (body.deadline_date !== undefined) {
      updates.deadline_date = body.deadline_date;
    }

    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to || null;
    }

    if (body.review_notes !== undefined) {
      updates.review_notes = body.review_notes;
    }

    // Increment version number and update version history
    const newVersionNumber = (existingObligation.version_number || 1) + 1;
    const versionHistory = Array.isArray(existingObligation.version_history) 
      ? existingObligation.version_history 
      : [];

    // Create version snapshot
    const versionSnapshot = {
      version_number: existingObligation.version_number,
      updated_at: existingObligation.updated_at,
      updated_by: user.id,
      changes: Object.keys(updates).filter(key => key !== 'version_number' && key !== 'version_history' && key !== 'updated_at'),
    };

    updates.version_number = newVersionNumber;
    updates.version_history = [...versionHistory, versionSnapshot];
    updates.review_status = 'EDITED';
    updates.updated_at = new Date().toISOString();

    // Update obligation
    const { data: updatedObligation, error: updateError } = await supabaseAdmin
      .from('obligations')
      .update(updates)
      .eq('id', obligationId)
      .select('id, obligation_title, obligation_description, category, review_status, version_number, updated_at')
      .single();

    if (updateError || !updatedObligation) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update obligation',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Update compliance scores if status changed
    if (updates.status && updates.status !== existingObligation.status) {
      try {
        const { updateComplianceScores } = await import('@/lib/services/compliance-score-service');
        await updateComplianceScores(existingObligation.site_id);
      } catch (error) {
        console.error('Error updating compliance scores:', error);
        // Don't fail the request if score update fails
      }
    }

    // Log to audit_logs (if audit_logs table exists)
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          entity_type: 'obligations',
          entity_id: obligationId,
          action: 'UPDATE',
          user_id: user.id,
          changes: updates,
          metadata: {
            previous_version: existingObligation.version_number,
            new_version: newVersionNumber,
          },
        });
    } catch (auditError) {
      // Log but don't fail if audit logging fails
      console.error('Failed to log to audit_logs:', auditError);
    }

    // Track correction for pattern learning (non-blocking)
    try {
      // Determine correction type based on what changed
      let correctionType: 'category' | 'frequency' | 'deadline' | 'subjective' | 'text' | 'other' = 'other';
      if (updates.category) correctionType = 'category';
      else if (updates.frequency) correctionType = 'frequency';
      else if (updates.deadline_date || updates.deadline_relative) correctionType = 'deadline';
      else if (updates.is_subjective !== undefined) correctionType = 'subjective';
      else if (updates.obligation_description || updates.obligation_title) correctionType = 'text';

      // Record correction if any meaningful change was made
      if (Object.keys(updates).some(key => 
        ['category', 'frequency', 'deadline_date', 'deadline_relative', 'is_subjective', 'obligation_description', 'obligation_title'].includes(key)
      )) {
        recordCorrection({
          obligation_id: obligationId,
          pattern_id_used: existingObligation.source_pattern_id || null,
          original_data: {
            category: existingObligation.category,
            frequency: existingObligation.frequency,
            deadline_date: existingObligation.deadline_date,
            deadline_relative: existingObligation.deadline_relative,
            is_subjective: existingObligation.is_subjective,
            obligation_title: existingObligation.obligation_title,
            obligation_description: existingObligation.obligation_description,
          },
          corrected_data: {
            ...existingObligation,
            ...updates,
          },
          correction_type: correctionType,
          corrected_by: user.id,
        }).catch((err) => console.error('Error recording correction:', err));
      }
    } catch (correctionError) {
      // Log but don't fail if correction tracking fails
      console.error('Failed to track correction:', correctionError);
    }

    const response = successResponse(updatedObligation, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update obligation error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

