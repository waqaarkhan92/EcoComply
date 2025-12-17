/**
 * Multi-Pass Extraction Strategy
 *
 * Breaks extraction into specialized passes, each optimized for specific content types:
 * - Pass 1: Main numbered conditions (1.1.1, 2.3.4, etc.)
 * - Pass 2: Tables (S1.2, S1.3, S1.4, S3.1, S3.2, etc.)
 * - Pass 3: Improvement conditions (IC1-ICn)
 * - Pass 4: Emission Limit Values (each parameter separately)
 * - Pass 5: Verification pass (check for missed obligations)
 *
 * Expected Impact: +15-20% coverage (75 → 90-95 obligations)
 * Reference: EXTRACTION_IMPROVEMENT_RECOMMENDATIONS.md Solution 1
 */

import OpenAI from 'openai';
import {
  Obligation,
  PassResult,
  VerificationResult,
  MultiPassExtractionResult,
  ExtractionOptions,
  ELVData,
  LoadedPrompt,
} from './types';
import { estimateCost, type AIModel } from '../model-router';
import { updateExtractionProgress } from '@/lib/services/extraction-progress-service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Timeout configuration
const API_TIMEOUT_MS = 45000; // 45 seconds per API call

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Safe JSON parse with recovery for truncated/malformed responses
 * Ported from document-processor.ts for consistency
 */
function safeJSONParse(content: string, fallbackKey: string = 'obligations'): any {
  // Clean the response - remove markdown code blocks if present
  let cleanedContent = content.trim();

  // Remove markdown code blocks (```json ... ```)
  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  }

  // Try direct parse first
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError: any) {
    console.warn(`⚠️ JSON parsing failed, attempting recovery: ${parseError.message}`);

    // Try to extract partial data from truncated JSON
    const arrayStart = cleanedContent.indexOf(`"${fallbackKey}"`);
    if (arrayStart === -1) {
      // Return empty structure if we can't find the key
      return { [fallbackKey]: [], metadata: { extraction_confidence: 0.5, recovered: true } };
    }

    // Find the opening bracket of the array
    const bracketStart = cleanedContent.indexOf('[', arrayStart);
    if (bracketStart === -1) {
      return { [fallbackKey]: [], metadata: { extraction_confidence: 0.5, recovered: true } };
    }

    // Extract complete objects from the array
    const items: any[] = [];
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let currentObj = '';
    let braceDepth = 0;

    for (let i = bracketStart + 1; i < cleanedContent.length; i++) {
      const char = cleanedContent[i];

      if (escapeNext) {
        currentObj += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        currentObj += char;
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        currentObj += char;
        continue;
      }

      if (inString) {
        currentObj += char;
        continue;
      }

      if (char === '{') {
        braceDepth++;
        currentObj += char;
        continue;
      }

      if (char === '}') {
        braceDepth--;
        currentObj += char;
        if (braceDepth === 0 && currentObj.trim()) {
          // Complete object found
          try {
            const obj = JSON.parse(currentObj.trim());
            items.push(obj);
            currentObj = '';
          } catch {
            // Skip malformed object
            currentObj = '';
          }
        }
        continue;
      }

      if (char === ']' && braceDepth === 0) {
        // End of array
        break;
      }

      if (char === ',' && braceDepth === 0) {
        // Reset for next object
        currentObj = '';
        continue;
      }

      if (braceDepth > 0) {
        currentObj += char;
      }
    }

    if (items.length > 0) {
      console.log(`✅ Recovered ${items.length} items from truncated JSON`);
      return {
        [fallbackKey]: items,
        metadata: { extraction_confidence: 0.7, recovered: true, recovered_count: items.length }
      };
    }

    // Complete failure - return empty
    console.warn('❌ JSON recovery failed completely');
    return { [fallbackKey]: [], metadata: { extraction_confidence: 0.3, recovered: true, failed: true } };
  }
}

export class MultiPassExtractor {
  private totalTokensUsed = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCost = 0;
  private currentPrompt: LoadedPrompt | null = null;

  /**
   * Execute multi-pass extraction strategy
   * Each pass focuses on a specific obligation type
   */
  async extract(
    documentText: string,
    options: ExtractionOptions
  ): Promise<MultiPassExtractionResult> {
    const startTime = Date.now();
    const documentId = options.documentId;

    console.log('🔄 Starting multi-pass extraction...');
    console.log(`   Document length: ${documentText.length} characters`);

    // Publish initial progress
    if (documentId) {
      await updateExtractionProgress(documentId, {
        status: 'extracting_obligations',
        progress: 10,
        currentPass: 'Starting multi-pass extraction...',
        obligationsFound: 0,
        startedAt: new Date().toISOString(),
      }).catch(err => console.error('Failed to update progress:', err));
    }

    // Store loaded prompt for use in passes
    this.currentPrompt = options.loadedPrompt || null;
    if (this.currentPrompt) {
      console.log(`📋 Using jurisdiction-specific prompt: ${this.currentPrompt.promptId} v${this.currentPrompt.version}`);
      console.log(`   Loaded from: ${this.currentPrompt.loadedFrom}`);
    } else {
      console.log(`⚠️  No jurisdiction prompt loaded - using hardcoded prompts`);
    }

    // Reset token counters
    this.totalTokensUsed = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCost = 0;

    const passResults: MultiPassExtractionResult['passResults'] = {
      conditions: { obligations: [], confidence: 0, duration: 0 },
      tables: { obligations: [], confidence: 0, duration: 0 },
      improvements: { obligations: [], confidence: 0, duration: 0 },
      elvs: { obligations: [], confidence: 0, duration: 0 },
      verification: { additionalObligations: [], estimatedCoverage: 0, gaps: [], recommendations: [] },
    };

    let allObligations: Obligation[] = [];

    // PARALLEL EXECUTION: Run passes 1-4 concurrently for speed
    console.log('⚡ Running passes 1-4 in parallel...');
    if (documentId) {
      await updateExtractionProgress(documentId, {
        progress: 15,
        currentPass: 'Pass 1-4: Running in parallel...',
        obligationsFound: 0,
      }).catch(err => console.error('Failed to update progress:', err));
    }
    const parallelStart = Date.now();

    // Track progress from parallel passes
    let passesCompleted = 0;
    let runningTotal = 0;

    const [conditionsResult, tablesResult, improvementsResult, elvsResult] = await Promise.all([
      // PASS 1: Main conditions (1.1.1, 2.3.4, etc.)
      this.extractConditions(documentText, options).then(async result => {
        passesCompleted++;
        runningTotal += result.obligations.length;
        if (documentId) {
          await updateExtractionProgress(documentId, {
            progress: 15 + (passesCompleted * 15),
            currentPass: `Pass 1 complete: ${result.obligations.length} conditions`,
            obligationsFound: runningTotal,
          }).catch(err => console.error('Failed to update progress:', err));
        }
        return result;
      }).catch((error: any) => {
        console.error(`   ❌ Pass 1 failed: ${error.message}`);
        passesCompleted++;
        return { obligations: [], confidence: 0, duration: 0 };
      }),
      // PASS 2: Tables (S1.2, S1.3, S1.4, S3.1, S3.2, etc.)
      this.extractTables(documentText, options).then(async result => {
        passesCompleted++;
        runningTotal += result.obligations.length;
        if (documentId) {
          await updateExtractionProgress(documentId, {
            progress: 15 + (passesCompleted * 15),
            currentPass: `Pass 2 complete: ${result.obligations.length} table items`,
            obligationsFound: runningTotal,
          }).catch(err => console.error('Failed to update progress:', err));
        }
        return result;
      }).catch((error: any) => {
        console.error(`   ❌ Pass 2 failed: ${error.message}`);
        passesCompleted++;
        return { obligations: [], confidence: 0, duration: 0 };
      }),
      // PASS 3: Improvement conditions (IC1-ICn)
      this.extractImprovements(documentText, options).then(async result => {
        passesCompleted++;
        runningTotal += result.obligations.length;
        if (documentId) {
          await updateExtractionProgress(documentId, {
            progress: 15 + (passesCompleted * 15),
            currentPass: `Pass 3 complete: ${result.obligations.length} improvements`,
            obligationsFound: runningTotal,
          }).catch(err => console.error('Failed to update progress:', err));
        }
        return result;
      }).catch((error: any) => {
        console.error(`   ❌ Pass 3 failed: ${error.message}`);
        passesCompleted++;
        return { obligations: [], confidence: 0, duration: 0 };
      }),
      // PASS 4: Emission Limit Values (each parameter separately)
      this.extractELVs(documentText, options).then(async result => {
        passesCompleted++;
        runningTotal += result.obligations.length;
        if (documentId) {
          await updateExtractionProgress(documentId, {
            progress: 15 + (passesCompleted * 15),
            currentPass: `Pass 4 complete: ${result.obligations.length} ELV parameters`,
            obligationsFound: runningTotal,
          }).catch(err => console.error('Failed to update progress:', err));
        }
        return result;
      }).catch((error: any) => {
        console.error(`   ❌ Pass 4 failed: ${error.message}`);
        passesCompleted++;
        return { obligations: [], confidence: 0, duration: 0 };
      }),
    ]);

    const parallelDuration = Date.now() - parallelStart;
    console.log(`⚡ Parallel passes completed in ${(parallelDuration / 1000).toFixed(1)}s`);

    // Collect results
    passResults.conditions = conditionsResult;
    passResults.tables = tablesResult;
    passResults.improvements = improvementsResult;
    passResults.elvs = elvsResult;

    console.log(`   📋 Pass 1: ${conditionsResult.obligations.length} conditions`);
    console.log(`   📊 Pass 2: ${tablesResult.obligations.length} table obligations`);
    console.log(`   🔧 Pass 3: ${improvementsResult.obligations.length} improvements`);
    console.log(`   💨 Pass 4: ${elvsResult.obligations.length} ELV obligations`);

    allObligations.push(
      ...conditionsResult.obligations,
      ...tablesResult.obligations,
      ...improvementsResult.obligations,
      ...elvsResult.obligations
    );

    // PASS 5: Verification pass (check for missed obligations) - runs after passes 1-4
    console.log('🔍 Pass 5: Verification and gap analysis...');
    if (documentId) {
      await updateExtractionProgress(documentId, {
        progress: 80,
        currentPass: 'Pass 5: Verification and gap analysis...',
        obligationsFound: allObligations.length,
      }).catch(err => console.error('Failed to update progress:', err));
    }

    try {
      const verificationResult = await this.verifyExtraction(
        documentText,
        allObligations,
        options
      );
      passResults.verification = verificationResult;

      // Add any additional obligations found during verification
      if (verificationResult.additionalObligations.length > 0) {
        console.log(`   ⚠️  Found ${verificationResult.additionalObligations.length} missed obligations`);
        allObligations.push(...verificationResult.additionalObligations);
      }
    } catch (error: any) {
      console.error(`   ❌ Pass 5 failed: ${error.message}`);
      passResults.verification = {
        additionalObligations: [],
        estimatedCoverage: 0.8,
        gaps: [],
        recommendations: [],
      };
    }

    // Deduplicate obligations
    const deduplicatedObligations = this.deduplicateObligations(allObligations);
    const totalExtracted = deduplicatedObligations.length;
    const coverageScore = passResults.verification.estimatedCoverage || 0.85;

    // Publish final progress before returning
    if (documentId) {
      await updateExtractionProgress(documentId, {
        status: 'creating_obligations',
        progress: 95,
        currentPass: `Creating ${totalExtracted} obligations in database...`,
        obligationsFound: totalExtracted,
      }).catch(err => console.error('Failed to update progress:', err));
    }

    console.log('✅ Multi-pass extraction complete');
    console.log(`   Total obligations (before dedup): ${allObligations.length}`);
    console.log(`   Total obligations (after dedup): ${totalExtracted}`);
    console.log(`   Estimated coverage: ${(coverageScore * 100).toFixed(0)}%`);
    console.log(`   Total tokens used: ${this.totalTokensUsed}`);
    console.log(`   Total cost: $${this.totalCost.toFixed(4)}`);

    return {
      obligations: deduplicatedObligations,
      passResults,
      totalExtracted,
      coverageScore,
      extractionTimeMs: Date.now() - startTime,
      tokenUsage: {
        inputTokens: this.totalInputTokens,
        outputTokens: this.totalOutputTokens,
        totalTokens: this.totalTokensUsed,
        model: 'multi-pass (gpt-4o + gpt-4o-mini)',
        estimatedCost: this.totalCost,
      },
    };
  }

  /**
   * PASS 1: Extract numbered conditions
   */
  private async extractConditions(
    documentText: string,
    options: ExtractionOptions
  ): Promise<PassResult> {
    const startTime = Date.now();
    const prompt = this.buildConditionsPrompt();

    // Use first 50k characters for conditions pass
    const textToProcess = documentText.substring(0, 50000);

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Switched to mini for speed (was gpt-4o)
        messages: [
          { role: 'system', content: prompt.systemMessage },
          { role: 'user', content: `Extract all numbered conditions:\n\n${textToProcess}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 16000,
      }),
      API_TIMEOUT_MS,
      'Pass 1 (conditions)'
    );

    // Track token usage
    if (response.usage) {
      this.totalInputTokens += response.usage.prompt_tokens;
      this.totalOutputTokens += response.usage.completion_tokens;
      this.totalTokensUsed += response.usage.total_tokens;
      this.totalCost += estimateCost('gpt-4o' as AIModel, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content, 'obligations'); // Use safe parser with recovery

    return {
      obligations: this.normalizeObligations(parsed.obligations || [], 'CONDITION'),
      confidence: parsed.metadata?.extraction_confidence || 0.8,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PASS 2: Extract table obligations with row-by-row detail
   */
  private async extractTables(
    documentText: string,
    options: ExtractionOptions
  ): Promise<PassResult> {
    const startTime = Date.now();

    // Extract table sections only
    const tableSections = this.extractTableSections(documentText);

    if (tableSections.length === 0) {
      console.log('   No table sections found');
      return { obligations: [], confidence: 1.0, duration: Date.now() - startTime };
    }

    console.log(`   Found ${tableSections.length} table sections`);
    const prompt = this.buildTablesPrompt();

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Switched from gpt-4o for speed
        messages: [
          { role: 'system', content: prompt.systemMessage },
          { role: 'user', content: `Extract EVERY row from these tables:\n\n${tableSections.join('\n\n---TABLE BREAK---\n\n')}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Lower temp for structured data
        max_tokens: 12000,
      }),
      API_TIMEOUT_MS,
      'Pass 2 (tables)'
    );

    // Track token usage
    if (response.usage) {
      this.totalInputTokens += response.usage.prompt_tokens;
      this.totalOutputTokens += response.usage.completion_tokens;
      this.totalTokensUsed += response.usage.total_tokens;
      this.totalCost += estimateCost('gpt-4o-mini' as AIModel, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content, 'obligations'); // Use safe parser with recovery

    return {
      obligations: this.normalizeObligations(parsed.obligations || [], 'TABLE'),
      confidence: parsed.metadata?.extraction_confidence || 0.85,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PASS 3: Extract improvement conditions
   */
  private async extractImprovements(
    documentText: string,
    options: ExtractionOptions
  ): Promise<PassResult> {
    const startTime = Date.now();

    // Find improvement section
    const improvementSection = this.extractImprovementSection(documentText);

    if (!improvementSection) {
      console.log('   No improvement section found');
      return { obligations: [], confidence: 1.0, duration: Date.now() - startTime };
    }

    console.log(`   Found improvement section (${improvementSection.length} chars)`);
    const prompt = this.buildImprovementsPrompt();

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt.systemMessage },
          { role: 'user', content: `Extract all improvement conditions:\n\n${improvementSection}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4000,
      }),
      API_TIMEOUT_MS,
      'Pass 3 (improvements)'
    );

    // Track token usage
    if (response.usage) {
      this.totalInputTokens += response.usage.prompt_tokens;
      this.totalOutputTokens += response.usage.completion_tokens;
      this.totalTokensUsed += response.usage.total_tokens;
      this.totalCost += estimateCost('gpt-4o-mini' as AIModel, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content, 'improvement_conditions'); // Use safe parser with recovery

    // Map improvement conditions to standard obligation format
    const obligations = (parsed.improvement_conditions || []).map((ic: any) => ({
      condition_reference: ic.condition_reference || ic.ic_reference,
      title: ic.title || ic.description?.substring(0, 60) || 'Improvement Condition',
      description: ic.description || ic.text,
      category: 'OPERATIONAL' as const,
      frequency: 'ONE_TIME',
      deadline_date: ic.deadline_date,
      deadline_relative: ic.deadline_text || ic.deadline_relative,
      is_improvement: true,
      is_subjective: false,
      condition_type: 'IMPROVEMENT' as const,
      confidence_score: ic.confidence_score || 0.9,
      evidence_suggestions: ic.evidence_required || [],
    }));

    return {
      obligations: this.normalizeObligations(obligations, 'IMPROVEMENT'),
      confidence: 0.9,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PASS 4: Extract individual ELV parameters
   */
  private async extractELVs(
    documentText: string,
    options: ExtractionOptions
  ): Promise<PassResult> {
    const startTime = Date.now();

    // Extract ELV sections (Table S3.1, etc.)
    const elvSections = this.extractELVSections(documentText);

    if (elvSections.length === 0) {
      console.log('   No ELV sections found');
      return { obligations: [], confidence: 1.0, duration: Date.now() - startTime };
    }

    console.log(`   Found ${elvSections.length} ELV sections`);
    const prompt = this.buildELVPrompt();

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Switched from gpt-4o for speed
        messages: [
          { role: 'system', content: prompt.systemMessage },
          { role: 'user', content: `Extract EACH parameter as a separate obligation:\n\n${elvSections.join('\n\n---ELV SECTION BREAK---\n\n')}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 8000,
      }),
      API_TIMEOUT_MS,
      'Pass 4 (ELVs)'
    );

    // Track token usage
    if (response.usage) {
      this.totalInputTokens += response.usage.prompt_tokens;
      this.totalOutputTokens += response.usage.completion_tokens;
      this.totalTokensUsed += response.usage.total_tokens;
      this.totalCost += estimateCost('gpt-4o-mini' as AIModel, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content, 'elvs'); // Use safe parser with recovery

    // Convert ELVs to monitoring obligations
    const obligations = (parsed.elvs || []).map((elv: ELVData) => ({
      condition_reference: `${elv.condition_reference || elv.emission_point || 'S3.1'} - ${elv.parameter}`,
      title: `Monitor ${elv.parameter_name || elv.parameter} - ${elv.limit_value} ${elv.unit}`,
      description: `Emission limit: ${elv.parameter_name || elv.parameter} shall not exceed ${elv.limit_value} ${elv.unit} (${elv.averaging_period}${elv.reference_conditions ? ', ' + elv.reference_conditions : ''})`,
      category: 'MONITORING' as const,
      frequency: this.inferMonitoringFrequency(elv.averaging_period),
      deadline_date: elv.compliance_date,
      deadline_relative: null,
      is_improvement: false,
      is_subjective: false,
      condition_type: 'ELV' as const,
      confidence_score: elv.confidence_score || 0.9,
      elv_limit: `${elv.limit_value} ${elv.unit}`,
      metadata: { elv_data: elv },
    }));

    return {
      obligations: this.normalizeObligations(obligations, 'ELV'),
      confidence: 0.85,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PASS 5: Verification pass - check for missed obligations
   */
  private async verifyExtraction(
    documentText: string,
    extractedObligations: Obligation[],
    options: ExtractionOptions
  ): Promise<VerificationResult> {
    const prompt = this.buildVerificationPrompt(extractedObligations);

    // Use first 30k chars for verification
    const textToProcess = documentText.substring(0, 30000);

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt.systemMessage },
          {
            role: 'user',
            content: `Document (first 30k chars):\n${textToProcess}\n\nExtracted ${extractedObligations.length} obligations. Find any missed obligations.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      }),
      API_TIMEOUT_MS,
      'Pass 5 (verification)'
    );

    // Track token usage
    if (response.usage) {
      this.totalInputTokens += response.usage.prompt_tokens;
      this.totalOutputTokens += response.usage.completion_tokens;
      this.totalTokensUsed += response.usage.total_tokens;
      this.totalCost += estimateCost('gpt-4o-mini' as AIModel, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content, 'missed_obligations'); // Use safe parser with recovery

    return {
      additionalObligations: this.normalizeObligations(
        parsed.missed_obligations || [],
        'VERIFICATION'
      ),
      estimatedCoverage: parsed.estimated_coverage || 0.85,
      gaps: parsed.gaps || [],
      recommendations: parsed.recommendations || [],
    };
  }

  /**
   * Extract table sections from document
   */
  private extractTableSections(documentText: string): string[] {
    const sections: string[] = [];

    // Table patterns to look for - broader patterns
    const tablePatterns = [
      // Standard EA table references
      /Table\s+S1\.2[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S1\.3[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S1\.4[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S3\.1[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S3\.2[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S3\.3[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      /Table\s+S3\.4[\s\S]{0,10000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z]|\n\n\n)/gim,
      // Schedule tables
      /Schedule\s+\d+[\s\S]{0,15000}?(?=Schedule\s+\d|Annex|Appendix|\n\n\n\n)/gim,
    ];

    for (const pattern of tablePatterns) {
      const matches = documentText.match(pattern);
      if (matches) {
        sections.push(...matches.map(m => m.trim()).filter(m => m.length > 100));
      }
    }

    // Deduplicate and limit size
    const uniqueSections = Array.from(new Set(sections));
    return uniqueSections.slice(0, 10); // Max 10 table sections
  }

  /**
   * Extract improvement section
   */
  private extractImprovementSection(documentText: string): string | null {
    const patterns = [
      /Table\s+S1\.3[\s\S]{0,15000}?(?=Table\s+S1\.[4-9]|Schedule|^\d+\.\d+\s+[A-Z])/gim,
      /Improvement\s+Programme[\s\S]{0,15000}?(?=Table\s+S|Schedule\s+\d|^\d+\.\d+\s+[A-Z])/gim,
      /IC\d+[\s\S]{0,10000}?(?=Schedule|Annex|^\d+\.\d+\s+[A-Z])/gim,
    ];

    for (const pattern of patterns) {
      const matches = documentText.match(pattern);
      if (matches && matches[0] && matches[0].length > 100) {
        return matches[0].trim();
      }
    }

    // Fallback: look for IC references
    const icPattern = /(?:IC\d+|Improvement\s+Condition)[\s\S]{0,500}/gi;
    const icMatches = documentText.match(icPattern);
    if (icMatches && icMatches.length > 0) {
      return icMatches.join('\n\n');
    }

    return null;
  }

  /**
   * Extract ELV sections - improved to find actual emission limit tables
   */
  private extractELVSections(documentText: string): string[] {
    const sections: string[] = [];

    // Strategy 1: Find "Schedule 3 – Emissions" section (actual table location)
    const schedule3Match = documentText.match(/Schedule\s+3\s*[–—-]\s*Emissions[\s\S]{0,20000}?(?=Schedule\s+4|Schedule\s+5|Schedule\s+6|Schedule\s+7|END OF PERMIT|$)/gi);
    if (schedule3Match) {
      sections.push(...schedule3Match.map(m => m.trim()).filter(m => m.length > 500));
    }

    // Strategy 2: Find content containing mg/m units (actual ELV data)
    const mgMatch = documentText.match(/(?:Parameter|Emission\s+point)[\s\S]{0,15000}?mg\/m[\s\S]{0,10000}?(?=Schedule\s+\d|Table\s+S4|END OF PERMIT|\n\n\n\n)/gi);
    if (mgMatch) {
      sections.push(...mgMatch.map(m => m.trim()).filter(m => m.length > 500 && m.includes('mg/m')));
    }

    // Strategy 3: Find Table S3.1 with actual table content (has headers like "Parameter", "Limit")
    const tableMatch = documentText.match(/Table\s+S3\.1[^T]*(?:Parameter|Substance|Emission\s+point)[\s\S]{0,15000}?(?=Table\s+S3\.[2-9]|Table\s+S4|Schedule\s+4|\n\n\n\n)/gi);
    if (tableMatch) {
      sections.push(...tableMatch.map(m => m.trim()).filter(m => m.length > 500));
    }

    // Strategy 4: Original patterns as fallback
    const fallbackPatterns = [
      /Emission\s+Limit\s+Values?[\s\S]{0,10000}?(?=Table\s+S|Schedule|^\d+\.\d+\s+[A-Z])/gim,
      /Point\s+Source\s+Emissions?\s+to\s+air[\s\S]{0,15000}?(?=Point\s+Source|Schedule|Table\s+S[4-9])/gim,
    ];

    for (const pattern of fallbackPatterns) {
      const matches = documentText.match(pattern);
      if (matches) {
        sections.push(...matches.map(m => m.trim()).filter(m => m.length > 200));
      }
    }

    // Deduplicate by checking for significant overlap
    const uniqueSections: string[] = [];
    for (const section of sections) {
      const isDuplicate = uniqueSections.some(existing => {
        // Check if >50% of shorter string is contained in longer
        const shorter = section.length < existing.length ? section : existing;
        const longer = section.length < existing.length ? existing : section;
        return longer.includes(shorter.substring(0, shorter.length / 2));
      });
      if (!isDuplicate && section.length > 200) {
        uniqueSections.push(section);
      }
    }

    console.log(`   ELV section extraction: found ${uniqueSections.length} unique sections`);
    return uniqueSections.slice(0, 5); // Max 5 ELV sections
  }

  /**
   * Infer monitoring frequency from averaging period
   */
  private inferMonitoringFrequency(averagingPeriod: string): string {
    if (!averagingPeriod) return 'CONTINUOUS';

    const period = averagingPeriod.toLowerCase();
    if (period.includes('continuous') || period.includes('15_min') || period.includes('15 min') || period.includes('hourly') || period.includes('hour')) {
      return 'CONTINUOUS';
    }
    if (period.includes('daily') || period.includes('24')) return 'DAILY';
    if (period.includes('weekly') || period.includes('week')) return 'WEEKLY';
    if (period.includes('monthly') || period.includes('month')) return 'MONTHLY';
    if (period.includes('quarterly') || period.includes('quarter')) return 'QUARTERLY';
    if (period.includes('annual') || period.includes('year')) return 'ANNUAL';
    return 'CONTINUOUS'; // Default for ELVs
  }

  /**
   * Deduplicate obligations across passes
   */
  private deduplicateObligations(obligations: Obligation[]): Obligation[] {
    const seen = new Map<string, Obligation>();

    for (const obl of obligations) {
      // Create hash from condition reference + description start
      const descStart = (obl.description || '').substring(0, 100).toLowerCase().replace(/\s+/g, ' ').trim();
      const ref = (obl.condition_reference || '').toLowerCase().replace(/\s+/g, '');
      const hash = `${ref}|${descStart}`;

      // Keep the obligation with higher confidence
      if (!seen.has(hash) || (seen.get(hash)!.confidence_score < obl.confidence_score)) {
        seen.set(hash, obl);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Normalize obligations from different passes
   */
  private normalizeObligations(
    obligations: any[],
    source: string
  ): Obligation[] {
    return obligations.map(obl => ({
      condition_reference: obl.condition_reference || null,
      title: obl.title || obl.summary || (obl.description || '').substring(0, 60),
      description: obl.description || obl.text || '',
      original_text: obl.original_text || null, // Grounding - verbatim quote from document
      category: obl.category || 'OPERATIONAL',
      frequency: obl.frequency || null,
      deadline_date: obl.deadline_date || null,
      deadline_relative: obl.deadline_relative || null,
      is_improvement: obl.is_improvement || false,
      is_subjective: obl.is_subjective || false,
      condition_type: obl.condition_type || 'STANDARD',
      confidence_score: obl.confidence_score || 0.7,
      evidence_suggestions: obl.evidence_suggestions || [],
      page_reference: obl.page_reference || null,
      section_reference: obl.section_reference || null, // Section where this was found
      elv_limit: obl.elv_limit || null,
      metadata: obl.metadata || {},
      _source: source,
      _extracted_at: new Date().toISOString(),
    }));
  }

  /**
   * Build conditions extraction prompt
   * Uses jurisdiction-specific prompt if loaded, otherwise falls back to generic
   */
  private buildConditionsPrompt() {
    // If we have a jurisdiction-specific prompt, use it with multi-pass augmentation
    if (this.currentPrompt && this.currentPrompt.systemMessage) {
      const augmentedSystemMessage = `${this.currentPrompt.systemMessage}

--- MULTI-PASS EXTRACTION AUGMENTATION ---
This is Pass 1 of multi-pass extraction. Focus on numbered conditions ONLY.

CRITICAL RULES FOR PASS 1:
1. Extract EVERY numbered condition (1.1.1, 2.3.4, etc.)
2. Extract EVERY sub-condition (2.3.6.1, 2.3.6.2, etc.) as SEPARATE obligations
3. Do NOT consolidate or group conditions

MANDATORY FIELDS (extraction will fail without these):
- original_text: REQUIRED - exact verbatim quote from document (50-200 chars)
- section_reference: REQUIRED - e.g. "Section 2.3", "Condition 2.3.6", "Schedule 1"
- evidence_suggestions: REQUIRED - 1-3 specific evidence types to prove compliance
- page_reference: REQUIRED - extract from [PAGE:N] markers in text (e.g. if condition appears after [PAGE:12], use 12)

OUTPUT JSON FORMAT:
{
  "obligations": [{
    "condition_reference": "2.3.6.1",
    "title": "concise title max 60 chars",
    "description": "full condition text",
    "original_text": "The operator shall maintain records of all complaints received...",
    "section_reference": "Condition 2.3.6.1",
    "page_reference": 8,
    "evidence_suggestions": ["Complaints register", "Investigation reports", "Response correspondence"],
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE|NOTIFICATION",
    "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|CONTINUOUS|EVENT_TRIGGERED|null",
    "condition_type": "STANDARD|NOTIFICATION|RECORD_KEEPING|OPERATIONAL",
    "is_subjective": true/false,
    "confidence_score": 0.00-1.00
  }],
  "metadata": { "total_conditions_found": number, "extraction_confidence": 0.00-1.00 }
}

TARGET: Extract 40-60 numbered conditions.`;

      return { systemMessage: augmentedSystemMessage };
    }

    // Fallback to generic prompt
    return {
      systemMessage: `You are an expert UK environmental permit analyst. Extract ALL numbered conditions.

CRITICAL RULES:
1. Extract EVERY numbered condition (1.1.1, 2.3.4, etc.)
2. Extract EVERY sub-condition (2.3.6.1, 2.3.6.2, etc.) as SEPARATE obligations
3. Do NOT consolidate or group conditions

MANDATORY FIELDS (extraction will fail without these):
- original_text: REQUIRED - exact verbatim quote from permit (50-200 chars)
- section_reference: REQUIRED - e.g. "Condition 2.3.6", "Section 2.3", "Schedule 1"
- evidence_suggestions: REQUIRED - 1-3 specific evidence types to prove compliance
- page_reference: REQUIRED - extract from [PAGE:N] markers in text (e.g. if after [PAGE:8], use 8)

CATEGORIES: MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE, NOTIFICATION
FREQUENCIES: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, BIENNIAL, ONE_TIME, CONTINUOUS, EVENT_TRIGGERED

EXAMPLE:
Input: "2.3.6 The operator shall:
2.3.6.1 maintain records of all complaints
2.3.6.2 investigate each complaint within 48 hours"

Extract as 2 SEPARATE obligations:
[
  {
    "condition_reference": "2.3.6.1",
    "title": "Maintain complaint records",
    "description": "The operator shall maintain records of all complaints received.",
    "original_text": "2.3.6.1 maintain records of all complaints",
    "section_reference": "Condition 2.3.6.1",
    "page_reference": 8,
    "evidence_suggestions": ["Complaints register", "Complaint forms", "Response records"],
    "category": "RECORD_KEEPING",
    "frequency": "EVENT_TRIGGERED",
    "condition_type": "STANDARD",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "2.3.6.2",
    "title": "Investigate complaints within 48 hours",
    "description": "The operator shall investigate each complaint within 48 hours of receipt.",
    "original_text": "2.3.6.2 investigate each complaint within 48 hours",
    "section_reference": "Condition 2.3.6.2",
    "page_reference": 8,
    "evidence_suggestions": ["Investigation reports", "Response timeline logs", "Corrective action records"],
    "category": "OPERATIONAL",
    "frequency": "EVENT_TRIGGERED",
    "condition_type": "STANDARD",
    "confidence_score": 0.95
  }
]

OUTPUT JSON:
{
  "obligations": [{
    "condition_reference": "string - REQUIRED",
    "title": "concise title max 60 chars",
    "description": "full condition text",
    "original_text": "exact quote from permit 50-200 chars - REQUIRED",
    "section_reference": "where found in permit - REQUIRED",
    "page_reference": "number from [PAGE:N] marker - REQUIRED",
    "evidence_suggestions": ["evidence type 1", "evidence type 2"],
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE|NOTIFICATION",
    "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|CONTINUOUS|EVENT_TRIGGERED|null",
    "condition_type": "STANDARD|NOTIFICATION|RECORD_KEEPING|OPERATIONAL",
    "is_subjective": true/false,
    "confidence_score": 0.00-1.00
  }],
  "metadata": { "total_conditions_found": number }
}

TARGET: Extract 40-60 numbered conditions.`,
    };
  }

  /**
   * Build tables extraction prompt
   */
  private buildTablesPrompt() {
    return {
      systemMessage: `You are a UK permit table extraction specialist. Extract EVERY row from permit tables as SEPARATE obligations.

TABLES TO EXTRACT:
- Table S1.2: Operating techniques - each row is ONE obligation
- Table S1.3: Improvement Programme (IC1-ICn) - each row with deadline
- Table S1.4: Pre-operational conditions (PO1-POn) - each row
- Table S3.1: Emission limits - EACH PARAMETER as separate obligation
- Table S3.2: Monitoring frequencies - EACH parameter/frequency row
- Table S3.3/S3.4: Process/waste monitoring - each row

CRITICAL RULES FOR TABLE S3.1 (EMISSION LIMITS):
- Extract EACH parameter (NOx, SO2, CO, HCl, PM, VOC, NH3, etc.) as SEPARATE obligation
- Do NOT group parameters like "Monitor all emissions"
- Include limit value, unit, averaging period, reference conditions
- Create monitoring obligation for each parameter

EXAMPLE TABLE S3.1 EXTRACTION:
Input table:
| Parameter | Limit | Unit | Period |
|-----------|-------|------|--------|
| NOx | 200 | mg/Nm³ | Hourly |
| SO2 | 50 | mg/Nm³ | Daily |
| CO | 100 | mg/Nm³ | Hourly |

Should extract 3 separate obligations:
1. "Monitor NOx - 200 mg/Nm³ hourly"
2. "Monitor SO2 - 50 mg/Nm³ daily"
3. "Monitor CO - 100 mg/Nm³ hourly"

EXAMPLE TABLE S3.2 (MONITORING FREQUENCIES):
| Parameter | Location | Frequency | Standard |
|-----------|----------|-----------|----------|
| NOx | Point A1 | Continuous | BS EN 14792 |
| Stack flow | Point A1 | Continuous | BS EN ISO 16911-1 |

Should extract 2 separate obligations:
1. "Continuously monitor NOx at A1 per BS EN 14792"
2. "Continuously monitor stack flow at A1 per BS EN ISO 16911-1"

MANDATORY FIELDS (extraction will fail without these):
- original_text: REQUIRED - exact verbatim table row from permit
- section_reference: REQUIRED - e.g. "Schedule 3, Table S3.1"
- page_reference: REQUIRED - extract from [PAGE:N] markers in text
- evidence_suggestions: REQUIRED - 1-3 specific evidence types

OUTPUT JSON:
{
  "obligations": [{
    "condition_reference": "Table S3.1 - NOx",
    "title": "Monitor NOx emissions",
    "description": "NOx emissions shall not exceed 200 mg/Nm³ (hourly average, dry, 15% O2)",
    "original_text": "NOx | 200 | mg/Nm³ | Hourly average | Continuous measurement",
    "section_reference": "Schedule 3, Table S3.1",
    "page_reference": 15,
    "evidence_suggestions": ["CEMS data logs", "Calibration certificates", "Exceedance reports"],
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "ELV",
    "table_name": "S3.1",
    "parameter_name": "NOx",
    "limit_value": 200,
    "unit": "mg/Nm³",
    "confidence_score": 0.95
  }],
  "metadata": {
    "tables_found": ["S1.2", "S3.1", "S3.2"],
    "total_rows_extracted": number
  }
}

TARGET: Extract 20-40 table obligations (S3.1 alone should yield 8-15 separate obligations).`,
    };
  }

  /**
   * Build improvements extraction prompt
   */
  private buildImprovementsPrompt() {
    return {
      systemMessage: `You are an improvement condition specialist. Extract ALL improvement conditions with their deadlines.

IDENTIFICATION PATTERNS:
- "Improvement Programme"
- "Table S1.3" (EA standard improvement table)
- "IC1", "IC2", etc. (Improvement Condition references)
- "by [date]"
- "within [timeframe]"

EXTRACTION RULES:
1. Extract EACH improvement condition separately
2. Capture the deadline date (absolute: YYYY-MM-DD)
3. Also capture relative deadline text ("3 months from permit date")

MANDATORY FIELDS (extraction will fail without these):
- original_text: REQUIRED - exact verbatim text from permit
- section_reference: REQUIRED - e.g. "Table S1.3, IC1"
- page_reference: REQUIRED - extract from [PAGE:N] markers in text
- evidence_suggestions: REQUIRED - specific deliverables/evidence needed

OUTPUT JSON:
{
  "improvement_conditions": [{
    "condition_reference": "IC1",
    "title": "Submit EMS report",
    "description": "Submit Environmental Management System report to the Environment Agency",
    "original_text": "IC1 Submit an Environmental Management System report within 3 months of permit issue",
    "section_reference": "Table S1.3, IC1",
    "page_reference": 6,
    "evidence_suggestions": ["EMS report document", "Agency submission receipt", "Acknowledgment letter"],
    "deadline_date": "2025-06-01",
    "deadline_text": "3 months from permit date",
    "confidence_score": 0.95
  }],
  "metadata": {
    "total_improvements": number,
    "earliest_deadline": "YYYY-MM-DD",
    "latest_deadline": "YYYY-MM-DD"
  }
}

TARGET: Extract all IC conditions (typically 3-10 per permit).`,
    };
  }

  /**
   * Build ELV extraction prompt
   */
  private buildELVPrompt() {
    return {
      systemMessage: `You are an ELV extraction specialist. Extract EVERY emission parameter as a SEPARATE monitoring obligation.

PARAMETERS TO EXTRACT (each one separately):
- NOx (Nitrogen Oxides)
- SO2 (Sulphur Dioxide)
- CO (Carbon Monoxide)
- PM (Particulate Matter)
- PM10, PM2.5 (if specified)
- VOC (Volatile Organic Compounds)
- HCl (Hydrogen Chloride)
- HF (Hydrogen Fluoride)
- NH3 (Ammonia)
- TOC (Total Organic Carbon)
- Heavy metals (Cd, Tl, Hg, As, etc.)
- Dioxins/Furans
- Benzene, Toluene (if specified)

FOR EACH PARAMETER:
1. Extract limit value and unit
2. Note averaging period (15_MIN, HOURLY, DAILY, etc.)
3. Capture reference conditions (O2%, temperature, pressure)
4. Identify emission point (A1, Stack 1, etc.)

MANDATORY FIELDS (extraction will fail without these):
- original_text: REQUIRED - exact verbatim table row from permit
- section_reference: REQUIRED - e.g. "Schedule 3, Table S3.1"
- page_reference: REQUIRED - extract from [PAGE:N] markers in text
- evidence_suggestions: REQUIRED - 1-3 specific evidence types for compliance

OUTPUT JSON:
{
  "elvs": [{
    "parameter": "NOx",
    "parameter_name": "Nitrogen Oxides",
    "limit_value": 200,
    "unit": "mg/Nm³",
    "averaging_period": "HOURLY",
    "reference_conditions": "dry, 15% O2, STP",
    "emission_point": "A1",
    "compliance_date": null,
    "condition_reference": "Table S3.1(a)",
    "original_text": "A1 | Nitrogen oxides | 200 mg/m 3 | ½-hr average | Continuous measurement",
    "section_reference": "Schedule 3 – Emissions and monitoring, Table S3.1",
    "page_reference": 15,
    "evidence_suggestions": ["CEMS data export", "Calibration certificate", "Exceedance notification records"],
    "confidence_score": 0.95
  }],
  "metadata": {
    "total_elvs_found": number,
    "parameters_covered": ["NOx", "SO2", "CO"],
    "emission_points": ["A1", "A2"]
  }
}

NOTE: Units in PDFs may appear as "mg/m 3" (with space) - extract as-is from document.

TARGET: 8-20 individual ELV parameters.`,
    };
  }

  /**
   * Build verification prompt
   */
  private buildVerificationPrompt(extractedObligations: Obligation[]) {
    const extractedRefs = extractedObligations
      .map(o => o.condition_reference)
      .filter(Boolean)
      .slice(0, 50) // Limit to first 50 to save tokens
      .join(', ');

    const categoryCounts: Record<string, number> = {};
    extractedObligations.forEach(o => {
      categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
    });

    return {
      systemMessage: `You are a permit extraction verification specialist. Review the document and find obligations that were MISSED.

ALREADY EXTRACTED (${extractedObligations.length} obligations):
References: ${extractedRefs}
Categories: ${JSON.stringify(categoryCounts)}

YOUR TASK:
1. Scan the document for obligations NOT in the extracted list
2. Look for:
   - Numbered conditions with no extracted reference
   - Table rows not captured (especially S3.1, S3.2)
   - Nested sub-conditions (X.Y.Z.1, X.Y.Z.2)
   - Section 4 reporting requirements
   - Record retention periods
   - Notification requirements with timeframes

MANDATORY FIELDS for each missed obligation:
- original_text: REQUIRED - exact verbatim quote from permit
- section_reference: REQUIRED - e.g. "Condition 2.3.6", "Table S3.2"
- page_reference: REQUIRED - extract from [PAGE:N] markers in text
- evidence_suggestions: REQUIRED - 1-3 evidence types

OUTPUT JSON:
{
  "missed_obligations": [{
    "condition_reference": "4.2.1",
    "title": "Submit annual report",
    "description": "Submit annual environmental report to the regulator",
    "original_text": "4.2.1 Submit an annual environmental report by 31 January each year",
    "section_reference": "Section 4.2, Condition 4.2.1",
    "page_reference": 22,
    "evidence_suggestions": ["Annual report document", "Submission receipt", "Email confirmation"],
    "category": "REPORTING",
    "frequency": "ANNUAL",
    "reason_missed": "Located in Section 4, not in main conditions",
    "confidence_score": 0.90
  }],
  "estimated_coverage": 0.85,
  "gaps": [
    "Missing: Table S3.2 monitoring frequencies",
    "Missing: Section 4.2 annual reporting"
  ],
  "recommendations": [
    "Re-extract Table S3.2 with row-by-row detail"
  ]
}

Be thorough - this is the last chance to catch missed obligations.`,
    };
  }
}

// Export singleton
let multiPassExtractor: MultiPassExtractor | null = null;

export function getMultiPassExtractor(): MultiPassExtractor {
  if (!multiPassExtractor) {
    multiPassExtractor = new MultiPassExtractor();
  }
  return multiPassExtractor;
}
