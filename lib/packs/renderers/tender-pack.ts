/**
 * Tender Client Assurance Pack Renderer
 * Commercial pack with compliance showcase
 */

import type PDFKit from 'pdfkit';
import type { PackData, PackRecord, Section } from '../types';
import { COLORS, formatDate, getStatusColor, truncateText } from '../utils';

export async function renderTenderPack(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
): Promise<number> {
  // Permit Status
  sections.push({ title: 'Permit Status', page: currentPage });
  currentPage = await renderPermitStatus(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Compliance Assessment
  sections.push({ title: 'Compliance Assessment', page: currentPage });
  currentPage = await renderComplianceAssessment(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Environmental Commitments
  sections.push({ title: 'Environmental Commitments', page: currentPage });
  currentPage = await renderEnvironmentalCommitments(doc, packData, currentPage);
  doc.addPage();
  currentPage++;

  // Certifications
  sections.push({ title: 'Certifications', page: currentPage });
  currentPage = await renderCertifications(doc, packData, currentPage);

  return currentPage;
}

// ========================================================================
// PERMIT STATUS
// ========================================================================

async function renderPermitStatus(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Permit & Consent Status', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Overview of all environmental permits and consents.', 50, 80);

  // Summary box
  const activePermits = packData.permits.filter(p => p.status === 'ACTIVE').length;
  const totalPermits = packData.permits.length;

  doc.rect(50, 110, 200, 60).fill(COLORS.GREEN);
  doc.fontSize(10).fillColor(COLORS.WHITE).text('Active Permits', 60, 120);
  doc.fontSize(28).text(`${activePermits} / ${totalPermits}`, 60, 140);

  // Permits table
  const tableY = 200;
  doc.rect(50, tableY, 500, 20).fill(COLORS.LIGHT_GRAY);

  doc.fontSize(9).fillColor(COLORS.BLACK);
  doc.text('Permit Number', 55, tableY + 5);
  doc.text('Type', 180, tableY + 5);
  doc.text('Regulator', 280, tableY + 5);
  doc.text('Status', 370, tableY + 5);
  doc.text('Expiry', 450, tableY + 5);

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
    doc.rect(370, rowY + 3, 50, 15).fill(statusColor);
    doc.fontSize(7).fillColor(COLORS.WHITE).text(permit.status || 'ACTIVE', 375, rowY + 6);

    doc.fontSize(8).fillColor(COLORS.BLACK).text(formatDate(permit.expiry_date, 'short'), 450, rowY + 8);

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
// COMPLIANCE ASSESSMENT
// ========================================================================

async function renderComplianceAssessment(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Compliance Assessment', 50, 50);

  // Calculate compliance metrics
  const total = packData.obligations.length;
  const completed = packData.obligations.filter(o => o.status === 'COMPLETED').length;
  const overdue = packData.obligations.filter(o => o.status === 'OVERDUE').length;
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compliance score display
  const scoreColor = complianceRate >= 80 ? COLORS.GREEN : complianceRate >= 50 ? COLORS.AMBER : COLORS.RED;

  doc.circle(150, 150, 60).fill(scoreColor);
  doc.fontSize(36).fillColor(COLORS.WHITE).text(`${complianceRate}%`, 105, 125, { width: 90, align: 'center' });
  doc.fontSize(10).text('Compliance', 105, 165, { width: 90, align: 'center' });

  // Key metrics
  doc.fontSize(12).fillColor(COLORS.BLACK).text('Key Metrics', 280, 100);

  const metrics = [
    { label: 'Total Obligations', value: total.toString(), color: COLORS.BLUE },
    { label: 'Completed', value: completed.toString(), color: COLORS.GREEN },
    { label: 'Overdue', value: overdue.toString(), color: COLORS.RED },
    { label: 'Evidence Items', value: packData.evidence.length.toString(), color: COLORS.TEAL },
  ];

  let y = 130;
  for (const metric of metrics) {
    doc.rect(280, y, 15, 15).fill(metric.color);
    doc.fontSize(10).fillColor(COLORS.BLACK).text(`${metric.label}: ${metric.value}`, 305, y + 2);
    y += 30;
  }

  // CCS Assessment (if available)
  if (packData.ccsAssessment) {
    doc.fontSize(12).fillColor(COLORS.BLACK).text('CCS Assessment', 50, 280);
    doc.fontSize(10).fillColor(COLORS.GRAY).text(
      `Band: ${packData.ccsAssessment.compliance_band} | Year: ${packData.ccsAssessment.assessment_year}`,
      50,
      305
    );
  }

  // Compliance statement
  doc.fontSize(10).fillColor(COLORS.BLACK).text('Compliance Statement', 50, 380);
  doc.fontSize(9).fillColor(COLORS.GRAY).text(
    `${packData.company?.name || 'The company'} maintains a comprehensive environmental compliance management system. ` +
    `As of ${formatDate(new Date())}, ${complianceRate}% of obligations are fully compliant with all evidence documented.`,
    50,
    405,
    { width: 500 }
  );

  return currentPage;
}

// ========================================================================
// ENVIRONMENTAL COMMITMENTS
// ========================================================================

async function renderEnvironmentalCommitments(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Environmental Commitments', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Our commitment to environmental stewardship and regulatory compliance.', 50, 80);

  // Standard commitments
  const commitments = [
    {
      title: 'Regulatory Compliance',
      description: 'We maintain full compliance with all applicable environmental regulations, permits, and consents.',
    },
    {
      title: 'Continuous Improvement',
      description: 'We continuously monitor and improve our environmental performance through regular audits and assessments.',
    },
    {
      title: 'Incident Prevention',
      description: 'We implement robust preventive measures to minimize environmental incidents and their impacts.',
    },
    {
      title: 'Evidence Documentation',
      description: 'We maintain comprehensive documentation of all compliance activities and evidence.',
    },
    {
      title: 'Stakeholder Communication',
      description: 'We maintain transparent communication with regulators, clients, and other stakeholders.',
    },
  ];

  let y = 120;
  for (const commitment of commitments) {
    // Checkmark icon
    doc.circle(60, y + 8, 8).fill(COLORS.GREEN);
    doc.fontSize(10).fillColor(COLORS.WHITE).text('✓', 56, y + 3);

    // Title and description
    doc.fontSize(11).fillColor(COLORS.BLACK).text(commitment.title, 80, y);
    doc.fontSize(9).fillColor(COLORS.GRAY).text(commitment.description, 80, y + 18, { width: 450 });

    y += 60;

    if (y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
      y = 50;
    }
  }

  return currentPage;
}

// ========================================================================
// CERTIFICATIONS
// ========================================================================

async function renderCertifications(
  doc: PDFKit.PDFDocument,
  packData: PackData,
  currentPage: number
): Promise<number> {
  doc.fontSize(20).fillColor(COLORS.BLACK).text('Certifications & Accreditations', 50, 50);

  doc.fontSize(10).fillColor(COLORS.GRAY)
    .text('Environmental management certifications and industry accreditations.', 50, 80);

  // Standard certifications (placeholders - would come from actual data)
  const certifications = [
    {
      name: 'ISO 14001:2015',
      description: 'Environmental Management System',
      status: 'Certified',
    },
    {
      name: 'ISO 50001:2018',
      description: 'Energy Management System',
      status: 'Certified',
    },
    {
      name: 'EMAS',
      description: 'EU Eco-Management and Audit Scheme',
      status: 'Registered',
    },
  ];

  let y = 120;
  const cardWidth = 160;
  const cardHeight = 100;
  const cardsPerRow = 3;

  for (let i = 0; i < certifications.length; i++) {
    const cert = certifications[i];
    const col = i % cardsPerRow;
    const row = Math.floor(i / cardsPerRow);

    const x = 50 + col * (cardWidth + 15);
    const cardY = y + row * (cardHeight + 15);

    // Card background
    doc.rect(x, cardY, cardWidth, cardHeight).fill(COLORS.LIGHT_GRAY);

    // Certification badge
    doc.rect(x + 10, cardY + 10, 30, 30).fill(COLORS.GREEN);
    doc.fontSize(16).fillColor(COLORS.WHITE).text('✓', x + 17, cardY + 16);

    // Certification details
    doc.fontSize(10).fillColor(COLORS.BLACK).text(cert.name, x + 50, cardY + 15);
    doc.fontSize(8).fillColor(COLORS.GRAY).text(cert.description, x + 10, cardY + 50, { width: cardWidth - 20 });
    doc.fontSize(8).fillColor(COLORS.GREEN).text(cert.status, x + 10, cardY + 75);
  }

  // Disclaimer
  doc.fontSize(8).fillColor(COLORS.GRAY).text(
    'Note: Certification status shown is for illustrative purposes. Actual certifications should be verified with issuing bodies.',
    50,
    doc.page.height - 80,
    { width: 500 }
  );

  return currentPage;
}
