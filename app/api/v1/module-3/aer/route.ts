/**
 * Module 3: AER (Annual Emissions Report) Endpoints
 * GET /api/v1/module-3/aer - List AER documents
 * POST /api/v1/module-3/aer/generate - Trigger AER generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
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
      .from('aer_documents')
      .select(`
        id,
        document_id,
        company_id,
        reporting_period_start,
        reporting_period_end,
        submission_deadline,
        status,
        generator_data,
        fuel_consumption_data,
        emissions_data,
        incidents_data,
        total_run_hours,
        is_validated,
        validation_errors,
        generated_file_path,
        generated_at,
        submitted_at,
        submission_reference,
        submitted_by,
        notes,
        created_at,
        updated_at,
        documents!inner(
          id,
          site_id,
          title,
          reference_number
        )
      `);

    // Apply filters
    if (filters.document_id) {
      query = query.eq('document_id', filters.document_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: aerDocs, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch AER documents',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = (aerDocs || []).length > limit;
    const data = hasMore ? (aerDocs || []).slice(0, limit) : (aerDocs || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/aer:', error);
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
    const { document_id, year, generator_ids } = body;

    // Validate required fields
    if (!document_id || !year) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: document_id, year',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify document exists and belongs to user's company
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, document_type, module_id, sites!inner(company_id)')
      .eq('id', document_id)
      .eq('document_type', 'MCPD_REGISTRATION')
      .single();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'MCPD registration document not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const documentCompanyId = (document as any).sites?.company_id;
    if (documentCompanyId !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this document',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get generators for this document
    let generatorsQuery = supabaseAdmin
      .from('generators')
      .select('id, generator_identifier, generator_type, current_year_hours')
      .eq('document_id', document_id)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (generator_ids && Array.isArray(generator_ids) && generator_ids.length > 0) {
      generatorsQuery = generatorsQuery.in('id', generator_ids);
    }

    const { data: generators, error: genError } = await generatorsQuery;

    if (genError || !generators || generators.length === 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'No generators found for this registration',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Calculate reporting period (calendar year)
    const reportingPeriodStart = `${year}-01-01`;
    const reportingPeriodEnd = `${year}-12-31`;
    const submissionDeadline = `${year + 1}-03-31`; // AERs typically due by March 31 of following year

    // Check if AER already exists for this year
    const { data: existingAER } = await supabaseAdmin
      .from('aer_documents')
      .select('id, status')
      .eq('document_id', document_id)
      .eq('reporting_period_start', reportingPeriodStart)
      .single();

    if (existingAER) {
      return errorResponse(
        ErrorCodes.CONFLICT,
        'AER already exists for this reporting period',
        409,
        { aer_id: existingAER.id, status: existingAER.status },
        { request_id: requestId }
      );
    }

    // Create AER document record
    const { data: aerDoc, error: aerError } = await supabaseAdmin
      .from('aer_documents')
      .insert({
        document_id,
        company_id: user.company_id,
        reporting_period_start: reportingPeriodStart,
        reporting_period_end: reportingPeriodEnd,
        submission_deadline: submissionDeadline,
        status: 'DRAFT',
        generator_data: generators.map((g: any) => ({
          generator_id: g.id,
          generator_identifier: g.generator_identifier,
          generator_type: g.generator_type,
          run_hours: g.current_year_hours,
        })),
        fuel_consumption_data: [],
        emissions_data: [],
        incidents_data: [],
        is_validated: false,
        validation_errors: [],
        created_by: user.id,
      })
      .select()
      .single();

    if (aerError || !aerDoc) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create AER document',
        500,
        { error: aerError?.message },
        { request_id: requestId }
      );
    }

    // Queue AER generation job
    try {
      const queue = getQueue(QUEUE_NAMES.AER_GENERATION);
      const job = await queue.add('generate-aer', {
        aer_document_id: aerDoc.id,
        document_id,
        year,
        generator_ids: generators.map((g: any) => g.id),
        user_id: user.id,
      });

      const queuedResponse = successResponse(
        {
          job_id: job.id,
          aer_id: aerDoc.id,
          status: 'QUEUED',
          estimated_completion_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes estimate
        },
        202,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, queuedResponse);
    } catch (queueError) {
      console.error('Failed to queue AER generation:', queueError);
      // Return success but note that generation is pending
      const draftResponse = successResponse(
        {
          aer_id: aerDoc.id,
          status: 'DRAFT',
          message: 'AER document created but generation job failed to queue. Please retry.',
        },
        201,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, draftResponse);
    }
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/aer/generate:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

