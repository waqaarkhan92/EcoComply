/**
 * Run Notification Tables Migration
 * Executes the SQL migration to create notification_templates and dead_letter_queue tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/99999999999999_create_notification_tables.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration file loaded');
  console.log('🔌 Connecting to Supabase...');

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;

      try {
        console.log(`   [${i + 1}/${statements.length}] Executing statement...`);
        
        // Use RPC to execute raw SQL (if available) or use direct query
        const { error } = await Promise.resolve(supabase.rpc('exec_sql', { sql: statement })).catch(async () => {
          // Fallback: Try direct query via REST API
          // Note: Supabase JS client doesn't support raw SQL directly
          // We'll need to use the REST API or pg client
          throw new Error('RPC not available');
        });

        if (error) {
          // Try alternative method: Use pg client if available
          console.log('   ⚠️  RPC method not available, trying alternative...');
          throw error;
        }

        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      } catch (error: any) {
        // If RPC doesn't work, we need to use a different approach
        console.error(`   ❌ Error executing statement ${i + 1}:`, error.message);
        console.log('\n💡 Alternative: Run the migration manually via Supabase Dashboard SQL Editor');
        console.log('   Or use psql with your database connection string\n');
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Created tables:');
    console.log('   - notification_templates');
    console.log('   - dead_letter_queue');
    console.log('\n✨ Next steps:');
    console.log('   1. Verify tables exist in Supabase Dashboard');
    console.log('   2. Test notification delivery job');
    console.log('   3. Configure Resend webhook URL');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 To run manually:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: supabase/migrations/99999999999999_create_notification_tables.sql');
    console.log('   3. Paste and execute');
    process.exit(1);
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

