/**
 * Regulator Inspection Pack Renderer
 * EA-optimized pack with CCS band and permit citations
 */

import type PDFKit from 'pdfkit';
import type { PackData, PackRecord, Section } from '../types';
import { COLORS, formatDate, formatCurrency, formatPercentage, getCCSBandColor, truncateText, getStatusColor } from '../utils';

export async function renderRegulatorPack(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
): Promise<number> {
  // Permit Conditions Section
  sections.push({ title: 'Permit Conditions', page: currentPage });
  currentPage = await renderPermitConditions(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // CCS Assessment Section
  sections.push({ title: 'CCS Assessment', page: currentPage });
  currentPage = await renderCCSAssessment(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // ELV Headroom Section (if applicable)
  if (packData.elvSummary) {
    sections.push({ title: 'ELV Headroom Analysis', page: currentPage });
    currentPage = await renderELVHeadroom(doc, packData, currentPage);
    doc.addPage();
    currentPage++;
  }

  // Financial Impact Section
  if (packData.financialImpact) {
    sections.push({ title: 'Financial Impact', page: currentPage });
    currentPage = await renderFinancialImpact(doc, packData, currentPage);
    doc.addPage();
    currentPage++;
  }

  // Obligations Summary
  sections.push({ title: 'Obligations Summary', page: currentPage });
  currentPage = await renderObligationsSummary(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Evidence Inventory
  sections.push({ title: 'Evidence Inventory', page: currentPage });
  currentPage = await renderEvidenceInventory(doc, packData, currentPage);

  return currentPage;
}

// ========================================================================
// PERMIT CONDITIONS
// ========================================================================

async function renderPermitConditions(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Permit Conditions', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Summary of environmental permit conditions and compliance status.', 50, 80);

  // Permits table
  const tableY = 120;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Permit Number', 55, tableY + 5);
  doc.text('Type', 180, tableY + 5);
  doc.text('Regulator', 280, tableY + 5);
  doc.text('Status', 370, tableY + 5);
  doc.text('Expiry', 460, tableY + 5);

  let rowY = tableY + 25;
  const rowHeight = 25;

  for (const permit of packData.permits) {
    if ((packData.permits.indexOf(permit) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(8).fillColor(COLORS.BLACK);
    doc.text(permit.permit_number, 55, rowY + 8);
    doc.text(permit.permit_type || 'N/A', 180, rowY + 8);
    doc.text(permit.regulator || 'EA', 280, rowY + 8);

    const statusColor = getStatusColor(permit.status || 'ACTIVE');
    doc.fillColor(statusColor).text(permit.status || 'ACTIVE', 370, rowY + 8);

    doc.fillColor(COLORS.BLACK).text(formatDate(permit.expiry_date, 'short'), 460, rowY + 8);

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
// CCS ASSESSMENT
// ========================================================================

async function renderCCSAssessment(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Compliance Classification Scheme', 50, 50);

  if (!packData.ccsAssessment) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No CCS assessment data available.', 50, 100);
    return currentPage;
  }

  const ccs = packData.ccsAssessment;

  // Large CCS Band display
  const bandColor = getCCSBandColor(ccs.compliance_band);
  doc.rect(50, 100, 120, 100).fill(bandColor);
  doc.fontSize(48).fillColor(COLORS.WHITE).text(ccs.compliance_band || 'N/A', 55, 125, { width: 110, align: 'center' });
  doc.fontSize(12).text('CCS Band', 55, 175, { width: 110, align: 'center' });

  // Assessment details
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Assessment Details', 200, 100);

  const details = [
    ['Assessment Year', ccs.assessment_year?.toString() || 'N/A'],
    ['Total Points', ccs.total_points?.toString() || 'N/A'],
    ['Non-Compliance Count', ccs.non_compliance_count?.toString() || '0'],
  ];

  let y = 130;
  for (const [label, value] of details) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text(label, 200, y);
    doc.fillColor(COLORS.BLACK).text(value, 350, y);
    y += 25;
  }

  // Band explanation
  doc.fontSize(10).fillColor(COLORS.BLACK).text('CCS Band Explanation', 50, 250);
  doc.fontSize(9).fillColor(COLORS.GRAY).text(getCCSBandExplanation(ccs.compliance_band), 50, 275, { width: 500 });

  return currentPage;
}

// ========================================================================
// ELV HEADROOM
// ========================================================================

async function renderELVHeadroom(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Emission Limit Value Headroom', 50, 50);

  const elv = packData.elvSummary;
  if (!elv) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No ELV data available.', 50, 100);
    return currentPage;
  }

  // Summary stats
  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text(`Parameters Monitored: ${elv.totalParameters} | Within Limits: ${elv.parametersWithinLimits} | Exceeded: ${elv.parametersExceeded}`, 50, 80);

  // Worst parameter highlight
  if (elv.worstParameter) {
    const wp = elv.worstParameter;
    const statusColor = getStatusColor(wp.status);

    doc.rect(50, 110, 500, 60).fill(COLORS.LIGHT_GRAY);
    doc.fontSize(12).fillColor(COLORS.BLACK).text('Parameter Requiring Attention', 60, 120);
    doc.fontSize(14).fillColor(statusColor).text(wp.parameterName, 60, 140);
    doc.fontSize(10).fillColor(COLORS.GRAY).text(
      `Status: ${wp.status} | Headroom: ${formatPercentage(wp.headroomPercent)}`,
      60,
      155
    );
  }

  // Recent exceedances
  if (elv.recentExceedances && elv.recentExceedances.length > 0) {
    doc.fontSize(12).fillColor(COLORS.BLACK).text('Recent Exceedances', 50, 200);

    let y = 230;
    for (const exc of elv.recentExceedances.slice(0, 10)) {
      doc.fontSize(9).fillColor(COLORS.RED)
        .text(`• ${exc.parameterName}: ${formatPercentage(exc.exceedancePercentage)} over limit on ${formatDate(exc.occurredAt, 'short')}`, 60, y);
      y += 20;
    }
  }

  return currentPage;
}

// ========================================================================
// FINANCIAL IMPACT
// ========================================================================

async function renderFinancialImpact(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Financial Impact Assessment', 50, 50);

  const fi = packData.financialImpact;
  if (!fi) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No financial impact data available.', 50, 100);
    return currentPage;
  }

  // Total exposure highlight
  doc.rect(50, 90, 200, 70).fill(COLORS.RED);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Total Fine Exposure', 60, 100);
  doc.fontSize(24).text(formatCurrency(fi.totalFineExposure), 60, 120);

  // Remediation cost
  doc.rect(270, 90, 200, 70).fill(COLORS.AMBER);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Remediation Cost', 280, 100);
  doc.fontSize(24).text(formatCurrency(fi.remediationCost), 280, 120);

  // Insurance risk
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Insurance Risk Assessment', 50, 190);
  doc.fontSize(10).fillColor(COLORS.GRAY).text(`Risk Level: ${fi.insuranceRisk}`, 50, 210);

  // Fine breakdown
  if (fi.fineBreakdown && fi.fineBreakdown.length > 0) {
    doc.fontSize(12).fillColor(COLORS.BLACK).text('Fine Exposure Breakdown', 50, 260);

    const tableY = 290;
    doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

    doc.fontSize(9).fillColor(COLORS.BLACK);
    doc.text('Regulation', 55, tableY + 5);
    doc.text('Max Fine', 250, tableY + 5);
    doc.text('Likelihood', 350, tableY + 5);

    let rowY = tableY + 25;
    for (const item of fi.fineBreakdown.slice(0, 10)) {
      doc.fontSize(8).fillColor(COLORS.BLACK);
      doc.text(item.regulation, 55, rowY + 5);
      doc.text(formatCurrency(item.maxFine), 250, rowY + 5);
      doc.text(item.likelihood, 350, rowY + 5);
      rowY += 20;
    }
  }

  return currentPage;
}

// ========================================================================
// OBLIGATIONS SUMMARY
// ========================================================================

async function renderObligationsSummary(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Obligations Summary', 50, 50);

  const total = packData.obligations.length;
  const byStatus: Record<string, number> = {};

  for (const obl of packData.obligations) {
    byStatus[obl.status] = (byStatus[obl.status] || 0) + 1;
  }

  // Status breakdown
  doc.fontSize(10).fillColor(COLORS.GRAY).text(`Total Obligations: ${total}`, 50, 80);

  let y = 110;
  for (const [status, count] of Object.entries(byStatus)) {
    const color = getStatusColor(status);
    doc.rect(50, y, 20, 15).fill(color);
    doc.fontSize(10).fillColor(COLORS.BLACK).text(`${status}: ${count}`, 80, y + 2);
    y += 25;
  }

  // Obligations list
  y += 20;
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Key Obligations', 50, y);
  y += 25;

  for (const obl of packData.obligations.slice(0, 10)) {
    const statusColor = getStatusColor(obl.status);
    doc.rect(50, y, 8, 8).fill(statusColor);
    doc.fontSize(9).fillColor(COLORS.BLACK).text(
      truncateText(obl.obligation_title || obl.original_text || 'N/A', 70),
      65,
      y - 2
    );
    y += 20;

    if (y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      y = 50;
    }
  }

  return currentPage;
}

// ========================================================================
// EVIDENCE INVENTORY
// ========================================================================

async function renderEvidenceInventory(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Evidence Inventory', 50, 50);
  doc.fontSize(10).fillColor(COLORS.GRAY).text(`Total Evidence Items: ${packData.evidence.length}`, 50, 80);

  // Simple list of evidence
  let y = 110;
  for (const ev of packData.evidence.slice(0, 25)) {
    doc.fontSize(9).fillColor(COLORS.BLACK).text(`• ${truncateText(ev.file_name, 60)}`, 60, y);
    y += 18;

    if (y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      y = 50;
    }
  }

  if (packData.evidence.length > 25) {
    doc.fontSize(8).fillColor(COLORS.GRAY).text(
      `... and ${packData.evidence.length - 25} more items`,
      60,
      y + 10
    );
  }

  return currentPage;
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

function getCCSBandExplanation(band: string | null): string {
  switch (band?.toUpperCase()) {
    case 'A':
      return 'Band A indicates excellent compliance with no significant issues identified.';
    case 'B':
      return 'Band B indicates good compliance with minor issues that do not pose significant risk.';
    case 'C':
      return 'Band C indicates generally compliant with some areas requiring attention.';
    case 'D':
      return 'Band D indicates compliance concerns that require prompt action.';
    case 'E':
      return 'Band E indicates significant compliance failures requiring urgent attention.';
    case 'F':
      return 'Band F indicates serious non-compliance requiring immediate remedial action.';
    default:
      return 'No CCS band assessment available.';
  }
}
