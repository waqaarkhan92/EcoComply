/**
 * Evidence Chain of Custody Endpoint
 * GET /api/v1/evidence/{evidenceId}/chain-of-custody
 * 
 * Returns the complete chain of custody for an evidence item
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ evidenceId: string }> }
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
  const { evidenceId } = params;

    // Get evidence - RLS will enforce access control
  const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence')
      .select('id, site_id, company_id')
      .eq('id', evidenceId)
      .is('deleted_at', null)
      .single();

    if (evidenceError || !evidence) {
      if (evidenceError?.code === 'PGRST116') {
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
        { error: evidenceError?.message },
        { request_id: requestId }
      );
    }

    // Get chain of custody events from audit logs
  const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action_type,
        user_id,
        changes,
        created_at
      `)
      .eq('entity_type', 'EVIDENCE')
      .eq('entity_id', evidenceId)
      .in('action_type', [
        'EVIDENCE_UPLOADED',
        'EVIDENCE_LINKED',
        'EVIDENCE_UNLINKED',
        'EVIDENCE_ACCESSED',
        'EVIDENCE_DOWNLOADED',
        'EVIDENCE_APPROVED',
        'EVIDENCE_MODIFICATION_ATTEMPTED'
      ])
      .order('created_at', { ascending: true });

    if (auditError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch chain of custody',
        500,
        { error: auditError.message },
        { request_id: requestId }
      );
    }

    // Get user details for each event
    const userIds = [...new Set(auditLogs?.map(log => log.user_id) || [])];
  const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Transform audit logs into chain of custody events
    const events = auditLogs?.map((log) => {
      const user = userMap.get(log.user_id);
      const changes = log.changes as any;

      return {
        id: log.id,
        event_type: log.action_type,
        event_timestamp: log.created_at,
        actor_id: log.user_id,
        actor_name: user?.full_name || 'Unknown User',
        actor_email: user?.email || null,
        ip_address: changes?.ip_address || null,
        file_hash: changes?.file_hash || null,
        event_details: changes,
      };
    }) || [];

    // Calculate summary statistics
    const summary = {
      total_events: events.length,
      unique_actors: new Set(events.map(e => e.actor_id)).size,
      access_count: events.filter(e => e.event_type === 'EVIDENCE_ACCESSED').length,
      download_count: events.filter(e => e.event_type === 'EVIDENCE_DOWNLOADED').length,
      modification_attempts: events.filter(e => e.event_type === 'EVIDENCE_MODIFICATION_ATTEMPTED').length,
    };

    const response = successResponse(
      {
        events,
        summary,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching chain of custody:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch chain of custody',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

