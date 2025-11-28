/**
 * Pack Generation Job
 * Generates PDF packs (Audit, Regulator, Tender, Board, Insurer)
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 6.1
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

    // Update pack record
    await supabaseAdmin
      .from('audit_packs')
      .update({
        status: 'COMPLETED',
        file_path: storagePath,
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
      obligation_text,
      summary,
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
  return new Promise((resolve, reject) => {
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

    // Summary Dashboard
    doc.fontSize(18).text('Summary Dashboard');
    doc.moveDown();
    const totalObligations = packData.obligations.length;
    const completedObligations = packData.obligations.filter((o: any) => o.status === 'COMPLETED').length;
    const completionRate = totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 0;

    doc.fontSize(12).text(`Total Obligations: ${totalObligations}`);
    doc.text(`Completed: ${completedObligations} (${completionRate.toFixed(1)}%)`);
    doc.text(`Pending: ${totalObligations - completedObligations}`);
    doc.addPage();

    // Obligations Section
    doc.fontSize(18).text('Obligations');
    doc.moveDown();

    for (const obligation of packData.obligations) {
      doc.fontSize(14).text(obligation.summary || obligation.obligation_text.substring(0, 100), { underline: true });
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
        doc.fontSize(10).text('No evidence linked', { color: 'red' });
      }

      doc.moveDown();
      if (doc.y > 700) {
        doc.addPage();
      }
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

