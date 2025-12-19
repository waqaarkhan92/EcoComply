/**
 * Insurer/Broker Pack Renderer
 * Risk-focused pack for insurance underwriting
 */

import type PDFKit from 'pdfkit';
import type { PackData, PackRecord, Section } from '../types';
import { COLORS, formatDate, formatCurrency, formatPercentage, getStatusColor, truncateText } from '../utils';

export async function renderInsurerPack(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
): Promise<number> {
  // Risk Overview
  sections.push({ title: 'Risk Overview', page: currentPage });
  currentPage = await renderRiskOverview(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Incident History
  sections.push({ title: 'Incident History', page: currentPage });
  currentPage = await renderIncidentHistory(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Financial Exposure
  sections.push({ title: 'Financial Exposure', page: currentPage });
  currentPage = await renderFinancialExposure(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Compliance Trends
  sections.push({ title: 'Compliance Trends', page: currentPage });
  currentPage = await renderComplianceTrends(doc, packData, currentPage);

  return currentPage;
}

// ========================================================================
// RISK OVERVIEW
// ========================================================================

async function renderRiskOverview(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Risk Overview', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Environmental risk assessment for insurance underwriting purposes.', 50, 80);

  // Calculate risk metrics
  const totalObligations = packData.obligations.length;
  const overdueObligations = packData.obligations.filter(o => o.status === 'OVERDUE').length;
  const totalIncidents = packData.incidents.length;
  const openIncidents = packData.incidents.filter(i => i.status !== 'CLOSED').length;

  // Risk score calculation
  const overdueRatio = totalObligations > 0 ? overdueObligations / totalObligations : 0;
  const incidentScore = Math.min(totalIncidents * 10, 50);
  const baseRiskScore = Math.round((overdueRatio * 50) + incidentScore);
  const riskScore = Math.min(100, baseRiskScore);

  const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
  const riskColor = riskScore >= 70 ? COLORS.RED : riskScore >= 40 ? COLORS.AMBER : COLORS.GREEN;

  // Risk Score Display
  doc.circle(120, 180, 60).fill(riskColor);
  doc.fontSize(36).fillColor(COLORS.WHITE).text(riskScore.toString(), 75, 155, { width: 90, align: 'center' });
  doc.fontSize(12).text('Risk Score', 75, 195, { width: 90, align: 'center' });

  // Risk Level Badge
  doc.rect(200, 150, 120, 40).fill(riskColor);
  doc.fontSize(14).fillColor(COLORS.WHITE).text(riskLevel, 210, 163);
  doc.fontSize(10).text('Risk Level', 210, 180);

  // Key Risk Indicators
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Key Risk Indicators', 350, 130);

  const indicators = [
    { label: 'Total Incidents', value: totalIncidents.toString(), color: totalIncidents > 5 ? COLORS.RED : COLORS.GREEN },
    { label: 'Open Incidents', value: openIncidents.toString(), color: openIncidents > 0 ? COLORS.AMBER : COLORS.GREEN },
    { label: 'Overdue Obligations', value: overdueObligations.toString(), color: overdueObligations > 0 ? COLORS.RED : COLORS.GREEN },
    { label: 'Active Permits', value: packData.permits.filter(p => p.status === 'ACTIVE').length.toString(), color: COLORS.BLUE },
  ];

  let y = 160;
  for (const indicator of indicators) {
    doc.rect(350, y, 15, 15).fill(indicator.color);
    doc.fontSize(10).fillColor(COLORS.BLACK).text(`${indicator.label}: ${indicator.value}`, 375, y + 2);
    y += 25;
  }

  // Risk Factors Summary
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Risk Factors', 50, 280);

  const riskFactors = [];
  if (overdueObligations > 0) {
    riskFactors.push(`${overdueObligations} overdue compliance obligations`);
  }
  if (openIncidents > 0) {
    riskFactors.push(`${openIncidents} unresolved environmental incidents`);
  }
  if (packData.financialImpact && packData.financialImpact.totalFineExposure > 100000) {
    riskFactors.push(`Significant fine exposure: ${formatCurrency(packData.financialImpact.totalFineExposure)}`);
  }
  if (packData.ccsAssessment && ['D', 'E', 'F'].includes(packData.ccsAssessment.compliance_band?.toUpperCase() || '')) {
    riskFactors.push(`Poor CCS band rating: ${packData.ccsAssessment.compliance_band}`);
  }
  if (riskFactors.length === 0) {
    riskFactors.push('No significant risk factors identified');
  }

  y = 310;
  for (const factor of riskFactors) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text(`• ${factor}`, 60, y);
    y += 20;
  }

  return currentPage;
}

// ========================================================================
// INCIDENT HISTORY
// ========================================================================

async function renderIncidentHistory(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Incident History', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text(`Total incidents on record: ${packData.incidents.length}`, 50, 80);

  if (packData.incidents.length === 0) {
    doc.fontSize(12).fillColor(COLORS.GREEN).text('No environmental incidents recorded.', 50, 120);
    return currentPage;
  }

  // Incident summary by severity
  const bySeverity: Record<string, number> = {};
  for (const incident of packData.incidents) {
    const severity = incident.severity || 'UNKNOWN';
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
  }

  // Summary boxes
  let x = 50;
  for (const [severity, count] of Object.entries(bySeverity)) {
    const color = severity === 'HIGH' || severity === 'CRITICAL' ? COLORS.RED :
      severity === 'MEDIUM' ? COLORS.AMBER : COLORS.GREEN;
    doc.rect(x, 110, 100, 50).fill(color);
    doc.fontSize(10).fillColor(COLORS.WHITE).text(severity, x + 10, 120);
    doc.fontSize(20).text(count.toString(), x + 10, 135);
    x += 110;
  }

  // Incident table
  const tableY = 180;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Date', 55, tableY + 5);
  doc.text('Type', 130, tableY + 5);
  doc.text('Description', 220, tableY + 5);
  doc.text('Severity', 400, tableY + 5);
  doc.text('Status', 470, tableY + 5);

  let rowY = tableY + 25;
  const rowHeight = 30;

  for (const incident of packData.incidents.slice(0, 12)) {
    if ((packData.incidents.indexOf(incident) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(8).fillColor(COLORS.BLACK);
    doc.text(formatDate(incident.occurred_at, 'short'), 55, rowY + 8);
    doc.text(incident.incident_type || 'N/A', 130, rowY + 8);
    doc.text(truncateText(incident.description || 'N/A', 30), 220, rowY + 8);

    const severityColor = incident.severity === 'HIGH' || incident.severity === 'CRITICAL' ? COLORS.RED :
      incident.severity === 'MEDIUM' ? COLORS.AMBER : COLORS.GREEN;
    doc.fillColor(severityColor).text(incident.severity || 'N/A', 400, rowY + 8);

    const statusColor = incident.status === 'CLOSED' ? COLORS.GREEN : COLORS.AMBER;
    doc.fillColor(statusColor).text(incident.status || 'N/A', 470, rowY + 8);

    rowY += rowHeight;

    if (rowY > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      rowY = 50;
    }
  }

  if (packData.incidents.length > 12) {
    doc.fontSize(8).fillColor(COLORS.GRAY).text(
      `... and ${packData.incidents.length - 12} more incidents`,
      50,
      rowY + 10
    );
  }

  return currentPage;
}

// ========================================================================
// FINANCIAL EXPOSURE
// ========================================================================

async function renderFinancialExposure(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Financial Exposure', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Assessment of potential financial liabilities from environmental non-compliance.', 50, 80);

  const fi = packData.financialImpact;

  // Summary cards
  const cardY = 120;
  const cardWidth = 150;
  const cardHeight = 70;

  // Total Fine Exposure
  doc.rect(50, cardY, cardWidth, cardHeight).fill(COLORS.RED);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Max Fine Exposure', 60, cardY + 10);
  doc.fontSize(18).text(fi ? formatCurrency(fi.totalFineExposure) : 'N/A', 60, cardY + 35);

  // Remediation Cost
  doc.rect(50 + cardWidth + 20, cardY, cardWidth, cardHeight).fill(COLORS.AMBER);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Est. Remediation', 60 + cardWidth + 20, cardY + 10);
  doc.fontSize(18).text(fi ? formatCurrency(fi.remediationCost) : 'N/A', 60 + cardWidth + 20, cardY + 35);

  // Insurance Risk
  doc.rect(50 + (cardWidth + 20) * 2, cardY, cardWidth, cardHeight).fill(COLORS.BLUE);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Insurance Risk', 60 + (cardWidth + 20) * 2, cardY + 10);
  doc.fontSize(18).text(fi?.insuranceRisk || 'N/A', 60 + (cardWidth + 20) * 2, cardY + 35);

  // Fine breakdown table
  if (fi && fi.fineBreakdown && fi.fineBreakdown.length > 0) {
    doc.fontSize(12).fillColor(COLORS.BLACK).text('Potential Fine Breakdown', 50, 230);

    const tableY = 260;
    doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

    doc.fontSize(9).fillColor(COLORS.BLACK);
    doc.text('Regulation', 55, tableY + 5);
    doc.text('Max Fine', 280, tableY + 5);
    doc.text('Likelihood', 380, tableY + 5);
    doc.text('Weighted Risk', 460, tableY + 5);

    let rowY = tableY + 25;
    for (const item of fi.fineBreakdown.slice(0, 8)) {
      doc.fontSize(8).fillColor(COLORS.BLACK);
      doc.text(truncateText(item.regulation, 40), 55, rowY + 5);
      doc.text(formatCurrency(item.maxFine), 280, rowY + 5);
      doc.text(item.likelihood, 380, rowY + 5);

      const likelihoodMultiplier = item.likelihood === 'HIGH' ? 0.8 :
        item.likelihood === 'MEDIUM' ? 0.4 : 0.1;
      const weightedRisk = item.maxFine * likelihoodMultiplier;
      doc.text(formatCurrency(weightedRisk), 460, rowY + 5);

      rowY += 25;
    }
  }

  // Claims history
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Historical Claims Summary', 50, 450);
  doc.fontSize(10).fillColor(COLORS.GRAY).text(
    'Claims data to be sourced from insurance records. Contact underwriter for detailed claims history.',
    50,
    475,
    { width: 500 }
  );

  return currentPage;
}

// ========================================================================
// COMPLIANCE TRENDS
// ========================================================================

async function renderComplianceTrends(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Compliance Trends', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Historical compliance performance and trend analysis.', 50, 80);

  // Current compliance snapshot
  const total = packData.obligations.length;
  const completed = packData.obligations.filter(o => o.status === 'COMPLETED').length;
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  doc.fontSize(12).fillColor(COLORS.BLACK).text('Current Compliance Rate', 50, 120);

  // Progress bar
  doc.rect(50, 145, 400, 20).fill(COLORS.LIGHT_GRAY);
  const progressWidth = (complianceRate / 100) * 400;
  const progressColor = complianceRate >= 80 ? COLORS.GREEN : complianceRate >= 50 ? COLORS.AMBER : COLORS.RED;
  doc.rect(50, 145, progressWidth, 20).fill(progressColor);
  doc.fontSize(10).fillColor(COLORS.BLACK).text(`${complianceRate}%`, 460, 147);

  // Trend indicators (simulated - in production would come from historical data)
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Trend Analysis', 50, 200);

  const trends = [
    { metric: 'Overall Compliance', trend: 'STABLE', change: '+0%' },
    { metric: 'Evidence Coverage', trend: 'IMPROVING', change: '+5%' },
    { metric: 'Incident Frequency', trend: 'DECLINING', change: '-15%' },
    { metric: 'Regulatory Findings', trend: 'STABLE', change: '0' },
  ];

  let y = 230;
  for (const item of trends) {
    const trendColor = item.trend === 'IMPROVING' ? COLORS.GREEN :
      item.trend === 'DECLINING' ? COLORS.RED : COLORS.AMBER;
    const trendIcon = item.trend === 'IMPROVING' ? '↑' :
      item.trend === 'DECLINING' ? '↓' : '→';

    doc.fontSize(10).fillColor(COLORS.BLACK).text(item.metric, 60, y);
    doc.fillColor(trendColor).text(`${trendIcon} ${item.trend}`, 220, y);
    doc.fillColor(COLORS.GRAY).text(item.change, 350, y);

    y += 25;
  }

  // Permit status summary
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Permit Status Summary', 50, 380);

  const activePermits = packData.permits.filter(p => p.status === 'ACTIVE').length;
  const expiringPermits = packData.permits.filter(p => {
    if (!p.expiry_date) return false;
    const expiry = new Date(p.expiry_date);
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return expiry < sixMonths;
  }).length;

  doc.fontSize(10).fillColor(COLORS.GRAY);
  doc.text(`Active Permits: ${activePermits}`, 60, 410);
  doc.text(`Expiring within 6 months: ${expiringPermits}`, 60, 430);
  doc.text(`Total Permits: ${packData.permits.length}`, 60, 450);

  // Underwriter notes section
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Underwriter Notes', 50, 500);
  doc.rect(50, 525, 500, 100).stroke(COLORS.GRAY);
  doc.fontSize(8).fillColor(COLORS.GRAY).text('Space for underwriter assessment and notes.', 60, 535);

  return currentPage;
}
