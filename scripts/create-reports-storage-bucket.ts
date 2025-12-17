/**
 * Create Reports Storage Bucket
 * 
 * This script creates the 'reports' storage bucket in Supabase Storage
 * and applies the necessary policies.
 * 
 * Run with: npx tsx scripts/create-reports-storage-bucket.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Read environment variables directly (don't use env validation)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file or environment.');
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function createReportsBucket() {
  console.log('🚀 Creating Reports Storage Bucket...\n');

  try {
    // 1. Check if bucket already exists
    console.log('1. Checking if bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('   ❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const existingBucket = buckets?.find(b => b.name === 'reports');
    
    if (existingBucket) {
      console.log('   ✅ Reports bucket already exists');
      console.log(`      - ID: ${existingBucket.id}`);
      console.log(`      - Public: ${existingBucket.public ? 'Yes' : 'No'}`);
      
      if (existingBucket.public) {
        console.log('   ⚠️  Warning: Bucket is public but should be private!');
        console.log('      Please make it private in Supabase Dashboard > Storage > reports > Settings');
      }
    } else {
      // 2. Create the bucket
      console.log('   ❌ Bucket not found. Creating...');
      
      // Create bucket with minimal config (file size limits can be set via dashboard)
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
        public: false, // Private bucket
      });

      if (createError) {
        console.error('   ❌ Error creating bucket:', createError.message);
        
        // Check if error is about bucket already existing (race condition)
        if (createError.message.includes('already exists') || createError.message.includes('duplicate')) {
          console.log('   ℹ️  Bucket may have been created by another process. Continuing...');
        } else {
          process.exit(1);
        }
      } else {
        console.log('   ✅ Reports bucket created successfully');
        console.log(`      - Name: ${newBucket?.name || 'N/A'}`);
      }
    }

    // 3. Apply storage policies
    console.log('\n2. Applying storage policies...');
    
    const policiesPath = path.join(__dirname, 'setup-reports-storage-policies.sql');
    
    if (!fs.existsSync(policiesPath)) {
      console.log('   ⚠️  Policies SQL file not found. Skipping policy creation.');
      console.log('   ℹ️  You can apply policies manually by running:');
      console.log(`      ${policiesPath}`);
    } else {
      const policiesSQL = fs.readFileSync(policiesPath, 'utf-8');
      
      // Note: Storage policies need to be created via SQL, not the JS client
      // We'll output the SQL for the user to run
      console.log('   ⚠️  Storage policies must be applied via SQL.');
      console.log('   ℹ️  Please run the following SQL in Supabase SQL Editor:');
      console.log('\n' + '─'.repeat(60));
      console.log(policiesSQL);
      console.log('─'.repeat(60) + '\n');
    }

    // 4. Verify bucket is accessible
    console.log('3. Verifying bucket access...');
    
    // Try to list files (should work with service role)
    const { data: files, error: listFilesError } = await supabase.storage
      .from('reports')
      .list('', { limit: 1 });

    if (listFilesError) {
      console.log('   ⚠️  Could not list files:', listFilesError.message);
      console.log('   ℹ️  This might be expected if policies are not yet applied.');
    } else {
      console.log('   ✅ Bucket is accessible');
      console.log(`      - Files in bucket: ${files?.length || 0}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Reports Storage Bucket Setup Complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Apply storage policies (see SQL above)');
    console.log('2. Run: npx tsx scripts/verify-reports-setup.ts');
    console.log('3. Test report generation\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createReportsBucket().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

