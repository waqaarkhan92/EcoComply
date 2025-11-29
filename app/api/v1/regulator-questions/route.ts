/**
 * Regulator Questions Endpoints
 * GET /api/v1/regulator-questions - List regulator questions
 * POST /api/v1/regulator-questions - Create regulator question
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
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

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('regulator_questions')
      .select('id, obligation_id, question_type, question_text, response_deadline, status, created_at');

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.obligation_id) {
      query = query.eq('obligation_id', filters.obligation_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.question_type) {
      query = query.eq('question_type', filters.question_type);
    }
    if (filters.response_deadline) {
      if (filters.response_deadline.lte) {
        query = query.lte('response_deadline', filters.response_deadline.lte);
      }
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by response_deadline ascending
      query = query.order('response_deadline', { ascending: true });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      query = query.lt('created_at', parsedCursor.created_at);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: questions, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch regulator questions',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = questions && questions.length > limit;
    const results = hasMore ? questions.slice(0, limit) : questions || [];

    // Create cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get regulator questions error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.question_type || !body.question_text || !body.response_deadline) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: question_type, question_text, response_deadline',
        422,
        { required: ['question_type', 'question_text', 'response_deadline'] },
        { request_id: requestId }
      );
    }

    const validQuestionTypes = ['OBLIGATION_CLARIFICATION', 'EVIDENCE_REQUEST', 'COMPLIANCE_QUERY', 'URGENT', 'INFORMAL'];
    if (!validQuestionTypes.includes(body.question_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid question_type',
        422,
        { question_type: `Must be one of: ${validQuestionTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Get company_id from site_id or obligation_id
    let companyId: string | null = null;
    let siteId: string | null = body.site_id || null;

    if (body.site_id) {
      const { data: site } = await supabaseAdmin
        .from('sites')
        .select('company_id')
        .eq('id', body.site_id)
        .single();
      companyId = site?.company_id || null;
    } else if (body.obligation_id) {
      const { data: obligation } = await supabaseAdmin
        .from('obligations')
        .select('company_id, site_id')
        .eq('id', body.obligation_id)
        .single();
      companyId = obligation?.company_id || null;
      siteId = obligation?.site_id || null;
    }

    if (!companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot determine company_id. Provide either site_id or obligation_id',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Create regulator question
    const questionData: any = {
      company_id: companyId,
      site_id: siteId,
      obligation_id: body.obligation_id || null,
      document_id: body.document_id || null,
      question_type: body.question_type,
      question_text: body.question_text,
      question_document_id: body.question_document_id || null,
      raised_date: new Date().toISOString().split('T')[0],
      response_deadline: body.response_deadline,
      status: 'OPEN',
      assigned_to: body.assigned_to || null,
      created_by: user.id,
    };

    const { data: question, error: createError } = await supabaseAdmin
      .from('regulator_questions')
      .insert(questionData)
      .select('id, question_type, question_text, response_deadline, status, created_at')
      .single();

    if (createError || !question) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create regulator question',
        500,
        { error: createError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(question, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Create regulator question error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

