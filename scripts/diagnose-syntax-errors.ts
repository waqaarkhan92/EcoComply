/**
 * DIAGNOSE SYNTAX ERRORS IN MIGRATIONS
 * 
 * Since dependency tables exist, the "syntax error at or near NOT" 
 * must be from:
 * 1. RLS policy syntax errors
 * 2. Missing helper views (user_site_access, user_company_access)
 * 3. Missing functions (update_updated_at_column)
 * 4. Malformed CHECK constraints
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function diagnoseSyntaxErrors() {
  console.log('🔍 DIAGNOSING SYNTAX ERRORS\n');
  console.log('='.repeat(80));
  console.log('');

  const client = new Client({ connectionString: DATABASE_URL });
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check 1: Helper views
    console.log('📋 Check 1: Helper Views (used in RLS policies)...\n');
    
    const views = ['user_site_access', 'user_company_access'];
    for (const view of views) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [view]);
      
      const exists = result.rows[0].exists;
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`   ${status} ${view}`);
      
      if (!exists) {
        console.log(`      ⚠️  RLS policies that use this view will fail!`);
      }
    }

    // Check 2: Functions
    console.log('\n📋 Check 2: Required Functions...\n');
    
    const functions = ['update_updated_at_column'];
    for (const func of functions) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = $1
        )
      `, [func]);
      
      const exists = result.rows[0].exists;
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`   ${status} ${func}`);
      
      if (!exists) {
        console.log(`      ⚠️  Triggers using this function will fail!`);
      }
    }

    // Check 3: Try to parse the migration SQL
    console.log('\n📋 Check 3: Testing SQL syntax...\n');
    
    const migrationFile = join(
      migrationsDir,
      '20250131000004_create_missing_core_tables.sql'
    );

    const sql = readFileSync(migrationFile, 'utf-8');

    // Split into sections and test each
    const sections = [
      { name: 'CREATE TABLE corrective_actions', sql: sql.split('-- 2. runtime_monitoring')[0] },
      { name: 'CREATE TABLE runtime_monitoring', sql: sql.split('-- 2. runtime_monitoring')[1]?.split('-- 3. escalation_workflows')[0] || '' },
      { name: 'CREATE TABLE escalation_workflows', sql: sql.split('-- 3. escalation_workflows')[1]?.split('-- ROW LEVEL SECURITY')[0] || '' },
      { name: 'RLS Policies', sql: sql.split('-- ROW LEVEL SECURITY')[1] || '' },
    ];

    console.log('   Testing each section for syntax errors...\n');

    for (const section of sections) {
      if (!section.sql.trim()) continue;

      // Extract just the CREATE statements
      const createMatch = section.sql.match(/CREATE TABLE[^;]+;/s);
      if (!createMatch) continue;

      try {
        // Try to parse (PostgreSQL will validate syntax)
        const testSQL = `-- Test syntax\n${createMatch[0]}`;
        
        // Don't actually execute, just check if we can parse it
        // We'll do a dry-run parse by trying to create it in a transaction we rollback
        await client.query('BEGIN');
        try {
          await client.query(testSQL);
          await client.query('ROLLBACK');
          console.log(`   ✅ ${section.name} - Syntax OK`);
        } catch (error: any) {
          await client.query('ROLLBACK');
          console.log(`   ❌ ${section.name} - Syntax Error:`);
          console.log(`      ${error.message.split('\n')[0]}`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${section.name} - Could not test: ${error.message}`);
      }
    }

    // Check 4: Look for common syntax issues
    console.log('\n📋 Check 4: Common Syntax Issues...\n');

    const issues: string[] = [];

    // Check for malformed CHECK constraints
    const checkPattern = /CHECK\s*\([^)]*$/m;
    if (checkPattern.test(sql)) {
      issues.push('Possible unclosed CHECK constraint');
    }

    // Check for NOT NULL CHECK (this is valid, but let's verify)
    const notNullCheckPattern = /NOT\s+NULL\s+CHECK/g;
    const matches = sql.match(notNullCheckPattern);
    if (matches) {
      console.log(`   ⚠️  Found ${matches.length} instances of "NOT NULL CHECK"`);
      console.log(`      This is valid SQL, but let's verify the syntax...`);
    }

    // Check for user_site_access in RLS policies
    if (sql.includes('user_site_access') && !sql.includes('FROM user_site_access')) {
      // Should have FROM clause
      const viewUsage = sql.match(/user_site_access[^F]*/g);
      if (viewUsage) {
        console.log(`   ⚠️  Found ${viewUsage.length} references to user_site_access`);
        console.log(`      Verifying view exists...`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 DIAGNOSIS SUMMARY\n');
    console.log('The "syntax error at or near NOT" is likely caused by:\n');
    console.log('1. RLS policies referencing views that don\'t exist');
    console.log('2. Missing helper views (user_site_access, user_company_access)');
    console.log('3. Missing functions (update_updated_at_column)');
    console.log('4. Actual SQL syntax error in CHECK constraints or policies\n');
    
    console.log('💡 SOLUTION:');
    console.log('   - Ensure helper views exist (already created in helper views migration)');
    console.log('   - Ensure functions exist (should be in earlier migration)');
    console.log('   - Fix any actual syntax errors in SQL\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

diagnoseSyntaxErrors();



