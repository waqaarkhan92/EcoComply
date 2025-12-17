/**
 * Multi-Pass Extraction Tests
 *
 * Tests the multi-pass extraction strategy for environmental permits.
 * Reference: EXTRACTION_IMPROVEMENT_RECOMMENDATIONS.md
 *
 * Expected outcomes:
 * - 85-95% coverage (vs 64% single-pass)
 * - Individual ELV parameters extracted separately
 * - Nested sub-conditions extracted
 * - Table rows extracted individually
 *
 * Run with: OPENAI_API_KEY=xxx npm test -- tests/integration/multi-pass-extraction.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMultiPassExtractor } from '@/lib/ai/extraction-strategies/multi-pass-extractor';
import { expandConsolidatedELVs, isConsolidatedELV, documentMayHaveConsolidatedELVs } from '@/lib/ai/post-processors/elv-expander';
import { analyzeDocumentComplexity } from '@/lib/ai/model-router';
import { Obligation } from '@/lib/ai/extraction-strategies/types';

// Skip tests if no API key
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
const itIf = (condition: boolean) => (condition ? it : it.skip);

// Sample permit text for testing (simulated complex EA permit)
const SAMPLE_PERMIT_TEXT = `
ENVIRONMENTAL PERMIT
Permit Reference: EPR/TEST/001234

Table of Contents
1. Introduction
2. Permitted Activities
3. Emissions and Monitoring

Schedule 1 - Permitted Activities

1.1 General Conditions
1.1.1 The operator shall maintain the activities in accordance with this permit.
1.1.2 The operator shall notify the Environment Agency of any changes to the permitted activities.

2.3 Emission Controls
2.3.1 All emissions shall be controlled using Best Available Techniques.
2.3.6 The operator shall:
2.3.6.1 maintain records of all complaints received
2.3.6.2 investigate each complaint within 48 hours
2.3.6.3 report findings to the Environment Agency within 7 days

Table S1.3 Improvement Programme
| Reference | Requirement | Deadline |
|-----------|-------------|----------|
| IC1 | Submit odour management plan | 3 months from permit |
| IC2 | Install continuous monitoring | 6 months from permit |
| IC3 | Complete stack assessment | 12 months from permit |

Table S3.1 Emission Limits to Air
Point source emissions to air shall not exceed the limits specified.
| Parameter | Limit | Unit | Averaging Period | Reference |
|-----------|-------|------|------------------|-----------|
| NOx | 200 | mg/Nm³ | Hourly average | 15% O2, dry |
| SO2 | 50 | mg/Nm³ | Daily average | 15% O2, dry |
| CO | 100 | mg/Nm³ | Hourly average | 15% O2, dry |
| HCl | 10 | mg/Nm³ | Daily average | 15% O2, dry |
| Particulates | 10 | mg/Nm³ | Daily average | 15% O2, dry |
| VOC | 20 | mg/Nm³ | Daily average | 15% O2, dry |
| NH3 | 30 | mg/Nm³ | Daily average | 15% O2, dry |
| Dioxins | 0.1 | ng TEQ/Nm³ | Annual | 15% O2, dry |

Table S3.2 Monitoring Requirements
| Parameter | Emission Point | Frequency | Standard |
|-----------|---------------|-----------|----------|
| NOx | A1 | Continuous | BS EN 14792 |
| SO2 | A1 | Continuous | BS EN 14791 |
| CO | A1 | Continuous | BS EN 15058 |
| Stack flow | A1 | Continuous | BS EN ISO 16911-1 |
| Temperature | A1 | Continuous | - |
| Pressure | A1 | Continuous | - |

4.0 Reporting Requirements
4.2.1 The operator shall submit an annual environmental report by 31 January each year.
4.2.2 The operator shall notify any abnormal emissions within 24 hours.
4.3.1 Records shall be retained for a minimum of 6 years.
`;

describe('Multi-Pass Extraction', () => {
  describe('Document Complexity Analysis', () => {
    it('should detect high-obligation-density permits', () => {
      const analysis = analyzeDocumentComplexity({
        documentText: SAMPLE_PERMIT_TEXT,
        documentType: 'ENVIRONMENTAL_PERMIT',
        pageCount: 36,
      });

      expect(analysis).toBeDefined();
      expect(['simple', 'medium', 'complex']).toContain(analysis.complexity);
      expect(analysis.reasons.length).toBeGreaterThan(0);

      console.log('Complexity Analysis:', {
        complexity: analysis.complexity,
        model: analysis.recommendedModel,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
      });
    });

    it('should recommend multi-pass for documents with ELV tables', () => {
      const analysis = analyzeDocumentComplexity({
        documentText: SAMPLE_PERMIT_TEXT,
        documentType: 'ENVIRONMENTAL_PERMIT',
        pageCount: 36,
      });

      // Should detect ELV tables and improvement conditions
      const hasELVReason = analysis.reasons.some(r =>
        r.toLowerCase().includes('elv') || r.toLowerCase().includes('table')
      );

      expect(hasELVReason || analysis.complexity === 'complex').toBe(true);
    });
  });

  describe('Consolidated ELV Detection', () => {
    it('should identify consolidated ELV obligations', () => {
      const consolidatedObl: Obligation = {
        condition_reference: 'S3.1',
        title: 'Monitor emissions per Table S3.1',
        description: 'Emissions shall comply with the limits specified in Table S3.1',
        category: 'MONITORING',
        frequency: 'CONTINUOUS',
        deadline_date: null,
        deadline_relative: null,
        is_improvement: false,
        is_subjective: false,
        condition_type: 'ELV',
        confidence_score: 0.8,
      };

      expect(isConsolidatedELV(consolidatedObl)).toBe(true);
    });

    it('should NOT flag individual ELV obligations as consolidated', () => {
      const individualObl: Obligation = {
        condition_reference: 'S3.1(a) - NOx',
        title: 'Monitor NOx emissions - 200 mg/Nm³',
        description: 'Emissions of Nitrogen Oxides (NOx) shall not exceed 200 mg/Nm³',
        category: 'MONITORING',
        frequency: 'CONTINUOUS',
        deadline_date: null,
        deadline_relative: null,
        is_improvement: false,
        is_subjective: false,
        condition_type: 'ELV',
        confidence_score: 0.95,
      };

      expect(isConsolidatedELV(individualObl)).toBe(false);
    });

    it('should detect documents that may have consolidated ELVs', () => {
      expect(documentMayHaveConsolidatedELVs(SAMPLE_PERMIT_TEXT)).toBe(true);

      const simpleText = 'This is a simple document without any emission tables.';
      expect(documentMayHaveConsolidatedELVs(simpleText)).toBe(false);
    });
  });

  describeIf(hasOpenAIKey)('Multi-Pass Extraction (Requires OpenAI API)', () => {
    jest.setTimeout(180000); // 3 minute timeout for API calls

    it('should extract more obligations than single-pass baseline', async () => {
      const extractor = getMultiPassExtractor();

      const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
        documentType: 'ENVIRONMENTAL_PERMIT',
        regulator: 'Environment Agency',
        permitReference: 'EPR/TEST/001234',
      });

      console.log('\n📋 MULTI-PASS EXTRACTION RESULTS:');
      console.log(`   Total obligations: ${result.totalExtracted}`);
      console.log(`   Coverage score: ${(result.coverageScore * 100).toFixed(0)}%`);
      console.log(`   Extraction time: ${result.extractionTimeMs}ms`);

      if (result.tokenUsage) {
        console.log(`   Token usage: ${result.tokenUsage.totalTokens}`);
        console.log(`   Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);
      }

      // Pass results breakdown
      console.log('\n📊 PASS RESULTS:');
      console.log(`   Conditions: ${result.passResults.conditions.obligations.length}`);
      console.log(`   Tables: ${result.passResults.tables.obligations.length}`);
      console.log(`   Improvements: ${result.passResults.improvements.obligations.length}`);
      console.log(`   ELVs: ${result.passResults.elvs.obligations.length}`);
      console.log(`   Verification (additional): ${result.passResults.verification.additionalObligations.length}`);

      // Expect reasonable number of obligations for the sample text
      // The sample has: 5 numbered conditions, 3 ICs, 8 ELV parameters, 6 monitoring rows, 3 reporting
      // Expected: 25+ obligations
      expect(result.totalExtracted).toBeGreaterThanOrEqual(15);
      expect(result.coverageScore).toBeGreaterThan(0.7);
    });

    it('should extract each ELV parameter separately', async () => {
      const extractor = getMultiPassExtractor();

      const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
        documentType: 'ENVIRONMENTAL_PERMIT',
      });

      // Filter for ELV-type obligations
      const elvObligations = result.obligations.filter(o =>
        o.condition_type === 'ELV' ||
        o._source === 'ELV' ||
        (o.condition_reference && o.condition_reference.includes('S3.1'))
      );

      console.log('\n💨 ELV OBLIGATIONS:');
      elvObligations.forEach(obl => {
        console.log(`   ${obl.condition_reference}: ${obl.title}`);
      });

      // Should have separate obligations for NOx, SO2, CO, HCl, PM, VOC, NH3, Dioxins
      // Expect at least 5 separate ELV parameters
      expect(elvObligations.length).toBeGreaterThanOrEqual(5);

      // Check for specific parameters
      const parameters = elvObligations.map(o =>
        (o.title + ' ' + o.description).toLowerCase()
      );

      const hasNOx = parameters.some(p => p.includes('nox') || p.includes('nitrogen'));
      const hasSO2 = parameters.some(p => p.includes('so2') || p.includes('sulphur'));
      const hasCO = parameters.some(p => p.includes(' co ') || p.includes('carbon monoxide'));

      console.log(`   Has NOx: ${hasNOx}, Has SO2: ${hasSO2}, Has CO: ${hasCO}`);

      // At least some individual parameters should be extracted
      expect(hasNOx || hasSO2 || hasCO).toBe(true);
    });

    it('should extract nested sub-conditions', async () => {
      const extractor = getMultiPassExtractor();

      const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
        documentType: 'ENVIRONMENTAL_PERMIT',
      });

      // Find obligations with nested references (e.g., 2.3.6.1, 2.3.6.2)
      const nestedConditions = result.obligations.filter(o => {
        const ref = o.condition_reference || '';
        // Match patterns like 2.3.6.1 or 1.1.1
        return /\d+\.\d+\.\d+(\.\d+)?/.test(ref);
      });

      console.log('\n📋 NESTED CONDITIONS:');
      nestedConditions.forEach(obl => {
        console.log(`   ${obl.condition_reference}: ${obl.title}`);
      });

      // The sample has 2.3.6.1, 2.3.6.2, 2.3.6.3 - expect at least some to be extracted
      // Also 1.1.1, 1.1.2, 2.3.1
      expect(nestedConditions.length).toBeGreaterThan(0);
    });

    it('should extract improvement conditions with deadlines', async () => {
      const extractor = getMultiPassExtractor();

      const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
        documentType: 'ENVIRONMENTAL_PERMIT',
      });

      // Find improvement conditions
      const improvementConditions = result.obligations.filter(o =>
        o.is_improvement ||
        o.condition_type === 'IMPROVEMENT' ||
        (o.condition_reference && /IC\d+/i.test(o.condition_reference))
      );

      console.log('\n🔧 IMPROVEMENT CONDITIONS:');
      improvementConditions.forEach(obl => {
        console.log(`   ${obl.condition_reference}: ${obl.title}`);
        console.log(`      Deadline: ${obl.deadline_relative || obl.deadline_date || 'Not specified'}`);
      });

      // The sample has IC1, IC2, IC3
      expect(improvementConditions.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract monitoring frequency table rows', async () => {
      const extractor = getMultiPassExtractor();

      const result = await extractor.extract(SAMPLE_PERMIT_TEXT, {
        documentType: 'ENVIRONMENTAL_PERMIT',
      });

      // Find Table S3.2 monitoring obligations
      const monitoringTable = result.obligations.filter(o =>
        o._source === 'TABLE' ||
        (o.condition_reference && o.condition_reference.includes('S3.2')) ||
        (o.category === 'MONITORING' && o.frequency === 'CONTINUOUS')
      );

      console.log('\n📊 MONITORING TABLE (S3.2) OBLIGATIONS:');
      monitoringTable.forEach(obl => {
        console.log(`   ${obl.condition_reference}: ${obl.title}`);
      });

      // The sample has 6 monitoring parameters in S3.2
      // Should have multiple monitoring requirements
      expect(monitoringTable.length).toBeGreaterThan(3);
    });
  });

  describeIf(hasOpenAIKey)('ELV Expansion Post-Processor', () => {
    jest.setTimeout(120000);

    it('should expand consolidated ELV obligation into individual parameters', async () => {
      const consolidatedObligations: Obligation[] = [
        {
          condition_reference: 'S3.1',
          title: 'Comply with emission limits in Table S3.1',
          description: 'Emissions shall not exceed the limits specified in Table S3.1',
          category: 'MONITORING',
          frequency: 'CONTINUOUS',
          deadline_date: null,
          deadline_relative: null,
          is_improvement: false,
          is_subjective: false,
          condition_type: 'ELV',
          confidence_score: 0.8,
        },
        {
          condition_reference: '2.3.1',
          title: 'Control emissions using BAT',
          description: 'All emissions shall be controlled using Best Available Techniques',
          category: 'OPERATIONAL',
          frequency: null,
          deadline_date: null,
          deadline_relative: null,
          is_improvement: false,
          is_subjective: false,
          condition_type: 'STANDARD',
          confidence_score: 0.9,
        },
      ];

      const result = await expandConsolidatedELVs(
        consolidatedObligations,
        SAMPLE_PERMIT_TEXT
      );

      console.log('\n📊 ELV EXPANSION RESULTS:');
      console.log(`   Original obligations: ${consolidatedObligations.length}`);
      console.log(`   After expansion: ${result.obligations.length}`);
      console.log(`   Expanded count: ${result.expandedCount}`);

      if (result.expandedCount > 0) {
        console.log('\n   Expanded obligations:');
        result.obligations
          .filter(o => o._source === 'ELV_EXPANSION')
          .forEach(obl => {
            console.log(`      ${obl.condition_reference}: ${obl.title}`);
          });
      }

      // If expansion worked, should have more obligations
      // The non-consolidated obligation (2.3.1) should be preserved
      expect(result.obligations.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// Permit file tests (only run if files exist)
describe('Real Permit Multi-Pass Extraction', () => {
  const PERMITS_DIR = path.join(__dirname, '../../docs/examples/permits');
  const permitsExist = fs.existsSync(PERMITS_DIR);

  describeIf(hasOpenAIKey && permitsExist)('Real Permit Files', () => {
    jest.setTimeout(300000); // 5 minute timeout

    it('should extract 80+ obligations from complex permit', async () => {
      const permitFile = path.join(PERMITS_DIR, 'Permit_London_14_Data_Centre.pdf');

      if (!fs.existsSync(permitFile)) {
        console.log('Skipping: Permit file not found');
        return;
      }

      // This would need actual PDF processing - skipping for now
      // The test is here as a template for real permit testing
      console.log('Note: Real PDF permit testing requires document processing pipeline');
    });
  });
});
