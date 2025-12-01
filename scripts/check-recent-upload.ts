/**
 * Check the most recent document upload
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking most recent document...\n');

  // Get the most recent document
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !doc) {
    console.error('❌ Error fetching document:', error);
    process.exit(1);
  }

  console.log('📄 Most Recent Document:');
  console.log(`   ID: ${doc.id}`);
  console.log(`   Title: ${doc.title}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Extraction Status: ${doc.extraction_status}`);
  console.log(`   Created: ${doc.created_at}`);
  console.log(`   Text Length: ${doc.extracted_text?.length || 0} chars`);
  console.log(`   Site ID: ${doc.site_id}`);
  console.log(`   Module ID: ${doc.module_id}`);

  // Get obligations for this document
  const { data: obligations, error: oblError } = await supabase
    .from('obligations')
    .select('id, obligation_title, obligation_type, frequency')
    .eq('document_id', doc.id)
    .is('deleted_at', null);

  console.log(`\n📋 Obligations: ${obligations?.length || 0}`);
  if (obligations && obligations.length > 0) {
    obligations.slice(0, 5).forEach((obl, i) => {
      console.log(`   ${i + 1}. ${obl.obligation_title || 'Untitled'} (${obl.obligation_type})`);
    });
    if (obligations.length > 5) {
      console.log(`   ... and ${obligations.length - 5} more`);
    }
  }

  // Check background job
  const { data: job } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .contains('payload', { document_id: doc.id })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (job) {
    console.log(`\n🔧 Background Job:`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created: ${job.created_at}`);
    console.log(`   Started: ${job.started_at || 'Not started'}`);
    console.log(`   Completed: ${job.completed_at || 'Not completed'}`);
    if (job.error_message) {
      console.log(`   Error: ${job.error_message}`);
    }
  } else {
    console.log(`\n⚠️  No background job found for this document`);
  }
}

main();
