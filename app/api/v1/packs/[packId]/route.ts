/**
 * Pack Detail Endpoint
 * GET /api/v1/packs/{packId}
 * 
 * Returns detailed information about a specific pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ packId: string } }
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
      .select(`
        id,
        company_id,
        site_id,
        document_id,
        pack_type,
        status,
        recipient_type,
        recipient_name,
        purpose,
        date_range_start,
        date_range_end,
        storage_path,
        file_name,
        file_size_bytes,
        secure_link_id,
        generated_by,
        created_at,
        updated_at,
        generated_at
      `)
      .eq('id', packId)
      .single();

    if (error || !pack) {
      if (error?.code === 'PGRST116') {
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
        { error: error?.message },
        { request_id: requestId }
      );
    }

    // Get file URL if pack is completed
    let fileUrl = '';
    if (pack.status === 'COMPLETED' && pack.storage_path) {
      const { data: urlData } = supabaseAdmin.storage
        .from('audit-packs')
        .getPublicUrl(pack.storage_path);
      fileUrl = urlData?.publicUrl || '';
    }

    // Get counts from pack_contents
    const { count: evidenceCount } = await supabaseAdmin
      .from('pack_contents')
      .select('id', { count: 'exact', head: true })
      .eq('pack_id', packId)
      .eq('content_type', 'EVIDENCE');

    const { count: obligationCount } = await supabaseAdmin
      .from('pack_contents')
      .select('id', { count: 'exact', head: true })
      .eq('pack_id', packId)
      .eq('content_type', 'OBLIGATION');

    const response = successResponse(
      {
        ...pack,
        file_url: fileUrl,
        evidence_count: evidenceCount || 0,
        obligation_count: obligationCount || 0,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching pack:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch pack',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

