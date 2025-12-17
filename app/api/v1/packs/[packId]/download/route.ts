/**
 * Download Pack PDF
 * GET /api/v1/packs/{packId}/download
 * 
 * Downloads the generated pack PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest, props: { params: Promise<{ packId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { packId } = params;

    // Get pack - RLS will enforce access control
  const { data: pack, error } = await supabaseAdmin
      .from('audit_packs')
      .select('id, pack_type, status, storage_path, file_name')
      .eq('id', packId)
      .single();

    if (error || !pack) {
      if (error?.code === 'PGRST116') {
        // No rows returned
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Pack not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch pack',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Check if pack is completed
    if (pack.status !== 'COMPLETED') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Pack is not ready for download',
        422,
        { status: `Pack status is ${pack.status}. Only completed packs can be downloaded.` },
        { request_id: requestId }
      );
    }

    if (!pack.storage_path) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Pack file not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('audit-packs')
      .download(pack.storage_path);

    if (downloadError || !fileData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to download pack file',
        500,
        { error: downloadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const fileName = pack.file_name || `pack-${pack.pack_type.toLowerCase()}-${pack.id.substring(0, 8)}.pdf`;

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download pack error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

