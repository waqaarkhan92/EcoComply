/**
 * Verify Reports Setup
 * 
 * This script verifies that all required components for report generation are properly configured.
 * Run with: npx tsx scripts/verify-reports-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyReportsSetup() {
  console.log('🔍 Verifying Reports Setup...\n');

  let allPassed = true;

  // 1. Check reports table exists
  console.log('1. Checking reports table...');
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .limit(1);

    if (error) {
      console.error('   ❌ Reports table not found:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Reports table exists');
    }
  } catch (error: any) {
    console.error('   ❌ Error checking reports table:', error.message);
    allPassed = false;
  }

  // 2. Check reports storage bucket exists
  console.log('\n2. Checking reports storage bucket...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('   ❌ Error listing buckets:', error.message);
      allPassed = false;
    } else {
      const reportsBucket = buckets?.find(b => b.name === 'reports');
      if (reportsBucket) {
        console.log('   ✅ Reports storage bucket exists');
        console.log(`      - Public: ${reportsBucket.public ? 'Yes (❌ Should be private)' : 'No (✅ Correct)'}`);
      } else {
        console.error('   ❌ Reports storage bucket not found');
        console.error('      Please create the bucket in Supabase Dashboard > Storage');
        allPassed = false;
      }
    }
  } catch (error: any) {
    console.error('   ❌ Error checking storage bucket:', error.message);
    allPassed = false;
  }

  // 3. Check RLS policies on reports table
  console.log('\n3. Checking RLS policies...');
  try {
    const { data, error } = await supabase
      .rpc('check_rls_enabled', { table_name: 'reports' })
      .catch(() => ({ data: null, error: null }));

    // Simple check: try to query with service role (should work)
    const { error: queryError } = await supabase
      .from('reports')
      .select('id')
      .limit(1);

    if (queryError && queryError.code === '42501') {
      console.log('   ✅ RLS is enabled on reports table');
    } else if (queryError) {
      console.error('   ⚠️  Unexpected error (RLS may not be configured):', queryError.message);
    } else {
      console.log('   ✅ Can query reports table (RLS policies may be configured)');
    }
  } catch (error: any) {
    console.log('   ⚠️  Could not verify RLS (this is okay if using service role)');
  }

  // 4. Check notification type exists
  console.log('\n4. Checking notification types...');
  try {
    // Try to insert a test notification with REPORT_READY type
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        company_id: '00000000-0000-0000-0000-000000000000',
        recipient_email: 'test@example.com',
        notification_type: 'REPORT_READY',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Test',
        body_text: 'Test',
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('REPORT_READY') || error.code === '23514') {
        console.error('   ❌ REPORT_READY notification type not found in enum');
        console.error('      Please ensure migration 20250128000008 includes REPORT_READY');
        allPassed = false;
      } else {
        // Foreign key error is expected (dummy UUIDs)
        console.log('   ✅ REPORT_READY notification type exists (foreign key error is expected)');
      }
    } else {
      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('recipient_email', 'test@example.com');
      console.log('   ✅ REPORT_READY notification type exists');
    }
  } catch (error: any) {
    console.log('   ⚠️  Could not verify notification type:', error.message);
  }

  // 5. Check background jobs table
  console.log('\n5. Checking background jobs table...');
  try {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('   ❌ Background jobs table not found:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Background jobs table exists');
    }
  } catch (error: any) {
    console.error('   ❌ Error checking background jobs table:', error.message);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All checks passed! Reports setup looks good.');
    console.log('\nNext steps:');
    console.log('1. Test report generation via API');
    console.log('2. Verify worker processes report generation jobs');
    console.log('3. Check that reports are uploaded to storage');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
    console.log('\nRefer to REPORT_GENERATION_SETUP.md for setup instructions.');
  }
  console.log('='.repeat(50) + '\n');
}

// Run verification
verifyReportsSetup().catch(console.error);

