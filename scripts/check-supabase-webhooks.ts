/**
 * Check if there are any Supabase webhooks or functions that might be causing the issue
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhooks() {
  console.log('🔍 Checking for Supabase webhooks or functions...\n');

  // Check database functions
  const { data: functions, error: funcError } = await supabaseAdmin
    .from('pg_proc')
    .select('proname')
    .ilike('proname', '%user%');

  if (funcError) {
    console.log('⚠️  Could not check functions (this is normal)');
  }

  console.log('📋 Manual Check Required:');
  console.log('\n1. Go to Supabase Dashboard → Database → Webhooks');
  console.log('2. Check if there are any webhooks on auth.users INSERT');
  console.log('3. If yes, disable them temporarily');
  console.log('\n4. Go to Database → Functions');
  console.log('5. Check if there are any functions that run on user creation');
  console.log('\n5. Go to Authentication → Hooks');
  console.log('6. Check if there are any auth hooks configured');
}

checkWebhooks();

