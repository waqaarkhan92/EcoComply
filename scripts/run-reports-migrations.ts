/**
 * Run Reports Migrations
 * 
 * This script automatically applies the reports-related migrations:
 * - 20250128000021_create_reports_table.sql
 * - 20250128000022_create_reports_rls_policies.sql
 * 
 * Run with: npx tsx scripts/run-reports-migrations.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set DATABASE_URL in .env.local');
  process.exit(1);
}

const migrations = [
  {
    file: 'supabase/migrations/20250128000021_create_reports_table.sql',
    name: 'Create Reports Table',
    description: 'Creates the reports table with all necessary columns and indexes',
  },
  {
    file: 'supabase/migrations/20250128000022_create_reports_rls_policies.sql',
    name: 'Create Reports RLS Policies',
    description: 'Creates RLS policies for the reports table',
  },
];

async function checkTableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName]);
  
  return result.rows[0]?.exists || false;
}

async function checkPolicyExists(client: Client, policyName: string, tableName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = $1 
      AND policyname = $2
    );
  `, [tableName, policyName]);
  
  return result.rows[0]?.exists || false;
}

async function runMigrations() {
  console.log('🚀 Running Reports Migrations\n');
  console.log('='.repeat(60) + '\n');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      const migrationPath = path.join(process.cwd(), migration.file);

      console.log(`📄 Migration ${i + 1}/${migrations.length}: ${migration.name}`);
      console.log(`   ${migration.description}\n`);

      // Check if migration file exists
      if (!fs.existsSync(migrationPath)) {
        console.error(`   ❌ Migration file not found: ${migration.file}`);
        console.error(`   Please ensure the file exists in the repository.\n`);
        continue;
      }

      // Read migration SQL
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Check if migration has already been applied
      if (migration.file.includes('create_reports_table')) {
        const tableExists = await checkTableExists(client, 'reports');
        if (tableExists) {
          console.log('   ⚠️  Reports table already exists, skipping...');
          console.log('   ✅ Migration already applied\n');
          continue;
        }
      } else if (migration.file.includes('create_reports_rls_policies')) {
        const tableExists = await checkTableExists(client, 'reports');
        if (!tableExists) {
          console.log('   ⚠️  Reports table does not exist yet.');
          console.log('   ⚠️  Please run the previous migration first.\n');
          continue;
        }
        
        // Check if at least one policy exists
        const policyExists = await checkPolicyExists(client, 'reports_select_user_access', 'reports');
        if (policyExists) {
          console.log('   ⚠️  Reports RLS policies already exist, skipping...');
          console.log('   ✅ Migration already applied\n');
          continue;
        }
      }

      // Execute migration
      console.log('   Executing migration SQL...');
      
      try {
        await client.query('BEGIN');
        
        // Handle CREATE TABLE separately to handle trigger gracefully
        if (migration.file.includes('create_reports_table')) {
          // First check if update_updated_at_column function exists
          const functionCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public'
              AND p.proname = 'update_updated_at_column'
            );
          `);
          
          const functionExists = functionCheck.rows[0]?.exists;
          
          // Extract CREATE TABLE statement (everything before the trigger)
          const createTableMatch = sql.match(/CREATE TABLE reports[^;]+;/s);
          if (createTableMatch) {
            await client.query(createTableMatch[0]);
            console.log('   ✅ Created reports table');
          }
          
          // Create indexes
          const indexStatements = sql.match(/CREATE INDEX[^;]+;/g);
          if (indexStatements) {
            for (const indexSQL of indexStatements) {
              try {
                await client.query(indexSQL);
              } catch (err: any) {
                if (!err.message.includes('already exists')) {
                  throw err;
                }
              }
            }
            console.log(`   ✅ Created ${indexStatements.length} indexes`);
          }
          
          // Create trigger only if function exists
          if (functionExists) {
            const triggerMatch = sql.match(/CREATE TRIGGER[^;]+;/s);
            if (triggerMatch) {
              try {
                await client.query(triggerMatch[0]);
                console.log('   ✅ Created updated_at trigger');
              } catch (err: any) {
                if (!err.message.includes('already exists')) {
                  console.log('   ⚠️  Could not create trigger (non-fatal)');
                }
              }
            }
          } else {
            console.log('   ⚠️  update_updated_at_column function not found, skipping trigger');
            console.log('   ℹ️  Table will still work, but updated_at won\'t auto-update');
          }
        } else {
          // For RLS policies, execute all statements
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.trim().startsWith('--') && !s.trim().startsWith('='));

          for (const statement of statements) {
            if (statement.trim().length === 0) continue;
            
            try {
              await client.query(statement + ';');
            } catch (err: any) {
              // Ignore "already exists" errors
              if (err.message.includes('already exists') || 
                  err.message.includes('duplicate') ||
                  err.code === '42P07' || // duplicate_table
                  err.code === '42710') { // duplicate_object
                // Continue
              } else {
                throw err;
              }
            }
          }
        }
        
        await client.query('COMMIT');
        
        console.log('   ✅ Migration applied successfully\n');
        
      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Error applying migration: ${error.message}`);
        console.error(`   Error details: ${error.stack?.split('\n')[0]}`);
        
        // Check if it's a "already exists" error
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07' ||
            error.code === '42710') {
          console.log('   ℹ️  Migration appears to have been partially applied');
          console.log('   ✅ Continuing with next migration...\n');
        } else {
          console.error(`\n❌ Migration failed. Stopping.\n`);
          throw error;
        }
      }
    }

    // Verify migrations were applied
    console.log('📋 Verifying migrations...\n');
    
    const tableExists = await checkTableExists(client, 'reports');
    if (tableExists) {
      console.log('   ✅ Reports table exists');
      
      // Check for key policies
      const policies = [
        'reports_select_user_access',
        'reports_insert_staff_access',
        'reports_update_staff_access',
        'reports_delete_admin_access',
      ];
      
      let policiesFound = 0;
      for (const policyName of policies) {
        const exists = await checkPolicyExists(client, policyName, 'reports');
        if (exists) {
          policiesFound++;
        }
      }
      
      if (policiesFound > 0) {
        console.log(`   ✅ Found ${policiesFound}/${policies.length} RLS policies`);
      } else {
        console.log('   ⚠️  RLS policies not found (may need to run second migration)');
      }
    } else {
      console.log('   ❌ Reports table not found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Reports Migrations Complete!');
    console.log('='.repeat(60));
    console.log('\n📝 Next steps:');
    console.log('   1. Apply storage policies: npx tsx scripts/apply-reports-storage-policies-via-sql.ts');
    console.log('   2. Verify setup: npx tsx scripts/verify-reports-setup.ts');
    console.log('   3. Test report generation via API\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations().catch(console.error);

