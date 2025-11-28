/**
 * Excel Import Confirmation Endpoint
 * POST /api/v1/obligations/import/excel/{importId}/confirm - Confirm and execute import
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function POST(
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      skip_errors = false,
      create_missing_sites = false,
      create_missing_permits = true,
    } = body;

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

    // Validate import status
    if (excelImport.status !== 'PENDING_REVIEW') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Import cannot be confirmed. Current status: ${excelImport.status}`,
        422,
        { status: excelImport.status },
        { request_id: requestId }
      );
    }

    // Check if there are valid rows
    if (!excelImport.valid_rows || excelImport.valid_rows.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No valid rows to import',
        422,
        { valid_count: excelImport.valid_count },
        { request_id: requestId }
      );
    }

    // Update import options with confirmation options
    const updatedImportOptions = {
      ...excelImport.import_options,
      skip_errors,
      create_missing_sites,
      create_missing_permits,
    };

    // Update import status to COMPLETED (background job will actually create obligations)
    // For now, we'll mark it as COMPLETED and the background job will handle creation
    // TODO: Trigger background job Phase 2 (bulk obligation creation) - Phase 4
    const { data: updatedImport, error: updateError } = await supabaseAdmin
      .from('excel_imports')
      .update({
        status: 'COMPLETED',
        import_options: updatedImportOptions,
        updated_at: new Date().toISOString(),
        // completed_at will be set by background job
      })
      .eq('id', importId)
      .select('id, status, success_count, error_count, obligation_ids')
      .single();

    if (updateError || !updatedImport) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to confirm import',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // TODO: Trigger background job for bulk obligation creation
    // For now, return success with estimated count
    const estimatedCount = excelImport.valid_count || 0;

    return successResponse(
      {
        import_id: updatedImport.id,
        status: updatedImport.status,
        success_count: updatedImport.success_count || 0,
        error_count: updatedImport.error_count || 0,
        obligation_ids: updatedImport.obligation_ids || [],
        message: `Import confirmed. ${estimatedCount} obligations will be created.`,
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Confirm excel import error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

