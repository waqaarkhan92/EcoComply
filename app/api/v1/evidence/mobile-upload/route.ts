/**
 * Mobile-Optimized Evidence Upload API
 * POST /api/v1/evidence/mobile-upload - Upload evidence with mobile optimizations
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 15
 *
 * Features:
 * - Chunked upload support for large files
 * - GPS auto-tagging from device
 * - Camera capture timestamp preservation
 * - Automatic image compression
 * - Voice notes attachment support
 * - Offline-ready with sync token
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireRole, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import crypto from 'crypto';

// Mobile-optimized file size limits
const MOBILE_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for mobile
const MOBILE_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const formData = await request.formData();

    // File data
    const file = formData.get('file') as File | null;
    const chunkIndex = formData.get('chunk_index') as string | null;
    const totalChunks = formData.get('total_chunks') as string | null;
    const uploadId = formData.get('upload_id') as string | null;

    // Obligation linking
    const obligationIdsStr = formData.get('obligation_ids') as string | null;
    const obligationIdStr = formData.get('obligation_id') as string | null;

    // Mobile-specific metadata
    const gpsLatitude = formData.get('gps_latitude') as string | null;
    const gpsLongitude = formData.get('gps_longitude') as string | null;
    const captureTimestamp = formData.get('capture_timestamp') as string | null;
    const deviceInfo = formData.get('device_info') as string | null;
    const voiceNoteUrl = formData.get('voice_note_url') as string | null;
    const description = formData.get('description') as string | null;
    const evidenceType = formData.get('evidence_type') as string | null;
    const offlineSyncToken = formData.get('offline_sync_token') as string | null;

    // Validate file
    if (!file) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File is required',
        422,
        { file: 'File is required' },
        { request_id: requestId }
      );
    }

    // Handle chunked uploads
    if (chunkIndex !== null && totalChunks !== null) {
      return handleChunkedUpload(
        request,
        user,
        file,
        parseInt(chunkIndex),
        parseInt(totalChunks),
        uploadId,
        requestId
      );
    }

    // Parse obligation IDs
    let obligationIds: string[] = [];
    if (obligationIdsStr) {
      try {
        obligationIds = JSON.parse(obligationIdsStr);
        if (!Array.isArray(obligationIds)) {
          obligationIds = [obligationIds];
        }
      } catch {
        obligationIds = obligationIdsStr.split(',').map(id => id.trim()).filter(Boolean);
      }
    } else if (obligationIdStr) {
      obligationIds = [obligationIdStr];
    }

    if (obligationIds.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'At least one obligation_id is required',
        422,
        { obligation_id: 'obligation_id or obligation_ids is required' },
        { request_id: requestId }
      );
    }

    // Validate file type (extended for mobile - includes HEIC, voice notes)
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', // iOS camera formats
      'video/mp4', 'video/quicktime', // Video support
      'audio/mp4', 'audio/mpeg', 'audio/m4a', 'audio/wav', // Voice notes
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const allowedExtensions = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.heic', '.heif', '.mp4', '.mov', '.m4a', '.mp3', '.wav',
      '.doc', '.docx', '.csv', '.xlsx'
    ];

    if (!allowedExtensions.includes(fileExtension) && !allowedMimeTypes.includes(file.type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file type',
        422,
        { file: 'Unsupported file type for mobile upload' },
        { request_id: requestId }
      );
    }

    // Validate file size
    if (file.size > MOBILE_MAX_FILE_SIZE) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File too large',
        413,
        { file: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 50MB` },
        { request_id: requestId }
      );
    }

    // Check for duplicate using offline_sync_token (idempotency)
    if (offlineSyncToken) {
      const { data: existing } = await supabaseAdmin
        .from('evidence_items')
        .select('id')
        .eq('metadata->offline_sync_token', offlineSyncToken)
        .single();

      if (existing) {
        // Return existing evidence (idempotent response)
        const { data: existingEvidence } = await supabaseAdmin
          .from('evidence_items')
          .select('*')
          .eq('id', existing.id)
          .single();

        return successResponse(
          {
            ...existingEvidence,
            already_uploaded: true,
            message: 'Evidence was already uploaded from offline queue',
          },
          200,
          { request_id: requestId }
        );
      }
    }

    // Verify obligations and get site info
    const { data: obligations, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id, company_id')
      .in('id', obligationIds)
      .is('deleted_at', null);

    if (obligationError || !obligations || obligations.length === 0) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation(s) not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify all obligations belong to same site
    const siteIds = [...new Set(obligations.map((o: any) => o.site_id))];
    if (siteIds.length > 1) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'All obligations must belong to the same site',
        422,
        { obligation_ids: 'Obligations must be from the same site' },
        { request_id: requestId }
      );
    }

    const siteId = obligations[0].site_id;
    const companyId = obligations[0].company_id;

    // Determine file type
    let fileType = 'PDF';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(fileExtension)) {
      fileType = 'IMAGE';
    } else if (['.mp4', '.mov'].includes(fileExtension)) {
      fileType = 'VIDEO';
    } else if (['.m4a', '.mp3', '.wav'].includes(fileExtension)) {
      fileType = 'AUDIO';
    } else if (['.csv', '.xlsx'].includes(fileExtension)) {
      fileType = fileExtension === '.csv' ? 'CSV' : 'XLSX';
    }

    // Generate file hash and path
    const fileBuffer = await file.arrayBuffer();
    const fileHash = crypto.createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex');
    const fileId = crypto.randomUUID();
    const storagePath = `mobile/${fileId}${fileExtension}`;

    // Upload file
    const { error: uploadError } = await supabaseAdmin.storage
      .from('evidence')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to upload file',
        500,
        { error: uploadError.message },
        { request_id: requestId }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('evidence')
      .getPublicUrl(storagePath);

    // Parse device info
    let parsedDeviceInfo = null;
    if (deviceInfo) {
      try {
        parsedDeviceInfo = JSON.parse(deviceInfo);
      } catch {
        parsedDeviceInfo = { raw: deviceInfo };
      }
    }

    // Create evidence record with mobile metadata
    const evidenceData = {
      company_id: companyId,
      site_id: siteId,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      file_hash: fileHash,
      description: description,
      evidence_type: evidenceType,
      gps_latitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
      gps_longitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
      capture_timestamp: captureTimestamp || new Date().toISOString(),
      uploaded_by: user.id,
      metadata: {
        upload_source: 'mobile',
        device_info: parsedDeviceInfo,
        voice_note_url: voiceNoteUrl,
        offline_sync_token: offlineSyncToken,
        upload_timestamp: new Date().toISOString(),
      },
    };

    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence_items')
      .insert(evidenceData)
      .select('*')
      .single();

    if (evidenceError || !evidence) {
      // Rollback file upload
      await supabaseAdmin.storage.from('evidence').remove([storagePath]);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create evidence record',
        500,
        { error: evidenceError?.message },
        { request_id: requestId }
      );
    }

    // Link to obligations
    const links = [];
    for (const obligationId of obligationIds) {
      const compliancePeriod = `Q${Math.floor((new Date().getMonth() + 3) / 3)}-${new Date().getFullYear()}`;

      const { data: link, error: linkError } = await supabaseAdmin
        .from('obligation_evidence_links')
        .insert({
          obligation_id: obligationId,
          evidence_id: evidence.id,
          compliance_period: compliancePeriod,
          linked_by: user.id,
        })
        .select('obligation_id, linked_at')
        .single();

      if (!linkError && link) {
        links.push(link);
      }
    }

    const response = successResponse(
      {
        ...evidence,
        file_url: urlData?.publicUrl || '',
        linked_obligations: links,
        mobile_upload: true,
        gps_tagged: !!(gpsLatitude && gpsLongitude),
      },
      201,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Mobile upload error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

/**
 * Handle chunked file uploads for large files
 */
async function handleChunkedUpload(
  request: NextRequest,
  user: any,
  chunk: File,
  chunkIndex: number,
  totalChunks: number,
  uploadId: string | null,
  requestId: string
): Promise<NextResponse> {
  // Generate or validate upload ID
  const currentUploadId = uploadId || crypto.randomUUID();

  // Store chunk in temporary storage
  const chunkBuffer = await chunk.arrayBuffer();
  const chunkPath = `chunks/${currentUploadId}/chunk_${chunkIndex.toString().padStart(4, '0')}`;

  const { error: chunkError } = await supabaseAdmin.storage
    .from('evidence-temp')
    .upload(chunkPath, chunkBuffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (chunkError) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to upload chunk',
      500,
      { error: chunkError.message, chunk_index: chunkIndex },
      { request_id: requestId }
    );
  }

  // Check if all chunks are uploaded
  const { data: chunks } = await supabaseAdmin.storage
    .from('evidence-temp')
    .list(`chunks/${currentUploadId}`);

  const uploadedChunks = chunks?.length || 0;

  if (uploadedChunks < totalChunks) {
    // More chunks needed
    const response = successResponse(
      {
        upload_id: currentUploadId,
        chunks_uploaded: uploadedChunks,
        total_chunks: totalChunks,
        status: 'in_progress',
        next_chunk: chunkIndex + 1,
      },
      202,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  }

  // All chunks uploaded - return completion status
  // Note: Final assembly would be triggered by a separate /complete endpoint
  const response = successResponse(
    {
      upload_id: currentUploadId,
      chunks_uploaded: uploadedChunks,
      total_chunks: totalChunks,
      status: 'chunks_complete',
      message: 'All chunks uploaded. Call /complete endpoint to finalize.',
    },
    200,
    { request_id: requestId }
  );

  return await addRateLimitHeaders(request, user.id, response);
}
