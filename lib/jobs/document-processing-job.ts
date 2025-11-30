/**
 * Document Processing Job
 * Processes uploaded documents: OCR → Text Extraction → LLM Extraction → Obligation Creation
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 3.1
 */

import { Job } from 'bullmq';
import { getDocumentProcessor } from '@/lib/ai/document-processor';
import { getObligationCreator } from '@/lib/ai/obligation-creator';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { checkForPatternDiscovery } from '@/lib/ai/pattern-discovery';
import { calculateCost } from '@/lib/ai/cost-calculator';

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
    const extractionLogId = await logExtraction(document_id, extractionResult, processingResult);

    // Step 6.5: Check for pattern discovery (if LLM was used and obligations were created successfully)
    if (extractionResult.usedLLM && creationResult.obligationsCreated > 0 && extractionLogId) {
      // Get created obligation IDs for pattern discovery
      const { data: obligations } = await supabaseAdmin
        .from('obligations')
        .select('id')
        .eq('document_id', document_id)
        .is('status', null)
        .limit(10);

      if (obligations && obligations.length >= 3) {
        // Check for pattern discovery asynchronously (non-blocking)
        checkForPatternDiscovery(
          extractionLogId,
          obligations.map((o) => o.id)
        ).catch((err) => console.error('Error checking for pattern discovery:', err));
      }
    }

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
 * Returns the extraction log ID for pattern discovery
 * Reference: docs/specs/81_AI_Cost_Optimization.md Section 6.1
 */
async function logExtraction(
  documentId: string,
  extractionResult: any,
  processingResult: any
): Promise<string | null> {
  // Calculate costs if LLM was used
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCost = 0;
  const modelIdentifier = extractionResult.usedLLM 
    ? (extractionResult.usage?.model || 'gpt-4o')
    : 'rule_library';
  
  if (extractionResult.usedLLM && extractionResult.usage) {
    inputTokens = extractionResult.usage.prompt_tokens || 0;
    outputTokens = extractionResult.usage.completion_tokens || 0;
    const costCalc = calculateCost(
      inputTokens,
      outputTokens,
      modelIdentifier as 'gpt-4o' | 'gpt-4o-mini'
    );
    estimatedCost = costCalc.totalCost;
  }

  const ruleLibraryHits = extractionResult.ruleLibraryMatches?.length || 0;
  const apiCallsMade = extractionResult.usedLLM ? 1 : 0;

  const { data: insertedLog, error: insertError } = await supabaseAdmin.from('extraction_logs').insert({
    document_id: documentId,
    extraction_timestamp: new Date().toISOString(),
    model_identifier: modelIdentifier,
    rule_library_version: '1.0.0',
    segments_processed: 1, // TODO: Track actual segments if document was segmented
    obligations_extracted: extractionResult.obligations.length,
    flagged_for_review: extractionResult.obligations.filter((o: any) => o.confidence_score < 0.7).length,
    processing_time_ms: processingResult.processingTimeMs + extractionResult.extractionTimeMs,
    ocr_required: processingResult.needsOCR,
    ocr_confidence: processingResult.needsOCR ? 0.85 : null, // TODO: Get actual OCR confidence
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
    rule_library_hits: ruleLibraryHits,
    api_calls_made: apiCallsMade,
    errors: extractionResult.errors || [],
    warnings: [],
    metadata: {
      pattern_id: extractionResult.ruleLibraryMatches?.[0]?.pattern_id || null,
      extraction_confidence: extractionResult.metadata?.extraction_confidence || 0.7,
      rule_library_hit_rate: ruleLibraryHits > 0 ? ruleLibraryHits / 1 : 0, // segments_processed when tracked
    },
  }).select('id').single();

  if (insertError || !insertedLog) {
    console.error('Error logging extraction:', insertError);
    return null;
  }

  return insertedLog.id;
}

