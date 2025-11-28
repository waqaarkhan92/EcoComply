/**
 * Excel Import Status Endpoint
 * GET /api/v1/obligations/import/excel/{importId} - Get import status
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

    return successResponse(
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

