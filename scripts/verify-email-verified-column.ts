/**
 * Verify email_verified column exists and check trigger
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function verify() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'email_verified';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ Column email_verified does NOT exist');
      console.log('\nAdding it now...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✅ Column added!');
    } else {
      console.log('✅ Column exists:');
      console.log('   Name:', columnCheck.rows[0].column_name);
      console.log('   Type:', columnCheck.rows[0].data_type);
      console.log('   Nullable:', columnCheck.rows[0].is_nullable);
      console.log('   Default:', columnCheck.rows[0].column_default);
    }

    // Check triggers
    console.log('\n📋 Checking triggers on auth.users...');
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
      AND event_object_table = 'users';
    `);

    console.log(`Found ${triggerCheck.rows.length} triggers:`);
    triggerCheck.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.trigger_name}`);
      console.log(`   Event: ${row.event_manipulation}`);
      console.log(`   Table: ${row.event_object_table}`);
    });

    // Check if our trigger exists
    const ourTrigger = triggerCheck.rows.find(t => t.trigger_name === 'sync_email_verified_trigger');
    if (ourTrigger) {
      console.log('\n⚠️  Found sync_email_verified_trigger');
      console.log('   This trigger tries to update users.email_verified');
      console.log('   But it only fires on UPDATE, not INSERT');
    }

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verify();

