/**
 * ELV Expander Post-Processor
 *
 * Detects consolidated ELV obligations (like "Monitor emissions per Table S3.1")
 * and expands them into individual parameter-specific obligations.
 *
 * Expected Impact: +8-10% coverage (95 → 103-107 obligations)
 * Reference: EXTRACTION_IMPROVEMENT_RECOMMENDATIONS.md Solution 2
 */

import OpenAI from 'openai';
import { Obligation } from '../extraction-strategies/types';
import { estimateCost, type AIModel } from '../model-router';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Patterns that indicate a consolidated ELV obligation
 */
const CONSOLIDATED_ELV_PATTERNS = [
  /table\s+s3\.1/i,
  /per\s+table\s+s3/i,
  /emission\s+limits?\s+(?:in|per|from)\s+table/i,
  /comply\s+with.*table/i,
  /all\s+emissions/i,
  /emissions?\s+shall\s+(?:comply|not\s+exceed)/i,
  /monitor\s+(?:all\s+)?emissions?\s+(?:in\s+accordance|per|from)/i,
  /emission\s+limit\s+values?\s+(?:set\s+out|specified)/i,
  /limits?\s+(?:in|specified\s+in)\s+table/i,
];

/**
 * Regex patterns that indicate individual ELV parameters are already extracted
 * Using word boundaries to avoid false positives (e.g., "CO" in "comply")
 */
const INDIVIDUAL_PARAMETER_PATTERNS = [
  /\bNOx\b/i,
  /\bSO2\b/i,
  /\bCO\b/i,  // Must be word-bounded to avoid matching "comply", "condition", etc.
  /\bHCl\b/i,
  /\bHF\b/i,
  /\bPM\b/i,
  /\bPM10\b/i,
  /\bPM2\.5\b/i,
  /\bVOC\b/i,
  /\bNH3\b/i,
  /\bTOC\b/i,
  /\bdioxin/i,
  /\bfuran/i,
  /\bcadmium\b/i,
  /\bmercury\b/i,
  /\bnitrogen\s+oxide/i,
  /\bsulphur\s+dioxide/i,
  /\bcarbon\s+monoxide/i,
  /\bparticulate/i,
  /\bammonia\b/i,
  /\bhydrogen\s+chloride/i,
  /\bhydrogen\s+fluoride/i,
];

/**
 * Check if an obligation is a consolidated ELV that should be expanded
 */
export function isConsolidatedELV(obl: Obligation): boolean {
  const textToCheck = `${obl.title || ''} ${obl.description || ''}`;

  // Check if it matches consolidated patterns
  const matchesConsolidatedPattern = CONSOLIDATED_ELV_PATTERNS.some(pattern =>
    pattern.test(textToCheck)
  );

  if (!matchesConsolidatedPattern) {
    return false;
  }

  // Check if it already contains specific parameters (then it's not consolidated)
  // Use regex with word boundaries to avoid false positives (e.g., "CO" in "comply")
  const hasSpecificParameter = INDIVIDUAL_PARAMETER_PATTERNS.some(pattern =>
    pattern.test(textToCheck)
  );

  // It's consolidated if it matches pattern but doesn't have specific parameters
  return !hasSpecificParameter;
}

/**
 * Extract the table reference from an obligation
 */
function extractTableReference(obl: Obligation): string | null {
  const text = `${obl.condition_reference || ''} ${obl.title || ''} ${obl.description || ''}`;

  // Look for table references like "S3.1", "Table S3.1", etc.
  const tableMatch = text.match(/(?:Table\s+)?S3\.(\d+)/i);
  if (tableMatch) {
    return `S3.${tableMatch[1]}`;
  }

  return null;
}

/**
 * Extract the relevant table section from document text
 */
function extractTableSection(documentText: string, tableRef: string): string | null {
  const escapedRef = tableRef.replace(/\./g, '\\.');

  // Try to find the table section
  const patterns = [
    new RegExp(`Table\\s+${escapedRef}[\\s\\S]{0,10000}?(?=Table\\s+S\\d|Schedule|^\\d+\\.\\d+\\s+[A-Z])`, 'gim'),
    new RegExp(`${escapedRef}[\\s\\S]{0,8000}?(?=Table\\s+S|Schedule|^\\d+\\.\\d+)`, 'gim'),
  ];

  for (const pattern of patterns) {
    const matches = documentText.match(pattern);
    if (matches && matches[0] && matches[0].length > 100) {
      return matches[0].trim();
    }
  }

  return null;
}

/**
 * Expand a consolidated ELV obligation into individual parameters
 */
async function expandELVTable(
  tableText: string,
  originalObl: Obligation
): Promise<Obligation[]> {
  const prompt = buildELVExpansionPrompt();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.systemMessage },
      {
        role: 'user',
        content: `Expand this ELV table into individual parameter obligations:\n\nOriginal obligation: ${originalObl.title}\n\nTable content:\n${tableText.substring(0, 8000)}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  // Convert expanded ELVs to obligations
  return (parsed.expanded_obligations || []).map((elv: any) => ({
    condition_reference: elv.condition_reference || `${originalObl.condition_reference} - ${elv.parameter}`,
    title: elv.title || `Monitor ${elv.parameter} - ${elv.limit_value} ${elv.unit}`,
    description: elv.description || `Emission limit: ${elv.parameter_name || elv.parameter} shall not exceed ${elv.limit_value} ${elv.unit}`,
    category: 'MONITORING' as const,
    frequency: elv.frequency || originalObl.frequency || 'CONTINUOUS',
    deadline_date: originalObl.deadline_date,
    deadline_relative: originalObl.deadline_relative,
    is_improvement: false,
    is_subjective: false,
    condition_type: 'ELV' as const,
    confidence_score: elv.confidence_score || 0.85,
    elv_limit: `${elv.limit_value} ${elv.unit}`,
    evidence_suggestions: ['CEMS data', 'Stack test report', 'Monitoring records'],
    _source: 'ELV_EXPANSION',
    _expanded_from: originalObl.condition_reference,
    _extracted_at: new Date().toISOString(),
  }));
}

/**
 * Build the prompt for ELV expansion
 */
function buildELVExpansionPrompt() {
  return {
    systemMessage: `You are an ELV expansion specialist. Given a consolidated emission limits table, extract EACH parameter as a SEPARATE monitoring obligation.

PARAMETERS TO LOOK FOR:
- NOx (Nitrogen Oxides) - mg/Nm³
- SO2 (Sulphur Dioxide) - mg/Nm³
- CO (Carbon Monoxide) - mg/Nm³
- PM/Particulates/Dust - mg/Nm³
- VOC (Volatile Organic Compounds) - mg/Nm³ or as C
- HCl (Hydrogen Chloride) - mg/Nm³
- HF (Hydrogen Fluoride) - mg/Nm³
- NH3 (Ammonia) - mg/Nm³
- TOC (Total Organic Carbon) - mg/Nm³
- Dioxins/Furans - ng TEQ/Nm³
- Heavy metals (Cd, Tl, Hg, As, Pb, etc.) - mg/Nm³

FOR EACH PARAMETER EXTRACT:
1. Parameter name (standardized)
2. Limit value (numeric)
3. Unit (mg/Nm³, ng/Nm³, etc.)
4. Averaging period (hourly, daily, continuous, etc.)
5. Reference conditions (O2%, dry/wet, STP/NTP)

OUTPUT JSON:
{
  "expanded_obligations": [{
    "parameter": "NOx",
    "parameter_name": "Nitrogen Oxides",
    "limit_value": 200,
    "unit": "mg/Nm³",
    "averaging_period": "hourly",
    "reference_conditions": "dry, 15% O2, STP",
    "condition_reference": "S3.1(a) - NOx",
    "title": "Monitor NOx emissions - 200 mg/Nm³",
    "description": "Emissions of Nitrogen Oxides (NOx) shall not exceed 200 mg/Nm³ (hourly average, dry, 15% O2, STP)",
    "frequency": "CONTINUOUS",
    "confidence_score": 0.95
  }],
  "metadata": {
    "total_parameters_found": number,
    "parameters_list": ["NOx", "SO2", "CO"]
  }
}

IMPORTANT: Create a SEPARATE entry for EACH parameter. Do NOT combine parameters.`,
  };
}

/**
 * Main function to expand consolidated ELVs in an obligation list
 */
export async function expandConsolidatedELVs(
  obligations: Obligation[],
  documentText: string
): Promise<{
  obligations: Obligation[];
  expandedCount: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}> {
  const expanded: Obligation[] = [];
  let expandedCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  for (const obl of obligations) {
    // Check if this is a consolidated ELV obligation
    if (isConsolidatedELV(obl)) {
      console.log(`📊 Expanding consolidated ELV: ${obl.title}`);

      // Extract the table reference
      const tableRef = extractTableReference(obl);
      if (!tableRef) {
        console.log(`   ⚠️ Could not determine table reference, keeping original`);
        expanded.push(obl);
        continue;
      }

      // Extract the table section from document
      const tableText = extractTableSection(documentText, tableRef);

      if (tableText && tableText.length > 100) {
        try {
          // Use LLM to expand into individual parameters
          const expandedObligs = await expandELVTable(tableText, obl);

          if (expandedObligs.length > 0) {
            expanded.push(...expandedObligs);
            expandedCount += expandedObligs.length;
            console.log(`   ✅ Expanded into ${expandedObligs.length} parameters`);
          } else {
            // Keep original if expansion yielded nothing
            expanded.push(obl);
            console.log(`   ⚠️ Expansion yielded no results, keeping original`);
          }
        } catch (error: any) {
          console.error(`   ❌ Expansion failed: ${error.message}`);
          expanded.push(obl); // Keep original on error
        }
      } else {
        console.log(`   ⚠️ Could not find table ${tableRef} in document, keeping original`);
        expanded.push(obl);
      }
    } else {
      expanded.push(obl);
    }
  }

  return {
    obligations: expanded,
    expandedCount,
    tokenUsage: totalCost > 0 ? {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimatedCost: totalCost,
    } : undefined,
  };
}

/**
 * Quick check to determine if document likely has consolidated ELVs
 */
export function documentMayHaveConsolidatedELVs(documentText: string): boolean {
  // Check for table references that might contain ELVs
  const hasELVTables = /Table\s+S3\.[12]/i.test(documentText);
  const hasEmissionLimits = /emission\s+limit/i.test(documentText);

  return hasELVTables && hasEmissionLimits;
}
