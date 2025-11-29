/**
 * Check all triggers and functions that might be causing the error
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

async function checkAll() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔍 Checking all triggers and functions...\n');

    // Check sync_last_login function
    console.log('1️⃣ Checking sync_last_login function:');
    const lastLoginFunc = await client.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'sync_last_login';
    `);

    if (lastLoginFunc.rows.length > 0) {
      const def = lastLoginFunc.rows[0].definition || '';
      if (def.includes('EXCEPTION') || def.includes('information_schema.columns')) {
        console.log('   ✅ Has error handling');
      } else {
        console.log('   ❌ Missing error handling!');
        console.log('   Updating...');
        await client.query(`
          CREATE OR REPLACE FUNCTION sync_last_login()
          RETURNS TRIGGER AS $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login_at'
            ) THEN
              IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
                UPDATE users SET last_login_at = NEW.last_sign_in_at
                WHERE id = NEW.id AND (last_login_at IS NULL OR last_login_at < NEW.last_sign_in_at);
              END IF;
            END IF;
            RETURN NEW;
          EXCEPTION WHEN OTHERS THEN RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('   ✅ Updated!');
      }
    }

    // Check sync_email_verified function
    console.log('\n2️⃣ Checking sync_email_verified function:');
    const emailVerifiedFunc = await client.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'sync_email_verified';
    `);

    if (emailVerifiedFunc.rows.length > 0) {
      const def = emailVerifiedFunc.rows[0].definition || '';
      if (def.includes('EXCEPTION') || def.includes('information_schema.columns')) {
        console.log('   ✅ Has error handling');
      } else {
        console.log('   ❌ Missing error handling!');
        console.log('   Updating...');
        await client.query(`
          CREATE OR REPLACE FUNCTION sync_email_verified()
          RETURNS TRIGGER AS $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified'
            ) THEN
              IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
                UPDATE users SET email_verified = (NEW.email_confirmed_at IS NOT NULL) WHERE id = NEW.id;
              END IF;
            END IF;
            RETURN NEW;
          EXCEPTION WHEN OTHERS THEN RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('   ✅ Updated!');
      }
    }

    // Check if columns exist
    console.log('\n3️⃣ Checking if columns exist:');
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name IN ('email_verified', 'last_login_at');
    `);

    columns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} exists`);
    });

    if (columns.rows.length < 2) {
      console.log('   ❌ Missing columns! Adding...');
      if (!columns.rows.find((r: any) => r.column_name === 'email_verified')) {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;`);
        console.log('   ✅ Added email_verified');
      }
      if (!columns.rows.find((r: any) => r.column_name === 'last_login_at')) {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;`);
        console.log('   ✅ Added last_login_at');
      }
    }

    await client.end();
    console.log('\n🎉 All checks complete! Try signing up now.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkAll();

