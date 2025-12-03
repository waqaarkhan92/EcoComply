/**
 * Apply all pending migrations to the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';
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

async function applyAllMigrations() {
  console.log('🚀 Starting migration process...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all migration files in order
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Sort by filename (which includes timestamp)

    console.log(`📋 Found ${migrationFiles.length} migration files to process\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    // Apply each migration
    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = join(migrationsDir, file);

      console.log(`[${i + 1}/${migrationFiles.length}] Processing: ${file}`);

      try {
        // Read migration file
        const sql = readFileSync(filePath, 'utf-8');

        if (!sql.trim()) {
          console.log(`   ⚠️  Skipping empty file\n`);
          continue;
        }

        // Execute migration
        await client.query(sql);
        console.log(`   ✅ Successfully applied\n`);
        successCount++;
      } catch (error: any) {
        // Check if error is because object already exists (migration already applied)
        const isAlreadyExists = error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710';   // duplicate_object

        if (isAlreadyExists) {
          console.log(`   ⚠️  Already exists (may have been applied previously): ${error.message.split('\n')[0]}\n`);
          successCount++; // Count as success since it's already applied
        } else {
          console.error(`   ❌ Error: ${error.message.split('\n')[0]}\n`);
          errors.push({ file, error: error.message });
          errorCount++;
        }
      }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 Migration Summary:\n');
    console.log(`   ✅ Successfully processed: ${successCount}/${migrationFiles.length}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
      console.log('\n⚠️  Failed migrations:');
      errors.forEach(({ file, error }) => {
        console.log(`   - ${file}`);
        console.log(`     ${error.split('\n')[0]}`);
      });
    } else {
      console.log('\n✅ All migrations processed successfully!');
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure DATABASE_URL is correct and database is accessible');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyAllMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

