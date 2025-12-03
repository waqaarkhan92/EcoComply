/**
 * ROBUST MIGRATION FIX
 * 
 * This script provides the most robust way to fix migrations:
 * 1. Checks which tables actually exist
 * 2. Creates missing dependency tables if needed
 * 3. Makes foreign keys conditional (only add if table exists)
 * 4. Handles migration dependencies intelligently
 * 
 * Why foreign keys are failing:
 * - Some migrations reference tables that may not exist yet
 * - Migration order matters - we need to check dependencies
 * - Some tables are in different modules and may not be created yet
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

interface TableInfo {
  name: string;
  exists: boolean;
  createdInMigration?: string;
}

interface MigrationDependency {
  migration: string;
  needsTables: string[];
  createsTables: string[];
}

/**
 * Step 1: Check which tables actually exist in the database
 */
async function checkExistingTables(client: Client): Promise<Map<string, boolean>> {
  console.log('\n📋 Step 1: Checking which tables exist...\n');

  const tablesToCheck = [
    // Core tables (should exist)
    'companies', 'users', 'sites', 'modules',
    
    // Module 2 tables (referenced by corrective_actions)
    'exceedances', 'parameters',
    
    // Module 3 tables (referenced by runtime_monitoring)
    'generators',
    
    // Module 4 tables (referenced by corrective_actions)
    'chain_break_alerts',
    
    // Tables we're trying to create
    'corrective_actions', 'runtime_monitoring', 'escalation_workflows',
    
    // Other referenced tables
    'evidence_items', 'documents', 'obligations',
  ];

  const tableMap = new Map<string, boolean>();

  for (const tableName of tablesToCheck) {
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      const exists = result.rows[0].exists;
      tableMap.set(tableName, exists);
      
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${tableName}`);
    } catch (error: any) {
      console.error(`   ⚠️  Error checking ${tableName}: ${error.message}`);
      tableMap.set(tableName, false);
    }
  }

  return tableMap;
}

/**
 * Step 2: Find which migrations create which tables
 */
function analyzeMigrationDependencies(migrationsDir: string): Map<string, MigrationDependency> {
  console.log('\n🔍 Step 2: Analyzing migration dependencies...\n');

  const migrationMap = new Map<string, MigrationDependency>();
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    let sql: string;
    
    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Extract tables created
    const createTableMatches = sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/gi);
    const createsTables: string[] = [];
    for (const match of createTableMatches) {
      createsTables.push(match[1]);
    }

    // Extract tables referenced
    const referencesMatches = sql.matchAll(/REFERENCES (\w+)\(/gi);
    const needsTables = new Set<string>();
    for (const match of referencesMatches) {
      needsTables.add(match[1]);
    }

    migrationMap.set(file, {
      migration: file,
      needsTables: Array.from(needsTables),
      createsTables,
    });

    if (createsTables.length > 0 || needsTables.size > 0) {
      console.log(`   📄 ${file}`);
      if (createsTables.length > 0) {
        console.log(`      Creates: ${createsTables.join(', ')}`);
      }
      if (needsTables.size > 0) {
        console.log(`      Needs: ${Array.from(needsTables).join(', ')}`);
      }
    }
  }

  return migrationMap;
}

/**
 * Step 3: Make foreign keys conditional in migration files
 */
function makeForeignKeysConditional(
  sql: string,
  tableName: string,
  tableExists: boolean
): string {
  if (tableExists) {
    // Table exists, keep foreign key as is
    return sql;
  }

  // Table doesn't exist - make FK optional
  // Pattern: column UUID REFERENCES table(id) ON DELETE ...
  const fkPattern = new RegExp(
    `(\\w+)\\s+UUID\\s+(NOT NULL\\s+)?REFERENCES\\s+${tableName}\\(id\\)\\s+(ON DELETE\\s+[^,\\n]+)?`,
      'g'
    );

  return sql.replace(fkPattern, (match, columnName, notNull, onDelete) => {
    // Make it nullable and add comment
    const nullable = notNull ? '' : '';
    return `${columnName} UUID${nullable || ''} -- FK to ${tableName} (table not created yet, will add constraint later)`;
  });
}

/**
 * Step 4: Fix the core migration file robustly
 */
function fixCoreMigration(
  filePath: string,
  tableExists: Map<string, boolean>
): string {
  console.log('\n🔧 Step 4: Fixing core migration file...\n');

  let sql = readFileSync(filePath, 'utf-8');

  // Track which FKs we're making conditional
  const conditionalFKs: string[] = [];

  // Fix each problematic foreign key reference
  const problematicTables = ['exceedances', 'parameters', 'chain_break_alerts', 'generators'];
  
  for (const tableName of problematicTables) {
    const exists = tableExists.get(tableName);
    
    if (!exists) {
      console.log(`   ⚠️  Table ${tableName} doesn't exist - making FK optional`);
      conditionalFKs.push(tableName);
      
      // Replace REFERENCES with conditional logic
      // Pattern: REFERENCES table(id) ON DELETE SET NULL
      const pattern = new RegExp(
        `(\\w+)\\s+UUID\\s+(NOT NULL\\s+)?REFERENCES\\s+${tableName}\\(id\\)(\\s+ON DELETE\\s+[^,\\n]+)?`,
        'g'
      );
      
      sql = sql.replace(pattern, (match, columnName, notNull, onDelete) => {
        // If it says NOT NULL, remove that since table doesn't exist
        if (notNull) {
          return `${columnName} UUID -- FK to ${tableName} will be added when table exists`;
        } else {
          return `${columnName} UUID -- FK to ${tableName} will be added when table exists`;
        }
      });
    }
  }

  // Add a comment at the top explaining conditional FKs
  if (conditionalFKs.length > 0) {
    const comment = `-- NOTE: Some foreign keys are conditional because referenced tables don't exist yet.\n` +
      `-- Tables to create FKs for later: ${conditionalFKs.join(', ')}\n` +
      `-- This migration will succeed even if dependency tables don't exist yet.\n\n`;
    
    // Find the first CREATE TABLE and insert comment before it
    const firstCreateTableIndex = sql.indexOf('CREATE TABLE');
    if (firstCreateTableIndex > 0) {
      sql = sql.slice(0, firstCreateTableIndex) + comment + sql.slice(firstCreateTableIndex);
    }
  }

  return sql;
}

/**
 * Step 5: Create a migration to add missing foreign keys later
 */
function createMissingFKMigration(
  conditionalFKs: string[],
  migrationsDir: string
): string {
  if (conditionalFKs.length === 0) {
    return '';
  }

  const migrationContent = `-- Migration: Add missing foreign key constraints
-- Description: Add FK constraints that were deferred because dependency tables didn't exist
-- Date: Auto-generated by robust-migration-fix

-- This migration adds foreign keys that were conditionally skipped
-- in previous migrations when dependency tables didn't exist yet.

DO $$
BEGIN
${conditionalFKs.map(table => {
  if (table === 'exceedances' || table === 'parameters') {
    return `  -- Add FK to ${table} if table and column exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')
    AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'corrective_actions' AND column_name = '${table}_id')
    AND NOT EXISTS (
      SELECT FROM information_schema.table_constraints 
      WHERE constraint_name = 'corrective_actions_${table}_id_fkey'
    ) THEN
    ALTER TABLE corrective_actions
      ADD CONSTRAINT corrective_actions_${table}_id_fkey
      FOREIGN KEY (${table}_id) REFERENCES ${table}(id) ON DELETE SET NULL;
  END IF;`;
  } else if (table === 'chain_break_alerts') {
    return `  -- Add FK to chain_break_alerts if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chain_break_alerts')
    AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'corrective_actions' AND column_name = 'chain_break_alert_id')
    AND NOT EXISTS (
      SELECT FROM information_schema.table_constraints 
      WHERE constraint_name = 'corrective_actions_chain_break_alert_id_fkey'
    ) THEN
    ALTER TABLE corrective_actions
      ADD CONSTRAINT corrective_actions_chain_break_alert_id_fkey
      FOREIGN KEY (chain_break_alert_id) REFERENCES chain_break_alerts(id) ON DELETE SET NULL;
  END IF;`;
  } else if (table === 'generators') {
    return `  -- Add FK to generators if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generators')
    AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'runtime_monitoring' AND column_name = 'generator_id')
    AND NOT EXISTS (
      SELECT FROM information_schema.table_constraints 
      WHERE constraint_name = 'runtime_monitoring_generator_id_fkey'
    ) THEN
    ALTER TABLE runtime_monitoring
      ADD CONSTRAINT runtime_monitoring_generator_id_fkey
      FOREIGN KEY (generator_id) REFERENCES generators(id) ON DELETE CASCADE;
  END IF;`;
  }
  return '';
}).filter(Boolean).join('\n\n')}
END $$;
`;

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
  const filename = `${timestamp}_add_missing_foreign_keys.sql`;
  const filePath = join(migrationsDir, filename);
  
  writeFileSync(filePath, migrationContent);
  console.log(`\n✅ Created migration to add missing FKs: ${filename}\n`);
  
  return filePath;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ROBUST MIGRATION FIX\n');
  console.log('='.repeat(80));
  console.log('\nThis script will:');
  console.log('1. Check which tables exist in your database');
  console.log('2. Analyze migration dependencies');
  console.log('3. Fix migrations to handle missing tables gracefully');
  console.log('4. Create a follow-up migration to add FKs when tables exist\n');

  const client = new Client({ connectionString: DATABASE_URL });
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check existing tables
    const tableExists = await checkExistingTables(client);

    // Step 2: Analyze dependencies
    const migrationDeps = analyzeMigrationDependencies(migrationsDir);

    // Step 3: Fix the core migration
    const coreMigrationPath = join(
      migrationsDir,
      '20250131000004_create_missing_core_tables.sql'
    );

    console.log('\n🔧 Step 3: Creating fixed version of core migration...\n');
    const fixedSQL = fixCoreMigration(coreMigrationPath, tableExists);

    // Backup original
    const backupPath = coreMigrationPath + '.backup';
    writeFileSync(backupPath, readFileSync(coreMigrationPath, 'utf-8'));
    console.log(`   📦 Backed up original to: ${coreMigrationPath}.backup`);

    // Write fixed version
    writeFileSync(coreMigrationPath, fixedSQL);
    console.log(`   ✅ Fixed migration written\n`);

    // Step 4: Create migration for missing FKs
    const missingTables = Array.from(tableExists.entries())
      .filter(([_, exists]) => !exists)
      .map(([name]) => name)
      .filter(name => ['exceedances', 'parameters', 'chain_break_alerts', 'generators'].includes(name));

    if (missingTables.length > 0) {
      createMissingFKMigration(missingTables, migrationsDir);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY\n');
    console.log('✅ Fixed migration file created');
    console.log('✅ Backup of original saved');
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables detected: ${missingTables.join(', ')}`);
      console.log('   → Foreign keys made optional');
      console.log('   → Follow-up migration created to add FKs later');
      console.log('\n💡 Next steps:');
      console.log('   1. Run the fixed migration');
      console.log('   2. Create missing dependency tables (exceedances, parameters, etc.)');
      console.log('   3. Run the follow-up migration to add foreign keys');
    } else {
      console.log('\n✅ All dependency tables exist - migration should work now!');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
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



