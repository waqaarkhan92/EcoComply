#!/usr/bin/env npx tsx
/**
 * Simple Real Permit Extraction Test
 * Tests PDF extraction and LLM obligation extraction with minimal dependencies
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

// Configuration
const PERMITS_DIR = path.join(process.cwd(), 'docs/examples/permits');
const API_KEY = process.env.OPENAI_API_KEY;

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

async function extractTextFromPdf(filepath: string): Promise<{ text: string; pages: number }> {
  const { PDFParse } = await import('pdf-parse');
  const buffer = fs.readFileSync(filepath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text,
    pages: result.pages?.length || result.total || 1,
  };
}

async function extractObligationsWithLLM(text: string, permitName: string): Promise<any> {
  if (!API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const openai = new OpenAI({ apiKey: API_KEY });

  // Take first 30K characters to stay within context limits
  const truncatedText = text.substring(0, 30000);

  log(`     📡 Calling OpenAI API (${truncatedText.length} chars)...`);

  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting regulatory obligations from environmental permits.

Extract all obligations, conditions, and requirements from the permit text.
Return a JSON object with this structure:
{
  "obligations": [
    {
      "condition_reference": "e.g. 2.3.1 or Table S3.1",
      "summary": "Short title (max 60 chars)",
      "text": "Full obligation text",
      "category": "MONITORING|REPORTING|OPERATIONAL|RECORDS|EMISSIONS|WASTE|OTHER",
      "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUALLY|ONE_TIME|null",
      "is_subjective": true/false
    }
  ],
  "metadata": {
    "permit_reference": "extracted permit number",
    "site_name": "facility name",
    "total_conditions": number
  }
}`
      },
      {
        role: 'user',
        content: `Extract all obligations from this environmental permit:\n\n${truncatedText}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 4000,
  });

  const elapsed = Date.now() - startTime;
  const content = response.choices[0]?.message?.content || '{}';

  log(`     ✅ Response received in ${elapsed}ms`);
  log(`     📊 Tokens: ${response.usage?.prompt_tokens} input, ${response.usage?.completion_tokens} output`);

  return {
    ...JSON.parse(content),
    _meta: {
      model: response.model,
      tokens: response.usage,
      elapsedMs: elapsed,
    }
  };
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log(' SIMPLE REAL PERMIT EXTRACTION TEST', 'bold');
  log('='.repeat(60), 'blue');

  if (!API_KEY) {
    log('\n⚠️  OPENAI_API_KEY not set - cannot test LLM extraction', 'yellow');
    return;
  }

  // Find permit files
  const files = fs.readdirSync(PERMITS_DIR).filter(f => f.endsWith('.pdf'));
  log(`\nFound ${files.length} permit files`, 'green');

  // Test just the first permit to save API costs
  const testFile = files[0];
  const filepath = path.join(PERMITS_DIR, testFile);

  log(`\n📄 Testing: ${testFile}`, 'blue');

  // Step 1: Extract text
  log('\n  1. Extracting text from PDF...', 'bold');
  const pdfResult = await extractTextFromPdf(filepath);
  log(`     ✅ Extracted ${pdfResult.text.length.toLocaleString()} characters from ${pdfResult.pages} pages`, 'green');

  // Step 2: Extract obligations with LLM
  log('\n  2. Extracting obligations with GPT-4o-mini...', 'bold');
  const obligations = await extractObligationsWithLLM(pdfResult.text, testFile);

  // Step 3: Display results
  log('\n  3. Results:', 'bold');
  if (obligations.metadata) {
    log(`     Permit: ${obligations.metadata.permit_reference || 'Unknown'}`);
    log(`     Site: ${obligations.metadata.site_name || 'Unknown'}`);
  }

  const oblCount = obligations.obligations?.length || 0;
  log(`     Total obligations found: ${oblCount}`, oblCount > 0 ? 'green' : 'yellow');

  if (obligations.obligations && obligations.obligations.length > 0) {
    log('\n  Sample obligations:', 'bold');
    obligations.obligations.slice(0, 5).forEach((obl: any, i: number) => {
      log(`\n     ${i + 1}. [${obl.condition_reference || 'N/A'}] ${obl.summary || obl.text?.substring(0, 60)}`, 'green');
      log(`        Category: ${obl.category}, Frequency: ${obl.frequency || 'N/A'}`);
    });

    // Category breakdown
    const categories: Record<string, number> = {};
    obligations.obligations.forEach((o: any) => {
      categories[o.category] = (categories[o.category] || 0) + 1;
    });

    log('\n  Category breakdown:', 'bold');
    Object.entries(categories).forEach(([cat, count]) => {
      log(`     ${cat}: ${count}`);
    });
  }

  log('\n' + '='.repeat(60), 'blue');
  log(' TEST COMPLETE', 'bold');
  log('='.repeat(60) + '\n', 'blue');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
