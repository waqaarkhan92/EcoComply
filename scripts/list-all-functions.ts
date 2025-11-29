/**
 * List all database functions to find which one might be causing the issue
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

async function listFunctions() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔍 Listing all database functions...\n');

    // Get all functions
    const functions = await client.query(`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition,
        n.nspname as schema_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname IN ('public', 'auth')
      ORDER BY n.nspname, p.proname;
    `);

    console.log(`Found ${functions.rows.length} functions:\n`);

    // Check for functions that reference email_verified
    const emailVerifiedFunctions = functions.rows.filter(f => 
      f.function_definition?.toLowerCase().includes('email_verified')
    );

    if (emailVerifiedFunctions.length > 0) {
      console.log('⚠️  Functions that reference email_verified:');
      emailVerifiedFunctions.forEach((f, i) => {
        console.log(`\n${i + 1}. ${f.schema_name}.${f.function_name}`);
        const def = f.function_definition || '';
        const lines = def.split('\n').filter((l: string) => 
          l.toLowerCase().includes('email_verified')
        );
        if (lines.length > 0) {
          console.log('   Relevant lines:');
          lines.forEach((line: string) => {
            console.log(`   ${line.trim()}`);
          });
        }
      });
    }

    // List all functions
    console.log('\n📋 All functions:');
    functions.rows.forEach((f, i) => {
      console.log(`${i + 1}. ${f.schema_name}.${f.function_name}`);
    });

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

listFunctions();

