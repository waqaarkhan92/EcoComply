/**
 * Document Processing Job
 * Processes uploaded documents: OCR → Text Extraction → LLM Extraction → Obligation Creation
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 3.1
 */

import { Job } from 'bullmq';
import { getDocumentProcessor } from '@/lib/ai/document-processor';
import { getObligationCreator } from '@/lib/ai/obligation-creator';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export interface DocumentProcessingJobData {
  document_id: string;
  company_id: string;
  site_id: string;
  module_id: string;
  file_path: string; // Path in Supabase Storage
  document_type?: string;
  regulator?: string;
  permit_reference?: string;
}

export async function processDocumentJob(job: Job<DocumentProcessingJobData>): Promise<void> {
  const { document_id, company_id, site_id, module_id, file_path, document_type, regulator, permit_reference } = job.data;

  try {
    // Update job status in database
    await updateJobStatus(document_id, 'PROCESSING', null);

    // Step 1: Download file from Supabase Storage
    const fileBuffer = await downloadFile(file_path);

    // Step 2: Process document (OCR, text extraction)
    const documentProcessor = getDocumentProcessor();
    const processingResult = await documentProcessor.processDocument(
      fileBuffer,
      file_path.split('/').pop() || 'document.pdf',
      {
        moduleTypes: [module_id], // Will be converted to module_code
        regulator,
        documentType: document_type as any,
      }
    );

    // Step 3: Update document with extracted text
    await supabaseAdmin
      .from('documents')
      .update({
        extracted_text: processingResult.extractedText,
        ocr_text: processingResult.ocrText || null,
        page_count: processingResult.pageCount,
        file_size_bytes: processingResult.fileSizeBytes,
        extraction_status: 'EXTRACTING',
      })
      .eq('id', document_id);

    // Step 4: Extract obligations (rule library first, then LLM)
    const extractionResult = await documentProcessor.extractObligations(
      processingResult.extractedText,
      {
        moduleTypes: [module_id],
        regulator,
        documentType: document_type as any,
        pageCount: processingResult.pageCount,
        fileSizeBytes: processingResult.fileSizeBytes,
        permitReference: permit_reference,
      }
    );

    // Step 5: Create obligations in database
    const obligationCreator = getObligationCreator();
    const creationResult = await obligationCreator.createObligations(
      extractionResult,
      document_id,
      site_id,
      company_id,
      module_id
    );

    // Step 6: Log extraction to extraction_logs
    await logExtraction(document_id, extractionResult, processingResult);

    // Step 7: Update document status
    await supabaseAdmin
      .from('documents')
      .update({
        extraction_status: 'EXTRACTED',
        obligation_count: creationResult.obligationsCreated,
        extraction_completed_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    // Step 8: Update job status
    await updateJobStatus(document_id, 'COMPLETED', {
      obligations_created: creationResult.obligationsCreated,
      schedules_created: creationResult.schedulesCreated,
      deadlines_created: creationResult.deadlinesCreated,
      review_queue_items: creationResult.reviewQueueItemsCreated,
      duplicates_skipped: creationResult.duplicatesSkipped,
      errors: creationResult.errors,
    });

    console.log(`Document processing completed: ${document_id} - ${creationResult.obligationsCreated} obligations created`);
  } catch (error: any) {
    console.error(`Document processing failed: ${document_id}`, error);

    // Update document status
    await supabaseAdmin
      .from('documents')
      .update({
        extraction_status: 'PROCESSING_FAILED',
        extraction_error: error.message || 'Unknown error',
      })
      .eq('id', document_id);

    // Update job status
    await updateJobStatus(document_id, 'FAILED', {
      error: error.message,
      stack: error.stack,
    });

    throw error; // Re-throw to trigger retry
  }
}

/**
 * Download file from Supabase Storage
 */
async function downloadFile(filePath: string): Promise<Buffer> {
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage;
  const bucket = 'documents';
  const path = filePath.replace(`${bucket}/`, '');

  const { data, error } = await storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Update job status in background_jobs table
 */
async function updateJobStatus(
  documentId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  result?: any
): Promise<void> {
  const { data: jobs } = await supabaseAdmin
    .from('background_jobs')
    .select('id')
    .eq('entity_id', documentId)
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .order('created_at', { ascending: false })
    .limit(1);

  if (jobs && jobs.length > 0) {
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status,
        result: result ? JSON.stringify(result) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobs[0].id);
  }
}

/**
 * Log extraction to extraction_logs table
 */
async function logExtraction(
  documentId: string,
  extractionResult: any,
  processingResult: any
): Promise<void> {
  await supabaseAdmin.from('extraction_logs').insert({
    document_id: documentId,
    extraction_timestamp: new Date().toISOString(),
    model_identifier: extractionResult.usedLLM ? 'gpt-4o' : 'rule_library',
    rule_library_version: '1.0.0',
    segments_processed: 1, // TODO: Track actual segments if document was segmented
    obligations_extracted: extractionResult.obligations.length,
    flagged_for_review: extractionResult.obligations.filter((o: any) => o.confidence_score < 0.7).length,
    processing_time_ms: processingResult.processingTimeMs + extractionResult.extractionTimeMs,
    ocr_required: processingResult.needsOCR,
    ocr_confidence: processingResult.needsOCR ? 0.85 : null, // TODO: Get actual OCR confidence
    errors: extractionResult.errors || [],
    warnings: [],
    metadata: {
      input_tokens: extractionResult.usedLLM ? extractionResult.usage?.prompt_tokens || 0 : 0,
      output_tokens: extractionResult.usedLLM ? extractionResult.usage?.completion_tokens || 0 : 0,
      total_tokens: extractionResult.usedLLM ? extractionResult.usage?.total_tokens || 0 : 0,
      cost_per_1k_tokens: extractionResult.usedLLM ? 0.002 : 0,
      estimated_cost: extractionResult.usedLLM
        ? (extractionResult.usage?.total_tokens || 0) * 0.002 / 1000
        : 0,
      rule_library_hit: !extractionResult.usedLLM,
      pattern_id: extractionResult.ruleLibraryMatches?.[0]?.pattern_id || null,
      extraction_confidence: extractionResult.metadata?.extraction_confidence || 0.7,
    },
  });
}

