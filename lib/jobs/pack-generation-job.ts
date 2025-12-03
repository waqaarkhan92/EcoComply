/**
 * Pack Generation Job
 * Generates PDF packs (Audit, Regulator, Tender, Board, Insurer)
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 6.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import PDFDocument from 'pdfkit';

export interface PackGenerationJobData {
  pack_id: string;
  pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | 'TENDER_CLIENT_ASSURANCE' | 'BOARD_MULTI_SITE_RISK' | 'INSURER_BROKER';
  company_id: string;
  site_id?: string;
  document_id?: string;
  date_range_start?: string;
  date_range_end?: string;
  filters?: {
    status?: string[];
    category?: string[];
  };
}

export async function processPackGenerationJob(job: Job<PackGenerationJobData>): Promise<void> {
  const { pack_id, pack_type, company_id, site_id, document_id, date_range_start, date_range_end, filters } = job.data;

  const generationStartTime = Date.now();

  try {
    // Get pack record
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('*')
      .eq('id', pack_id)
      .single();

    if (packError || !pack) {
      throw new Error(`Pack not found: ${packError?.message || 'Unknown error'}`);
    }

    // Collect data based on pack type
    const packData = await collectPackData(pack_type, company_id, site_id, document_id, date_range_start, date_range_end, filters);

    // Generate PDF
    const pdfBuffer = await generatePackPDF(pack_type, packData, pack);

    // Upload to Supabase Storage
    const storagePath = await uploadPackToStorage(pack_id, pdfBuffer, pack_type);

    // Calculate generation time and update pack with SLA tracking
    const generationEndTime = Date.now();
    const generationSlaSeconds = Math.floor((generationEndTime - generationStartTime) / 1000);
    
    // Log warning if SLA exceeded
    if (generationSlaSeconds > 120) {
      console.warn(`Pack generation SLA exceeded: ${generationSlaSeconds} seconds (target: 120 seconds) for pack ${pack_id}`);
    } else {
      console.log(`Pack generation completed in ${generationSlaSeconds} seconds (SLA compliant)`);
    }

    // Update pack record with status, file path, and SLA tracking
    await supabaseAdmin
      .from('audit_packs')
      .update({
        status: 'COMPLETED',
        file_path: storagePath,
        generation_sla_seconds: generationSlaSeconds,
        file_size_bytes: pdfBuffer.length,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pack_id);

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: pack.generated_by,
      company_id: company_id,
      site_id: site_id || null,
      recipient_email: null, // Will be populated from user
      notification_type: `${pack_type}_READY`,
      channel: 'EMAIL',
      priority: 'NORMAL',
      subject: `${getPackTypeName(pack_type)} Pack Ready`,
      body_text: `Your ${getPackTypeName(pack_type)} pack has been generated and is ready for download.`,
      entity_type: 'audit_pack',
      entity_id: pack_id,
      status: 'PENDING',
      scheduled_for: new Date().toISOString(),
    });

    console.log(`Pack generation completed: ${pack_id} - ${pack_type}`);
  } catch (error: any) {
    console.error(`Pack generation failed: ${pack_id}`, error);

    // Update pack status
    await supabaseAdmin
      .from('audit_packs')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pack_id);

    throw error; // Re-throw to trigger retry
  }
}

/**
 * Collect data for pack generation
 */
async function collectPackData(
  packType: string,
  companyId: string,
  siteId?: string,
  documentId?: string,
  dateRangeStart?: string,
  dateRangeEnd?: string,
  filters?: any
): Promise<any> {
  // Get company and site info
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, company_number')
    .eq('id', companyId)
    .single();

  let site = null;
  if (siteId) {
    const { data: siteData } = await supabaseAdmin
      .from('sites')
      .select('name, address, regulator')
      .eq('id', siteId)
      .single();
    site = siteData;
  }

  // Get obligations
  let obligationsQuery = supabaseAdmin
    .from('obligations')
    .select(`
      id,
      original_text,
      obligation_title,
      obligation_description,
      category,
      status,
      frequency,
      deadline_date,
      condition_reference,
      page_reference,
      documents!inner(id, title, reference_number, document_type)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (siteId) {
    obligationsQuery = obligationsQuery.eq('site_id', siteId);
  }
  if (documentId) {
    obligationsQuery = obligationsQuery.eq('document_id', documentId);
  }
  if (dateRangeStart && dateRangeEnd) {
    obligationsQuery = obligationsQuery
      .gte('deadline_date', dateRangeStart)
      .lte('deadline_date', dateRangeEnd);
  }
  if (filters?.status) {
    obligationsQuery = obligationsQuery.in('status', filters.status);
  }
  if (filters?.category) {
    obligationsQuery = obligationsQuery.in('category', filters.category);
  }

  const { data: obligations } = await obligationsQuery;

  // Get evidence for each obligation
  const obligationsWithEvidence: any[] = [];
  if (obligations) {
    for (const obligation of obligations) {
      const { data: evidenceLinks } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select(`
          evidence_items!inner(
            id,
            title,
            file_name,
            file_size_bytes,
            upload_date,
            evidence_type
          )
        `)
        .eq('obligation_id', obligation.id)
        .is('deleted_at', null);

      obligationsWithEvidence.push({
        ...obligation,
        evidence: evidenceLinks?.map((link: any) => link.evidence_items) || [],
      });
    }
  }

  return {
    company,
    site,
    obligations: obligationsWithEvidence,
    packType,
    dateRange: {
      start: dateRangeStart,
      end: dateRangeEnd,
    },
  };
}

/**
 * Generate PDF for pack
 */
async function generatePackPDF(packType: string, packData: any, pack: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cover Page
    doc.fontSize(24).text(getPackTypeName(packType), { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(packData.company?.name || 'Company Name', { align: 'center' });
    if (packData.site) {
      doc.fontSize(14).text(packData.site.name, { align: 'center' });
    }
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (packData.dateRange.start && packData.dateRange.end) {
      doc.text(`Period: ${packData.dateRange.start} to ${packData.dateRange.end}`, { align: 'center' });
    }
    doc.addPage();

    // ============================================================================
    // SECTION 1: COMPLIANCE SCORE (NEW)
    // ============================================================================
    doc.fontSize(18).text('Compliance Score', { underline: true });
    doc.moveDown();

    const complianceScore = await calculateComplianceScore(packData, pack);
    doc.fontSize(14).text(`Site-Level Compliance Score: ${complianceScore.site_score}/100`, { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Calculation Date: ${complianceScore.calculated_at}`);
    doc.moveDown();
    
    doc.fontSize(12).text('Score Breakdown:', { underline: true });
    doc.text(`Total Obligations: ${complianceScore.breakdown.total_obligations}`);
    doc.text(`Completed: ${complianceScore.breakdown.completed_obligations}`);
    doc.text(`Overdue: ${complianceScore.breakdown.overdue_count}`);
    doc.text(`Completion Rate: ${complianceScore.breakdown.completion_rate.toFixed(1)}%`);
    doc.moveDown();

    if (complianceScore.module_scores && complianceScore.module_scores.length > 0) {
      doc.fontSize(12).text('Module-Level Scores:', { underline: true });
      for (const moduleScore of complianceScore.module_scores) {
        doc.text(`${moduleScore.module_name}: ${moduleScore.score}/100`);
      }
    }

    doc.addPage();

    // ============================================================================
    // SECTION 2: OBLIGATION LIST WITH STATUSES (EXISTING - ENHANCED)
    // ============================================================================
    doc.fontSize(18).text('Obligations', { underline: true });
    doc.moveDown();

    for (const obligation of packData.obligations) {
      doc.fontSize(14).text(obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100) || 'Obligation', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Status: ${obligation.status}`);
      doc.text(`Category: ${obligation.category}`);
      if (obligation.deadline_date) {
        doc.text(`Deadline: ${obligation.deadline_date}`);
      }
      if (obligation.condition_reference) {
        doc.text(`Reference: ${obligation.condition_reference}`);
      }
      doc.moveDown(0.5);

      // Evidence
      if (obligation.evidence && obligation.evidence.length > 0) {
        doc.fontSize(12).text('Evidence:', { underline: true });
        for (const evidence of obligation.evidence) {
          doc.fontSize(10).text(`- ${evidence.title || evidence.file_name} (${evidence.upload_date})`);
        }
      } else {
        doc.fontSize(10).fillColor('red').text('No evidence linked');
        doc.fillColor('black'); // Reset to black
      }

      doc.moveDown();
      if (doc.y > 700) {
        doc.addPage();
      }
    }

    doc.addPage();

    // ============================================================================
    // SECTION 3: EVIDENCE ATTACHMENTS (VERSION-LOCKED) (EXISTING - ENHANCED)
    // ============================================================================
    doc.fontSize(18).text('Evidence Attachments (Version-Locked)', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text('All evidence items in this pack are snapshotted at generation time and cannot be modified.', { italic: true });
    doc.moveDown();

    // Get version-locked evidence from pack_contents
    const { data: packContents } = await supabaseAdmin
      .from('pack_contents')
      .select('*')
      .eq('pack_id', pack.id);

    if (packContents && packContents.length > 0) {
      for (const content of packContents) {
        doc.fontSize(12).text(content.file_name || 'Evidence Item', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Type: ${content.file_type || 'Unknown'}`);
        if (content.file_size_bytes) {
          doc.text(`Size: ${(content.file_size_bytes / 1024).toFixed(2)} KB`);
        }
        if (content.upload_timestamp) {
          doc.text(`Uploaded: ${new Date(content.upload_timestamp).toLocaleDateString()}`);
        }
        if (content.file_hash) {
          doc.text(`File Hash: ${content.file_hash.substring(0, 16)}...`);
        }
        doc.moveDown();
        if (doc.y > 700) {
          doc.addPage();
        }
      }
    } else {
      doc.fontSize(10).text('No evidence attachments in this pack.', { italic: true });
    }

    doc.addPage();

    // ============================================================================
    // SECTION 4: CHANGE JUSTIFICATION & SIGNOFF HISTORY (NEW)
    // ============================================================================
    doc.fontSize(18).text('Change Justification & Signoff History', { underline: true });
    doc.moveDown();

    const changeHistory = await getChangeHistory(packData, pack);
    
    if (changeHistory && changeHistory.length > 0) {
      for (const change of changeHistory) {
        doc.fontSize(12).text(`${change.change_type || 'Change'} - ${change.entity_type || 'Entity'}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Date: ${change.signed_at ? new Date(change.signed_at).toLocaleDateString() : 'N/A'}`);
        if (change.signed_by_name) {
          doc.text(`Changed by: ${change.signed_by_name}${change.signed_by_email ? ` (${change.signed_by_email})` : ''}`);
        }
        if (change.justification_text) {
          doc.text(`Justification: ${change.justification_text}`);
        }
        if (change.previous_value && change.new_value) {
          doc.text(`Previous: ${JSON.stringify(change.previous_value)}`);
          doc.text(`New: ${JSON.stringify(change.new_value)}`);
        }
        doc.moveDown();
        if (doc.y > 700) {
          doc.addPage();
        }
      }
    } else {
      doc.fontSize(10).text('No changes recorded in this period.', { italic: true });
    }

    doc.addPage();

    // ============================================================================
    // SECTION 5: COMPLIANCE CLOCK SUMMARY (NEW)
    // ============================================================================
    doc.fontSize(18).text('Compliance Clock Summary', { underline: true });
    doc.moveDown();

    const clockSummary = await getComplianceClockSummary(packData, pack);
    
    if (clockSummary.overdue && clockSummary.overdue.length > 0) {
      doc.fontSize(14).fillColor('red').text('Overdue Items:', { underline: true, bold: true });
      doc.fillColor('black');
      doc.moveDown(0.5);
      for (const item of clockSummary.overdue) {
        doc.fontSize(10).text(`- ${item.title || item.clock_name || 'Item'}: ${Math.abs(item.days_overdue || 0)} days overdue (${item.criticality || 'RED'})`);
      }
      doc.moveDown();
    }

    if (clockSummary.upcoming && clockSummary.upcoming.length > 0) {
      doc.fontSize(14).text('Upcoming Items (Next 30 Days):', { underline: true });
      doc.moveDown(0.5);
      for (const item of clockSummary.upcoming) {
        doc.fontSize(10).text(`- ${item.title || item.clock_name || 'Item'}: ${item.days_remaining || 0} days remaining (${item.criticality || 'AMBER'})`);
      }
    } else if (!clockSummary.overdue || clockSummary.overdue.length === 0) {
      doc.fontSize(10).text('No critical compliance clocks in this period.', { italic: true });
    }

    doc.addPage();

    // ============================================================================
    // SECTION 6: PACK PROVENANCE (NEW)
    // ============================================================================
    doc.fontSize(18).text('Pack Provenance', { underline: true });
    doc.moveDown();

    doc.fontSize(12).text('Generation Information:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Pack ID: ${pack.id}`);
    doc.text(`Pack Type: ${getPackTypeName(packType)}`);
    doc.text(`Generated At: ${pack.generated_at ? new Date(pack.generated_at).toLocaleString() : new Date().toLocaleString()}`);
    if (pack.generated_by) {
      const { data: generator } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', pack.generated_by)
        .single();
      if (generator) {
        doc.text(`Generated By: ${generator.full_name || generator.email}`);
      }
    }
    doc.moveDown();

    doc.fontSize(12).text('Data Scope:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Company: ${packData.company?.name || 'N/A'}`);
    if (packData.site) {
      doc.text(`Site: ${packData.site.name || 'N/A'}`);
    }
    if (packData.dateRange.start && packData.dateRange.end) {
      doc.text(`Date Range: ${packData.dateRange.start} to ${packData.dateRange.end}`);
    }
    doc.moveDown();

    doc.fontSize(12).text('Pack Integrity:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total Obligations Included: ${packData.obligations.length}`);
    doc.text(`Evidence Items Included: ${packContents?.length || 0}`);
    doc.text(`PDF File Size: ${(pack.file_size_bytes ? pack.file_size_bytes / 1024 : 0).toFixed(2)} KB`);
    if (pack.file_hash) {
      doc.text(`File Hash: ${pack.file_hash.substring(0, 32)}...`);
    }

    doc.end();
  });
}

/**
 * Upload pack PDF to Supabase Storage
 */
async function uploadPackToStorage(packId: string, pdfBuffer: Buffer, packType: string): Promise<string> {
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage;
  const bucket = 'audit-packs';
  const fileName = `${packId}.pdf`;
  const storagePath = `${packType.toLowerCase()}/${fileName}`;

  const { error } = await storage.from(bucket).upload(storagePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload pack to storage: ${error.message}`);
  }

  return storagePath;
}

/**
 * Get human-readable pack type name
 */
function getPackTypeName(packType: string): string {
  const names: Record<string, string> = {
    AUDIT_PACK: 'Audit Pack',
    REGULATOR_INSPECTION: 'Regulator Inspection Pack',
    TENDER_CLIENT_ASSURANCE: 'Tender Client Assurance Pack',
    BOARD_MULTI_SITE_RISK: 'Board Multi-Site Risk Pack',
    INSURER_BROKER: 'Insurer Broker Pack',
  };
  return names[packType] || packType;
}

/**
 * Calculate compliance score for pack
 */
async function calculateComplianceScore(packData: any, pack: any): Promise<any> {
  const totalObligations = packData.obligations.length;
  const completedObligations = packData.obligations.filter((o: any) => o.status === 'COMPLETED').length;
  const overdueCount = packData.obligations.filter((o: any) => {
    if (!o.deadline_date) return false;
    const deadline = new Date(o.deadline_date);
    const today = new Date();
    return deadline < today && o.status !== 'COMPLETED';
  }).length;
  const completionRate = totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 0;

  // Calculate site score (weighted: completion rate 70%, overdue penalty 30%)
  const overduePenalty = totalObligations > 0 ? (overdueCount / totalObligations) * 100 : 0;
  const siteScore = Math.max(0, Math.min(100, completionRate * 0.7 + (100 - overduePenalty) * 0.3));

  // Get module scores if site_id is available
  const moduleScores: any[] = [];
  if (packData.site?.id) {
    const { data: clocks } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('module_id, status, criticality')
      .eq('site_id', packData.site.id);

    if (clocks) {
      const moduleGroups: Record<string, { total: number; completed: number; overdue: number }> = {};
      for (const clock of clocks) {
        if (!clock.module_id) continue;
        if (!moduleGroups[clock.module_id]) {
          moduleGroups[clock.module_id] = { total: 0, completed: 0, overdue: 0 };
        }
        moduleGroups[clock.module_id].total++;
        if (clock.status === 'COMPLETED') {
          moduleGroups[clock.module_id].completed++;
        } else if (clock.status === 'OVERDUE') {
          moduleGroups[clock.module_id].overdue++;
        }
      }

      for (const [moduleId, stats] of Object.entries(moduleGroups)) {
        const { data: module } = await supabaseAdmin
          .from('modules')
          .select('module_name')
          .eq('id', moduleId)
          .single();

        const moduleCompletionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        const moduleOverduePenalty = stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0;
        const moduleScore = Math.max(0, Math.min(100, moduleCompletionRate * 0.7 + (100 - moduleOverduePenalty) * 0.3));

        moduleScores.push({
          module_name: module?.module_name || 'Unknown Module',
          score: Math.round(moduleScore),
        });
      }
    }
  }

  return {
    site_score: Math.round(siteScore),
    calculated_at: new Date().toISOString(),
    breakdown: {
      total_obligations: totalObligations,
      completed_obligations: completedObligations,
      overdue_count: overdueCount,
      completion_rate: completionRate,
    },
    module_scores: moduleScores,
  };
}

/**
 * Get change history for pack period
 */
async function getChangeHistory(packData: any, pack: any): Promise<any[]> {
  // Query change_logs table if it exists
  const { data: changeLogs } = await supabaseAdmin
    .from('change_logs')
    .select('*')
    .eq('company_id', pack.company_id)
    .order('signed_at', { ascending: false })
    .limit(50);

  if (!changeLogs) return [];

  // Filter by date range if provided
  let filteredLogs = changeLogs;
  if (packData.dateRange.start && packData.dateRange.end) {
    filteredLogs = changeLogs.filter((log: any) => {
      const logDate = new Date(log.signed_at);
      const startDate = new Date(packData.dateRange.start);
      const endDate = new Date(packData.dateRange.end);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  // Enrich with user information
  const enrichedLogs = [];
  for (const log of filteredLogs) {
    if (log.signed_by) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', log.signed_by)
        .single();

      enrichedLogs.push({
        ...log,
        signed_by_name: user?.full_name || null,
        signed_by_email: user?.email || null,
      });
    } else {
      enrichedLogs.push(log);
    }
  }

  return enrichedLogs;
}

/**
 * Get compliance clock summary for pack
 */
async function getComplianceClockSummary(packData: any, pack: any): Promise<any> {
  const overdue: any[] = [];
  const upcoming: any[] = [];

  if (packData.site?.id) {
    const { data: clocks } = await supabaseAdmin
      .from('compliance_clocks_universal')
      .select('*')
      .eq('site_id', packData.site.id)
      .order('days_remaining', { ascending: true });

    if (clocks) {
      for (const clock of clocks) {
        if (clock.status === 'OVERDUE' || (clock.days_remaining !== null && clock.days_remaining < 0)) {
          overdue.push({
            clock_name: clock.clock_name,
            title: clock.clock_name,
            days_overdue: Math.abs(clock.days_remaining || 0),
            criticality: clock.criticality,
          });
        } else if (clock.status === 'ACTIVE' && clock.days_remaining !== null && clock.days_remaining <= 30 && clock.days_remaining > 0) {
          upcoming.push({
            clock_name: clock.clock_name,
            title: clock.clock_name,
            days_remaining: clock.days_remaining,
            criticality: clock.criticality,
          });
        }
      }
    }
  }

  return {
    overdue: overdue.slice(0, 20), // Limit to top 20
    upcoming: upcoming.slice(0, 20), // Limit to top 20
  };
}

