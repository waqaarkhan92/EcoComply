/**
 * Documents Endpoints
 * GET /api/v1/documents - List documents (RLS filtered)
 * POST /api/v1/documents - Upload document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

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
      .from('documents')
      .select('id, site_id, document_type, title, reference_number, status, extraction_status, file_size_bytes, created_at, updated_at')
      .is('deleted_at', null); // Only non-deleted documents

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.document_type) {
      // Map API enum to database enum
      const typeMap: Record<string, string> = {
        PERMIT: 'ENVIRONMENTAL_PERMIT',
        CONSENT: 'TRADE_EFFLUENT_CONSENT',
        MCPD_REGISTRATION: 'MCPD_REGISTRATION',
      };
      const dbType = typeMap[filters.document_type] || filters.document_type;
      query = query.eq('document_type', dbType);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.extraction_status) {
      query = query.eq('extraction_status', filters.extraction_status);
    }

    // Apply sorting
    for (const sortItem of sort) {
      query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: documents, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch documents',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Get obligation counts for each document
    const documentIds = (documents || []).map((d: any) => d.id);
    const { data: obligationCounts } = await supabaseAdmin
      .from('obligations')
      .select('document_id')
      .in('document_id', documentIds);

    // Count obligations per document
    const countsMap: Record<string, number> = {};
    obligationCounts?.forEach((o: any) => {
      countsMap[o.document_id] = (countsMap[o.document_id] || 0) + 1;
    });

    // Add obligation_count to each document
    const documentsWithCounts = (documents || []).map((doc: any) => ({
      ...doc,
      obligation_count: countsMap[doc.id] || 0,
    }));

    // Check if there are more results
    const hasMore = documentsWithCounts.length > limit;
    const results = hasMore ? documentsWithCounts.slice(0, limit) : documentsWithCounts;

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
    console.error('Get documents error:', error);
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
    const siteId = formData.get('site_id') as string | null;
    const documentType = formData.get('document_type') as string | null;
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

    if (!siteId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }

    if (!documentType) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'document_type is required',
        422,
        { document_type: 'document_type is required' },
        { request_id: requestId }
      );
    }

    // Validate document type
    const validTypes = ['PERMIT', 'CONSENT', 'MCPD_REGISTRATION'];
    if (!validTypes.includes(documentType)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document_type',
        422,
        { document_type: `Must be one of: ${validTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Map API enum to database enum
    const typeMap: Record<string, string> = {
      PERMIT: 'ENVIRONMENTAL_PERMIT',
      CONSENT: 'TRADE_EFFLUENT_CONSENT',
      MCPD_REGISTRATION: 'MCPD_REGISTRATION',
    };
    const dbDocumentType = typeMap[documentType];

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension) && !allowedMimeTypes.includes(file.type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file type. Only PDF, DOC, and DOCX files are allowed',
        422,
        { file: 'File must be PDF, DOC, or DOCX' },
        { request_id: requestId }
      );
    }

    // Validate file size (50MB max)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File too large. Maximum size is 50MB',
        413,
        { file: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 50MB` },
        { request_id: requestId }
      );
    }

    // Verify user has access to site (RLS will enforce, but we check here too)
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get Module 1 ID (for Environmental Permits)
    const { data: module1 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module1) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'System configuration error: Module 1 not found',
        500,
        null,
        { request_id: requestId }
      );
    }

    // Parse metadata if provided
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        // Invalid JSON, use empty object
      }
    }

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const fileExtension2 = file.name.substring(file.name.lastIndexOf('.'));
    const storagePath = `${fileId}${fileExtension2}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
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
      .from('documents')
      .getPublicUrl(storagePath);

    // Create document record
    const documentData: any = {
      site_id: siteId,
      document_type: dbDocumentType,
      module_id: module1.id,
      title: file.name.replace(fileExtension2, '') || 'Untitled Document',
      reference_number: metadata.reference_number || null,
      regulator: metadata.regulator || null,
      water_company: metadata.water_company || null,
      issue_date: metadata.issue_date || null,
      effective_date: metadata.effective_date || null,
      expiry_date: metadata.expiry_date || null,
      original_filename: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      is_native_pdf: fileExtension2 === '.pdf',
      status: 'ACTIVE',
      extraction_status: 'PENDING',
      import_source: 'PDF_EXTRACTION',
      metadata: metadata,
      uploaded_by: user.id,
    };

    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert(documentData)
      .select('id, site_id, document_type, title, status, extraction_status, file_size_bytes, created_at')
      .single();

    if (docError || !document) {
      // Rollback: Delete uploaded file
      await supabaseAdmin.storage.from('documents').remove([storagePath]);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create document record',
        500,
        { error: docError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Enqueue background job for document processing
    try {
      const documentQueue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
      
      // Create background_jobs record
      const { data: jobRecord, error: jobError } = await supabaseAdmin
        .from('background_jobs')
        .insert({
          job_type: 'DOCUMENT_EXTRACTION',
          status: 'PENDING',
          priority: 'NORMAL',
          entity_type: 'documents',
          entity_id: document.id,
          company_id: site.company_id,
          payload: JSON.stringify({
            document_id: document.id,
            company_id: site.company_id,
            site_id: siteId,
            module_id: module1.id,
            file_path: storagePath,
            document_type: dbDocumentType,
            regulator: metadata.regulator || null,
            permit_reference: metadata.reference_number || null,
          }),
        })
        .select('id')
        .single();

      if (!jobError && jobRecord) {
        // Enqueue job in BullMQ
        await documentQueue.add(
          'DOCUMENT_EXTRACTION',
          {
            document_id: document.id,
            company_id: site.company_id,
            site_id: siteId,
            module_id: module1.id,
            file_path: storagePath,
            document_type: dbDocumentType,
            regulator: metadata.regulator || null,
            permit_reference: metadata.reference_number || null,
          },
          {
            jobId: jobRecord.id, // Use database job ID as BullMQ job ID
            priority: 5, // Normal priority
          }
        );

        // Update document status to PROCESSING
        await supabaseAdmin
          .from('documents')
          .update({ extraction_status: 'PROCESSING' })
          .eq('id', document.id);
      } else {
        console.error('Failed to create background job record:', jobError);
        // Continue anyway - job can be retried manually
      }
    } catch (error: any) {
      console.error('Failed to enqueue document processing job:', error);
      // Continue anyway - job can be retried manually
    }

    // Return response with file URL
    return successResponse(
      {
        ...document,
        file_url: urlData?.publicUrl || '',
        page_count: null, // Will be set during processing
        extraction_status: 'PROCESSING', // Updated status
      },
      201,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Upload document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

