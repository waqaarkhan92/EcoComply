/**
 * Test Data Helper
 * Creates test data for integration tests
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface TestData {
  company: { id: string };
  site: { id: string };
  user: { id: string };
  module: { id: string };
}

/**
 * Create or get test company
 */
export async function getOrCreateTestCompany(): Promise<{ id: string }> {
  // Try to find existing test company
  const { data: existing } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('name', 'Test Company')
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create new test company
  const { data: company, error } = await supabaseAdmin
    .from('companies')
    .insert({
      name: 'Test Company',
      company_type: 'BUSINESS',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  if (error || !company) {
    throw new Error(`Failed to create test company: ${error?.message}`);
  }

  return company;
}

/**
 * Create or get test site
 */
export async function getOrCreateTestSite(companyId: string): Promise<{ id: string }> {
  // Try to find existing test site
  const { data: existing } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'Test Site')
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create new test site
  const { data: site, error } = await supabaseAdmin
    .from('sites')
    .insert({
      company_id: companyId,
      name: 'Test Site',
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !site) {
    throw new Error(`Failed to create test site: ${error?.message}`);
  }

  return site;
}

/**
 * Create or get test user
 */
export async function getOrCreateTestUser(companyId: string): Promise<{ id: string }> {
  // Try to find existing test user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', 'test@example.com')
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create new test user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      company_id: companyId,
      email: 'test@example.com',
      full_name: 'Test User',
      status: 'ACTIVE',
      email_verified: true,
    })
    .select('id')
    .single();

  if (error || !user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  // Create user role
  await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: user.id,
      role: 'OWNER',
      company_id: companyId,
    });

  return user;
}

/**
 * Get Module 1
 */
export async function getModule1(): Promise<{ id: string }> {
  const { data: module, error } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_1')
    .single();

  if (error || !module) {
    throw new Error(`Module 1 not found: ${error?.message}`);
  }

  return module;
}

/**
 * Create complete test data set
 */
export async function createTestData(): Promise<TestData> {
  const company = await getOrCreateTestCompany();
  const site = await getOrCreateTestSite(company.id);
  const user = await getOrCreateTestUser(company.id);
  const module = await getModule1();

  return { company, site, user, module };
}

