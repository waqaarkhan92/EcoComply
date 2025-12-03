/**
 * Pack Contents API Endpoint
 * Returns all obligations and evidence included in a pack
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
      .select('id, site_id, sites(site_name)')
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

    // Get pack obligations
    const { data: packObligations, error: obligationsError } = await supabaseAdmin
      .from('pack_obligations')
      .select(`
        id,
        obligation_id,
        included_at,
        obligation_snapshot
      `)
      .eq('pack_id', packId)
      .is('deleted_at', null);

    // Get pack evidence
    const { data: packEvidence, error: evidenceError } = await supabaseAdmin
      .from('pack_evidence')
      .select(`
        id,
        evidence_id,
        included_at,
        evidence_snapshot
      `)
      .eq('pack_id', packId)
      .is('deleted_at', null);

    // Calculate summary breakdown
    const evidenceBreakdown = {
      total: packEvidence?.length || 0,
    };

    const obligationBreakdown = {
      total: packObligations?.length || 0,
    };

    const contents = {
      evidence_contents: packEvidence || [],
      obligation_contents: packObligations || [],
      summary: {
        evidence_breakdown: evidenceBreakdown,
        obligation_breakdown: obligationBreakdown,
      }
    };

    return successResponse(contents);
  } catch (error: any) {
    console.error('Pack contents error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch pack contents',
      500,
      { error: error.message }
    );
  }
}
