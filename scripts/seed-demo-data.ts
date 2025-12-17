/**
 * Seed Demo Data Script
 *
 * This script populates the test account with realistic demo data
 * to showcase all features of the application.
 *
 * Run with: npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user details
const TEST_USER_EMAIL = 'admin@oblicore.com';

// Helper to generate dates
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // Return date only
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // Return date only
};

const getCompliancePeriod = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
};

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  // Get user and company ID
  const { data: userData } = await supabase
    .from('users')
    .select('id, company_id')
    .eq('email', TEST_USER_EMAIL)
    .single();

  if (!userData) {
    console.error('Test user not found. Please login first to create the user.');
    process.exit(1);
  }

  const userId = userData.id;
  const companyId = userData.company_id;
  console.log(`Found user: ${userId}`);
  console.log(`Company: ${companyId}`);

  // Get Module 1 ID
  const { data: module1 } = await supabase
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_1')
    .single();

  if (!module1) {
    console.error('Module 1 not found');
    process.exit(1);
  }
  const moduleId = module1.id;

  // =========================================================================
  // 1. CREATE SITES
  // =========================================================================
  console.log('\n📍 Creating sites...');

  const sites = [
    {
      company_id: companyId,
      name: 'Manchester Manufacturing Plant',
      address_line_1: '123 Industrial Estate',
      address_line_2: 'Trafford Park',
      city: 'Manchester',
      postcode: 'M17 1AB',
      country: 'United Kingdom',
      regulator: 'EA',
      water_company: 'United Utilities',
    },
    {
      company_id: companyId,
      name: 'Birmingham Distribution Centre',
      address_line_1: '45 Logistics Way',
      city: 'Birmingham',
      postcode: 'B12 0AA',
      country: 'United Kingdom',
      regulator: 'EA',
      water_company: 'Severn Trent',
    },
    {
      company_id: companyId,
      name: 'Leeds Processing Facility',
      address_line_1: '78 Factory Lane',
      address_line_2: 'Industrial Quarter',
      city: 'Leeds',
      postcode: 'LS9 8NB',
      country: 'United Kingdom',
      regulator: 'EA',
      water_company: 'Yorkshire Water',
    },
  ];

  const { data: createdSites, error: sitesError } = await supabase
    .from('sites')
    .insert(sites)
    .select();

  if (sitesError) {
    console.error('Error creating sites:', sitesError);
    // Try to get existing sites
    const { data: existingSites } = await supabase
      .from('sites')
      .select('*')
      .eq('company_id', companyId);
    if (existingSites && existingSites.length > 0) {
      console.log('Using existing sites...');
    }
  } else {
    console.log(`✅ Created ${createdSites?.length} sites`);
  }

  // Get all sites for this company
  const { data: allSites } = await supabase
    .from('sites')
    .select('*')
    .eq('company_id', companyId);

  const siteIds = allSites?.map(s => s.id) || [];
  console.log(`Working with ${siteIds.length} sites`);

  if (siteIds.length === 0) {
    console.error('No sites found or created');
    process.exit(1);
  }

  // =========================================================================
  // 2. CREATE DOCUMENTS (Permits)
  // =========================================================================
  console.log('\n📄 Creating documents...');

  const documents = [
    // Manchester site documents
    {
      site_id: siteIds[0],
      module_id: moduleId,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/AB1234CD',
      title: 'Environmental Permit EPR/AB1234CD',
      description: 'Main environmental permit for Manchester Manufacturing Plant',
      regulator: 'EA',
      issue_date: daysAgo(365),
      effective_date: daysAgo(365),
      expiry_date: daysFromNow(730),
      status: 'ACTIVE',
      original_filename: 'manchester-epr-ab1234cd.pdf',
      storage_path: '/permits/manchester-epr-ab1234cd.pdf',
      file_size_bytes: 2048576,
      mime_type: 'application/pdf',
      extraction_status: 'COMPLETED',
      uploaded_by: userId,
    },
    // Birmingham site documents
    {
      site_id: siteIds[1] || siteIds[0],
      module_id: moduleId,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/EF5678GH',
      title: 'Environmental Permit EPR/EF5678GH',
      description: 'Environmental permit for Birmingham Distribution Centre',
      regulator: 'EA',
      issue_date: daysAgo(400),
      effective_date: daysAgo(400),
      expiry_date: daysFromNow(330),
      status: 'ACTIVE',
      original_filename: 'birmingham-epr-ef5678gh.pdf',
      storage_path: '/permits/birmingham-epr-ef5678gh.pdf',
      file_size_bytes: 1856000,
      mime_type: 'application/pdf',
      extraction_status: 'COMPLETED',
      uploaded_by: userId,
    },
    // Leeds site documents
    {
      site_id: siteIds[2] || siteIds[0],
      module_id: moduleId,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/IJ9012KL',
      title: 'Environmental Permit EPR/IJ9012KL',
      description: 'Environmental permit for Leeds Processing Facility',
      regulator: 'EA',
      issue_date: daysAgo(30),
      effective_date: daysAgo(30),
      expiry_date: daysFromNow(335),
      status: 'ACTIVE',
      original_filename: 'leeds-epr-ij9012kl.pdf',
      storage_path: '/permits/leeds-epr-ij9012kl.pdf',
      file_size_bytes: 2200000,
      mime_type: 'application/pdf',
      extraction_status: 'REVIEW_REQUIRED',
      uploaded_by: userId,
    },
  ];

  const { data: createdDocs, error: docsError } = await supabase
    .from('documents')
    .insert(documents)
    .select();

  if (docsError) {
    console.error('Error creating documents:', docsError);
  } else {
    console.log(`✅ Created ${createdDocs?.length} documents`);
  }

  // Get all documents
  const { data: allDocs } = await supabase
    .from('documents')
    .select('*')
    .in('site_id', siteIds);

  const docIds = allDocs?.map(d => d.id) || [];

  // =========================================================================
  // 3. CREATE OBLIGATIONS
  // =========================================================================
  console.log('\n📋 Creating obligations...');

  const obligations = [
    // Manchester - Compliant site
    {
      document_id: docIds[0],
      company_id: companyId,
      site_id: siteIds[0],
      module_id: moduleId,
      condition_reference: '4.2.1',
      original_text: 'The operator shall submit an annual environmental report to the Environment Agency within 3 months of the end of each reporting period.',
      obligation_title: 'Submit Annual Environmental Report',
      obligation_description: 'Prepare and submit the annual environmental performance report to the Environment Agency',
      category: 'REPORTING',
      frequency: 'ANNUAL',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.95,
      is_high_priority: false,
    },
    {
      document_id: docIds[0],
      company_id: companyId,
      site_id: siteIds[0],
      module_id: moduleId,
      condition_reference: '3.1.2',
      original_text: 'The operator shall conduct monthly emissions monitoring at all stack emission points.',
      obligation_title: 'Monthly Emissions Monitoring',
      obligation_description: 'Conduct monthly stack emissions monitoring and record results',
      category: 'MONITORING',
      frequency: 'MONTHLY',
      status: 'PENDING',
      review_status: 'CONFIRMED',
      confidence_score: 0.92,
      is_high_priority: false,
    },
    {
      document_id: docIds[0],
      company_id: companyId,
      site_id: siteIds[0],
      module_id: moduleId,
      condition_reference: '5.3.1',
      original_text: 'Waste transfer notes shall be retained for a minimum period of 2 years.',
      obligation_title: 'Waste Transfer Note Retention',
      obligation_description: 'Maintain waste transfer notes for minimum 2 years',
      category: 'RECORD_KEEPING',
      frequency: 'CONTINUOUS',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.98,
      is_high_priority: false,
    },
    // Birmingham - At Risk site
    {
      document_id: docIds[1] || docIds[0],
      company_id: companyId,
      site_id: siteIds[1] || siteIds[0],
      module_id: moduleId,
      condition_reference: '3.4.1',
      original_text: 'Quarterly groundwater sampling and analysis shall be conducted at all monitoring boreholes.',
      obligation_title: 'Quarterly Groundwater Monitoring',
      obligation_description: 'Sample and analyse groundwater from monitoring boreholes',
      category: 'MONITORING',
      frequency: 'QUARTERLY',
      status: 'DUE_SOON',
      review_status: 'CONFIRMED',
      confidence_score: 0.88,
      is_high_priority: true,
    },
    {
      document_id: docIds[1] || docIds[0],
      company_id: companyId,
      site_id: siteIds[1] || siteIds[0],
      module_id: moduleId,
      condition_reference: '2.5.2',
      original_text: 'The fire prevention plan shall be reviewed and updated annually.',
      obligation_title: 'Fire Prevention Plan Review',
      obligation_description: 'Annual review and update of fire prevention plan',
      category: 'OPERATIONAL',
      frequency: 'ANNUAL',
      status: 'DUE_SOON',
      review_status: 'CONFIRMED',
      confidence_score: 0.91,
      is_high_priority: true,
    },
    {
      document_id: docIds[1] || docIds[0],
      company_id: companyId,
      site_id: siteIds[1] || siteIds[0],
      module_id: moduleId,
      condition_reference: '3.6.1',
      original_text: 'An annual noise survey shall be conducted at the site boundary.',
      obligation_title: 'Noise Survey',
      obligation_description: 'Conduct boundary noise monitoring survey',
      category: 'MONITORING',
      frequency: 'ANNUAL',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.94,
      is_high_priority: false,
    },
    // Leeds - Non-Compliant site
    {
      document_id: docIds[2] || docIds[0],
      company_id: companyId,
      site_id: siteIds[2] || siteIds[0],
      module_id: moduleId,
      condition_reference: '2.3.1',
      original_text: 'Odour management controls shall be implemented and maintained as per the approved management plan.',
      obligation_title: 'Odour Management Plan Implementation',
      obligation_description: 'Implement and maintain odour management controls as per approved plan',
      category: 'OPERATIONAL',
      frequency: 'CONTINUOUS',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      is_high_priority: true,
      confidence_score: 0.85,
    },
    {
      document_id: docIds[2] || docIds[0],
      company_id: companyId,
      site_id: siteIds[2] || siteIds[0],
      module_id: moduleId,
      condition_reference: '2.4.3',
      original_text: 'Weekly inspection of all spill kits and emergency response equipment shall be conducted.',
      obligation_title: 'Spill Response Equipment Inspection',
      obligation_description: 'Weekly inspection of spill kits and emergency response equipment',
      category: 'MAINTENANCE',
      frequency: 'WEEKLY',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      is_high_priority: true,
      confidence_score: 0.90,
    },
    {
      document_id: docIds[2] || docIds[0],
      company_id: companyId,
      site_id: siteIds[2] || siteIds[0],
      module_id: moduleId,
      condition_reference: '3.2.1',
      original_text: 'Daily monitoring of effluent discharge parameters shall be performed and recorded.',
      obligation_title: 'Effluent Discharge Monitoring',
      obligation_description: 'Daily monitoring of effluent discharge parameters',
      category: 'MONITORING',
      frequency: 'DAILY',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      is_high_priority: true,
      confidence_score: 0.93,
    },
    {
      document_id: docIds[2] || docIds[0],
      company_id: companyId,
      site_id: siteIds[2] || siteIds[0],
      module_id: moduleId,
      condition_reference: '1.2.4',
      original_text: 'Training records for all operational staff shall be maintained and made available for inspection.',
      obligation_title: 'Staff Training Records',
      obligation_description: 'Maintain training records for all operational staff',
      category: 'RECORD_KEEPING',
      frequency: 'CONTINUOUS',
      status: 'DUE_SOON',
      review_status: 'CONFIRMED',
      confidence_score: 0.87,
      is_high_priority: false,
    },
  ];

  const { data: createdObligations, error: obligationsError } = await supabase
    .from('obligations')
    .insert(obligations)
    .select();

  if (obligationsError) {
    console.error('Error creating obligations:', obligationsError);
  } else {
    console.log(`✅ Created ${createdObligations?.length} obligations`);
  }

  // Get all obligations
  const { data: allObligations } = await supabase
    .from('obligations')
    .select('*')
    .eq('company_id', companyId);

  const obligationIds = allObligations?.map(o => o.id) || [];

  // =========================================================================
  // 4. CREATE SCHEDULES AND DEADLINES
  // =========================================================================
  console.log('\n⏰ Creating schedules and deadlines...');

  // Create schedules for obligations that need them
  if (obligationIds.length > 0) {
    for (let i = 0; i < Math.min(obligationIds.length, 8); i++) {
      const obl = allObligations?.[i];
      if (!obl) continue;

      // Create schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          obligation_id: obl.id,
          frequency: obl.frequency || 'MONTHLY',
          base_date: daysAgo(30),
          next_due_date: i < 4 ? daysFromNow(30 - i * 10) : daysAgo(7 + i * 3),
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (scheduleError) {
        console.error(`Error creating schedule for obligation ${i}:`, scheduleError.message);
        continue;
      }

      // Create deadline
      const dueDate = i < 4 ? daysFromNow(30 - i * 10) : daysAgo(7 + i * 3);
      const deadlineStatus = i < 4 ? 'PENDING' : 'OVERDUE';

      const { error: deadlineError } = await supabase
        .from('deadlines')
        .insert({
          schedule_id: schedule.id,
          obligation_id: obl.id,
          company_id: companyId,
          site_id: obl.site_id,
          due_date: dueDate,
          compliance_period: getCompliancePeriod(),
          status: deadlineStatus,
          is_late: deadlineStatus === 'OVERDUE',
        });

      if (deadlineError) {
        console.error(`Error creating deadline for obligation ${i}:`, deadlineError.message);
      }
    }
    console.log('✅ Created schedules and deadlines');
  }

  // =========================================================================
  // 5. CREATE EVIDENCE
  // =========================================================================
  console.log('\n📎 Creating evidence...');

  const evidence = [
    {
      company_id: companyId,
      site_id: siteIds[0],
      uploaded_by: userId,
      file_name: 'emissions-report-nov-2024.pdf',
      file_type: 'PDF',
      file_size_bytes: 512000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/emissions-report-nov-2024.pdf',
      description: 'Monthly emissions monitoring report from certified laboratory',
      compliance_period: getCompliancePeriod(),
      is_verified: true,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      file_hash: 'abc123def456',
    },
    {
      company_id: companyId,
      site_id: siteIds[0],
      uploaded_by: userId,
      file_name: 'wtn-q4-2024.pdf',
      file_type: 'PDF',
      file_size_bytes: 1024000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/wtn-q4-2024.pdf',
      description: 'Collection of waste transfer notes for Q4',
      compliance_period: getCompliancePeriod(),
      is_verified: true,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      file_hash: 'def456ghi789',
    },
    {
      company_id: companyId,
      site_id: siteIds[1] || siteIds[0],
      uploaded_by: userId,
      file_name: 'groundwater-q3-2024.pdf',
      file_type: 'PDF',
      file_size_bytes: 384000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/groundwater-q3-2024.pdf',
      description: 'Q3 groundwater monitoring results',
      compliance_period: getCompliancePeriod(),
      is_verified: false,
      file_hash: 'ghi789jkl012',
    },
    {
      company_id: companyId,
      site_id: siteIds[1] || siteIds[0],
      uploaded_by: userId,
      file_name: 'fpp-v2.1.pdf',
      file_type: 'PDF',
      file_size_bytes: 2048000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/fpp-v2.1.pdf',
      description: 'Updated fire prevention plan document',
      compliance_period: getCompliancePeriod(),
      is_verified: true,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      file_hash: 'jkl012mno345',
    },
    {
      company_id: companyId,
      site_id: siteIds[2] || siteIds[0],
      uploaded_by: userId,
      file_name: 'spill-kit-inspection.jpg',
      file_type: 'IMAGE',
      file_size_bytes: 256000,
      mime_type: 'image/jpeg',
      storage_path: '/evidence/spill-kit-inspection.jpg',
      description: 'Photo evidence of spill kit inspection',
      compliance_period: getCompliancePeriod(),
      is_verified: false,
      file_hash: 'mno345pqr678',
    },
  ];

  const { data: createdEvidence, error: evidenceError } = await supabase
    .from('evidence_items')
    .insert(evidence)
    .select();

  if (evidenceError) {
    console.error('Error creating evidence:', evidenceError);
  } else {
    console.log(`✅ Created ${createdEvidence?.length} evidence items`);
  }

  // =========================================================================
  // 6. LINK EVIDENCE TO OBLIGATIONS
  // =========================================================================
  console.log('\n🔗 Linking evidence to obligations...');

  if (createdEvidence && allObligations) {
    const evidenceLinks = [
      { evidence_id: createdEvidence[0]?.id, obligation_id: allObligations[1]?.id, compliance_period: getCompliancePeriod(), linked_by: userId },
      { evidence_id: createdEvidence[1]?.id, obligation_id: allObligations[2]?.id, compliance_period: getCompliancePeriod(), linked_by: userId },
      { evidence_id: createdEvidence[2]?.id, obligation_id: allObligations[3]?.id, compliance_period: getCompliancePeriod(), linked_by: userId },
      { evidence_id: createdEvidence[3]?.id, obligation_id: allObligations[4]?.id, compliance_period: getCompliancePeriod(), linked_by: userId },
    ].filter(link => link.evidence_id && link.obligation_id);

    const { error: linksError } = await supabase
      .from('obligation_evidence_links')
      .insert(evidenceLinks);

    if (linksError) {
      console.error('Error linking evidence:', linksError);
    } else {
      console.log(`✅ Linked ${evidenceLinks.length} evidence items to obligations`);
    }
  }

  // =========================================================================
  // 7. CREATE AUDIT PACKS
  // =========================================================================
  console.log('\n📦 Creating audit packs...');

  const packs = [
    {
      document_id: docIds[0],
      company_id: companyId,
      site_id: siteIds[0],
      pack_type: 'AUDIT_PACK',
      title: 'EA Compliance Pack - Manchester - Q4 2024',
      date_range_start: daysAgo(90),
      date_range_end: daysAgo(1),
      total_obligations: 3,
      complete_count: 2,
      pending_count: 1,
      overdue_count: 0,
      evidence_count: 2,
      storage_path: '/packs/manchester-compliance-q4-2024.pdf',
      file_size_bytes: 5120000,
      generated_by: userId,
      generation_trigger: 'MANUAL',
      recipient_type: 'REGULATOR',
      recipient_name: 'Environment Agency',
    },
    {
      document_id: docIds[0],
      company_id: companyId,
      site_id: siteIds[0],
      pack_type: 'AUDIT_PACK',
      title: 'Annual Environmental Report Pack 2024',
      date_range_start: daysAgo(365),
      date_range_end: daysAgo(1),
      total_obligations: 12,
      complete_count: 10,
      pending_count: 2,
      overdue_count: 0,
      evidence_count: 8,
      storage_path: '/packs/manchester-aer-2024.pdf',
      file_size_bytes: 8192000,
      generated_by: userId,
      generation_trigger: 'MANUAL',
      recipient_type: 'REGULATOR',
      recipient_name: 'Environment Agency',
    },
  ];

  const { data: createdPacks, error: packsError } = await supabase
    .from('audit_packs')
    .insert(packs)
    .select();

  if (packsError) {
    console.error('Error creating packs:', packsError);
  } else {
    console.log(`✅ Created ${createdPacks?.length} audit packs`);
  }

  // =========================================================================
  // 8. ACTIVATE MODULES FOR ALL SITES
  // =========================================================================
  console.log('\n🔌 Activating modules for sites...');

  // Get module IDs
  const { data: modules } = await supabase
    .from('modules')
    .select('id, module_code');

  const moduleMap = new Map(modules?.map(m => [m.module_code, m.id]) || []);

  // Activate all modules for all sites
  for (const siteId of siteIds) {
    for (const [code, modId] of moduleMap) {
      const { error } = await supabase
        .from('module_activations')
        .upsert({
          company_id: companyId,
          site_id: siteId,
          module_id: modId,
          status: 'ACTIVE',
          activated_by: userId,
          activated_at: new Date().toISOString(),
          billing_start_date: new Date().toISOString().split('T')[0],
        }, { onConflict: 'company_id,site_id,module_id', ignoreDuplicates: true });

      if (error && !error.message.includes('duplicate')) {
        // Ignore errors, just try to activate what we can
      }
    }
  }

  console.log('✅ Modules activated for all sites');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEMO DATA SEEDING COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nCreated:');
  console.log(`  • ${allSites?.length || 0} sites`);
  console.log(`  • ${allDocs?.length || 0} documents/permits`);
  console.log(`  • ${allObligations?.length || 0} obligations`);
  console.log(`  • ${createdEvidence?.length || 0} evidence items`);
  console.log(`  • ${createdPacks?.length || 0} audit packs`);
  console.log('\nSite Summary:');
  console.log('  • Manchester Manufacturing Plant - Compliant');
  console.log('  • Birmingham Distribution Centre - At Risk');
  console.log('  • Leeds Processing Facility - Non-Compliant');
  console.log('\nLogin with:');
  console.log('  Email: admin@oblicore.com');
  console.log('  Password: AdminPass123');
  console.log('\nRefresh your browser to see all the demo data!');
}

seedDemoData().catch(console.error);
