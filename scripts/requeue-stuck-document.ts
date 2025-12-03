/**
 * Re-queue Stuck Document
 * Manually adds extraction job for a document that got stuck
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';

async function main() {
  const documentId = '9656a64a-3109-4883-ab33-f5db921f8453';

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 Re-queuing stuck document...\n');
  console.log(`Document ID: ${documentId}`);
  console.log(`Redis URL: ${redisUrl}\n`);

  // Check document status and get site/company data
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select(`
      *,
      sites:site_id (
        id,
        company_id
      )
    `)
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    console.error('❌ Document not found:', docError?.message);
    process.exit(1);
  }

  console.log(`Document: ${doc.original_filename}`);
  console.log(`Current status: ${doc.extraction_status}`);
  console.log(`Updated: ${doc.updated_at}\n`);

  // Extract site and company IDs
  const siteData = (doc as any).sites;
  if (!siteData) {
    console.error('❌ Site data not found for document');
    process.exit(1);
  }

  const companyId = siteData.company_id;
  const siteId = doc.site_id;
  const moduleId = doc.module_id;

  // Update document status to PENDING
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      extraction_status: 'PENDING',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);

  if (updateError) {
    console.error('❌ Failed to update document status:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Updated document status to PENDING');

  // Create queue connection
  const documentQueue = new Queue('document-processing', {
    connection: {
      host: redisUrl.includes('localhost') ? 'localhost' : redisUrl.split('@')[1]?.split(':')[0],
      port: redisUrl.includes('localhost') ? 6379 : parseInt(redisUrl.split(':').pop() || '6379'),
    },
  });

  // Add extraction job with correct job name and data structure
  const job = await documentQueue.add('DOCUMENT_EXTRACTION', {
    document_id: documentId,
    company_id: companyId,
    site_id: siteId,
    module_id: moduleId,
    file_path: doc.storage_path,
    document_type: doc.document_type,
    regulator: doc.regulator,
    permit_reference: doc.reference_number
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: false,
    removeOnFail: false
  });

  console.log(`✅ Job queued: ${job.id}`);
  console.log(`\n🎯 Document extraction has been re-queued!`);
  console.log(`Monitor progress at: http://localhost:3000/dashboard/documents/${documentId}`);

  await documentQueue.close();
  process.exit(0);
}

main();
