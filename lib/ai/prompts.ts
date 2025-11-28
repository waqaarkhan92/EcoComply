/**
 * Prompt Templates
 * Loads and manages prompt templates from AI_Microservice_Prompts_Complete.md
 * 
 * Note: In production, prompts should be loaded from the document or database
 * For now, we'll define key prompts inline
 */

export interface PromptTemplate {
  id: string;
  systemMessage: string;
  userMessageTemplate: string;
  model: 'gpt-4o' | 'gpt-4o-mini';
  maxTokens: number;
  temperature: number;
}

/**
 * Get prompt template by ID
 * TODO: Load from AI_Microservice_Prompts_Complete.md or database
 */
export function getPromptTemplate(promptId: string): PromptTemplate | null {
  const templates: Record<string, PromptTemplate> = {
    // Document Type Classification
    PROMPT_DOC_TYPE_001: {
      id: 'PROMPT_DOC_TYPE_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are a UK environmental compliance document classifier. Classify the document into exactly one type.

DOCUMENT TYPES:
1. ENVIRONMENTAL_PERMIT - EA/SEPA/NRW/NIEA permits, Part A/B permits, WML, PPC permits
2. TRADE_EFFLUENT_CONSENT - Water company consents for trade effluent discharge
3. MCPD_REGISTRATION - Medium Combustion Plant Directive registrations, specified generator registrations

CLASSIFICATION SIGNALS:
- Environmental Permit: "Environmental Permit", "Part A", "Part B", "Waste Management Licence", "PPC Permit", "SEPA", "NRW", "NIEA", permit reference format (EPR/XX/XXXXX)
- Trade Effluent: "Trade Effluent Consent", "Consent to Discharge", water company names (Thames Water, Severn Trent, etc.), "discharge permit"
- MCPD: "MCPD Registration", "Medium Combustion Plant", "MCP Regulations", "Specified Generator", "Tranche A/B", "Annual Emissions Report"

OUTPUT JSON:
{
  "document_type": "ENVIRONMENTAL_PERMIT|TRADE_EFFLUENT_CONSENT|MCPD_REGISTRATION",
  "confidence": 0.00-1.00,
  "signals_detected": ["signal1", "signal2"],
  "regulator": "EA|SEPA|NRW|NIEA|WATER_COMPANY|null",
  "water_company": "company name or null"
}

If document does not match any type, set document_type to null and confidence to 0.`,
      userMessageTemplate: `Classify this document:

DOCUMENT HEADER AND FIRST 3 PAGES:
{document_excerpt}

PAGE COUNT: {page_count}
FILE NAME: {original_filename}`,
      maxTokens: 200,
      temperature: 0.2,
    },

    // Module 1: Environmental Permit Extraction
    PROMPT_M1_EXTRACT_001: {
      id: 'PROMPT_M1_EXTRACT_001',
      model: 'gpt-4o',
      systemMessage: `You are an expert UK environmental permit analyst. Extract ALL compliance obligations from this permit document.

OBLIGATION CATEGORIES:
- MONITORING: Measuring, sampling, testing activities
- REPORTING: Submitting data/reports to regulators
- RECORD_KEEPING: Maintaining logs and documentation
- OPERATIONAL: Day-to-day operational requirements
- MAINTENANCE: Equipment servicing and upkeep

FREQUENCY VALUES:
DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME, CONTINUOUS, EVENT_TRIGGERED

CONDITION TYPES:
- STANDARD: Boilerplate EA/SEPA/NRW conditions
- SITE_SPECIFIC: Custom conditions unique to this permit
- IMPROVEMENT: Time-bound requirements with hard deadlines
- ELV: Emission Limit Values with numeric limits
- REPORTING: Periodic submission requirements

SUBJECTIVE PHRASES (always flag is_subjective=true):
"as appropriate", "where necessary", "where practicable", "reasonable measures", "adequate steps", "as soon as practicable", "to the satisfaction of", "unless otherwise agreed", "appropriate measures", "suitable provision", "best endeavours"

EXTRACTION RULES:
1. Extract EVERY numbered condition as separate obligation
2. Preserve exact condition reference (e.g., "Condition 2.3.1")
3. Include page number where condition appears
4. Extract deadline dates in ISO format (YYYY-MM-DD)
5. For improvement conditions, set is_improvement=true and extract deadline
6. For ELVs, extract numeric limit, unit, and averaging period
7. Suggest evidence types based on obligation category
8. Score confidence 0.00-1.00 for each extraction

OUTPUT JSON:
{
  "obligations": [
    {
      "condition_reference": "string",
      "title": "string",
      "description": "string",
      "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
      "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|ONE_TIME|CONTINUOUS|EVENT_TRIGGERED",
      "deadline_date": "YYYY-MM-DD or null",
      "is_subjective": boolean,
      "is_improvement": boolean,
      "page_number": number,
      "confidence": 0.00-1.00,
      "suggested_evidence_types": ["string"]
    }
  ],
  "metadata": {
    "permit_reference": "string or null",
    "regulator": "EA|SEPA|NRW|NIEA or null",
    "extraction_confidence": 0.00-1.00
  }
}`,
      userMessageTemplate: `Extract all compliance obligations from this environmental permit:

DOCUMENT TEXT:
{document_text}

REGULATOR: {regulator}
PERMIT REFERENCE: {permit_reference}`,
      maxTokens: 4000,
      temperature: 0.2,
    },
  };

  return templates[promptId] || null;
}

/**
 * Substitute placeholders in prompt template
 */
export function substitutePromptPlaceholders(
  template: string,
  placeholders: Record<string, string | number | null>
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
  }
  return result;
}

