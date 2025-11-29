/**
 * Find the root cause of the email_verified error
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

async function findRootCause() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔍 Finding root cause...\n');

    // 1. Check ALL triggers on auth.users (including INSERT)
    console.log('1️⃣ Checking ALL triggers on auth.users:');
    const allTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement,
        action_orientation
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
      ORDER BY trigger_name;
    `);

    allTriggers.rows.forEach((t, i) => {
      console.log(`\n   ${i + 1}. ${t.trigger_name}`);
      console.log(`      Timing: ${t.action_timing}`);
      console.log(`      Event: ${t.event_manipulation}`);
      console.log(`      Orientation: ${t.action_orientation}`);
    });

    // 2. Check for functions that INSERT into users table
    console.log('\n\n2️⃣ Checking functions that INSERT into users table:');
    const insertFunctions = await client.query(`
      SELECT 
        p.proname as function_name,
        n.nspname as schema_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE pg_get_functiondef(p.oid) ILIKE '%INSERT INTO users%'
      OR pg_get_functiondef(p.oid) ILIKE '%INSERT INTO public.users%'
      ORDER BY n.nspname, p.proname;
    `);

    if (insertFunctions.rows.length > 0) {
      console.log(`Found ${insertFunctions.rows.length} functions that INSERT into users:`);
      insertFunctions.rows.forEach((f, i) => {
        console.log(`\n   ${i + 1}. ${f.schema_name}.${f.function_name}`);
        const def = f.definition || '';
        const lines = def.split('\n').filter(l => 
          l.toLowerCase().includes('insert') && l.toLowerCase().includes('users')
        );
        lines.slice(0, 3).forEach(line => {
          console.log(`      ${line.trim()}`);
        });
      });
    } else {
      console.log('   No functions found that INSERT into users');
    }

    // 3. Check if column actually exists
    console.log('\n\n3️⃣ Verifying email_verified column exists:');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'email_verified';
    `);

    if (columnCheck.rows.length > 0) {
      console.log('   ✅ Column EXISTS');
      console.log(`      Type: ${columnCheck.rows[0].data_type}`);
      console.log(`      Nullable: ${columnCheck.rows[0].is_nullable}`);
      console.log(`      Default: ${columnCheck.rows[0].column_default}`);
    } else {
      console.log('   ❌ Column DOES NOT EXIST - THIS IS THE PROBLEM!');
    }

    // 4. Check for Supabase internal functions
    console.log('\n\n4️⃣ Checking for Supabase internal auth functions:');
    const supabaseFunctions = await client.query(`
      SELECT 
        p.proname as function_name,
        n.nspname as schema_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE (n.nspname = 'auth' OR n.nspname LIKE '%supabase%')
      AND (p.proname ILIKE '%user%' OR p.proname ILIKE '%auth%')
      ORDER BY n.nspname, p.proname;
    `);

    if (supabaseFunctions.rows.length > 0) {
      console.log(`Found ${supabaseFunctions.rows.length} Supabase auth functions:`);
      supabaseFunctions.rows.slice(0, 10).forEach(f => {
        console.log(`   - ${f.schema_name}.${f.function_name}`);
      });
    }

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

findRootCause();

