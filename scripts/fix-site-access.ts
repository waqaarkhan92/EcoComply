/**
 * Fix site access by creating user_site_assignments
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const siteId = '8dfbdfe9-6189-4c6a-9d96-8c1946179b1e';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking site and users...\n');

  // Get site details
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, company_id')
    .eq('id', siteId)
    .single();

  if (!site) {
    console.error('❌ Site not found');
    process.exit(1);
  }

  console.log('📍 Site:', site.name);
  console.log('  Company ID:', site.company_id);

  // Get all users in the company
  const { data: users } = await supabase
    .from('user_roles')
    .select('user_id, role, profiles(email)')
    .eq('company_id', site.company_id);

  console.log('\n👥 Users in company:', users?.length || 0);
  if (users && users.length > 0) {
    users.forEach((u: any) => {
      console.log(`  - ${u.profiles?.email} (${u.role})`);
    });
  }

  // Check existing assignments
  const { data: existingAssignments } = await supabase
    .from('user_site_assignments')
    .select('user_id, site_id')
    .eq('site_id', siteId);

  console.log('\n📋 Existing site assignments:', existingAssignments?.length || 0);

  if (!users || users.length === 0) {
    console.error('\n❌ No users found in company');
    process.exit(1);
  }

  // Create assignments for all users
  console.log('\n🔧 Creating site assignments...');
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if assignment already exists
    const exists = existingAssignments?.some(a => a.user_id === user.user_id);

    if (exists) {
      console.log(`  ⏭️  Skipped ${(user.profiles as any)?.[0]?.email} (already assigned)`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('user_site_assignments')
      .insert({
        user_id: user.user_id,
        site_id: siteId,
        company_id: site.company_id,
      });

    if (error) {
      console.error(`  ❌ Failed for ${(user.profiles as any)?.[0]?.email}:`, error.message);
    } else {
      console.log(`  ✅ Created for ${(user.profiles as any)?.[0]?.email}`);
      created++;
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);

  // Verify
  const { data: finalAssignments } = await supabase
    .from('user_site_assignments')
    .select('user_id')
    .eq('site_id', siteId);

  console.log(`\n📊 Final count: ${finalAssignments?.length || 0} users have access to this site`);
}

main();
