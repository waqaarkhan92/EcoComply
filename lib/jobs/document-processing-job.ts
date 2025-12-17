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
import { updateExtractionProgress, clearExtractionProgress } from '@/lib/services/extraction-progress-service';

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

  console.log(`📋 Starting extraction for document ${document_id}`);
  console.log(`📋 Job data:`, JSON.stringify({ document_id, company_id, site_id, module_id, file_path, document_type, regulator, permit_reference }, null, 2));

  // Initialize real-time progress tracking
  await updateExtractionProgress(document_id, {
    status: 'queued',
    progress: 0,
    obligationsFound: 0,
    message: 'Document queued for processing...',
    startedAt: new Date().toISOString(),
  }).catch(err => console.error('Failed to initialize progress:', err));

  try {
    // Update job status in database
    await updateJobStatus(document_id, 'PROCESSING', null);
    
    // Update document status to PROCESSING
    console.log(`📝 Updating document ${document_id} status to PROCESSING`);
    const { error: statusError } = await supabaseAdmin
      .from('documents')
      .update({
        extraction_status: 'PROCESSING',
      })
      .eq('id', document_id);
    
    if (statusError) {
      console.error(`❌ Failed to update status to PROCESSING:`, statusError);
      throw new Error(`Failed to update document status: ${statusError.message}`);
    }
    console.log(`✅ Document ${document_id} status updated to PROCESSING`);

    // Step 1: Download file from Supabase Storage
    console.log(`📥 Downloading file: ${file_path}`);
    await updateExtractionProgress(document_id, {
      status: 'downloading',
      progress: 5,
      obligationsFound: 0,
      message: 'Downloading document from storage...',
    }).catch(err => console.error('Failed to update progress:', err));

    const fileBuffer = await downloadFile(file_path);
    console.log(`✅ File downloaded: ${fileBuffer.length} bytes`);

    // Step 2: Process document (OCR, text extraction)
    console.log(`🔍 Processing document (OCR/text extraction)...`);
    await updateExtractionProgress(document_id, {
      status: 'extracting_text',
      progress: 8,
      obligationsFound: 0,
      message: 'Extracting text from document...',
    }).catch(err => console.error('Failed to update progress:', err));
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
    // Note: 'EXTRACTING' is not in the database CHECK constraint, use 'PROCESSING' instead
    console.log(`📝 Updating document ${document_id} with extracted text (${processingResult.extractedText.length} chars)`);
    const { error: extractError } = await supabaseAdmin
      .from('documents')
      .update({
        extracted_text: processingResult.extractedText,
        file_size_bytes: processingResult.fileSizeBytes,
        extraction_status: 'PROCESSING', // Keep as PROCESSING since EXTRACTING is not in DB constraint
      })
      .eq('id', document_id);
    
    if (extractError) {
      console.error(`❌ Failed to update document with extracted text:`, extractError);
      throw new Error(`Failed to update document: ${extractError.message}`);
    }
    console.log(`✅ Document ${document_id} status updated to EXTRACTING`);

    // Step 4: Extract obligations (rule library first, then LLM)
    console.log(`📋 Extracting obligations...`);
    console.log(`📄 Text length: ${processingResult.extractedText.length} chars`);
    console.log(`📄 Text preview: ${processingResult.extractedText.substring(0, 200)}...`);
    
    if (!processingResult.extractedText || processingResult.extractedText.trim().length < 50) {
      throw new Error(`Extracted text is too short (${processingResult.extractedText.length} chars). Document may be corrupted or require OCR.`);
    }
    
    let extractionResult;
    try {
      extractionResult = await documentProcessor.extractObligations(
      processingResult.extractedText,
      {
        documentId: document_id, // Pass documentId for real-time progress tracking
        moduleTypes: [module_id],
        regulator,
        documentType: document_type as any,
        pageCount: processingResult.pageCount,
        fileSizeBytes: processingResult.fileSizeBytes,
        permitReference: permit_reference,
      }
      );
      console.log(`📋 Extraction result: ${extractionResult.obligations.length} obligations, usedLLM: ${extractionResult.usedLLM}, ruleMatches: ${extractionResult.ruleLibraryMatches.length}`);
      
      if (extractionResult.obligations.length === 0) {
        console.warn(`⚠️ WARNING: Extraction returned 0 obligations for document ${document_id}`);
        console.warn(`⚠️ This might indicate an issue with the extraction process`);
        console.warn(`⚠️ Text length: ${processingResult.extractedText.length}, usedLLM: ${extractionResult.usedLLM}`);
      }
    } catch (extractionError: any) {
      console.error(`❌ Extraction failed:`, extractionError.message);
      console.error(`❌ Extraction error stack:`, extractionError.stack);
      throw extractionError;
    }

    // Step 5: Create obligations in database
    console.log(`📋 Creating obligations: ${extractionResult.obligations.length} obligations from extraction`);
    const obligationCreator = getObligationCreator();
    let creationResult;
    try {
      creationResult = await obligationCreator.createObligations(
        extractionResult,
        document_id,
        site_id,
        company_id,
        module_id
      );
      console.log(`✅ Obligation creation result: ${creationResult.obligationsCreated} created, ${creationResult.duplicatesSkipped} duplicates, ${creationResult.errors.length} errors`);
      if (creationResult.errors.length > 0) {
        console.error(`❌ Obligation creation errors:`, creationResult.errors);
      }
    } catch (creationError: any) {
      console.error(`❌ Failed to create obligations:`, creationError.message);
      console.error(`❌ Creation error stack:`, creationError.stack);

      // CRITICAL: Re-throw database errors - don't silently continue with empty result
      // This ensures the job fails properly and can be retried or investigated
      throw new Error(`Obligation creation failed: ${creationError.message}`);
    }

    // Step 6: Log extraction to extraction_logs
    const extractionLogId = await logExtraction(document_id, extractionResult, processingResult);

    // Step 6.5: Check for pattern discovery (if LLM was used and obligations were created successfully)
    if (extractionResult.usedLLM && creationResult.obligationsCreated > 0 && extractionLogId) {
      // Get created obligation IDs for pattern discovery
      // Note: status is 'PENDING' for newly created obligations, not null
      const { data: obligations } = await supabaseAdmin
        .from('obligations')
        .select('id')
        .eq('document_id', document_id)
        .is('deleted_at', null)
        .limit(10);

      if (obligations && obligations.length >= 3) {
        // Check for pattern discovery asynchronously (non-blocking)
        checkForPatternDiscovery(
          extractionLogId,
          obligations.map((o) => o.id)
        ).catch((err) => console.error('Error checking for pattern discovery:', err));
      }
    }

    // Step 7: Update document status (use 'COMPLETED' not 'EXTRACTED' - that's what the DB constraint allows)
    // Always update to COMPLETED even if no obligations were created (extraction completed successfully)
    console.log(`📝 Updating document ${document_id} status to COMPLETED (${creationResult.obligationsCreated} obligations created)`);
    
    // First verify obligations exist before updating status
    const { data: obligationCheck, error: checkError } = await supabaseAdmin
      .from('obligations')
      .select('id')
      .eq('document_id', document_id)
      .is('deleted_at', null)
      .limit(10);
    
    console.log(`🔍 Verifying obligations exist before status update: ${obligationCheck?.length || 0} found`);
    if (checkError) {
      console.error(`⚠️ Error checking obligations:`, checkError.message);
    }
    if (obligationCheck && obligationCheck.length > 0) {
      console.log(`✅ Found ${obligationCheck.length} obligations in database`);
    } else {
      console.warn(`⚠️ No obligations found in database for document ${document_id}`);
    }
    
    // Prepare update data with token usage if available
    const updateData: any = {
      extraction_status: 'COMPLETED',
    };

    if (extractionResult.tokenUsage) {
      updateData.extraction_tokens_input = extractionResult.tokenUsage.inputTokens;
      updateData.extraction_tokens_output = extractionResult.tokenUsage.outputTokens;
      updateData.extraction_tokens_total = extractionResult.tokenUsage.totalTokens;
      updateData.extraction_model = extractionResult.tokenUsage.model;
      updateData.extraction_cost_usd = extractionResult.tokenUsage.estimatedCost;
    }

    if (extractionResult.complexity) {
      updateData.extraction_complexity = extractionResult.complexity;
    }

    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updateData)
      .eq('id', document_id)
      .select('id, extraction_status')
      .single();
    
    if (updateError) {
      console.error(`❌ Failed to update document status:`, JSON.stringify(updateError, null, 2));
      console.error(`❌ Update error details:`, {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      throw new Error(`Failed to update document status: ${updateError.message}`);
    } else {
      console.log(`✅ Document ${document_id} status updated to: ${updatedDoc?.extraction_status}`);
    }
    
    console.log(`✅ Document ${document_id} extraction completed: ${creationResult.obligationsCreated} obligations created`);
    
    // Verify obligations are queryable after status update (wait a bit for DB consistency)
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: finalCheck, error: finalCheckError } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title')
      .eq('document_id', document_id)
      .is('deleted_at', null)
      .limit(10);
    
    if (finalCheckError) {
      console.error(`⚠️ Error in final obligation check:`, finalCheckError.message);
    } else {
      console.log(`🔍 Final obligation check: ${finalCheck?.length || 0} obligations queryable`);
      if (finalCheck && finalCheck.length > 0) {
        console.log(`📋 Sample obligations:`, finalCheck.slice(0, 3).map(o => ({ id: o.id, title: o.obligation_title })));
      }
    }

    // Step 8: Update job status
    await updateJobStatus(document_id, 'COMPLETED', {
      obligations_created: creationResult.obligationsCreated,
      schedules_created: creationResult.schedulesCreated,
      deadlines_created: creationResult.deadlinesCreated,
      review_queue_items: creationResult.reviewQueueItemsCreated,
      duplicates_skipped: creationResult.duplicatesSkipped,
      errors: creationResult.errors,
    });

    // Publish completed progress for real-time subscribers
    await updateExtractionProgress(document_id, {
      status: 'completed',
      progress: 100,
      obligationsFound: creationResult.obligationsCreated,
      message: `Completed! Extracted ${creationResult.obligationsCreated} obligations`,
      completedAt: new Date().toISOString(),
    }).catch(err => console.error('Failed to update progress:', err));

    console.log(`Document processing completed: ${document_id} - ${creationResult.obligationsCreated} obligations created`);
  } catch (error: any) {
    console.error(`Document processing failed: ${document_id}`, error);

    // Publish failed progress for real-time subscribers
    await updateExtractionProgress(document_id, {
      status: 'failed',
      progress: 0,
      obligationsFound: 0,
      error: error.message,
      message: `Failed: ${error.message}`,
    }).catch(err => console.error('Failed to update progress:', err));

    // Update document status
    await supabaseAdmin
      .from('documents')
      .update({
        extraction_status: 'PROCESSING_FAILED',
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
  // Query by payload->document_id since background_jobs doesn't have entity_id column
  const { data: jobs, error: queryError } = await supabaseAdmin
    .from('background_jobs')
    .select('id, payload')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .eq('payload->>document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    console.error(`❌ Error querying background_jobs for document ${documentId}:`, queryError);
    return;
  }

  if (jobs && jobs.length > 0) {
    const updateData: any = {
      status: status === 'PROCESSING' ? 'RUNNING' : status, // Map PROCESSING to RUNNING for DB
      updated_at: new Date().toISOString(),
    };
    
    if (result) {
      updateData.result = typeof result === 'string' ? result : JSON.stringify(result);
    }
    
    if (status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'PROCESSING') {
      updateData.started_at = new Date().toISOString();
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('background_jobs')
      .update(updateData)
      .eq('id', jobs[0].id);
    
    if (updateError) {
      console.error(`❌ Error updating background_job ${jobs[0].id}:`, updateError);
    } else {
      console.log(`✅ Updated background_job ${jobs[0].id} to status ${status}`);
    }
  } else {
    console.warn(`⚠️ No background_job found for document ${documentId}`);
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

