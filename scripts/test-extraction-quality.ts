#!/usr/bin/env npx tsx
/**
 * Extraction Quality Test
 *
 * Evaluates the accuracy of PDF extraction by testing against real permits
 * and measuring quality metrics.
 *
 * Run with: npx tsx scripts/test-extraction-quality.ts
 *
 * REQUIRES: OPENAI_API_KEY in environment or .env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Configuration
const PERMITS_DIR = path.join(process.cwd(), 'docs/examples/permits');
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

interface PermitTestCase {
  name: string;
  filename: string;
  documentType: 'ENVIRONMENTAL_PERMIT' | 'TRADE_EFFLUENT_CONSENT' | 'MCPD_REGISTRATION';
  regulator?: string;
  waterCompany?: string;
  // Expected ranges for quality validation
  expected: {
    minObligations: number;
    maxObligations: number;
    mustHaveCategories: string[];
    shouldHaveFrequencies: boolean;
    shouldHaveConditionRefs: boolean;
    shouldHaveELVs?: boolean;
  };
}

// Single permit test (add others back later for full testing)
const TEST_CASES: PermitTestCase[] = [
  {
    name: 'EPR Environmental Permit',
    filename: 'EPR_GP3334CX - Environmental Permit - Original.pdf',
    documentType: 'ENVIRONMENTAL_PERMIT',
    regulator: 'EA',
    expected: {
      minObligations: 50,
      maxObligations: 150,
      mustHaveCategories: ['MONITORING', 'REPORTING'],
      shouldHaveFrequencies: true,
      shouldHaveConditionRefs: true,
      shouldHaveELVs: true,
    },
  },
];

interface QualityMetrics {
  // Core extraction metrics
  obligationCount: number;
  uniqueCategories: string[];
  categoryCounts: Record<string, number>;

  // Confidence metrics
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  highConfidenceCount: number; // >= 0.8
  mediumConfidenceCount: number; // 0.5 - 0.8
  lowConfidenceCount: number; // < 0.5

  // Completeness metrics
  withFrequency: number;
  withConditionRef: number;
  withDeadline: number;
  withEvidenceSuggestions: number;

  // Grounding metrics (anti-hallucination)
  withOriginalText: number;
  withPageReference: number;
  withSectionReference: number;

  // ELV metrics
  elvObligations: number;
  elvWithVerbatimText: number;

  // Quality scores (0-100)
  completenessScore: number;
  confidenceScore: number;
  groundingScore: number;
  overallScore: number;

  // Validation results
  passedTests: string[];
  failedTests: string[];
  warnings: string[];
}

interface ExtractionResult {
  permit: PermitTestCase;
  success: boolean;
  error?: string;
  extractionTimeMs: number;
  tokenUsage?: {
    totalTokens: number;
    estimatedCost: number;
  };
  metrics?: QualityMetrics;
  sampleObligations?: any[];
}

async function extractTextFromPdf(filepath: string): Promise<{ text: string; pageCount: number }> {
  const buffer = fs.readFileSync(filepath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text,
    pageCount: result.pages?.length || result.total || 1,
  };
}

function calculateMetrics(obligations: any[], testCase: PermitTestCase): QualityMetrics {
  const metrics: QualityMetrics = {
    obligationCount: obligations.length,
    uniqueCategories: [],
    categoryCounts: {},
    avgConfidence: 0,
    minConfidence: 1,
    maxConfidence: 0,
    highConfidenceCount: 0,
    mediumConfidenceCount: 0,
    lowConfidenceCount: 0,
    withFrequency: 0,
    withConditionRef: 0,
    withDeadline: 0,
    withEvidenceSuggestions: 0,
    withOriginalText: 0,
    withPageReference: 0,
    withSectionReference: 0,
    elvObligations: 0,
    elvWithVerbatimText: 0,
    completenessScore: 0,
    confidenceScore: 0,
    groundingScore: 0,
    overallScore: 0,
    passedTests: [],
    failedTests: [],
    warnings: [],
  };

  if (obligations.length === 0) {
    metrics.failedTests.push('No obligations extracted');
    return metrics;
  }

  // Calculate metrics
  let totalConfidence = 0;
  const categorySet = new Set<string>();

  for (const obl of obligations) {
    // Category tracking
    const category = obl.category || 'UNKNOWN';
    categorySet.add(category);
    metrics.categoryCounts[category] = (metrics.categoryCounts[category] || 0) + 1;

    // Confidence tracking
    const confidence = obl.confidence_score || 0;
    totalConfidence += confidence;
    metrics.minConfidence = Math.min(metrics.minConfidence, confidence);
    metrics.maxConfidence = Math.max(metrics.maxConfidence, confidence);

    if (confidence >= 0.8) metrics.highConfidenceCount++;
    else if (confidence >= 0.5) metrics.mediumConfidenceCount++;
    else metrics.lowConfidenceCount++;

    // Completeness tracking
    if (obl.frequency) metrics.withFrequency++;
    if (obl.condition_reference) metrics.withConditionRef++;
    if (obl.deadline_date || obl.deadline_relative) metrics.withDeadline++;
    if (obl.evidence_suggestions?.length > 0) metrics.withEvidenceSuggestions++;

    // Grounding tracking (anti-hallucination)
    if (obl.original_text) metrics.withOriginalText++;
    if (obl.page_reference) metrics.withPageReference++;
    if (obl.section_reference) metrics.withSectionReference++;

    // ELV tracking
    if (obl.condition_types?.includes('ELV') || obl.elv_limit) {
      metrics.elvObligations++;
      if (obl.elv_verbatim_text) metrics.elvWithVerbatimText++;
    }
  }

  metrics.uniqueCategories = Array.from(categorySet);
  metrics.avgConfidence = totalConfidence / obligations.length;

  // Calculate scores (0-100)
  const n = obligations.length;

  // Completeness score: weighted average of fields filled
  const completenessFactors = [
    (metrics.withFrequency / n) * 0.25,
    (metrics.withConditionRef / n) * 0.25,
    (metrics.withDeadline / n) * 0.15,
    (metrics.withEvidenceSuggestions / n) * 0.20,
    (metrics.uniqueCategories.length / 10) * 0.15, // Category diversity (max ~10 categories)
  ];
  metrics.completenessScore = Math.round(completenessFactors.reduce((a, b) => a + b, 0) * 100);

  // Confidence score: weighted by high/medium/low distribution
  metrics.confidenceScore = Math.round(
    ((metrics.highConfidenceCount * 1.0 + metrics.mediumConfidenceCount * 0.6 + metrics.lowConfidenceCount * 0.2) / n) * 100
  );

  // Grounding score: how well are obligations grounded in source text
  const groundingFactors = [
    (metrics.withOriginalText / n) * 0.4,
    (metrics.withPageReference / n) * 0.3,
    (metrics.withSectionReference / n) * 0.3,
  ];
  metrics.groundingScore = Math.round(groundingFactors.reduce((a, b) => a + b, 0) * 100);

  // Overall score
  metrics.overallScore = Math.round(
    metrics.completenessScore * 0.35 +
    metrics.confidenceScore * 0.35 +
    metrics.groundingScore * 0.30
  );

  // Run validation tests
  const expected = testCase.expected;

  // Obligation count test
  if (metrics.obligationCount >= expected.minObligations && metrics.obligationCount <= expected.maxObligations) {
    metrics.passedTests.push(`Obligation count (${metrics.obligationCount}) within expected range [${expected.minObligations}-${expected.maxObligations}]`);
  } else if (metrics.obligationCount < expected.minObligations) {
    metrics.failedTests.push(`Too few obligations: ${metrics.obligationCount} < ${expected.minObligations} expected`);
  } else {
    metrics.warnings.push(`More obligations than expected: ${metrics.obligationCount} > ${expected.maxObligations}`);
  }

  // Required categories test
  for (const cat of expected.mustHaveCategories) {
    if (metrics.categoryCounts[cat]) {
      metrics.passedTests.push(`Has required category: ${cat} (${metrics.categoryCounts[cat]})`);
    } else {
      metrics.failedTests.push(`Missing required category: ${cat}`);
    }
  }

  // Frequency assignment test
  if (expected.shouldHaveFrequencies) {
    const freqRate = metrics.withFrequency / n;
    if (freqRate >= 0.3) {
      metrics.passedTests.push(`Frequency assignment: ${Math.round(freqRate * 100)}%`);
    } else {
      metrics.warnings.push(`Low frequency assignment: only ${Math.round(freqRate * 100)}%`);
    }
  }

  // Condition reference test
  if (expected.shouldHaveConditionRefs) {
    const refRate = metrics.withConditionRef / n;
    if (refRate >= 0.5) {
      metrics.passedTests.push(`Condition references: ${Math.round(refRate * 100)}%`);
    } else {
      metrics.warnings.push(`Low condition reference rate: only ${Math.round(refRate * 100)}%`);
    }
  }

  // ELV test
  if (expected.shouldHaveELVs) {
    if (metrics.elvObligations > 0) {
      metrics.passedTests.push(`ELV extraction: ${metrics.elvObligations} ELVs found`);
    } else {
      metrics.failedTests.push(`Expected ELVs but none found`);
    }
  }

  // Confidence quality test
  if (metrics.avgConfidence >= 0.7) {
    metrics.passedTests.push(`Good average confidence: ${Math.round(metrics.avgConfidence * 100)}%`);
  } else if (metrics.avgConfidence >= 0.5) {
    metrics.warnings.push(`Medium average confidence: ${Math.round(metrics.avgConfidence * 100)}%`);
  } else {
    metrics.failedTests.push(`Low average confidence: ${Math.round(metrics.avgConfidence * 100)}%`);
  }

  // Grounding quality test
  if (metrics.groundingScore >= 50) {
    metrics.passedTests.push(`Good grounding score: ${metrics.groundingScore}%`);
  } else if (metrics.groundingScore >= 25) {
    metrics.warnings.push(`Medium grounding score: ${metrics.groundingScore}%`);
  } else {
    metrics.failedTests.push(`Low grounding score: ${metrics.groundingScore}% - risk of hallucination`);
  }

  return metrics;
}

async function runExtractionTest(testCase: PermitTestCase): Promise<ExtractionResult> {
  const filepath = path.join(PERMITS_DIR, testCase.filename);
  const startTime = Date.now();

  // Check file exists
  if (!fs.existsSync(filepath)) {
    return {
      permit: testCase,
      success: false,
      error: 'File not found',
      extractionTimeMs: 0,
    };
  }

  try {
    // Extract text
    const { text, pageCount } = await extractTextFromPdf(filepath);
    console.log(`   📄 Extracted ${text.length.toLocaleString()} characters from ${pageCount} pages`);

    // Import and run extraction
    const { getDocumentProcessor } = await import('../lib/ai/document-processor');
    const processor = getDocumentProcessor();

    const result = await processor.extractObligations(text, {
      moduleTypes: ['MODULE_1'],
      documentType: testCase.documentType,
      regulator: testCase.regulator,
      waterCompany: testCase.waterCompany,
      pageCount,
    });

    const extractionTimeMs = Date.now() - startTime;

    // Calculate quality metrics
    const metrics = calculateMetrics(result.obligations, testCase);

    return {
      permit: testCase,
      success: true,
      extractionTimeMs,
      tokenUsage: result.tokenUsage ? {
        totalTokens: result.tokenUsage.totalTokens,
        estimatedCost: result.tokenUsage.estimatedCost,
      } : undefined,
      metrics,
      sampleObligations: result.obligations.slice(0, 5),
    };
  } catch (error: any) {
    return {
      permit: testCase,
      success: false,
      error: error.message,
      extractionTimeMs: Date.now() - startTime,
    };
  }
}

function printResults(results: ExtractionResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log(' EXTRACTION QUALITY REPORT');
  console.log('='.repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  let totalCost = 0;
  const allScores: number[] = [];

  for (const result of results) {
    console.log(`\n📋 ${result.permit.name}`);
    console.log('-'.repeat(60));

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      totalFailed++;
      continue;
    }

    const m = result.metrics!;
    allScores.push(m.overallScore);

    // Summary line
    console.log(`   Obligations: ${m.obligationCount} | Overall Score: ${m.overallScore}%`);
    console.log(`   Time: ${result.extractionTimeMs}ms | Cost: $${result.tokenUsage?.estimatedCost.toFixed(4) || '0.00'}`);

    if (result.tokenUsage) {
      totalCost += result.tokenUsage.estimatedCost;
    }

    // Score breakdown
    console.log(`\n   📊 SCORES:`);
    console.log(`      Completeness: ${m.completenessScore}% | Confidence: ${m.confidenceScore}% | Grounding: ${m.groundingScore}%`);

    // Confidence distribution
    console.log(`\n   🎯 CONFIDENCE DISTRIBUTION:`);
    console.log(`      High (≥80%): ${m.highConfidenceCount} | Medium (50-79%): ${m.mediumConfidenceCount} | Low (<50%): ${m.lowConfidenceCount}`);
    console.log(`      Average: ${Math.round(m.avgConfidence * 100)}% | Range: ${Math.round(m.minConfidence * 100)}% - ${Math.round(m.maxConfidence * 100)}%`);

    // Category breakdown
    console.log(`\n   📂 CATEGORIES: (${m.uniqueCategories.length} types)`);
    for (const [cat, count] of Object.entries(m.categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
      console.log(`      ${cat}: ${count}`);
    }

    // Completeness breakdown
    console.log(`\n   ✓ COMPLETENESS:`);
    console.log(`      With frequency: ${Math.round(m.withFrequency / m.obligationCount * 100)}%`);
    console.log(`      With condition ref: ${Math.round(m.withConditionRef / m.obligationCount * 100)}%`);
    console.log(`      With evidence suggestions: ${Math.round(m.withEvidenceSuggestions / m.obligationCount * 100)}%`);

    // Grounding breakdown
    console.log(`\n   🔒 GROUNDING (Anti-hallucination):`);
    console.log(`      With original text: ${Math.round(m.withOriginalText / m.obligationCount * 100)}%`);
    console.log(`      With page reference: ${Math.round(m.withPageReference / m.obligationCount * 100)}%`);
    console.log(`      With section reference: ${Math.round(m.withSectionReference / m.obligationCount * 100)}%`);

    // ELV info
    if (m.elvObligations > 0) {
      console.log(`\n   ⚡ ELVs: ${m.elvObligations} found, ${m.elvWithVerbatimText} with verbatim text`);
    }

    // Test results
    console.log(`\n   ✅ PASSED TESTS (${m.passedTests.length}):`);
    m.passedTests.forEach(t => console.log(`      • ${t}`));
    totalPassed += m.passedTests.length;

    if (m.warnings.length > 0) {
      console.log(`\n   ⚠️  WARNINGS (${m.warnings.length}):`);
      m.warnings.forEach(w => console.log(`      • ${w}`));
      totalWarnings += m.warnings.length;
    }

    if (m.failedTests.length > 0) {
      console.log(`\n   ❌ FAILED TESTS (${m.failedTests.length}):`);
      m.failedTests.forEach(f => console.log(`      • ${f}`));
      totalFailed += m.failedTests.length;
    }

    // Sample obligations
    if (result.sampleObligations && result.sampleObligations.length > 0) {
      console.log(`\n   📝 SAMPLE OBLIGATIONS:`);
      result.sampleObligations.slice(0, 3).forEach((obl, i) => {
        console.log(`\n      ${i + 1}. ${obl.title || 'Untitled'}`);
        console.log(`         Category: ${obl.category} | Confidence: ${Math.round((obl.confidence_score || 0) * 100)}%`);
        if (obl.frequency) console.log(`         Frequency: ${obl.frequency}`);
        if (obl.condition_reference) console.log(`         Ref: ${obl.condition_reference}`);
      });
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log(' OVERALL SUMMARY');
  console.log('='.repeat(80));

  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const successfulTests = results.filter(r => r.success).length;

  console.log(`\n   📈 EXTRACTION QUALITY SCORE: ${avgScore}%`);
  console.log(`   📄 Permits tested: ${successfulTests}/${results.length}`);
  console.log(`   ✅ Tests passed: ${totalPassed}`);
  console.log(`   ⚠️  Warnings: ${totalWarnings}`);
  console.log(`   ❌ Tests failed: ${totalFailed}`);
  console.log(`   💰 Total API cost: $${totalCost.toFixed(4)}`);

  // Quality rating
  let rating: string;
  let ratingColor: string;
  if (avgScore >= 80) { rating = 'EXCELLENT'; ratingColor = '\x1b[32m'; }
  else if (avgScore >= 65) { rating = 'GOOD'; ratingColor = '\x1b[32m'; }
  else if (avgScore >= 50) { rating = 'ACCEPTABLE'; ratingColor = '\x1b[33m'; }
  else if (avgScore >= 35) { rating = 'NEEDS IMPROVEMENT'; ratingColor = '\x1b[33m'; }
  else { rating = 'POOR'; ratingColor = '\x1b[31m'; }

  console.log(`\n   ${ratingColor}🏆 QUALITY RATING: ${rating}\x1b[0m`);

  if (avgScore < 65) {
    console.log('\n   💡 RECOMMENDATIONS:');
    if (allScores.some(s => s < 50)) {
      console.log('      • Review prompts for better obligation extraction');
      console.log('      • Check if document filtering is removing important content');
    }
    if (totalFailed > totalPassed / 2) {
      console.log('      • Many tests failed - investigate extraction pipeline');
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log(' EXTRACTION QUALITY TEST');
  console.log('='.repeat(80));

  if (!hasOpenAIKey) {
    console.error('\n❌ ERROR: OPENAI_API_KEY not set');
    console.log('   This test requires a valid OpenAI API key to run extraction.');
    console.log('   Set it with: export OPENAI_API_KEY=your-key-here\n');
    process.exit(1);
  }

  console.log(`\n📁 Permits directory: ${PERMITS_DIR}`);
  console.log(`📋 Test cases: ${TEST_CASES.length}`);
  console.log(`🔑 OpenAI API Key: ✓ Present\n`);

  const results: ExtractionResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n🔄 Testing: ${testCase.name}...`);
    const result = await runExtractionTest(testCase);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Extracted ${result.metrics?.obligationCount} obligations (Score: ${result.metrics?.overallScore}%)`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  printResults(results);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
