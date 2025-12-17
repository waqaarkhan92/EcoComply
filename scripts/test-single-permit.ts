#!/usr/bin/env npx tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { getDocumentProcessor } from '../lib/ai/document-processor';

async function main() {
  const permitPath = path.join(process.cwd(), 'docs/examples/permits/EPR_GP3334CX - Environmental Permit - Original.pdf');

  console.log('🔄 Testing EPR permit extraction (cache cleared)...\n');

  // Extract text
  const buffer = fs.readFileSync(permitPath);
  const parser = new PDFParse({ data: buffer });
  const pdfResult = await parser.getText();

  const pageCount = pdfResult.pages?.length || pdfResult.total || 1;
  console.log(`📄 PDF: ${pdfResult.text.length} chars, ${pageCount} pages`);

  // Extract obligations
  const processor = getDocumentProcessor();
  const startTime = Date.now();

  const result = await processor.extractObligations(pdfResult.text, {
    moduleTypes: ['MODULE_1'],
    documentType: 'ENVIRONMENTAL_PERMIT',
    pageCount: pageCount,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ RESULTS:`);
  console.log(`   Obligations: ${result.obligations.length}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Tokens: ${result.tokenUsage?.totalTokens || 'N/A'}`);
  console.log(`   Cost: $${result.tokenUsage?.estimatedCost?.toFixed(4) || 'N/A'}`);

  // Category breakdown
  const cats: Record<string, number> = {};
  result.obligations.forEach(o => { cats[o.category] = (cats[o.category] || 0) + 1; });
  console.log(`\n📊 Categories:`);
  Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
}

main().catch(console.error);
