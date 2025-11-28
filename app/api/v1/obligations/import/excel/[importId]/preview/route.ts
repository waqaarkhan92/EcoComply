/**
 * Excel Import Preview Endpoint
 * GET /api/v1/obligations/import/excel/{importId}/preview - Get import preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

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

    // Check if preview is ready
    if (excelImport.status === 'PROCESSING' || excelImport.status === 'PENDING') {
      return successResponse(
        {
          import_id: excelImport.id,
          status: excelImport.status,
          message: 'Import is still being processed. Please check again later.',
        },
        202,
        { request_id: requestId }
      );
    }

    if (excelImport.status === 'FAILED') {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Import processing failed',
        500,
        { errors: excelImport.errors || [] },
        { request_id: requestId }
      );
    }

    // Preview is ready
    return successResponse(
      {
        import_id: excelImport.id,
        status: excelImport.status,
        file_name: excelImport.file_name,
        row_count: excelImport.row_count,
        valid_count: excelImport.valid_count,
        error_count: excelImport.error_count,
        valid_rows: excelImport.valid_rows || [],
        errors: excelImport.error_rows || [],
        warnings: excelImport.warning_rows || [],
        column_mapping: excelImport.column_mapping || {},
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get excel import preview error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

