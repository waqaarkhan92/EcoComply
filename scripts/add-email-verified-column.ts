/**
 * Add email_verified column to users table
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function addEmailVerifiedColumn() {
  console.log('🔧 Adding email_verified column to users table...\n');

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'email_verified';
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column email_verified already exists');
    } else {
      console.log('❌ Column does not exist - adding it...');
      
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
      `);
      
      console.log('✅ Column email_verified added successfully!');
    }

    await client.end();
    console.log('\n🎉 Done! Try signing up again.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

addEmailVerifiedColumn();
