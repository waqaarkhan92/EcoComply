/**
 * Check obligations for a specific document
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const documentId = process.argv[2];

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  if (!documentId) {
    console.error('❌ Please provide document ID as argument');
    console.error('Usage: npx tsx scripts/check-document-obligations.ts <document-id>');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🔍 Checking obligations for document: ${documentId}\n`);

  // Get document details
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    console.error('❌ Document not found:', docError);
    process.exit(1);
  }

  console.log('📄 Document:');
  console.log(`   Title: ${doc.title}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Extraction Status: ${doc.extraction_status}`);
  console.log(`   Site ID: ${doc.site_id}`);

  // Get ALL obligations (including soft-deleted)
  const { data: allObligations, error: allError } = await supabase
    .from('obligations')
    .select('id, obligation_title, obligation_type, status, deleted_at')
    .eq('document_id', documentId);

  console.log(`\n📋 Total Obligations (including deleted): ${allObligations?.length || 0}`);

  if (allObligations) {
    const active = allObligations.filter(o => !o.deleted_at);
    const deleted = allObligations.filter(o => o.deleted_at);

    console.log(`   Active: ${active.length}`);
    console.log(`   Deleted: ${deleted.length}`);

    if (active.length > 0) {
      console.log(`\n✅ Active Obligations:`);
      active.slice(0, 10).forEach((obl, i) => {
        console.log(`   ${i + 1}. ${obl.obligation_title || 'Untitled'}`);
        console.log(`      Type: ${obl.obligation_type}, Status: ${obl.status}`);
      });
      if (active.length > 10) {
        console.log(`   ... and ${active.length - 10} more`);
      }
    }

    if (deleted.length > 0) {
      console.log(`\n⚠️  Deleted Obligations: ${deleted.length}`);
    }
  }

  // Check via API as well
  console.log(`\n🌐 Testing API endpoint...`);
  console.log(`   URL: /api/v1/documents/${documentId}/obligations`);
  console.log(`   Note: This requires proper authentication in production`);
}

main();
