/**
 * Clean and Seed Demo Data Script
 *
 * This script:
 * 1. Cleans all existing test data for the demo company
 * 2. Seeds fresh, properly linked demo data
 *
 * Run with: npx tsx scripts/clean-and-seed.ts
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_USER_EMAIL = 'admin@oblicore.com';

// Helper functions
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

const getCompliancePeriod = () => {
  const date = new Date();
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
};

async function cleanAndSeed() {
  console.log('🧹 Starting clean and seed process...\n');

  // =========================================================================
  // 1. GET USER AND COMPANY
  // =========================================================================
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, company_id')
    .eq('email', TEST_USER_EMAIL)
    .single();

  if (userError || !userData) {
    console.error('Test user not found. Please login first.');
    process.exit(1);
  }

  const userId = userData.id;
  const companyId = userData.company_id;
  console.log(`Found user: ${userId}`);
  console.log(`Company: ${companyId}`);

  // =========================================================================
  // 2. CLEAN EXISTING DATA (in correct order due to foreign keys)
  // =========================================================================
  console.log('\n🗑️  Cleaning existing data...');

  // Delete in order of dependencies (most dependent first)
  const tablesToClean = [
    'obligation_evidence_links',
    'audit_packs',
    'deadlines',
    'schedules',
    'evidence_items',
    'obligations',
    'documents',
    'module_activations',
    'sites',
  ];

  for (const table of tablesToClean) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('company_id', companyId);

    if (error && !error.message.includes('column') && !error.message.includes('company_id')) {
      // Try without company_id filter for tables that use site_id
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('company_id', companyId);

      if (sites && sites.length > 0) {
        const siteIds = sites.map(s => s.id);
        await supabase.from(table).delete().in('site_id', siteIds);
      }
    }
    console.log(`  ✓ Cleaned ${table}`);
  }

  // Final cleanup of sites
  await supabase.from('sites').delete().eq('company_id', companyId);
  console.log('  ✓ Cleaned sites');

  // =========================================================================
  // 3. GET MODULE IDS
  // =========================================================================
  const { data: modules } = await supabase
    .from('modules')
    .select('id, module_code');

  const moduleMap = new Map(modules?.map(m => [m.module_code, m.id]) || []);
  const module1Id = moduleMap.get('MODULE_1');

  if (!module1Id) {
    console.error('Module 1 not found');
    process.exit(1);
  }

  // =========================================================================
  // 4. CREATE SITES
  // =========================================================================
  console.log('\n📍 Creating sites...');

  const sitesData = [
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

  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .insert(sitesData)
    .select();

  if (sitesError || !sites) {
    console.error('Error creating sites:', sitesError);
    process.exit(1);
  }
  console.log(`✅ Created ${sites.length} sites`);

  const [manchesterSite, birminghamSite, leedsSite] = sites;

  // =========================================================================
  // 5. ACTIVATE ALL MODULES FOR ALL SITES
  // =========================================================================
  console.log('\n🔌 Activating modules...');

  for (const site of sites) {
    for (const [code, modId] of moduleMap) {
      await supabase.from('module_activations').insert({
        company_id: companyId,
        site_id: site.id,
        module_id: modId,
        status: 'ACTIVE',
        activated_by: userId,
        activated_at: new Date().toISOString(),
        billing_start_date: new Date().toISOString().split('T')[0],
      });
    }
  }
  console.log('✅ Modules activated for all sites');

  // =========================================================================
  // 6. CREATE DOCUMENTS (PERMITS)
  // =========================================================================
  console.log('\n📄 Creating documents...');

  const documentsData = [
    {
      site_id: manchesterSite.id,
      module_id: module1Id,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/AB1234CD',
      title: 'Environmental Permit EPR/AB1234CD',
      description: 'Main environmental permit for Manchester Manufacturing Plant',
      regulator: 'EA',
      issue_date: daysAgo(365),
      effective_date: daysAgo(365),
      expiry_date: daysFromNow(730),
      status: 'ACTIVE',
      original_filename: 'manchester-permit.pdf',
      storage_path: '/permits/manchester-permit.pdf',
      file_size_bytes: 2048576,
      mime_type: 'application/pdf',
      extraction_status: 'COMPLETED',
      uploaded_by: userId,
    },
    {
      site_id: birminghamSite.id,
      module_id: module1Id,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/EF5678GH',
      title: 'Environmental Permit EPR/EF5678GH',
      description: 'Environmental permit for Birmingham Distribution Centre',
      regulator: 'EA',
      issue_date: daysAgo(400),
      effective_date: daysAgo(400),
      expiry_date: daysFromNow(330),
      status: 'ACTIVE',
      original_filename: 'birmingham-permit.pdf',
      storage_path: '/permits/birmingham-permit.pdf',
      file_size_bytes: 1856000,
      mime_type: 'application/pdf',
      extraction_status: 'COMPLETED',
      uploaded_by: userId,
    },
    {
      site_id: leedsSite.id,
      module_id: module1Id,
      document_type: 'ENVIRONMENTAL_PERMIT',
      reference_number: 'EPR/IJ9012KL',
      title: 'Environmental Permit EPR/IJ9012KL',
      description: 'Environmental permit for Leeds Processing Facility',
      regulator: 'EA',
      issue_date: daysAgo(30),
      effective_date: daysAgo(30),
      expiry_date: daysFromNow(335),
      status: 'ACTIVE',
      original_filename: 'leeds-permit.pdf',
      storage_path: '/permits/leeds-permit.pdf',
      file_size_bytes: 2200000,
      mime_type: 'application/pdf',
      extraction_status: 'COMPLETED',
      uploaded_by: userId,
    },
  ];

  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .insert(documentsData)
    .select();

  if (docsError || !documents) {
    console.error('Error creating documents:', docsError);
    process.exit(1);
  }
  console.log(`✅ Created ${documents.length} documents`);

  const [manchesterDoc, birminghamDoc, leedsDoc] = documents;

  // =========================================================================
  // 7. CREATE OBLIGATIONS
  // =========================================================================
  console.log('\n📋 Creating obligations...');

  const obligationsData = [
    // Manchester - COMPLIANT SITE (2 completed, 1 pending)
    {
      document_id: manchesterDoc.id,
      company_id: companyId,
      site_id: manchesterSite.id,
      module_id: module1Id,
      condition_reference: '4.2.1',
      original_text: 'Submit annual environmental report within 3 months of reporting period end.',
      obligation_title: 'Annual Environmental Report',
      obligation_description: 'Submit the annual environmental performance report to the Environment Agency',
      category: 'REPORTING',
      frequency: 'ANNUAL',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.95,
      is_high_priority: false,
    },
    {
      document_id: manchesterDoc.id,
      company_id: companyId,
      site_id: manchesterSite.id,
      module_id: module1Id,
      condition_reference: '3.1.2',
      original_text: 'Conduct monthly stack emissions monitoring at all emission points.',
      obligation_title: 'Monthly Emissions Monitoring',
      obligation_description: 'Conduct monthly stack emissions monitoring and record results',
      category: 'MONITORING',
      frequency: 'MONTHLY',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.92,
      is_high_priority: false,
    },
    {
      document_id: manchesterDoc.id,
      company_id: companyId,
      site_id: manchesterSite.id,
      module_id: module1Id,
      condition_reference: '5.3.1',
      original_text: 'Retain waste transfer notes for minimum 2 years.',
      obligation_title: 'Waste Transfer Note Retention',
      obligation_description: 'Maintain waste transfer notes for minimum 2 years',
      category: 'RECORD_KEEPING',
      frequency: 'CONTINUOUS',
      status: 'PENDING',
      review_status: 'CONFIRMED',
      confidence_score: 0.98,
      is_high_priority: false,
    },

    // Birmingham - AT RISK SITE (1 completed, 2 due soon)
    {
      document_id: birminghamDoc.id,
      company_id: companyId,
      site_id: birminghamSite.id,
      module_id: module1Id,
      condition_reference: '3.6.1',
      original_text: 'Conduct annual noise survey at site boundary.',
      obligation_title: 'Annual Noise Survey',
      obligation_description: 'Conduct boundary noise monitoring survey',
      category: 'MONITORING',
      frequency: 'ANNUAL',
      status: 'COMPLETED',
      review_status: 'CONFIRMED',
      confidence_score: 0.94,
      is_high_priority: false,
    },
    {
      document_id: birminghamDoc.id,
      company_id: companyId,
      site_id: birminghamSite.id,
      module_id: module1Id,
      condition_reference: '3.4.1',
      original_text: 'Conduct quarterly groundwater sampling at all monitoring boreholes.',
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
      document_id: birminghamDoc.id,
      company_id: companyId,
      site_id: birminghamSite.id,
      module_id: module1Id,
      condition_reference: '2.5.2',
      original_text: 'Review and update fire prevention plan annually.',
      obligation_title: 'Fire Prevention Plan Review',
      obligation_description: 'Annual review and update of fire prevention plan',
      category: 'OPERATIONAL',
      frequency: 'ANNUAL',
      status: 'DUE_SOON',
      review_status: 'CONFIRMED',
      confidence_score: 0.91,
      is_high_priority: true,
    },

    // Leeds - NON-COMPLIANT SITE (0 completed, 1 pending, 3 overdue)
    {
      document_id: leedsDoc.id,
      company_id: companyId,
      site_id: leedsSite.id,
      module_id: module1Id,
      condition_reference: '1.2.4',
      original_text: 'Maintain training records for all operational staff.',
      obligation_title: 'Staff Training Records',
      obligation_description: 'Maintain training records for all operational staff',
      category: 'RECORD_KEEPING',
      frequency: 'CONTINUOUS',
      status: 'PENDING',
      review_status: 'CONFIRMED',
      confidence_score: 0.87,
      is_high_priority: false,
    },
    {
      document_id: leedsDoc.id,
      company_id: companyId,
      site_id: leedsSite.id,
      module_id: module1Id,
      condition_reference: '2.3.1',
      original_text: 'Implement odour management controls as per approved plan.',
      obligation_title: 'Odour Management Plan',
      obligation_description: 'Implement and maintain odour management controls',
      category: 'OPERATIONAL',
      frequency: 'CONTINUOUS',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      confidence_score: 0.85,
      is_high_priority: true,
    },
    {
      document_id: leedsDoc.id,
      company_id: companyId,
      site_id: leedsSite.id,
      module_id: module1Id,
      condition_reference: '2.4.3',
      original_text: 'Conduct weekly inspection of spill kits and emergency equipment.',
      obligation_title: 'Spill Kit Inspection',
      obligation_description: 'Weekly inspection of spill kits and emergency response equipment',
      category: 'MAINTENANCE',
      frequency: 'WEEKLY',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      confidence_score: 0.90,
      is_high_priority: true,
    },
    {
      document_id: leedsDoc.id,
      company_id: companyId,
      site_id: leedsSite.id,
      module_id: module1Id,
      condition_reference: '3.2.1',
      original_text: 'Perform daily monitoring of effluent discharge parameters.',
      obligation_title: 'Effluent Discharge Monitoring',
      obligation_description: 'Daily monitoring of effluent discharge parameters',
      category: 'MONITORING',
      frequency: 'DAILY',
      status: 'OVERDUE',
      review_status: 'CONFIRMED',
      confidence_score: 0.93,
      is_high_priority: true,
    },
  ];

  const { data: obligations, error: oblError } = await supabase
    .from('obligations')
    .insert(obligationsData)
    .select();

  if (oblError || !obligations) {
    console.error('Error creating obligations:', oblError);
    process.exit(1);
  }
  console.log(`✅ Created ${obligations.length} obligations`);

  // =========================================================================
  // 8. CREATE SCHEDULES AND DEADLINES
  // =========================================================================
  console.log('\n⏰ Creating schedules and deadlines...');

  let schedulesCreated = 0;
  let deadlinesCreated = 0;

  for (const obl of obligations) {
    // Skip continuous obligations for deadline creation
    if (obl.frequency === 'CONTINUOUS') continue;

    // Calculate due date based on status
    let dueDate: string;
    let deadlineStatus: string;

    if (obl.status === 'COMPLETED') {
      dueDate = daysAgo(10); // Completed items had deadlines in the past
      deadlineStatus = 'COMPLETED';
    } else if (obl.status === 'DUE_SOON') {
      dueDate = daysFromNow(5); // Due in 5 days
      deadlineStatus = 'DUE_SOON';
    } else if (obl.status === 'OVERDUE') {
      dueDate = daysFromNow(30); // Future date (we can't create past deadlines due to constraint)
      deadlineStatus = 'PENDING'; // Mark as pending since we can't backdate
    } else {
      dueDate = daysFromNow(20); // Pending items due in 20 days
      deadlineStatus = 'PENDING';
    }

    // Create schedule
    const { data: schedule, error: schedError } = await supabase
      .from('schedules')
      .insert({
        obligation_id: obl.id,
        frequency: obl.frequency,
        base_date: daysAgo(30),
        next_due_date: dueDate,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (schedError) {
      console.error(`  Error creating schedule for ${obl.obligation_title}:`, schedError.message);
      continue;
    }
    schedulesCreated++;

    // Create deadline
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
        is_late: false,
        completed_at: deadlineStatus === 'COMPLETED' ? new Date().toISOString() : null,
        completed_by: deadlineStatus === 'COMPLETED' ? userId : null,
      });

    if (deadlineError) {
      console.error(`  Error creating deadline for ${obl.obligation_title}:`, deadlineError.message);
      continue;
    }
    deadlinesCreated++;
  }

  console.log(`✅ Created ${schedulesCreated} schedules and ${deadlinesCreated} deadlines`);

  // =========================================================================
  // 9. CREATE EVIDENCE ITEMS
  // =========================================================================
  console.log('\n📎 Creating evidence...');

  const evidenceData = [
    {
      company_id: companyId,
      site_id: manchesterSite.id,
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
      file_hash: 'abc123def456' + Date.now(),
    },
    {
      company_id: companyId,
      site_id: manchesterSite.id,
      uploaded_by: userId,
      file_name: 'annual-report-2024.pdf',
      file_type: 'PDF',
      file_size_bytes: 1024000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/annual-report-2024.pdf',
      description: 'Annual environmental performance report',
      compliance_period: getCompliancePeriod(),
      is_verified: true,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      file_hash: 'def456ghi789' + Date.now(),
    },
    {
      company_id: companyId,
      site_id: birminghamSite.id,
      uploaded_by: userId,
      file_name: 'noise-survey-2024.pdf',
      file_type: 'PDF',
      file_size_bytes: 384000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/noise-survey-2024.pdf',
      description: 'Annual boundary noise monitoring survey',
      compliance_period: getCompliancePeriod(),
      is_verified: true,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      file_hash: 'ghi789jkl012' + Date.now(),
    },
    {
      company_id: companyId,
      site_id: birminghamSite.id,
      uploaded_by: userId,
      file_name: 'groundwater-sample.pdf',
      file_type: 'PDF',
      file_size_bytes: 256000,
      mime_type: 'application/pdf',
      storage_path: '/evidence/groundwater-sample.pdf',
      description: 'Groundwater sampling results (pending verification)',
      compliance_period: getCompliancePeriod(),
      is_verified: false,
      file_hash: 'jkl012mno345' + Date.now(),
    },
    {
      company_id: companyId,
      site_id: leedsSite.id,
      uploaded_by: userId,
      file_name: 'training-records.xlsx',
      file_type: 'XLSX',
      file_size_bytes: 128000,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      storage_path: '/evidence/training-records.xlsx',
      description: 'Staff training records (incomplete)',
      compliance_period: getCompliancePeriod(),
      is_verified: false,
      file_hash: 'mno345pqr678' + Date.now(),
    },
  ];

  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence_items')
    .insert(evidenceData)
    .select();

  if (evidenceError || !evidence) {
    console.error('Error creating evidence:', evidenceError);
    process.exit(1);
  }
  console.log(`✅ Created ${evidence.length} evidence items`);

  // =========================================================================
  // 10. LINK EVIDENCE TO OBLIGATIONS
  // =========================================================================
  console.log('\n🔗 Linking evidence to obligations...');

  // Manchester obligations (first 3)
  const manchesterObligations = obligations.filter(o => o.site_id === manchesterSite.id);
  const birminghamObligations = obligations.filter(o => o.site_id === birminghamSite.id);

  const evidenceLinks = [
    // Link annual report evidence to annual report obligation
    { evidence_id: evidence[1].id, obligation_id: manchesterObligations[0]?.id },
    // Link emissions report to emissions monitoring obligation
    { evidence_id: evidence[0].id, obligation_id: manchesterObligations[1]?.id },
    // Link noise survey to noise survey obligation
    { evidence_id: evidence[2].id, obligation_id: birminghamObligations[0]?.id },
    // Link groundwater sample to groundwater monitoring (pending)
    { evidence_id: evidence[3].id, obligation_id: birminghamObligations[1]?.id },
  ].filter(link => link.evidence_id && link.obligation_id);

  for (const link of evidenceLinks) {
    await supabase.from('obligation_evidence_links').insert({
      evidence_id: link.evidence_id,
      obligation_id: link.obligation_id,
      compliance_period: getCompliancePeriod(),
      linked_by: userId,
    });
  }
  console.log(`✅ Linked ${evidenceLinks.length} evidence items to obligations`);

  // =========================================================================
  // 11. CREATE AUDIT PACKS
  // =========================================================================
  console.log('\n📦 Creating audit packs...');

  const packsData = [
    {
      document_id: manchesterDoc.id,
      company_id: companyId,
      site_id: manchesterSite.id,
      pack_type: 'AUDIT_PACK',
      title: 'Manchester Q4 2024 Compliance Pack',
      date_range_start: daysAgo(90),
      date_range_end: new Date().toISOString().split('T')[0],
      total_obligations: 3,
      complete_count: 2,
      pending_count: 1,
      overdue_count: 0,
      evidence_count: 2,
      storage_path: '/packs/manchester-q4-2024.pdf',
      file_size_bytes: 5120000,
      generated_by: userId,
      generation_trigger: 'MANUAL',
      recipient_type: 'REGULATOR',
      recipient_name: 'Environment Agency',
    },
    {
      document_id: birminghamDoc.id,
      company_id: companyId,
      site_id: birminghamSite.id,
      pack_type: 'AUDIT_PACK',
      title: 'Birmingham Q4 2024 Compliance Pack',
      date_range_start: daysAgo(90),
      date_range_end: new Date().toISOString().split('T')[0],
      total_obligations: 3,
      complete_count: 1,
      pending_count: 0,
      overdue_count: 0,
      evidence_count: 2,
      storage_path: '/packs/birmingham-q4-2024.pdf',
      file_size_bytes: 4096000,
      generated_by: userId,
      generation_trigger: 'MANUAL',
      recipient_type: 'REGULATOR',
      recipient_name: 'Environment Agency',
    },
  ];

  const { data: packs, error: packsError } = await supabase
    .from('audit_packs')
    .insert(packsData)
    .select();

  if (packsError) {
    console.error('Error creating packs:', packsError);
  } else {
    console.log(`✅ Created ${packs?.length} audit packs`);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 CLEAN AND SEED COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📊 Data Summary:');
  console.log(`  Sites: 3`);
  console.log(`  Documents: 3`);
  console.log(`  Obligations: ${obligations.length}`);
  console.log(`  Schedules: ${schedulesCreated}`);
  console.log(`  Deadlines: ${deadlinesCreated}`);
  console.log(`  Evidence: ${evidence.length}`);
  console.log(`  Audit Packs: ${packs?.length || 0}`);
  console.log('\n📍 Site Status:');
  console.log('  • Manchester Manufacturing Plant - COMPLIANT (2/3 complete)');
  console.log('  • Birmingham Distribution Centre - AT RISK (2 items due soon)');
  console.log('  • Leeds Processing Facility - NON-COMPLIANT (3 overdue)');
  console.log('\n🔑 Login:');
  console.log('  Email: admin@oblicore.com');
  console.log('  Password: AdminPass123');
  console.log('\n✨ Refresh your browser to see the demo data!');
}

cleanAndSeed().catch(console.error);
