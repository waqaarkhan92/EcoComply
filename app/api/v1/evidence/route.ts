/**
 * Evidence Endpoints
 * GET /api/v1/evidence - List evidence (RLS filtered)
 * POST /api/v1/evidence - Upload evidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - RLS will automatically filter by user's site access
    let query = supabaseAdmin
      .from('evidence_items')
      .select('id, site_id, company_id, file_name, file_type, evidence_type, file_size_bytes, created_at, updated_at')
      .eq('is_archived', false); // Only non-archived evidence

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.evidence_type) {
      query = query.eq('evidence_type', filters.evidence_type);
    }
    if (filters.obligation_id) {
      // Filter by obligation via links
      const { data: links } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select('evidence_id')
        .eq('obligation_id', filters.obligation_id)
        .is('unlinked_at', null);

      if (links && links.length > 0) {
        const evidenceIds = links.map((link: any) => link.evidence_id);
        query = query.in('id', evidenceIds);
      } else {
        // No evidence linked, return empty result
        return paginatedResponse([], undefined, limit, false, { request_id: requestId });
      }
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: evidenceItems, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch evidence',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = evidenceItems && evidenceItems.length > limit;
    const results = hasMore ? evidenceItems.slice(0, limit) : evidenceItems || [];

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    return paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Get evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const obligationIdStr = formData.get('obligation_id') as string | null;
    const obligationIdsStr = formData.get('obligation_ids') as string | null;
    const metadataStr = formData.get('metadata') as string | null;

    // Validate required fields
    if (!file) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File is required',
        422,
        { file: 'File is required' },
        { request_id: requestId }
      );
    }

    // Support both single obligation_id and array obligation_ids
    let obligationIds: string[] = [];
    if (obligationIdsStr) {
      // Parse JSON array
      try {
        obligationIds = JSON.parse(obligationIdsStr);
        if (!Array.isArray(obligationIds)) {
          obligationIds = [obligationIds];
        }
      } catch {
        // If not JSON, treat as comma-separated
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

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.csv', '.xlsx', '.zip'];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension) && !allowedMimeTypes.includes(file.type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file type. Only PDF, images, documents, CSV, Excel, and ZIP files are allowed',
        422,
        { file: 'File must be PDF, image, document, CSV, Excel, or ZIP' },
        { request_id: requestId }
      );
    }

    // Validate file size (20MB max for evidence)
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeBytes) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File too large. Maximum size is 20MB',
        413,
        { file: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 20MB` },
        { request_id: requestId }
      );
    }

    // Verify obligations exist and user has access (get first obligation to get site_id)
    const { data: firstObligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id, company_id')
      .eq('id', obligationIds[0])
      .is('deleted_at', null)
      .single();

    if (obligationError || !firstObligation) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Obligation not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify all obligations exist and belong to same site
    const { data: allObligations, error: allObligationsError } = await supabaseAdmin
      .from('obligations')
      .select('id, site_id, company_id')
      .in('id', obligationIds)
      .is('deleted_at', null);

    if (allObligationsError || !allObligations || allObligations.length !== obligationIds.length) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'One or more obligations not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify all obligations belong to same site
    const siteIds = [...new Set(allObligations.map((o: any) => o.site_id))];
    if (siteIds.length > 1) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'All obligations must belong to the same site',
        422,
        { obligation_ids: 'Obligations must be from the same site' },
        { request_id: requestId }
      );
    }

    const siteId = firstObligation.site_id;
    const companyId = firstObligation.company_id;

    // Parse metadata if provided
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        // Invalid JSON, use empty object
      }
    }

    // Determine file type
    let fileType: string = 'PDF';
    if (fileExtension === '.pdf') {
      fileType = 'PDF';
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
      fileType = 'IMAGE';
    } else if (['.csv', '.xlsx'].includes(fileExtension)) {
      fileType = fileExtension === '.csv' ? 'CSV' : 'XLSX';
    } else if (fileExtension === '.zip') {
      fileType = 'ZIP';
    }

    // Generate file hash
    const fileBuffer = await file.arrayBuffer();
    const fileHash = crypto.createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex');

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const storagePath = `${fileId}${fileExtension}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('evidence')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to upload file',
        500,
        { error: uploadError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Get public URL for the file
    const { data: urlData } = supabaseAdmin.storage
      .from('evidence')
      .getPublicUrl(storagePath);

    // Create evidence record
    const evidenceData: any = {
      company_id: companyId,
      site_id: siteId,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      file_hash: fileHash,
      description: metadata.description || null,
      evidence_type: metadata.evidence_type || null,
      compliance_period: metadata.compliance_period || null,
      gps_latitude: metadata.gps_latitude || null,
      gps_longitude: metadata.gps_longitude || null,
      capture_timestamp: metadata.capture_timestamp || new Date().toISOString(),
      uploaded_by: user.id,
      metadata: metadata,
    };

    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence_items')
      .insert(evidenceData)
      .select('id, site_id, file_name, file_type, file_size_bytes, created_at')
      .single();

    if (evidenceError || !evidence) {
      // Rollback: Delete uploaded file
      await supabaseAdmin.storage.from('evidence').remove([storagePath]);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create evidence record',
        500,
        { error: evidenceError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Create obligation_evidence_links for each obligation
    const links = [];
    for (const obligationId of obligationIds) {
      // Get compliance period from obligation (if available) or use current period
      const obligation = allObligations.find((o: any) => o.id === obligationId);
      const compliancePeriod = metadata.compliance_period || `Q${Math.floor((new Date().getMonth() + 3) / 3)}-${new Date().getFullYear()}`;

      const { data: link, error: linkError } = await supabaseAdmin
        .from('obligation_evidence_links')
        .insert({
          obligation_id: obligationId,
          evidence_id: evidence.id,
          compliance_period: compliancePeriod,
          notes: metadata.notes || null,
          linked_by: user.id,
        })
        .select('obligation_id, linked_at')
        .single();

      if (linkError || !link) {
        // Log error but continue (partial success)
        console.error(`Failed to link evidence to obligation ${obligationId}:`, linkError);
      } else {
        links.push(link);
      }
    }

    // Return response with linked obligations
    return successResponse(
      {
        ...evidence,
        file_url: urlData?.publicUrl || '',
        linked_obligations: links.map((link: any) => ({
          obligation_id: link.obligation_id,
          linked_at: link.linked_at,
        })),
      },
      201,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Upload evidence error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

