#!/usr/bin/env node
/**
 * Environment Variable Validation Script
 * Run this before starting the dev server to ensure all required env vars are set
 */

import { validateEnv } from '../lib/env.js';

try {
  const config = validateEnv();
  console.log('✅ All environment variables are valid!');
  console.log(`\nEnvironment: ${config.NODE_ENV}`);
  console.log(`Base URL: ${config.BASE_URL}`);
  console.log(`Supabase URL: ${config.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`OpenAI API Key: ${config.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`Resend API Key: ${config.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`Redis URL: ${config.REDIS_URL ? '✅ Set' : '❌ Missing'}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Environment variable validation failed:');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('\nPlease check your .env.local file and ensure all required variables are set.');
  process.exit(1);
}

