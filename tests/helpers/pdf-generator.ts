/**
 * PDF Generator Helper for Tests
 * Creates test PDFs with extractable text content for obligation extraction testing
 */

import PDFDocument from 'pdfkit';

/**
 * Creates a test PDF with environmental permit content that should trigger obligation extraction
 */
export async function createTestPermitPDF(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    // pdfkit auto-creates first page, just add content
    
    // Add permit header
    doc.fontSize(16).text('ENVIRONMENTAL PERMIT', 50, 50, { align: 'center' });
    doc.fontSize(12).text('Permit Reference: EP/2024/001234', 50, 100);
    doc.text('Regulator: Environment Agency', 50, 120);
    doc.text('Issue Date: 01 January 2024', 50, 140);
    doc.text('Expiry Date: 31 December 2029', 50, 160);

    doc.moveDown(2);

    // Add conditions section with obligations
    doc.fontSize(14).text('CONDITIONS AND OBLIGATIONS', 50, 220);
    doc.fontSize(10);

    const obligations = [
      {
        reference: 'Condition 1.1',
        text: 'The operator shall submit an annual compliance report to the Environment Agency by 31 March each year. This report must include monitoring data, emissions records, and any incidents that occurred during the reporting period.',
        frequency: 'ANNUAL',
        deadline: '31 March',
      },
      {
        reference: 'Condition 2.3',
        text: 'Monthly monitoring of stack emissions for NOx, SO2, and particulates shall be conducted. Results must be submitted within 28 days of the end of each month.',
        frequency: 'MONTHLY',
        deadline: '28 days after month end',
      },
      {
        reference: 'Condition 3.5',
        text: 'Quarterly inspections of all abatement equipment must be carried out by a qualified engineer. Inspection reports must be retained for a minimum of 6 years.',
        frequency: 'QUARTERLY',
        deadline: 'Within 30 days of quarter end',
      },
      {
        reference: 'Condition 4.2',
        text: 'The operator shall notify the Environment Agency within 24 hours of any incident that results in emissions exceeding permit limits. A detailed incident report must follow within 7 days.',
        frequency: 'AS_REQUIRED',
        deadline: '24 hours for notification, 7 days for report',
      },
      {
        reference: 'Condition 5.1',
        text: 'Annual calibration of all monitoring equipment must be performed by an accredited laboratory. Calibration certificates must be submitted to the Environment Agency within 14 days of completion.',
        frequency: 'ANNUAL',
        deadline: '14 days after calibration',
      },
      {
        reference: 'Condition 6.4',
        text: 'Waste management records must be maintained and submitted quarterly. Records must include waste types, quantities, disposal methods, and waste carrier details.',
        frequency: 'QUARTERLY',
        deadline: 'Within 30 days of quarter end',
      },
    ];

    let yPos = 260;
    obligations.forEach((obl, index) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(11).text(`${obl.reference}:`, 50, yPos, { continued: false });
      doc.fontSize(10).text(obl.text, 50, yPos + 15, { width: 500 });
      yPos += 60;
    });

    doc.end();
  });
}

/**
 * Creates a minimal test PDF with basic text (for quick tests)
 */
export async function createMinimalTestPDF(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    doc.addPage();
    doc.fontSize(12).text('Test Environmental Permit', 50, 50);
    doc.text('Condition 1.1: Submit annual compliance report by 31 March.', 50, 100);
    doc.text('Condition 2.1: Conduct monthly monitoring of emissions.', 50, 130);

    doc.end();
  });
}

