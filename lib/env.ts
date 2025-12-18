/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 */

interface EnvConfig {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;

  // OpenAI
  OPENAI_API_KEY: string;
  OPENAI_API_KEY_FALLBACK_1?: string;
  OPENAI_API_KEY_FALLBACK_2?: string;

  // Email (optional for Phase 2, required for Phase 4+)
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;

  // SMS (optional)
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // Redis (optional for Phase 2, required for Phase 4+)
  REDIS_URL?: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;

  // Application
  BASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';

  // Rate Limiting
  DEFAULT_RATE_LIMIT_PER_MINUTE: number;
  AI_EXTRACTION_RATE_LIMIT_PER_MINUTE: number;
  DOCUMENT_UPLOAD_RATE_LIMIT_PER_MINUTE: number;
}

function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const errors: string[] = [];
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // SECURITY: Check for insecure development flags in production
  if (process.env.DISABLE_EMAIL_VERIFICATION === 'true') {
    if (isProduction) {
      throw new Error(
        'SECURITY ERROR: DISABLE_EMAIL_VERIFICATION cannot be enabled in production. ' +
        'This flag is a security risk and should only be used during local development.'
      );
    }

    // Warn in development
    console.warn('');
    console.warn('⚠️  ═══════════════════════════════════════════════════════════════');
    console.warn('⚠️  SECURITY WARNING: Email verification is DISABLED');
    console.warn('⚠️  ═══════════════════════════════════════════════════════════════');
    console.warn('⚠️  DISABLE_EMAIL_VERIFICATION=true is set');
    console.warn('⚠️  This is a security risk and should ONLY be used for local development');
    console.warn('⚠️  NEVER enable this flag in production environments');
    console.warn('⚠️  ═══════════════════════════════════════════════════════════════');
    console.warn('');
  }

  // Required variables (Phase 2 - Auth endpoints don't need all services yet)
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BASE_URL',
  ];

  // Optional variables (will be required in later phases)
  const optional = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'REDIS_URL',
  ];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // In development, allow missing variables and just log warnings instead of throwing
  if (isDevelopment && missing.length > 0) {
    console.warn(`⚠️  Missing environment variables in development: ${missing.join(', ')}`);
    console.warn('⚠️  Some features may not work. UI should still load for testing.');
    // Don't throw in development - allow UI to load for testing
  }

  // Validate URL formats
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    errors.push('SUPABASE_URL must be a valid HTTPS URL');
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate Redis URL only if provided (optional for Phase 2)
  // Accept both redis:// and rediss:// (SSL) formats
  if (process.env.REDIS_URL && !process.env.REDIS_URL.match(/^rediss?:\/\//)) {
    errors.push('REDIS_URL must be a valid Redis connection string (redis:// or rediss://)');
  }

  // Validate JWT secret length (only in production)
  if (!isDevelopment && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!isDevelopment && process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  // In development, just warn about JWT secret length
  if (isDevelopment) {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  JWT_SECRET should be at least 32 characters long for production');
    }
    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      console.warn('⚠️  JWT_REFRESH_SECRET should be at least 32 characters long for production');
    }
  }

  // Validate numeric values
  const rateLimit = parseInt(process.env.DEFAULT_RATE_LIMIT_PER_MINUTE || '100', 10);
  if (isNaN(rateLimit) || rateLimit <= 0) {
    errors.push('DEFAULT_RATE_LIMIT_PER_MINUTE must be a positive number');
  }

  // Report errors (strict in production, lenient in development)
  if (missing.length > 0 && !isDevelopment) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  if (errors.length > 0 && !isDevelopment) {
    throw new Error(
      `Environment variable validation errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
  
  // In development, log errors but don't throw
  if (isDevelopment && errors.length > 0) {
    console.warn(`⚠️  Environment variable validation warnings:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  // Return validated config (use fallbacks in development for missing values)
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || (isDevelopment ? 'https://placeholder.supabase.co' : ''),
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || (isDevelopment ? 'placeholder-anon-key' : ''),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || (isDevelopment ? 'placeholder-service-key' : ''),
    DATABASE_URL: process.env.DATABASE_URL || (isDevelopment ? 'postgresql://placeholder' : ''),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || (isDevelopment ? 'sk-placeholder' : ''),
    OPENAI_API_KEY_FALLBACK_1: process.env.OPENAI_API_KEY_FALLBACK_1,
    OPENAI_API_KEY_FALLBACK_2: process.env.OPENAI_API_KEY_FALLBACK_2,
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    REDIS_URL: process.env.REDIS_URL || '',
    JWT_SECRET: process.env.JWT_SECRET || (isDevelopment ? 'dev-jwt-secret-placeholder-min-32-chars' : ''),
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (isDevelopment ? 'dev-refresh-secret-placeholder-min-32-chars' : ''),
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    DEFAULT_RATE_LIMIT_PER_MINUTE: rateLimit,
    AI_EXTRACTION_RATE_LIMIT_PER_MINUTE: parseInt(
      process.env.AI_EXTRACTION_RATE_LIMIT_PER_MINUTE || '5',
      10
    ),
    DOCUMENT_UPLOAD_RATE_LIMIT_PER_MINUTE: parseInt(
      process.env.DOCUMENT_UPLOAD_RATE_LIMIT_PER_MINUTE || '10',
      10
    ),
  };
}

// Export validated config
export const env = validateEnv();

// Export validation function for use in scripts
export { validateEnv };

