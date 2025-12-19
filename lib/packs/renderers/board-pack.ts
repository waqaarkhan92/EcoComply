/**
 * Board Multi-Site Risk Pack Renderer
 * Executive summary with multi-site risk matrix
 */

import type PDFKit from 'pdfkit';
import type { PackData, PackRecord, Section } from '../types';
import { COLORS, formatDate, formatCurrency, generateBoardRecommendations, getStatusColor, truncateText } from '../utils';

export async function renderBoardPack(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
): Promise<number> {
  // Multi-Site Risk Matrix
  sections.push({ title: 'Multi-Site Risk Matrix', page: currentPage });
  currentPage = await renderRiskMatrix(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Site Comparisons
  sections.push({ title: 'Site Comparisons', page: currentPage });
  currentPage = await renderSiteComparisons(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Financial Summary
  sections.push({ title: 'Financial Summary', page: currentPage });
  currentPage = await renderFinancialSummary(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Board Recommendations
  sections.push({ title: 'Board Recommendations', page: currentPage });
  currentPage = await renderRecommendations(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Incident History
  if (packData.incidents.length > 0) {
    sections.push({ title: 'Incident History', page: currentPage });
    currentPage = await renderIncidentHistory(doc, packData, currentPage);
  }

  return currentPage;
}

// ========================================================================
// RISK MATRIX
// ========================================================================

async function renderRiskMatrix(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Multi-Site Risk Matrix', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Risk assessment across all sites in the portfolio.', 50, 80);

  // Risk matrix grid
  const matrixX = 100;
  const matrixY = 130;
  const cellSize = 80;

  // Draw matrix background
  // High severity row
  doc.rect(matrixX, matrixY, cellSize, cellSize).fill('#FFCDD2');
  doc.rect(matrixX + cellSize, matrixY, cellSize, cellSize).fill('#EF9A9A');
  doc.rect(matrixX + cellSize * 2, matrixY, cellSize, cellSize).fill('#F44336');

  // Medium severity row
  doc.rect(matrixX, matrixY + cellSize, cellSize, cellSize).fill('#FFF9C4');
  doc.rect(matrixX + cellSize, matrixY + cellSize, cellSize, cellSize).fill('#FFEB3B');
  doc.rect(matrixX + cellSize * 2, matrixY + cellSize, cellSize, cellSize).fill('#FFC107');

  // Low severity row
  doc.rect(matrixX, matrixY + cellSize * 2, cellSize, cellSize).fill('#C8E6C9');
  doc.rect(matrixX + cellSize, matrixY + cellSize * 2, cellSize, cellSize).fill('#81C784');
  doc.rect(matrixX + cellSize * 2, matrixY + cellSize * 2, cellSize, cellSize).fill('#4CAF50');

  // Labels
  doc.fontSize(10).fillColor(COLORS.BLACK);

  // Severity labels (Y axis)
  doc.text('High', 60, matrixY + 35);
  doc.text('Medium', 50, matrixY + cellSize + 35);
  doc.text('Low', 65, matrixY + cellSize * 2 + 35);

  // Likelihood labels (X axis)
  doc.text('Low', matrixX + 30, matrixY + cellSize * 3 + 10);
  doc.text('Medium', matrixX + cellSize + 20, matrixY + cellSize * 3 + 10);
  doc.text('High', matrixX + cellSize * 2 + 30, matrixY + cellSize * 3 + 10);

  // Axis titles
  doc.fontSize(12).fillColor(COLORS.BLACK);
  doc.text('SEVERITY', 10, matrixY + cellSize);
  doc.text('LIKELIHOOD', matrixX + cellSize, matrixY + cellSize * 3 + 30);

  // Site counts in matrix (simplified)
  const sites = packData.sites || [];
  const riskCounts = calculateRiskDistribution(packData);

  doc.fontSize(20).fillColor(COLORS.WHITE);
  doc.text(riskCounts.highHigh.toString(), matrixX + cellSize * 2 + 30, matrixY + 25);
  doc.text(riskCounts.highMed.toString(), matrixX + cellSize + 30, matrixY + 25);
  doc.text(riskCounts.medHigh.toString(), matrixX + cellSize * 2 + 30, matrixY + cellSize + 25);

  doc.fillColor(COLORS.BLACK);
  doc.text(riskCounts.lowLow.toString(), matrixX + 30, matrixY + cellSize * 2 + 25);

  // Legend
  doc.fontSize(10).fillColor(COLORS.BLACK).text('Risk Legend', 400, 130);

  const legend = [
    { color: '#F44336', label: 'Critical Risk' },
    { color: '#FFC107', label: 'Moderate Risk' },
    { color: '#4CAF50', label: 'Low Risk' },
  ];

  let legendY = 155;
  for (const item of legend) {
    doc.rect(400, legendY, 15, 15).fill(item.color);
    doc.fontSize(9).fillColor(COLORS.BLACK).text(item.label, 420, legendY + 2);
    legendY += 25;
  }

  return currentPage;
}

// ========================================================================
// SITE COMPARISONS
// ========================================================================

async function renderSiteComparisons(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Site Comparisons', 50, 50);

  const sites = packData.sites || [];

  if (sites.length === 0) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text('No multi-site data available.', 50, 100);
    return currentPage;
  }

  // Table header
  const tableY = 90;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Site', 55, tableY + 5);
  doc.text('Type', 180, tableY + 5);
  doc.text('Obligations', 280, tableY + 5);
  doc.text('Overdue', 360, tableY + 5);
  doc.text('Risk Level', 430, tableY + 5);

  let rowY = tableY + 25;
  const rowHeight = 30;

  // Group obligations by site
  const siteStats: Record<string, { total: number; overdue: number }> = {};
  for (const obl of packData.obligations) {
    const siteId = obl.sites?.id || 'unknown';
    if (!siteStats[siteId]) {
      siteStats[siteId] = { total: 0, overdue: 0 };
    }
    siteStats[siteId].total++;
    if (obl.status === 'OVERDUE') {
      siteStats[siteId].overdue++;
    }
  }

  for (const site of sites) {
    const stats = siteStats[site.id] || { total: 0, overdue: 0 };
    const riskLevel = stats.overdue > 5 ? 'HIGH' : stats.overdue > 2 ? 'MEDIUM' : 'LOW';
    const riskColor = riskLevel === 'HIGH' ? COLORS.RED : riskLevel === 'MEDIUM' ? COLORS.AMBER : COLORS.GREEN;

    if ((sites.indexOf(site) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(9).fillColor(COLORS.BLACK);
    doc.text(truncateText(site.name, 25), 55, rowY + 8);
    doc.text(site.site_type || 'N/A', 180, rowY + 8);
    doc.text(stats.total.toString(), 280, rowY + 8);

    doc.fillColor(stats.overdue > 0 ? COLORS.RED : COLORS.BLACK);
    doc.text(stats.overdue.toString(), 360, rowY + 8);

    doc.rect(430, rowY + 5, 60, 15).fill(riskColor);
    doc.fontSize(8).fillColor(COLORS.WHITE).text(riskLevel, 435, rowY + 8);

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
// FINANCIAL SUMMARY
// ========================================================================

async function renderFinancialSummary(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Financial Summary', 50, 50);

  const fi = packData.financialImpact;

  // Key metrics
  const metricsY = 100;
  const cardWidth = 150;
  const cardHeight = 80;

  // Total Fine Exposure
  doc.rect(50, metricsY, cardWidth, cardHeight).fill(COLORS.RED);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Total Fine Exposure', 60, metricsY + 10);
  doc.fontSize(20).text(formatCurrency(fi?.totalFineExposure || 0), 60, metricsY + 35);

  // Remediation Cost
  doc.rect(50 + cardWidth + 20, metricsY, cardWidth, cardHeight).fill(COLORS.AMBER);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Remediation Cost', 60 + cardWidth + 20, metricsY + 10);
  doc.fontSize(20).text(formatCurrency(fi?.remediationCost || 0), 60 + cardWidth + 20, metricsY + 35);

  // Total Risk
  const totalRisk = (fi?.totalFineExposure || 0) + (fi?.remediationCost || 0);
  doc.rect(50 + (cardWidth + 20) * 2, metricsY, cardWidth, cardHeight).fill(COLORS.TEAL);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Total Risk Exposure', 60 + (cardWidth + 20) * 2, metricsY + 10);
  doc.fontSize(20).text(formatCurrency(totalRisk), 60 + (cardWidth + 20) * 2, metricsY + 35);

  // Commentary
  doc.fontSize(10).fillColor(COLORS.GRAY).text(
    'Financial impact assessment based on current compliance status and regulatory fine schedules.',
    50,
    metricsY + cardHeight + 30,
    { width: 500 }
  );

  return currentPage;
}

// ========================================================================
// RECOMMENDATIONS
// ========================================================================

async function renderRecommendations(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Board Recommendations', 50, 50);

  const recommendations = generateBoardRecommendations(packData);

  let y = 100;
  let index = 1;

  for (const rec of recommendations) {
    // Priority number
    doc.circle(60, y + 8, 12).fill(COLORS.TEAL);
    doc.fontSize(12).fillColor(COLORS.WHITE).text(index.toString(), 55, y + 3);

    // Recommendation text
    doc.fontSize(11).fillColor(COLORS.BLACK).text(rec, 85, y, { width: 450 });

    y += 50;
    index++;

    if (y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      y = 50;
    }
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
  doc.fontSize(10).fillColor(COLORS.GRAY).text(`Total Incidents: ${packData.incidents.length}`, 50, 80);

  // Table
  const tableY = 110;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Date', 55, tableY + 5);
  doc.text('Type', 120, tableY + 5);
  doc.text('Severity', 230, tableY + 5);
  doc.text('Description', 310, tableY + 5);

  let rowY = tableY + 25;
  const rowHeight = 30;

  for (const incident of packData.incidents.slice(0, 20)) {
    if ((packData.incidents.indexOf(incident) % 2) === 0) {
      doc.rect(50, rowY, 500, rowHeight).fill('#FAFAFA');
    }

    doc.fontSize(8).fillColor(COLORS.BLACK);
    doc.text(formatDate(incident.occurred_at, 'short'), 55, rowY + 8);
    doc.text(incident.incident_type, 120, rowY + 8);

    const severityColor = getStatusColor(incident.severity || 'MEDIUM');
    doc.fillColor(severityColor).text(incident.severity || 'N/A', 230, rowY + 8);

    doc.fillColor(COLORS.BLACK).text(truncateText(incident.description || 'N/A', 35), 310, rowY + 8);

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

function calculateRiskDistribution(packData: PackData): Record<string, number> {
  const sites = packData.sites || [];
  const counts = {
    highHigh: 0,
    highMed: 0,
    highLow: 0,
    medHigh: 0,
    medMed: 0,
    medLow: 0,
    lowHigh: 0,
    lowMed: 0,
    lowLow: 0,
  };

  // Simplified risk calculation based on overdue obligations
  for (const site of sites) {
    const siteObligations = packData.obligations.filter(o => o.sites?.id === site.id);
    const overdue = siteObligations.filter(o => o.status === 'OVERDUE').length;
    const total = siteObligations.length;

    const severity = overdue > 5 ? 'high' : overdue > 2 ? 'med' : 'low';
    const likelihood = total > 20 ? 'High' : total > 10 ? 'Med' : 'Low';

    const key = `${severity}${likelihood}` as keyof typeof counts;
    counts[key]++;
  }

  return counts;
}
