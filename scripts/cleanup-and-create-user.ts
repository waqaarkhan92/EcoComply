/**
 * Cleanup and Create Test User
 * Deletes any orphaned users and creates a fresh test account
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const TEST_EMAIL = 'test@ecocomply.com';
const TEST_PASSWORD = 'TestPassword123!';

async function main() {
  console.log('🧹 Cleaning up and creating test user...\n');

  // 1. Delete from our database
  console.log('1. Checking database...');
  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', TEST_EMAIL)
    .maybeSingle();

  if (dbUser) {
    console.log(`   Found user in DB: ${dbUser.id}`);
    // Delete related records first
    await supabaseAdmin.from('user_roles').delete().eq('user_id', dbUser.id);
    await supabaseAdmin.from('module_activations').delete().eq('company_id', dbUser.company_id);
    await supabaseAdmin.from('users').delete().eq('id', dbUser.id);
    await supabaseAdmin.from('companies').delete().eq('id', dbUser.company_id);
    console.log('   ✅ Deleted from database');
  } else {
    console.log('   ✅ No user in database');
  }

  // 2. Delete from Supabase Auth
  console.log('2. Checking Supabase Auth...');
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = authUsers?.users.find(u => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());

  if (authUser) {
    console.log(`   Found user in Auth: ${authUser.id}`);
    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    console.log('   ✅ Deleted from Auth');
  } else {
    console.log('   ✅ No user in Auth');
  }

  // 3. Create fresh user
  console.log('3. Creating fresh user...');
  
  // Create auth user
  const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authError || !newAuthUser.user) {
    console.error('   ❌ Failed to create auth user:', authError?.message);
    process.exit(1);
  }
  console.log('   ✅ Auth user created');

  // Get Module 1
  const { data: module1 } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_1')
    .single();

  if (!module1) {
    console.error('   ❌ Module 1 not found');
    process.exit(1);
  }

  // Create company
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: 'Test Company',
      billing_email: TEST_EMAIL,
      subscription_tier: 'core',
    })
    .select('id')
    .single();

  if (companyError || !company) {
    console.error('   ❌ Failed to create company:', companyError?.message);
    process.exit(1);
  }
  console.log('   ✅ Company created');

  // Create user
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: newAuthUser.user.id,
      company_id: company.id,
      email: TEST_EMAIL,
      full_name: 'Test User',
      email_verified: true,
      is_active: true,
    })
    .select('id')
    .single();

  if (userError || !user) {
    console.error('   ❌ Failed to create user:', userError?.message);
    process.exit(1);
  }
  console.log('   ✅ User created');

  // Create role
  await supabaseAdmin.from('user_roles').insert({
    user_id: user.id,
    role: 'OWNER',
    assigned_by: user.id,
  });
  console.log('   ✅ Role created');

  // Activate module
  await supabaseAdmin.from('module_activations').insert({
    company_id: company.id,
    module_id: module1.id,
    status: 'ACTIVE',
    activated_by: user.id,
    billing_start_date: new Date().toISOString().split('T')[0],
  });
  console.log('   ✅ Module activated');

  console.log('\n✅ SUCCESS! Test user created.\n');
  console.log('📧 Login Credentials:');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log('\n🌐 Login at: http://localhost:3000/login\n');
}

main().catch(console.error);

