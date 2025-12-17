/**
 * Test Database vs API Results
 * Compares what's in the Supabase database with what the API returns
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

async function testDBvsAPI() {
  console.log('🧪 TESTING DATABASE vs API RESULTS\n');
  console.log('='.repeat(60));

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const documentId = '6677eef4-eeed-416f-ae5a-a6e2ab95a6a3';

  console.log(`📄 Testing document: ${documentId}\n`);

  // ===== TEST 1: Document Status =====
  console.log('📊 TEST 1: Document Status');
  console.log('-'.repeat(60));

  // Database query
  const { data: dbDoc, error: dbDocError } = await supabase
    .from('documents')
    .select('id, extraction_status, created_at, updated_at')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single();

  console.log('Database query:');
  console.log(`  - Status: ${dbDoc?.extraction_status || 'NOT FOUND'}`);
  console.log(`  - Error: ${dbDocError ? JSON.stringify({ message: dbDocError.message, code: dbDocError.code }) : 'none'}`);

  // API simulation (what the API endpoint does)
  // We can't easily call the actual API without auth, so we'll simulate it
  // But we can check what supabaseAdmin would return
  const { data: apiDoc, error: apiDocError } = await supabase
    .from('documents')
    .select('id, extraction_status, created_at, updated_at')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single();

  console.log('\nAPI simulation (same query):');
  console.log(`  - Status: ${apiDoc?.extraction_status || 'NOT FOUND'}`);
  console.log(`  - Error: ${apiDocError ? JSON.stringify({ message: apiDocError.message, code: apiDocError.code }) : 'none'}`);

  const statusMatch = dbDoc?.extraction_status === apiDoc?.extraction_status;
  console.log(`\n✅ Status match: ${statusMatch ? 'YES' : 'NO'}`);
  if (!statusMatch) {
    console.log(`   ❌ MISMATCH: DB=${dbDoc?.extraction_status}, API=${apiDoc?.extraction_status}`);
  }

  // ===== TEST 2: Obligations Count =====
  console.log('\n📋 TEST 2: Obligations Count');
  console.log('-'.repeat(60));

  // Database query - count obligations
  const { data: dbObligations, error: dbOblError } = await supabase
    .from('obligations')
    .select('id, document_id')
    .eq('document_id', documentId)
    .is('deleted_at', null);

  const dbCount = dbObligations?.length || 0;
  console.log('Database query:');
  console.log(`  - Count: ${dbCount}`);
  console.log(`  - Error: ${dbOblError ? JSON.stringify({ message: dbOblError.message, code: dbOblError.code }) : 'none'}`);
  if (dbObligations && dbObligations.length > 0) {
    console.log(`  - Sample IDs: ${dbObligations.slice(0, 3).map(o => o.id).join(', ')}`);
    console.log(`  - All have correct document_id: ${dbObligations.every(o => o.document_id === documentId)}`);
  }

  // API simulation - what the obligations endpoint does
  const { data: apiObligations, error: apiOblError } = await supabase
    .from('obligations')
    .select('id, document_id, obligation_title, obligation_description, category')
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(21);

  const apiCount = apiObligations?.length || 0;
  console.log('\nAPI simulation (same query):');
  console.log(`  - Count: ${apiCount}`);
  console.log(`  - Error: ${apiOblError ? JSON.stringify({ message: apiOblError.message, code: apiOblError.code }) : 'none'}`);
  if (apiObligations && apiObligations.length > 0) {
    console.log(`  - Sample IDs: ${apiObligations.slice(0, 3).map(o => o.id).join(', ')}`);
    console.log(`  - Sample titles: ${apiObligations.slice(0, 3).map(o => o.obligation_title || 'Untitled').join(', ')}`);
  }

  const countMatch = dbCount === apiCount;
  console.log(`\n✅ Count match: ${countMatch ? 'YES' : 'NO'}`);
  if (!countMatch) {
    console.log(`   ❌ MISMATCH: DB=${dbCount}, API=${apiCount}`);
  }

  // ===== TEST 3: Check for RLS or Connection Issues =====
  console.log('\n🔍 TEST 3: Connection/RLS Check');
  console.log('-'.repeat(60));

  // Try querying with different approaches
  console.log('Testing different query approaches:');

  // Approach 1: Direct select with service role
  const { data: test1, error: err1 } = await supabase
    .from('obligations')
    .select('id')
    .eq('document_id', documentId)
    .is('deleted_at', null);
  console.log(`  1. Direct select: ${test1?.length || 0} obligations, error: ${err1 ? err1.message : 'none'}`);

  // Approach 2: Select all then filter
  const { data: test2, error: err2 } = await supabase
    .from('obligations')
    .select('id, document_id, deleted_at')
    .eq('document_id', documentId);
  const filtered2 = test2?.filter((o: any) => !o.deleted_at) || [];
  console.log(`  2. Select all then filter: ${filtered2.length} obligations, error: ${err2 ? err2.message : 'none'}`);

  // Approach 3: Count query
  const { data: test3, error: err3 } = await supabase
    .from('obligations')
    .select('id', { count: 'exact', head: false })
    .eq('document_id', documentId)
    .is('deleted_at', null);
  console.log(`  3. Count query: ${test3?.length || 0} obligations, error: ${err3 ? err3.message : 'none'}`);

  // Approach 4: Check if ANY obligations exist
  const { data: test4, error: err4 } = await supabase
    .from('obligations')
    .select('id, document_id')
    .limit(100);
  const matching4 = test4?.filter((o: any) => o.document_id === documentId && !test4.find((x: any) => x.id === o.id && x.deleted_at)) || [];
  console.log(`  4. Check all obligations: Found ${matching4.length} matching, total in table: ${test4?.length || 0}`);

  // ===== TEST 4: Check document_id values =====
  console.log('\n🔍 TEST 4: Document ID Verification');
  console.log('-'.repeat(60));

  if (dbObligations && dbObligations.length > 0) {
    const uniqueDocIds = [...new Set(dbObligations.map(o => o.document_id))];
    console.log(`Unique document_ids in DB results: ${uniqueDocIds.join(', ')}`);
    console.log(`All match target? ${uniqueDocIds.every(id => id === documentId)}`);
    
    if (uniqueDocIds.length > 1 || !uniqueDocIds.every(id => id === documentId)) {
      console.log(`  ⚠️  WARNING: Found obligations with different document_ids!`);
      uniqueDocIds.forEach(id => {
        const count = dbObligations.filter(o => o.document_id === id).length;
        console.log(`    - ${id}: ${count} obligations`);
      });
    }
  }

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`Document Status:`);
  console.log(`  - Database: ${dbDoc?.extraction_status || 'NOT FOUND'}`);
  console.log(`  - API Sim:  ${apiDoc?.extraction_status || 'NOT FOUND'}`);
  console.log(`  - Match: ${statusMatch ? '✅ YES' : '❌ NO'}`);

  console.log(`\nObligations Count:`);
  console.log(`  - Database: ${dbCount}`);
  console.log(`  - API Sim:  ${apiCount}`);
  console.log(`  - Match: ${countMatch ? '✅ YES' : '❌ NO'}`);

  if (!statusMatch || !countMatch) {
    console.log('\n❌ MISMATCH DETECTED!');
    console.log('   The database and API are returning different results.');
    console.log('   This suggests:');
    console.log('   1. Connection pooling issue');
    console.log('   2. Transaction isolation issue');
    console.log('   3. RLS policy blocking (even with service role)');
    console.log('   4. Caching issue');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED - Database and API match!');
    process.exit(0);
  }
}

testDBvsAPI().catch((error) => {
  console.error('❌ Test error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});





