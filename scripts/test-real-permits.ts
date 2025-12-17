#!/usr/bin/env npx tsx
/**
 * Real Permit Extraction Test Script
 *
 * This script tests the extraction pipeline with real permits.
 * Run with: npx tsx scripts/test-real-permits.ts
 *
 * IMPORTANT: Requires OPENAI_API_KEY in environment for full extraction.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';

// Configuration
const PERMITS_DIR = path.join(process.cwd(), 'docs/examples/permits');
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

const PERMIT_FILES: Record<string, string> = {
  epr: 'EPR_GP3334CX - Environmental Permit - Original.pdf',
  datacentre: 'Permit_London_14_Data_Centre.pdf',
  bespoke: 'Application_Bespoke_-_Permit_-_02112022.pdf',
  zp: 'Permit_-_ZP3537AT.pdf',
  generic: 'Permit.pdf',
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface ExtractedText {
  text: string;
  pageCount: number;
  processingTimeMs: number;
}

async function extractTextFromPdf(filepath: string): Promise<ExtractedText> {
  const startTime = Date.now();
  const buffer = fs.readFileSync(filepath);

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return {
    text: result.text,
    pageCount: result.pages?.length || result.total || 1,
    processingTimeMs: Date.now() - startTime,
  };
}

async function testPdfExtraction() {
  log('\n📄 TESTING PDF TEXT EXTRACTION', 'bold');
  log('=' + '='.repeat(50));

  const results: Record<string, ExtractedText> = {};

  for (const [name, filename] of Object.entries(PERMIT_FILES)) {
    const filepath = path.join(PERMITS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      log(`  ⚠️  ${name}: File not found`, 'yellow');
      continue;
    }

    try {
      const result = await extractTextFromPdf(filepath);
      results[name] = result;

      log(`  ✅ ${name}:`, 'green');
      log(`     Pages: ${result.pageCount}`);
      log(`     Characters: ${result.text.length.toLocaleString()}`);
      log(`     Time: ${result.processingTimeMs}ms`);

      // Show first 200 characters as preview
      const preview = result.text.substring(0, 200).replace(/\n/g, ' ').trim();
      log(`     Preview: "${preview}..."`);
    } catch (error) {
      log(`  ❌ ${name}: ${error}`, 'red');
    }
  }

  return results;
}

async function testObligationExtraction(extractedTexts: Record<string, ExtractedText>) {
  log('\n\n🔍 TESTING OBLIGATION EXTRACTION', 'bold');
  log('=' + '='.repeat(50));

  if (!hasOpenAIKey) {
    log('\n  ⚠️  OPENAI_API_KEY not set - skipping LLM extraction', 'yellow');
    log('     Set the environment variable to test full extraction.\n');
    return;
  }

  // Dynamically import to avoid issues during PDF-only tests
  const { getDocumentProcessor } = await import('../lib/ai/document-processor');
  const processor = getDocumentProcessor();

  for (const [name, extracted] of Object.entries(extractedTexts)) {
    log(`\n  📋 Extracting from: ${name}`, 'blue');

    try {
      const result = await processor.extractObligations(extracted.text, {
        moduleTypes: ['MODULE_1'],
        documentType: 'ENVIRONMENTAL_PERMIT',
        pageCount: extracted.pageCount,
      });

      log(`     ✅ Found ${result.obligations.length} obligations`, 'green');
      log(`     Used LLM: ${result.usedLLM}`);
      log(`     Time: ${result.extractionTimeMs}ms`);

      if (result.tokenUsage) {
        log(`     Tokens: ${result.tokenUsage.totalTokens}`);
        log(`     Cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);
      }

      // Show sample obligations
      if (result.obligations.length > 0) {
        log('\n     Sample obligations:');
        result.obligations.slice(0, 3).forEach((obl, i) => {
          log(`       ${i + 1}. ${obl.title || 'Untitled'}`);
          log(`          Category: ${obl.category}, Confidence: ${Math.round((obl.confidence_score || 0) * 100)}%`);
        });
      }

      // Category breakdown
      const categories: Record<string, number> = {};
      result.obligations.forEach((o) => {
        categories[o.category] = (categories[o.category] || 0) + 1;
      });
      log('\n     Categories:');
      for (const [cat, count] of Object.entries(categories)) {
        log(`       ${cat}: ${count}`);
      }
    } catch (error: any) {
      log(`     ❌ Error: ${error.message}`, 'red');
    }
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log(' REAL PERMIT EXTRACTION TEST', 'bold');
  log('='.repeat(60), 'blue');

  log(`\nPermits directory: ${PERMITS_DIR}`);
  log(`OpenAI API Key: ${hasOpenAIKey ? 'Present' : 'NOT SET'}`);

  // Test PDF extraction
  const extractedTexts = await testPdfExtraction();

  // Test obligation extraction (if API key available)
  await testObligationExtraction(extractedTexts);

  log('\n' + '='.repeat(60), 'blue');
  log(' TEST COMPLETE', 'bold');
  log('='.repeat(60) + '\n', 'blue');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
