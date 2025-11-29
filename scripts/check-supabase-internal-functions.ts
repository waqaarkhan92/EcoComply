/**
 * Check for Supabase internal functions that might be causing the issue
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

async function checkInternal() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔍 Checking for Supabase internal functions...\n');

    // Check for functions in extensions schema
    const extFunctions = await client.query(`
      SELECT 
        p.proname as function_name,
        n.nspname as schema_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname LIKE '%supabase%' OR n.nspname LIKE '%extensions%'
      ORDER BY n.nspname, p.proname;
    `);

    if (extFunctions.rows.length > 0) {
      console.log('Found Supabase extension functions:');
      extFunctions.rows.forEach(f => {
        console.log(`  - ${f.schema_name}.${f.function_name}`);
      });
    } else {
      console.log('No Supabase extension functions found');
    }

    // Check for triggers on auth.users that might call functions
    console.log('\n📋 Checking all triggers on auth.users:');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
      ORDER BY trigger_name;
    `);

    triggers.rows.forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.trigger_name}`);
      console.log(`   Timing: ${t.action_timing}`);
      console.log(`   Event: ${t.event_manipulation}`);
      console.log(`   Statement: ${t.action_statement?.substring(0, 100)}...`);
    });

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkInternal();

