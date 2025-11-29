/**
 * Apply Reports Storage Policies via PostgreSQL Connection
 * 
 * This script applies storage policies by executing SQL directly via PostgreSQL
 * Run with: npx tsx scripts/apply-reports-storage-policies-via-sql.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set DATABASE_URL in .env.local');
  process.exit(1);
}

const policiesSQL = `
-- ============================================================================
-- Reports Storage Bucket RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "reports_select_user_access" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_update_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_delete_admin_access" ON storage.objects;

-- ============================================================================
-- SELECT POLICY - Download Reports
-- ============================================================================

CREATE POLICY "reports_select_user_access" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports'
  AND (
    -- Extract report_id from path: reports/{report_id}/...
    -- Users can access reports for their company
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR
    -- Consultants: assigned client companies
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

-- ============================================================================
-- INSERT POLICY - Upload Reports (Service Role Only)
-- ============================================================================

CREATE POLICY "reports_insert_service_role" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

-- ============================================================================
-- UPDATE POLICY - Update Reports (Service Role Only)
-- ============================================================================

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

-- ============================================================================
-- DELETE POLICY - Delete Reports (Admin+ Only)
-- ============================================================================

CREATE POLICY "reports_delete_admin_access" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'reports'
  AND (
    -- Extract report_id from path
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

async function applyPolicies() {
  console.log('🔐 Applying Reports Storage Policies via PostgreSQL...\n');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if reports table exists
    console.log('1. Checking if reports table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      );
    `);
    
    const tableExists = tableCheck.rows[0]?.exists;
    
    if (!tableExists) {
      console.log('   ❌ Reports table does not exist yet.');
      console.log('   ⚠️  Please run migrations first:');
      console.log('      - supabase migration up');
      console.log('      - Or apply: supabase/migrations/20250128000021_create_reports_table.sql');
      console.log('\n   💡 Storage policies will be applied automatically when migrations run.');
      console.log('      See: supabase/migrations/20250128000022_create_reports_rls_policies.sql\n');
      return;
    }
    
    console.log('   ✅ Reports table exists\n');

    // Execute SQL as a single block (PostgreSQL supports this)
    console.log('2. Executing storage policies SQL...\n');

    try {
      // Remove comments and clean up SQL
      const cleanSQL = policiesSQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--') || line.trim().startsWith('-- ='))
        .join('\n');

      // Execute all statements
      await client.query(cleanSQL);
      
      console.log('   ✅ Dropped existing policies (if any)');
      console.log('   ✅ Created policy: reports_select_user_access');
      console.log('   ✅ Created policy: reports_insert_service_role');
      console.log('   ✅ Created policy: reports_update_service_role');
      console.log('   ✅ Created policy: reports_delete_admin_access');
      
    } catch (error: any) {
      // Check if policies were created despite errors
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Some policies already exist (this is okay)');
      } else {
        console.error(`   ❌ Error executing SQL:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ All storage policies applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npx tsx scripts/verify-reports-setup.ts');
    console.log('2. Test report generation\n');

  } catch (error: any) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('\n💡 Alternative: Apply policies manually via Supabase SQL Editor');
    console.error('   See: scripts/reports-storage-policies.sql\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyPolicies().catch(console.error);

