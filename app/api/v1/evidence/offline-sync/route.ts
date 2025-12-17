/**
 * Offline Sync API for Mobile Evidence
 * POST /api/v1/evidence/offline-sync - Batch sync offline-queued evidence
 * GET /api/v1/evidence/offline-sync - Check sync status
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 15
 *
 * Features:
 * - Batch upload multiple queued items
 * - Idempotent with sync tokens
 * - Conflict detection
 * - Progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireRole, requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import crypto from 'crypto';

interface OfflineItem {
  sync_token: string;
  file_name: string;
  file_data: string; // Base64 encoded
  file_type: string;
  mime_type: string;
  obligation_ids: string[];
  gps_latitude?: number;
  gps_longitude?: number;
  capture_timestamp?: string;
  description?: string;
  evidence_type?: string;
  voice_note_data?: string; // Base64 encoded audio
}

interface SyncResult {
  sync_token: string;
  status: 'success' | 'duplicate' | 'error';
  evidence_id?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const { items, device_id } = body as { items: OfflineItem[]; device_id?: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Items array is required',
        422,
        { items: 'Must provide an array of offline items to sync' },
        { request_id: requestId }
      );
    }

    // Limit batch size
    if (items.length > 20) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Too many items',
        422,
        { items: 'Maximum 20 items per sync request' },
        { request_id: requestId }
      );
    }

    // Create sync batch record
    const batchId = crypto.randomUUID();

    const results: SyncResult[] = [];
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const result = await processOfflineItem(item, user, batchId);
        results.push(result);

        if (result.status === 'success') successCount++;
        else if (result.status === 'duplicate') duplicateCount++;
        else errorCount++;
      } catch (error: any) {
        results.push({
          sync_token: item.sync_token,
          status: 'error',
          error: error.message || 'Unknown error',
        });
        errorCount++;
      }
    }

    // Log sync activity
    await supabaseAdmin
      .from('activity_feed')
      .insert({
        company_id: user.company_id,
        user_id: user.id,
        activity_type: 'OFFLINE_SYNC',
        entity_type: 'evidence',
        entity_id: batchId,
        entity_title: 'Offline Evidence Sync',
        summary: `Synced ${successCount} items (${duplicateCount} duplicates, ${errorCount} errors)`,
        metadata: {
          batch_id: batchId,
          device_id,
          total_items: items.length,
          success_count: successCount,
          duplicate_count: duplicateCount,
          error_count: errorCount,
        },
      });

    const response = successResponse(
      {
        batch_id: batchId,
        total_items: items.length,
        success_count: successCount,
        duplicate_count: duplicateCount,
        error_count: errorCount,
        results,
        synced_at: new Date().toISOString(),
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Offline sync error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const syncTokens = searchParams.get('sync_tokens');
    const batchId = searchParams.get('batch_id');

    if (!syncTokens && !batchId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'sync_tokens or batch_id parameter required',
        422,
        {},
        { request_id: requestId }
      );
    }

    let results: { sync_token: string; exists: boolean; evidence_id?: string }[] = [];

    if (syncTokens) {
      // Check which sync tokens already exist
      const tokens = syncTokens.split(',').map(t => t.trim());

      for (const token of tokens) {
        const { data: existing } = await supabaseAdmin
          .from('evidence_items')
          .select('id')
          .eq('metadata->offline_sync_token', token)
          .single();

        results.push({
          sync_token: token,
          exists: !!existing,
          evidence_id: existing?.id,
        });
      }
    } else if (batchId) {
      // Get all evidence from a sync batch
      const { data: evidence } = await supabaseAdmin
        .from('evidence_items')
        .select('id, file_name, created_at, metadata')
        .eq('metadata->sync_batch_id', batchId)
        .eq('company_id', user.company_id);

      results = (evidence || []).map((e: any) => ({
        sync_token: e.metadata?.offline_sync_token,
        exists: true,
        evidence_id: e.id,
      }));
    }

    const response = successResponse(
      { results },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Sync status check error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

async function processOfflineItem(
  item: OfflineItem,
  user: any,
  batchId: string
): Promise<SyncResult> {
  // Check for duplicate using sync token
  const { data: existing } = await supabaseAdmin
    .from('evidence_items')
    .select('id')
    .eq('metadata->offline_sync_token', item.sync_token)
    .single();

  if (existing) {
    return {
      sync_token: item.sync_token,
      status: 'duplicate',
      evidence_id: existing.id,
    };
  }

  // Validate obligations
  if (!item.obligation_ids || item.obligation_ids.length === 0) {
    return {
      sync_token: item.sync_token,
      status: 'error',
      error: 'No obligation_ids provided',
    };
  }

  const { data: obligations, error: obligationError } = await supabaseAdmin
    .from('obligations')
    .select('id, site_id, company_id')
    .in('id', item.obligation_ids)
    .is('deleted_at', null);

  if (obligationError || !obligations || obligations.length === 0) {
    return {
      sync_token: item.sync_token,
      status: 'error',
      error: 'Invalid obligation_ids',
    };
  }

  // Verify same site
  const siteIds = [...new Set(obligations.map((o: any) => o.site_id))];
  if (siteIds.length > 1) {
    return {
      sync_token: item.sync_token,
      status: 'error',
      error: 'Obligations must be from the same site',
    };
  }

  const siteId = obligations[0].site_id;
  const companyId = obligations[0].company_id;

  // Decode and upload file
  const fileBuffer = Buffer.from(item.file_data, 'base64');
  const fileExtension = item.file_name.substring(item.file_name.lastIndexOf('.')).toLowerCase();
  const fileId = crypto.randomUUID();
  const storagePath = `mobile/${fileId}${fileExtension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('evidence')
    .upload(storagePath, fileBuffer, {
      contentType: item.mime_type,
      upsert: false,
    });

  if (uploadError) {
    return {
      sync_token: item.sync_token,
      status: 'error',
      error: `Upload failed: ${uploadError.message}`,
    };
  }

  // Generate file hash
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Handle voice note if present
  let voiceNotePath: string | null = null;
  if (item.voice_note_data) {
    const voiceBuffer = Buffer.from(item.voice_note_data, 'base64');
    voiceNotePath = `mobile/voice/${fileId}.m4a`;

    await supabaseAdmin.storage
      .from('evidence')
      .upload(voiceNotePath, voiceBuffer, {
        contentType: 'audio/mp4',
        upsert: false,
      });
  }

  // Determine file type
  let fileType = 'PDF';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(fileExtension)) {
    fileType = 'IMAGE';
  } else if (['.mp4', '.mov'].includes(fileExtension)) {
    fileType = 'VIDEO';
  } else if (['.m4a', '.mp3', '.wav'].includes(fileExtension)) {
    fileType = 'AUDIO';
  }

  // Create evidence record
  const { data: evidence, error: evidenceError } = await supabaseAdmin
    .from('evidence_items')
    .insert({
      company_id: companyId,
      site_id: siteId,
      file_name: item.file_name,
      file_type: fileType,
      file_size_bytes: fileBuffer.length,
      mime_type: item.mime_type,
      storage_path: storagePath,
      file_hash: fileHash,
      description: item.description,
      evidence_type: item.evidence_type,
      gps_latitude: item.gps_latitude,
      gps_longitude: item.gps_longitude,
      capture_timestamp: item.capture_timestamp || new Date().toISOString(),
      uploaded_by: user.id,
      metadata: {
        upload_source: 'offline_sync',
        offline_sync_token: item.sync_token,
        sync_batch_id: batchId,
        voice_note_path: voiceNotePath,
        synced_at: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (evidenceError || !evidence) {
    // Cleanup uploaded file
    await supabaseAdmin.storage.from('evidence').remove([storagePath]);
    if (voiceNotePath) {
      await supabaseAdmin.storage.from('evidence').remove([voiceNotePath]);
    }

    return {
      sync_token: item.sync_token,
      status: 'error',
      error: evidenceError?.message || 'Failed to create evidence record',
    };
  }

  // Link to obligations
  for (const obligationId of item.obligation_ids) {
    const compliancePeriod = `Q${Math.floor((new Date().getMonth() + 3) / 3)}-${new Date().getFullYear()}`;

    await supabaseAdmin
      .from('obligation_evidence_links')
      .insert({
        obligation_id: obligationId,
        evidence_id: evidence.id,
        compliance_period: compliancePeriod,
        linked_by: user.id,
      });
  }

  return {
    sync_token: item.sync_token,
    status: 'success',
    evidence_id: evidence.id,
  };
}
