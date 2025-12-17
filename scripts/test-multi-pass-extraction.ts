/**
 * Test Multi-Pass Extraction vs Single-Pass
 *
 * This script tests the extraction improvement recommendations:
 * - Multi-pass extraction strategy
 * - ELV expansion post-processor
 * - Enhanced prompts with few-shot examples
 *
 * Run with: OPENAI_API_KEY=xxx npx tsx scripts/test-multi-pass-extraction.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMultiPassExtractor } from '../lib/ai/extraction-strategies/multi-pass-extractor';
import { analyzeDocumentComplexity } from '../lib/ai/model-router';
import { getDocumentProcessor } from '../lib/ai/document-processor';

// Sample permit text for testing (simulated complex EA permit)
const SAMPLE_PERMIT_TEXT = `
ENVIRONMENTAL PERMIT
Permit Reference: EPR/TEST/001234
Environment Agency

Table of Contents
1. Introduction
2. Permitted Activities
3. Emissions and Monitoring

Schedule 1 - Permitted Activities

1.1 General Conditions
1.1.1 The operator shall maintain the activities in accordance with this permit.
1.1.2 The operator shall notify the Environment Agency of any changes to the permitted activities.
1.1.3 The operator shall ensure all staff are trained in environmental procedures.

2.3 Emission Controls
2.3.1 All emissions shall be controlled using Best Available Techniques.
2.3.2 The operator shall implement odour management procedures.
2.3.3 Noise levels shall not exceed 55 dB at site boundary.
2.3.4 Fugitive emissions shall be minimised through containment.
2.3.5 All equipment shall be maintained in good working order.
2.3.6 The operator shall:
2.3.6.1 maintain records of all complaints received
2.3.6.2 investigate each complaint within 48 hours
2.3.6.3 report findings to the Environment Agency within 7 days
2.3.6.4 implement corrective actions as necessary

2.4 Waste Management
2.4.1 Waste shall be stored in designated areas only.
2.4.2 Hazardous waste shall be segregated from non-hazardous waste.
2.4.3 Waste transfer notes shall be retained for 2 years.

Table S1.2 Operating Techniques
| Reference | Description | Requirement |
|-----------|-------------|-------------|
| OT1 | Containment bunds | All tanks shall have bunded areas |
| OT2 | Emergency procedures | Emergency spill kits available 24/7 |
| OT3 | Fire prevention | Fire detection systems operational |

Table S1.3 Improvement Programme
| Reference | Requirement | Deadline |
|-----------|-------------|----------|
| IC1 | Submit odour management plan | 3 months from permit |
| IC2 | Install continuous monitoring | 6 months from permit |
| IC3 | Complete stack assessment | 12 months from permit |
| IC4 | Submit BAT assessment | 18 months from permit |
| IC5 | Install leak detection system | 24 months from permit |

Table S1.4 Pre-Operational Conditions
| Reference | Requirement |
|-----------|-------------|
| PO1 | Commission CEMS system before operations commence |
| PO2 | Complete operator training before operations |
| PO3 | Install backup power before operations |

Table S3.1 Emission Limits to Air
Point source emissions to air shall not exceed the limits specified.
| Parameter | Limit | Unit | Averaging Period | Reference |
|-----------|-------|------|------------------|-----------|
| NOx | 200 | mg/Nm³ | Hourly average | 15% O2, dry |
| SO2 | 50 | mg/Nm³ | Daily average | 15% O2, dry |
| CO | 100 | mg/Nm³ | Hourly average | 15% O2, dry |
| HCl | 10 | mg/Nm³ | Daily average | 15% O2, dry |
| HF | 1 | mg/Nm³ | Daily average | 15% O2, dry |
| Particulates | 10 | mg/Nm³ | Daily average | 15% O2, dry |
| VOC | 20 | mg/Nm³ | Daily average | 15% O2, dry |
| NH3 | 30 | mg/Nm³ | Daily average | 15% O2, dry |
| Dioxins | 0.1 | ng TEQ/Nm³ | Annual | 15% O2, dry |
| Mercury | 0.05 | mg/Nm³ | Annual | 15% O2, dry |
| Cadmium | 0.05 | mg/Nm³ | Annual | 15% O2, dry |
| Heavy Metals | 0.5 | mg/Nm³ | Annual | 15% O2, dry |

Table S3.2 Monitoring Requirements
| Parameter | Emission Point | Frequency | Standard |
|-----------|---------------|-----------|----------|
| NOx | A1 | Continuous | BS EN 14792 |
| SO2 | A1 | Continuous | BS EN 14791 |
| CO | A1 | Continuous | BS EN 15058 |
| HCl | A1 | Continuous | BS EN 14181 |
| Particulates | A1 | Continuous | BS EN 13284-2 |
| Stack flow | A1 | Continuous | BS EN ISO 16911-1 |
| Temperature | A1 | Continuous | - |
| Pressure | A1 | Continuous | - |
| Oxygen | A1 | Continuous | BS EN 14789 |
| Moisture | A1 | Continuous | BS EN 14790 |

Table S3.3 Process Monitoring
| Parameter | Location | Frequency |
|-----------|----------|-----------|
| Combustion temperature | Furnace | Continuous |
| Waste feed rate | Feed hopper | Continuous |
| Fuel quality | Laboratory | Weekly |

4.0 Reporting Requirements
4.1.1 The operator shall maintain a complaints log.
4.1.2 All abnormal events shall be recorded.
4.2.1 The operator shall submit an annual environmental report by 31 January each year.
4.2.2 The operator shall notify any abnormal emissions within 24 hours.
4.2.3 Quarterly emissions data shall be submitted within 28 days of quarter end.
4.3.1 Records shall be retained for a minimum of 6 years.
4.3.2 Calibration records shall be maintained for all monitoring equipment.
4.4.1 The operator shall notify the EA of any breach within 24 hours.
4.4.2 A written report shall follow within 14 days of any breach.

5.0 Notifications
5.1.1 The operator shall notify the EA at least 14 days before starting operations.
5.1.2 The operator shall notify the EA of any plant shutdown within 24 hours.
5.1.3 Changes to emergency contacts shall be notified within 7 days.
`;

async function runTest() {
  console.log('='.repeat(80));
  console.log('EXTRACTION IMPROVEMENT TEST');
  console.log('='.repeat(80));
  console.log('\nThis test compares multi-pass extraction with expected baseline.\n');

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('Run with: OPENAI_API_KEY=your-key npx tsx scripts/test-multi-pass-extraction.ts');
    process.exit(1);
  }

  // Step 1: Analyze document complexity
  console.log('📊 Step 1: Document Complexity Analysis');
  console.log('-'.repeat(40));

  const complexity = analyzeDocumentComplexity({
    documentText: SAMPLE_PERMIT_TEXT,
    documentType: 'ENVIRONMENTAL_PERMIT',
    pageCount: 36,
  });

  console.log(`Complexity: ${complexity.complexity}`);
  console.log(`Recommended Model: ${complexity.recommendedModel}`);
  console.log(`Confidence: ${(complexity.confidence * 100).toFixed(0)}%`);
  console.log(`Reasons:`);
  complexity.reasons.forEach(r => console.log(`  - ${r}`));
  console.log();

  // Step 2: Run multi-pass extraction
  console.log('🔄 Step 2: Multi-Pass Extraction');
  console.log('-'.repeat(40));

  const extractor = getMultiPassExtractor();
  const startTime = Date.now();

  const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
    documentType: 'ENVIRONMENTAL_PERMIT',
    regulator: 'Environment Agency',
    permitReference: 'EPR/TEST/001234',
    pageCount: 36,
  });

  const duration = Date.now() - startTime;

  console.log(`\n✅ Extraction Complete in ${(duration / 1000).toFixed(1)}s`);
  console.log();

  // Step 3: Analyze results
  console.log('📋 Step 3: Results Analysis');
  console.log('-'.repeat(40));

  console.log(`\nTOTAL OBLIGATIONS EXTRACTED: ${result.totalExtracted}`);
  console.log(`Coverage Score: ${(result.coverageScore * 100).toFixed(0)}%`);
  console.log();

  console.log('Pass Breakdown:');
  console.log(`  Conditions Pass: ${result.passResults.conditions.obligations.length} obligations`);
  console.log(`  Tables Pass: ${result.passResults.tables.obligations.length} obligations`);
  console.log(`  Improvements Pass: ${result.passResults.improvements.obligations.length} obligations`);
  console.log(`  ELVs Pass: ${result.passResults.elvs.obligations.length} obligations`);
  console.log(`  Verification (additional): ${result.passResults.verification.additionalObligations.length} obligations`);
  console.log();

  // Category breakdown
  const categories: Record<string, number> = {};
  result.obligations.forEach(o => {
    categories[o.category] = (categories[o.category] || 0) + 1;
  });

  console.log('Category Breakdown:');
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log();

  // Condition type breakdown
  const conditionTypes: Record<string, number> = {};
  result.obligations.forEach(o => {
    conditionTypes[o.condition_type] = (conditionTypes[o.condition_type] || 0) + 1;
  });

  console.log('Condition Type Breakdown:');
  Object.entries(conditionTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();

  // Token usage
  if (result.tokenUsage) {
    console.log('Token Usage:');
    console.log(`  Input tokens: ${result.tokenUsage.inputTokens.toLocaleString()}`);
    console.log(`  Output tokens: ${result.tokenUsage.outputTokens.toLocaleString()}`);
    console.log(`  Total tokens: ${result.tokenUsage.totalTokens.toLocaleString()}`);
    console.log(`  Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);
    console.log();
  }

  // Step 4: Check for expected obligations
  console.log('✓ Step 4: Validation Against Expected Obligations');
  console.log('-'.repeat(40));

  // Expected obligations from the sample text
  const expectedChecks = [
    { pattern: /NOx/i, description: 'NOx ELV obligation' },
    { pattern: /SO2/i, description: 'SO2 ELV obligation' },
    { pattern: /CO\b/i, description: 'CO ELV obligation' },
    { pattern: /HCl/i, description: 'HCl ELV obligation' },
    { pattern: /Particulate/i, description: 'Particulates ELV obligation' },
    { pattern: /IC1/i, description: 'IC1 improvement condition' },
    { pattern: /IC2/i, description: 'IC2 improvement condition' },
    { pattern: /IC3/i, description: 'IC3 improvement condition' },
    { pattern: /2\.3\.6\.1/i, description: 'Nested condition 2.3.6.1' },
    { pattern: /2\.3\.6\.2/i, description: 'Nested condition 2.3.6.2' },
    { pattern: /annual.*report/i, description: 'Annual reporting requirement' },
    { pattern: /24 hours/i, description: 'Notification within 24 hours' },
  ];

  let passed = 0;
  let failed = 0;

  expectedChecks.forEach(check => {
    const found = result.obligations.some(o =>
      check.pattern.test(o.title || '') ||
      check.pattern.test(o.description || '') ||
      check.pattern.test(o.condition_reference || '')
    );

    if (found) {
      console.log(`  ✅ ${check.description}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.description} - NOT FOUND`);
      failed++;
    }
  });

  console.log();
  console.log(`Validation: ${passed}/${expectedChecks.length} expected obligations found`);
  console.log();

  // Step 5: Sample obligations
  console.log('📝 Step 5: Sample Extracted Obligations');
  console.log('-'.repeat(40));

  // Show ELV obligations
  const elvObls = result.obligations.filter(o =>
    o.condition_type === 'ELV' || o._source === 'ELV'
  ).slice(0, 5);

  if (elvObls.length > 0) {
    console.log('\nELV Obligations (sample):');
    elvObls.forEach(o => {
      console.log(`  ${o.condition_reference}: ${o.title}`);
      if (o.elv_limit) console.log(`    Limit: ${o.elv_limit}`);
    });
  }

  // Show improvement conditions
  const icObls = result.obligations.filter(o =>
    o.is_improvement || o.condition_type === 'IMPROVEMENT'
  ).slice(0, 5);

  if (icObls.length > 0) {
    console.log('\nImprovement Conditions (sample):');
    icObls.forEach(o => {
      console.log(`  ${o.condition_reference}: ${o.title}`);
      if (o.deadline_relative) console.log(`    Deadline: ${o.deadline_relative}`);
    });
  }

  // Show nested conditions
  const nestedObls = result.obligations.filter(o => {
    const ref = o.condition_reference || '';
    return /\d+\.\d+\.\d+\.\d+/.test(ref);
  }).slice(0, 5);

  if (nestedObls.length > 0) {
    console.log('\nNested Sub-Conditions (sample):');
    nestedObls.forEach(o => {
      console.log(`  ${o.condition_reference}: ${o.title}`);
    });
  }

  console.log();
  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));

  // Summary assessment
  console.log('\n📊 IMPROVEMENT ASSESSMENT:');

  const baselineEstimate = 50; // Estimated single-pass extraction count
  const improvement = ((result.totalExtracted - baselineEstimate) / baselineEstimate * 100).toFixed(0);

  console.log(`  Baseline (estimated): ~${baselineEstimate} obligations`);
  console.log(`  Multi-pass result: ${result.totalExtracted} obligations`);
  console.log(`  Improvement: +${improvement}%`);
  console.log();

  if (result.totalExtracted >= 60) {
    console.log('✅ PASS: Multi-pass extraction is working as expected');
  } else {
    console.log('⚠️  WARNING: Fewer obligations than expected - may need tuning');
  }

  if (passed >= 10) {
    console.log('✅ PASS: Key obligations are being extracted correctly');
  } else {
    console.log('⚠️  WARNING: Some expected obligations were not found');
  }
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
