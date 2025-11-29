/**
 * Fix sync_email_verified function to handle missing users record
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

async function fixFunction() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔧 Fixing sync_email_verified function...\n');

    // Update the function to check if users record exists first
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_email_verified()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only update if the users record exists
        -- This prevents errors when auth.users is created before users record
        IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
          UPDATE users
          SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
          WHERE id = NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('✅ Function updated successfully!');
    console.log('\n🧪 Try signing up now - it should work!');

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixFunction();

