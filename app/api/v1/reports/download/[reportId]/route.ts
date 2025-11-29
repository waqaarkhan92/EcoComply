/**
 * Download Report File
 * GET /api/v1/reports/download/{reportId}
 * 
 * Downloads the generated report file (PDF, CSV, or JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { reportId } = params;

    // Get report - RLS will enforce access control
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('id, report_type, status, file_path, format, company_id')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Report not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch report',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Verify user has access (RLS should handle this, but double-check)
    if (report.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Check if report is completed
    if (report.status !== 'COMPLETED') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Report is not ready for download',
        422,
        { status: `Report status is ${report.status}. Only completed reports can be downloaded.` },
        { request_id: requestId }
      );
    }

    if (!report.file_path) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Report file not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('reports')
      .download(report.file_path);

    if (downloadError || !fileData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to download report file',
        500,
        { error: downloadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type based on format
    const contentTypes: Record<string, string> = {
      PDF: 'application/pdf',
      CSV: 'text/csv',
      JSON: 'application/json',
    };
    const contentType = contentTypes[report.format] || 'application/octet-stream';

    // Generate filename
    const extension = report.format.toLowerCase();
    const fileName = `report-${report.report_type}-${report.id.substring(0, 8)}.${extension}`;

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download report error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

