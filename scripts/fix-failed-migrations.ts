/**
 * Fix and apply failed migrations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function createHelperViews(client: Client) {
  console.log('📋 Creating helper views...\n');

  const helperViewsPath = join(process.cwd(), 'supabase', 'migrations', '20250201000000_create_helper_views.sql');
  
  try {
    const sql = readFileSync(helperViewsPath, 'utf-8');
    await client.query(sql);
    console.log('✅ Created helper views (user_site_access, user_company_access)\n');
  } catch (error: any) {
    if (error.message.includes('already exists') || error.code === '42P07') {
      console.log('⚠️  Helper views may already exist, continuing...\n');
    } else {
      console.error(`❌ Error creating helper views: ${error.message}\n`);
      throw error;
    }
  }
}

async function fixCostTrackingMigration(client: Client) {
  console.log('🔧 Fixing cost tracking migration...\n');

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const filePath = join(migrationsDir, '20250129000001_add_cost_tracking_to_extraction_logs.sql');
  
  let sql = readFileSync(filePath, 'utf-8');
  
  // Fix: Remove the problematic index on DATE_TRUNC and replace with a simpler one
  const problematicIndex = `CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_month ON extraction_logs(DATE_TRUNC('month', created_at));`;
  
  if (sql.includes(problematicIndex)) {
    // Replace with a functional index that uses immutable functions
    sql = sql.replace(
      problematicIndex,
      `-- Index for monthly analytics (using extract for immutability)
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_month ON extraction_logs(
  EXTRACT(YEAR FROM created_at),
  EXTRACT(MONTH FROM created_at)
);`
    );
    
    writeFileSync(filePath, sql);
    console.log('✅ Fixed cost tracking migration (DATE_TRUNC index issue)\n');
  } else {
    console.log('⚠️  Cost tracking migration already fixed or doesn\'t have the issue\n');
  }
}

async function applyFailedMigrations(client: Client) {
  console.log('🚀 Applying previously failed migrations...\n');

  // Apply in dependency order
  const failedMigrations = [
    // First: Create helper views
    '20250201000000_create_helper_views.sql',
    // Then: Fix cost tracking
    '20250129000001_add_cost_tracking_to_extraction_logs.sql',
    // Then: Module 4 tables (depends on helper views)
    '20250131000001_create_module4_tables.sql',
    // Missing core tables
    '20250131000004_create_missing_core_tables.sql',
    // Module 1 advanced
    '20250131000003_create_module1_advanced_tables.sql',
    // Phase 4 advanced (depends on corrective_actions)
    '20250201000001_create_phase4_advanced_tables.sql',
    // Phase 5 cross-cutting
    '20250201000002_create_phase5_cross_cutting_tables.sql',
    // Recurrence advanced (creates recurrence_trigger_rules)
    '20250201000003_create_recurrence_advanced_tables.sql',
    // Permit workflows
    '20250201000004_create_permit_workflows_tables.sql',
    // Monthly statements
    '20250201000005_create_monthly_statements_tables.sql',
    // Condition evidence
    '20250201000006_create_condition_evidence_tables.sql',
    // Condition permissions
    '20250201000007_create_condition_permissions_table.sql',
    // Consent states
    '20250201000008_create_consent_states_table.sql',
    // Regulation thresholds
    '20250201000009_create_regulation_thresholds_tables.sql',
    // Recurrence trigger executions (depends on recurrence_trigger_rules)
    '20250201000013_create_recurrence_trigger_executions.sql',
    // Module 4 validation (depends on waste_streams)
    '20250201000015_create_module4_validation_tables.sql',
    // Missing RLS policies (depends on recurrence_trigger_executions)
    '20250201000017_create_missing_rls_policies.sql',
    // Notification tables (last)
    '99999999999999_create_notification_tables.sql',
  ];

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < failedMigrations.length; i++) {
    const file = failedMigrations[i];
    const filePath = join(migrationsDir, file);

    // Skip helper views as we already applied them
    if (file === '20250201000000_create_helper_views.sql') {
      continue;
    }

    console.log(`[${i + 1}/${failedMigrations.length}] Processing: ${file}`);

    try {
      const sql = readFileSync(filePath, 'utf-8');
      
      if (!sql.trim()) {
        console.log(`   ⚠️  Skipping empty file\n`);
        continue;
      }

      await client.query(sql);
      console.log(`   ✅ Successfully applied\n`);
      successCount++;
    } catch (error: any) {
      const isAlreadyExists = error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.code === '42P07' ||
        error.code === '42710';

      if (isAlreadyExists) {
        console.log(`   ⚠️  Already exists: ${error.message.split('\n')[0]}\n`);
        successCount++;
      } else {
        console.error(`   ❌ Error: ${error.message.split('\n')[0]}\n`);
        errors.push({ file, error: error.message });
        errorCount++;
      }
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('\n📊 Fix Results:\n');
  console.log(`   ✅ Successfully applied: ${successCount}/${failedMigrations.length}`);
  
  if (errorCount > 0) {
    console.log(`   ❌ Still failing: ${errorCount}`);
    console.log('\n⚠️  Migrations still needing manual attention:');
    errors.forEach(({ file, error }) => {
      console.log(`   - ${file}`);
      console.log(`     ${error.split('\n')[0]}`);
    });
  } else {
    console.log('\n✅ All previously failed migrations now applied!');
  }
  console.log('');
}

async function main() {
  console.log('🔧 Fixing Failed Migrations\n');
  console.log('='.repeat(80));
  console.log('');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Create helper views (must be first)
    await createHelperViews(client);

    // Step 2: Fix known issues
    await fixCostTrackingMigration(client);

    // Step 3: Apply failed migrations in dependency order
    await applyFailedMigrations(client);

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
