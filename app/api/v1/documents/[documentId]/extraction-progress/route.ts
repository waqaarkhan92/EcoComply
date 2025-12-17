/**
 * Document Extraction Progress SSE Endpoint
 * GET /api/v1/documents/{documentId}/extraction-progress - Stream real-time extraction progress
 *
 * Uses Server-Sent Events (SSE) for real-time updates.
 * Frontend can also poll /extraction-status for simpler integration.
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/middleware';
import {
  getExtractionProgress,
  subscribeToProgress,
  formatProgressMessage,
} from '@/lib/services/extraction-progress-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid document ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify document exists and user has access
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, uploaded_by')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check user access
    if (document.uploaded_by !== user.id) {
      const { data: siteAccess } = await supabaseAdmin
        .from('user_site_assignments')
        .select('id')
        .eq('site_id', document.site_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!siteAccess) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if this is an SSE request
    const acceptHeader = request.headers.get('accept') || '';
    const isSSE = acceptHeader.includes('text/event-stream');

    if (!isSSE) {
      // Return current progress as JSON for simple polling
      const progress = await getExtractionProgress(documentId);
      return new Response(
        JSON.stringify({
          data: progress || {
            documentId,
            status: 'queued',
            progress: 0,
            obligationsFound: 0,
            message: 'Waiting for progress data...',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ documentId })}\n\n`)
        );

        try {
          // Subscribe to progress updates
          const abortController = new AbortController();

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            abortController.abort();
          });

          for await (const progress of subscribeToProgress(documentId, abortController.signal)) {
            if (request.signal.aborted) break;

            const message = formatProgressMessage(progress);

            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({
                  ...progress,
                  message,
                })}\n\n`
              )
            );

            // Close stream if completed or failed
            if (progress.status === 'completed' || progress.status === 'failed') {
              controller.enqueue(
                encoder.encode(`event: ${progress.status}\ndata: ${JSON.stringify(progress)}\n\n`)
              );
              break;
            }
          }
        } catch (error: any) {
          // Send error event
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('Extraction progress SSE error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
