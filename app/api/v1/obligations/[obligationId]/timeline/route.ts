/**
 * Obligation Timeline API
 * GET /api/v1/obligations/[obligationId]/timeline - Get audit timeline for an obligation
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 5
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ obligationId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;
  const { obligationId } = params;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify obligation belongs to user's company
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, company_id')
      .eq('id', obligationId)
      .eq('company_id', user.company_id)
      .single();

    if (obligationError || !obligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Fetch timeline from multiple sources
    const timelineEvents: TimelineEvent[] = [];

    // 1. Fetch from audit_logs
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action,
        changes,
        created_at,
        user_id,
        users(full_name, email)
      `)
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditLogs) {
      for (const log of auditLogs) {
        const userInfo = (log as any).users;
        timelineEvents.push({
          id: log.id,
          event_type: mapAuditAction(log.action),
          description: generateDescription(log.action, log.changes),
          user_name: userInfo?.full_name || null,
          user_email: userInfo?.email || null,
          created_at: log.created_at,
          metadata: log.changes || {},
        });
      }
    }

    // 2. Fetch from activity_feed for this obligation
    const { data: activities } = await supabaseAdmin
      .from('activity_feed')
      .select(`
        id,
        activity_type,
        summary,
        metadata,
        created_at,
        users(full_name, email)
      `)
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activities) {
      for (const activity of activities) {
        const userInfo = (activity as any).users;
        // Avoid duplicates with audit logs
        const existing = timelineEvents.find(
          e =>
            e.created_at === activity.created_at &&
            e.event_type === activity.activity_type
        );
        if (!existing) {
          timelineEvents.push({
            id: activity.id,
            event_type: activity.activity_type,
            description: activity.summary,
            user_name: userInfo?.full_name || null,
            user_email: userInfo?.email || null,
            created_at: activity.created_at,
            metadata: activity.metadata || {},
          });
        }
      }
    }

    // 3. Fetch evidence linking events
    const { data: evidenceLinks } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select(`
        id,
        created_at,
        evidence_items(file_name),
        created_by,
        users:created_by(full_name, email)
      `)
      .eq('obligation_id', obligationId)
      .order('created_at', { ascending: false });

    if (evidenceLinks) {
      for (const link of evidenceLinks) {
        const evidence = (link as any).evidence_items;
        const userInfo = (link as any).users;
        timelineEvents.push({
          id: link.id,
          event_type: 'EVIDENCE_LINKED',
          description: `Evidence "${evidence?.file_name || 'file'}" was linked`,
          user_name: userInfo?.full_name || null,
          user_email: userInfo?.email || null,
          created_at: link.created_at,
          metadata: { evidence_file_name: evidence?.file_name },
        });
      }
    }

    // 4. Fetch deadline completions
    const { data: deadlines } = await supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        completed_at,
        status,
        completed_by,
        users:completed_by(full_name, email)
      `)
      .eq('obligation_id', obligationId)
      .not('completed_at', 'is', null);

    if (deadlines) {
      for (const deadline of deadlines) {
        const userInfo = (deadline as any).users;
        timelineEvents.push({
          id: `deadline-${deadline.id}`,
          event_type: deadline.status === 'COMPLETED' ? 'DEADLINE_COMPLETED' : 'DEADLINE_MISSED',
          description: `Deadline ${deadline.due_date} was ${deadline.status === 'COMPLETED' ? 'completed' : 'marked as ' + deadline.status.toLowerCase()}`,
          user_name: userInfo?.full_name || null,
          user_email: userInfo?.email || null,
          created_at: deadline.completed_at,
          metadata: { deadline_date: deadline.due_date, status: deadline.status },
        });
      }
    }

    // Sort all events by date (newest first)
    timelineEvents.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply limit after combining
    const paginatedEvents = timelineEvents.slice(0, limit);

    const response = successResponse(
      {
        data: paginatedEvents,
        total: timelineEvents.length,
        obligation_id: obligationId,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error fetching obligation timeline:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

function mapAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    CREATE: 'OBLIGATION_CREATED',
    UPDATE: 'OBLIGATION_UPDATED',
    DELETE: 'OBLIGATION_DELETED',
    STATUS_CHANGE: 'STATUS_CHANGED',
    REVIEW: 'REVIEW_SUBMITTED',
    APPROVE: 'REVIEW_APPROVED',
    REJECT: 'REVIEW_REJECTED',
  };
  return actionMap[action] || action;
}

function generateDescription(action: string, changes: any): string {
  if (!changes) return `Action: ${action}`;

  if (action === 'UPDATE' && changes.old && changes.new) {
    const changedFields = Object.keys(changes.new).filter(
      key => changes.old[key] !== changes.new[key]
    );
    if (changedFields.length > 0) {
      return `Updated fields: ${changedFields.join(', ')}`;
    }
  }

  if (action === 'CREATE') {
    return 'Obligation was created';
  }

  if (action === 'STATUS_CHANGE' && changes.old_status && changes.new_status) {
    return `Status changed from "${changes.old_status}" to "${changes.new_status}"`;
  }

  return `Action: ${action}`;
}
