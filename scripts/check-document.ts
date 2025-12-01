import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

async function checkDocument() {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const documentId = '6677eef4-eeed-416f-ae5a-a6e2ab95a6a3';
  
  // Check document
  const { data: doc } = await supabase
    .from('documents')
    .select('id, extraction_status, created_at, updated_at')
    .eq('id', documentId)
    .single();
  
  console.log('Document:', {
    id: doc?.id,
    status: doc?.extraction_status,
    created: doc?.created_at,
    updated: doc?.updated_at,
  });
  
  // Check obligations - try different queries
  const { data: allObligations } = await supabase
    .from('obligations')
    .select('id, document_id, deleted_at')
    .eq('document_id', documentId);
  
  console.log('\nObligations (all):', allObligations?.length || 0);
  if (allObligations && allObligations.length > 0) {
    console.log('Sample:', allObligations[0]);
    console.log('Deleted count:', allObligations.filter(o => o.deleted_at).length);
  }
  
  const { data: activeObligations } = await supabase
    .from('obligations')
    .select('id, document_id')
    .eq('document_id', documentId)
    .is('deleted_at', null);
  
  console.log('\nObligations (active):', activeObligations?.length || 0);
  
  // Check if there are ANY obligations
  const { data: anyObligations } = await supabase
    .from('obligations')
    .select('id, document_id')
    .limit(10);
  
  console.log('\nAny obligations in table:', anyObligations?.length || 0);
  if (anyObligations && anyObligations.length > 0) {
    const uniqueDocIds = [...new Set(anyObligations.map(o => o.document_id))];
    console.log('Document IDs with obligations:', uniqueDocIds);
  }
}

checkDocument().catch(console.error);


