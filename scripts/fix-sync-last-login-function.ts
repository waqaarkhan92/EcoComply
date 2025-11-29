/**
 * Fix sync_last_login function to handle missing users record
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
    console.log('🔧 Fixing sync_last_login function...\n');

    // Update the function to check if users record exists and column exists
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_last_login()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only update if the users record exists and column exists
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'last_login_at'
        ) THEN
          IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
            UPDATE users
            SET last_login_at = NEW.last_sign_in_at
            WHERE id = NEW.id
            AND (last_login_at IS NULL OR last_login_at < NEW.last_sign_in_at);
          END IF;
        END IF;
        
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          -- Silently ignore errors (column might not exist yet)
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('✅ Function updated with error handling!');
    console.log('\n🧪 Try signing up/login now - it should work!');

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixFunction();

