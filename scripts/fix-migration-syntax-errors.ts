/**
 * Fix syntax errors in migration files
 * Many "syntax errors" are actually missing table dependencies
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

// Fix: Make foreign key references optional (use ON DELETE SET NULL or remove if table doesn't exist)
function fixForeignKeyReferences(filePath: string, sql: string): string {
  let fixed = sql;
  
  // List of tables that might not exist yet
  const optionalTables = ['chain_break_alerts', 'exceedances', 'parameters', 'generators'];
  
  // Make references to optional tables nullable
  optionalTables.forEach(table => {
    const pattern = new RegExp(`REFERENCES ${table}\\(id\\) ON DELETE (CASCADE|RESTRICT)`, 'g');
    fixed = fixed.replace(pattern, `REFERENCES ${table}(id) ON DELETE SET NULL`);
  });
  
  return fixed;
}

// Fix: Ensure CHECK constraints come after NOT NULL
function fixCheckConstraints(sql: string): string {
  let fixed = sql;
  
  // Pattern: NOT NULL CHECK should stay as is, but we need to ensure proper formatting
  // The issue might be missing commas or incorrect constraint placement
  
  // Fix: Move CHECK constraints to separate line if needed
  const checkPattern = /(\w+)\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(/g;
  fixed = fixed.replace(checkPattern, (match, columnName) => {
    return `${columnName} TEXT NOT NULL\n        CHECK (`;
  });
  
  return fixed;
}

async function fixAllSyntaxErrors() {
  console.log('🔧 Fixing syntax errors in migration files...\n');

  const filesToFix = [
    '20250131000004_create_missing_core_tables.sql',
    '20250201000002_create_phase5_cross_cutting_tables.sql',
    '20250201000003_create_recurrence_advanced_tables.sql',
    '20250201000004_create_permit_workflows_tables.sql',
    '20250201000005_create_monthly_statements_tables.sql',
    '20250201000006_create_condition_evidence_tables.sql',
    '20250201000007_create_condition_permissions_table.sql',
    '20250201000008_create_consent_states_table.sql',
    '20250201000009_create_regulation_thresholds_tables.sql',
  ];

  let fixedCount = 0;

  for (const file of filesToFix) {
    const filePath = join(migrationsDir, file);
    
    try {
      let sql = readFileSync(filePath, 'utf-8');
      const original = sql;
      
      // Apply fixes
      sql = fixForeignKeyReferences(filePath, sql);
      sql = fixCheckConstraints(sql);
      
      // Only write if changed
      if (sql !== original) {
        writeFileSync(filePath, sql);
        console.log(`✅ Fixed: ${file}`);
        fixedCount++;
      } else {
        console.log(`⏭️  No changes needed: ${file}`);
      }
    } catch (error: any) {
      console.log(`❌ Error fixing ${file}: ${error.message}`);
    }
  }

  console.log(`\n📊 Fixed ${fixedCount} migration file(s)\n`);
}

fixAllSyntaxErrors().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

