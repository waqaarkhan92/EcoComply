/**
 * Document Extraction Status Endpoint
 * GET /api/v1/documents/{documentId}/extraction-status - Get extraction status
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

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

    // Get document extraction status - Check user access first
    // Verify document exists and user has access (similar to main document endpoint)
    console.log(`[Extraction-Status] Fetching document: ${documentId}`);
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select(`
        id,
        extraction_status,
        created_at,
        updated_at,
        uploaded_by,
        site_id,
        extracted_text
      `)
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();
    
    console.log(`[Extraction-Status] Document query result:`);
    console.log(`  - Found: ${document ? 'yes' : 'no'}`);
    console.log(`  - Status: ${document?.extraction_status || 'N/A'}`);
    console.log(`  - Error: ${error ? JSON.stringify({ message: error.message, code: error.code }) : 'none'}`);

    if (error) {
      console.error('Error fetching document for extraction-status:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch document',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    if (!document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check user access - user must be the uploader or have site access
    if (document.uploaded_by !== user.id) {
      // Check if user has access to the site
      const { data: siteAccess } = await supabaseAdmin
        .from('user_site_assignments')
        .select('id')
        .eq('site_id', document.site_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!siteAccess) {
        return errorResponse(
          ErrorCodes.FORBIDDEN,
          'Access denied',
          403,
          null,
          { request_id: requestId }
        );
      }
    }

    // Map internal status to API status
    let apiStatus: string = document.extraction_status || 'PENDING';
    
    console.log(`[Extraction-Status] Document status: ${document.extraction_status}, mapping to API status`);
    
    // Normalize status values
    if (apiStatus === 'PROCESSING' || apiStatus === 'EXTRACTING') {
      apiStatus = 'IN_PROGRESS';
    } else if (apiStatus === 'COMPLETED' || apiStatus === 'EXTRACTED') {
      apiStatus = 'COMPLETED'; // COMPLETED is the correct DB value
    } else if (apiStatus === 'PROCESSING_FAILED' || apiStatus === 'EXTRACTION_FAILED' || apiStatus === 'FAILED') {
      apiStatus = 'FAILED';
    }
    
    console.log(`[Extraction-Status] Mapped API status: ${apiStatus}`);

    // Count obligations for this document - use a direct query instead of count
    // Retry logic in case obligations were just created and aren't visible yet
    console.log(`[Extraction-Status] Counting obligations for document: ${documentId}`);
    let obligationData: any[] | null = null;
    let countError: any = null;
    let obligationCount = 0;
    
    // Retry up to 3 times with exponential backoff if document is COMPLETED but no obligations found
    const maxRetries = (document.extraction_status === 'COMPLETED' || document.extraction_status === 'EXTRACTED') ? 3 : 1;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await supabaseAdmin
        .from('obligations')
        .select('id')
        .eq('document_id', documentId)
        .is('deleted_at', null);
      
      obligationData = result.data;
      countError = result.error;
      obligationCount = obligationData?.length || 0;
      
      if (countError) {
        console.log(`[Extraction-Status] Attempt ${attempt}/${maxRetries} failed: ${countError.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          continue;
        }
      } else if (obligationCount > 0 || attempt === maxRetries) {
        // Found obligations or this is the last attempt
        break;
      } else if (document.extraction_status === 'COMPLETED' && obligationCount === 0 && attempt < maxRetries) {
        // Document is COMPLETED but no obligations found - retry
        console.log(`[Extraction-Status] Attempt ${attempt}/${maxRetries}: Document COMPLETED but 0 obligations found, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      } else {
        break;
      }
    }
    
    console.log(`[Extraction-Status] Obligation count result:`);
    console.log(`  - Count: ${obligationCount}`);
    console.log(`  - Data length: ${obligationData?.length || 0}`);
    console.log(`  - Error: ${countError ? JSON.stringify({ message: countError.message, code: countError.code, details: countError.details }) : 'none'}`);
    console.log(`  - Sample IDs: ${obligationData?.slice(0, 3).map(o => o.id).join(', ') || 'none'}`);
    if (obligationData && obligationData.length > 0) {
      console.log(`  - First obligation: ${JSON.stringify(obligationData[0])}`);
    }

    // Calculate progress - always return a number, never null
    let progress: number = 0;
    
    // Check the actual document status, not just the mapped API status
    const docStatus = document.extraction_status || 'PENDING';
    
    if (docStatus === 'COMPLETED' || docStatus === 'EXTRACTED') {
      progress = 100;
    } else if (docStatus === 'PENDING') {
      progress = 0;
    } else if (docStatus === 'PROCESSING') {
      // Use created_at as start time (extraction_started_at column doesn't exist)
      const startTime = document.created_at 
        ? new Date(document.created_at).getTime()
        : Date.now();
      
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      
      // Check if document has extracted_text - indicates we're past OCR stage
      const hasExtractedText = document.extracted_text && document.extracted_text.length > 100;
      
      // Progress stages:
      // 0-10%: Initial setup (0-5 seconds)
      // 10-40%: File download + OCR/text extraction (5-30 seconds)
      // 40-90%: Obligation extraction (30-120 seconds)
      // 90-100%: Obligation creation + completion
      
      if (elapsedSeconds < 5) {
        // Initial setup phase
        progress = Math.max(10, Math.floor((elapsedSeconds / 5) * 10));
      } else if (!hasExtractedText) {
        // File download + OCR/text extraction phase (10-40%)
        const phaseSeconds = elapsedSeconds - 5;
        const phaseProgress = Math.floor((phaseSeconds / 25) * 30); // 30% over 25 seconds
        progress = Math.max(10, Math.min(40, 10 + phaseProgress));
      } else {
        // Obligation extraction phase (40-90%)
        // If we have extracted text, we're in the extraction phase
        const extractionStartSeconds = 30; // Assume extraction starts around 30 seconds
        const extractionElapsed = Math.max(0, elapsedSeconds - extractionStartSeconds);
        const extractionProgress = Math.floor((extractionElapsed / 90) * 50); // 50% over 90 seconds
        progress = Math.max(40, Math.min(90, 40 + extractionProgress));
        
        // Boost progress if we have obligations
        if (obligationCount > 0) {
          // Each obligation adds ~1-2% progress
          const obligationBoost = Math.min(20, obligationCount * 1.5);
          progress = Math.max(progress, Math.min(90, 40 + obligationBoost));
        }
      }
      
      // If we have many obligations (extraction likely complete), show higher progress
      if (obligationCount >= 10) {
        progress = Math.max(progress, 85); // At least 85% if we have obligations
      }
      if (obligationCount >= 20) {
        progress = Math.max(progress, 95); // At least 95% if we have many obligations
      }
    } else if (docStatus === 'PROCESSING_FAILED' || docStatus === 'FAILED' || docStatus === 'EXTRACTION_FAILED') {
      progress = 0;
    }
    
    // Check if job is actually running and if it's stuck
    const { data: activeJob } = await supabaseAdmin
      .from('background_jobs')
      .select('id, status, started_at, updated_at')
      .eq('job_type', 'DOCUMENT_EXTRACTION')
      .eq('payload->>document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const jobRunning = activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'PENDING');
    const jobStuck = activeJob && activeJob.status === 'RUNNING' && activeJob.updated_at && 
      (Date.now() - new Date(activeJob.updated_at).getTime()) > 300000; // 5 minutes without update
    
    // Calculate elapsed seconds (reuse from above if available)
    const elapsedSecondsCalc = document.created_at ? Math.floor((Date.now() - new Date(document.created_at).getTime()) / 1000) : 0;
    const isStuck = docStatus === 'PROCESSING' && elapsedSecondsCalc > 300; // 5 minutes
    
    if (isStuck || jobStuck) {
      console.warn(`[Extraction-Status] WARNING: Document ${documentId} appears to be stuck in ${docStatus} status for ${Math.floor(elapsedSecondsCalc / 60)} minutes`);
      console.warn(`[Extraction-Status] Job running: ${jobRunning}, Job status: ${activeJob?.status}, Job stuck: ${jobStuck}`);
      console.warn(`[Extraction-Status] This might indicate the worker is not running or the job failed`);
      // Cap progress if stuck and job isn't running
      if (progress > 15 && !jobRunning) {
        progress = 15; // Don't show progress above 15% if job isn't running
      }
    }
    
    console.log(`[Extraction-Status] Progress calculation:`, {
      apiStatus,
      documentStatus: document.extraction_status,
      obligationCount,
      progress,
      elapsedSeconds: elapsedSecondsCalc,
      isStuck,
      hasExtractedText: document.extracted_text ? document.extracted_text.length : 0,
      jobRunning,
      jobStatus: activeJob?.status,
      jobStuck,
    });

    const response = successResponse(
      {
        document_id: documentId,
        status: apiStatus,
        progress: progress,
        obligation_count: obligationCount || 0,
        started_at: document.created_at || null,
        completed_at: apiStatus === 'COMPLETED' ? (document.updated_at || null) : null,
        error: null,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get extraction status error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

