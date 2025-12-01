/**
 * Retry a single document by document ID
 */

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const redisUrl = process.env.REDIS_URL || '';
  const documentId = process.argv[2];

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable not set');
    process.exit(1);
  }

  if (!documentId) {
    console.error('❌ Please provide document ID');
    console.error('Usage: npx tsx scripts/retry-single-document.ts <document-id>');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('document-processing', { connection: redis });

  console.log(`🔍 Finding document: ${documentId}\n`);

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, title, site_id, document_type, module_id, storage_path, extraction_status')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    console.error('❌ Document not found:', error);
    await queue.close();
    await redis.quit();
    process.exit(1);
  }

  console.log(`📄 ${doc.title}`);
  console.log(`   Status: ${doc.extraction_status}`);

  // Get site info
  const { data: site } = await supabase
    .from('sites')
    .select('company_id')
    .eq('id', doc.site_id)
    .single();

  if (!site) {
    console.error('❌ Site not found');
    await queue.close();
    await redis.quit();
    process.exit(1);
  }

  // Re-enqueue
  try {
    await queue.add(
      'DOCUMENT_EXTRACTION',
      {
        document_id: doc.id,
        company_id: site.company_id,
        site_id: doc.site_id,
        module_id: doc.module_id,
        file_path: doc.storage_path,
        document_type: doc.document_type,
      },
      {
        priority: 1, // High priority
        jobId: `manual-retry-${doc.id}-${Date.now()}`,
      }
    );
    console.log(`✅ Re-enqueued for processing\n`);
  } catch (err: any) {
    console.error(`❌ Failed to enqueue: ${err.message}\n`);
  }

  await queue.close();
  await redis.quit();
}

main();
