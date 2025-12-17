/**
 * Quick test to verify extraction works NOW
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { getQueue, QUEUE_NAMES } from '../lib/queue/queue-manager';
import { processDocumentJob } from '../lib/jobs/document-processing-job';
import { Worker } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';

async function testExtraction() {
  console.log('🧪 Testing PDF Extraction\n');

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

  // 3. Upload PDF to storage
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

  // 4. Create document record
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      site_id: site.id,
      document_type: 'ENVIRONMENTAL_PERMIT',
      module_id: modules[0].id,
      title: 'Test Permit',
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

  // 5. Start worker
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  const worker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      console.log(`\n📋 Processing job: ${job.name} (${job.id})`);
      if (job.name === 'DOCUMENT_EXTRACTION') {
        try {
          await processDocumentJob(job);
          console.log('✅ Job completed successfully');
        } catch (error: any) {
          console.error(`❌ Job failed: ${error.message}`);
          throw error;
        }
      }
    },
    { connection: queue.opts.connection }
  );

  console.log('✅ Worker started\n');

  // Enqueue job
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
  console.log('⏳ Waiting for processing (max 30 seconds)...\n');

  // 7. Wait for completion
  const startTime = Date.now();
  const timeout = 30000;

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const jobState = await job.getState();

    if (jobState === 'completed') {
      console.log('✅ Job completed!\n');
      
      // Check document
      const { data: doc } = await supabase
        .from('documents')
        .select('extraction_status, extracted_text')
        .eq('id', document.id)
        .single();

      if (doc) {
        console.log(`📄 Extraction status: ${doc.extraction_status}`);
        console.log(`📝 Text extracted: ${doc.extracted_text?.length || 0} chars`);
        
        if (doc.extracted_text && doc.extracted_text.length > 100) {
          console.log('✅ Text extraction working!');
        } else {
          console.log('⚠️  No text extracted');
        }
      }

      // Check obligations
      const { data: obligations } = await supabase
        .from('obligations')
        .select('id, obligation_title')
        .eq('document_id', document.id);

      console.log(`\n📋 Obligations: ${obligations?.length || 0}`);
      if (obligations && obligations.length > 0) {
        console.log('✅ Obligation extraction working!');
        obligations.slice(0, 3).forEach((o: any, i: number) => {
          console.log(`   ${i + 1}. ${o.obligation_title || 'Untitled'}`);
        });
      } else {
        console.log('⚠️  No obligations extracted');
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
      console.error(`❌ Job failed: ${failedReason}`);
      await worker.close();
      process.exit(1);
    }
  }

  console.error('❌ Test timed out after 30 seconds');
  await worker.close();
  process.exit(1);
}

testExtraction().catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});

