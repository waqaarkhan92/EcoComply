/**
 * Test the obligations API endpoint as if called from the frontend
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const documentId = '8b8b764d-7675-484c-ad0e-c6ffa8b6240e';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  console.log('🔍 Testing API as frontend would call it...\n');

  // Create a client with anon key (like frontend)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign in as a test user (you'll need to provide actual credentials)
  console.log('🔐 Would need to sign in with actual user credentials');
  console.log('   The frontend uses the auth token from the session');
  console.log('   Cannot test without actual user session\n');

  // Instead, let's check what the admin can see
  const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  console.log('📊 Checking with admin access (bypasses RLS):\n');

  // Check document
  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id, title, site_id, extraction_status')
    .eq('id', documentId)
    .single();

  console.log('Document:');
  console.log('  Title:', doc?.title);
  console.log('  Site ID:', doc?.site_id);
  console.log('  Status:', doc?.extraction_status);

  // Check obligations
  const { data: obligations } = await supabaseAdmin
    .from('obligations')
    .select('id, obligation_title, site_id, document_id, deleted_at')
    .eq('document_id', documentId);

  console.log('\nObligations (raw query):');
  console.log('  Total count:', obligations?.length || 0);
  console.log('  Active (not deleted):', obligations?.filter(o => !o.deleted_at).length || 0);

  // Check with deleted_at filter (like the API does)
  const { data: activeObligations } = await supabaseAdmin
    .from('obligations')
    .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score')
    .eq('document_id', documentId)
    .is('deleted_at', null);

  console.log('\nObligations (filtered like API):');
  console.log('  Count:', activeObligations?.length || 0);
  if (activeObligations && activeObligations.length > 0) {
    console.log('  First obligation:', {
      id: activeObligations[0].id,
      title: activeObligations[0].obligation_title,
      description: activeObligations[0].obligation_description?.substring(0, 50),
    });
  }

  // Check user site assignments
  const { data: assignments } = await supabaseAdmin
    .from('user_site_assignments')
    .select('user_id, site_id')
    .eq('site_id', doc?.site_id || '');

  console.log('\nUser Site Assignments for this site:');
  console.log('  Users with access:', assignments?.length || 0);
  if (assignments && assignments.length > 0) {
    console.log('  User IDs:', assignments.map(a => a.user_id).slice(0, 3));
  }
}

main();
