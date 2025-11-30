/**
 * Create Test User Script
 * Creates a test user account for development/testing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  const testEmail = 'test@ecocomply.com';
  const testPassword = 'TestPassword123!';
  const testCompanyName = 'Test Company';
  const testFullName = 'Test User';

  try {
    console.log('🔧 Creating test user...');

    // Check if user already exists in our database
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', testEmail)
      .single();

    let authUser;
    
    if (existingUser) {
      console.log('✅ Test user already exists in database!');
      // Get the auth user
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const foundAuthUser = authUsers?.users.find(u => u.email === testEmail);
      
      if (foundAuthUser) {
        authUser = { user: foundAuthUser };
        console.log('✅ Found existing auth user');
      } else {
        console.log('⚠️  User exists in DB but not in Auth. Creating auth user...');
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: {
            full_name: testFullName,
            company_name: testCompanyName,
          },
        });
        if (authError || !newAuthUser.user) {
          throw new Error(`Failed to create auth user: ${authError?.message}`);
        }
        authUser = newAuthUser;
      }
      
      console.log('\n📧 Login Credentials:');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
      console.log('\n🌐 Login at: http://localhost:3000/login');
      return;
    }

    // Check if auth user exists but not in our DB
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users.find(u => u.email === testEmail);
    
    if (existingAuthUser) {
      console.log('⚠️  Auth user exists but not in database. Cleaning up and recreating...');
      // Delete the orphaned auth user
      await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
    }

    // Create auth user with email auto-confirmed
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: testFullName,
        company_name: testCompanyName,
      },
    });

    if (authError) {
      // If user already exists, try to get it and update password
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        console.log('⚠️  User already exists in Auth. Updating password...');
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuth = authUsers?.users.find(u => u.email === testEmail);
        
        if (existingAuth) {
          // Update password
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuth.id,
            { password: testPassword, email_confirm: true }
          );
          
          if (updateError) {
            throw new Error(`Failed to update existing user: ${updateError.message}`);
          }
          
          authUser = { user: updatedUser.user };
          console.log('✅ Updated existing auth user');
        } else {
          throw new Error(`User exists but couldn't find it: ${authError.message}`);
        }
      } else {
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }
    } else if (!newAuthUser?.user) {
      throw new Error('Failed to create auth user: No user returned');
    } else {
      authUser = newAuthUser;
    }

    console.log('✅ Auth user created');

    // Get Module 1
    const { data: module1 } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module1) {
      throw new Error('Module 1 not found');
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: testCompanyName,
        billing_email: testEmail,
        subscription_tier: 'core',
      })
      .select('id')
      .single();

    if (companyError || !company) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create company: ${companyError?.message}`);
    }

    console.log('✅ Company created');

    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        email: testEmail,
        full_name: testFullName,
        email_verified: true,
        is_active: true,
        last_login_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (userError || !user) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create user: ${userError?.message}`);
    }

    console.log('✅ User record created');

    // Create user role (OWNER)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'OWNER',
        assigned_by: user.id,
      });

    if (roleError) {
      await supabaseAdmin.from('users').delete().eq('id', user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create role: ${roleError?.message}`);
    }

    console.log('✅ User role created');

    // Activate Module 1
    const { error: moduleError } = await supabaseAdmin
      .from('module_activations')
      .insert({
        company_id: company.id,
        module_id: module1.id,
        status: 'ACTIVE',
        activated_by: user.id,
        billing_start_date: new Date().toISOString().split('T')[0],
      });

    if (moduleError) {
      console.warn(`⚠️  Warning: Failed to activate module: ${moduleError.message}`);
    } else {
      console.log('✅ Module 1 activated');
    }

    console.log('\n✅ Test user created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n🌐 You can now login at: http://localhost:3000/login');
  } catch (error: any) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();

