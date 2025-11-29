/**
 * Complete Reports Setup Script
 * 
 * This script sets up everything needed for report generation:
 * 1. Creates the reports storage bucket
 * 2. Applies storage bucket policies
 * 
 * Note: Database migrations must be run separately via Supabase migrations
 * 
 * Run with: npx tsx scripts/setup-reports-complete.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
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

async function setupReportsComplete() {
  console.log('🚀 Complete Reports Setup\n');
  console.log('='.repeat(60) + '\n');

  // Step 1: Create storage bucket
  console.log('📦 Step 1: Creating Storage Bucket...\n');
  
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('   ❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const existingBucket = buckets?.find(b => b.name === 'reports');
    
    if (existingBucket) {
      console.log('   ✅ Reports bucket already exists');
      console.log(`      - Public: ${existingBucket.public ? 'Yes (⚠️  should be private)' : 'No (✅ correct)'}`);
    } else {
      console.log('   Creating reports bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
        public: false, // Private bucket
      });

      if (createError) {
        if (createError.message.includes('already exists') || createError.message.includes('duplicate')) {
          console.log('   ✅ Bucket exists (created by another process)');
        } else {
          console.error('   ❌ Error creating bucket:', createError.message);
          process.exit(1);
        }
      } else {
        console.log('   ✅ Reports bucket created successfully');
      }
    }
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Step 2: Check if reports table exists
  console.log('📊 Step 2: Checking Database Tables...\n');
  
  if (!databaseUrl) {
    console.log('   ⚠️  DATABASE_URL not available, skipping table check');
    console.log('   ℹ️  Please ensure migrations are applied:\n');
    console.log('      supabase/migrations/20250128000021_create_reports_table.sql');
    console.log('      supabase/migrations/20250128000022_create_reports_rls_policies.sql\n');
  } else {
    const pgClient = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
    });

    try {
      await pgClient.connect();
      
      // Check reports table
      const tableCheck = await pgClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reports'
        );
      `);
      
      const tableExists = tableCheck.rows[0]?.exists;
      
      if (tableExists) {
        console.log('   ✅ Reports table exists');
      } else {
        console.log('   ❌ Reports table does not exist');
        console.log('   ⚠️  Please run migrations:\n');
        console.log('      supabase migration up');
        console.log('      Or apply migrations manually\n');
      }
      
      await pgClient.end();
    } catch (error: any) {
      console.log('   ⚠️  Could not check database:', error.message);
      console.log('   ℹ️  Please verify migrations are applied manually\n');
    }
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Step 3: Apply storage policies
  console.log('🔐 Step 3: Applying Storage Policies...\n');
  
  if (!databaseUrl) {
    console.log('   ⚠️  DATABASE_URL not available, cannot apply policies automatically');
    console.log('   ℹ️  Please run: npx tsx scripts/apply-reports-storage-policies-via-sql.ts');
    console.log('      Or apply manually via Supabase SQL Editor\n');
  } else {
    const pgClient = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
    });

    try {
      await pgClient.connect();
      
      // Check if reports table exists first
      const tableCheck = await pgClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reports'
        );
      `);
      
      const tableExists = tableCheck.rows[0]?.exists;
      
      if (!tableExists) {
        console.log('   ⚠️  Reports table does not exist yet.');
        console.log('   💡 Storage policies will be applied after migrations are run.');
        console.log('      They are included in: supabase/migrations/20250128000022_create_reports_rls_policies.sql\n');
        await pgClient.end();
      } else {
        console.log('   Applying storage policies...');
        
        const policiesSQL = `
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "reports_select_user_access" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_update_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_delete_admin_access" ON storage.objects;

-- SELECT POLICY - Download Reports
CREATE POLICY "reports_select_user_access" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
    )
  )
);

-- INSERT POLICY - Upload Reports (Service Role Only)
CREATE POLICY "reports_insert_service_role" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

-- UPDATE POLICY - Update Reports (Service Role Only)
CREATE POLICY "reports_update_service_role" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

-- DELETE POLICY - Delete Reports (Admin+ Only)
CREATE POLICY "reports_delete_admin_access" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'reports'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
);
        `;

        await pgClient.query(policiesSQL);
        console.log('   ✅ All storage policies applied successfully');
        await pgClient.end();
      }
    } catch (error: any) {
      console.log('   ⚠️  Error applying policies:', error.message);
      console.log('   ℹ️  Policies may already exist, or reports table is missing');
      console.log('      They will be applied when migrations run.\n');
      try {
        await pgClient.end();
      } catch {}
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Reports Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('   ✅ Storage bucket created');
  if (databaseUrl) {
    console.log('   ✅ Database tables checked');
    console.log('   ✅ Storage policies applied (or will be via migrations)');
  } else {
    console.log('   ⚠️  Database not accessible - please verify manually');
  }
  console.log('\n📝 Next steps:');
  console.log('   1. Ensure migrations are applied:');
  console.log('      supabase migration up');
  console.log('   2. Verify setup: npx tsx scripts/verify-reports-setup.ts');
  console.log('   3. Test report generation via API\n');
}

setupReportsComplete().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

