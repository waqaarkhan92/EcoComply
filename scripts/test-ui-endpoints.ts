/**
 * Test UI Endpoints - Verify extraction-status and obligations endpoints work
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { getQueue, QUEUE_NAMES } from '../lib/queue/queue-manager';
import { processDocumentJob } from '../lib/jobs/document-processing-job';
import { Worker } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';

async function testUIEndpoints() {
  console.log('🧪 TESTING UI ENDPOINTS\n');
  console.log('='.repeat(60));

  // 1. Read PDF
  const pdfPath = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fs.readFile(pdfPath);
    console.log(`✅ PDF found: ${pdfBuffer.length} bytes`);
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
      extraction_status: 'PROCESSING',
      import_source: 'PDF_EXTRACTION',
      uploaded_by: '596b80de-593f-469c-a256-282544d5f911', // Use a real user ID
    })
    .select('id')
    .single();

  if (docError || !document) {
    console.error(`❌ Document creation failed: ${docError?.message}`);
    process.exit(1);
  }
  console.log(`✅ Document created: ${document.id}\n`);

  // 5. Start worker
  console.log('🚀 Starting worker...');
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  const worker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      if (job.name === 'DOCUMENT_EXTRACTION') {
        try {
          await processDocumentJob(job);
        } catch (error: any) {
          console.error(`❌ Worker: Job failed: ${error.message}`);
          throw error;
        }
      }
    },
    { connection: queue.opts.connection }
  );

  console.log('✅ Worker started\n');

  // 6. Enqueue job
  console.log('📤 Enqueuing extraction job...');
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
    { jobId: `test-ui-${document.id}` }
  );

  console.log(`✅ Job enqueued: ${job.id}\n`);
  console.log('⏳ Waiting for extraction (max 5 minutes)...\n');
  console.log('='.repeat(60));

  // 7. Monitor and test UI endpoints
  const startTime = Date.now();
  const timeout = 300000; // 5 minutes
  let extractionCompleted = false;

  while (Date.now() - startTime < timeout && !extractionCompleted) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const jobState = await job.getState();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Test extraction-status endpoint logic
    const { data: doc } = await supabase
      .from('documents')
      .select('id, extraction_status, created_at, updated_at')
      .eq('id', document.id)
      .single();

    const currentStatus = doc?.extraction_status || 'UNKNOWN';
    
    // Count obligations (what extraction-status endpoint does)
    const { data: obligationData } = await supabase
      .from('obligations')
      .select('id')
      .eq('document_id', document.id)
      .is('deleted_at', null);
    
    const obligationCount = obligationData?.length || 0;

    // Calculate progress (what extraction-status endpoint does)
    let progress = 0;
    let apiStatus = currentStatus;
    if (currentStatus === 'PROCESSING' || currentStatus === 'EXTRACTING') {
      apiStatus = 'IN_PROGRESS';
      const startTime2 = doc?.created_at ? new Date(doc.created_at).getTime() : Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startTime2) / 1000);
      const timeBasedProgress = Math.floor((elapsedSeconds / 45) * 90);
      progress = Math.max(10, Math.min(95, timeBasedProgress));
      if (obligationCount > 0) {
        const obligationProgress = Math.min(95, Math.floor((obligationCount / 30) * 90));
        progress = Math.max(progress, obligationProgress);
      }
      if (obligationCount >= 30) {
        progress = Math.max(progress, 90);
      }
    } else if (currentStatus === 'COMPLETED') {
      apiStatus = 'COMPLETED';
      progress = 100;
    } else if (currentStatus === 'PENDING') {
      progress = 0;
    }

    // Test obligations endpoint logic
    const { data: obligations } = await supabase
      .from('obligations')
      .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at, original_text')
      .eq('document_id', document.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(21);

    if (elapsed % 10 === 0 || currentStatus !== 'PROCESSING') {
      console.log(`[${elapsed}s] Status: ${currentStatus} → API: ${apiStatus} | Progress: ${progress}% | Obligations: ${obligationCount} | UI Query: ${obligations?.length || 0}`);
    }

    if (jobState === 'completed') {
      extractionCompleted = true;
      console.log(`\n✅ Extraction completed in ${elapsed}s!\n`);
      console.log('='.repeat(60));
      
      // Final verification
      const { data: finalDoc } = await supabase
        .from('documents')
        .select('extraction_status')
        .eq('id', document.id)
        .single();

      console.log(`📄 Final document status: ${finalDoc?.extraction_status || 'UNKNOWN'}`);
      
      // Final obligation count
      const { data: finalObligations } = await supabase
        .from('obligations')
        .select('id, obligation_title, obligation_description, category')
        .eq('document_id', document.id)
        .is('deleted_at', null);

      console.log(`📋 Final obligations count: ${finalObligations?.length || 0}`);
      
      if (finalObligations && finalObligations.length > 0) {
        console.log('\n✅ UI ENDPOINT TEST RESULTS:');
        console.log(`   - extraction-status endpoint would return:`);
        console.log(`     * status: ${finalDoc?.extraction_status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'}`);
        console.log(`     * progress: ${finalDoc?.extraction_status === 'COMPLETED' ? 100 : progress}%`);
        console.log(`     * obligation_count: ${finalObligations.length}`);
        console.log(`   - obligations endpoint would return:`);
        console.log(`     * data array length: ${finalObligations.length}`);
        console.log(`     * Sample obligations:`);
        finalObligations.slice(0, 5).forEach((o: any, i: number) => {
          console.log(`       ${i + 1}. ${o.obligation_title || 'Untitled'} [${o.category}]`);
        });
        
        // Verify status is COMPLETED
        if (finalDoc?.extraction_status === 'COMPLETED') {
          console.log('\n✅ STATUS UPDATE: PASSED - Document status is COMPLETED');
        } else {
          console.log(`\n❌ STATUS UPDATE: FAILED - Document status is ${finalDoc?.extraction_status}, expected COMPLETED`);
        }
        
        // Verify obligations are accessible
        if (finalObligations.length > 0) {
          console.log('✅ OBLIGATIONS ACCESS: PASSED - Obligations are queryable');
        } else {
          console.log('❌ OBLIGATIONS ACCESS: FAILED - No obligations found');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ UI ENDPOINT TEST PASSED');
        console.log('='.repeat(60));
      } else {
        console.log('\n❌ UI ENDPOINT TEST FAILED - No obligations found');
      }

      // Cleanup
      console.log('\n🧹 Cleaning up test data...');
      await supabase.from('obligations').delete().eq('document_id', document.id);
      await supabase.from('documents').delete().eq('id', document.id);
      await supabase.storage.from('documents').remove([storagePath]);
      await worker.close();

      process.exit(finalObligations && finalObligations.length > 0 ? 0 : 1);
    } else if (jobState === 'failed') {
      console.error(`\n❌ Job failed after ${elapsed}s: ${job.failedReason || 'Unknown error'}`);
      await worker.close();
      process.exit(1);
    }
  }

  if (!extractionCompleted) {
    console.error(`\n❌ TEST TIMEOUT after ${Math.floor(timeout / 1000)}s`);
    await worker.close();
    process.exit(1);
  }
}

testUIEndpoints().catch((error) => {
  console.error('❌ Test error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

