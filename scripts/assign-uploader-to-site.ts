/**
 * Assign the document uploader to the site
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const documentId = '8b8b764d-7675-484c-ad0e-c6ffa8b6240e';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get the document and who uploaded it
  const { data: doc } = await supabase
    .from('documents')
    .select('id, site_id, uploaded_by, sites(company_id)')
    .eq('id', documentId)
    .single();

  console.log('📄 Document uploaded by:', doc?.uploaded_by);
  console.log('   Site:', doc?.site_id);
  console.log('   Company:', (doc?.sites as any)?.company_id);

  if (!doc?.uploaded_by) {
    console.error('❌ No uploader found');
    process.exit(1);
  }

  // Create site assignment for the uploader
  const { data: assignment, error } = await supabase
    .from('user_site_assignments')
    .insert({
      user_id: doc.uploaded_by,
      site_id: doc.site_id,
      assigned_by: doc.uploaded_by,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.log('ℹ️  Assignment already exists');
    } else {
      console.error('❌ Error creating assignment:', error);
      process.exit(1);
    }
  } else {
    console.log('✅ Created site assignment for user');
    console.log('   User:', doc.uploaded_by);
    console.log('   Site:', doc.site_id);
  }

  // Verify obligations count
  const { data: oblCount, count } = await supabase
    .from('obligations')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .is('deleted_at', null);

  console.log('\n📊 Obligations for this document:', count);
  console.log('✅ User should now be able to see these obligations in the UI!');
}

main();
