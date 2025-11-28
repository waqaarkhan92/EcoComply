/**
 * Excel Import Endpoints
 * POST /api/v1/obligations/import/excel - Upload Excel file for bulk import
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

// File limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 10000;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const siteIdStr = formData.get('site_id') as string | null;
    const importOptionsStr = formData.get('import_options') as string | null;

    // Validate required fields
    if (!file) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File is required',
        422,
        { file: 'File is required' },
        { request_id: requestId }
      );
    }

    if (!siteIdStr) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file type. Only .xlsx, .xls, and .csv files are allowed',
        422,
        { file: 'File must be .xlsx, .xls, or .csv' },
        { request_id: requestId }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        413,
        { file: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { request_id: requestId }
      );
    }

    // Verify site exists and user has access (RLS will enforce)
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', siteIdStr)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse import options
    let importOptions: any = {
      create_missing_sites: false,
      create_missing_permits: false,
      skip_duplicates: true,
    };

    if (importOptionsStr) {
      try {
        const parsed = JSON.parse(importOptionsStr);
        importOptions = { ...importOptions, ...parsed };
      } catch {
        // Invalid JSON, use defaults
      }
    }

    // Read file and count rows
    const fileBuffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    let rowCount = 0;

    try {
      if (fileExtension === '.csv') {
        // Parse CSV
        const csvText = Buffer.from(fileBuffer).toString('utf-8');
        workbook = XLSX.read(csvText, { type: 'string' });
      } else {
        // Parse Excel
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      }

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON to count rows (excluding header)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      rowCount = jsonData.length - 1; // Exclude header row

      // Validate row count
      if (rowCount > MAX_ROWS) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `Too many rows. Maximum is ${MAX_ROWS} rows`,
          422,
          { file: `File contains ${rowCount} rows, maximum is ${MAX_ROWS}` },
          { request_id: requestId }
        );
      }

      if (rowCount === 0) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'File contains no data rows',
          422,
          { file: 'File must contain at least one data row' },
          { request_id: requestId }
        );
      }
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Failed to parse Excel file',
        422,
        { file: error.message || 'Invalid Excel file format' },
        { request_id: requestId }
      );
    }

    // Determine file format
    let fileFormat: 'XLSX' | 'XLS' | 'CSV' = 'XLSX';
    if (fileExtension === '.csv') {
      fileFormat = 'CSV';
    } else if (fileExtension === '.xls') {
      fileFormat = 'XLS';
    }

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const storagePath = `${fileId}${fileExtension}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

    if (uploadError || !uploadData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to upload file',
        500,
        { error: uploadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Create excel_imports record
    const importData = {
      user_id: user.id,
      company_id: site.company_id,
      site_id: site.id,
      file_name: file.name,
      file_size_bytes: file.size,
      storage_path: storagePath,
      file_format: fileFormat,
      row_count: rowCount,
      valid_count: 0,
      error_count: 0,
      success_count: 0,
      status: 'PENDING',
      valid_rows: [],
      error_rows: [],
      warning_rows: [],
      errors: [],
      import_options: importOptions,
      column_mapping: {}, // Will be populated by background job
      obligation_ids: [],
    };

    const { data: excelImport, error: importError } = await supabaseAdmin
      .from('excel_imports')
      .insert(importData)
      .select('id, status, file_name, row_count, created_at')
      .single();

    if (importError || !excelImport) {
      // Rollback: Delete uploaded file
      await supabaseAdmin.storage.from('documents').remove([storagePath]);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create import record',
        500,
        { error: importError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // TODO: Trigger background job for processing (Phase 4)
    // For now, return 202 Accepted with status PROCESSING
    // Background job will update status to PENDING_REVIEW when ready

    return successResponse(
      {
        import_id: excelImport.id,
        status: 'PROCESSING',
        file_name: excelImport.file_name,
        row_count: excelImport.row_count,
        message: 'Excel import is being processed. You will be notified when ready for review.',
      },
      202,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Excel import upload error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

