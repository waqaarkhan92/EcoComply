/**
 * Smart Model Router
 *
 * Intelligently routes document extraction to gpt-4o-mini or gpt-4o based on complexity.
 * Expected savings: 5x cost reduction for 50-70% of documents.
 *
 * Cost comparison:
 * - gpt-4o: $2.50/1M input tokens, $10.00/1M output tokens
 * - gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 *
 * Routing logic:
 * - Simple documents (clear structure, standard conditions) → gpt-4o-mini
 * - Complex documents (unstructured, multi-regulator, edge cases) → gpt-4o
 */

export type ModelComplexity = 'simple' | 'medium' | 'complex';
export type AIModel = 'gpt-4o-mini' | 'gpt-4o';

export interface ComplexityAnalysis {
  complexity: ModelComplexity;
  recommendedModel: AIModel;
  confidence: number;
  reasons: string[];
  metrics: {
    pageCount?: number;
    textLength: number;
    structureScore: number;
    regulatorComplexity: number;
    contentComplexity: number;
  };
}

export interface DocumentComplexityOptions {
  documentText: string;
  documentType?: 'ENVIRONMENTAL_PERMIT' | 'TRADE_EFFLUENT_CONSENT' | 'MCPD_REGISTRATION';
  pageCount?: number;
  regulator?: string;
  fileSizeBytes?: number;
}

/**
 * Analyzes document complexity and recommends the optimal model
 */
export function analyzeDocumentComplexity(
  options: DocumentComplexityOptions
): ComplexityAnalysis {
  const { documentText, documentType, pageCount, regulator, fileSizeBytes } = options;

  const reasons: string[] = [];
  let structureScore = 0;
  let regulatorComplexity = 0;
  let contentComplexity = 0;

  // 1. Structure analysis (0-100 score)
  const hasConditionNumbering = /condition\s+\d+/gi.test(documentText);
  const hasTableOfContents = /table of contents/i.test(documentText);
  const hasClearSections = /section\s+\d+|part\s+\d+/gi.test(documentText);
  const hasBulletPoints = /^[\s]*[-•*]\s+/gm.test(documentText);

  if (hasConditionNumbering) {
    structureScore += 40;
    reasons.push('Clear condition numbering detected');
  }
  if (hasTableOfContents) {
    structureScore += 20;
    reasons.push('Table of contents present');
  }
  if (hasClearSections) {
    structureScore += 20;
    reasons.push('Clear section structure');
  }
  if (hasBulletPoints) {
    structureScore += 20;
    reasons.push('Structured bullet points');
  }

  // 2. Regulator complexity analysis (0-100 score)
  const knownSimpleRegulators = [
    'Environment Agency',
    'EA',
    'SEPA',
    'Natural Resources Wales',
    'NRW',
  ];

  const knownComplexRegulators = [
    'HSE',
    'Health and Safety Executive',
    'Local Authority',
    'Multiple',
  ];

  if (regulator) {
    const regulatorLower = regulator.toLowerCase();
    if (knownSimpleRegulators.some(r => regulatorLower.includes(r.toLowerCase()))) {
      regulatorComplexity = 30; // Low complexity
      reasons.push('Standard EA/SEPA permit format');
    } else if (knownComplexRegulators.some(r => regulatorLower.includes(r.toLowerCase()))) {
      regulatorComplexity = 80; // High complexity
      reasons.push('Complex regulator with non-standard formats');
    } else {
      regulatorComplexity = 50; // Unknown regulator - medium
      reasons.push('Unknown regulator format');
    }
  } else {
    regulatorComplexity = 50; // Default to medium if unknown
  }

  // 3. Content complexity analysis (0-100 score)
  const textLength = documentText.length;
  const pageCountEstimate = pageCount || Math.ceil(textLength / 3000); // ~3000 chars per page

  // Length complexity
  let lengthComplexity = 0;
  if (pageCountEstimate <= 20) {
    lengthComplexity = 20;
    reasons.push('Short document (≤20 pages)');
  } else if (pageCountEstimate <= 50) {
    lengthComplexity = 40;
    reasons.push('Medium length (21-50 pages)');
  } else if (pageCountEstimate <= 100) {
    lengthComplexity = 60;
    reasons.push('Long document (51-100 pages)');
  } else {
    lengthComplexity = 80;
    reasons.push('Very long document (>100 pages)');
  }

  // Condition density (conditions per 1000 words)
  const wordCount = documentText.split(/\s+/).length;
  const conditionCount = (documentText.match(/condition\s+\d+/gi) || []).length;
  const conditionDensity = (conditionCount / wordCount) * 1000;

  let densityComplexity = 0;
  if (conditionDensity > 5) {
    densityComplexity = 20; // High density = well structured = simple
    reasons.push('High condition density (well-structured)');
  } else if (conditionDensity > 2) {
    densityComplexity = 40; // Medium density
    reasons.push('Medium condition density');
  } else {
    densityComplexity = 70; // Low density = unstructured = complex
    reasons.push('Low condition density (may be unstructured)');
  }

  // Technical language complexity
  const technicalTerms = [
    'effluent', 'emissions', 'monitoring', 'discharge', 'compliance',
    'BAT', 'BATNEEC', 'IED', 'PPC', 'EPR', 'breakthrough', 'abatement',
    'particulate', 'volatile organic compounds', 'VOC', 'NOx', 'SOx',
  ];

  const technicalTermCount = technicalTerms.filter(term =>
    new RegExp(term, 'gi').test(documentText)
  ).length;

  let technicalComplexity = 0;
  if (technicalTermCount >= 10) {
    technicalComplexity = 60;
    reasons.push('High technical complexity (10+ technical terms)');
  } else if (technicalTermCount >= 5) {
    technicalComplexity = 40;
    reasons.push('Medium technical complexity');
  } else {
    technicalComplexity = 20;
    reasons.push('Low technical complexity');
  }

  // Edge cases that always require gpt-4o
  const hasMultipleRegulators = /multiple.*regulator/i.test(documentText);
  const hasConflictingConditions = /supersedes|replaces|variation/gi.test(documentText);
  const hasComplexCalculations = /formula|calculation|equation/gi.test(documentText);

  // Solution 5: Detect high-obligation-density permits (multi-pass extraction trigger)
  const hasMultipleTables = /Table\s+S[0-9]\.[0-9]/gi.test(documentText);
  const tableCount = (documentText.match(/Table\s+S/gi) || []).length;
  const numberedConditionCount = (documentText.match(/^\d+\.\d+/gm) || []).length;
  const hasELVTables = /Table\s+S3\.1|emission\s+limit\s+value/gi.test(documentText);
  const hasImprovementConditions = /IC\d+|Improvement\s+Condition|Table\s+S1\.3/gi.test(documentText);

  let edgeCaseComplexity = 0;
  if (hasMultipleRegulators) {
    edgeCaseComplexity = 100;
    reasons.push('CRITICAL: Multiple regulators detected');
  } else if (hasConflictingConditions) {
    edgeCaseComplexity = 80;
    reasons.push('Document variations/supersessions detected');
  } else if (hasComplexCalculations) {
    edgeCaseComplexity = 60;
    reasons.push('Complex calculations present');
  }

  // High-obligation-density detection (triggers multi-pass extraction)
  if (tableCount >= 10 || numberedConditionCount >= 80) {
    edgeCaseComplexity = Math.max(edgeCaseComplexity, 85);
    reasons.push(`High obligation density detected (${tableCount} tables, ${numberedConditionCount} conditions)`);
  }

  if (hasELVTables && hasImprovementConditions) {
    edgeCaseComplexity = Math.max(edgeCaseComplexity, 75);
    reasons.push('ELV tables and improvement conditions detected - recommend multi-pass');
  }

  // Calculate composite content complexity
  contentComplexity = Math.round(
    (lengthComplexity * 0.3) +
    (densityComplexity * 0.3) +
    (technicalComplexity * 0.2) +
    (edgeCaseComplexity * 0.2)
  );

  // 4. Overall complexity score (weighted average)
  const overallComplexity = Math.round(
    (structureScore * -0.3) + // Good structure REDUCES complexity
    (regulatorComplexity * 0.3) +
    (contentComplexity * 0.4)
  );

  // 5. Determine model recommendation
  let complexity: ModelComplexity;
  let recommendedModel: AIModel;
  let confidence: number;

  if (overallComplexity <= 35) {
    complexity = 'simple';
    recommendedModel = 'gpt-4o-mini';
    confidence = 0.9;
  } else if (overallComplexity <= 60) {
    complexity = 'medium';
    // For medium complexity, use mini if structure score is high
    if (structureScore >= 60) {
      recommendedModel = 'gpt-4o-mini';
      confidence = 0.7;
      reasons.push('Medium complexity but good structure - using mini');
    } else {
      recommendedModel = 'gpt-4o';
      confidence = 0.75;
      reasons.push('Medium complexity with poor structure - using gpt-4o');
    }
  } else {
    complexity = 'complex';
    recommendedModel = 'gpt-4o';
    confidence = 0.95;
  }

  // Override for edge cases - always use gpt-4o
  if (edgeCaseComplexity >= 80) {
    complexity = 'complex';
    recommendedModel = 'gpt-4o';
    confidence = 1.0;
    reasons.push('OVERRIDE: Edge case detected - forcing gpt-4o');
  }

  return {
    complexity,
    recommendedModel,
    confidence,
    reasons,
    metrics: {
      pageCount: pageCountEstimate,
      textLength,
      structureScore,
      regulatorComplexity,
      contentComplexity,
    },
  };
}

/**
 * Force a specific model (used for testing or explicit user preference)
 */
export function forceModel(model: AIModel): ComplexityAnalysis {
  return {
    complexity: 'medium',
    recommendedModel: model,
    confidence: 1.0,
    reasons: ['Forced by configuration'],
    metrics: {
      textLength: 0,
      structureScore: 0,
      regulatorComplexity: 0,
      contentComplexity: 0,
    },
  };
}

/**
 * Get cost estimate for a model based on token count
 */
export function estimateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = {
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  };

  const rates = pricing[model];
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}

/**
 * Calculate potential savings from using model routing
 */
export function calculateSavings(
  documentCount: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  miniUsagePercent: number // 0-1, e.g., 0.6 for 60%
): { currentCost: number; optimizedCost: number; savings: number; savingsPercent: number } {
  const allGpt4oCost = documentCount * estimateCost('gpt-4o', avgInputTokens, avgOutputTokens);

  const miniDocCount = documentCount * miniUsagePercent;
  const gpt4oDocCount = documentCount * (1 - miniUsagePercent);

  const optimizedCost =
    (miniDocCount * estimateCost('gpt-4o-mini', avgInputTokens, avgOutputTokens)) +
    (gpt4oDocCount * estimateCost('gpt-4o', avgInputTokens, avgOutputTokens));

  const savings = allGpt4oCost - optimizedCost;
  const savingsPercent = (savings / allGpt4oCost) * 100;

  return {
    currentCost: allGpt4oCost,
    optimizedCost,
    savings,
    savingsPercent,
  };
}
