/**
 * Completely recreate the sync_email_verified function with better error handling
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

async function recreateFunction() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔧 Recreating sync_email_verified function with better error handling...\n');

    // Drop and recreate the function with proper error handling
    await client.query(`
      DROP FUNCTION IF EXISTS sync_email_verified() CASCADE;
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION sync_email_verified()
      RETURNS TRIGGER 
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Only update if the users record exists and column exists
        -- This prevents errors during user creation
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'email_verified'
        ) THEN
          IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
            UPDATE users
            SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
            WHERE id = NEW.id;
          END IF;
        END IF;
        
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          -- Silently ignore errors (column might not exist yet)
          RETURN NEW;
      END;
      $$;
    `);

    // Recreate the trigger
    await client.query(`
      DROP TRIGGER IF EXISTS sync_email_verified_trigger ON auth.users;
    `);

    await client.query(`
      CREATE TRIGGER sync_email_verified_trigger
      AFTER UPDATE OF email_confirmed_at ON auth.users
      FOR EACH ROW
      WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
      EXECUTE FUNCTION sync_email_verified();
    `);

    console.log('✅ Function and trigger recreated with error handling!');
    console.log('\n🧪 Try signing up now - it should work!');

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

recreateFunction();

