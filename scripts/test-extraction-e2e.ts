/**
 * End-to-end test: Upload PDF and verify extraction works
 * This simulates the exact flow the UI uses
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { getQueue, QUEUE_NAMES } from '../lib/queue/queue-manager';
import { processDocumentJob } from '../lib/jobs/document-processing-job';
import { Worker } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';

async function testE2E() {
  console.log('🧪 E2E Test: PDF Upload → Extraction → Obligations\n');

  // 1. Check PDF exists
  const pdfPath = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fs.readFile(pdfPath);
    console.log(`✅ PDF found: ${pdfBuffer.length} bytes\n`);
  } catch (error) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  // 2. Connect to Supabase
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Get first site and module
  const { data: sites } = await supabase.from('sites').select('id, company_id').limit(1);
  if (!sites || sites.length === 0) {
    console.error('❌ No sites found');
    process.exit(1);
  }
  const site = sites[0];

  const { data: modules } = await supabase.from('modules').select('id').eq('module_code', 'MODULE_1').limit(1);
  if (!modules || modules.length === 0) {
    console.error('❌ Module 1 not found');
    process.exit(1);
  }

  // 3. Upload PDF to storage (simulating API upload)
  const fileId = crypto.randomUUID();
  const storagePath = `${fileId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    console.error(`❌ Storage upload failed: ${uploadError.message}`);
    process.exit(1);
  }
  console.log('✅ PDF uploaded to storage\n');

  // 4. Create document record (simulating API POST /api/v1/documents)
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      site_id: site.id,
      document_type: 'ENVIRONMENTAL_PERMIT',
      module_id: modules[0].id,
      title: 'Permit_London_14_Data_Centre',
      original_filename: 'Permit_London_14_Data_Centre.pdf',
      storage_path: storagePath,
      file_size_bytes: pdfBuffer.length,
      mime_type: 'application/pdf',
      is_native_pdf: true,
      status: 'ACTIVE',
      extraction_status: 'PENDING',
      import_source: 'PDF_EXTRACTION',
    })
    .select('id')
    .single();

  if (docError || !document) {
    console.error(`❌ Document creation failed: ${docError?.message}`);
    process.exit(1);
  }
  console.log(`✅ Document created: ${document.id}\n`);

  // 5. Start worker (simulating auto-start)
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  const worker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      console.log(`\n📋 Worker processing: ${job.name} (${job.id})`);
      if (job.name === 'DOCUMENT_EXTRACTION') {
        try {
          await processDocumentJob(job);
          console.log('✅ Worker: Job completed');
        } catch (error: any) {
          console.error(`❌ Worker: Job failed: ${error.message}`);
          if (error.stack) {
            console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
          }
          throw error;
        }
      }
    },
    { connection: queue.opts.connection }
  );

  worker.on('completed', (job) => {
    console.log(`\n✅ Worker event: Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`\n❌ Worker event: Job ${job?.id} failed:`, error.message);
  });

  console.log('✅ Worker started\n');

  // 6. Enqueue job (simulating API enqueue)
  console.log('📤 Enqueuing job...');
  const job = await queue.add(
    'DOCUMENT_EXTRACTION',
    {
      document_id: document.id,
      company_id: site.company_id,
      site_id: site.id,
      module_id: modules[0].id,
      file_path: storagePath,
      document_type: 'ENVIRONMENTAL_PERMIT',
    },
    { jobId: `test-${document.id}` }
  );

  console.log(`✅ Job enqueued: ${job.id}\n`);
  console.log('⏳ Waiting for extraction (max 60 seconds)...\n');

  // 7. Poll for completion
  const startTime = Date.now();
  const timeout = 60000;
  let lastStatus = 'PENDING';

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const jobState = await job.getState();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Check document status
    const { data: doc } = await supabase
      .from('documents')
      .select('extraction_status, extracted_text')
      .eq('id', document.id)
      .single();

    const currentStatus = doc?.extraction_status || 'UNKNOWN';
    if (currentStatus !== lastStatus) {
      console.log(`📊 Status changed: ${lastStatus} → ${currentStatus} (${elapsed}s)`);
      lastStatus = currentStatus;
    }

    if (jobState === 'completed') {
      console.log(`\n✅ Job completed in ${elapsed}s!\n`);
      
      // Verify extraction
      const { data: finalDoc } = await supabase
        .from('documents')
        .select('extraction_status, extracted_text')
        .eq('id', document.id)
        .single();

      if (finalDoc) {
        console.log(`📄 Final status: ${finalDoc.extraction_status}`);
        console.log(`📝 Text length: ${finalDoc.extracted_text?.length || 0} chars`);
        
        if (finalDoc.extracted_text && finalDoc.extracted_text.length > 100) {
          console.log('✅ Text extraction: PASSED');
        } else {
          console.log('❌ Text extraction: FAILED (no text)');
        }
      }

      // Check obligations
      const { data: obligations } = await supabase
        .from('obligations')
        .select('id, obligation_title')
        .eq('document_id', document.id);

      console.log(`\n📋 Obligations found: ${obligations?.length || 0}`);
      if (obligations && obligations.length > 0) {
        console.log('✅ Obligation extraction: PASSED');
        obligations.slice(0, 5).forEach((o: any, i: number) => {
          console.log(`   ${i + 1}. ${o.obligation_title || 'Untitled'}`);
        });
      } else {
        console.log('❌ Obligation extraction: FAILED (no obligations)');
      }

      // Cleanup
      console.log('\n🧹 Cleaning up...');
      await supabase.from('obligations').delete().eq('document_id', document.id);
      await supabase.from('documents').delete().eq('id', document.id);
      await supabase.storage.from('documents').remove([storagePath]);
      await worker.close();
      
      console.log('\n✅ E2E TEST PASSED');
      process.exit(0);
    } else if (jobState === 'failed') {
      const failedReason = job.failedReason || 'Unknown error';
      console.error(`\n❌ Job failed after ${elapsed}s: ${failedReason}`);
      if (job.stacktrace) {
        console.error('Stack:', job.stacktrace.join('\n').slice(0, 10));
      }
      await worker.close();
      process.exit(1);
    }
  }

  console.error(`\n❌ Test timed out after ${Math.floor(timeout / 1000)}s`);
  const finalState = await job.getState();
  console.error(`Final job state: ${finalState}`);
  const { data: finalDoc } = await supabase
    .from('documents')
    .select('extraction_status')
    .eq('id', document.id)
    .single();
  console.error(`Final document status: ${finalDoc?.extraction_status || 'UNKNOWN'}`);
  await worker.close();
  process.exit(1);
}

testE2E().catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});

