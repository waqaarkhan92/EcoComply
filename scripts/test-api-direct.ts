/**
 * Test API Endpoints Directly
 * Actually calls the API endpoints to see what they return
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { supabaseAdmin } from '../lib/supabase/server';

async function testAPIDirect() {
  console.log('🧪 TESTING API ENDPOINTS DIRECTLY\n');
  console.log('='.repeat(60));

  const documentId = '6677eef4-eeed-416f-ae5a-a6e2ab95a6a3';

  // Test 1: What supabaseAdmin sees
  console.log('📊 TEST 1: supabaseAdmin query (what API uses)');
  console.log('-'.repeat(60));

  const { data: obligationData, error: countError } = await supabaseAdmin
    .from('obligations')
    .select('id')
    .eq('document_id', documentId)
    .is('deleted_at', null);

  console.log(`Obligation count: ${obligationData?.length || 0}`);
  console.log(`Error: ${countError ? JSON.stringify({ message: countError.message, code: countError.code }) : 'none'}`);
  if (obligationData && obligationData.length > 0) {
    console.log(`Sample IDs: ${obligationData.slice(0, 3).map(o => o.id).join(', ')}`);
  }

  // Test 2: What direct createClient sees
  console.log('\n📊 TEST 2: Direct createClient query (what test uses)');
  console.log('-'.repeat(60));

  const directClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: directData, error: directError } = await directClient
    .from('obligations')
    .select('id')
    .eq('document_id', documentId)
    .is('deleted_at', null);

  console.log(`Obligation count: ${directData?.length || 0}`);
  console.log(`Error: ${directError ? JSON.stringify({ message: directError.message, code: directError.code }) : 'none'}`);
  if (directData && directData.length > 0) {
    console.log(`Sample IDs: ${directData.slice(0, 3).map(o => o.id).join(', ')}`);
  }

  // Test 3: Compare
  console.log('\n📊 TEST 3: Comparison');
  console.log('-'.repeat(60));
  console.log(`supabaseAdmin: ${obligationData?.length || 0}`);
  console.log(`directClient: ${directData?.length || 0}`);
  console.log(`Match: ${(obligationData?.length || 0) === (directData?.length || 0) ? '✅ YES' : '❌ NO'}`);

  if ((obligationData?.length || 0) !== (directData?.length || 0)) {
    console.log('\n❌ MISMATCH: supabaseAdmin and directClient return different results!');
    console.log('This suggests a connection pooling or client instance issue.');
    process.exit(1);
  } else {
    console.log('\n✅ Both clients return the same result!');
    process.exit(0);
  }
}

testAPIDirect().catch(console.error);




