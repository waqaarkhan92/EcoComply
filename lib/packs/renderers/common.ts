/**
 * Common Pack Renderers
 * Shared rendering functions for all pack types:
 * - Cover Page
 * - Table of Contents
 * - Executive Summary
 * - Pack Provenance
 */

import type PDFKit from 'pdfkit';
import type { PackType, PackData, PackRecord, Section, ComplianceScorecard } from '../types';
import {
  COLORS,
  getPackTypeName,
  getPackTypeBadgeColor,
  getCCSBandColor,
  getRAGColor,
  getTrendIcon,
  formatDate,
  formatPercentage,
  renderMetricCard,
  renderProgressBar,
} from '../utils';

// ========================================================================
// COVER PAGE
// ========================================================================

export async function renderCoverPage(
  doc: PDFKit.PDFDocument,
  packType: PackType,
  packData: PackData,
  pack: PackRecord
): Promise<void> {
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
  doc.fontSize(12).fillColor(COLORS.GRAY).text(`Generated: ${formatDate(new Date())}`, 50, 400, { align: 'center' });

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

// ========================================================================
// TABLE OF CONTENTS
// ========================================================================

export async function renderTableOfContents(
  doc: PDFKit.PDFDocument,
  sections: Section[]
): Promise<void> {
  doc.fontSize(24).fillColor(COLORS.BLACK).text('Table of Contents', 50, 80);

  let yPosition = 140;
  const lineHeight = 25;

  for (const section of sections) {
    // Section title
    doc.fontSize(12).fillColor(COLORS.BLACK).text(section.title, 60, yPosition);

    // Dotted line
    const titleWidth = doc.widthOfString(section.title) + 70;
    const pageNumX = doc.page.width - 100;
    const dotsStart = titleWidth;
    const dotsEnd = pageNumX - 10;

    // Draw dots
    let x = dotsStart;
    while (x < dotsEnd) {
      doc.fillColor(COLORS.GRAY).text('.', x, yPosition);
      x += 5;
    }

    // Page number
    doc.fillColor(COLORS.BLACK).text(section.page.toString(), pageNumX, yPosition, { align: 'right', width: 40 });

    yPosition += lineHeight;

    // Handle page break if needed
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = 80;
    }
  }
}

// ========================================================================
// EXECUTIVE SUMMARY (RAG Dashboard)
// ========================================================================

export async function renderExecutiveSummary(
  doc: PDFKit.PDFDocument,
  packType: PackType,
  packData: PackData
): Promise<void> {
  doc.fontSize(24).fillColor(COLORS.BLACK).text('Executive Summary', 50, 50);

  // Calculate scorecard data if not already present
  const scorecard = packData.scorecard || await calculateDefaultScorecard(packData);

  // ========================================================================
  // COMPLIANCE SCORE (Large, Central)
  // ========================================================================
  const scoreY = 100;
  const scoreSize = 120;
  const scoreX = doc.page.width / 2 - scoreSize / 2;

  // Score circle background
  const scoreColor = getRAGColor(scorecard.ragStatus);
  doc.circle(scoreX + scoreSize / 2, scoreY + scoreSize / 2, scoreSize / 2).fill(scoreColor);

  // Score number
  doc.fontSize(48).fillColor(COLORS.WHITE).text(
    scorecard.score.toString(),
    scoreX,
    scoreY + 30,
    { width: scoreSize, align: 'center' }
  );

  // Score label
  doc.fontSize(12).text('Compliance Score', scoreX, scoreY + 85, { width: scoreSize, align: 'center' });

  // RAG Status label
  doc.fontSize(14).fillColor(COLORS.BLACK).text(
    `Status: ${scorecard.ragStatus}`,
    50,
    scoreY + scoreSize + 20,
    { align: 'center' }
  );

  // Trend indicator
  const trendIcon = getTrendIcon(scorecard.trend);
  doc.text(`Trend: ${trendIcon} ${scorecard.trend}`, 50, scoreY + scoreSize + 40, { align: 'center' });

  // ========================================================================
  // METRICS CARDS
  // ========================================================================
  const metricsY = 300;
  const cardWidth = 150;
  const cardGap = 20;
  const startX = 50;

  // Total Obligations
  renderMetricCard(doc, startX, metricsY, cardWidth, 'Total Obligations',
    scorecard.obligationStats.total.toString(), COLORS.BLUE);

  // Completed
  renderMetricCard(doc, startX + cardWidth + cardGap, metricsY, cardWidth, 'Completed',
    scorecard.obligationStats.completed.toString(), COLORS.GREEN);

  // Overdue
  renderMetricCard(doc, startX + (cardWidth + cardGap) * 2, metricsY, cardWidth, 'Overdue',
    scorecard.obligationStats.overdue.toString(), COLORS.RED);

  // ========================================================================
  // EVIDENCE COVERAGE
  // ========================================================================
  const coverageY = 400;
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Evidence Coverage', 50, coverageY);
  renderProgressBar(doc, 50, coverageY + 20, 400, '', scorecard.evidenceCoverage);

  // ========================================================================
  // TOP ACTIONS
  // ========================================================================
  const actionsY = 470;
  doc.fontSize(14).fillColor(COLORS.BLACK).text('Top Priority Actions', 50, actionsY);

  let actionY = actionsY + 25;
  for (const action of scorecard.topActions.slice(0, 5)) {
    const urgencyColor = action.urgency === 'CRITICAL' ? COLORS.RED :
      action.urgency === 'HIGH' ? COLORS.AMBER : COLORS.BLUE;

    // Urgency indicator
    doc.circle(60, actionY + 5, 4).fill(urgencyColor);

    // Action title
    doc.fontSize(10).fillColor(COLORS.BLACK).text(
      action.title,
      75,
      actionY,
      { width: 350, ellipsis: true }
    );

    // Deadline
    if (action.deadline) {
      doc.fontSize(8).fillColor(COLORS.GRAY).text(
        `Due: ${formatDate(action.deadline, 'short')}`,
        440,
        actionY
      );
    }

    actionY += 20;
  }

  // ========================================================================
  // PACK-TYPE SPECIFIC SUMMARY
  // ========================================================================
  const specificY = 620;

  switch (packType) {
    case 'REGULATOR_INSPECTION':
      if (packData.ccsAssessment) {
        doc.fontSize(12).fillColor(COLORS.BLACK).text('CCS Assessment', 50, specificY);
        doc.fontSize(10).fillColor(COLORS.GRAY).text(
          `Band: ${packData.ccsAssessment.compliance_band} | Year: ${packData.ccsAssessment.assessment_year}`,
          50,
          specificY + 20
        );
      }
      break;

    case 'BOARD_MULTI_SITE_RISK':
      if (packData.sites) {
        doc.fontSize(12).fillColor(COLORS.BLACK).text('Sites Overview', 50, specificY);
        doc.fontSize(10).fillColor(COLORS.GRAY).text(
          `${packData.sites.length} sites included in this report`,
          50,
          specificY + 20
        );
      }
      break;

    case 'INSURER_BROKER':
      doc.fontSize(12).fillColor(COLORS.BLACK).text('Incident Summary', 50, specificY);
      doc.fontSize(10).fillColor(COLORS.GRAY).text(
        `${packData.incidents.length} incidents on record`,
        50,
        specificY + 20
      );
      break;
  }
}

// ========================================================================
// PACK PROVENANCE
// ========================================================================

export async function renderProvenance(
  doc: PDFKit.PDFDocument,
  packType: PackType,
  packData: PackData,
  pack: PackRecord
): Promise<void> {
  doc.fontSize(24).fillColor(COLORS.BLACK).text('Pack Provenance', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY).text(
    'This section provides transparency about how this pack was generated.',
    50,
    80,
    { width: 500 }
  );

  const boxY = 120;
  doc.rect(50, boxY, 500, 300).stroke(COLORS.GRAY);

  let y = boxY + 20;
  const labelX = 60;
  const valueX = 200;
  const lineHeight = 25;

  // Pack Details
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Pack Details', labelX, y);
  y += lineHeight;

  const details = [
    ['Pack ID', pack.id],
    ['Pack Type', getPackTypeName(packType)],
    ['Company', packData.company?.name || 'N/A'],
    ['Site', packData.site?.name || 'Multiple Sites'],
    ['Generated At', formatDate(pack.generated_at || new Date())],
    ['Generated By', pack.generated_by || 'System'],
    ['Reporting Period', `${packData.dateRange.start} to ${packData.dateRange.end}`],
  ];

  for (const [label, value] of details) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text(label, labelX, y);
    doc.fillColor(COLORS.BLACK).text(value, valueX, y);
    y += lineHeight;
  }

  // Data Sources
  y += 10;
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Data Sources', labelX, y);
  y += lineHeight;

  const sources = [
    ['Obligations', packData.obligations.length.toString()],
    ['Evidence Items', packData.evidence.length.toString()],
    ['Incidents', packData.incidents.length.toString()],
    ['Permits', packData.permits.length.toString()],
  ];

  for (const [label, count] of sources) {
    doc.fontSize(10).fillColor(COLORS.GRAY).text(label, labelX, y);
    doc.fillColor(COLORS.BLACK).text(count, valueX, y);
    y += lineHeight;
  }

  // Footer disclaimer
  doc.fontSize(8).fillColor(COLORS.GRAY).text(
    'This pack was automatically generated by EcoComply. Data reflects the state at the time of generation.',
    50,
    doc.page.height - 80,
    { width: 500, align: 'center' }
  );

  doc.text(
    `© ${new Date().getFullYear()} EcoComply - Environmental Compliance Management`,
    50,
    doc.page.height - 60,
    { width: 500, align: 'center' }
  );
}

// ========================================================================
// HELPER: Calculate Default Scorecard
// ========================================================================

async function calculateDefaultScorecard(packData: PackData): Promise<ComplianceScorecard> {
  const total = packData.obligations.length;
  const completed = packData.obligations.filter(o => o.status === 'COMPLETED').length;
  const overdue = packData.obligations.filter(o => o.status === 'OVERDUE').length;
  const withEvidence = packData.obligations.filter(o => (o.evidence_count || 0) > 0).length;

  const score = total > 0
    ? Math.round(((completed - overdue * 2) / total) * 100)
    : 0;
  const clampedScore = Math.max(0, Math.min(100, score));

  const ragStatus: 'RED' | 'AMBER' | 'GREEN' =
    clampedScore >= 80 ? 'GREEN' :
    clampedScore >= 50 ? 'AMBER' : 'RED';

  const evidenceCoverage = total > 0 ? (withEvidence / total) * 100 : 0;

  // Generate top actions from overdue obligations
  const topActions = packData.obligations
    .filter(o => o.status === 'OVERDUE' || o.status === 'PENDING')
    .slice(0, 5)
    .map(o => ({
      id: o.id,
      title: o.obligation_title || o.original_text?.substring(0, 80) || 'Obligation',
      deadline: o.deadline_date,
      urgency: o.status === 'OVERDUE' ? 'CRITICAL' : 'HIGH',
    }));

  return {
    score: clampedScore,
    ragStatus,
    trend: 'STABLE',
    topActions,
    evidenceCoverage,
    obligationStats: {
      total,
      completed,
      overdue,
    },
  };
}
