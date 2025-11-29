/**
 * Temporarily disable triggers to test signup
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

async function disableTriggers() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔧 Temporarily disabling triggers...\n');

    // Try to disable triggers (might need superuser, but worth trying)
    try {
      await client.query(`ALTER TABLE auth.users DISABLE TRIGGER sync_email_verified_trigger;`);
      console.log('✅ Disabled sync_email_verified_trigger');
    } catch (e: any) {
      console.log('⚠️  Cannot disable sync_email_verified_trigger (might need superuser):', e.message);
    }

    try {
      await client.query(`ALTER TABLE auth.users DISABLE TRIGGER sync_last_login_trigger;`);
      console.log('✅ Disabled sync_last_login_trigger');
    } catch (e: any) {
      console.log('⚠️  Cannot disable sync_last_login_trigger (might need superuser):', e.message);
    }

    console.log('\n📋 Note: If disabling triggers failed, the functions now have error handling');
    console.log('   so they should not cause errors. Try signing up now.');

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

disableTriggers();

