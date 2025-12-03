/**
 * Compliance Clocks API Endpoint
 * Returns compliance clocks for countdown/tracking
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { searchParams } = new URL(request.url);

    const site_id = searchParams.get('site_id');
    const module_id = searchParams.get('module_id');
    const status = searchParams.get('status');
    const criticality = searchParams.get('criticality');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get user's accessible sites
    const { data: userSites } = await supabaseAdmin
      .from('user_site_assignments')
      .select('site_id')
      .eq('user_id', user.id);

    const siteIds = userSites?.map(us => us.site_id) || [];

    if (siteIds.length === 0) {
      return successResponse({
        clocks: [],
        pagination: { total: 0, limit, has_more: false }
      });
    }

    // Build query
    let query = supabaseAdmin
      .from('compliance_clocks_universal')
      .select(`
        id,
        company_id,
        site_id,
        module_id,
        entity_type,
        entity_id,
        title,
        description,
        target_date,
        status,
        criticality,
        days_remaining,
        evidence_id,
        completed_at,
        completed_by,
        created_at,
        sites(site_name),
        modules(module_name)
      `)
      .in('site_id', siteIds)
      .is('deleted_at', null);

    // Apply filters
    if (site_id) {
      query = query.eq('site_id', site_id);
    }
    if (module_id) {
      query = query.eq('module_id', module_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (criticality) {
      query = query.eq('criticality', criticality);
    }

    // Order by target_date (soonest first) and limit
    query = query
      .order('target_date', { ascending: true })
      .limit(limit);

    const { data: clocks, error: clocksError } = await query;

    if (clocksError) {
      console.error('Error fetching compliance clocks:', clocksError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch compliance clocks',
        500
      );
    }

    // Calculate days remaining for each clock
    const today = new Date();
    const enrichedClocks = clocks?.map(clock => {
      const targetDate = new Date(clock.target_date);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...clock,
        days_remaining: diffDays,
        is_overdue: diffDays < 0,
        is_critical: diffDays >= 0 && diffDays <= 7,
        is_warning: diffDays > 7 && diffDays <= 30,
      };
    }) || [];

    return successResponse({
      clocks: enrichedClocks,
      pagination: {
        total: enrichedClocks.length,
        limit,
        has_more: enrichedClocks.length === limit,
      },
      summary: {
        total: enrichedClocks.length,
        overdue: enrichedClocks.filter(c => c.is_overdue).length,
        critical: enrichedClocks.filter(c => c.is_critical).length,
        warning: enrichedClocks.filter(c => c.is_warning).length,
        completed: enrichedClocks.filter(c => c.status === 'COMPLETED').length,
      }
    });
  } catch (error: any) {
    console.error('Compliance clocks error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch compliance clocks',
      500,
      { error: error.message }
    );
  }
}
