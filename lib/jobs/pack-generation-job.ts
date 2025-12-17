/**
 * Pack Generation Job
 * Generates professional PDF packs (Audit, Regulator, Tender, Board, Insurer)
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 6.1
 *
 * Pack Types:
 * - AUDIT_PACK: Standard internal audit pack
 * - REGULATOR_INSPECTION: EA-optimized pack with CCS band and permit citations
 * - TENDER_CLIENT_ASSURANCE: Commercial pack with compliance showcase
 * - BOARD_MULTI_SITE_RISK: Executive summary with multi-site risk matrix
 * - INSURER_BROKER: Liability-focused pack with incident history
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration } from 'chart.js';

// ========================================================================
// CHART RENDERING SETUP
// ========================================================================

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 500,
  height: 300,
  backgroundColour: 'white',
});

const smallChartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 400,
  height: 250,
  backgroundColour: 'white',
});

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

// Colors for RAG status
const COLORS = {
  RED: '#DC2626',
  AMBER: '#F59E0B',
  GREEN: '#16A34A',
  BLUE: '#2563EB',
  GRAY: '#6B7280',
  BLACK: '#1F2937',
  WHITE: '#FFFFFF',
};

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

    // Update status to GENERATING
    await supabaseAdmin
      .from('audit_packs')
      .update({ status: 'GENERATING', updated_at: new Date().toISOString() })
      .eq('id', pack_id);

    // Collect data based on pack type
    const packData = await collectPackData(pack_type, company_id, site_id, document_id, date_range_start, date_range_end, filters);

    // Calculate pack metrics from collected data
    const obligations = packData.obligations || [];
    const totalObligations = obligations.length;
    const completeCount = obligations.filter((o: any) => o.status === 'COMPLETED' || o.status === 'COMPLIANT').length;
    const pendingCount = obligations.filter((o: any) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
    const overdueCount = obligations.filter((o: any) => {
      const deadline = o.deadline_date ? new Date(o.deadline_date) : null;
      return deadline && deadline < new Date() && o.status !== 'COMPLETED' && o.status !== 'COMPLIANT';
    }).length;
    const evidenceCount = obligations.reduce((sum: number, o: any) => sum + (o.evidence?.length || 0), 0);

    // Update pack with calculated metrics
    await supabaseAdmin
      .from('audit_packs')
      .update({
        total_obligations: totalObligations,
        complete_count: completeCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        evidence_count: evidenceCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pack_id);

    // Snapshot evidence and obligations to pack_contents for version-locking
    await snapshotPackContents(pack_id, packData);

    // Generate PDF based on pack type
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
      recipient_email: null,
      notification_type: `${pack_type}_READY`,
      channel: 'EMAIL',
      priority: 'NORMAL',
      subject: `${getPackTypeName(pack_type)} Ready`,
      body_text: `Your ${getPackTypeName(pack_type)} has been generated and is ready for download.`,
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

    throw error;
  }
}

/**
 * Snapshot evidence and obligations to pack_contents for version-locking
 */
async function snapshotPackContents(packId: string, packData: any): Promise<void> {
  const now = new Date().toISOString();

  // Snapshot obligations
  for (let i = 0; i < packData.obligations.length; i++) {
    const obligation = packData.obligations[i];
    await supabaseAdmin.from('pack_contents').insert({
      pack_id: packId,
      content_type: 'OBLIGATION',
      obligation_id: obligation.id,
      obligation_snapshot: obligation,
      display_order: i,
      included_at: now,
    });

    // Snapshot linked evidence
    if (obligation.evidence && obligation.evidence.length > 0) {
      for (let j = 0; j < obligation.evidence.length; j++) {
        const evidence = obligation.evidence[j];
        await supabaseAdmin.from('pack_contents').insert({
          pack_id: packId,
          content_type: 'EVIDENCE',
          evidence_id: evidence.id,
          evidence_snapshot: evidence,
          file_name: evidence.file_name,
          file_type: evidence.file_type,
          file_size_bytes: evidence.file_size_bytes,
          file_hash: evidence.file_hash,
          upload_timestamp: evidence.created_at,
          storage_path: evidence.storage_path,
          display_order: packData.obligations.length + (i * 100) + j,
          included_at: now,
        });
      }
    }
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
  // Get company info
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, name, company_number, adoption_mode, adoption_mode_expiry')
    .eq('id', companyId)
    .single();

  // Get site info if applicable
  let site = null;
  let sites: any[] = [];

  if (packType === 'BOARD_MULTI_SITE_RISK') {
    // Get all sites for board pack
    const { data: sitesData } = await supabaseAdmin
      .from('sites')
      .select('id, name, address, regulator, ccs_band')
      .eq('company_id', companyId);
    sites = sitesData || [];
  } else if (siteId) {
    const { data: siteData } = await supabaseAdmin
      .from('sites')
      .select('id, name, address, regulator, ccs_band')
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
      confidence_score,
      review_status,
      documents!inner(id, title, reference_number, document_type)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (siteId && packType !== 'BOARD_MULTI_SITE_RISK') {
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
            file_type,
            file_size_bytes,
            storage_path,
            file_hash,
            created_at,
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

  // Get CCS assessment for site (for REGULATOR pack)
  let ccsAssessment = null;
  if (siteId && (packType === 'REGULATOR_INSPECTION' || packType === 'AUDIT_PACK')) {
    const { data: ccsData } = await supabaseAdmin
      .from('ccs_assessments')
      .select('*')
      .eq('site_id', siteId)
      .order('compliance_year', { ascending: false })
      .limit(1);
    ccsAssessment = ccsData?.[0] || null;
  }

  // Get incidents (for TENDER and INSURER packs)
  let incidents: any[] = [];
  if (packType === 'TENDER_CLIENT_ASSURANCE' || packType === 'INSURER_BROKER') {
    const { data: incidentsData } = await supabaseAdmin
      .from('regulatory_incidents')
      .select('*')
      .eq('company_id', companyId)
      .order('incident_date', { ascending: false })
      .limit(50);
    incidents = incidentsData || [];
  }

  // Get permits/documents for the site
  let permits: any[] = [];
  if (siteId) {
    const { data: documentsData } = await supabaseAdmin
      .from('documents')
      .select('id, title, reference_number, document_type, permit_holder, issue_date, effective_date')
      .eq('site_id', siteId)
      .in('document_type', ['PERMIT', 'CONSENT', 'MCPD_REGISTRATION'])
      .is('deleted_at', null);
    permits = documentsData || [];
  }

  return {
    company,
    site,
    sites,
    obligations: obligationsWithEvidence,
    ccsAssessment,
    incidents,
    permits,
    packType,
    dateRange: {
      start: dateRangeStart,
      end: dateRangeEnd,
    },
  };
}

/**
 * Generate PDF based on pack type
 */
async function generatePackPDF(packType: string, packData: any, pack: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true, // Required for TOC page numbering
      info: {
        Title: `${getPackTypeName(packType)} - ${packData.company?.name || 'Company'}`,
        Author: 'EcoComply',
        Subject: `Environmental Compliance Pack`,
        Creator: 'EcoComply Pack Generator',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Track sections for TOC
    const sections: { title: string; page: number }[] = [];
    let currentPage = 1;

    // Helper to track new section
    const addSection = (title: string) => {
      sections.push({ title, page: currentPage });
    };

    // ========================================================================
    // COVER PAGE
    // ========================================================================
    addSection('Cover');
    await renderCoverPage(doc, packType, packData, pack);
    doc.addPage();
    currentPage++;

    // ========================================================================
    // TABLE OF CONTENTS (Page 2)
    // Pre-calculate expected sections based on pack type
    // ========================================================================
    const expectedSections = getExpectedSections(packType, packData);
    addSection('Table of Contents');
    await renderTableOfContents(doc, expectedSections);
    doc.addPage();
    currentPage++;

    // ========================================================================
    // EXECUTIVE SUMMARY (RAG Dashboard)
    // ========================================================================
    addSection('Executive Summary');
    await renderExecutiveSummary(doc, packType, packData);
    doc.addPage();
    currentPage++;

    // ========================================================================
    // Pack Type Specific Sections
    // ========================================================================
    switch (packType) {
      case 'REGULATOR_INSPECTION':
        currentPage = await renderRegulatorPack(doc, packData, pack, sections, currentPage);
        break;
      case 'BOARD_MULTI_SITE_RISK':
        currentPage = await renderBoardPack(doc, packData, pack, sections, currentPage);
        break;
      case 'TENDER_CLIENT_ASSURANCE':
        currentPage = await renderTenderPack(doc, packData, pack, sections, currentPage);
        break;
      case 'INSURER_BROKER':
        currentPage = await renderInsurerPack(doc, packData, pack, sections, currentPage);
        break;
      default:
        currentPage = await renderAuditPack(doc, packData, pack, sections, currentPage);
    }

    // ========================================================================
    // PACK PROVENANCE (Always last)
    // ========================================================================
    addSection('Pack Provenance');
    await renderProvenance(doc, packType, packData, pack);

    // ========================================================================
    // Insert Table of Contents on Page 2 (after cover)
    // ========================================================================
    // Note: PDFKit doesn't support easy TOC insertion, so we generate it at the end
    // For a production system, consider using a PDF library that supports page insertion

    doc.end();
  });
}

/**
 * Render Cover Page
 */
async function renderCoverPage(doc: PDFKit.PDFDocument, packType: string, packData: any, pack: any): Promise<void> {
  // Logo area (placeholder)
  doc.rect(50, 50, 100, 40).stroke();
  doc.fontSize(10).fillColor(COLORS.GRAY).text('ECOCOMPLY', 55, 65);

  // Pack Type Badge
  const badgeColor = getPackTypeBadgeColor(packType);
  doc.rect(doc.page.width - 200, 50, 150, 30).fill(badgeColor);
  doc.fontSize(10).fillColor(COLORS.WHITE).text(getPackTypeName(packType), doc.page.width - 195, 60);

  // Main Title
  doc.fontSize(32).fillColor(COLORS.BLACK).text(getPackTypeName(packType), 50, 200, { align: 'center' });

  // Company Name
  doc.fontSize(20).fillColor(COLORS.GRAY).text(packData.company?.name || 'Company Name', 50, 260, { align: 'center' });

  // Site Name (if applicable)
  if (packData.site) {
    doc.fontSize(16).text(packData.site.name, 50, 300, { align: 'center' });
  } else if (packData.sites && packData.sites.length > 0) {
    doc.fontSize(14).text(`Multi-Site: ${packData.sites.length} Sites`, 50, 300, { align: 'center' });
  }

  // Generation Date
  doc.fontSize(12).fillColor(COLORS.GRAY).text(`Generated: ${new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`, 50, 400, { align: 'center' });

  // Date Range
  if (packData.dateRange.start && packData.dateRange.end) {
    doc.text(`Reporting Period: ${packData.dateRange.start} to ${packData.dateRange.end}`, 50, 420, { align: 'center' });
  }

  // CCS Band (for Regulator Packs)
  if (packType === 'REGULATOR_INSPECTION' && packData.ccsAssessment) {
    const bandColor = getCCSBandColor(packData.ccsAssessment.compliance_band);
    doc.rect(doc.page.width / 2 - 50, 500, 100, 60).fill(bandColor);
    doc.fontSize(14).fillColor(COLORS.WHITE).text('CCS Band', doc.page.width / 2 - 45, 510, { align: 'center' });
    doc.fontSize(32).text(packData.ccsAssessment.compliance_band || 'N/A', doc.page.width / 2 - 45, 530, { align: 'center' });
  }

  // Footer
  doc.fontSize(8).fillColor(COLORS.GRAY).text('CONFIDENTIAL - Environmental Compliance Documentation', 50, doc.page.height - 50, { align: 'center' });
  doc.text(`Pack ID: ${pack.id}`, 50, doc.page.height - 35, { align: 'center' });
}

/**
 * Render Executive Summary with RAG Dashboard
 */
async function renderExecutiveSummary(doc: PDFKit.PDFDocument, packType: string, packData: any): Promise<void> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Executive Summary', 50, 50);
  doc.moveDown();

  // Calculate key metrics
  const totalObligations = packData.obligations.length;
  const completedObligations = packData.obligations.filter((o: any) => o.status === 'COMPLETED').length;
  const overdueObligations = packData.obligations.filter((o: any) => o.status === 'OVERDUE').length;
  const pendingObligations = packData.obligations.filter((o: any) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
  const obligationsWithEvidence = packData.obligations.filter((o: any) => o.evidence && o.evidence.length > 0).length;

  const completionRate = totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 0;
  const overdueRate = totalObligations > 0 ? (overdueObligations / totalObligations) * 100 : 0;
  const evidenceCoverage = totalObligations > 0 ? (obligationsWithEvidence / totalObligations) * 100 : 0;

  // Overall RAG Status
  let overallStatus: 'GREEN' | 'AMBER' | 'RED';
  if (overdueRate > 10 || completionRate < 50) {
    overallStatus = 'RED';
  } else if (overdueRate > 5 || completionRate < 80) {
    overallStatus = 'AMBER';
  } else {
    overallStatus = 'GREEN';
  }

  // RAG Traffic Light
  const ragX = doc.page.width - 150;
  const ragY = 50;

  // Traffic light background
  doc.roundedRect(ragX, ragY, 100, 120, 10).fill('#333333');

  // Red light
  doc.circle(ragX + 50, ragY + 25, 15).fill(overallStatus === 'RED' ? COLORS.RED : '#555555');
  // Amber light
  doc.circle(ragX + 50, ragY + 60, 15).fill(overallStatus === 'AMBER' ? COLORS.AMBER : '#555555');
  // Green light
  doc.circle(ragX + 50, ragY + 95, 15).fill(overallStatus === 'GREEN' ? COLORS.GREEN : '#555555');

  // Status label
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Overall Status', ragX, ragY + 130, { width: 100, align: 'center' });
  doc.fontSize(10).text(overallStatus === 'GREEN' ? 'Compliant' : overallStatus === 'AMBER' ? 'Attention Needed' : 'Critical', ragX, ragY + 145, { width: 100, align: 'center' });

  // Key Metrics Cards
  const cardY = 200;
  const cardWidth = 120;
  const cardGap = 15;

  // Total Obligations
  renderMetricCard(doc, 50, cardY, cardWidth, 'Total Obligations', totalObligations.toString(), COLORS.BLUE);

  // Completed
  renderMetricCard(doc, 50 + cardWidth + cardGap, cardY, cardWidth, 'Completed', `${completedObligations} (${completionRate.toFixed(0)}%)`, COLORS.GREEN);

  // Overdue
  renderMetricCard(doc, 50 + (cardWidth + cardGap) * 2, cardY, cardWidth, 'Overdue', `${overdueObligations}`, overdueObligations > 0 ? COLORS.RED : COLORS.GREEN);

  // Evidence Coverage
  renderMetricCard(doc, 50 + (cardWidth + cardGap) * 3, cardY, cardWidth, 'Evidence Coverage', `${evidenceCoverage.toFixed(0)}%`, evidenceCoverage > 80 ? COLORS.GREEN : evidenceCoverage > 50 ? COLORS.AMBER : COLORS.RED);

  // Top 3 Risks Section
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Top Risks Requiring Attention', 50, 320);
  doc.moveDown(0.5);

  const riskyObligations = packData.obligations
    .filter((o: any) => o.status === 'OVERDUE' || o.status === 'DUE_SOON' || (o.evidence && o.evidence.length === 0))
    .slice(0, 3);

  if (riskyObligations.length > 0) {
    for (let i = 0; i < riskyObligations.length; i++) {
      const risk = riskyObligations[i];
      const riskColor = risk.status === 'OVERDUE' ? COLORS.RED : COLORS.AMBER;

      doc.circle(55, doc.y + 5, 5).fill(riskColor);
      doc.fontSize(10).fillColor(COLORS.BLACK).text(
        `${risk.obligation_title || risk.original_text?.substring(0, 50) || 'Obligation'} - ${risk.status}`,
        70, doc.y - 5
      );
      if (risk.condition_reference) {
        doc.fontSize(8).fillColor(COLORS.GRAY).text(`Ref: ${risk.condition_reference}`, 70);
      }
      doc.moveDown(0.5);
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.GREEN).text('No critical risks identified', 70);
  }

  // Category Breakdown
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Obligations by Category', 50, 450);
  doc.moveDown(0.5);

  const categories: Record<string, number> = {};
  packData.obligations.forEach((o: any) => {
    categories[o.category] = (categories[o.category] || 0) + 1;
  });

  let categoryY = doc.y;
  Object.entries(categories).forEach(([category, count]) => {
    const percentage = totalObligations > 0 ? (count / totalObligations) * 100 : 0;
    renderProgressBar(doc, 50, categoryY, 300, category, percentage);
    categoryY += 25;
  });

  // First-Year Mode Notice with detailed adjustments
  const firstYearMode = getFirstYearModeAdjustments(packData);
  if (firstYearMode.isActive) {
    doc.addPage();
    doc.fontSize(14).fillColor(COLORS.AMBER).text('First-Year Adoption Mode Active', 50, 50);
    doc.moveDown();

    doc.fontSize(10).fillColor(COLORS.BLACK).text(
      `This pack is generated under First-Year Adoption Mode, which expires on ${firstYearMode.expiryDate || 'N/A'}.`
    );
    doc.moveDown();

    doc.fontSize(11).text('Adjustments Applied:');
    doc.moveDown(0.5);

    for (const adjustment of firstYearMode.adjustments) {
      doc.fontSize(10).text(`• ${adjustment}`);
      doc.moveDown(0.3);
    }

    doc.moveDown();
    doc.fontSize(9).fillColor(COLORS.GRAY).text(
      'These adjustments ensure fair baseline establishment for new customers. Full compliance requirements apply after the first-year period.',
      { width: doc.page.width - 100 }
    );
  }
}

/**
 * Render a metric card
 */
function renderMetricCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string, color: string): void {
  doc.roundedRect(x, y, width, 60, 5).fill(color);
  doc.fontSize(10).fillColor(COLORS.WHITE).text(label, x + 5, y + 10, { width: width - 10, align: 'center' });
  doc.fontSize(18).text(value, x + 5, y + 30, { width: width - 10, align: 'center' });
}

/**
 * Render a progress bar
 */
function renderProgressBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, percentage: number): void {
  const barHeight = 15;
  const labelWidth = 120;

  doc.fontSize(9).fillColor(COLORS.BLACK).text(label, x, y + 2, { width: labelWidth });

  // Background bar
  doc.rect(x + labelWidth, y, width - labelWidth, barHeight).fill('#E5E7EB');

  // Filled bar
  const fillWidth = ((width - labelWidth) * percentage) / 100;
  doc.rect(x + labelWidth, y, fillWidth, barHeight).fill(COLORS.BLUE);

  // Percentage label
  doc.fontSize(8).fillColor(COLORS.BLACK).text(`${percentage.toFixed(0)}%`, x + width + 5, y + 2);
}

/**
 * Render REGULATOR_INSPECTION specific sections
 */
async function renderRegulatorPack(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  // Site & Permit Details
  sections.push({ title: 'Site & Permit Details', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Site & Permit Details', 50, 50);
  doc.moveDown();

  if (packData.site) {
    doc.fontSize(12).text(`Site Name: ${packData.site.name}`);
    doc.text(`Address: ${packData.site.address || 'N/A'}`);
    doc.text(`Regulator: ${packData.site.regulator || 'Environment Agency'}`);
  }

  doc.moveDown();
  doc.fontSize(14).text('Active Permits');
  doc.moveDown(0.5);

  if (packData.permits && packData.permits.length > 0) {
    for (const permit of packData.permits) {
      doc.fontSize(10).text(`• ${permit.title} (${permit.reference_number || 'N/A'})`);
      doc.fontSize(8).fillColor(COLORS.GRAY).text(`  Type: ${permit.document_type} | Effective: ${permit.effective_date || 'N/A'}`);
      doc.fillColor(COLORS.BLACK);
    }
  } else {
    doc.fontSize(10).text('No permits on record');
  }

  doc.addPage();
  currentPage++;

  // CCS Band & Breach History
  sections.push({ title: 'CCS Assessment', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Compliance Classification Scheme (CCS)', 50, 50);
  doc.moveDown();

  if (packData.ccsAssessment) {
    const bandColor = getCCSBandColor(packData.ccsAssessment.compliance_band);

    // Band display
    doc.roundedRect(50, doc.y, 80, 50, 5).fill(bandColor);
    doc.fontSize(28).fillColor(COLORS.WHITE).text(packData.ccsAssessment.compliance_band || 'N/A', 50, doc.y - 45, { width: 80, align: 'center' });

    doc.fontSize(12).fillColor(COLORS.BLACK).text(`Total Score: ${packData.ccsAssessment.total_score}`, 150, doc.y - 40);
    doc.text(`Compliance Year: ${packData.ccsAssessment.compliance_year}`, 150);
    doc.text(`Assessment Date: ${packData.ccsAssessment.assessment_date}`, 150);

    if (packData.ccsAssessment.car_reference) {
      doc.text(`CAR Reference: ${packData.ccsAssessment.car_reference}`, 150);
    }

    // CCS Trend Chart
    doc.addPage();
    currentPage++;
    sections.push({ title: 'CCS Trend Analysis', page: currentPage });
    doc.fontSize(16).fillColor(COLORS.BLACK).text('CCS Band Progression', 50, 50);
    doc.moveDown();
    await renderTrendChart(doc, packData, 'ccs');
  } else {
    doc.fontSize(10).text('No CCS assessment on record for this site.');
  }

  doc.addPage();
  currentPage++;

  // Completion Rate Trend
  sections.push({ title: 'Compliance Trends', page: currentPage });
  doc.fontSize(16).fillColor(COLORS.BLACK).text('Obligation Completion Trends', 50, 50);
  doc.moveDown();
  await renderTrendChart(doc, packData, 'completion');

  doc.addPage();
  currentPage++;

  // Risk Matrix
  sections.push({ title: 'Risk Assessment', page: currentPage });
  doc.fontSize(16).fillColor(COLORS.BLACK).text('Risk Assessment Matrix', 50, 50);
  doc.moveDown();
  await renderRiskMatrix(doc, packData);

  doc.addPage();
  currentPage++;

  // Obligations with Permit Citations
  currentPage = await renderObligationsSection(doc, packData, sections, currentPage, true);

  // Evidence Register
  currentPage = await renderEvidenceSection(doc, packData, pack, sections, currentPage);

  // Compliance Clock Summary
  currentPage = await renderComplianceClockSection(doc, packData, pack, sections, currentPage);

  return currentPage;
}

/**
 * Render BOARD_MULTI_SITE_RISK specific sections
 * Implements Safeguard 2: Board Pack aggregation default with detail access controls
 */
async function renderBoardPack(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  // Portfolio Overview
  sections.push({ title: 'Portfolio Overview', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Portfolio Overview', 50, 50);
  doc.moveDown();

  doc.fontSize(12).text(`Total Sites: ${packData.sites.length}`);
  doc.moveDown();

  // Portfolio Risk Heat Map
  sections.push({ title: 'Portfolio Risk Heat Map', page: currentPage });
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Portfolio Risk Heat Map');
  doc.moveDown();
  await renderRiskMatrix(doc, packData);

  doc.addPage();
  currentPage++;

  // Site Risk Table (Aggregated View - Default per Safeguard 2)
  sections.push({ title: 'Site Summary (Aggregated)', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Site Compliance Summary', 50, 50);
  doc.moveDown();

  doc.fontSize(9).fillColor(COLORS.GRAY).text(
    'Note: This is an aggregated view. Site-level detail requires explicit access request and approval per company policy.',
    { width: doc.page.width - 100 }
  );
  doc.moveDown();

  // Table header
  const tableTop = doc.y;
  const colWidths = [150, 80, 80, 80, 100];

  doc.fontSize(9).fillColor(COLORS.WHITE);
  doc.rect(50, tableTop, colWidths.reduce((a, b) => a + b, 0), 20).fill(COLORS.BLACK);
  doc.text('Site', 55, tableTop + 5);
  doc.text('CCS Band', 55 + colWidths[0], tableTop + 5);
  doc.text('Obligations', 55 + colWidths[0] + colWidths[1], tableTop + 5);
  doc.text('Overdue', 55 + colWidths[0] + colWidths[1] + colWidths[2], tableTop + 5);
  doc.text('Status', 55 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop + 5);

  let rowY = tableTop + 20;
  doc.fillColor(COLORS.BLACK);

  for (const site of packData.sites) {
    // Get site-specific obligation counts
    const siteObligations = packData.obligations.filter((o: any) => o.site_id === site.id);
    const siteOverdue = siteObligations.filter((o: any) => o.status === 'OVERDUE').length;

    const status = siteOverdue > 0 ? 'ATTENTION' : 'OK';
    const statusColor = siteOverdue > 0 ? COLORS.RED : COLORS.GREEN;

    doc.fontSize(9);
    doc.text(site.name.substring(0, 25), 55, rowY + 5);
    doc.text(site.ccs_band || 'N/A', 55 + colWidths[0], rowY + 5);
    doc.text(siteObligations.length.toString(), 55 + colWidths[0] + colWidths[1], rowY + 5);
    doc.text(siteOverdue.toString(), 55 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5);

    doc.circle(55 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 10, rowY + 10, 5).fill(statusColor);
    doc.fillColor(COLORS.BLACK).text(status, 55 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 20, rowY + 5);

    rowY += 20;

    if (rowY > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      rowY = 50;
    }
  }

  doc.addPage();
  currentPage++;

  // Check for approved detail access (Safeguard 2)
  const detailAccess = await checkBoardDetailAccess(pack.id, 'site_details');
  if (detailAccess.allowed) {
    // Render site-level detail pages
    sections.push({ title: 'Site Detail (Approved)', page: currentPage });
    doc.fontSize(18).fillColor(COLORS.BLACK).text('Site-Level Detail', 50, 50);
    doc.moveDown();
    doc.fontSize(10).fillColor(COLORS.GREEN).text('Detail access approved. Full site information included.');
    doc.moveDown();

    for (const site of packData.sites) {
      doc.addPage();
      currentPage++;
      doc.fontSize(14).fillColor(COLORS.BLACK).text(`Site: ${site.name}`, 50, 50);
      doc.moveDown();
      doc.fontSize(10).text(`Address: ${site.address || 'N/A'}`);
      doc.text(`CCS Band: ${site.ccs_band || 'N/A'}`);
      doc.text(`Regulator: ${site.regulator || 'Environment Agency'}`);

      const siteObligations = packData.obligations.filter((o: any) => o.site_id === site.id);
      const completed = siteObligations.filter((o: any) => o.status === 'COMPLETED').length;
      const overdue = siteObligations.filter((o: any) => o.status === 'OVERDUE').length;

      doc.moveDown();
      doc.text(`Total Obligations: ${siteObligations.length}`);
      doc.text(`Completed: ${completed}`);
      doc.text(`Overdue: ${overdue}`);
    }

    doc.addPage();
    currentPage++;
  } else {
    // Show aggregated view only
    sections.push({ title: 'Site Detail (Restricted)', page: currentPage });
    doc.fontSize(18).fillColor(COLORS.BLACK).text('Site-Level Detail', 50, 50);
    doc.moveDown();
    doc.fontSize(10).fillColor(COLORS.AMBER).text(
      detailAccess.reason || 'Site-level detail is restricted. Request access through your administrator.',
      { width: doc.page.width - 100 }
    );
    doc.moveDown();
    doc.fontSize(9).fillColor(COLORS.GRAY).text(
      'To request detail access, use the Board Pack Detail Request workflow in EcoComply.'
    );

    doc.addPage();
    currentPage++;
  }

  // Trend Analysis
  sections.push({ title: 'Trend Analysis', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Portfolio Trend Analysis', 50, 50);
  doc.moveDown();
  await renderTrendChart(doc, packData, 'completion');

  doc.addPage();
  currentPage++;

  // Strategic Recommendations
  sections.push({ title: 'Strategic Recommendations', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Strategic Recommendations', 50, 50);
  doc.moveDown();

  // Generate recommendations based on data
  const recommendations = generateBoardRecommendations(packData);
  for (const rec of recommendations) {
    doc.fontSize(10).fillColor(COLORS.BLACK).text(`• ${rec}`);
    doc.moveDown(0.5);
  }

  doc.addPage();
  currentPage++;

  // Aggregated Obligations (no site-specific detail unless approved)
  currentPage = await renderObligationsSection(doc, packData, sections, currentPage, false);

  return currentPage;
}

/**
 * Render TENDER_CLIENT_ASSURANCE specific sections
 * Implements Safeguard 4: Tender Pack incident opt-in default
 */
async function renderTenderPack(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  // Company Compliance Statement
  sections.push({ title: 'Compliance Statement', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Company Compliance Statement', 50, 50);
  doc.moveDown();

  doc.fontSize(12).text(`Company: ${packData.company?.name || 'N/A'}`);
  doc.text(`Company Number: ${packData.company?.company_number || 'N/A'}`);
  doc.moveDown();

  // Compliance Declaration
  doc.fontSize(11).text(
    'This pack certifies that the above company maintains environmental compliance programs ' +
    'for all operations under applicable permits and consents.',
    { align: 'justify' }
  );
  doc.moveDown();

  // Permits & Certifications
  doc.fontSize(14).text('Active Permits & Certifications');
  doc.moveDown(0.5);

  if (packData.permits && packData.permits.length > 0) {
    for (const permit of packData.permits) {
      doc.fontSize(10).text(`✓ ${permit.title} (${permit.reference_number || 'N/A'})`);
    }
  } else {
    doc.fontSize(10).text('Permits listed in site-specific sections');
  }

  doc.addPage();
  currentPage++;

  // Compliance Performance KPIs
  sections.push({ title: 'Performance KPIs', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Environmental Performance KPIs', 50, 50);
  doc.moveDown();

  const totalObligations = packData.obligations.length;
  const completedObligations = packData.obligations.filter((o: any) => o.status === 'COMPLETED').length;
  const completionRate = totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 0;
  const evidenceCoverage = packData.obligations.filter((o: any) => o.evidence && o.evidence.length > 0).length;
  const evidenceRate = totalObligations > 0 ? (evidenceCoverage / totalObligations) * 100 : 0;

  doc.fontSize(12).text(`Obligation Completion Rate: ${completionRate.toFixed(1)}%`);
  doc.text(`Evidence Coverage: ${evidenceRate.toFixed(1)}%`);
  doc.text(`Total Active Obligations: ${totalObligations}`);

  if (packData.ccsAssessment) {
    doc.moveDown();
    doc.text(`Current CCS Band: ${packData.ccsAssessment.compliance_band}`);
    doc.text(`CCS Score: ${packData.ccsAssessment.total_score}`);
  }

  // Trend chart for tender packs
  doc.addPage();
  currentPage++;
  sections.push({ title: 'Compliance Trend', page: currentPage });
  doc.fontSize(16).fillColor(COLORS.BLACK).text('Compliance Performance Trend', 50, 50);
  doc.moveDown();
  await renderTrendChart(doc, packData, 'completion');

  doc.addPage();
  currentPage++;

  // Incident History (Safeguard 4: Opt-in required)
  sections.push({ title: 'Incident Disclosure', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Incident Disclosure', 50, 50);
  doc.moveDown();

  // Check for incident opt-in status
  const incidentOptIn = await checkTenderIncidentOptIn(pack.id);

  if (incidentOptIn.enabled) {
    // Opt-in approved - show incident data based on disclosure level
    doc.fontSize(10).fillColor(COLORS.GREEN).text(
      'Incident disclosure has been authorized for this tender pack.',
      { width: doc.page.width - 100 }
    );
    doc.moveDown();
    doc.fontSize(9).fillColor(COLORS.GRAY).text(
      `Disclosure Level: ${incidentOptIn.disclosureLevel || 'SUMMARY'} | Approved on: ${new Date().toLocaleDateString()}`,
      { width: doc.page.width - 100 }
    );
    doc.moveDown();

    // Use snapshot data if available, otherwise use current incidents
    const incidentsToShow = incidentOptIn.snapshotData || packData.incidents || [];

    if (incidentsToShow.length > 0) {
      const incidentSummary = {
        total: incidentsToShow.length,
        resolved: incidentsToShow.filter((i: any) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
        cat1: incidentsToShow.filter((i: any) => i.risk_category === '1').length,
        cat2: incidentsToShow.filter((i: any) => i.risk_category === '2').length,
      };

      doc.fontSize(12).fillColor(COLORS.BLACK);
      doc.text(`Total Incidents (Last 24 months): ${incidentSummary.total}`);
      doc.text(`Resolved: ${incidentSummary.resolved}`);
      doc.text(`Category 1 (Severe): ${incidentSummary.cat1}`);
      doc.text(`Category 2 (Significant): ${incidentSummary.cat2}`);

      // Show detail based on disclosure level
      if (incidentOptIn.disclosureLevel === 'FULL' || incidentOptIn.disclosureLevel === 'DETAILED') {
        doc.moveDown();
        doc.fontSize(11).text('Incident Details:');
        doc.moveDown(0.5);

        for (const incident of incidentsToShow.slice(0, 10)) {
          const incidentColor = incident.risk_category === '1' ? COLORS.RED :
            incident.risk_category === '2' ? COLORS.AMBER : COLORS.GREEN;

          doc.circle(55, doc.y + 5, 4).fill(incidentColor);
          doc.fontSize(9).fillColor(COLORS.BLACK).text(
            `${incident.incident_type || 'Incident'} - ${incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A'}`,
            65
          );
          doc.fontSize(8).fillColor(COLORS.GRAY).text(
            `Status: ${incident.status || 'N/A'} | Category: ${incident.risk_category || 'N/A'}`,
            65
          );
          doc.moveDown(0.3);
        }
      }
    } else {
      doc.fontSize(10).fillColor(COLORS.BLACK).text('No incidents recorded in the reporting period.');
    }
  } else {
    // No opt-in - show restricted notice (Safeguard 4 default)
    doc.fontSize(10).fillColor(COLORS.AMBER).text(
      'Incident statistics are not included in this tender pack.',
      { width: doc.page.width - 100 }
    );
    doc.moveDown();
    doc.fontSize(10).fillColor(COLORS.BLACK).text(
      'By default, incident data is excluded from tender packs to protect commercial sensitivity. ' +
      'If incident disclosure is required by the tender specification, the company may opt-in ' +
      'to include this information.',
      { align: 'justify', width: doc.page.width - 100 }
    );
    doc.moveDown();
    doc.fontSize(9).fillColor(COLORS.GRAY).text(
      'To include incident statistics, use the Tender Pack Incident Opt-In workflow in EcoComply. ' +
      'This requires explicit authorization and creates a point-in-time snapshot of incident data.',
      { width: doc.page.width - 100 }
    );

    // Show available disclosure levels
    doc.moveDown();
    doc.fontSize(10).fillColor(COLORS.BLACK).text('Available Disclosure Levels:');
    doc.fontSize(9).fillColor(COLORS.GRAY);
    doc.text('• SUMMARY: Aggregate counts only (total incidents, resolved count)');
    doc.text('• DETAILED: Summary plus incident types and categories');
    doc.text('• FULL: Complete incident register with dates and descriptions');
  }

  doc.addPage();
  currentPage++;

  // Obligations (abbreviated for tender)
  currentPage = await renderObligationsSection(doc, packData, sections, currentPage, false);

  return currentPage;
}

/**
 * Render INSURER_BROKER specific sections
 */
async function renderInsurerPack(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  // Risk Profile
  sections.push({ title: 'Risk Profile', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Environmental Risk Profile', 50, 50);
  doc.moveDown();

  // Calculate risk metrics
  const overdueCount = packData.obligations.filter((o: any) => o.status === 'OVERDUE').length;
  const incidentCount = packData.incidents?.length || 0;
  const highRiskIncidents = packData.incidents?.filter((i: any) => i.risk_category === '1' || i.risk_category === '2').length || 0;

  doc.fontSize(12);
  doc.text(`Total Active Obligations: ${packData.obligations.length}`);
  doc.text(`Current Overdue Obligations: ${overdueCount}`);
  doc.moveDown();
  doc.text(`Total Incidents (24 months): ${incidentCount}`);
  doc.text(`High-Risk Incidents: ${highRiskIncidents}`);

  if (packData.ccsAssessment) {
    doc.moveDown();
    doc.text(`CCS Compliance Band: ${packData.ccsAssessment.compliance_band}`);
    doc.text(`CCS Total Score: ${packData.ccsAssessment.total_score}`);
  }

  doc.addPage();
  currentPage++;

  // Incident History (detailed for insurer)
  sections.push({ title: 'Incident Register', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Incident Register', 50, 50);
  doc.moveDown();

  if (packData.incidents && packData.incidents.length > 0) {
    for (const incident of packData.incidents.slice(0, 20)) {
      const incidentColor = incident.risk_category === '1' ? COLORS.RED :
        incident.risk_category === '2' ? COLORS.AMBER : COLORS.GREEN;

      doc.circle(55, doc.y + 5, 5).fill(incidentColor);
      doc.fontSize(10).fillColor(COLORS.BLACK).text(
        `${incident.incident_type} - ${new Date(incident.incident_date).toLocaleDateString()}`,
        70
      );
      doc.fontSize(8).fillColor(COLORS.GRAY).text(
        `Status: ${incident.status} | Risk Category: ${incident.risk_category || 'N/A'}`,
        70
      );
      if (incident.description) {
        doc.text(incident.description.substring(0, 100) + '...', 70);
      }
      doc.moveDown(0.5);

      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        currentPage++;
      }
    }
  } else {
    doc.fontSize(10).text('No incidents recorded in the reporting period.');
  }

  doc.addPage();
  currentPage++;

  // Obligations
  currentPage = await renderObligationsSection(doc, packData, sections, currentPage, false);

  return currentPage;
}

/**
 * Render standard AUDIT_PACK sections
 */
async function renderAuditPack(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  // Compliance Score
  sections.push({ title: 'Compliance Score', page: currentPage });
  const complianceScore = await calculateComplianceScore(packData, pack);

  doc.fontSize(18).fillColor(COLORS.BLACK).text('Compliance Score', 50, 50);
  doc.moveDown();

  doc.fontSize(14).text(`Site-Level Compliance Score: ${complianceScore.site_score}/100`);
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Calculation Date: ${complianceScore.calculated_at}`);
  doc.moveDown();

  doc.text('Score Breakdown:');
  doc.text(`• Total Obligations: ${complianceScore.breakdown.total_obligations}`);
  doc.text(`• Completed: ${complianceScore.breakdown.completed_obligations}`);
  doc.text(`• Overdue: ${complianceScore.breakdown.overdue_count}`);
  doc.text(`• Completion Rate: ${complianceScore.breakdown.completion_rate.toFixed(1)}%`);

  doc.addPage();
  currentPage++;

  // Obligations
  currentPage = await renderObligationsSection(doc, packData, sections, currentPage, false);

  // Evidence
  currentPage = await renderEvidenceSection(doc, packData, pack, sections, currentPage);

  // Change History
  currentPage = await renderChangeHistorySection(doc, packData, pack, sections, currentPage);

  // Compliance Clocks
  currentPage = await renderComplianceClockSection(doc, packData, pack, sections, currentPage);

  return currentPage;
}

/**
 * Render Obligations Section
 */
async function renderObligationsSection(
  doc: PDFKit.PDFDocument,
  packData: any,
  sections: any[],
  currentPage: number,
  includePermitCitations: boolean
): Promise<number> {
  sections.push({ title: 'Obligations', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Obligations', 50, 50);
  doc.moveDown();

  for (const obligation of packData.obligations) {
    const statusColor = obligation.status === 'COMPLETED' ? COLORS.GREEN :
      obligation.status === 'OVERDUE' ? COLORS.RED : COLORS.AMBER;

    // Status badge
    doc.circle(55, doc.y + 5, 5).fill(statusColor);

    // Title
    doc.fontSize(11).fillColor(COLORS.BLACK).text(
      obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 80) || 'Obligation',
      70,
      doc.y - 5,
      { width: doc.page.width - 150 }
    );
    doc.moveDown(0.3);

    // Details
    doc.fontSize(9).fillColor(COLORS.GRAY);
    doc.text(`Status: ${obligation.status} | Category: ${obligation.category}`, 70);

    if (obligation.deadline_date) {
      doc.text(`Deadline: ${obligation.deadline_date}`, 70);
    }

    // Permit Citation (for Regulator packs)
    if (includePermitCitations && obligation.condition_reference) {
      doc.fillColor(COLORS.BLUE).text(`Permit Reference: ${obligation.condition_reference}`, 70);
      if (obligation.page_reference) {
        doc.text(`Page: ${obligation.page_reference}`, 70);
      }
      doc.fillColor(COLORS.GRAY);
    }

    // Evidence count
    if (obligation.evidence && obligation.evidence.length > 0) {
      doc.fillColor(COLORS.GREEN).text(`Evidence: ${obligation.evidence.length} item(s) linked`, 70);
    } else {
      doc.fillColor(COLORS.RED).text('No evidence linked', 70);
    }

    doc.fillColor(COLORS.BLACK);
    doc.moveDown();

    // Page break check
    if (doc.y > doc.page.height - 120) {
      doc.addPage();
      currentPage++;
    }
  }

  doc.addPage();
  currentPage++;
  return currentPage;
}

/**
 * Render Evidence Section
 */
async function renderEvidenceSection(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  sections.push({ title: 'Evidence Register', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Evidence Register (Version-Locked)', 50, 50);
  doc.moveDown();

  doc.fontSize(9).fillColor(COLORS.GRAY).text(
    'All evidence items in this pack are snapshotted at generation time. ' +
    'The file hashes below can be used to verify authenticity.',
    { width: doc.page.width - 100 }
  );
  doc.moveDown();

  // Get unique evidence items
  const allEvidence: any[] = [];
  packData.obligations.forEach((o: any) => {
    if (o.evidence) {
      o.evidence.forEach((e: any) => {
        if (!allEvidence.find((x) => x.id === e.id)) {
          allEvidence.push({ ...e, obligationTitle: o.obligation_title });
        }
      });
    }
  });

  if (allEvidence.length > 0) {
    for (const evidence of allEvidence) {
      doc.fontSize(10).fillColor(COLORS.BLACK).text(evidence.file_name || evidence.title || 'Evidence Item');
      doc.fontSize(8).fillColor(COLORS.GRAY);
      doc.text(`Type: ${evidence.file_type || 'Unknown'} | Size: ${evidence.file_size_bytes ? (evidence.file_size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);
      doc.text(`Upload Date: ${evidence.created_at ? new Date(evidence.created_at).toLocaleDateString() : 'N/A'}`);
      if (evidence.file_hash) {
        doc.text(`Hash: ${evidence.file_hash.substring(0, 32)}...`);
      }
      doc.text(`Linked to: ${evidence.obligationTitle || 'Multiple obligations'}`);
      doc.moveDown(0.5);

      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        currentPage++;
      }
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No evidence items in this pack.');
  }

  doc.addPage();
  currentPage++;
  return currentPage;
}

/**
 * Render Change History Section
 */
async function renderChangeHistorySection(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  sections.push({ title: 'Change History', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Change Justification & Signoff History', 50, 50);
  doc.moveDown();

  const changeHistory = await getChangeHistory(packData, pack);

  if (changeHistory && changeHistory.length > 0) {
    for (const change of changeHistory) {
      doc.fontSize(10).fillColor(COLORS.BLACK).text(`${change.change_type || 'Change'} - ${change.entity_type || 'Entity'}`);
      doc.fontSize(8).fillColor(COLORS.GRAY);
      doc.text(`Date: ${change.signed_at ? new Date(change.signed_at).toLocaleDateString() : 'N/A'}`);
      if (change.signed_by_name) {
        doc.text(`Changed by: ${change.signed_by_name}${change.signed_by_email ? ` (${change.signed_by_email})` : ''}`);
      }
      if (change.justification_text) {
        doc.text(`Justification: ${change.justification_text}`);
      }
      doc.moveDown(0.5);

      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        currentPage++;
      }
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No changes recorded in this period.');
  }

  doc.addPage();
  currentPage++;
  return currentPage;
}

/**
 * Render Compliance Clock Section
 */
async function renderComplianceClockSection(doc: PDFKit.PDFDocument, packData: any, pack: any, sections: any[], currentPage: number): Promise<number> {
  sections.push({ title: 'Compliance Clocks', page: currentPage });
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Compliance Clock Summary', 50, 50);
  doc.moveDown();

  const clockSummary = await getComplianceClockSummary(packData, pack);

  if (clockSummary.overdue && clockSummary.overdue.length > 0) {
    doc.fontSize(14).fillColor(COLORS.RED).text('Overdue Items:');
    doc.moveDown(0.5);
    for (const item of clockSummary.overdue) {
      doc.fontSize(10).fillColor(COLORS.BLACK).text(`• ${item.title || item.clock_name || 'Item'}: ${Math.abs(item.days_overdue || 0)} days overdue`);
    }
    doc.moveDown();
  }

  if (clockSummary.upcoming && clockSummary.upcoming.length > 0) {
    doc.fontSize(14).fillColor(COLORS.AMBER).text('Upcoming Items (Next 30 Days):');
    doc.moveDown(0.5);
    for (const item of clockSummary.upcoming) {
      doc.fontSize(10).fillColor(COLORS.BLACK).text(`• ${item.title || item.clock_name || 'Item'}: ${item.days_remaining || 0} days remaining`);
    }
  } else if (!clockSummary.overdue || clockSummary.overdue.length === 0) {
    doc.fontSize(10).fillColor(COLORS.GREEN).text('No critical compliance clocks in this period.');
  }

  doc.addPage();
  currentPage++;
  return currentPage;
}

/**
 * Render Pack Provenance
 */
async function renderProvenance(doc: PDFKit.PDFDocument, packType: string, packData: any, pack: any): Promise<void> {
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Pack Provenance', 50, 50);
  doc.moveDown();

  doc.fontSize(12).text('Generation Information:');
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Pack ID: ${pack.id}`);
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
  doc.fontSize(12).text('Data Scope:');
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Company: ${packData.company?.name || 'N/A'}`);
  if (packData.site) {
    doc.text(`Site: ${packData.site.name || 'N/A'}`);
  }
  if (packData.dateRange.start && packData.dateRange.end) {
    doc.text(`Date Range: ${packData.dateRange.start} to ${packData.dateRange.end}`);
  }

  doc.moveDown();
  doc.fontSize(12).text('Pack Contents:');
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Total Obligations Included: ${packData.obligations.length}`);

  const totalEvidence = packData.obligations.reduce((sum: number, o: any) => sum + (o.evidence?.length || 0), 0);
  doc.text(`Evidence Items Included: ${totalEvidence}`);

  // Digital signature placeholder
  doc.moveDown(2);
  doc.fontSize(10).fillColor(COLORS.GRAY).text(
    'This document is electronically generated by EcoComply. ' +
    'For verification, reference the Pack ID with your EcoComply account.',
    { align: 'center', width: doc.page.width - 100 }
  );

  // Footer
  doc.fontSize(8).text('CONFIDENTIAL - Environmental Compliance Documentation', 50, doc.page.height - 50, { align: 'center' });
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
 * Get badge color for pack type
 */
function getPackTypeBadgeColor(packType: string): string {
  const colors: Record<string, string> = {
    AUDIT_PACK: COLORS.BLUE,
    REGULATOR_INSPECTION: '#7C3AED', // Purple
    TENDER_CLIENT_ASSURANCE: '#0891B2', // Cyan
    BOARD_MULTI_SITE_RISK: '#DC2626', // Red
    INSURER_BROKER: '#059669', // Emerald
  };
  return colors[packType] || COLORS.GRAY;
}

/**
 * Get CCS band color
 */
function getCCSBandColor(band: string | null): string {
  const colors: Record<string, string> = {
    A: COLORS.GREEN,
    B: '#22C55E', // Light green
    C: COLORS.AMBER,
    D: '#F97316', // Orange
    E: COLORS.RED,
    F: '#7F1D1D', // Dark red
  };
  return colors[band || ''] || COLORS.GRAY;
}

/**
 * Generate board recommendations based on data
 */
function generateBoardRecommendations(packData: any): string[] {
  const recommendations: string[] = [];

  const overdueCount = packData.obligations.filter((o: any) => o.status === 'OVERDUE').length;
  const noEvidenceCount = packData.obligations.filter((o: any) => !o.evidence || o.evidence.length === 0).length;
  const totalObligations = packData.obligations.length;

  if (overdueCount > 0) {
    recommendations.push(`Address ${overdueCount} overdue obligation(s) as a priority to reduce compliance risk.`);
  }

  if (noEvidenceCount > totalObligations * 0.2) {
    recommendations.push(`${noEvidenceCount} obligations (${((noEvidenceCount / totalObligations) * 100).toFixed(0)}%) lack evidence. Consider implementing evidence collection procedures.`);
  }

  if (packData.incidents && packData.incidents.length > 5) {
    recommendations.push('Review incident management procedures - higher than expected incident count in reporting period.');
  }

  // CCS-related recommendations
  const sitesWithPoorCCS = packData.sites.filter((s: any) => ['D', 'E', 'F'].includes(s.ccs_band));
  if (sitesWithPoorCCS.length > 0) {
    recommendations.push(`${sitesWithPoorCCS.length} site(s) have CCS band D or worse - prioritize remediation plans.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Compliance position is strong. Continue current monitoring and evidence collection practices.');
  }

  return recommendations;
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

  const overduePenalty = totalObligations > 0 ? (overdueCount / totalObligations) * 100 : 0;
  const siteScore = Math.max(0, Math.min(100, completionRate * 0.7 + (100 - overduePenalty) * 0.3));

  return {
    site_score: Math.round(siteScore),
    calculated_at: new Date().toISOString(),
    breakdown: {
      total_obligations: totalObligations,
      completed_obligations: completedObligations,
      overdue_count: overdueCount,
      completion_rate: completionRate,
    },
  };
}

/**
 * Get change history for pack period
 */
async function getChangeHistory(packData: any, pack: any): Promise<any[]> {
  const { data: changeLogs } = await supabaseAdmin
    .from('change_logs')
    .select('*')
    .eq('company_id', pack.company_id)
    .order('signed_at', { ascending: false })
    .limit(50);

  if (!changeLogs) return [];

  let filteredLogs = changeLogs;
  if (packData.dateRange.start && packData.dateRange.end) {
    filteredLogs = changeLogs.filter((log: any) => {
      const logDate = new Date(log.signed_at);
      const startDate = new Date(packData.dateRange.start);
      const endDate = new Date(packData.dateRange.end);
      return logDate >= startDate && logDate <= endDate;
    });
  }

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
 * Render a trend chart (CCS progression or completion rates)
 */
async function renderTrendChart(
  doc: PDFKit.PDFDocument,
  packData: any,
  chartType: 'ccs' | 'completion'
): Promise<void> {
  let chartConfig: ChartConfiguration;

  if (chartType === 'ccs') {
    // CCS progression chart - get historical data
    const ccsHistory = await getCCSHistory(packData);

    if (ccsHistory.length === 0) {
      doc.fontSize(10).fillColor(COLORS.GRAY).text('Insufficient historical data for CCS trend chart.');
      return;
    }

    const bandValues: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

    chartConfig = {
      type: 'line',
      data: {
        labels: ccsHistory.map((h: any) => h.year.toString()),
        datasets: [{
          label: 'CCS Band (A=5, F=0)',
          data: ccsHistory.map((h: any) => bandValues[h.band] || 0),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'CCS Band Progression',
            font: { size: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              callback: function(value) {
                const bands: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E', 0: 'F' };
                return bands[value as number] || '';
              },
            },
          },
        },
      },
    };
  } else {
    // Completion rate trend chart
    const completionHistory = await getCompletionHistory(packData);

    if (completionHistory.length === 0) {
      doc.fontSize(10).fillColor(COLORS.GRAY).text('Insufficient historical data for completion trend chart.');
      return;
    }

    chartConfig = {
      type: 'line',
      data: {
        labels: completionHistory.map((h: any) => h.month),
        datasets: [{
          label: 'Completion Rate (%)',
          data: completionHistory.map((h: any) => h.rate),
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Obligation Completion Rate (12 Month Trend)',
            font: { size: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              },
            },
          },
        },
      },
    };
  }

  try {
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
    doc.image(imageBuffer, 50, doc.y, { width: 450, height: 270 });
    doc.moveDown(12); // Move down to account for chart height
  } catch (error) {
    console.error('Error rendering trend chart:', error);
    doc.fontSize(10).fillColor(COLORS.RED).text('Error rendering chart.');
  }
}

/**
 * Get CCS history for trend chart
 */
async function getCCSHistory(packData: any): Promise<any[]> {
  if (!packData.site?.id) return [];

  const { data: assessments } = await supabaseAdmin
    .from('ccs_assessments')
    .select('compliance_year, compliance_band, total_score')
    .eq('site_id', packData.site.id)
    .order('compliance_year', { ascending: true })
    .limit(5);

  return (assessments || []).map((a: any) => ({
    year: a.compliance_year,
    band: a.compliance_band,
    score: a.total_score,
  }));
}

/**
 * Get completion history for trend chart
 */
async function getCompletionHistory(packData: any): Promise<any[]> {
  const history: any[] = [];
  const now = new Date();

  // Generate 12 months of data
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

    // Query obligations completed in this month
    let query = supabaseAdmin
      .from('obligations')
      .select('id, status, updated_at', { count: 'exact' })
      .eq('company_id', packData.company?.id)
      .is('deleted_at', null);

    if (packData.site?.id) {
      query = query.eq('site_id', packData.site.id);
    }

    const { count: totalCount } = await query;

    // Get completed by end of month
    const { count: completedCount } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', packData.company?.id)
      .eq('status', 'COMPLETED')
      .lte('updated_at', monthEnd.toISOString())
      .is('deleted_at', null);

    const rate = totalCount && totalCount > 0 ? ((completedCount || 0) / totalCount) * 100 : 0;

    history.push({
      month: monthLabel,
      rate: Math.round(rate),
    });
  }

  return history;
}

/**
 * Render a risk matrix/heat map
 */
async function renderRiskMatrix(
  doc: PDFKit.PDFDocument,
  packData: any
): Promise<void> {
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Risk Matrix', 50, doc.y);
  doc.moveDown();

  const matrixStartX = 100;
  const matrixStartY = doc.y;
  const cellWidth = 80;
  const cellHeight = 40;

  // Impact labels (horizontal)
  const impacts = ['Low', 'Medium', 'High', 'Critical'];
  // Likelihood labels (vertical)
  const likelihoods = ['Unlikely', 'Possible', 'Likely', 'Almost Certain'];

  // Risk scoring for each cell (impact x likelihood)
  const riskColors: Record<number, string> = {
    1: '#16A34A',  // Green - Low risk
    2: '#84CC16',  // Light green
    3: '#FCD34D',  // Yellow
    4: '#F59E0B',  // Amber
    6: '#F97316',  // Orange
    8: '#EF4444',  // Light red
    9: '#DC2626',  // Red
    12: '#B91C1C', // Dark red
    16: '#7F1D1D', // Very dark red - Critical
  };

  // Count obligations by risk level
  const riskCounts = await calculateRiskCounts(packData);

  // Draw axis labels
  doc.fontSize(8).fillColor(COLORS.GRAY);

  // Impact labels (top)
  for (let i = 0; i < impacts.length; i++) {
    doc.text(impacts[i], matrixStartX + 40 + i * cellWidth, matrixStartY - 15, {
      width: cellWidth,
      align: 'center',
    });
  }

  // Likelihood labels (left)
  for (let i = 0; i < likelihoods.length; i++) {
    doc.text(likelihoods[3 - i], matrixStartX - 70, matrixStartY + i * cellHeight + 15, {
      width: 60,
      align: 'right',
    });
  }

  // Draw matrix cells
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const likelihood = 4 - row; // 4, 3, 2, 1 from top to bottom
      const impact = col + 1;     // 1, 2, 3, 4 from left to right
      const riskScore = likelihood * impact;

      // Find closest color
      const colorKeys = Object.keys(riskColors).map(Number).sort((a, b) => a - b);
      const colorKey = colorKeys.reduce((prev, curr) =>
        Math.abs(curr - riskScore) < Math.abs(prev - riskScore) ? curr : prev
      );

      const cellX = matrixStartX + 40 + col * cellWidth;
      const cellY = matrixStartY + row * cellHeight;

      // Draw cell
      doc.rect(cellX, cellY, cellWidth, cellHeight).fill(riskColors[colorKey]);

      // Draw border
      doc.rect(cellX, cellY, cellWidth, cellHeight).lineWidth(0.5).stroke('#333333');

      // Count for this cell
      const cellKey = `${likelihood}-${impact}`;
      const count = riskCounts[cellKey] || 0;

      if (count > 0) {
        doc.fontSize(12).fillColor(COLORS.WHITE).text(
          count.toString(),
          cellX,
          cellY + 12,
          { width: cellWidth, align: 'center' }
        );
      }
    }
  }

  // Draw axis titles
  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Impact →', matrixStartX + 100, matrixStartY + 4 * cellHeight + 10);

  // Rotate text for likelihood (manual positioning)
  doc.text('↑ Likelihood', matrixStartX - 95, matrixStartY + 2 * cellHeight - 10);

  // Legend
  doc.moveDown(8);
  doc.fontSize(9).fillColor(COLORS.GRAY).text('Risk levels: Green = Low, Yellow = Medium, Orange = High, Red = Critical', 50);
  doc.moveDown();
}

/**
 * Calculate risk counts for matrix
 */
async function calculateRiskCounts(packData: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const obligation of packData.obligations) {
    // Determine likelihood based on status
    let likelihood = 2; // Default: Possible
    if (obligation.status === 'OVERDUE') likelihood = 4;
    else if (obligation.status === 'DUE_SOON') likelihood = 3;
    else if (obligation.status === 'COMPLETED') likelihood = 1;

    // Determine impact based on category and evidence
    let impact = 2; // Default: Medium
    if (obligation.category === 'MONITORING') impact = 3;
    if (obligation.category === 'OPERATIONAL') impact = 4;
    if (!obligation.evidence || obligation.evidence.length === 0) impact = Math.min(4, impact + 1);

    const key = `${likelihood}-${impact}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

/**
 * Get expected sections for TOC based on pack type
 * Pre-calculates approximate page numbers for Table of Contents
 */
function getExpectedSections(packType: string, packData: any): { title: string; page: number }[] {
  const sections: { title: string; page: number }[] = [];
  let page = 1;

  // Cover page
  sections.push({ title: 'Cover Page', page: page++ });

  // Table of Contents
  sections.push({ title: 'Table of Contents', page: page++ });

  // Executive Summary
  sections.push({ title: 'Executive Summary', page: page++ });

  // First-Year Mode page (if applicable)
  if (packData.company?.adoption_mode === 'FIRST_YEAR') {
    sections.push({ title: 'First-Year Adoption Mode Notice', page: page++ });
  }

  // Pack-specific sections
  switch (packType) {
    case 'REGULATOR_INSPECTION':
      sections.push({ title: 'Site & Permit Details', page: page++ });
      sections.push({ title: 'CCS Assessment', page: page++ });
      if (packData.ccsAssessment) {
        sections.push({ title: 'CCS Trend Analysis', page: page++ });
      }
      sections.push({ title: 'Compliance Trends', page: page++ });
      sections.push({ title: 'Risk Assessment', page: page++ });
      sections.push({ title: 'Obligations', page: page++ });
      sections.push({ title: 'Evidence Register', page: page++ });
      sections.push({ title: 'Compliance Clocks', page: page++ });
      break;

    case 'BOARD_MULTI_SITE_RISK':
      sections.push({ title: 'Portfolio Overview', page: page++ });
      sections.push({ title: 'Portfolio Risk Heat Map', page: page++ });
      sections.push({ title: 'Site Summary', page: page++ });
      sections.push({ title: 'Site Detail', page: page++ });
      sections.push({ title: 'Trend Analysis', page: page++ });
      sections.push({ title: 'Strategic Recommendations', page: page++ });
      sections.push({ title: 'Obligations', page: page++ });
      break;

    case 'TENDER_CLIENT_ASSURANCE':
      sections.push({ title: 'Compliance Statement', page: page++ });
      sections.push({ title: 'Performance KPIs', page: page++ });
      sections.push({ title: 'Compliance Trend', page: page++ });
      sections.push({ title: 'Incident Disclosure', page: page++ });
      sections.push({ title: 'Obligations', page: page++ });
      break;

    case 'INSURER_BROKER':
      sections.push({ title: 'Risk Profile', page: page++ });
      sections.push({ title: 'Incident Register', page: page++ });
      sections.push({ title: 'Obligations', page: page++ });
      break;

    default: // AUDIT_PACK
      sections.push({ title: 'Compliance Score', page: page++ });
      sections.push({ title: 'Obligations', page: page++ });
      sections.push({ title: 'Evidence Register', page: page++ });
      sections.push({ title: 'Change History', page: page++ });
      sections.push({ title: 'Compliance Clocks', page: page++ });
  }

  // Pack Provenance (always last)
  sections.push({ title: 'Pack Provenance', page: page++ });

  return sections;
}

/**
 * Render Table of Contents with tracked sections
 */
async function renderTableOfContents(
  doc: PDFKit.PDFDocument,
  sections: { title: string; page: number }[]
): Promise<void> {
  doc.fontSize(18).fillColor(COLORS.BLACK).text('Table of Contents', 50, 50);
  doc.moveDown();

  doc.fontSize(9).fillColor(COLORS.GRAY).text(
    'Note: Page numbers are approximate and may vary based on content length.',
    { width: doc.page.width - 100 }
  );
  doc.moveDown();

  for (const section of sections) {
    const dotLeader = '.'.repeat(Math.max(1, 55 - section.title.length));
    doc.fontSize(11).fillColor(COLORS.BLACK).text(
      `${section.title} ${dotLeader} ${section.page}`,
      70,
      doc.y,
      { width: doc.page.width - 140 }
    );
    doc.moveDown(0.3);
  }
}

/**
 * Check First-Year Mode status and get adjustments
 */
function getFirstYearModeAdjustments(packData: any): {
  isActive: boolean;
  adjustments: string[];
  expiryDate: string | null;
} {
  const company = packData.company;
  const isActive = company?.adoption_mode === 'FIRST_YEAR';

  if (!isActive) {
    return { isActive: false, adjustments: [], expiryDate: null };
  }

  const adjustments: string[] = [];

  // Lookback period adjustments
  adjustments.push('Lookback periods calculated from onboarding date instead of full historical period');

  // Trend data adjustments
  adjustments.push('Trend analysis shows data from onboarding date only');

  // CCS baseline
  if (packData.ccsAssessment) {
    adjustments.push('Current CCS band shown as baseline - improvement trajectory tracked from this point');
  }

  // Evidence coverage
  adjustments.push('Evidence coverage requirements prorated for time since onboarding');

  return {
    isActive,
    adjustments,
    expiryDate: company?.adoption_mode_expiry || null,
  };
}

/**
 * Check Board Pack detail access controls
 */
async function checkBoardDetailAccess(
  packId: string,
  section: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if detail access has been requested and approved
  const { data: requests } = await supabaseAdmin
    .from('board_pack_detail_requests')
    .select('*')
    .eq('pack_id', packId)
    .eq('section_requested', section)
    .eq('status', 'APPROVED')
    .limit(1);

  if (requests && requests.length > 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Site-level detail requires explicit access request and approval. Contact administrator.',
  };
}

/**
 * Check Tender Pack incident opt-in status
 */
async function checkTenderIncidentOptIn(
  packId: string
): Promise<{
  enabled: boolean;
  disclosureLevel?: string;
  approvedBy?: string;
  snapshotData?: any;
}> {
  const { data: optIn } = await supabaseAdmin
    .from('tender_pack_incident_optins')
    .select('*')
    .eq('pack_id', packId)
    .eq('opt_in_decision', 'INCLUDED')
    .order('approved_at', { ascending: false })
    .limit(1);

  if (optIn && optIn.length > 0) {
    return {
      enabled: true,
      disclosureLevel: optIn[0].disclosure_level,
      approvedBy: optIn[0].approved_by,
      snapshotData: optIn[0].incident_data_snapshot,
    };
  }

  return { enabled: false };
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
    overdue: overdue.slice(0, 20),
    upcoming: upcoming.slice(0, 20),
  };
}
