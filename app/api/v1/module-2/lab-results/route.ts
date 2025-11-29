/**
 * Module 2: Lab Results Endpoints
 * POST /api/v1/module-2/lab-results - Create lab result (triggers exceedance detection)
 * GET /api/v1/module-2/lab-results - List lab results (RLS filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { sendEmail } from '@/lib/services/email-service';
import { labResultThresholdAlertEmail } from '@/lib/templates/email-templates';
import { env } from '@/lib/env';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse request body
    const body = await request.json();
    const { parameter_id, sample_date, sample_id, recorded_value, unit, lab_reference, notes } = body;

    // Validate required fields
    if (!parameter_id || !sample_date || recorded_value === undefined || !unit) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: parameter_id, sample_date, recorded_value, unit',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify parameter exists and user has access
    const { data: parameter, error: paramError } = await supabaseAdmin
      .from('parameters')
      .select('id, limit_value, unit, company_id, site_id, warning_threshold_percent, parameter_type')
      .eq('id', parameter_id)
      .eq('is_active', true)
      .single();

    if (paramError || !parameter) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Parameter not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify company access (RLS will handle site access)
    if (parameter.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this parameter',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Calculate percentage of limit
    const percentageOfLimit = (recorded_value / parameter.limit_value) * 100;
    const isExceedance = recorded_value > parameter.limit_value;

    // Check if exceedance threshold reached (80%, 90%, 100%)
    const threshold80 = percentageOfLimit >= 80 && percentageOfLimit < 90;
    const threshold90 = percentageOfLimit >= 90 && percentageOfLimit < 100;
    const threshold100 = percentageOfLimit >= 100;

    // Create lab result
    const { data: labResult, error: labError } = await supabaseAdmin
      .from('lab_results')
      .insert({
        parameter_id,
        company_id: parameter.company_id,
        site_id: parameter.site_id,
        sample_date,
        sample_id: sample_id || null,
        recorded_value,
        unit,
        percentage_of_limit: percentageOfLimit,
        lab_reference: lab_reference || null,
        entry_method: 'MANUAL',
        is_exceedance: isExceedance,
        entered_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (labError || !labResult) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create lab result',
        500,
        { error: labError?.message },
        { request_id: requestId }
      );
    }

    // Create exceedance record if limit exceeded
    if (isExceedance) {
      const { error: exceedanceError } = await supabaseAdmin
        .from('exceedances')
        .insert({
          parameter_id,
          lab_result_id: labResult.id,
          company_id: parameter.company_id,
          site_id: parameter.site_id,
          recorded_value,
          limit_value: parameter.limit_value,
          percentage_of_limit: percentageOfLimit,
          recorded_date: sample_date,
          status: 'OPEN',
        });

      if (exceedanceError) {
        console.error('Failed to create exceedance record:', exceedanceError);
        // Don't fail the request, just log the error
      }
    }

    // Send threshold alert notifications (80%, 90%, 100%)
    if (threshold80 || threshold90 || threshold100) {
      try {
        // Get site and company details for email
        const { data: site } = await supabaseAdmin
          .from('sites')
          .select('id, name')
          .eq('id', parameter.site_id)
          .single();

        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .eq('id', parameter.company_id)
          .single();

        // Get recipients (site owners and admins)
        const { data: recipients } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name')
          .eq('company_id', parameter.company_id)
          .is('deleted_at', null)
          .eq('is_active', true)
          .in('id', supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .in('role', ['OWNER', 'ADMIN'])
          );

        // Determine which threshold was reached
        const threshold = threshold100 ? 100 : threshold90 ? 90 : 80;

        const baseUrl = env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.oblicore.com';
        const actionUrl = `${baseUrl}/module-2/lab-results?parameter_id=${parameter_id}`;

        // Send email to each recipient
        const emailPromises = (recipients || []).map(async (recipient: any) => {
          if (!recipient.email) return;

          const emailTemplate = labResultThresholdAlertEmail({
            recipient_name: recipient.full_name || undefined,
            site_name: site?.name || 'Unknown Site',
            parameter_name: parameter.parameter_type || 'Parameter',
            current_value: recorded_value,
            limit_value: parameter.limit_value,
            percentage_of_limit: Math.round(percentageOfLimit * 100) / 100,
            threshold,
            consent_id: parameter.document_id || undefined,
            action_url: actionUrl,
            company_name: company?.name,
          });

          return sendEmail({
            to: recipient.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
          });
        });

        // Send all emails (don't wait, fire and forget)
        Promise.all(emailPromises).catch((error) => {
          console.error('Error sending threshold alert emails:', error);
        });

        // TODO: Create notification records in notifications table
        // This can be done later when notification system is fully integrated
      } catch (alertError: any) {
        console.error('Error processing threshold alerts:', alertError);
        // Don't fail the lab result creation, just log the error
      }
    }

    const response = successResponse(
      {
        ...labResult,
        threshold_alert: threshold100 ? 'CRITICAL' : threshold90 ? 'HIGH' : threshold80 ? 'WARNING' : null,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/lab-results:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('lab_results')
      .select(`
        id,
        parameter_id,
        company_id,
        site_id,
        sample_date,
        sample_id,
        recorded_value,
        unit,
        percentage_of_limit,
        lab_reference,
        entry_method,
        source_file_path,
        is_exceedance,
        entered_by,
        verified_by,
        verified_at,
        notes,
        created_at,
        updated_at
      `);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.parameter_id) {
      query = query.eq('parameter_id', filters.parameter_id);
    }
    if (filters.is_exceedance !== undefined) {
      query = query.eq('is_exceedance', filters.is_exceedance === 'true');
    }
    if (filters['sample_date[gte]']) {
      query = query.gte('sample_date', filters['sample_date[gte]']);
    }
    if (filters['sample_date[lte]']) {
      query = query.lte('sample_date', filters['sample_date[lte]']);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('sample_date', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: labResults, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch lab results',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (labResults || []).length > limit;
    const data = hasMore ? (labResults || []).slice(0, limit) : (labResults || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].created_at) : null;

    const response = paginatedResponse(data, nextCursor, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-2/lab-results:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

