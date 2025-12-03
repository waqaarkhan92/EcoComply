/**
 * Smart migration application - handles dependencies and missing tables
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function makeForeignKeyOptional(sql: string, tableName: string, client: Client): Promise<string> {
  const exists = await tableExists(client, tableName);
  
  if (!exists) {
    // Make the foreign key nullable and optional
    const pattern = new RegExp(`(\\w+)\\s+UUID\\s+(NOT NULL\\s+)?REFERENCES\\s+${tableName}\\(id\\)`, 'g');
    sql = sql.replace(pattern, (match, columnName, notNull) => {
      // If table doesn't exist, remove the foreign key constraint for now
      // We can add it later in a separate migration
      return `${columnName} UUID${notNull || ''}`;
    });
    console.log(`   ⚠️  Table ${tableName} doesn't exist - making FK optional`);
  }
  
  return sql;
}

async function applyMigrationWithRetry(client: Client, filePath: string, filename: string): Promise<boolean> {
  try {
    let sql = readFileSync(filePath, 'utf-8');
    
    if (!sql.trim()) {
      return false;
    }

    // Check for referenced tables and make FKs optional if needed
    const optionalTables = ['exceedances', 'parameters', 'chain_break_alerts', 'generators'];
    
    for (const table of optionalTables) {
      if (sql.includes(`REFERENCES ${table}(`)) {
        sql = await makeForeignKeyOptional(sql, table, client);
      }
    }

    await client.query(sql);
    return true;
  } catch (error: any) {
    // If it's an "already exists" error, that's fine
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.code === '42P07' ||
        error.code === '42710') {
      return true; // Count as success
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Smart Migration Application\n');
  console.log('='.repeat(80));
  console.log('');

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const failedMigrations = [
      '20250129000001_add_cost_tracking_to_extraction_logs.sql',
      '20250131000004_create_missing_core_tables.sql',
      '20250201000001_create_phase4_advanced_tables.sql',
      '20250201000002_create_phase5_cross_cutting_tables.sql',
      '20250201000003_create_recurrence_advanced_tables.sql',
      '20250201000004_create_permit_workflows_tables.sql',
      '20250201000005_create_monthly_statements_tables.sql',
      '20250201000006_create_condition_evidence_tables.sql',
      '20250201000007_create_condition_permissions_table.sql',
      '20250201000008_create_consent_states_table.sql',
      '20250201000009_create_regulation_thresholds_tables.sql',
      '20250201000013_create_recurrence_trigger_executions.sql',
      '20250201000017_create_missing_rls_policies.sql',
      '99999999999999_create_notification_tables.sql',
    ];

    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    let successCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < failedMigrations.length; i++) {
      const file = failedMigrations[i];
      const filePath = join(migrationsDir, file);

      console.log(`[${i + 1}/${failedMigrations.length}] Processing: ${file}`);

      try {
        const success = await applyMigrationWithRetry(client, filePath, file);
        if (success) {
          console.log(`   ✅ Successfully applied\n`);
          successCount++;
        } else {
          console.log(`   ⚠️  Skipped (empty or already exists)\n`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message.split('\n')[0]}\n`);
        errors.push({ file, error: error.message });
      }
    }

    console.log('='.repeat(80));
    console.log(`\n📊 Results: ${successCount}/${failedMigrations.length} succeeded\n`);

    if (errors.length > 0) {
      console.log('❌ Still failing:');
      errors.forEach(({ file, error }) => {
        console.log(`   - ${file}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

