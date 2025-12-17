/**
 * Chain of Custody Export Endpoint
 * GET /api/v1/evidence/{evidenceId}/chain-of-custody/export
 * 
 * Exports chain of custody as PDF or CSV
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
  const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Get evidence - RLS will enforce access control
  const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence')
      .select('id, file_name, site_id, company_id')
      .eq('id', evidenceId)
      .is('deleted_at', null)
      .single();

    if (evidenceError || !evidence) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Evidence not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get chain of custody events (reuse logic from chain-of-custody route)
  const { data: auditLogs } = await supabaseAdmin
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

    const userIds = [...new Set(auditLogs?.map(log => log.user_id) || [])];
  const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    const events = auditLogs?.map((log) => {
      const user = userMap.get(log.user_id);
      const changes = log.changes as any;

      return {
        event_type: log.action_type,
        event_timestamp: log.created_at,
        actor_name: user?.full_name || 'Unknown User',
        actor_email: user?.email || null,
        ip_address: changes?.ip_address || null,
        file_hash: changes?.file_hash || null,
      };
    }) || [];

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Event Type', 'Timestamp', 'Actor Name', 'Actor Email', 'IP Address', 'File Hash'];
      const rows: string[][] = [headers];

      events.forEach((event) => {
        rows.push([
          event.event_type.replace(/_/g, ' '),
          new Date(event.event_timestamp).toISOString(),
          event.actor_name,
          event.actor_email || 'N/A',
          event.ip_address || 'N/A',
          event.file_hash ? event.file_hash.substring(0, 16) + '...' : 'N/A',
        ]);
      });

      const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="chain-of-custody-${evidenceId}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF, return JSON for now (PDF generation would require a library like pdfkit or puppeteer)
      // In production, you'd generate an actual PDF here
      return errorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'PDF export not yet implemented',
        501,
        null,
        { request_id: requestId }
      );
    } else {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid format. Use "csv" or "pdf"',
        400,
        null,
        { request_id: requestId }
      );
    }
  } catch (error: any) {
    console.error('Error exporting chain of custody:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to export chain of custody',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

