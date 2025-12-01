/**
 * Document Extraction Endpoints
 * POST /api/v1/documents/{documentId}/extract - Trigger AI extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Parse request body
    let forceReprocess = false;
    try {
      const body = await request.json().catch(() => ({}));
      forceReprocess = body.force_reprocess === true;
    } catch {
      // Body is optional, continue with defaults
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Get document with regulator and reference_number - RLS will enforce access control
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, company_id, document_type, extraction_status, storage_path, module_id, regulator, reference_number, metadata')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check if extraction is already in progress
    if (!forceReprocess && document.extraction_status === 'EXTRACTING' || document.extraction_status === 'PROCESSING') {
      // Check for active background job
      const { data: activeJob } = await supabaseAdmin
        .from('background_jobs')
        .select('id, status')
        .eq('entity_id', documentId)
        .eq('job_type', 'DOCUMENT_EXTRACTION')
        .in('status', ['PENDING', 'PROCESSING'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeJob) {
        return errorResponse(
          ErrorCodes.CONFLICT,
          'Extraction already in progress',
          409,
          { job_id: activeJob.id, status: activeJob.status },
          { request_id: requestId }
        );
      }
    }

    // Get site to retrieve company_id if not in document
    let companyId = document.company_id;
    if (!companyId && document.site_id) {
      const { data: site } = await supabaseAdmin
        .from('sites')
        .select('company_id')
        .eq('id', document.site_id)
        .single();
      companyId = site?.company_id;
    }

    if (!companyId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document must be associated with a company',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Get module_id from document or default to Module 1
    let moduleId = document.module_id;
    if (!moduleId) {
      const { data: module } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('module_code', 'MODULE_1')
        .eq('is_active', true)
        .single();
      moduleId = module?.id;
    }

    if (!moduleId) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Module not found',
        500,
        null,
        { request_id: requestId }
      );
    }

    // Update document status to PROCESSING
    await supabaseAdmin
      .from('documents')
      .update({
        extraction_status: 'PROCESSING',
        extraction_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    // Create background job record
    const { data: jobRecord, error: jobError } = await supabaseAdmin
      .from('background_jobs')
      .insert({
        job_type: 'DOCUMENT_EXTRACTION',
        entity_id: documentId,
        entity_type: 'documents',
        status: 'PENDING',
        priority: 'NORMAL',
        job_data: {
          document_id: documentId,
          company_id: companyId,
          site_id: document.site_id,
          module_id: moduleId,
          file_path: document.storage_path,
          document_type: document.document_type,
          force_reprocess: forceReprocess,
        },
        created_by: user.id,
      })
      .select('id')
      .single();

    if (jobError || !jobRecord) {
      // Rollback document status
      await supabaseAdmin
        .from('documents')
        .update({
          extraction_status: 'PENDING',
          extraction_error: 'Failed to create background job',
        })
        .eq('id', documentId);

      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to queue extraction job',
        500,
        { error: jobError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Extract regulator and permit_reference from document or metadata
    // Priority: 1. Document fields, 2. Metadata, 3. Will be extracted during AI processing
    let regulator = document.regulator || null;
    let permit_reference = document.reference_number || null;
    
    // If not in document fields, try extracting from metadata
    if (!regulator && document.metadata && typeof document.metadata === 'object') {
      const metadata = document.metadata as any;
      regulator = metadata.regulator || null;
    }
    
    if (!permit_reference && document.metadata && typeof document.metadata === 'object') {
      const metadata = document.metadata as any;
      permit_reference = metadata.reference_number || metadata.permit_reference || null;
    }

    // Queue the job in BullMQ
    const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
    const job = await queue.add(
      'document-extraction',
      {
        document_id: documentId,
        company_id: companyId,
        site_id: document.site_id,
        module_id: moduleId,
        file_path: document.storage_path,
        document_type: document.document_type,
        regulator: regulator,
        permit_reference: permit_reference,
      },
      {
        jobId: jobRecord.id, // Use database job ID as BullMQ job ID
        priority: 5, // Normal priority
      }
    );

    // Estimate completion time (5 minutes for typical document)
    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + 5);

    const response = successResponse(
      {
        job_id: jobRecord.id,
        status: 'QUEUED',
        estimated_completion_time: estimatedCompletion.toISOString(),
      },
      202, // Accepted
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Extract document error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
