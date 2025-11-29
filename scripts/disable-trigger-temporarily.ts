/**
 * Temporarily disable sync_email_verified_trigger to test signup
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

async function disableTrigger() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔧 Temporarily disabling sync_email_verified_trigger...\n');

    // Disable the trigger
    await client.query(`
      ALTER TABLE auth.users 
      DISABLE TRIGGER sync_email_verified_trigger;
    `);

    console.log('✅ Trigger disabled');
    console.log('\n⚠️  Note: This is temporary. After testing signup, re-enable it with:');
    console.log('   ALTER TABLE auth.users ENABLE TRIGGER sync_email_verified_trigger;');
    console.log('\n🧪 Try signing up now!');

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

disableTrigger();

