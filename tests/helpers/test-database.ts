/**
 * Test Database Helpers
 * Utilities for setting up and tearing down test databases
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Use mock client in test environment to avoid rate limits
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Create a mock or real client based on environment
let testDb: SupabaseClient;

if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
  // Mock Supabase client for tests
  testDb = {
    auth: {
      signUp: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'mock-access-token-' + Math.random().toString(36).slice(2) },
        },
        error: null,
      }),
      signIn: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'mock-access-token-' + Math.random().toString(36).slice(2) },
        },
        error: null,
      }),
    },
    from: jest.fn((table: string) => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'mock-' + table + '-id', name: 'Mock ' + table },
        error: null,
      }),
      delete: jest.fn().mockReturnThis(),
      neq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  } as unknown as SupabaseClient;
} else {
  testDb = createClient(supabaseUrl, supabaseKey);
}

export { testDb };

/**
 * Create test user and return auth token
 * Uses mock in test environment to avoid rate limits
 */
export async function createTestUser(email = 'test@example.com', password = 'test123456') {
  if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
    // Return mock token for tests
    return 'mock-access-token-' + Math.random().toString(36).slice(2);
  }

  const { data, error } = await testDb.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data.session?.access_token;
}

/**
 * Create test company
 * Uses mock in test environment to avoid rate limits
 */
export async function createTestCompany(name = 'Test Company') {
  if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
    return { id: 'mock-company-id-' + Math.random().toString(36).slice(2), name };
  }

  const { data, error } = await testDb
    .from('companies')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create test site
 * Uses mock in test environment to avoid rate limits
 */
export async function createTestSite(companyId: string, name = 'Test Site') {
  if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
    return {
      id: 'mock-site-id-' + Math.random().toString(36).slice(2),
      company_id: companyId,
      site_name: name,
      address_line1: '123 Test St',
      city: 'Test City',
      postcode: 'TE5 1ST',
      country: 'UK',
    };
  }

  const { data, error } = await testDb
    .from('sites')
    .insert({
      company_id: companyId,
      site_name: name,
      address_line1: '123 Test St',
      city: 'Test City',
      postcode: 'TE5 1ST',
      country: 'UK',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create test obligation
 * Uses mock in test environment to avoid rate limits
 */
export async function createTestObligation(siteId: string, obligationData: Partial<any> = {}) {
  if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
    return {
      id: 'mock-obligation-id-' + Math.random().toString(36).slice(2),
      site_id: siteId,
      obligation_title: obligationData.title || 'Test Obligation',
      obligation_description: obligationData.description || 'Test description',
      status: obligationData.status || 'PENDING',
      category: obligationData.category || 'MONITORING',
      ...obligationData,
    };
  }

  const { data: obligation, error } = await testDb
    .from('obligations')
    .insert({
      site_id: siteId,
      obligation_title: obligationData.title || 'Test Obligation',
      obligation_description: obligationData.description || 'Test description',
      status: obligationData.status || 'PENDING',
      category: obligationData.category || 'MONITORING',
      ...obligationData,
    })
    .select()
    .single();

  if (error) throw error;
  return obligation;
}

/**
 * Clean up test data
 * No-op in mock environment
 */
export async function cleanupTestData() {
  if (isTestEnv && !process.env.USE_REAL_SUPABASE) {
    // No-op for mock environment
    return;
  }

  // Delete in reverse order of dependencies
  await testDb.from('obligation_evidence_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('evidence').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('deadlines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('obligations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('sites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testDb.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

/**
 * Setup test database for integration tests
 */
export async function setupTestDatabase() {
  // Run migrations if needed
  // Create test schema if needed
  return testDb;
}

/**
 * Teardown test database
 */
export async function teardownTestDatabase() {
  await cleanupTestData();
}
