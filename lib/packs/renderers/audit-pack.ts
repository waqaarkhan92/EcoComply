/**
 * Audit Pack Renderer
 * Renders the standard internal audit pack
 */

import type PDFKit from 'pdfkit';
import type { PackData, PackRecord, Section } from '../types';
import { COLORS, formatDate, truncateText, getStatusColor } from '../utils';

export async function renderAuditPack(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
): Promise<number> {
  // Obligations Section
  sections.push({ title: 'Obligations', page: currentPage });
  currentPage = await renderObligationsSection(doc, packData, pack, sections, currentPage);
  doc.addPage();
  currentPage++;

  // Evidence Section
  sections.push({ title: 'Evidence', page: currentPage });
  currentPage = await renderEvidenceSection(doc, packData, pack, sections, currentPage);
  doc.addPage();
  currentPage++;

  // Compliance Clock Section
  sections.push({ title: 'Compliance Clock', page: currentPage });
  currentPage = await renderComplianceClockSection(doc, packData, pack, sections, currentPage);
  doc.addPage();
  currentPage++;

  // Change History Section
  sections.push({ title: 'Change History', page: currentPage });
  currentPage = await renderChangeHistorySection(doc, packData, pack, sections, currentPage);

  return currentPage;
}

// ========================================================================
// OBLIGATIONS SECTION
// ========================================================================

async function renderObligationsSection(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  _pack: PackRecord,
  _sections: Section[],
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Obligations', 50, 50);

  // Summary stats
  const total = packData.obligations.length;
  const completed = packData.obligations.filter(o => o.status === 'COMPLETED').length;
  const overdue = packData.obligations.filter(o => o.status === 'OVERDUE').length;
  const pending = packData.obligations.filter(o => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text(`Total: ${total} | Completed: ${completed} | Pending: ${pending} | Overdue: ${overdue}`, 50, 80);

  // Table header
  const tableY = 110;
  const colWidths = [200, 80, 80, 80, 60];
  const colX = [50, 250, 330, 410, 490];

  // Header background
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  // Header text
  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Obligation', colX[0] + 5, tableY + 5);
  doc.text('Category', colX[1] + 5, tableY + 5);
  doc.text('Deadline', colX[2] + 5, tableY + 5);
  doc.text('Status', colX[3] + 5, tableY + 5);
  doc.text('Evidence', colX[4] + 5, tableY + 5);

  // Table rows
  let rowY = tableY + 25;
  const rowHeight = 35;

  for (const obligation of packData.obligations.slice(0, 15)) { // Limit to 15 per page
    // Alternate row background
    if ((packData.obligations.indexOf(obligation) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    // Obligation title
    doc.fontSize(8).fillColor(COLORS.BLACK);
    const title = truncateText(obligation.obligation_title || obligation.original_text || 'N/A', 40);
    doc.text(title, colX[0] + 5, rowY + 5, { width: colWidths[0] - 10 });

    // Category
    doc.text(obligation.category || 'N/A', colX[1] + 5, rowY + 5);

    // Deadline
    doc.text(formatDate(obligation.deadline_date, 'short'), colX[2] + 5, rowY + 5);

    // Status badge
    const statusColor = getStatusColor(obligation.status);
    doc.rect(colX[3] + 5, rowY + 3, 60, 15).fill(statusColor);
    doc.fontSize(7).fillColor(COLORS.WHITE).text(obligation.status, colX[3] + 10, rowY + 6);

    // Evidence count
    doc.fontSize(8).fillColor(COLORS.BLACK).text(
      (obligation.evidence_count || 0).toString(),
      colX[4] + 5,
      rowY + 5
    );

    rowY += rowHeight;

    // Page break if needed
    if (rowY > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      rowY = 50;
    }
  }

  // Note if more obligations exist
  if (packData.obligations.length > 15) {
    doc.fontSize(8).fillColor(COLORS.GRAY).text(
      `... and ${packData.obligations.length - 15} more obligations (see full list in EcoComply)`,
      50,
      rowY + 10
    );
  }

  return currentPage;
}

// ========================================================================
// EVIDENCE SECTION
// ========================================================================

async function renderEvidenceSection(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  _pack: PackRecord,
  _sections: Section[],
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Evidence Inventory', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text(`Total Evidence Items: ${packData.evidence.length}`, 50, 80);

  // Table header
  const tableY = 110;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('File Name', 55, tableY + 5);
  doc.text('Type', 250, tableY + 5);
  doc.text('Size', 330, tableY + 5);
  doc.text('Uploaded', 400, tableY + 5);
  doc.text('Status', 480, tableY + 5);

  // Table rows
  let rowY = tableY + 25;
  const rowHeight = 25;

  for (const evidence of packData.evidence.slice(0, 20)) {
    if ((packData.evidence.indexOf(evidence) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(8).fillColor(COLORS.BLACK);
    doc.text(truncateText(evidence.file_name, 35), 55, rowY + 8);
    doc.text(evidence.file_type || 'N/A', 250, rowY + 8);
    doc.text(formatFileSize(evidence.file_size), 330, rowY + 8);
    doc.text(formatDate(evidence.uploaded_at, 'short'), 400, rowY + 8);

    const statusColor = evidence.validation_status === 'VALID' ? COLORS.GREEN : COLORS.GRAY;
    doc.fillColor(statusColor).text(evidence.validation_status || 'N/A', 480, rowY + 8);

    rowY += rowHeight;

    if (rowY > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      rowY = 50;
    }
  }

  return currentPage;
}

// ========================================================================
// COMPLIANCE CLOCK SECTION
// ========================================================================

async function renderComplianceClockSection(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  _pack: PackRecord,
  _sections: Section[],
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Compliance Clock', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Overview of upcoming deadlines and compliance milestones.', 50, 80);

  // Group obligations by month
  const byMonth: Record<string, typeof packData.obligations> = {};

  for (const obligation of packData.obligations) {
    if (obligation.deadline_date) {
      const date = new Date(obligation.deadline_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = [];
      }
      byMonth[monthKey].push(obligation);
    }
  }

  // Render timeline
  let y = 120;
  const months = Object.keys(byMonth).sort();

  for (const month of months.slice(0, 6)) { // Show next 6 months
    const monthDate = new Date(month + '-01');
    const monthName = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const obligations = byMonth[month];

    // Month header
    doc.fontSize(12).fillColor(COLORS.BLACK).text(monthName, 50, y);

    // Count by status
    const overdueCount = obligations.filter(o => o.status === 'OVERDUE').length;
    const pendingCount = obligations.filter(o => o.status !== 'COMPLETED' && o.status !== 'OVERDUE').length;
    const completedCount = obligations.filter(o => o.status === 'COMPLETED').length;

    doc.fontSize(9).fillColor(COLORS.GRAY);
    doc.text(`${obligations.length} total`, 200, y);

    if (overdueCount > 0) {
      doc.fillColor(COLORS.RED).text(`${overdueCount} overdue`, 270, y);
    }
    if (pendingCount > 0) {
      doc.fillColor(COLORS.AMBER).text(`${pendingCount} pending`, 340, y);
    }
    if (completedCount > 0) {
      doc.fillColor(COLORS.GREEN).text(`${completedCount} completed`, 410, y);
    }

    y += 30;

    if (y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      y = 50;
    }
  }

  return currentPage;
}

// ========================================================================
// CHANGE HISTORY SECTION
// ========================================================================

async function renderChangeHistorySection(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  _pack: PackRecord,
  _sections: Section[],
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Change History', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Recent changes to obligations and evidence within the reporting period.', 50, 80);

  const changes = packData.changeHistory || [];

  if (changes.length === 0) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No changes recorded in this period.', 50, 120);
    return currentPage;
  }

  // Table header
  const tableY = 110;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Date', 55, tableY + 5);
  doc.text('Entity', 130, tableY + 5);
  doc.text('Action', 230, tableY + 5);
  doc.text('Changed By', 380, tableY + 5);

  // Table rows
  let rowY = tableY + 25;
  const rowHeight = 25;

  for (const change of changes.slice(0, 20)) {
    if ((changes.indexOf(change) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(8).fillColor(COLORS.BLACK);
    doc.text(formatDate(change.changed_at, 'short'), 55, rowY + 8);
    doc.text(change.entity_type, 130, rowY + 8);
    doc.text(change.action, 230, rowY + 8);
    doc.text(change.changed_by || 'System', 380, rowY + 8);

    rowY += rowHeight;

    if (rowY > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      rowY = 50;
    }
  }

  return currentPage;
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
