/**
 * Download Evidence File
 * GET /api/v1/evidence/{evidenceId}/download
 * 
 * Downloads the evidence file
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { evidenceId } = params;

    // Get evidence - RLS will enforce access control
    const { data: evidence, error } = await supabaseAdmin
      .from('evidence_items')
      .select('id, file_name, storage_path, mime_type, file_size_bytes')
      .eq('id', evidenceId)
      .eq('is_archived', false)
      .single();

    if (error || !evidence) {
      if (error?.code === 'PGRST116') {
        // No rows returned
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Evidence not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('evidence')
      .download(evidence.storage_path);

    if (downloadError || !fileData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to download file',
        500,
        { error: downloadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': evidence.mime_type,
        'Content-Disposition': `attachment; filename="${evidence.file_name}"`,
        'Content-Length': evidence.file_size_bytes.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

