/**
 * Compliance Clock Update Job
 * Updates compliance clocks for all entities (obligations, deadlines, parameters, generators, consents, waste streams, contractor licences)
 * Reference: docs/specs/41_Backend_Background_Jobs.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface ComplianceClockUpdateJobData {
  company_id?: string;
  site_id?: string;
  entity_type?: string;
}

export async function processComplianceClockUpdateJob(job: Job<ComplianceClockUpdateJobData>): Promise<void> {
  const { company_id, site_id, entity_type } = job.data;

  try {
    let clocksCreated = 0;
    let clocksUpdated = 0;
    let clocksDeleted = 0;

    // Process each entity type
    const entityTypes = entity_type 
      ? [entity_type] 
      : ['OBLIGATION', 'DEADLINE', 'PARAMETER', 'GENERATOR', 'CONSENT', 'WASTE_STREAM', 'CONTRACTOR_LICENCE'];

    for (const type of entityTypes) {
      switch (type) {
        case 'OBLIGATION':
          const obligationResult = await processObligationClocks(company_id, site_id);
          clocksCreated += obligationResult.created;
          clocksUpdated += obligationResult.updated;
          clocksDeleted += obligationResult.deleted;
          break;
        case 'DEADLINE':
          const deadlineResult = await processDeadlineClocks(company_id, site_id);
          clocksCreated += deadlineResult.created;
          clocksUpdated += deadlineResult.updated;
          clocksDeleted += deadlineResult.deleted;
          break;
        case 'CONTRACTOR_LICENCE':
          const licenceResult = await processContractorLicenceClocks(company_id);
          clocksCreated += licenceResult.created;
          clocksUpdated += licenceResult.updated;
          clocksDeleted += licenceResult.deleted;
          break;
        // Add other entity types as needed
      }
    }

    console.log(`Compliance clock update completed: ${clocksCreated} created, ${clocksUpdated} updated, ${clocksDeleted} deleted`);
  } catch (error: any) {
    console.error('Compliance clock update job failed:', error);
    throw error;
  }
}

async function processObligationClocks(companyId?: string, siteId?: string): Promise<{ created: number; updated: number; deleted: number }> {
  let query = supabaseAdmin
    .from('obligations')
    .select('id, company_id, site_id, deadline_date, status, obligation_title')
    .in('status', ['ACTIVE', 'PENDING'])
    .not('deadline_date', 'is', null)
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);
  if (siteId) query = query.eq('site_id', siteId);

  const { data: obligations } = await query;

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Get Module 1 ID
  const { data: module1 } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_1')
    .single();

  for (const obligation of obligations || []) {
    const daysRemaining = calculateDaysRemaining(obligation.deadline_date);
    const criticality = calculateCriticality(daysRemaining);
    const status = daysRemaining < 0 ? 'OVERDUE' : 'ACTIVE';

    // Upsert compliance clock
    const { data: existing } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id')
      .eq('entity_type', 'OBLIGATION')
      .eq('entity_id', obligation.id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .update({
          target_date: obligation.deadline_date,
          days_remaining: daysRemaining,
          status,
          criticality,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .insert({
          clock_name: obligation.obligation_title || `Obligation ${obligation.id.substring(0, 8)}`,
          entity_type: 'OBLIGATION',
          entity_id: obligation.id,
          company_id: obligation.company_id,
          site_id: obligation.site_id,
          module_id: module1?.id || null,
          target_date: obligation.deadline_date,
          days_remaining: daysRemaining,
          status,
          criticality,
        });
      created++;
    }
  }

  // Delete clocks for completed/expired obligations
  const { data: completedObligations } = await supabaseAdmin
    .from('obligations')
    .select('id')
    .in('status', ['COMPLETED', 'NOT_APPLICABLE'])
    .is('deleted_at', null);

  if (completedObligations && completedObligations.length > 0) {
    const completedIds = completedObligations.map((o: any) => o.id);
    const { data: clocksToDelete } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id')
      .eq('entity_type', 'OBLIGATION')
      .in('entity_id', completedIds);

    if (clocksToDelete && clocksToDelete.length > 0) {
      const clockIds = clocksToDelete.map((c: any) => c.id);
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .delete()
        .in('id', clockIds);
      deleted += clockIds.length;
    }
  }

  return { created, updated, deleted };
}

async function processDeadlineClocks(companyId?: string, siteId?: string): Promise<{ created: number; updated: number; deleted: number }> {
  let query = supabaseAdmin
    .from('deadlines')
    .select('id, obligation_id, company_id, site_id, due_date, status')
    .eq('status', 'PENDING')
    .not('due_date', 'is', null);

  if (companyId) query = query.eq('company_id', companyId);
  if (siteId) query = query.eq('site_id', siteId);

  const { data: deadlines } = await query;

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Get Module 1 ID
  const { data: module1 } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_1')
    .single();

  for (const deadline of deadlines || []) {
    const daysRemaining = calculateDaysRemaining(deadline.due_date);
    const criticality = calculateCriticality(daysRemaining);
    const status = daysRemaining < 0 ? 'OVERDUE' : 'ACTIVE';

    // Upsert compliance clock
    const { data: existing } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id')
      .eq('entity_type', 'DEADLINE')
      .eq('entity_id', deadline.id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .update({
          target_date: deadline.due_date,
          days_remaining: daysRemaining,
          status,
          criticality,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .insert({
          clock_name: `Deadline ${deadline.id.substring(0, 8)}`,
          entity_type: 'DEADLINE',
          entity_id: deadline.id,
          company_id: deadline.company_id,
          site_id: deadline.site_id,
          module_id: module1?.id || null,
          target_date: deadline.due_date,
          days_remaining: daysRemaining,
          status,
          criticality,
        });
      created++;
    }
  }

  return { created, updated, deleted };
}

async function processContractorLicenceClocks(companyId?: string): Promise<{ created: number; updated: number; deleted: number }> {
  let query = supabaseAdmin
    .from('contractor_licences')
    .select('id, company_id, contractor_name, licence_number, expiry_date, is_valid')
    .eq('is_valid', true)
    .not('expiry_date', 'is', null);

  if (companyId) query = query.eq('company_id', companyId);

  const { data: licences } = await query;

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Get Module 4 ID
  const { data: module4 } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', 'MODULE_4')
    .single();

  for (const licence of licences || []) {
    const daysRemaining = calculateDaysRemaining(licence.expiry_date);
    const criticality = calculateCriticality(daysRemaining);
    const status = daysRemaining < 0 ? 'OVERDUE' : 'ACTIVE';

    // Upsert compliance clock
    const { data: existing } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id')
      .eq('entity_type', 'CONTRACTOR_LICENCE')
      .eq('entity_id', licence.id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .update({
          target_date: licence.expiry_date,
          days_remaining: daysRemaining,
          status,
          criticality,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .insert({
          clock_name: `Contractor Licence ${licence.licence_number}`,
          entity_type: 'CONTRACTOR_LICENCE',
          entity_id: licence.id,
          company_id: licence.company_id,
          site_id: null,
          module_id: module4?.id || null,
          target_date: licence.expiry_date,
          days_remaining: daysRemaining,
          status,
          criticality,
        });
      created++;
    }
  }

  // Delete clocks for invalid/expired licences
  const { data: invalidLicences } = await supabaseAdmin
    .from('contractor_licences')
    .select('id')
    .eq('is_valid', false);

  if (invalidLicences && invalidLicences.length > 0) {
    const invalidIds = invalidLicences.map((l: any) => l.id);
    const { data: clocksToDelete } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('id')
      .eq('entity_type', 'CONTRACTOR_LICENCE')
      .in('entity_id', invalidIds);

    if (clocksToDelete && clocksToDelete.length > 0) {
      const clockIds = clocksToDelete.map((c: any) => c.id);
      await supabaseAdmin
        .from('compliance_clocks_universal')
        .delete()
        .in('id', clockIds);
      deleted += clockIds.length;
    }
  }

  return { created, updated, deleted };
}

function calculateDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateCriticality(daysRemaining: number): 'RED' | 'AMBER' | 'GREEN' {
  if (daysRemaining < 0) return 'RED';
  if (daysRemaining <= 7) return 'RED';
  if (daysRemaining <= 30) return 'AMBER';
  return 'GREEN';
}

