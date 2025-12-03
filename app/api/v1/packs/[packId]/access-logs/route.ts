/**
 * Pack Access Logs API Endpoint
 * Returns audit trail of pack access and shares
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest, props: { params: Promise<{ packId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const params = await props.params;
    const { packId } = params;

    // Verify pack exists and user has access
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, site_id, pack_name, created_at, created_by, users!audit_packs_created_by_fkey(full_name)')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Pack not found', 404);
    }

    // Check user has access to this site
    const { data: userSite } = await supabaseAdmin
      .from('user_site_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_id', pack.site_id)
      .single();

    if (!userSite) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied to this pack', 403);
    }

    // Get pack sharing records
    const { data: shares, error: sharesError } = await supabaseAdmin
      .from('pack_sharing')
      .select(`
        id,
        shared_with_user_id,
        shared_with_company_id,
        access_level,
        expires_at,
        accessed_at,
        created_at,
        created_by,
        users!pack_sharing_created_by_fkey(full_name, email),
        shared_user:users!pack_sharing_shared_with_user_id_fkey(full_name, email),
        shared_company:companies!pack_sharing_shared_with_company_id_fkey(company_name)
      `)
      .eq('pack_id', packId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Create access logs array from shares
    const accessLogs = shares?.map(share => ({
      id: share.id,
      accessor_email: (share.shared_user as any)?.email || (share.shared_company as any)?.company_name || 'Unknown',
      ip_address: 'N/A',
      first_accessed_at: share.accessed_at || share.created_at,
      last_accessed_at: share.accessed_at || share.created_at,
      view_count: share.accessed_at ? 1 : 0,
      download_count: 0,
    })) || [];

    const summary = {
      total_access_count: shares?.filter(s => s.accessed_at).length || 0,
      unique_accessors_count: new Set(shares?.map(s => s.shared_with_user_id || s.shared_with_company_id)).size,
      total_download_count: 0,
    };

    return successResponse({
      access_logs: accessLogs,
      pagination: {
        page: 1,
        per_page: 50,
        total: accessLogs.length,
        total_pages: 1,
      },
      summary,
    });
  } catch (error: any) {
    console.error('Pack access logs error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch pack access logs',
      500,
      { error: error.message }
    );
  }
}
