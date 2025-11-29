/**
 * Module 3: Run Hours Endpoints
 * GET /api/v1/module-3/run-hours - List run-hour records
 * POST /api/v1/module-3/run-hours - Create run-hour record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
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
        updated_at,
        generators!inner(
          id,
          generator_identifier,
          generator_type,
          annual_run_hour_limit,
          monthly_run_hour_limit
        )
      `);

    // Apply filters
    if (filters.generator_id) {
      query = query.eq('generator_id', filters.generator_id);
    }
    if (filters.date?.gte) {
      query = query.gte('recording_date', filters.date.gte);
    }
    if (filters.date?.lte) {
      query = query.lte('recording_date', filters.date.lte);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('recording_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: records, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch run-hour records',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (records || []).length > limit;
    const data = hasMore ? (records || []).slice(0, limit) : (records || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].created_at) : null;

    const response = paginatedResponse(data, nextCursor, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/run-hours:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

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

    // Parse request body
    const body = await request.json();
    const {
      generator_id,
      hours_recorded,
      recording_date,
      entry_method = 'MANUAL',
      source_maintenance_record_id,
      notes,
    } = body;

    // Validate required fields
    if (!generator_id || hours_recorded === undefined || !recording_date) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: generator_id, hours_recorded, recording_date',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate hours_recorded
    if (hours_recorded < 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'hours_recorded must be >= 0',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate entry_method
    const validMethods = ['MANUAL', 'CSV', 'MAINTENANCE_RECORD'];
    if (!validMethods.includes(entry_method)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        `Invalid entry_method. Must be one of: ${validMethods.join(', ')}`,
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify generator exists and belongs to user's company
    const { data: generator, error: genError } = await supabaseAdmin
      .from('generators')
      .select('id, company_id, annual_run_hour_limit, monthly_run_hour_limit, current_year_hours, current_month_hours, anniversary_date')
      .eq('id', generator_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (genError || !generator) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Generator not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (generator.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this generator',
        403,
        {},
        { request_id: requestId }
      );
    }

    // If source_maintenance_record_id is provided, verify it exists
    if (source_maintenance_record_id) {
      const { data: maintenanceRecord, error: maintError } = await supabaseAdmin
        .from('maintenance_records')
        .select('id, generator_id')
        .eq('id', source_maintenance_record_id)
        .single();

      if (maintError || !maintenanceRecord || maintenanceRecord.generator_id !== generator_id) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'Invalid source_maintenance_record_id',
          400,
          {},
          { request_id: requestId }
        );
      }
    }

    // Calculate running totals
    // Determine if recording_date is in the current year/month based on anniversary_date
    const recordingDate = new Date(recording_date);
    const anniversaryDate = new Date(generator.anniversary_date);
    const currentYear = new Date().getFullYear();
    
    // Calculate year start based on anniversary date
    const yearStart = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
    if (recordingDate < yearStart) {
      yearStart.setFullYear(yearStart.getFullYear() - 1);
    }
    const yearEnd = new Date(yearStart);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);

    const isInCurrentYear = recordingDate >= yearStart && recordingDate < yearEnd;
    const isInCurrentMonth = recordingDate.getMonth() === new Date().getMonth() && 
                             recordingDate.getFullYear() === new Date().getFullYear();

    // Get all records for this generator in the current year
    const { data: yearRecords } = await supabaseAdmin
      .from('run_hour_records')
      .select('hours_recorded, recording_date')
      .eq('generator_id', generator_id)
      .gte('recording_date', yearStart.toISOString().split('T')[0])
      .lt('recording_date', yearEnd.toISOString().split('T')[0]);

    // Get all records for this generator in the current month
    const monthStart = new Date(recordingDate.getFullYear(), recordingDate.getMonth(), 1);
    const monthEnd = new Date(recordingDate.getFullYear(), recordingDate.getMonth() + 1, 1);
    const { data: monthRecords } = await supabaseAdmin
      .from('run_hour_records')
      .select('hours_recorded, recording_date')
      .eq('generator_id', generator_id)
      .gte('recording_date', monthStart.toISOString().split('T')[0])
      .lt('recording_date', monthEnd.toISOString().split('T')[0]);

    // Calculate running totals
    const yearTotal = (yearRecords || []).reduce((sum, r) => sum + Number(r.hours_recorded), 0) + Number(hours_recorded);
    const monthTotal = (monthRecords || []).reduce((sum, r) => sum + Number(r.hours_recorded), 0) + Number(hours_recorded);

    // Calculate percentages
    const percentageOfAnnual = generator.annual_run_hour_limit > 0
      ? (yearTotal / generator.annual_run_hour_limit) * 100
      : 0;
    const percentageOfMonthly = generator.monthly_run_hour_limit && generator.monthly_run_hour_limit > 0
      ? (monthTotal / generator.monthly_run_hour_limit) * 100
      : null;

    // Create run-hour record
    const { data: record, error: recordError } = await supabaseAdmin
      .from('run_hour_records')
      .insert({
        generator_id,
        company_id: user.company_id,
        recording_date,
        hours_recorded: Number(hours_recorded),
        running_total_year: yearTotal,
        running_total_month: monthTotal,
        percentage_of_annual_limit: Number(percentageOfAnnual.toFixed(2)),
        percentage_of_monthly_limit: percentageOfMonthly ? Number(percentageOfMonthly.toFixed(2)) : null,
        entry_method,
        source_maintenance_record_id: source_maintenance_record_id || null,
        notes: notes || null,
        entered_by: user.id,
      })
      .select()
      .single();

    if (recordError || !record) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create run-hour record',
        500,
        { error: recordError?.message },
        { request_id: requestId }
      );
    }

    // Update generator's current totals if this is the latest record
    const { data: latestRecord } = await supabaseAdmin
      .from('run_hour_records')
      .select('recording_date, running_total_year, running_total_month')
      .eq('generator_id', generator_id)
      .order('recording_date', { ascending: false })
      .limit(1)
      .single();

    if (latestRecord && latestRecord.recording_date === recording_date) {
      await supabaseAdmin
        .from('generators')
        .update({
          current_year_hours: latestRecord.running_total_year,
          current_month_hours: latestRecord.running_total_month,
        })
        .eq('id', generator_id);
    }

    const response = successResponse(
      {
        id: record.id,
        generator_id: record.generator_id,
        recording_date: record.recording_date,
        hours_recorded: record.hours_recorded,
        running_total_year: record.running_total_year,
        running_total_month: record.running_total_month,
        percentage_of_annual_limit: record.percentage_of_annual_limit,
        percentage_of_monthly_limit: record.percentage_of_monthly_limit,
        entry_method: record.entry_method,
        created_at: record.created_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/run-hours:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

