/**
 * Pack Generation Utilities
 * Shared constants and helper functions
 */

import type { PackType, PackData, Section, WatermarkOptions } from './types';
import type PDFKit from 'pdfkit';

// ========================================================================
// COLOR CONSTANTS
// ========================================================================

export const COLORS = {
  RED: '#DC2626',
  AMBER: '#F59E0B',
  GREEN: '#16A34A',
  BLUE: '#2563EB',
  GRAY: '#6B7280',
  BLACK: '#1F2937',
  WHITE: '#FFFFFF',
  LIGHT_GRAY: '#F3F4F6',
  DARK_GRAY: '#374151',
  TEAL: '#026A67',
} as const;

// CCS Band Colors
export const CCS_BAND_COLORS: Record<string, string> = {
  A: '#16A34A',  // Green
  B: '#84CC16',  // Light Green
  C: '#F59E0B',  // Amber
  D: '#F97316',  // Orange
  E: '#EF4444',  // Red
  F: '#991B1B',  // Dark Red
};

// Pack Type Badge Colors
export const PACK_TYPE_COLORS: Record<string, string> = {
  AUDIT_PACK: COLORS.BLUE,
  REGULATOR_INSPECTION: COLORS.GREEN,
  TENDER_CLIENT_ASSURANCE: COLORS.TEAL,
  BOARD_MULTI_SITE_RISK: '#7C3AED',  // Purple
  INSURER_BROKER: '#DC2626',  // Red
};

// ========================================================================
// PACK TYPE HELPERS
// ========================================================================

export function getPackTypeName(packType: string): string {
  switch (packType) {
    case 'AUDIT_PACK':
      return 'Internal Audit Pack';
    case 'REGULATOR_INSPECTION':
      return 'Regulator Inspection Pack';
    case 'TENDER_CLIENT_ASSURANCE':
      return 'Client Assurance Pack';
    case 'BOARD_MULTI_SITE_RISK':
      return 'Board Risk Report';
    case 'INSURER_BROKER':
      return 'Insurance Pack';
    default:
      return 'Compliance Pack';
  }
}

export function getPackTypeBadgeColor(packType: string): string {
  return PACK_TYPE_COLORS[packType] || COLORS.BLUE;
}

export function getCCSBandColor(band: string | null): string {
  if (!band) return COLORS.GRAY;
  return CCS_BAND_COLORS[band.toUpperCase()] || COLORS.GRAY;
}

// ========================================================================
// COMPLIANCE STATUS HELPERS
// ========================================================================

export function getRAGColor(ragStatus: 'RED' | 'AMBER' | 'GREEN'): string {
  switch (ragStatus) {
    case 'RED':
      return COLORS.RED;
    case 'AMBER':
      return COLORS.AMBER;
    case 'GREEN':
      return COLORS.GREEN;
    default:
      return COLORS.GRAY;
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'COMPLIANT':
    case 'GREEN':
      return COLORS.GREEN;
    case 'OVERDUE':
    case 'BREACHED':
    case 'RED':
      return COLORS.RED;
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'AMBER':
      return COLORS.AMBER;
    default:
      return COLORS.GRAY;
  }
}

export function getTrendIcon(trend: 'IMPROVING' | 'STABLE' | 'DECLINING'): string {
  switch (trend) {
    case 'IMPROVING':
      return '↑';
    case 'DECLINING':
      return '↓';
    default:
      return '→';
  }
}

// ========================================================================
// PDF HELPERS
// ========================================================================

export function addSection(sections: Section[], title: string, page: number): void {
  sections.push({ title, page });
}

export function formatDate(date: string | Date | undefined, format: 'short' | 'long' = 'long'): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  if (format === 'short') {
    return d.toLocaleDateString('en-GB');
  }

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ========================================================================
// WATERMARK HELPERS
// ========================================================================

export function applyWatermark(
  doc: PDFKit.PDFDocument,
  options: WatermarkOptions
): void {
  if (!options.enabled) return;

  const {
    text = 'CONFIDENTIAL',
    recipientName,
    expirationDate,
    opacity = 0.1,
    angle = -45,
    fontSize = 48,
    color = '#CCCCCC',
  } = options;

  // Build watermark text
  let watermarkText = text;
  if (recipientName) {
    watermarkText = `${text} - ${recipientName}`;
  }
  if (expirationDate) {
    watermarkText += `\nExpires: ${expirationDate}`;
  }

  // Save graphics state
  doc.save();

  // Set opacity
  doc.opacity(opacity);

  // Calculate center of page
  const centerX = doc.page.width / 2;
  const centerY = doc.page.height / 2;

  // Rotate and position
  doc.rotate(angle, { origin: [centerX, centerY] });

  // Draw watermark text
  doc
    .fontSize(fontSize)
    .fillColor(color)
    .text(watermarkText, centerX - 200, centerY - 20, {
      width: 400,
      align: 'center',
    });

  // Restore graphics state
  doc.restore();
}

export function applyWatermarkToAllPages(
  doc: PDFKit.PDFDocument,
  options: WatermarkOptions
): void {
  if (!options.enabled) return;

  // Apply watermark to each buffered page
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    applyWatermark(doc, options);
  }
}

// ========================================================================
// TABLE OF CONTENTS HELPERS
// ========================================================================

export function getExpectedSections(packType: PackType, packData: PackData): Section[] {
  const baseSections: Section[] = [
    { title: 'Cover Page', page: 1 },
    { title: 'Table of Contents', page: 2 },
    { title: 'Executive Summary', page: 3 },
  ];

  let typeSections: Section[] = [];
  let pageOffset = 4;

  switch (packType) {
    case 'REGULATOR_INSPECTION':
      typeSections = [
        { title: 'Permit Conditions', page: pageOffset++ },
        { title: 'CCS Assessment', page: pageOffset++ },
        { title: 'ELV Headroom Analysis', page: pageOffset++ },
        { title: 'Financial Impact', page: pageOffset++ },
        { title: 'Obligations Summary', page: pageOffset++ },
        { title: 'Evidence Inventory', page: pageOffset++ },
      ];
      break;

    case 'BOARD_MULTI_SITE_RISK':
      typeSections = [
        { title: 'Multi-Site Risk Matrix', page: pageOffset++ },
        { title: 'Site Comparisons', page: pageOffset++ },
        { title: 'Financial Summary', page: pageOffset++ },
        { title: 'Board Recommendations', page: pageOffset++ },
        { title: 'Incident History', page: pageOffset++ },
      ];
      break;

    case 'TENDER_CLIENT_ASSURANCE':
      typeSections = [
        { title: 'Permit Status', page: pageOffset++ },
        { title: 'Compliance Assessment', page: pageOffset++ },
        { title: 'Environmental Commitments', page: pageOffset++ },
        { title: 'Certifications', page: pageOffset++ },
      ];
      break;

    case 'INSURER_BROKER':
      typeSections = [
        { title: 'Risk Overview', page: pageOffset++ },
        { title: 'Incident History', page: pageOffset++ },
        { title: 'Financial Exposure', page: pageOffset++ },
        { title: 'Compliance Trends', page: pageOffset++ },
      ];
      break;

    default: // AUDIT_PACK
      typeSections = [
        { title: 'Obligations', page: pageOffset++ },
        { title: 'Evidence', page: pageOffset++ },
        { title: 'Compliance Clock', page: pageOffset++ },
        { title: 'Change History', page: pageOffset++ },
      ];
  }

  return [
    ...baseSections,
    ...typeSections,
    { title: 'Pack Provenance', page: pageOffset },
  ];
}

// ========================================================================
// METRIC RENDERING HELPERS
// ========================================================================

export function renderMetricCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  color: string
): void {
  doc.rect(x, y, width, 60).fill(COLORS.LIGHT_GRAY);
  doc.fontSize(10).fillColor(COLORS.GRAY).text(label, x + 10, y + 10);
  doc.fontSize(20).fillColor(color).text(value, x + 10, y + 30);
}

export function renderProgressBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  percentage: number
): void {
  // Label
  doc.fontSize(10).fillColor(COLORS.BLACK).text(label, x, y);

  // Background bar
  doc.rect(x, y + 15, width, 10).fill(COLORS.LIGHT_GRAY);

  // Progress bar
  const progressWidth = (percentage / 100) * width;
  const progressColor = percentage >= 80 ? COLORS.GREEN : percentage >= 50 ? COLORS.AMBER : COLORS.RED;
  doc.rect(x, y + 15, progressWidth, 10).fill(progressColor);

  // Percentage text
  doc.fontSize(8).fillColor(COLORS.BLACK).text(`${percentage.toFixed(0)}%`, x + width + 5, y + 15);
}

// ========================================================================
// BOARD RECOMMENDATIONS GENERATOR
// ========================================================================

export function generateBoardRecommendations(packData: PackData): string[] {
  const recommendations: string[] = [];

  // Check overdue obligations
  const overdueCount = packData.obligations.filter(o => o.status === 'OVERDUE').length;
  if (overdueCount > 0) {
    recommendations.push(`Address ${overdueCount} overdue obligation(s) immediately to reduce regulatory risk.`);
  }

  // Check evidence coverage
  const obligationsWithEvidence = packData.obligations.filter(o => (o.evidence_count || 0) > 0).length;
  const evidenceCoverage = packData.obligations.length > 0
    ? (obligationsWithEvidence / packData.obligations.length) * 100
    : 0;
  if (evidenceCoverage < 80) {
    recommendations.push(`Improve evidence coverage from ${evidenceCoverage.toFixed(0)}% to 80%+ to strengthen compliance position.`);
  }

  // Check CCS band
  if (packData.ccsAssessment) {
    const band = packData.ccsAssessment.compliance_band;
    if (band && ['D', 'E', 'F'].includes(band.toUpperCase())) {
      recommendations.push(`Priority: Improve CCS band from ${band} - current rating indicates significant compliance concerns.`);
    }
  }

  // Check recent incidents
  const recentIncidents = packData.incidents.filter(i => {
    const incidentDate = new Date(i.occurred_at || '');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return incidentDate > sixMonthsAgo;
  });
  if (recentIncidents.length > 0) {
    recommendations.push(`Review ${recentIncidents.length} incident(s) from the last 6 months and ensure corrective actions are in place.`);
  }

  // Default recommendation if none generated
  if (recommendations.length === 0) {
    recommendations.push('Maintain current compliance position and continue regular monitoring.');
  }

  return recommendations;
}

// ========================================================================
// FIRST YEAR MODE ADJUSTMENTS
// ========================================================================

export function getFirstYearModeAdjustments(packData: PackData): {
  showHistoricalData: boolean;
  showTrends: boolean;
  showCCSHistory: boolean;
  message?: string;
} {
  const isFirstYear = packData.company?.adoption_mode === 'FIRST_YEAR' ||
    packData.company?.adoption_mode === 'MIGRATION';

  if (isFirstYear) {
    return {
      showHistoricalData: false,
      showTrends: false,
      showCCSHistory: false,
      message: 'Note: Limited historical data available during first year of adoption.',
    };
  }

  return {
    showHistoricalData: true,
    showTrends: true,
    showCCSHistory: true,
  };
}
