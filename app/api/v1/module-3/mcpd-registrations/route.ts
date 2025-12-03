/**
 * Module 3: MCPD Registrations Endpoints
 * GET /api/v1/module-3/mcpd-registrations - List MCPD registrations (documents with MCPD_REGISTRATION type)
 * POST /api/v1/module-3/mcpd-registrations - Upload MCPD registration document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 3 ID
    const { data: module3 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_3')
      .single();

    if (!module3) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 3 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    const { limit, cursor } = parsePaginationParams(request);
    const filters = parseFilterParams(request);
    const sort = parseSortParams(request);

    // Build query - registrations are documents with document_type = 'MCPD_REGISTRATION'
    let query = supabaseAdmin
      .from('documents')
      .select(`
        id,
        site_id,
        document_type,
        title,
        reference_number,
        regulator,
        status,
        extraction_status,
        created_at,
        updated_at
      `)
      .eq('document_type', 'MCPD_REGISTRATION')
      .eq('module_id', module3.id)
      .is('deleted_at', null);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply sorting
    if (sort.length === 0) {
      query = query.order('created_at', { ascending: false });
    } else {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data: registrations, error } = await query;

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch MCPD registrations',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // For each registration, get associated generators
    const registrationsWithGenerators = await Promise.all(
      (registrations || []).map(async (reg: any) => {
        const { data: generators } = await supabaseAdmin
          .from('generators')
          .select('id, generator_identifier, generator_type')
          .eq('document_id', reg.id)
          .eq('is_active', true)
          .is('deleted_at', null);

        return {
          ...reg,
          generators: generators || [],
        };
      })
    );

    // Check if there are more results
    const hasMore = (registrationsWithGenerators || []).length > limit;
    const data = hasMore ? (registrationsWithGenerators || []).slice(0, limit) : (registrationsWithGenerators || []);
    const nextCursor = hasMore && data.length > 0 ? createCursor(data[data.length - 1].id, data[data.length - 1].created_at) : undefined;

    const response = paginatedResponse(data, nextCursor, limit, hasMore, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/mcpd-registrations:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Get Module 3 ID
    const { data: module3 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_3')
      .single();

    if (!module3) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module 3 not found in system',
        500,
        {},
        { request_id: requestId }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const siteId = formData.get('site_id') as string;
    const metadataStr = formData.get('metadata') as string | null;

    if (!file || !siteId) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Missing required fields: file, site_id',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid file type. Only PDF files are accepted.',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'File size exceeds 50MB limit',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify site exists and user has access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (site.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this site',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Parse metadata if provided
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        // Ignore invalid JSON
      }
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `module-3/registrations/${siteId}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to upload file',
        500,
        { error: uploadError?.message },
        { request_id: requestId }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(filePath);

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        site_id: siteId,
        company_id: user.company_id,
        module_id: module3.id,
        document_type: 'MCPD_REGISTRATION',
        title: metadata.title || file.name,
        reference_number: metadata.reference_number || null,
        regulator: 'EA',
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
        status: 'UPLOADED',
        extraction_status: 'PENDING',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError || !document) {
      // Clean up uploaded file if document creation fails
      await supabaseAdmin.storage.from('documents').remove([filePath]);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create document record',
        500,
        { error: docError?.message },
        { request_id: requestId }
      );
    }

    // Queue document processing job
    try {
      const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
      await queue.add('process-document', {
        document_id: document.id,
        user_id: user.id,
        site_id: siteId,
        priority: 'NORMAL',
      });
    } catch (queueError) {
      console.error('Failed to queue document processing:', queueError);
      // Don't fail the request, document is created and can be processed later
    }

    const response = successResponse(
      {
        id: document.id,
        site_id: siteId,
        status: 'UPLOADED',
        extraction_status: 'PENDING',
        created_at: document.created_at,
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-3/mcpd-registrations:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

