#!/usr/bin/env node
/**
 * Create Supabase Storage Buckets
 * Uses Supabase Management API to create storage buckets programmatically
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please set these in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const buckets = [
  {
    name: 'documents',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: ['application/pdf', 'image/*'],
  },
  {
    name: 'evidence',
    public: false,
    fileSizeLimit: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  {
    name: 'audit-packs',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: ['application/pdf'],
  },
  {
    name: 'aer-documents',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: ['application/pdf'],
  },
];

async function createBuckets() {
  console.log('🚀 Creating Supabase Storage Buckets...\n');

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`❌ Error listing buckets: ${listError.message}`);
        continue;
      }

      const exists = existingBuckets?.some((b) => b.name === bucket.name);

      if (exists) {
        console.log(`✅ Bucket "${bucket.name}" already exists`);
        continue;
      }

      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        console.error(`❌ Error creating bucket "${bucket.name}": ${error.message}`);
        console.error(`   Note: Storage bucket creation via API may require dashboard setup`);
        console.error(`   Please create this bucket manually in Supabase Dashboard → Storage`);
      } else {
        console.log(`✅ Created bucket "${bucket.name}"`);
      }
    } catch (err) {
      console.error(`❌ Error creating bucket "${bucket.name}": ${err.message}`);
      console.error(`   Please create this bucket manually in Supabase Dashboard → Storage`);
    }
  }

  console.log('\n✅ Bucket creation complete!');
  console.log('\n📋 Note: Some bucket settings (file size limits, CORS) may need to be configured in the Dashboard.');
}

createBuckets().catch(console.error);

