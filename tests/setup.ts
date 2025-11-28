/**
 * Jest Test Setup
 * Runs before all tests
 */

// Set test environment variables
// Note: NODE_ENV is read-only in some environments, so we set DISABLE_EMAIL_VERIFICATION instead
process.env.DISABLE_EMAIL_VERIFICATION = 'true'; // Disable email verification for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-32-chars-long';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Increase timeout for integration tests
jest.setTimeout(30000);

