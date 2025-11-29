/**
 * Excel Import Status Endpoint
 * GET /api/v1/obligations/import/excel/{importId} - Get import status
 * DELETE /api/v1/obligations/import/excel/{importId} - Cancel import
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { importId } = params;

    // Get import - RLS will enforce access control
    const { data: excelImport, error } = await supabaseAdmin
      .from('excel_imports')
      .select('*')
      .eq('id', importId)
      .single();

    if (error || !excelImport) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Import not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch import',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        import_id: excelImport.id,
        status: excelImport.status,
        file_name: excelImport.file_name,
        row_count: excelImport.row_count,
        valid_count: excelImport.valid_count,
        error_count: excelImport.error_count,
        success_count: excelImport.success_count,
        errors: excelImport.errors || [],
        created_at: excelImport.created_at,
        completed_at: excelImport.completed_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get excel import error:', error);
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
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { importId } = params;

    // Get import - RLS will enforce access control
    const { data: excelImport, error } = await supabaseAdmin
      .from('excel_imports')
      .select('*')
      .eq('id', importId)
      .single();

    if (error || !excelImport) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Import not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch import',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Check if import can be cancelled
    if (excelImport.status === 'COMPLETED' || excelImport.status === 'CANCELLED') {
      return errorResponse(
        ErrorCodes.UNPROCESSABLE_ENTITY,
        `Import cannot be cancelled. Current status: ${excelImport.status}`,
        422,
        { status: excelImport.status },
        { request_id: requestId }
      );
    }

    // Update import status to CANCELLED
    const { error: updateError } = await supabaseAdmin
      .from('excel_imports')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to cancel import',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // Cancel any pending background jobs
    const { data: jobs } = await supabaseAdmin
      .from('background_jobs')
      .select('id, job_id')
      .eq('entity_type', 'excel_imports')
      .eq('entity_id', importId)
      .in('status', ['PENDING', 'PROCESSING']);

    if (jobs && jobs.length > 0) {
      // Update job status to CANCELLED
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .in('id', jobs.map((j) => j.id));
    }

    // Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Cancel excel import error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

