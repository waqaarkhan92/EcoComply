/**
 * DIAGNOSE MIGRATION DEPENDENCIES
 * 
 * This script explains WHY foreign keys are failing:
 * - Shows which tables should exist but don't
 * - Shows which migrations create those tables
 * - Explains the dependency chain
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function diagnose() {
  console.log('🔍 DIAGNOSING MIGRATION DEPENDENCY ISSUES\n');
  console.log('='.repeat(80));
  console.log('\n');

  const client = new Client({ connectionString: DATABASE_URL });
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Tables that the failing migration references
    const referencedTables = {
      'exceedances': {
        shouldBeCreatedBy: '20250128000006_create_phase6_module2_tables.sql',
        migrationDate: 'Jan 28',
        module: 'Module 2 (Trade Effluent)',
      },
      'parameters': {
        shouldBeCreatedBy: '20250128000006_create_phase6_module2_tables.sql',
        migrationDate: 'Jan 28',
        module: 'Module 2 (Trade Effluent)',
      },
      'generators': {
        shouldBeCreatedBy: '20250128000007_create_phase7_module3_tables.sql',
        migrationDate: 'Jan 28',
        module: 'Module 3 (MCPD/Generators)',
      },
      'chain_break_alerts': {
        shouldBeCreatedBy: '20250131000001_create_module4_tables.sql',
        migrationDate: 'Jan 31',
        module: 'Module 4 (Hazardous Waste)',
      },
    };

    const failingMigration = '20250131000004_create_missing_core_tables.sql';
    const failingMigrationDate = 'Jan 31';

    console.log(`📋 Failing Migration: ${failingMigration}`);
    console.log(`   Date: ${failingMigrationDate}\n`);

    console.log('🔗 Tables Referenced by Failing Migration:\n');

    // Check if each table exists
    for (const [tableName, info] of Object.entries(referencedTables)) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);

      const exists = result.rows[0].exists;
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      const icon = exists ? '✅' : '❌';

      console.log(`   ${icon} ${tableName} - ${status}`);
      console.log(`      Should be created by: ${info.shouldBeCreatedBy}`);
      console.log(`      Migration date: ${info.migrationDate}`);
      console.log(`      Module: ${info.module}`);
      
      if (!exists) {
        console.log(`      ⚠️  PROBLEM: This table doesn't exist, so foreign key will fail!`);
      }
      console.log('');
    }

    // Check if the migrations that should create these tables exist
    console.log('\n📄 Checking if dependency migrations exist:\n');
    
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const [tableName, info] of Object.entries(referencedTables)) {
      const migrationFile = info.shouldBeCreatedBy;
      const fileExists = migrationFiles.includes(migrationFile);
      
      const status = fileExists ? '✅ EXISTS' : '❌ MISSING';
      const icon = fileExists ? '✅' : '❌';
      
      console.log(`   ${icon} ${migrationFile} - ${status}`);
      
      if (fileExists) {
        // Check if migration has been applied
        try {
          const sql = readFileSync(join(migrationsDir, migrationFile), 'utf-8');
          const createsTable = sql.includes(`CREATE TABLE ${tableName}`);
          
          if (createsTable) {
            console.log(`      ✓ Migration file contains CREATE TABLE ${tableName}`);
          } else {
            console.log(`      ⚠️  Migration file doesn't contain CREATE TABLE ${tableName}`);
          }
        } catch (error: any) {
          console.log(`      ⚠️  Could not read migration file: ${error.message}`);
        }
      }
      console.log('');
    }

    // Root cause analysis
    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 ROOT CAUSE ANALYSIS\n');
    console.log('Why foreign keys are failing:\n');
    console.log('1. Migration Order Issue:');
    console.log(`   - ${failingMigration} runs on ${failingMigrationDate}`);
    console.log('   - It references tables that should exist from earlier migrations');
    console.log('   - BUT: If those earlier migrations failed or didn\'t run, tables don\'t exist\n');
    
    console.log('2. Dependency Chain:');
    console.log('   - corrective_actions needs: exceedances, parameters, chain_break_alerts');
    console.log('   - runtime_monitoring needs: generators');
    console.log('   - These are in DIFFERENT modules (Module 2, 3, 4)');
    console.log('   - If those modules aren\'t activated, tables might not exist\n');
    
    console.log('3. Possible Scenarios:');
    console.log('   a) Earlier migrations (Jan 28) failed - tables never created');
    console.log('   b) Migration order is wrong - this migration runs before dependencies');
    console.log('   c) Modules aren\'t activated - Module 2/3/4 tables might be optional');
    console.log('');

    // Solution
    console.log('='.repeat(80));
    console.log('\n💡 THE ROBUST SOLUTION\n');
    console.log('Instead of failing, we should:');
    console.log('1. Make foreign keys CONDITIONAL (only add if table exists)');
    console.log('2. Allow migration to succeed even if dependencies don\'t exist');
    console.log('3. Create a follow-up migration to add FKs when tables are created');
    console.log('4. This allows modules to be activated in any order\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

diagnose();



