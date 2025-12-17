/**
 * Test PDF extraction with 10 second timeout
 * Replicates the exact upload flow
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { getQueue, QUEUE_NAMES } from '../lib/queue/queue-manager';
import { processDocumentJob } from '../lib/jobs/document-processing-job';
import { Worker } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';

async function testExtraction() {
  console.log('🧪 Testing PDF Extraction (10s timeout)\n');

  // 1. Read PDF
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
  console.log(`✅ Site: ${site.id}`);

  const { data: modules } = await supabase.from('modules').select('id').eq('module_code', 'MODULE_1').limit(1);
  if (!modules || modules.length === 0) {
    console.error('❌ Module 1 not found');
    process.exit(1);
  }
  console.log(`✅ Module: ${modules[0].id}\n`);

  // 3. Upload PDF to storage
  const fileId = crypto.randomUUID();
  const storagePath = `${fileId}.pdf`;
  console.log('📤 Uploading PDF to storage...');
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    console.error(`❌ Storage upload failed: ${uploadError.message}`);
    process.exit(1);
  }
  console.log(`✅ PDF uploaded: ${storagePath}\n`);

  // 4. Create document record
  console.log('📝 Creating document record...');
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
    console.error('Error details:', docError);
    process.exit(1);
  }
  console.log(`✅ Document created: ${document.id}\n`);

  // 5. Start worker
  console.log('🚀 Starting worker...');
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
          console.error('Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
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

  // 6. Enqueue job
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
  console.log('⏳ Waiting for extraction (10 seconds max)...\n');

  // 7. Wait for completion with 10 second timeout
  const startTime = Date.now();
  const timeout = 10000;

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const jobState = await job.getState();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (elapsed % 2 === 0) {
      console.log(`⏳ ${elapsed}s: Job state = ${jobState}`);
    }

    if (jobState === 'completed') {
      console.log(`\n✅ Job completed in ${elapsed}s!\n`);
      
      // Check document
      const { data: doc } = await supabase
        .from('documents')
        .select('extraction_status, extracted_text')
        .eq('id', document.id)
        .single();

      if (doc) {
        console.log(`📄 Status: ${doc.extraction_status}`);
        console.log(`📝 Text: ${doc.extracted_text?.length || 0} chars`);
        
        if (doc.extracted_text && doc.extracted_text.length > 100) {
          console.log('✅ Text extraction: PASSED');
        } else {
          console.log('❌ Text extraction: FAILED');
        }
      }

      // Check obligations
      const { data: obligations } = await supabase
        .from('obligations')
        .select('id, obligation_title')
        .eq('document_id', document.id);

      console.log(`\n📋 Obligations: ${obligations?.length || 0}`);
      if (obligations && obligations.length > 0) {
        console.log('✅ Obligation extraction: PASSED');
        obligations.slice(0, 3).forEach((o: any, i: number) => {
          console.log(`   ${i + 1}. ${o.obligation_title || 'Untitled'}`);
        });
      } else {
        console.log('❌ Obligation extraction: FAILED');
      }

      // Cleanup
      await supabase.from('obligations').delete().eq('document_id', document.id);
      await supabase.from('documents').delete().eq('id', document.id);
      await supabase.storage.from('documents').remove([storagePath]);
      await worker.close();
      
      console.log('\n✅ TEST PASSED');
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

  console.error(`\n❌ TIMEOUT after 10 seconds`);
  const finalState = await job.getState();
  console.error(`Final job state: ${finalState}`);
  
  const { data: finalDoc } = await supabase
    .from('documents')
    .select('extraction_status, extracted_text')
    .eq('id', document.id)
    .single();
  console.error(`Document status: ${finalDoc?.extraction_status || 'UNKNOWN'}`);
  console.error(`Text length: ${finalDoc?.extracted_text?.length || 0}`);

  // Get job details
  console.error(`Job failed reason:`, job.failedReason || 'Not failed');
  console.error(`Job data:`, JSON.stringify(job.data, null, 2));

  await worker.close();
  process.exit(1);
}

testExtraction().catch((error) => {
  console.error('❌ Test error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

