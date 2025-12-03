// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

async function diagnoseExtraction() {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('🔍 DIAGNOSING EXTRACTION ISSUES...\n');
  
  // 1. Check recent documents
  console.log('📄 Checking recent documents...');
  const { data: recentDocs, error: docsError } = await supabase
    .from('documents')
    .select('id, title, extraction_status, created_at, updated_at, extracted_text')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
    return;
  }
  
  console.log(`Found ${recentDocs?.length || 0} recent documents:\n`);
  
  for (const doc of recentDocs || []) {
    console.log(`  📄 ${doc.title || doc.id}`);
    console.log(`     Status: ${doc.extraction_status}`);
    console.log(`     Created: ${doc.created_at}`);
    console.log(`     Updated: ${doc.updated_at}`);
    console.log(`     Text length: ${doc.extracted_text?.length || 0} chars`);
    
    // Check obligations for this document
    const { data: obligations, error: oblError } = await supabase
      .from('obligations')
      .select('id, obligation_title, deleted_at')
      .eq('document_id', doc.id)
      .is('deleted_at', null);
    
    console.log(`     Obligations: ${obligations?.length || 0}`);
    if (obligations && obligations.length > 0) {
      console.log(`     Sample: ${obligations[0]?.obligation_title || obligations[0]?.id}`);
    }
    
    // Check background jobs for this document
    const { data: jobs, error: jobsError } = await supabase
      .from('background_jobs')
      .select('id, status, job_type, created_at, updated_at, result')
      .eq('entity_id', doc.id)
      .eq('job_type', 'DOCUMENT_EXTRACTION')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log(`     Job status: ${job.status}`);
      console.log(`     Job created: ${job.created_at}`);
      console.log(`     Job updated: ${job.updated_at}`);
      if (job.result) {
        try {
          const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
          console.log(`     Job result:`, JSON.stringify(result, null, 2));
        } catch (e) {
          console.log(`     Job result: ${job.result}`);
        }
      }
    } else {
      console.log(`     No background job found`);
    }
    
    console.log('');
  }
  
  // 2. Check documents stuck in processing
  console.log('\n⚠️ Checking documents stuck in processing...');
  const { data: stuckDocs, error: stuckError } = await supabase
    .from('documents')
    .select('id, title, extraction_status, created_at, updated_at')
    .is('deleted_at', null)
    .in('extraction_status', ['PROCESSING', 'EXTRACTING'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (stuckError) {
    console.error('❌ Error fetching stuck documents:', stuckError);
  } else {
    console.log(`Found ${stuckDocs?.length || 0} documents stuck in processing:\n`);
    for (const doc of stuckDocs || []) {
      const createdAt = new Date(doc.created_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);
      console.log(`  ⏱️  ${doc.title || doc.id} - ${doc.extraction_status} (${minutesAgo} minutes ago)`);
    }
  }
  
  // 3. Check total obligations count
  console.log('\n📊 Checking obligations statistics...');
  const { data: allObligations, error: allOblError } = await supabase
    .from('obligations')
    .select('id, document_id, deleted_at')
    .limit(1000);
  
  if (!allOblError && allObligations) {
    const activeObligations = allObligations.filter(o => !o.deleted_at);
    const uniqueDocs = [...new Set(activeObligations.map(o => o.document_id))];
    console.log(`Total obligations: ${allObligations.length}`);
    console.log(`Active obligations: ${activeObligations.length}`);
    console.log(`Documents with obligations: ${uniqueDocs.length}`);
  }
  
  // 4. Check recent background jobs
  console.log('\n🔧 Checking recent background jobs...');
  const { data: recentJobs, error: jobsError2 } = await supabase
    .from('background_jobs')
    .select('id, status, job_type, entity_id, created_at, updated_at')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!jobsError2 && recentJobs) {
    console.log(`Found ${recentJobs.length} recent extraction jobs:\n`);
    for (const job of recentJobs) {
      const createdAt = new Date(job.created_at);
      const updatedAt = job.updated_at ? new Date(job.updated_at) : null;
      const minutesAgo = Math.floor((new Date().getTime() - createdAt.getTime()) / 1000 / 60);
      console.log(`  🔧 Job ${job.id}`);
      console.log(`     Status: ${job.status}`);
      console.log(`     Document: ${job.entity_id}`);
      console.log(`     Created: ${minutesAgo} minutes ago`);
      if (updatedAt) {
        const updatedMinutesAgo = Math.floor((new Date().getTime() - updatedAt.getTime()) / 1000 / 60);
        console.log(`     Updated: ${updatedMinutesAgo} minutes ago`);
      }
      console.log('');
    }
  }
  
  console.log('\n✅ Diagnosis complete!');
}

diagnoseExtraction().catch(console.error);

