/**
 * Check for Supabase functions that might be auto-creating users
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

async function checkFunctions() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔍 Checking for functions that might cause "granting user" error...\n');

    // Check for functions in public schema that reference users table
    const functions = await client.query(`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND (
        pg_get_functiondef(p.oid) ILIKE '%users%'
        OR pg_get_functiondef(p.oid) ILIKE '%auth.users%'
        OR pg_get_functiondef(p.oid) ILIKE '%GRANT%'
        OR pg_get_functiondef(p.oid) ILIKE '%grant%'
      )
      ORDER BY p.proname;
    `);

    console.log(`Found ${functions.rows.length} functions that might be related:\n`);
    functions.rows.forEach((f, i) => {
      console.log(`${i + 1}. ${f.function_name}`);
      const def = f.definition || '';
      // Show first few lines that mention users or grant
      const relevantLines = def.split('\n').filter((l: string) => 
        l.toLowerCase().includes('users') || 
        l.toLowerCase().includes('grant') ||
        l.toLowerCase().includes('insert')
      ).slice(0, 5);
      if (relevantLines.length > 0) {
        console.log('   Relevant lines:');
        relevantLines.forEach((line: string) => {
          console.log(`   ${line.trim().substring(0, 100)}`);
        });
      }
      console.log('');
    });

    // Check for triggers on auth.users INSERT
    console.log('\n📋 Checking for INSERT triggers on auth.users:');
    const insertTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
      AND event_manipulation = 'INSERT';
    `);

    if (insertTriggers.rows.length > 0) {
      console.log(`Found ${insertTriggers.rows.length} INSERT triggers:`);
      insertTriggers.rows.forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.trigger_name}`);
        console.log(`   Timing: ${t.action_timing}`);
        console.log(`   Statement: ${t.action_statement?.substring(0, 200)}...`);
      });
    } else {
      console.log('   ✅ No INSERT triggers found (good)');
    }

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkFunctions();

