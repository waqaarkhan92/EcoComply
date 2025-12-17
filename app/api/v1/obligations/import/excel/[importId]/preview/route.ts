/**
 * Excel Import Preview Endpoint
 * GET /api/v1/obligations/import/excel/{importId}/preview - Get import preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ importId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
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
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Preview not ready. Import is still processing.',
        422,
        { status: excelImport.status },
        { request_id: requestId }
      );
    }

    // Build response data
    const responseData = {
      import_id: excelImport.id,
      status: excelImport.status,
      file_name: excelImport.file_name,
      row_count: excelImport.row_count,
      valid_count: excelImport.valid_count || 0,
      error_count: excelImport.error_count || 0,
      valid_rows: (excelImport.valid_rows || []).map((row: any) => ({
        row_number: row.row_number,
        data: row.row_data || row.data || {},
        warnings: row.warnings || [],
      })),
      errors: (excelImport.error_rows || []).map((row: any) => ({
        row_number: row.row_number,
        errors: row.errors || [],
        data: row.row_data || row.data || {},
      })),
      warnings: (excelImport.warning_rows || []).map((row: any) => ({
        row_number: row.row_number,
        warnings: row.warnings || [],
        data: row.row_data || row.data || {},
      })),
    };

    const response = successResponse(responseData, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
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
