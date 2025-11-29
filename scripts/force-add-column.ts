/**
 * Force add email_verified column - make absolutely sure it exists
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

async function forceAddColumn() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔧 Force adding email_verified column...\n');

    // Drop column if it exists (to recreate it cleanly)
    await client.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
    `);
    console.log('✅ Dropped existing column (if it existed)');

    // Add column fresh
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log('✅ Added email_verified column');

    // Verify it exists
    const check = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'email_verified';
    `);

    if (check.rows.length > 0) {
      console.log('\n✅ VERIFIED: Column exists');
      console.log(`   Type: ${check.rows[0].data_type}`);
      console.log(`   Nullable: ${check.rows[0].is_nullable}`);
      console.log(`   Default: ${check.rows[0].column_default}`);
    } else {
      console.log('\n❌ ERROR: Column still does not exist!');
      process.exit(1);
    }

    await client.end();
    console.log('\n🎉 Column is ready. Try signing up now!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

forceAddColumn();

