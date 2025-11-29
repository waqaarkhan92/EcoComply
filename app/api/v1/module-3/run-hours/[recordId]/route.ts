/**
 * Module 3: Run Hour Record Detail Endpoints
 * GET /api/v1/module-3/run-hours/[recordId] - Get run-hour record details
 * PUT /api/v1/module-3/run-hours/[recordId] - Update run-hour record
 * DELETE /api/v1/module-3/run-hours/[recordId] - Delete run-hour record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const requestId = getRequestId(request);
  const { recordId } = params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Fetch run-hour record
    const { data: record, error } = await supabaseAdmin
      .from('run_hour_records')
      .select(`
        id,
        generator_id,
        company_id,
        recording_date,
        hours_recorded,
        running_total_year,
        running_total_month,
        percentage_of_annual_limit,
        percentage_of_monthly_limit,
        entry_method,
        source_maintenance_record_id,
        notes,
        entered_by,
        created_at,
        updated_at
      `)
      .eq('id', recordId)
      .eq('company_id', user.company_id)
      .single();

    if (error || !record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Run-hour record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Get generator info separately
    const { data: generator } = await supabaseAdmin
      .from('generators')
      .select('id, generator_identifier, generator_type, annual_run_hour_limit, monthly_run_hour_limit')
      .eq('id', record.generator_id)
      .single();

    // Check access via RLS (company_id must match)
    if (record.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this record',
        403,
        {},
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        ...record,
        generators: generator ? [generator] : [],
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/run-hours/[recordId]:', error);
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
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const requestId = getRequestId(request);
  const { recordId } = params;

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Verify record exists and user has access
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('run_hour_records')
      .select('id, company_id, generator_id, recording_date, hours_recorded')
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Run-hour record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existingRecord.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this record',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: any = {};

    // Allow updating these fields
    if (body.hours_recorded !== undefined) {
      if (body.hours_recorded < 0) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'hours_recorded must be >= 0',
          400,
          {},
          { request_id: requestId }
        );
      }
      updateData.hours_recorded = Number(body.hours_recorded);
    }
    if (body.recording_date !== undefined) updateData.recording_date = body.recording_date;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'No valid fields to update',
        400,
        {},
        { request_id: requestId }
      );
    }

    // If hours_recorded or recording_date changed, recalculate totals
    if (updateData.hours_recorded !== undefined || updateData.recording_date !== undefined) {
      // Get generator
      const { data: generator } = await supabaseAdmin
        .from('generators')
        .select('id, annual_run_hour_limit, monthly_run_hour_limit, anniversary_date')
        .eq('id', existingRecord.generator_id)
        .single();

      if (generator) {
        const newHours = updateData.hours_recorded !== undefined ? updateData.hours_recorded : existingRecord.hours_recorded;
        const newDate = updateData.recording_date || existingRecord.recording_date;

        // Recalculate totals (similar to POST logic)
        const recordingDate = new Date(newDate);
        const anniversaryDate = new Date(generator.anniversary_date);
        const currentYear = new Date().getFullYear();
        
        const yearStart = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
        if (recordingDate < yearStart) {
          yearStart.setFullYear(yearStart.getFullYear() - 1);
        }
        const yearEnd = new Date(yearStart);
        yearEnd.setFullYear(yearEnd.getFullYear() + 1);

        const monthStart = new Date(recordingDate.getFullYear(), recordingDate.getMonth(), 1);
        const monthEnd = new Date(recordingDate.getFullYear(), recordingDate.getMonth() + 1, 1);

        // Get all records except this one
        const { data: yearRecords } = await supabaseAdmin
          .from('run_hour_records')
          .select('hours_recorded, recording_date')
          .eq('generator_id', existingRecord.generator_id)
          .neq('id', recordId)
          .gte('recording_date', yearStart.toISOString().split('T')[0])
          .lt('recording_date', yearEnd.toISOString().split('T')[0]);

        const { data: monthRecords } = await supabaseAdmin
          .from('run_hour_records')
          .select('hours_recorded, recording_date')
          .eq('generator_id', existingRecord.generator_id)
          .neq('id', recordId)
          .gte('recording_date', monthStart.toISOString().split('T')[0])
          .lt('recording_date', monthEnd.toISOString().split('T')[0]);

        const yearTotal = (yearRecords || []).reduce((sum, r) => sum + Number(r.hours_recorded), 0) + Number(newHours);
        const monthTotal = (monthRecords || []).reduce((sum, r) => sum + Number(r.hours_recorded), 0) + Number(newHours);

        const percentageOfAnnual = generator.annual_run_hour_limit > 0
          ? (yearTotal / generator.annual_run_hour_limit) * 100
          : 0;
        const percentageOfMonthly = generator.monthly_run_hour_limit && generator.monthly_run_hour_limit > 0
          ? (monthTotal / generator.monthly_run_hour_limit) * 100
          : null;

        updateData.running_total_year = yearTotal;
        updateData.running_total_month = monthTotal;
        updateData.percentage_of_annual_limit = Number(percentageOfAnnual.toFixed(2));
        updateData.percentage_of_monthly_limit = percentageOfMonthly ? Number(percentageOfMonthly.toFixed(2)) : null;
      }
    }

    // Update record
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('run_hour_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update run-hour record',
        500,
        { error: updateError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      updatedRecord,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/run-hours/[recordId]:', error);
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
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const requestId = getRequestId(request);
  const { recordId } = params;

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Verify record exists and user has access
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('run_hour_records')
      .select('id, company_id, generator_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Run-hour record not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (existingRecord.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this record',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Delete record
    const { error: deleteError } = await supabaseAdmin
      .from('run_hour_records')
      .delete()
      .eq('id', recordId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete run-hour record',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { id: recordId, deleted: true },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-3/run-hours/[recordId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

