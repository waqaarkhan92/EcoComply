/**
 * Retry stuck documents by re-enqueueing them
 */

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const redisUrl = process.env.REDIS_URL || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('document-processing', { connection: redis });

  console.log('🔍 Finding stuck documents...');

  // Find documents stuck in PROCESSING status
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, site_id, document_type, module_id, storage_path, created_at')
    .eq('extraction_status', 'PROCESSING')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching documents:', error);
    process.exit(1);
  }

  console.log(`Found ${documents?.length || 0} stuck documents\n`);

  if (!documents || documents.length === 0) {
    console.log('✅ No stuck documents to retry');
    await queue.close();
    await redis.quit();
    return;
  }

  for (const doc of documents) {
    console.log(`📄 ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Created: ${doc.created_at}`);

    // Get site info to get company_id
    const { data: site } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', doc.site_id)
      .single();

    if (!site) {
      console.log(`   ⚠️  Skipping - site not found`);
      continue;
    }

    // Re-enqueue the job
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
          priority: 5,
          jobId: `retry-${doc.id}-${Date.now()}`,
        }
      );
      console.log(`   ✅ Re-enqueued for processing\n`);
    } catch (err: any) {
      console.log(`   ❌ Failed to enqueue: ${err.message}\n`);
    }
  }

  await queue.close();
  await redis.quit();
  console.log('✅ Done!');
}

main();
