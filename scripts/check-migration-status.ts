/**
 * Check which migrations have been applied to the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set DATABASE_URL in .env.local');
  process.exit(1);
}

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${migrationFiles.length} migration files\n`);

    // Check if schema_migrations table exists (Supabase tracks migrations here)
    const schemaMigrationsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'supabase_migrations' 
        AND table_name = 'schema_migrations'
      )
    `);

    let appliedMigrations: string[] = [];
    
    if (schemaMigrationsExists.rows[0].exists) {
      // Get applied migrations from Supabase's tracking table
      const result = await client.query(`
        SELECT name, version, applied_at
        FROM supabase_migrations.schema_migrations
        ORDER BY version ASC
      `);
      
      appliedMigrations = result.rows.map((row: any) => row.name);
      console.log(`✅ Found ${appliedMigrations.length} applied migrations in tracking table\n`);
    } else {
      console.log('⚠️  Migration tracking table not found. Checking tables instead...\n');
      
      // Fallback: Check for key tables to infer migration status
      const keyTables = [
        'companies',
        'sites',
        'users',
        'documents',
        'obligations',
        'deadlines',
        'evidence_items',
      ];

      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = ANY($1)
        ORDER BY table_name
      `, [keyTables]);

      const existingTables = tablesResult.rows.map((row: any) => row.table_name);
      
      if (existingTables.length > 0) {
        console.log(`✅ Found ${existingTables.length} key tables in database:`);
        existingTables.forEach((table: string) => {
          console.log(`   - ${table}`);
        });
        console.log('\n⚠️  Cannot determine exact migration status without tracking table.');
        console.log('   Consider running migrations via Supabase CLI for proper tracking.\n');
      } else {
        console.log('❌ No key tables found. Database appears to be uninitialized.\n');
        console.log('   You should run all migrations from the beginning.\n');
      }
    }

    // Compare files vs applied
    console.log('📊 Migration Status:\n');
    console.log('='.repeat(80));
    
    let pendingCount = 0;
    let appliedCount = 0;

    for (const file of migrationFiles) {
      const isApplied = appliedMigrations.length > 0 
        ? appliedMigrations.includes(file)
        : null;
      
      if (isApplied === true) {
        console.log(`✅ ${file}`);
        appliedCount++;
      } else if (isApplied === false) {
        console.log(`⏳ ${file} - PENDING`);
        pendingCount++;
      } else {
        console.log(`❓ ${file} - Status unknown (no tracking table)`);
      }
    }

    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total migrations: ${migrationFiles.length}`);
    
    if (appliedMigrations.length > 0) {
      console.log(`   ✅ Applied: ${appliedCount}`);
      console.log(`   ⏳ Pending: ${pendingCount}`);
      
      if (pendingCount > 0) {
        console.log(`\n⚠️  You have ${pendingCount} pending migration(s) to apply.`);
        console.log(`   Run: supabase db push`);
        console.log(`   Or apply manually via SQL Editor in Supabase Dashboard\n`);
      } else {
        console.log(`\n✅ All migrations have been applied!\n`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error checking migration status:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure DATABASE_URL is correct and database is accessible');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkMigrationStatus().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

