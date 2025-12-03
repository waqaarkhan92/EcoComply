/**
 * Report Generation Job
 * Generates PDF/CSV/JSON reports (Compliance Summary, Deadline Report, Obligation Report, Evidence Report)
 * Reference: docs/specs/40_Backend_API_Specification.md Section 27
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import PDFDocument from 'pdfkit';

export interface ReportGenerationJobData {
  report_id: string;
  report_type: 'compliance_summary' | 'deadline_report' | 'obligation_report' | 'evidence_report';
  company_id: string;
  site_id?: string;
  filters?: {
    date_range_start?: string;
    date_range_end?: string;
    status?: string[];
    category?: string[];
  };
  format?: 'PDF' | 'CSV' | 'JSON';
  background_job_id?: string;
}

export async function processReportGenerationJob(job: Job<ReportGenerationJobData>): Promise<void> {
  const { report_id, report_type, company_id, site_id, filters, format = 'PDF', background_job_id } = job.data;

  try {
    // Update background job status
    if (background_job_id) {
      await supabaseAdmin
        .from('background_jobs')
        .update({ status: 'RUNNING', started_at: new Date().toISOString() })
        .eq('id', background_job_id);
    }

    // Get report record
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message || 'Unknown error'}`);
    }

    // Update report status
    await supabaseAdmin
      .from('reports')
      .update({ status: 'GENERATING', updated_at: new Date().toISOString() })
      .eq('id', report_id);

    // Collect data based on report type
    const reportData = await collectReportData(report_type, company_id, site_id, filters);

    // Generate report based on format
    let fileBuffer: Buffer;
    let storagePath: string;

    if (format === 'PDF') {
      fileBuffer = await generateReportPDF(report_type, reportData);
      storagePath = await uploadReportToStorage(report_id, fileBuffer, format);
    } else if (format === 'CSV') {
      fileBuffer = Buffer.from(generateReportCSV(report_type, reportData));
      storagePath = await uploadReportToStorage(report_id, fileBuffer, format);
    } else if (format === 'JSON') {
      fileBuffer = Buffer.from(JSON.stringify(reportData, null, 2));
      storagePath = await uploadReportToStorage(report_id, fileBuffer, format);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Update report record
    await supabaseAdmin
      .from('reports')
      .update({
        status: 'COMPLETED',
        file_path: storagePath,
        file_size_bytes: fileBuffer.length,
        generated_data: reportData,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days expiration
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    // Update background job
    if (background_job_id) {
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          result: JSON.stringify({ report_id, file_path: storagePath }),
        })
        .eq('id', background_job_id);
    }

    // Create notification
    if (report.generated_by) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', report.generated_by)
        .single();

      if (user) {
        await supabaseAdmin.from('notifications').insert({
          user_id: report.generated_by,
          company_id: company_id,
          site_id: site_id || null,
          recipient_email: user.email,
          notification_type: 'REPORT_READY',
          channel: 'EMAIL',
          priority: 'NORMAL',
          subject: `${getReportTypeName(report_type)} Report Ready`,
          body_text: `Your ${getReportTypeName(report_type)} report has been generated and is ready for download.`,
          entity_type: 'report',
          entity_id: report_id,
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
        });
      }
    }

    await job.updateProgress(100);
    console.log(`Report generation completed: ${report_id} - ${report_type}`);
  } catch (error: any) {
    console.error(`Report generation failed: ${report_id}`, error);

    // Update report status
    await supabaseAdmin
      .from('reports')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    // Update background job
    if (background_job_id) {
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'FAILED',
          error_message: error.message || 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', background_job_id);
    }

    throw error; // Re-throw to trigger retry
  }
}

/**
 * Collect data for report generation
 */
async function collectReportData(
  reportType: string,
  companyId: string,
  siteId?: string,
  filters?: any
): Promise<any> {
  // Get company info
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, company_number')
    .eq('id', companyId)
    .single();

  let site = null;
  if (siteId) {
    const { data: siteData } = await supabaseAdmin
      .from('sites')
      .select('name, address_line_1, city, regulator')
      .eq('id', siteId)
      .single();
    site = siteData;
  }

  // Get all sites for company (for multi-site reports)
  const { data: allSites } = await supabaseAdmin
    .from('sites')
    .select('id, name, regulator')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  const data: any = {
    company,
    site,
    sites: allSites || [],
    generated_at: new Date().toISOString(),
    report_type: reportType,
    filters: filters || {},
  };

  switch (reportType) {
    case 'compliance_summary':
      data.summary = await collectComplianceSummaryData(companyId, siteId, filters);
      break;
    case 'deadline_report':
      data.deadlines = await collectDeadlineReportData(companyId, siteId, filters);
      break;
    case 'obligation_report':
      data.obligations = await collectObligationReportData(companyId, siteId, filters);
      break;
    case 'evidence_report':
      data.evidence = await collectEvidenceReportData(companyId, siteId, filters);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return data;
}

/**
 * Collect compliance summary data
 */
async function collectComplianceSummaryData(companyId: string, siteId?: string, filters?: any): Promise<any> {
  // Get obligations statistics
  let obligationsQuery = supabaseAdmin
    .from('obligations')
    .select('id, status, category, site_id')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (siteId) {
    obligationsQuery = obligationsQuery.eq('site_id', siteId);
  }

  if (filters?.date_range_start && filters?.date_range_end) {
    obligationsQuery = obligationsQuery
      .gte('deadline_date', filters.date_range_start)
      .lte('deadline_date', filters.date_range_end);
  }

  const { data: obligations } = await obligationsQuery;

  // Calculate statistics
  const totalObligations = obligations?.length || 0;
  const byStatus = obligations?.reduce((acc: any, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {}) || {};
  const byCategory = obligations?.reduce((acc: any, o: any) => {
    acc[o.category] = (acc[o.category] || 0) + 1;
    return acc;
  }, {}) || {};

  // Get deadlines statistics
  let deadlinesQuery = supabaseAdmin
    .from('deadlines')
    .select('id, status, due_date')
    .eq('company_id', companyId);

  if (siteId) {
    deadlinesQuery = deadlinesQuery.eq('site_id', siteId);
  }

  const { data: deadlines } = await deadlinesQuery;
  const upcomingDeadlines = deadlines?.filter((d: any) => {
    const dueDate = new Date(d.due_date);
    const today = new Date();
    return dueDate >= today && d.status === 'PENDING';
  }).length || 0;
  const overdueDeadlines = deadlines?.filter((d: any) => d.status === 'OVERDUE').length || 0;

  // Get evidence statistics
  let evidenceQuery = supabaseAdmin
    .from('evidence_items')
    .select('id, is_verified, site_id')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (siteId) {
    evidenceQuery = evidenceQuery.eq('site_id', siteId);
  }

  const { data: evidence } = await evidenceQuery;
  const totalEvidence = evidence?.length || 0;
  const verifiedEvidence = evidence?.filter((e: any) => e.is_verified).length || 0;

  return {
    total_obligations: totalObligations,
    obligations_by_status: byStatus,
    obligations_by_category: byCategory,
    total_deadlines: deadlines?.length || 0,
    upcoming_deadlines: upcomingDeadlines,
    overdue_deadlines: overdueDeadlines,
    total_evidence: totalEvidence,
    verified_evidence: verifiedEvidence,
    verification_rate: totalEvidence > 0 ? (verifiedEvidence / totalEvidence) * 100 : 0,
    compliance_score: calculateComplianceScore(totalObligations, byStatus, overdueDeadlines),
  };
}

/**
 * Collect deadline report data
 */
async function collectDeadlineReportData(companyId: string, siteId?: string, filters?: any): Promise<any> {
  let query = supabaseAdmin
    .from('deadlines')
    .select(`
      id,
      due_date,
      status,
      compliance_period,
      completed_at,
      completed_by,
      schedules!inner(
        obligation_id,
        obligations!inner(
          id,
          obligation_title,
          category,
          status
        )
      ),
      sites(id, name)
    `)
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  if (filters?.date_range_start && filters?.date_range_end) {
    query = query
      .gte('due_date', filters.date_range_start)
      .lte('due_date', filters.date_range_end);
  } else if (filters?.date_range_start) {
    query = query.gte('due_date', filters.date_range_start);
  }

  if (filters?.status) {
    query = query.in('status', filters.status);
  }

  const { data: deadlines } = await query;

  return deadlines || [];
}

/**
 * Collect obligation report data
 */
async function collectObligationReportData(companyId: string, siteId?: string, filters?: any): Promise<any> {
  let query = supabaseAdmin
    .from('obligations')
    .select(`
      id,
      obligation_title,
      obligation_description,
      category,
      status,
      frequency,
      deadline_date,
      condition_reference,
      page_reference,
      documents(id, title, document_type, reference_number),
      sites(id, name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('deadline_date', { ascending: false });

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  if (filters?.status) {
    query = query.in('status', filters.status);
  }

  if (filters?.category) {
    query = query.in('category', filters.category);
  }

  if (filters?.date_range_start && filters?.date_range_end) {
    query = query
      .gte('deadline_date', filters.date_range_start)
      .lte('deadline_date', filters.date_range_end);
  }

  const { data: obligations } = await query;

  // Get evidence counts for each obligation
  if (obligations && obligations.length > 0) {
    for (const obligation of obligations) {
      const { count } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select('*', { count: 'exact', head: true })
        .eq('obligation_id', obligation.id)
        .is('deleted_at', null);

      obligation.evidence_count = count || 0;
    }
  }

  return obligations || [];
}

/**
 * Collect evidence report data
 */
async function collectEvidenceReportData(companyId: string, siteId?: string, filters?: any): Promise<any> {
  let query = supabaseAdmin
    .from('evidence_items')
    .select(`
      id,
      file_name,
      file_type,
      file_size_bytes,
      is_verified,
      verified_at,
      uploaded_at,
      uploaded_by,
      sites(id, name),
      users!evidence_items_uploaded_by_fkey(id, full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  if (filters?.date_range_start && filters?.date_range_end) {
    query = query
      .gte('uploaded_at', filters.date_range_start)
      .lte('uploaded_at', filters.date_range_end);
  }

  const { data: evidence } = await query;

  // Get obligation links for each evidence
  if (evidence && evidence.length > 0) {
    for (const item of evidence) {
      const { data: links } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select(`
          obligations!inner(id, obligation_title)
        `)
        .eq('evidence_id', item.id)
        .is('deleted_at', null);

      item.linked_obligations = links?.map((l: any) => l.obligations) || [];
    }
  }

  return evidence || [];
}

/**
 * Generate PDF report
 */
async function generateReportPDF(reportType: string, reportData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cover Page
    doc.fontSize(24).text(getReportTypeName(reportType), { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(reportData.company?.name || 'Company Name', { align: 'center' });
    if (reportData.site) {
      doc.fontSize(14).text(reportData.site.name, { align: 'center' });
    }
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date(reportData.generated_at).toLocaleDateString()}`, { align: 'center' });
    doc.addPage();

    // Report-specific content
    switch (reportType) {
      case 'compliance_summary':
        generateComplianceSummaryPDF(doc, reportData);
        break;
      case 'deadline_report':
        generateDeadlineReportPDF(doc, reportData);
        break;
      case 'obligation_report':
        generateObligationReportPDF(doc, reportData);
        break;
      case 'evidence_report':
        generateEvidenceReportPDF(doc, reportData);
        break;
    }

    doc.end();
  });
}

/**
 * Generate compliance summary PDF
 */
function generateComplianceSummaryPDF(doc: PDFKit.PDFDocument, reportData: any): void {
  const summary = reportData.summary;

  doc.fontSize(18).text('Compliance Summary', { underline: true });
  doc.moveDown();

  // Key Metrics
  doc.fontSize(14).text('Key Metrics', { underline: true });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Total Obligations: ${summary.total_obligations}`);
  doc.text(`Compliance Score: ${summary.compliance_score.toFixed(1)}%`);
  doc.text(`Upcoming Deadlines: ${summary.upcoming_deadlines}`);
  doc.text(`Overdue Deadlines: ${summary.overdue_deadlines}`);
  doc.text(`Total Evidence: ${summary.total_evidence}`);
  doc.text(`Verification Rate: ${summary.verification_rate.toFixed(1)}%`);
  doc.addPage();

  // Obligations by Status
  doc.fontSize(14).text('Obligations by Status', { underline: true });
  doc.moveDown();
  doc.fontSize(12);
  Object.entries(summary.obligations_by_status || {}).forEach(([status, count]: [string, any]) => {
    doc.text(`${status}: ${count}`);
  });
  doc.addPage();

  // Obligations by Category
  doc.fontSize(14).text('Obligations by Category', { underline: true });
  doc.moveDown();
  doc.fontSize(12);
  Object.entries(summary.obligations_by_category || {}).forEach(([category, count]: [string, any]) => {
    doc.text(`${category}: ${count}`);
  });
}

/**
 * Generate deadline report PDF
 */
function generateDeadlineReportPDF(doc: PDFKit.PDFDocument, reportData: any): void {
  doc.fontSize(18).text('Deadline Report', { underline: true });
  doc.moveDown();

  const deadlines = reportData.deadlines || [];
  
  deadlines.forEach((deadline: any, index: number) => {
    if (index > 0 && index % 10 === 0) {
      doc.addPage();
    }
    
    doc.fontSize(12);
    doc.text(`Due Date: ${deadline.due_date}`, { continued: false });
    doc.text(`Status: ${deadline.status}`, { indent: 20 });
    if (deadline.schedules?.obligations) {
      doc.text(`Obligation: ${deadline.schedules.obligations.obligation_title}`, { indent: 20 });
    }
    if (deadline.sites) {
      doc.text(`Site: ${deadline.sites.name}`, { indent: 20 });
    }
    doc.moveDown();
  });
}

/**
 * Generate obligation report PDF
 */
function generateObligationReportPDF(doc: PDFKit.PDFDocument, reportData: any): void {
  doc.fontSize(18).text('Obligation Report', { underline: true });
  doc.moveDown();

  const obligations = reportData.obligations || [];
  
  obligations.forEach((obligation: any, index: number) => {
    if (index > 0 && index % 10 === 0) {
      doc.addPage();
    }
    
    doc.fontSize(12);
    doc.text(`${obligation.obligation_title}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Status: ${obligation.status}`, { indent: 20 });
    doc.text(`Category: ${obligation.category}`, { indent: 20 });
    if (obligation.deadline_date) {
      doc.text(`Deadline: ${obligation.deadline_date}`, { indent: 20 });
    }
    doc.text(`Evidence Count: ${obligation.evidence_count || 0}`, { indent: 20 });
    doc.moveDown();
  });
}

/**
 * Generate evidence report PDF
 */
function generateEvidenceReportPDF(doc: PDFKit.PDFDocument, reportData: any): void {
  doc.fontSize(18).text('Evidence Report', { underline: true });
  doc.moveDown();

  const evidence = reportData.evidence || [];
  
  evidence.forEach((item: any, index: number) => {
    if (index > 0 && index % 10 === 0) {
      doc.addPage();
    }
    
    doc.fontSize(12);
    doc.text(`${item.file_name}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Type: ${item.file_type}`, { indent: 20 });
    doc.text(`Size: ${(item.file_size_bytes / 1024).toFixed(2)} KB`, { indent: 20 });
    doc.text(`Verified: ${item.is_verified ? 'Yes' : 'No'}`, { indent: 20 });
    doc.text(`Uploaded: ${new Date(item.uploaded_at).toLocaleDateString()}`, { indent: 20 });
    if (item.sites) {
      doc.text(`Site: ${item.sites.name}`, { indent: 20 });
    }
    doc.moveDown();
  });
}

/**
 * Generate CSV report
 */
function generateReportCSV(reportType: string, reportData: any): string {
  switch (reportType) {
    case 'compliance_summary':
      return generateComplianceSummaryCSV(reportData);
    case 'deadline_report':
      return generateDeadlineReportCSV(reportData);
    case 'obligation_report':
      return generateObligationReportCSV(reportData);
    case 'evidence_report':
      return generateEvidenceReportCSV(reportData);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

function generateComplianceSummaryCSV(reportData: any): string {
  const summary = reportData.summary;
  const rows = [
    ['Metric', 'Value'],
    ['Total Obligations', summary.total_obligations],
    ['Compliance Score', summary.compliance_score.toFixed(1) + '%'],
    ['Upcoming Deadlines', summary.upcoming_deadlines],
    ['Overdue Deadlines', summary.overdue_deadlines],
    ['Total Evidence', summary.total_evidence],
    ['Verification Rate', summary.verification_rate.toFixed(1) + '%'],
  ];
  return rows.map(row => row.join(',')).join('\n');
}

function generateDeadlineReportCSV(reportData: any): string {
  const deadlines = reportData.deadlines || [];
  const rows = [
    ['Due Date', 'Status', 'Obligation', 'Site'],
    ...deadlines.map((d: any) => [
      d.due_date,
      d.status,
      d.schedules?.obligations?.obligation_title || '',
      d.sites?.name || '',
    ]),
  ];
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateObligationReportCSV(reportData: any): string {
  const obligations = reportData.obligations || [];
  const rows = [
    ['Title', 'Status', 'Category', 'Deadline', 'Evidence Count'],
    ...obligations.map((o: any) => [
      o.obligation_title,
      o.status,
      o.category,
      o.deadline_date || '',
      o.evidence_count || 0,
    ]),
  ];
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateEvidenceReportCSV(reportData: any): string {
  const evidence = reportData.evidence || [];
  const rows = [
    ['File Name', 'Type', 'Size (KB)', 'Verified', 'Uploaded', 'Site'],
    ...evidence.map((e: any) => [
      e.file_name,
      e.file_type,
      (e.file_size_bytes / 1024).toFixed(2),
      e.is_verified ? 'Yes' : 'No',
      new Date(e.uploaded_at).toLocaleDateString(),
      e.sites?.name || '',
    ]),
  ];
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Upload report to Supabase Storage
 */
async function uploadReportToStorage(reportId: string, fileBuffer: Buffer, format: string): Promise<string> {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const extension = format.toLowerCase();
  const fileName = `report-${reportId}.${extension}`;
  const storagePath = `reports/${reportId}/${fileName}`;

  const { error } = await supabase.storage
    .from('reports')
    .upload(storagePath, fileBuffer, {
      contentType: format === 'PDF' ? 'application/pdf' : format === 'CSV' ? 'text/csv' : 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload report to storage: ${error.message}`);
  }

  return storagePath;
}

/**
 * Calculate compliance score
 * @deprecated Use calculateModuleComplianceScore from compliance-score-service instead
 * This function is kept for backward compatibility but should be replaced with the full implementation
 */
function calculateComplianceScore(
  totalObligations: number,
  obligationsByStatus: any,
  overdueDeadlines: number
): number {
  if (totalObligations === 0) return 100;

  const completed = obligationsByStatus.COMPLETED || 0;
  const completionRate = (completed / totalObligations) * 100;

  // Penalize for overdue deadlines
  const overduePenalty = Math.min(overdueDeadlines * 5, 30); // Max 30% penalty

  return Math.max(0, completionRate - overduePenalty);
}

/**
 * Get human-readable report type name
 */
function getReportTypeName(reportType: string): string {
  const names: Record<string, string> = {
    compliance_summary: 'Compliance Summary Report',
    deadline_report: 'Deadline Report',
    obligation_report: 'Obligation Report',
    evidence_report: 'Evidence Report',
  };
  return names[reportType] || reportType;
}

