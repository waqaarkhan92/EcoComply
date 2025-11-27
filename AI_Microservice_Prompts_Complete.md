# AI Microservice Prompts
## Oblicore Platform — Modules 1–3
**Document Version: 1.0 Status: Complete Depends On:**
- AI Layer Design & Cost Optimization (1.5a)
- AI Extraction Rules Library (1.6)
- Product Logic Specification (1.1)
- Canonical Dictionary (1.4)

**Purpose:** Complete prompt templates for all AI microservice operations across all three modules

> [v1 UPDATE – Version Header – 2024-12-27]

# 1. Introduction
## Purpose
This document contains production-ready prompt templates for all AI operations within the Oblicore Platform. Each prompt is designed to:
1. Minimize token usage through compressed system messages (<500 tokens)
1. Maximize extraction accuracy through structured output schemas
1. Enable confidence scoring for human review routing
1. Support rule library integration for cost optimization
1. Handle errors gracefully with defined fallback strategies
All prompts are designed to work with GPT-4.1 (primary) and GPT-4.1 Mini (secondary) models, leveraging the 1M token context window for full-document processing.
## Prompt Design Principles
### Token Efficiency
### System Message Guidelines:
- Maximum 500 tokens per system message
- Use directive language (commands, not explanations)
- Include only essential schema definitions
- Reference patterns by structure, not full examples
**User Message Guidelines:** 
- Include document text with minimal preprocessing
- Use placeholder tokens for dynamic content
- Avoid redundant instructions already in system message
### Compression Techniques

| Technique | Description | Token Savings |
| --- | --- | --- |
| Abbreviations | Use JSON field abbreviations in non-user-facing output | ~15% |
| Schema References | Reference enum values by index when possible | ~10% |
| Directive Voice | "Extract X" not "Please extract X from the document" | ~20% |
| Minimal Examples | Include 2-3 edge case examples only | ~30% |
### Response Format
**All prompts use JSON mode with structured output:** 

```json
{
  "response_format": { "type": "json_object" }
}
```

This ensures:
- Consistent parsing
- No prose contamination
- Easier validation
- Reduced output tokens

# 1.3 Model Selection Per Prompt
### 1.3.1 GPT-4.1 (Primary Model)
Use For:
- All document extraction tasks (permits, consents, registrations)
- Obligation parsing and categorisation
- Parameter extraction (Module 2)
- Run-hour extraction (Module 3)
- ELV extraction (Module 1 & 3)
- Stack test result extraction (Module 3)
- Subjective language detection
- Lab result PDF extraction
Pricing: $2.00/1M input, $8.00/1M output
Typical Cost per Document: ~$0.14 (50k input, 5k output)
### 1.3.2 GPT-4.1 Mini (Secondary Model)
Use For:
- Document type classification
- Evidence type suggestions
- Simple categorisation (when rule library match exists)
- Pre-filtering and validation tasks
- Retry attempts after primary model failure
- Non-critical classifications
Pricing: $0.40/1M input, $1.60/1M output
Typical Cost per Task: ~$0.028
### 1.3.3 Model Selection Logic

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTRACTION REQUEST                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Check Rule Library   │
                  │   (Pattern Match)     │
                  └───────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
        Match ≥90%                      Match <90%
              │                               │
              ▼                               ▼
    ┌─────────────────┐           ┌─────────────────────┐
    │  Use Library    │           │  Check Task Type    │
    │  (Zero Cost)    │           └─────────────────────┘
    └─────────────────┘                     │
                              ┌─────────────┴─────────────┐
                              │                           │
                        Critical Task              Simple Task
                    (Extraction, Parsing)     (Suggestions, Classification)
                              │                           │
                              ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────┐
                    │    GPT-4.1      │         │  GPT-4.1 Mini   │
                    │   (Primary)     │         │  (Secondary)    │
                    └─────────────────┘         └─────────────────┘
```
# 1.4 Confidence Thresholds

| Threshold | Action | User Experience |
| --- | --- | --- |
| ≥85% | Auto-accept | Extraction shown as "Confirmed"; user can still edit |
| 70–84% | Flag for review | Yellow highlight; "Review recommended" label |
| <70% | Require review | Red highlight; cannot proceed without human confirmation |
# 1.5 Common Placeholders

All prompts use these standard placeholders:

| Placeholder | Description | Example |
| --- | --- | --- |
| {document_text} | Full extracted document text | [PDF content] |
| {module_id} | Module UUID from modules table | 550e8400-e29b-41d4-a716-446655440000 |
| {document_id} | Document UUID | 660e8400-e29b-41d4-a716-446655440001 |
| {site_id} | Site UUID | 770e8400-e29b-41d4-a716-446655440002 |
| {document_type} | Enum value | ENVIRONMENTAL_PERMIT |
| {regulator} | Regulator code | EA, SEPA, NRW, NIEA |
| {water_company} | Water company name (Module 2) | Thames Water |
| {page_count} | Total pages in document | 45 |
# 2. Document Type Detection & Routing
## 2.1 Document Type Classification
Prompt ID: PROMPT_DOC_TYPE_001
Purpose: Classify document type when keyword detection is ambiguous or multiple module keywords are detected.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~2,000-5,000 (system + first 2-3 pages of document)
- Output: ~100
Cost per Call: ~$0.003
Confidence Threshold: 80% (if below, flag for user selection)

System Message


You are a UK environmental compliance document classifier. Classify the document into exactly one type.

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

If document does not match any type, set document_type to null and confidence to 0.
Token Count: ~280 tokens
Optimization Notes:
- Uses enumerated type list for clarity
- Signals listed as keywords rather than full descriptions
- Output schema is minimal

User Message Template


Classify this document:

DOCUMENT HEADER AND FIRST 3 PAGES:
{document_excerpt}

PAGE COUNT: {page_count}
FILE NAME: {original_filename}
Placeholders:
- {document_excerpt}: First 3 pages or 5,000 characters, whichever is smaller
- {page_count}: Total page count
- {original_filename}: Original uploaded filename (may contain hints)
Token Estimation: ~1,500-4,000 tokens depending on document density

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "document_type": {
      "type": ["string", "null"],
      "enum": ["ENVIRONMENTAL_PERMIT", "TRADE_EFFLUENT_CONSENT", "MCPD_REGISTRATION", null]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "signals_detected": {
      "type": "array",
      "items": { "type": "string" }
    },
    "regulator": {
      "type": ["string", "null"],
      "enum": ["EA", "SEPA", "NRW", "NIEA", "WATER_COMPANY", null]
    },
    "water_company": {
      "type": ["string", "null"]
    }
  },
  "required": ["document_type", "confidence", "signals_detected"]
}
Example Output:

```json
{
  "document_type": "ENVIRONMENTAL_PERMIT",
  "confidence": 0.94,
  "signals_detected": ["Environmental Permit", "Part A", "EPR/AB1234CD"],
  "regulator": "EA",
  "water_company": null
}

Error Handling
- If LLM returns invalid JSON: Retry once with simplified prompt; if fails, default to user selection
- If confidence < 80%: Present user with classification options, pre-selecting highest confidence option
- If document_type is null: Display "Unable to classify document type. Please select manually."
- If timeout: Use GPT-4.1 Mini for retry (faster response)

Integration Notes
Called from: DocumentIngestionService.classifyDocument()
Pre-processing:
1. Extract first 3 pages of PDF text using pdf-parse
2. Limit excerpt to 5,000 characters
3. Preserve document structure (headers, bullet points)
Post-processing:
1. If confidence ≥80%, route to detected module
2. If confidence <80%, add to user review queue
3. Log classification result in extraction_logs table
Rule Library Integration:
- Check rule library for document type patterns first
- If library match ≥90%, skip LLM classification
- Use library-detected signals to boost LLM confidence

# 3. Document Extraction Prompts
## 3.1 Environmental Permit Extraction (Module 1)
Prompt ID: PROMPT_M1_EXTRACT_001
Purpose: Extract all compliance obligations from EA/SEPA/NRW/NIEA environmental permits, including conditions, ELVs, improvement conditions, and monitoring requirements.
Model: GPT-4.1
Estimated Tokens:
- Input: ~50,000-80,000 (system + full document)
- Output: ~5,000-15,000
Cost per Call: ~$0.14 (typical), ~$0.40 (large document)
Confidence Threshold: 70% minimum per obligation

System Message


You are an expert UK environmental permit analyst. Extract ALL compliance obligations from this permit document.

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

OUTPUT JSON ARRAY:
{
  "obligations": [{
    "text": "original condition text",
    "summary": "plain English summary (<50 words)",
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
    "frequency": "DAILY|...|null",
    "deadline_date": "YYYY-MM-DD or null",
    "deadline_relative": "e.g., within 14 days of incident",
    "condition_type": "STANDARD|SITE_SPECIFIC|IMPROVEMENT|ELV|REPORTING",
    "condition_reference": "e.g., Condition 2.3.1",
    "page_reference": 1-N,
    "is_subjective": true|false,
    "subjective_phrases": ["phrase1"],
    "is_improvement": true|false,
    "elv": {
      "parameter": "NOx|SO2|CO|etc",
      "limit_value": 123.45,
      "unit": "mg/m³|μg/m³|etc",
      "averaging_period": "hourly|daily|monthly|annual",
      "reference_conditions": "STP|NTP|null"
    } or null,
    "evidence_suggestions": ["type1", "type2"],
    "confidence_score": 0.00-1.00
  }],
  "document_metadata": {
    "permit_reference": "EPR/XX/XXXXX",
    "regulator": "EA|SEPA|NRW|NIEA",
    "issue_date": "YYYY-MM-DD or null",
    "effective_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "permitted_activities": ["activity1", "activity2"],
    "site_address": "address string or null"
  },
  "extraction_metadata": {
    "total_pages_processed": N,
    "total_conditions_found": N,
    "low_confidence_count": N,
    "improvement_conditions_count": N,
    "elv_count": N
  }
}
Token Count: ~480 tokens
Optimization Notes:
- Enum values listed inline rather than explained
- Subjective phrases listed as patterns
- Output schema compressed with examples embedded

User Message Template


Extract all compliance obligations from this Environmental Permit:

DOCUMENT TYPE: {document_type}
REGULATOR: {regulator}
PAGE COUNT: {page_count}

FULL DOCUMENT TEXT:
{document_text}
Placeholders:
- {document_type}: ENVIRONMENTAL_PERMIT
- {regulator}: EA, SEPA, NRW, or NIEA
- {page_count}: Total pages
- {document_text}: Full document text (may be 50k-300k tokens)
Token Estimation:
- Small permit (<50 pages): ~50,000 input tokens
- Medium permit (50-100 pages): ~100,000 input tokens
- Large permit (100-200 pages): ~200,000 input tokens

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string", "minLength": 10 },
          "summary": { "type": "string", "maxLength": 300 },
          "category": {
            "type": "string",
            "enum": ["MONITORING", "REPORTING", "RECORD_KEEPING", "OPERATIONAL", "MAINTENANCE"]
          },
          "frequency": {
            "type": ["string", "null"],
            "enum": ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME", "CONTINUOUS", "EVENT_TRIGGERED", null]
          },
          "deadline_date": {
            "type": ["string", "null"],
            "format": "date"
          },
          "deadline_relative": { "type": ["string", "null"] },
          "condition_type": {
            "type": "string",
            "enum": ["STANDARD", "SITE_SPECIFIC", "IMPROVEMENT", "ELV", "REPORTING"]
          },
          "condition_reference": { "type": "string" },
          "page_reference": { "type": "integer", "minimum": 1 },
          "is_subjective": { "type": "boolean" },
          "subjective_phrases": {
            "type": "array",
            "items": { "type": "string" }
          },
          "is_improvement": { "type": "boolean" },
          "elv": {
            "type": ["object", "null"],
            "properties": {
              "parameter": { "type": "string" },
              "limit_value": { "type": "number" },
              "unit": { "type": "string" },
              "averaging_period": { "type": "string" },
              "reference_conditions": { "type": ["string", "null"] }
            }
          },
          "evidence_suggestions": {
            "type": "array",
            "items": { "type": "string" }
          },
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        },
        "required": ["text", "summary", "category", "condition_reference", "page_reference", "is_subjective", "confidence_score"]
      }
    },
    "document_metadata": {
      "type": "object",
      "properties": {
        "permit_reference": { "type": ["string", "null"] },
        "regulator": { "type": "string" },
        "issue_date": { "type": ["string", "null"] },
        "effective_date": { "type": ["string", "null"] },
        "expiry_date": { "type": ["string", "null"] },
        "permitted_activities": { "type": "array", "items": { "type": "string" } },
        "site_address": { "type": ["string", "null"] }
      }
    },
    "extraction_metadata": {
      "type": "object",
      "properties": {
        "total_pages_processed": { "type": "integer" },
        "total_conditions_found": { "type": "integer" },
        "low_confidence_count": { "type": "integer" },
        "improvement_conditions_count": { "type": "integer" },
        "elv_count": { "type": "integer" }
      }
    }
  },
  "required": ["obligations", "document_metadata", "extraction_metadata"]
}
Example Output:

```json
{
  "obligations": [
    {
      "text": "The operator shall monitor emissions of nitrogen oxides from emission point A1 on a continuous basis using a certified continuous emissions monitoring system (CEMS).",
      "summary": "Continuous NOx monitoring at emission point A1 using CEMS",
      "category": "MONITORING",
      "frequency": "CONTINUOUS",
      "deadline_date": null,
      "deadline_relative": null,
      "condition_type": "ELV",
      "condition_reference": "Condition 3.2.1",
      "page_reference": 12,
      "is_subjective": false,
      "subjective_phrases": [],
      "is_improvement": false,
      "elv": {
        "parameter": "NOx",
        "limit_value": 200,
        "unit": "mg/m³",
        "averaging_period": "daily",
        "reference_conditions": "STP"
      },
      "evidence_suggestions": ["CEMS data export", "Calibration certificate", "Monthly monitoring report"],
      "confidence_score": 0.94
    },
    {
      "text": "The operator shall implement appropriate measures to prevent fugitive emissions of odour beyond the site boundary.",
      "summary": "Prevent fugitive odour emissions",
      "category": "OPERATIONAL",
      "frequency": "CONTINUOUS",
      "deadline_date": null,
      "deadline_relative": null,
      "condition_type": "SITE_SPECIFIC",
      "condition_reference": "Condition 2.4.3",
      "page_reference": 8,
      "is_subjective": true,
      "subjective_phrases": ["appropriate measures"],
      "is_improvement": false,
      "elv": null,
      "evidence_suggestions": ["Odour management plan", "Complaint log", "Inspection checklist"],
      "confidence_score": 0.88
    }
  ],
  "document_metadata": {
    "permit_reference": "EPR/AB1234CD/V002",
    "regulator": "EA",
    "issue_date": "2024-03-15",
    "effective_date": "2024-04-01",
    "expiry_date": null,
    "permitted_activities": ["Incineration of hazardous waste", "Recovery of waste oils"],
    "site_address": "Industrial Estate, Example Town, EX1 2AB"
  },
  "extraction_metadata": {
    "total_pages_processed": 45,
    "total_conditions_found": 72,
    "low_confidence_count": 5,
    "improvement_conditions_count": 3,
    "elv_count": 12
  }
}

Error Handling
- If LLM returns invalid JSON:
  1. Retry once with explicit JSON formatting instruction
  2. If retry fails, attempt extraction with simplified prompt (categories only)
  3. If still fails, flag document for Manual Mode
- If confidence < 70% for >50% of obligations:
  1. Flag entire document for quality review
  2. Display message: "Document may be poorly scanned or formatted"
- If extraction returns 0 obligations from >10 page document:
  1. Check if document type is valid zero-obligation type
  2. If not, retry with alternative prompt focusing on "Conditions" and "Schedule" sections
  3. If still 0, flag for Manual Mode
- If timeout (>30s for standard, >5min for large):
  1. First retry: Same prompt
  2. Second retry: Segment document and process sections
  3. If all fail, flag for Manual Mode

Integration Notes
Called from: ExtractionService.extractObligations(documentId, moduleId)
Pre-processing:
1. Extract full text from PDF (OCR if scanned)
2. Normalize whitespace and encoding
3. Check rule library for known patterns (may skip LLM for matched sections)
4. Estimate token count; if >800k, segment document
Post-processing:
1. Validate each obligation against schema
2. Apply rule library confidence boost (+15%) for matched patterns
3. Check for duplicates (>80% text similarity)
4. Insert validated obligations into obligations table
5. Create schedules for recurring obligations
6. Log extraction in extraction_logs
Rule Library Integration:
1. Before LLM call, check each document section against rule library
2. For sections with ≥90% pattern match, use library-defined extraction
3. Pass remaining sections to LLM
4. Merge library and LLM extractions
5. Track library hit rate for analytics

## 3.2 Trade Effluent Consent Extraction (Module 2)
Prompt ID: PROMPT_M2_EXTRACT_001
Purpose: Extract parameters, limits, monitoring requirements, and obligations from water company trade effluent consent documents.
Model: GPT-4.1
Estimated Tokens:
- Input: ~20,000-40,000 (system + full document)
- Output: ~3,000-8,000
Cost per Call: ~$0.08
Confidence Threshold: 70% minimum per parameter

System Message


You are an expert UK trade effluent consent analyst. Extract ALL parameters, limits, and compliance obligations from this consent document.

PARAMETER TYPES:
BOD (Biochemical Oxygen Demand), COD (Chemical Oxygen Demand), SS (Suspended Solids), PH, TEMPERATURE, FOG (Fats Oils Grease), AMMONIA, PHOSPHORUS, CONDUCTIVITY, CHLORIDE, SULPHATE, METALS, OTHER

LIMIT TYPES:
MAXIMUM (shall not exceed), AVERAGE (mean value), RANGE (between X and Y), MINIMUM

FREQUENCY VALUES:
DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, EVENT_TRIGGERED, CONTINUOUS

OBLIGATION CATEGORIES:
MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE

EXTRACTION RULES:
1. Extract EVERY parameter with its limit value, unit, and limit type
2. Include sampling frequency for each parameter
3. Extract volume limits if specified
4. Preserve consent reference number
5. Identify water company from document
6. Extract all general compliance conditions
7. Note any special conditions or restrictions

OUTPUT JSON:
{
  "parameters": [{
    "parameter_type": "BOD|COD|SS|PH|TEMPERATURE|FOG|AMMONIA|PHOSPHORUS|CONDUCTIVITY|CHLORIDE|SULPHATE|METALS|OTHER",
    "parameter_name": "human readable name",
    "limit_value": 123.45,
    "limit_value_max": null or number (for ranges),
    "unit": "mg/l|pH units|°C|µS/cm|etc",
    "limit_type": "MAXIMUM|AVERAGE|RANGE|MINIMUM",
    "sampling_frequency": "DAILY|WEEKLY|MONTHLY|etc",
    "sampling_method": "grab sample|composite|continuous|null",
    "page_reference": 1-N,
    "confidence_score": 0.00-1.00
  }],
  "obligations": [{
    "text": "original obligation text",
    "summary": "plain English summary (<50 words)",
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
    "frequency": "DAILY|...|null",
    "deadline_date": "YYYY-MM-DD or null",
    "deadline_relative": "relative deadline text",
    "condition_reference": "condition reference",
    "page_reference": 1-N,
    "is_subjective": true|false,
    "subjective_phrases": [],
    "evidence_suggestions": ["type1", "type2"],
    "confidence_score": 0.00-1.00
  }],
  "consent_metadata": {
    "consent_reference": "reference number",
    "water_company": "company name",
    "discharge_location": "location description",
    "issue_date": "YYYY-MM-DD or null",
    "effective_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "maximum_daily_volume": { "value": number, "unit": "m³" } or null,
    "maximum_flow_rate": { "value": number, "unit": "l/s" } or null,
    "discharge_hours": "e.g., 06:00-22:00 or null",
    "site_address": "address or null"
  },
  "extraction_metadata": {
    "total_parameters_found": N,
    "total_obligations_found": N,
    "low_confidence_count": N
  }
}
Token Count: ~450 tokens
Optimization Notes:
- Parameter types listed as enum values
- Nested structures for complex fields (volume, flow rate)
- Combined parameters and obligations in single response

User Message Template


Extract all parameters, limits, and compliance obligations from this Trade Effluent Consent:

WATER COMPANY: {water_company}
PAGE COUNT: {page_count}

FULL DOCUMENT TEXT:
{document_text}
Placeholders:
- {water_company}: Water company name (if known from classification)
- {page_count}: Total pages
- {document_text}: Full document text
Token Estimation: ~15,000-35,000 tokens (consents are typically shorter than permits)

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "parameters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "parameter_type": {
            "type": "string",
            "enum": ["BOD", "COD", "SS", "PH", "TEMPERATURE", "FOG", "AMMONIA", "PHOSPHORUS", "CONDUCTIVITY", "CHLORIDE", "SULPHATE", "METALS", "OTHER"]
          },
          "parameter_name": { "type": "string" },
          "limit_value": { "type": "number" },
          "limit_value_max": { "type": ["number", "null"] },
          "unit": { "type": "string" },
          "limit_type": {
            "type": "string",
            "enum": ["MAXIMUM", "AVERAGE", "RANGE", "MINIMUM"]
          },
          "sampling_frequency": {
            "type": ["string", "null"],
            "enum": ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "EVENT_TRIGGERED", "CONTINUOUS", null]
          },
          "sampling_method": { "type": ["string", "null"] },
          "page_reference": { "type": "integer", "minimum": 1 },
          "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "required": ["parameter_type", "parameter_name", "limit_value", "unit", "limit_type", "confidence_score"]
      }
    },
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "summary": { "type": "string" },
          "category": {
            "type": "string",
            "enum": ["MONITORING", "REPORTING", "RECORD_KEEPING", "OPERATIONAL", "MAINTENANCE"]
          },
          "frequency": { "type": ["string", "null"] },
          "deadline_date": { "type": ["string", "null"] },
          "deadline_relative": { "type": ["string", "null"] },
          "condition_reference": { "type": ["string", "null"] },
          "page_reference": { "type": "integer" },
          "is_subjective": { "type": "boolean" },
          "subjective_phrases": { "type": "array", "items": { "type": "string" } },
          "evidence_suggestions": { "type": "array", "items": { "type": "string" } },
          "confidence_score": { "type": "number" }
        },
        "required": ["text", "summary", "category", "confidence_score"]
      }
    },
    "consent_metadata": {
      "type": "object",
      "properties": {
        "consent_reference": { "type": ["string", "null"] },
        "water_company": { "type": "string" },
        "discharge_location": { "type": ["string", "null"] },
        "issue_date": { "type": ["string", "null"] },
        "effective_date": { "type": ["string", "null"] },
        "expiry_date": { "type": ["string", "null"] },
        "maximum_daily_volume": {
          "type": ["object", "null"],
          "properties": {
            "value": { "type": "number" },
            "unit": { "type": "string" }
          }
        },
        "maximum_flow_rate": {
          "type": ["object", "null"],
          "properties": {
            "value": { "type": "number" },
            "unit": { "type": "string" }
          }
        },
        "discharge_hours": { "type": ["string", "null"] },
        "site_address": { "type": ["string", "null"] }
      },
      "required": ["water_company"]
    },
    "extraction_metadata": {
      "type": "object",
      "properties": {
        "total_parameters_found": { "type": "integer" },
        "total_obligations_found": { "type": "integer" },
        "low_confidence_count": { "type": "integer" }
      }
    }
  },
  "required": ["parameters", "obligations", "consent_metadata", "extraction_metadata"]
}
Example Output:

```json
{
  "parameters": [
    {
      "parameter_type": "BOD",
      "parameter_name": "Biochemical Oxygen Demand (5-day)",
      "limit_value": 300,
      "limit_value_max": null,
      "unit": "mg/l",
      "limit_type": "MAXIMUM",
      "sampling_frequency": "WEEKLY",
      "sampling_method": "grab sample",
      "page_reference": 3,
      "confidence_score": 0.95
    },
    {
      "parameter_type": "PH",
      "parameter_name": "pH",
      "limit_value": 6.0,
      "limit_value_max": 9.0,
      "unit": "pH units",
      "limit_type": "RANGE",
      "sampling_frequency": "DAILY",
      "sampling_method": "continuous",
      "page_reference": 3,
      "confidence_score": 0.92
    }
  ],
  "obligations": [
    {
      "text": "The discharger shall submit monthly monitoring returns to Thames Water within 14 days of the end of each calendar month.",
      "summary": "Submit monthly monitoring returns within 14 days",
      "category": "REPORTING",
      "frequency": "MONTHLY",
      "deadline_date": null,
      "deadline_relative": "within 14 days of end of month",
      "condition_reference": "Condition 5.1",
      "page_reference": 5,
      "is_subjective": false,
      "subjective_phrases": [],
      "evidence_suggestions": ["Submission receipt", "Report copy", "Email confirmation"],
      "confidence_score": 0.91
    }
  ],
  "consent_metadata": {
    "consent_reference": "TW/TE/2024/12345",
    "water_company": "Thames Water",
    "discharge_location": "Foul sewer, Example Road",
    "issue_date": "2024-01-15",
    "effective_date": "2024-02-01",
    "expiry_date": "2029-01-31",
    "maximum_daily_volume": { "value": 50, "unit": "m³" },
    "maximum_flow_rate": { "value": 2.5, "unit": "l/s" },
    "discharge_hours": "06:00-22:00",
    "site_address": "123 Industrial Lane, Example Town"
  },
  "extraction_metadata": {
    "total_parameters_found": 8,
    "total_obligations_found": 12,
    "low_confidence_count": 2
  }
}

Error Handling
- If LLM returns invalid JSON: Retry with explicit formatting; flag for manual if persistent
- If no parameters extracted: Alert user "No discharge parameters found - verify this is a Trade Effluent Consent"
- If parameter units inconsistent: Flag parameter for review with warning
- If timeout: Retry once; if fails, flag for Manual Mode

Integration Notes
Called from: ExtractionService.extractConsent(documentId, moduleId)
Pre-processing:
1. Extract full text from PDF
2. Identify water company from header/footer
3. Check rule library for water company-specific patterns
Post-processing:
1. Validate parameter units match expected types
2. Insert parameters into parameters table
3. Insert obligations into obligations table
4. Create monitoring schedules for each parameter
5. Set warning threshold at 80% of each limit
Rule Library Integration:
- Water company-specific patterns stored in rule library
- Common parameter formats matched before LLM
- Library matches boost confidence by 15%

## 3.3 MCPD Registration Extraction (Module 3)
Prompt ID: PROMPT_M3_EXTRACT_001
Purpose: Extract generator details, run-hour limits, emission limits, and compliance obligations from MCPD registration documents.
Model: GPT-4.1
Estimated Tokens:
- Input: ~15,000-30,000 (system + full document)
- Output: ~2,000-6,000
Cost per Call: ~$0.06
Confidence Threshold: 70% minimum per generator

System Message


You are an expert UK MCPD/generator compliance analyst. Extract ALL generator details, limits, and compliance obligations from this registration document.

GENERATOR TYPES:
MCPD_1_5MW (1-5 MW thermal input), MCPD_5_50MW (5-50 MW thermal input), SPECIFIED_GENERATOR (Tranche A/B), EMERGENCY_GENERATOR

FUEL TYPES:
NATURAL_GAS, DIESEL, GAS_OIL, HEAVY_FUEL_OIL, BIOMASS, BIOGAS, DUAL_FUEL, OTHER

EMISSION PARAMETERS:
NOx (Nitrogen Oxides), SO2 (Sulphur Dioxide), CO (Carbon Monoxide), DUST (Particulates), PM10, PM2_5

OBLIGATION CATEGORIES:
MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE

EXTRACTION RULES:
1. Extract EVERY generator/plant with its specifications
2. Include run-hour limits per generator
3. Extract emission limit values (ELVs) for each parameter
4. Note stack test requirements and frequencies
5. Extract AER (Annual Emissions Report) requirements
6. Preserve registration reference number
7. Identify anniversary date for annual calculations

OUTPUT JSON:
{
  "generators": [{
    "generator_id": "from document or generated",
    "generator_name": "name/description",
    "generator_type": "MCPD_1_5MW|MCPD_5_50MW|SPECIFIED_GENERATOR|EMERGENCY_GENERATOR",
    "thermal_input_mw": number,
    "electrical_output_mw": number or null,
    "fuel_type": "NATURAL_GAS|DIESEL|...",
    "location_description": "where on site",
    "annual_run_hour_limit": number,
    "run_hour_calculation_start": "anniversary date YYYY-MM-DD or null",
    "elvs": [{
      "parameter": "NOx|SO2|CO|DUST|PM10|PM2_5",
      "limit_value": number,
      "unit": "mg/Nm³|ppm|etc",
      "averaging_period": "hourly|15min|continuous",
      "reference_conditions": "STP|NTP|dry|3% O2|15% O2|null",
      "compliance_date": "YYYY-MM-DD or null (for phased limits)"
    }],
    "stack_test_frequency": "ANNUAL|BI_ANNUAL|TRIENNIAL|null",
    "next_stack_test_due": "YYYY-MM-DD or null",
    "page_reference": 1-N,
    "confidence_score": 0.00-1.00
  }],
  "obligations": [{
    "text": "original text",
    "summary": "plain English (<50 words)",
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
    "frequency": "DAILY|...|null",
    "deadline_date": "YYYY-MM-DD or null",
    "deadline_relative": "relative text",
    "applies_to_generators": ["generator_id1", "all"],
    "is_subjective": true|false,
    "subjective_phrases": [],
    "evidence_suggestions": [],
    "confidence_score": 0.00-1.00
  }],
  "registration_metadata": {
    "registration_reference": "reference number",
    "registration_type": "MCPD|SPECIFIED_GENERATOR",
    "regulator": "EA|SEPA|NRW|NIEA",
    "issue_date": "YYYY-MM-DD or null",
    "effective_date": "YYYY-MM-DD or null",
    "aer_due_date": "YYYY-MM-DD or null",
    "aer_frequency": "ANNUAL",
    "site_address": "address or null",
    "total_site_capacity_mw": number or null
  },
  "extraction_metadata": {
    "total_generators_found": N,
    "total_obligations_found": N,
    "total_elvs_found": N,
    "low_confidence_count": N
  }
}
Token Count: ~490 tokens
Optimization Notes:
- Generator types and fuel types as compact enums
- ELVs nested within generators for clear association
- Obligations can apply to specific generators or all

User Message Template


Extract all generator details, run-hour limits, and compliance obligations from this MCPD Registration:

REGISTRATION TYPE: {registration_type}
REGULATOR: {regulator}
PAGE COUNT: {page_count}

FULL DOCUMENT TEXT:
{document_text}
Placeholders:
- {registration_type}: MCPD or SPECIFIED_GENERATOR
- {regulator}: EA, SEPA, NRW, or NIEA
- {page_count}: Total pages
- {document_text}: Full document text
Token Estimation: ~12,000-25,000 tokens (registrations are typically shorter)

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "generators": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "generator_id": { "type": "string" },
          "generator_name": { "type": "string" },
          "generator_type": {
            "type": "string",
            "enum": ["MCPD_1_5MW", "MCPD_5_50MW", "SPECIFIED_GENERATOR", "EMERGENCY_GENERATOR"]
          },
          "thermal_input_mw": { "type": "number" },
          "electrical_output_mw": { "type": ["number", "null"] },
          "fuel_type": {
            "type": "string",
            "enum": ["NATURAL_GAS", "DIESEL", "GAS_OIL", "HEAVY_FUEL_OIL", "BIOMASS", "BIOGAS", "DUAL_FUEL", "OTHER"]
          },
          "location_description": { "type": ["string", "null"] },
          "annual_run_hour_limit": { "type": "number" },
          "run_hour_calculation_start": { "type": ["string", "null"] },
          "elvs": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "parameter": {
                  "type": "string",
                  "enum": ["NOx", "SO2", "CO", "DUST", "PM10", "PM2_5"]
                },
                "limit_value": { "type": "number" },
                "unit": { "type": "string" },
                "averaging_period": { "type": "string" },
                "reference_conditions": { "type": ["string", "null"] },
                "compliance_date": { "type": ["string", "null"] }
              },
              "required": ["parameter", "limit_value", "unit"]
            }
          },
          "stack_test_frequency": {
            "type": ["string", "null"],
            "enum": ["ANNUAL", "BI_ANNUAL", "TRIENNIAL", null]
          },
          "next_stack_test_due": { "type": ["string", "null"] },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number" }
        },
        "required": ["generator_id", "generator_name", "generator_type", "thermal_input_mw", "fuel_type", "annual_run_hour_limit", "confidence_score"]
      }
    },
    "obligations": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "registration_metadata": {
      "type": "object",
      "properties": {
        "registration_reference": { "type": ["string", "null"] },
        "registration_type": { "type": "string" },
        "regulator": { "type": "string" },
        "issue_date": { "type": ["string", "null"] },
        "effective_date": { "type": ["string", "null"] },
        "aer_due_date": { "type": ["string", "null"] },
        "aer_frequency": { "type": "string" },
        "site_address": { "type": ["string", "null"] },
        "total_site_capacity_mw": { "type": ["number", "null"] }
      }
    },
    "extraction_metadata": {
      "type": "object"
    }
  },
  "required": ["generators", "obligations", "registration_metadata", "extraction_metadata"]
}
Example Output:

```json
{
  "generators": [
    {
      "generator_id": "GEN-001",
      "generator_name": "CHP Unit 1",
      "generator_type": "MCPD_1_5MW",
      "thermal_input_mw": 3.2,
      "electrical_output_mw": 1.5,
      "fuel_type": "NATURAL_GAS",
      "location_description": "Boiler House A",
      "annual_run_hour_limit": 500,
      "run_hour_calculation_start": "2024-01-01",
      "elvs": [
        {
          "parameter": "NOx",
          "limit_value": 190,
          "unit": "mg/Nm³",
          "averaging_period": "hourly",
          "reference_conditions": "dry, 15% O2",
          "compliance_date": null
        }
      ],
      "stack_test_frequency": "ANNUAL",
      "next_stack_test_due": "2025-03-15",
      "page_reference": 4,
      "confidence_score": 0.93
    }
  ],
  "obligations": [
    {
      "text": "The operator shall maintain a record of operating hours for each generator on a daily basis.",
      "summary": "Maintain daily run-hour records for each generator",
      "category": "RECORD_KEEPING",
      "frequency": "DAILY",
      "deadline_date": null,
      "deadline_relative": null,
      "applies_to_generators": ["all"],
      "is_subjective": false,
      "subjective_phrases": [],
      "evidence_suggestions": ["Run-hour log", "Maintenance records", "Meter readings"],
      "confidence_score": 0.90
    }
  ],
  "registration_metadata": {
    "registration_reference": "MCP/2024/001234",
    "registration_type": "MCPD",
    "regulator": "EA",
    "issue_date": "2024-01-15",
    "effective_date": "2024-01-20",
    "aer_due_date": "2025-02-28",
    "aer_frequency": "ANNUAL",
    "site_address": "Factory Site, Industrial Road, EX1 2CD",
    "total_site_capacity_mw": 8.5
  },
  "extraction_metadata": {
    "total_generators_found": 3,
    "total_obligations_found": 15,
    "total_elvs_found": 9,
    "low_confidence_count": 2
  }
}

Error Handling
- If LLM returns invalid JSON: Retry with explicit formatting instruction
- If no generators extracted: Alert user "No generators found - verify this is an MCPD/Generator registration"
- If run-hour limit missing: Set to default (500 for MCPD, 50 for Specified) with low confidence and flag for review
- If timeout: Retry once; if fails, flag for Manual Mode

Integration Notes
Called from: ExtractionService.extractRegistration(documentId, moduleId)
Pre-processing:
1. Extract full text from PDF
2. Identify registration type from content
3. Check rule library for MCPD patterns
Post-processing:
1. Validate generator types and limits
2. Insert generators into generators table
3. Insert obligations into obligations table
4. Create run-hour tracking schedules
5. Set AER reminder schedule
6. Create stack test schedules
Rule Library Integration:
- MCPD standard patterns for common generator types
- Default ELV values based on generator type and fuel
- Common obligation patterns for run-hour tracking

# 4. Obligation Processing Prompts
## 4.1 Obligation Registration
Prompt ID: PROMPT_OBL_REG_001
Purpose: Structure raw extracted obligations into validated database format with all required fields.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~1,000-2,000
- Output: ~500-1,000
Cost per Call: ~$0.002
Confidence Threshold: 85% for auto-registration

System Message


You are a compliance data structuring system. Convert the raw extracted obligation into a validated database record.

REQUIRED FIELDS:
- text: Original obligation text (non-empty)
- summary: Plain English summary (<50 words, non-empty)
- category: MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE
- frequency: DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|ONE_TIME|CONTINUOUS|EVENT_TRIGGERED|null

VALIDATION RULES:
1. If is_subjective=true, subjective_phrases must be non-empty
2. If frequency=ONE_TIME, deadline_date or deadline_relative must be present
3. page_reference must be positive integer
4. confidence_score must be 0.00-1.00
5. condition_reference should follow pattern "Condition X.X.X" or similar

DEFAULTS:
- If category unclear, default to RECORD_KEEPING
- If frequency unclear, set to null (will be flagged for review)
- If page_reference missing, set to 1

OUTPUT JSON:
{
  "validated": true|false,
  "validation_errors": ["error1", "error2"] or [],
  "obligation": {
    "text": "string",
    "summary": "string",
    "category": "enum",
    "frequency": "enum|null",
    "deadline_date": "YYYY-MM-DD|null",
    "deadline_relative": "string|null",
    "condition_type": "enum",
    "condition_reference": "string",
    "page_reference": integer,
    "is_subjective": boolean,
    "subjective_phrases": [],
    "is_improvement": boolean,
    "evidence_types": [],
    "confidence_score": number
  }
}
Token Count: ~320 tokens

User Message Template


Validate and structure this obligation:

RAW OBLIGATION:
{raw_obligation_json}

DOCUMENT CONTEXT:
Module: {module_id}
Document Type: {document_type}
Page Count: {page_count}
Placeholders:
- {raw_obligation_json}: JSON object from extraction
- {module_id}: Module UUID
- {document_type}: Document type enum
- {page_count}: Total pages for validation

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "validated": { "type": "boolean" },
    "validation_errors": {
      "type": "array",
      "items": { "type": "string" }
    },
    "obligation": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "minLength": 10 },
        "summary": { "type": "string", "minLength": 5, "maxLength": 300 },
        "category": {
          "type": "string",
          "enum": ["MONITORING", "REPORTING", "RECORD_KEEPING", "OPERATIONAL", "MAINTENANCE"]
        },
        "frequency": {
          "type": ["string", "null"],
          "enum": ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME", "CONTINUOUS", "EVENT_TRIGGERED", null]
        },
        "deadline_date": { "type": ["string", "null"] },
        "deadline_relative": { "type": ["string", "null"] },
        "condition_type": { "type": "string" },
        "condition_reference": { "type": "string" },
        "page_reference": { "type": "integer", "minimum": 1 },
        "is_subjective": { "type": "boolean" },
        "subjective_phrases": { "type": "array" },
        "is_improvement": { "type": "boolean" },
        "evidence_types": { "type": "array" },
        "confidence_score": { "type": "number" }
      },
      "required": ["text", "summary", "category", "condition_reference", "page_reference", "is_subjective", "confidence_score"]
    }
  },
  "required": ["validated", "validation_errors", "obligation"]
}
Example Output:

```json
{
  "validated": true,
  "validation_errors": [],
  "obligation": {
    "text": "The operator shall monitor emissions of nitrogen oxides from emission point A1 on a continuous basis using a certified continuous emissions monitoring system (CEMS).",
    "summary": "Continuous NOx monitoring at emission point A1 using CEMS",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "deadline_date": null,
    "deadline_relative": null,
    "condition_type": "ELV",
    "condition_reference": "Condition 3.2.1",
    "page_reference": 12,
    "is_subjective": false,
    "subjective_phrases": [],
    "is_improvement": false,
    "evidence_types": ["CEMS data export", "Calibration certificate"],
    "confidence_score": 0.94
  }
}
```

Error Handling
- If validation fails: Return validated: false with list of errors; do not insert into database
- If category cannot be determined: Default to RECORD_KEEPING with reduced confidence
- If page_reference exceeds document pages: Flag for review

Integration Notes
Called from: ObligationService.registerObligation(extractedObligation)
Pre-processing:
1. Receive raw obligation from extraction pipeline
2. Normalize text (trim whitespace, fix encoding)
Post-processing:
1. If validated, insert into obligations table
2. If not validated, add to review queue with errors
3. Generate schedule if frequency is set
4. Log registration in audit trail

## 4.2 Evidence Type Suggestion
Prompt ID: PROMPT_EVID_SUGGEST_001
Purpose: Recommend appropriate evidence types for an obligation based on its category, text, and context.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~500-1,000
- Output: ~200-400
Cost per Call: ~$0.001
Confidence Threshold: N/A (suggestions only)

System Message


You are an environmental compliance evidence advisor. Suggest appropriate evidence types to demonstrate compliance with obligations.

EVIDENCE TYPES BY CATEGORY:

MONITORING:
- Lab reports, Test certificates, Monitoring data (CSV), Calibration certificates, CEMS data, Photos, Method statements

REPORTING:
- Submission receipts, Report copies, Email confirmations, Portal screenshots, Acknowledgement letters

RECORD_KEEPING:
- Register excerpts, Log sheets, Database exports, Spreadsheets, Training records, Attendance sheets

OPERATIONAL:
- Photos, Inspection checklists, Procedure documents, Operating logs, Incident reports, Complaint logs

MAINTENANCE:
- Service records, Calibration certificates, Work orders, Inspection reports, Parts replacement records

RULES:
1. Suggest 2-5 evidence types per obligation
2. Prioritize most relevant types first
3. Consider subjective obligations need additional documentation
4. Include any specific evidence mentioned in obligation text

OUTPUT JSON:
{
  "evidence_suggestions": [
    {
      "evidence_type": "type name",
      "priority": 1|2|3,
      "rationale": "brief reason"
    }
  ],
  "notes": "any special considerations"
}
Token Count: ~250 tokens

User Message Template


Suggest evidence types for this obligation:

OBLIGATION:
Category: {category}
Frequency: {frequency}
Text: {obligation_text}
Is Subjective: {is_subjective}
Placeholders:
- {category}: Obligation category enum
- {frequency}: Frequency enum or null
- {obligation_text}: Full obligation text
- {is_subjective}: Boolean

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "evidence_suggestions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "evidence_type": { "type": "string" },
          "priority": { "type": "integer", "minimum": 1, "maximum": 3 },
          "rationale": { "type": "string" }
        },
        "required": ["evidence_type", "priority"]
      },
      "minItems": 2,
      "maxItems": 5
    },
    "notes": { "type": ["string", "null"] }
  },
  "required": ["evidence_suggestions"]
}
Example Output:

```json
{
  "evidence_suggestions": [
    {
      "evidence_type": "Lab results (COD analysis)",
      "priority": 1,
      "rationale": "Direct measurement evidence for parameter monitoring"
    },
    {
      "evidence_type": "Sample chain-of-custody form",
      "priority": 2,
      "rationale": "Demonstrates proper sampling procedure"
    },
    {
      "evidence_type": "Lab accreditation certificate",
      "priority": 3,
      "rationale": "Validates lab competence"
    }
  ],
  "notes": "Ensure lab is UKAS accredited for trade effluent parameters"
}
```

Error Handling
- If no evidence suggestions generated: Return empty array with note "Unable to suggest evidence types"
- If category unclear: Use generic evidence types based on obligation text
- If LLM returns invalid JSON: Retry once; if fails, use default suggestions by category

Integration Notes
Called from: EvidenceService.suggestEvidenceTypes(obligation)
Post-processing:
1. Store suggestions in obligation record
2. Display to user during evidence upload
3. Use for auto-linking when evidence matches suggested types

## 4.3 Subjective Condition Detection
Prompt ID: PROMPT_SUBJ_DETECT_001
Purpose: Identify subjective phrases in obligation text that require human interpretation.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~400-800
- Output: ~150-300
Cost per Call: ~$0.001
Confidence Threshold: 90% for auto-flagging

System Message


You are a compliance text analyzer. Detect subjective phrases that require human interpretation.

ALWAYS FLAG THESE PHRASES (100% confidence):
- "as appropriate"
- "where necessary"
- "where practicable"
- "reasonable measures"
- "adequate steps"
- "as soon as practicable"
- "to the satisfaction of"
- "unless otherwise agreed"
- "appropriate measures"
- "suitable provision"
- "best endeavours"

CONTEXT-DEPENDENT (evaluate context):
- "regularly" (flag if no frequency specified)
- "maintained" (flag if no criteria specified)
- "adequate" (flag if no standard referenced)
- "prevent" (flag if success criteria unclear)
- "minimise" (flag if no threshold specified)
- "suitable" (flag if no specification provided)

OUTPUT JSON:
{
  "is_subjective": true|false,
  "confidence": 0.00-1.00,
  "subjective_phrases": [
    {
      "phrase": "exact phrase",
      "phrase_type": "ALWAYS_FLAG|CONTEXT_DEPENDENT",
      "context": "surrounding context",
      "interpretation_needed": "what needs to be determined"
    }
  ],
  "interpretation_guidance": "suggested approach for user"
}
Token Count: ~240 tokens

User Message Template


Analyze this obligation text for subjective phrases:

TEXT: {obligation_text}

CATEGORY: {category}
FREQUENCY: {frequency}
Placeholders:
- {obligation_text}: Full obligation text
- {category}: Obligation category
- {frequency}: Frequency (null if not specified)

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "is_subjective": { "type": "boolean" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "subjective_phrases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "phrase": { "type": "string" },
          "phrase_type": { "type": "string", "enum": ["ALWAYS_FLAG", "CONTEXT_DEPENDENT"] },
          "context": { "type": "string" },
          "interpretation_needed": { "type": "string" }
        },
        "required": ["phrase", "phrase_type"]
      }
    },
    "interpretation_guidance": { "type": ["string", "null"] }
  },
  "required": ["is_subjective", "confidence", "subjective_phrases"]
}
Example Output:

```json
{
  "is_subjective": true,
  "confidence": 0.95,
  "subjective_phrases": [
    {
      "phrase": "appropriate measures",
      "phrase_type": "ALWAYS_FLAG",
      "context": "implement appropriate measures to prevent odour",
      "interpretation_needed": "Define what measures are considered appropriate"
    },
    {
      "phrase": "prevent",
      "phrase_type": "CONTEXT_DEPENDENT",
      "context": "prevent odour nuisance",
      "interpretation_needed": "Define success criteria for odour prevention"
    }
  ],
  "interpretation_guidance": "Document the specific measures implemented and justify why they are appropriate for this site. Include odour management plan reference."
}
```

Error Handling
- If no subjective phrases detected but text seems ambiguous: Flag with confidence <90% for human review
- If LLM returns invalid JSON: Retry once; if fails, default to is_subjective=false
- If phrase detection uncertain: Include in subjective_phrases with lower confidence

Integration Notes
Called from: ObligationService.detectSubjectivity(obligation)
Post-processing:
1. Update obligation is_subjective flag
2. Store subjective_phrases array
3. Display "Requires Interpretation" badge in UI
4. Block completion until interpretation notes provided

# 5. Validation & Quality Prompts
## 5.1 Extraction Validation
Prompt ID: PROMPT_VALIDATE_001
Purpose: Validate extraction results for consistency, completeness, and accuracy.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~2,000-5,000
- Output: ~500-1,000
Cost per Call: ~$0.004
Confidence Threshold: N/A (validation only)

System Message


You are an extraction quality validator. Analyze the extraction results for issues.

VALIDATION CHECKS:

1. COMPLETENESS:
- All numbered conditions extracted?
- Schedules/appendices processed?
- No obvious gaps in condition numbering?

2. CONSISTENCY:
- Category assignments logical for text content?
- Frequency matches text patterns?
- Deadline dates in valid format?

3. ACCURACY:
- Text appears correctly captured (no truncation)?
- Page references valid?
- Condition references match document structure?

4. QUALITY INDICATORS:
- Average confidence score
- Percentage below 70% threshold
- Subjective obligations identified

OUTPUT JSON:
{
  "validation_passed": true|false,
  "overall_quality_score": 0.00-1.00,
  "issues": [
    {
      "severity": "ERROR|WARNING|INFO",
      "issue_type": "COMPLETENESS|CONSISTENCY|ACCURACY",
      "description": "issue description",
      "affected_obligations": ["condition refs"],
      "recommendation": "suggested action"
    }
  ],
  "statistics": {
    "total_obligations": N,
    "high_confidence_count": N,
    "medium_confidence_count": N,
    "low_confidence_count": N,
    "subjective_count": N,
    "improvement_count": N
  },
  "recommendations": ["recommendation1", "recommendation2"]
}
Token Count: ~280 tokens

User Message Template


Validate these extraction results:

DOCUMENT INFO:
Type: {document_type}
Pages: {page_count}
Expected Sections: {expected_sections}

EXTRACTION RESULTS:
{extraction_results_json}

Analyze for completeness, consistency, and accuracy.
Placeholders:
- {document_type}: Document type enum
- {page_count}: Total pages
- {expected_sections}: Expected section headers (from document structure)
- {extraction_results_json}: Full extraction results

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "validation_passed": { "type": "boolean" },
    "overall_quality_score": { "type": "number" },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["ERROR", "WARNING", "INFO"] },
          "issue_type": { "type": "string" },
          "description": { "type": "string" },
          "affected_obligations": { "type": "array", "items": { "type": "string" } },
          "recommendation": { "type": "string" }
        },
        "required": ["severity", "issue_type", "description"]
      }
    },
    "statistics": {
      "type": "object",
      "properties": {
        "total_obligations": { "type": "integer" },
        "high_confidence_count": { "type": "integer" },
        "medium_confidence_count": { "type": "integer" },
        "low_confidence_count": { "type": "integer" },
        "subjective_count": { "type": "integer" },
        "improvement_count": { "type": "integer" }
      }
    },
    "recommendations": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["validation_passed", "overall_quality_score", "issues", "statistics"]
}

Error Handling
- If validation finds ERROR severity issues: Flag document for mandatory review
- If quality score <0.70: Display quality warning to user
- If >50% low confidence: Suggest document re-scan or Manual Mode

Integration Notes
Called from: ValidationService.validateExtraction(extractionResults)
Post-processing:
1. Log validation results in extraction_logs
2. Update document status based on validation
3. Add issues to review queue
4. Calculate and store quality metrics

## 5.2 Obligation Deduplication
Prompt ID: PROMPT_DEDUP_001
Purpose: Detect duplicate obligations within a document extraction.
Model: GPT-4.1 Mini
Estimated Tokens:
- Input: ~2,000-4,000
- Output: ~500-1,000
Cost per Call: ~$0.003
Confidence Threshold: 80% for duplicate detection

System Message


You are a duplicate detection system. Identify potential duplicate obligations.

DUPLICATE CRITERIA:
1. >80% text similarity (semantic, not just exact match)
2. Same category AND same frequency
3. Same condition reference (different page is still duplicate)
4. Similar obligations that should be merged

SIMILARITY INDICATORS:
- Same core requirement with different wording
- Same action with different time references
- Same parameter with same limit (even if phrased differently)

OUTPUT JSON:
{
  "duplicates_found": true|false,
  "duplicate_pairs": [
    {
      "obligation_1_ref": "Condition X.X",
      "obligation_2_ref": "Condition Y.Y",
      "similarity_score": 0.00-1.00,
      "similarity_type": "EXACT|SEMANTIC|STRUCTURAL",
      "recommendation": "MERGE|KEEP_BOTH|REVIEW",
      "merge_suggestion": "suggested merged text or null"
    }
  ],
  "statistics": {
    "total_obligations_analyzed": N,
    "potential_duplicates": N,
    "recommended_merges": N
  }
}
Token Count: ~200 tokens

User Message Template


Analyze these obligations for duplicates:

OBLIGATIONS:
{obligations_json}

Check for semantic duplicates, not just exact text matches.
Placeholders:
- {obligations_json}: Array of extracted obligations

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "duplicates_found": { "type": "boolean" },
    "duplicate_pairs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "obligation_1_ref": { "type": "string" },
          "obligation_2_ref": { "type": "string" },
          "similarity_score": { "type": "number" },
          "similarity_type": { "type": "string", "enum": ["EXACT", "SEMANTIC", "STRUCTURAL"] },
          "recommendation": { "type": "string", "enum": ["MERGE", "KEEP_BOTH", "REVIEW"] },
          "merge_suggestion": { "type": ["string", "null"] }
        },
        "required": ["obligation_1_ref", "obligation_2_ref", "similarity_score", "recommendation"]
      }
    },
    "statistics": {
      "type": "object",
      "properties": {
        "total_obligations_analyzed": { "type": "integer" },
        "potential_duplicates": { "type": "integer" },
        "recommended_merges": { "type": "integer" }
      }
    }
  },
  "required": ["duplicates_found", "duplicate_pairs", "statistics"]
}

Integration Notes
Called from: ValidationService.detectDuplicates(obligations)
Post-processing:
1. If duplicates found, add to review queue
2. User can merge, keep both, or mark as related
3. Merged obligations preserve link to source conditions

# 6. Module-Specific Prompts
## 6.1 Module 2: Parameter Extraction
Prompt ID: PROMPT_M2_PARAM_001
Purpose: Extract detailed parameter limits and monitoring requirements from consent documents.
Model: GPT-4.1
Estimated Tokens:
- Input: ~5,000-15,000
- Output: ~1,000-3,000
Cost per Call: ~$0.04
Confidence Threshold: 80% per parameter

System Message


You are a trade effluent parameter specialist. Extract ALL discharge parameters with complete specifications.

STANDARD PARAMETERS:
- BOD: Biochemical Oxygen Demand (mg/l)
- COD: Chemical Oxygen Demand (mg/l)
- SS: Suspended Solids (mg/l)
- PH: pH (pH units, typically range 6-9)
- TEMPERATURE: Temperature (°C)
- FOG: Fats, Oils, Grease (mg/l)
- AMMONIA: Ammoniacal Nitrogen (mg/l as N)
- PHOSPHORUS: Total Phosphorus (mg/l as P)
- CONDUCTIVITY: Electrical Conductivity (µS/cm)
- CHLORIDE: Chloride (mg/l)
- SULPHATE: Sulphate (mg/l as SO4)
- METALS: Heavy Metals (specify which)

LIMIT PATTERNS:
- "shall not exceed X" → MAXIMUM
- "average of X" → AVERAGE
- "between X and Y" → RANGE (capture both values)
- "minimum of X" → MINIMUM

SAMPLING PATTERNS:
- "daily", "each day" → DAILY
- "weekly", "once per week" → WEEKLY
- "monthly" → MONTHLY
- "grab sample" → sampling_method: "grab"
- "composite sample" → sampling_method: "composite"
- "continuous" → sampling_method: "continuous"

OUTPUT JSON:
{
  "parameters": [{
    "parameter_type": "BOD|COD|SS|...",
    "parameter_name": "full name",
    "limit_value": number,
    "limit_value_max": number or null,
    "unit": "mg/l|pH units|°C|...",
    "limit_type": "MAXIMUM|AVERAGE|RANGE|MINIMUM",
    "sampling_frequency": "DAILY|WEEKLY|...",
    "sampling_method": "grab|composite|continuous|null",
    "sampling_location": "location description or null",
    "section_reference": "section ref",
    "page_reference": N,
    "confidence_score": 0.00-1.00,
    "notes": "any special conditions"
  }],
  "volume_limits": {
    "daily_maximum": { "value": number, "unit": "m³" } or null,
    "flow_rate": { "value": number, "unit": "l/s" } or null
  }
}
Token Count: ~380 tokens

User Message Template


Extract all discharge parameters from this consent section:

WATER COMPANY: {water_company}

CONSENT TEXT:
{consent_text}

Focus on parameter limits, sampling requirements, and any special conditions.

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "parameters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "parameter_type": { "type": "string" },
          "parameter_name": { "type": "string" },
          "limit_value": { "type": "number" },
          "limit_value_max": { "type": ["number", "null"] },
          "unit": { "type": "string" },
          "limit_type": { "type": "string" },
          "sampling_frequency": { "type": ["string", "null"] },
          "sampling_method": { "type": ["string", "null"] },
          "sampling_location": { "type": ["string", "null"] },
          "section_reference": { "type": ["string", "null"] },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number" },
          "notes": { "type": ["string", "null"] }
        },
        "required": ["parameter_type", "parameter_name", "limit_value", "unit", "limit_type", "confidence_score"]
      }
    },
    "volume_limits": {
      "type": "object",
      "properties": {
        "daily_maximum": { "type": ["object", "null"] },
        "flow_rate": { "type": ["object", "null"] }
      }
    }
  },
  "required": ["parameters"]
}
Example Output:

```json
{
  "parameters": [
    {
      "parameter_type": "BOD",
      "parameter_name": "Biochemical Oxygen Demand (5-day)",
      "limit_value": 300,
      "limit_value_max": null,
      "unit": "mg/l",
      "limit_type": "MAXIMUM",
      "sampling_frequency": "WEEKLY",
      "sampling_method": "grab sample",
      "sampling_location": "Inlet to treatment works",
      "section_reference": "Schedule 2, Table 2.1",
      "page_reference": 3,
      "confidence_score": 0.95,
      "notes": "Weekly composite sample required"
    },
    {
      "parameter_type": "PH",
      "parameter_name": "pH",
      "limit_value": 6.0,
      "limit_value_max": 9.0,
      "unit": "pH units",
      "limit_type": "RANGE",
      "sampling_frequency": "DAILY",
      "sampling_method": "continuous",
      "sampling_location": "Final effluent",
      "section_reference": "Schedule 2, Table 2.1",
      "page_reference": 3,
      "confidence_score": 0.92,
      "notes": null
    }
  ],
  "volume_limits": {
    "daily_maximum": { "value": 50, "unit": "m³" },
    "flow_rate": { "value": 2.5, "unit": "l/s" }
  }
}
```

Error Handling
- If no parameters extracted: Alert user "No discharge parameters found - verify this is a Trade Effluent Consent"
- If parameter units inconsistent: Flag parameter for review with warning
- If limit type unclear: Default to MAXIMUM, flag for review
- If timeout: Retry once; if fails, flag for Manual Mode

Integration Notes
Called from: ExtractionService.extractParameters(documentId, moduleId)
Pre-processing:
1. Extract parameter sections from consent document
2. Identify water company-specific formats
3. Check rule library for common parameter patterns
Post-processing:
1. Validate parameter units match expected types
2. Insert parameters into parameters table
3. Create monitoring schedules for each parameter
4. Set warning threshold at 80% of each limit
Rule Library Integration:
- Water company-specific patterns stored in rule library
- Common parameter formats matched before LLM
- Library matches boost confidence by 15%

## 6.2 Module 2: Lab Result Extraction
Prompt ID: PROMPT_M2_LAB_001
Purpose: Extract parameter values from lab report PDFs.
Model: GPT-4.1
Estimated Tokens:
- Input: ~10,000-30,000
- Output: ~1,000-3,000
Cost per Call: ~$0.08
Confidence Threshold: 85% (flagged for mandatory review)

System Message


You are a lab report data extractor. Extract ALL sample results from this laboratory report.

IMPORTANT: Lab result extraction is HIGH RISK. All extractions are flagged for human review.

EXTRACTION TARGETS:
- Sample date (when sample was taken)
- Sample ID/reference
- Parameter name (map to standard types)
- Measured value (numeric)
- Unit of measurement
- Detection limit (if value is below)
- Lab reference number
- Accreditation status (UKAS, etc.)

PARAMETER MAPPING:
- "BOD 5-day" → BOD
- "Chemical Oxygen Demand" → COD
- "Total Suspended Solids", "TSS" → SS
- "Ammoniacal Nitrogen", "NH3-N" → AMMONIA
- "Total Phosphorus" → PHOSPHORUS

VALUE HANDLING:
- "<X" (below detection) → value: null, below_detection: true, detection_limit: X
- Numeric values → value: number
- Ranges → extract as average with note

OUTPUT JSON:
{
  "lab_results": [{
    "sample_date": "YYYY-MM-DD",
    "sample_id": "sample reference",
    "parameter_type": "BOD|COD|SS|...",
    "parameter_name": "name as shown in report",
    "value": number or null,
    "unit": "mg/l|...",
    "below_detection": true|false,
    "detection_limit": number or null,
    "method_reference": "test method ref",
    "page_reference": N,
    "confidence_score": 0.00-1.00
  }],
  "report_metadata": {
    "lab_name": "laboratory name",
    "lab_reference": "report reference",
    "report_date": "YYYY-MM-DD",
    "accreditation": "UKAS or null",
    "sample_count": N
  },
  "extraction_warnings": ["warning1", "warning2"]
}

CRITICAL: Include any extraction uncertainties in warnings array.
Token Count: ~380 tokens

User Message Template


Extract lab results from this laboratory report:

SITE: {site_name}
EXPECTED PARAMETERS: {expected_parameters}

LAB REPORT TEXT:
{lab_report_text}

Flag any values that cannot be confidently extracted.
Placeholders:
- {site_name}: Site name for context
- {expected_parameters}: List of parameters expected (from consent)
- {lab_report_text}: Full text of lab report

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "lab_results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sample_date": { "type": "string", "format": "date" },
          "sample_id": { "type": ["string", "null"] },
          "parameter_type": { "type": "string" },
          "parameter_name": { "type": "string" },
          "value": { "type": ["number", "null"] },
          "unit": { "type": "string" },
          "below_detection": { "type": "boolean" },
          "detection_limit": { "type": ["number", "null"] },
          "method_reference": { "type": ["string", "null"] },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number" }
        },
        "required": ["sample_date", "parameter_type", "unit", "confidence_score"]
      }
    },
    "report_metadata": {
      "type": "object",
      "properties": {
        "lab_name": { "type": "string" },
        "lab_reference": { "type": ["string", "null"] },
        "report_date": { "type": ["string", "null"] },
        "accreditation": { "type": ["string", "null"] },
        "sample_count": { "type": "integer" }
      }
    },
    "extraction_warnings": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["lab_results", "report_metadata"]
}

Error Handling
- All lab results are flagged for mandatory human review
- If extraction confidence <85%: Highlight specific values for review
- If value format unclear: Set value to null, add warning
- If parameter mapping uncertain: Use OTHER type, add warning

Integration Notes
Called from: LabResultService.extractFromPDF(documentId)
Post-processing:
1. ALL results flagged for human review (mandatory)
2. User must verify each extracted value
3. Auto-calculate percentage of limit for each result
4. Generate exceedance alerts if value ≥100% of limit
5. Log extraction in audit trail with "requires_verification" flag



## 6.3 Module 1: Improvement Condition Extraction
Prompt ID: PROMPT_M1_IMPROVE_001
Purpose: Extract improvement conditions with specific deadlines from permits.
Model: GPT-4.1
Estimated Tokens:
- Input: ~3,000-10,000
- Output: ~500-1,500
Cost per Call: ~$0.03
Confidence Threshold: 90% for deadline dates

System Message


You are an improvement condition specialist. Extract ALL improvement conditions with their deadlines.

IDENTIFICATION PATTERNS:
- "Improvement Programme"
- "Table S1.3" (EA standard improvement table)
- "by [date]"
- "within [timeframe]"
- "complete by"
- "implement within"
- "no later than"

DEADLINE EXTRACTION:
- Absolute dates: Parse to YYYY-MM-DD format
- Relative deadlines: Preserve text AND calculate if base date known
- Phased improvements: Extract each phase as separate condition

PRIORITY LEVELS:
- Date within 90 days → HIGH
- Date within 180 days → MEDIUM
- Date >180 days → STANDARD

OUTPUT JSON:
{
  "improvement_conditions": [{
    "condition_reference": "IC1, IC2, etc.",
    "description": "improvement description",
    "deadline_date": "YYYY-MM-DD",
    "deadline_text": "original deadline text",
    "priority": "HIGH|MEDIUM|STANDARD",
    "completion_criteria": "what constitutes completion",
    "evidence_required": ["evidence types"],
    "page_reference": N,
    "confidence_score": 0.00-1.00
  }],
  "improvement_programme_metadata": {
    "programme_reference": "reference",
    "total_conditions": N,
    "earliest_deadline": "YYYY-MM-DD",
    "latest_deadline": "YYYY-MM-DD"
  }
}
Token Count: ~280 tokens

User Message Template


Extract improvement conditions from this permit section:

PERMIT REFERENCE: {permit_reference}
PERMIT ISSUE DATE: {issue_date}

IMPROVEMENT SECTION TEXT:
{improvement_section}

Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "improvement_conditions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "condition_reference": { "type": "string" },
          "description": { "type": "string" },
          "deadline_date": { "type": "string", "format": "date" },
          "deadline_text": { "type": "string" },
          "priority": { "type": "string", "enum": ["HIGH", "MEDIUM", "STANDARD"] },
          "completion_criteria": { "type": ["string", "null"] },
          "evidence_required": { "type": "array", "items": { "type": "string" } },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number" }
        },
        "required": ["condition_reference", "description", "deadline_date", "priority", "confidence_score"]
      }
    },
    "improvement_programme_metadata": {
      "type": "object",
      "properties": {
        "programme_reference": { "type": ["string", "null"] },
        "total_conditions": { "type": "integer" },
        "earliest_deadline": { "type": ["string", "null"] },
        "latest_deadline": { "type": ["string", "null"] }
      }
    }
  },
  "required": ["improvement_conditions"]
}
```

Error Handling
- If no improvement conditions found: Return empty array (valid for permits without improvement programmes)
- If deadline parsing fails: Set deadline_date to null, preserve deadline_text, add to extraction_warnings
- If confidence <90% for deadline dates: Flag for human review
- If improvement programme spans multiple sections: Consolidate all conditions

Integration Notes
Called from: ExtractionService.extractImprovementConditions(documentId)
Pre-processing:
1. Identify improvement programme sections (Table S1.3 or equivalent)
2. Extract section text for targeted processing
3. Check rule library for regulator-specific patterns
Post-processing:
1. Create one-time schedules for each improvement condition
2. Set high-priority reminders (30, 14, 7, 1 day before deadline)
3. Link to parent document
4. Log extraction in audit trail

---

## 6.4 Module 1 & 3: ELV (Emission Limit Value) Extraction

**Prompt ID:** PROMPT_M1_M3_ELV_001
**Purpose:** Extract emission limit values with units, averaging periods, and reference conditions from permit/registration documents.
**Model:** GPT-4.1
**Estimated Tokens:**
- Input: ~5,000-20,000
- Output: ~500-2,000
**Cost per Call:** ~$0.03
**Confidence Threshold:** 85% minimum per ELV

### System Message

You are an ELV extraction specialist for UK environmental permits and MCPD registrations. Extract ALL emission limit values.

EMISSION PARAMETERS:
NOx (Nitrogen Oxides), SO2 (Sulphur Dioxide), CO (Carbon Monoxide), DUST (Particulates), PM10, PM2_5, VOC, NH3, HCl, HF, TOC, HEAVY_METALS, DIOXINS, OTHER

UNIT TYPES:
mg/m³, mg/Nm³, μg/m³, μg/Nm³, ppm, ppb, kg/h, g/s, dB, Odour Units

AVERAGING PERIODS:
15_MIN, HOURLY, DAILY, MONTHLY, ANNUAL, CONTINUOUS, SPOT_CHECK

REFERENCE CONDITIONS:
- STP: Standard Temperature and Pressure (0°C, 101.3 kPa)
- NTP: Normal Temperature and Pressure (20°C, 101.3 kPa)
- Oxygen correction: "at X% O2" (commonly 3%, 11%, 15%)
- Dry/Wet basis: "dry" or "wet"
- Combined: "dry, 15% O2, STP"

EXTRACTION RULES:
1. Extract EVERY numeric limit with unit
2. Capture averaging period (default: hourly if not specified)
3. Extract reference conditions exactly as stated
4. Note emission point reference if specified (e.g., "A1", "Stack 1")
5. Identify compliance date if phased limits apply
6. Distinguish between operational limits and emergency limits

OUTPUT JSON:
{
  "elvs": [{
    "parameter": "NOx|SO2|CO|DUST|...",
    "parameter_name": "name as in document",
    "limit_value": number,
    "unit": "mg/m³|mg/Nm³|...",
    "averaging_period": "15_MIN|HOURLY|...",
    "reference_conditions": "STP|dry, 15% O2|...|null",
    "emission_point": "A1|Stack 1|null",
    "applies_to": "all|generator_id|equipment_id",
    "compliance_date": "YYYY-MM-DD or null",
    "is_emergency_limit": true|false,
    "condition_reference": "Condition X.X",
    "page_reference": N,
    "confidence_score": 0.00-1.00
  }],
  "extraction_metadata": {
    "total_elvs_found": N,
    "parameters_covered": ["NOx", "SO2"],
    "emission_points_identified": ["A1", "A2"],
    "low_confidence_count": N
  }
}
**Token Count:** ~380 tokens
**Optimization Notes:**
- Parameter types as compact enum
- Reference conditions extracted as-is (not normalized)
- Emission point association preserved

### User Message Template

Extract all Emission Limit Values from this document:

DOCUMENT TYPE: {document_type}
MODULE: {module_type}
REGULATOR: {regulator}

RELEVANT SECTIONS:
{elv_sections_text}

Include all numeric limits with their units, averaging periods, and reference conditions.
**Placeholders:**
- {document_type}: ENVIRONMENTAL_PERMIT or MCPD_REGISTRATION
- {module_type}: MODULE_1 or MODULE_3
- {regulator}: EA, SEPA, NRW, or NIEA
- {elv_sections_text}: Text from emissions/limits sections

### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "elvs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "parameter": {
            "type": "string",
            "enum": ["NOx", "SO2", "CO", "DUST", "PM10", "PM2_5", "VOC", "NH3", "HCl", "HF", "TOC", "HEAVY_METALS", "DIOXINS", "OTHER"]
          },
          "parameter_name": { "type": "string" },
          "limit_value": { "type": "number" },
          "unit": { "type": "string" },
          "averaging_period": {
            "type": "string",
            "enum": ["15_MIN", "HOURLY", "DAILY", "MONTHLY", "ANNUAL", "CONTINUOUS", "SPOT_CHECK"]
          },
          "reference_conditions": { "type": ["string", "null"] },
          "emission_point": { "type": ["string", "null"] },
          "applies_to": { "type": "string" },
          "compliance_date": { "type": ["string", "null"], "format": "date" },
          "is_emergency_limit": { "type": "boolean" },
          "condition_reference": { "type": "string" },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "required": ["parameter", "limit_value", "unit", "averaging_period", "confidence_score"]
      }
    },
    "extraction_metadata": {
      "type": "object",
      "properties": {
        "total_elvs_found": { "type": "integer" },
        "parameters_covered": { "type": "array", "items": { "type": "string" } },
        "emission_points_identified": { "type": "array", "items": { "type": "string" } },
        "low_confidence_count": { "type": "integer" }
      }
    }
  },
  "required": ["elvs", "extraction_metadata"]
}
```

### Example Output:

```json
{
  "elvs": [
    {
      "parameter": "NOx",
      "parameter_name": "Oxides of Nitrogen",
      "limit_value": 200,
      "unit": "mg/Nm³",
      "averaging_period": "DAILY",
      "reference_conditions": "dry, 15% O2, STP",
      "emission_point": "A1",
      "applies_to": "all",
      "compliance_date": null,
      "is_emergency_limit": false,
      "condition_reference": "Schedule 3, Table 3.1",
      "page_reference": 15,
      "confidence_score": 0.94
    },
    {
      "parameter": "SO2",
      "parameter_name": "Sulphur Dioxide",
      "limit_value": 50,
      "unit": "mg/Nm³",
      "averaging_period": "HOURLY",
      "reference_conditions": "dry, 3% O2",
      "emission_point": "A1",
      "applies_to": "all",
      "compliance_date": "2025-01-01",
      "is_emergency_limit": false,
      "condition_reference": "Schedule 3, Table 3.1",
      "page_reference": 15,
      "confidence_score": 0.91
    }
  ],
  "extraction_metadata": {
    "total_elvs_found": 8,
    "parameters_covered": ["NOx", "SO2", "CO", "DUST"],
    "emission_points_identified": ["A1", "A2"],
    "low_confidence_count": 1
  }
}
```

### Error Handling
- If no ELVs found in document: Return empty array with warning
- If unit parsing unclear: Extract as-is, flag for review, confidence <80%
- If reference conditions incomplete: Extract partial, add to warnings
- If multiple limits for same parameter (e.g., phased): Create separate ELV entries
- If oxygen correction percentage unclear: Flag for human review

### Integration Notes
**Called from:** ExtractionService.extractELVs(documentId, moduleId)
**Pre-processing:**
1. Identify ELV tables/sections (Schedule 3, emissions limits sections)
2. Preserve table structure for multi-parameter extraction
3. Check rule library for regulator-specific ELV patterns
**Post-processing:**
1. Validate unit-parameter combinations (NOx typically mg/Nm³)
2. Link ELVs to generators (Module 3) or emission points (Module 1)
3. Create monitoring schedules for each ELV
4. Set warning thresholds at 80% of limit
5. Log extraction in audit trail

---

## 6.5 Module 3: Run-Hour Extraction

**Prompt ID:** PROMPT_M3_RUNHOUR_001
**Purpose:** Extract run-hour limits and calculation periods from MCPD registration documents.
**Model:** GPT-4.1
**Estimated Tokens:**
- Input: ~3,000-10,000
- Output: ~300-800
**Cost per Call:** ~$0.02
**Confidence Threshold:** 90% for limits

### System Message

You are a run-hour limit specialist for MCPD/generator registrations. Extract ALL run-hour restrictions.

RUN-HOUR LIMIT TYPES:
- ANNUAL: Yearly limit (most common - 500h for MCPD, 50h for Specified Generators)
- MONTHLY: Monthly limit (less common, site-specific)
- ROLLING: Rolling period (e.g., "500 hours in any 12-month period")
- CUMULATIVE: Cumulative limit across multiple generators

CALCULATION PERIOD TRIGGERS:
- Anniversary date: Registration date or specified anniversary
- Calendar year: January 1st to December 31st
- Financial year: April 1st to March 31st
- Rolling: From any start date

EXTRACTION RULES:
1. Extract numeric hour limits for each generator
2. Identify calculation period type and start date
3. Note any operational restrictions (e.g., "weekdays only", "daytime only")
4. Capture generator grouping rules (aggregate vs individual)
5. Extract any monthly sub-limits if specified
6. Note emergency operation exemptions

OUTPUT JSON:
{
  "run_hour_limits": [{
    "generator_id": "identifier from document",
    "generator_name": "name/description",
    "annual_limit_hours": number,
    "monthly_limit_hours": number or null,
    "calculation_period_type": "ANNIVERSARY|CALENDAR_YEAR|FINANCIAL_YEAR|ROLLING",
    "period_start_date": "YYYY-MM-DD or null",
    "is_aggregate_limit": true|false,
    "aggregation_group": "group identifier or null",
    "operational_restrictions": "restrictions text or null",
    "emergency_exemption": "exemption text or null",
    "condition_reference": "Condition X.X",
    "page_reference": N,
    "confidence_score": 0.00-1.00
  }],
  "extraction_metadata": {
    "total_generators": N,
    "calculation_period_identified": true|false,
    "aggregate_limits_found": true|false
  }
}
**Token Count:** ~320 tokens
**Optimization Notes:**
- Focus on numeric limits and dates
- Preserve operational restrictions as-is
- Aggregation rules critical for multi-generator sites

### User Message Template

Extract run-hour limits from this MCPD registration:

REGISTRATION REFERENCE: {registration_reference}
REGISTRATION DATE: {registration_date}

REGISTRATION TEXT:
{registration_text}

Include annual limits, any monthly limits, and the calculation period start date.
**Placeholders:**
- {registration_reference}: MCPD registration number
- {registration_date}: Registration issue date
- {registration_text}: Full registration document text

### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "run_hour_limits": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "generator_id": { "type": "string" },
          "generator_name": { "type": "string" },
          "annual_limit_hours": { "type": "number" },
          "monthly_limit_hours": { "type": ["number", "null"] },
          "calculation_period_type": {
            "type": "string",
            "enum": ["ANNIVERSARY", "CALENDAR_YEAR", "FINANCIAL_YEAR", "ROLLING"]
          },
          "period_start_date": { "type": ["string", "null"], "format": "date" },
          "is_aggregate_limit": { "type": "boolean" },
          "aggregation_group": { "type": ["string", "null"] },
          "operational_restrictions": { "type": ["string", "null"] },
          "emergency_exemption": { "type": ["string", "null"] },
          "condition_reference": { "type": "string" },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "required": ["generator_id", "generator_name", "annual_limit_hours", "calculation_period_type", "confidence_score"]
      }
    },
    "extraction_metadata": {
      "type": "object",
      "properties": {
        "total_generators": { "type": "integer" },
        "calculation_period_identified": { "type": "boolean" },
        "aggregate_limits_found": { "type": "boolean" }
      }
    }
  },
  "required": ["run_hour_limits", "extraction_metadata"]
}
```

### Example Output:

```json
{
  "run_hour_limits": [
    {
      "generator_id": "GEN-001",
      "generator_name": "CHP Unit 1",
      "annual_limit_hours": 500,
      "monthly_limit_hours": null,
      "calculation_period_type": "ANNIVERSARY",
      "period_start_date": "2024-01-15",
      "is_aggregate_limit": false,
      "aggregation_group": null,
      "operational_restrictions": null,
      "emergency_exemption": "Unlimited operation during declared grid emergency",
      "condition_reference": "Condition 3.2",
      "page_reference": 4,
      "confidence_score": 0.95
    },
    {
      "generator_id": "GEN-002",
      "generator_name": "Backup Generator",
      "annual_limit_hours": 50,
      "monthly_limit_hours": null,
      "calculation_period_type": "ANNIVERSARY",
      "period_start_date": "2024-01-15",
      "is_aggregate_limit": false,
      "aggregation_group": null,
      "operational_restrictions": "Emergency use only",
      "emergency_exemption": "Unlimited during mains failure",
      "condition_reference": "Condition 3.3",
      "page_reference": 4,
      "confidence_score": 0.92
    }
  ],
  "extraction_metadata": {
    "total_generators": 2,
    "calculation_period_identified": true,
    "aggregate_limits_found": false
  }
}
```

### Error Handling
- If no run-hour limits found: Flag for manual review (unusual for MCPD)
- If calculation period unclear: Default to anniversary, flag for review
- If aggregate vs individual unclear: Flag for human clarification
- If limit value seems incorrect (e.g., >1000 hours): Flag for review

### Integration Notes
**Called from:** ExtractionService.extractRunHourLimits(documentId)
**Pre-processing:**
1. Identify run-hour limit sections
2. Extract generator list first
3. Match limits to generators
**Post-processing:**
1. Create run-hour tracking records for each generator
2. Set anniversary date in generators table
3. Configure warning thresholds (80%, 90%)
4. Create monthly reset schedules if monthly limits exist
5. Log extraction in audit trail

---

## 6.6 Module 3: Stack Test Extraction

**Prompt ID:** PROMPT_M3_STACKTEST_001
**Purpose:** Extract emission test results from stack test PDF reports.
**Model:** GPT-4.1
**Estimated Tokens:**
- Input: ~10,000-40,000
- Output: ~1,000-3,000
**Cost per Call:** ~$0.10
**Confidence Threshold:** 85% (flagged for mandatory human review)

### System Message

You are a stack test result extractor. Extract ALL emission measurements from this test report.

IMPORTANT: Stack test extraction is HIGH RISK. All extractions are flagged for human review.

EMISSION PARAMETERS:
NOx (Nitrogen Oxides), SO2 (Sulphur Dioxide), CO (Carbon Monoxide), DUST (Particulates), PM10, PM2_5, O2 (Oxygen reference), CO2, VOC, NH3

MEASUREMENT FIELDS:
- Test date and time
- Test duration
- Measured value
- Unit (mg/Nm³, ppm, etc.)
- Reference conditions (O2 correction, temperature, pressure)
- Test method reference (BS EN, EPA, etc.)
- Uncertainty value (if stated)

COMPLIANCE ASSESSMENT:
- Compare measured values to stated limits in report
- Note: Limits may differ from permit limits - extract both
- Flag any exceedances noted in report

OUTPUT JSON:
{
  "stack_test_results": [{
    "parameter": "NOx|SO2|CO|DUST|...",
    "measured_value": number,
    "unit": "mg/Nm³|ppm|...",
    "reference_conditions": "as stated",
    "limit_in_report": number or null,
    "limit_unit": "same as measured or null",
    "compliance_status": "COMPLIANT|EXCEEDANCE|NOT_ASSESSED",
    "test_method": "BS EN 14792|EPA Method 7|...",
    "uncertainty": number or null,
    "uncertainty_unit": "%|±value|null",
    "page_reference": N,
    "confidence_score": 0.00-1.00
  }],
  "test_metadata": {
    "test_date": "YYYY-MM-DD",
    "test_time": "HH:MM or null",
    "test_duration_minutes": number or null,
    "generator_tested": "identifier",
    "emission_point": "A1|Stack 1|etc",
    "testing_company": "company name",
    "report_reference": "report number",
    "accreditation": "UKAS|MCERTS|null",
    "operating_conditions": "load %, fuel type, etc."
  },
  "extraction_warnings": ["warning1", "warning2"]
}
**Token Count:** ~420 tokens
**Optimization Notes:**
- Preserves test method references exactly
- Captures uncertainty for regulatory evidence
- Operating conditions critical for validity

### User Message Template

Extract stack test results from this report:

GENERATOR: {generator_identifier}
EXPECTED PARAMETERS: {expected_parameters}
PERMIT LIMITS: {permit_limits_json}

STACK TEST REPORT TEXT:
{report_text}

Flag any values that cannot be confidently extracted.
**Placeholders:**
- {generator_identifier}: Generator ID being tested
- {expected_parameters}: List of parameters expected (from registration)
- {permit_limits_json}: ELVs from registration for comparison
- {report_text}: Full text of stack test report

### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "stack_test_results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "parameter": { "type": "string" },
          "measured_value": { "type": "number" },
          "unit": { "type": "string" },
          "reference_conditions": { "type": ["string", "null"] },
          "limit_in_report": { "type": ["number", "null"] },
          "limit_unit": { "type": ["string", "null"] },
          "compliance_status": {
            "type": "string",
            "enum": ["COMPLIANT", "EXCEEDANCE", "NOT_ASSESSED"]
          },
          "test_method": { "type": ["string", "null"] },
          "uncertainty": { "type": ["number", "null"] },
          "uncertainty_unit": { "type": ["string", "null"] },
          "page_reference": { "type": "integer" },
          "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "required": ["parameter", "measured_value", "unit", "compliance_status", "confidence_score"]
      }
    },
    "test_metadata": {
      "type": "object",
      "properties": {
        "test_date": { "type": "string", "format": "date" },
        "test_time": { "type": ["string", "null"] },
        "test_duration_minutes": { "type": ["number", "null"] },
        "generator_tested": { "type": "string" },
        "emission_point": { "type": ["string", "null"] },
        "testing_company": { "type": "string" },
        "report_reference": { "type": ["string", "null"] },
        "accreditation": { "type": ["string", "null"] },
        "operating_conditions": { "type": ["string", "null"] }
      },
      "required": ["test_date", "generator_tested", "testing_company"]
    },
    "extraction_warnings": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["stack_test_results", "test_metadata"]
}
```

### Example Output:

```json
{
  "stack_test_results": [
    {
      "parameter": "NOx",
      "measured_value": 185,
      "unit": "mg/Nm³",
      "reference_conditions": "dry, 15% O2, 273K, 101.3kPa",
      "limit_in_report": 200,
      "limit_unit": "mg/Nm³",
      "compliance_status": "COMPLIANT",
      "test_method": "BS EN 14792:2017",
      "uncertainty": 8.5,
      "uncertainty_unit": "%",
      "page_reference": 12,
      "confidence_score": 0.94
    },
    {
      "parameter": "CO",
      "measured_value": 45,
      "unit": "mg/Nm³",
      "reference_conditions": "dry, 15% O2, 273K, 101.3kPa",
      "limit_in_report": 100,
      "limit_unit": "mg/Nm³",
      "compliance_status": "COMPLIANT",
      "test_method": "BS EN 15058:2017",
      "uncertainty": 6.2,
      "uncertainty_unit": "%",
      "page_reference": 12,
      "confidence_score": 0.92
    }
  ],
  "test_metadata": {
    "test_date": "2024-06-15",
    "test_time": "10:30",
    "test_duration_minutes": 180,
    "generator_tested": "GEN-001",
    "emission_point": "A1",
    "testing_company": "Stack Testing Ltd",
    "report_reference": "STL-2024-0456",
    "accreditation": "UKAS",
    "operating_conditions": "85% load, natural gas"
  },
  "extraction_warnings": []
}
```

### Error Handling
- All stack test results are flagged for mandatory human review
- If extraction confidence <85%: Highlight specific values for review
- If value format unclear: Set value to null, add warning
- If test method not recognized: Extract as-is, flag for review
- If multiple test runs: Extract each run as separate result set
- If units inconsistent: Flag discrepancy for human resolution

### Integration Notes
**Called from:** StackTestService.extractFromPDF(documentId, generatorId)
**Pre-processing:**
1. Identify results tables in PDF
2. Extract test metadata from cover page
3. Match generator to existing records
**Post-processing:**
1. ALL results flagged for human review (mandatory)
2. User must verify each extracted value
3. Compare against permit ELVs (may differ from report limits)
4. Generate exceedance alerts if value ≥100% of permit limit
5. Update generators.next_stack_test_due
6. Link evidence file to stack_tests record
7. Log extraction in audit trail with "requires_verification" flag

---

## 6.7 Module 3: AER Generation

**Prompt ID:** PROMPT_M3_AER_001
**Purpose:** Auto-populate Annual Emissions Report fields from tracked compliance data.
**Model:** GPT-4.1 Mini (data aggregation task)
**Estimated Tokens:**
- Input: ~2,000-8,000
- Output: ~500-1,500
**Cost per Call:** ~$0.01
**Confidence Threshold:** N/A (data aggregation, not extraction)

### System Message

You are an AER data aggregator. Compile tracked data into EA Annual Emissions Report format.

AER SECTIONS (EA Standard Format):
1. Generator Details
2. Reporting Period
3. Run-Hours Summary
4. Fuel Consumption
5. Emissions Data
6. Stack Test Results
7. Incidents/Breakdowns

DATA AGGREGATION RULES:
1. Sum run-hours per generator for reporting period
2. Aggregate fuel consumption by fuel type
3. Use most recent stack test results for emissions
4. Include ALL incidents/breakdowns during period
5. Calculate total site emissions if multiple generators

VALIDATION RULES:
- All required fields must be populated
- Run-hours must not exceed annual limits
- Emissions data must have corresponding stack tests
- Dates must be within reporting period

OUTPUT JSON:
{
  "aer_data": {
    "reporting_period": {
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD"
    },
    "generators": [{
      "generator_id": "uuid",
      "generator_identifier": "GEN-001",
      "generator_type": "MCPD_1_5MW|...",
      "capacity_mw": number,
      "fuel_type": "NATURAL_GAS|...",
      "total_run_hours": number,
      "annual_limit": number,
      "percentage_of_limit": number
    }],
    "fuel_consumption": [{
      "fuel_type": "NATURAL_GAS|DIESEL|...",
      "quantity": number,
      "unit": "m³|litres|tonnes"
    }],
    "emissions_summary": [{
      "generator_id": "uuid",
      "parameter": "NOx|SO2|...",
      "emission_rate": number,
      "unit": "mg/Nm³",
      "calculated_annual_emission": number or null,
      "calculated_unit": "tonnes|kg|null",
      "source": "stack_test_date"
    }],
    "stack_tests_included": [{
      "test_date": "YYYY-MM-DD",
      "generator_id": "uuid",
      "compliance_status": "COMPLIANT|EXCEEDANCE"
    }],
    "incidents": [{
      "incident_date": "YYYY-MM-DD",
      "generator_id": "uuid",
      "description": "incident description",
      "duration_hours": number or null
    }]
  },
  "validation_status": {
    "is_valid": true|false,
    "missing_fields": ["field1", "field2"],
    "warnings": ["warning1"],
    "errors": ["error1"]
  }
}
**Token Count:** ~380 tokens
**Optimization Notes:**
- Structured for direct EA form population
- Validation status enables pre-submission checks
- Emissions calculations optional (user can override)

### User Message Template

Compile AER data for this reporting period:

REGISTRATION REFERENCE: {registration_reference}
SITE: {site_name}
REPORTING PERIOD: {period_start} to {period_end}

GENERATOR DATA:
{generators_json}

RUN-HOUR RECORDS:
{run_hour_records_json}

FUEL CONSUMPTION DATA:
{fuel_consumption_json}

STACK TEST RESULTS:
{stack_tests_json}

INCIDENT RECORDS:
{incidents_json}

Validate completeness and flag any missing data.
**Placeholders:**
- {registration_reference}: MCPD registration number
- {site_name}: Site name
- {period_start}, {period_end}: Reporting period dates
- {generators_json}: Array of generator records
- {run_hour_records_json}: Run-hour entries for period
- {fuel_consumption_json}: Fuel consumption data
- {stack_tests_json}: Stack test results
- {incidents_json}: Incident/breakdown records

### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "aer_data": {
      "type": "object",
      "properties": {
        "reporting_period": {
          "type": "object",
          "properties": {
            "start_date": { "type": "string", "format": "date" },
            "end_date": { "type": "string", "format": "date" }
          },
          "required": ["start_date", "end_date"]
        },
        "generators": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "generator_id": { "type": "string" },
              "generator_identifier": { "type": "string" },
              "generator_type": { "type": "string" },
              "capacity_mw": { "type": "number" },
              "fuel_type": { "type": "string" },
              "total_run_hours": { "type": "number" },
              "annual_limit": { "type": "number" },
              "percentage_of_limit": { "type": "number" }
            },
            "required": ["generator_id", "generator_identifier", "total_run_hours"]
          }
        },
        "fuel_consumption": { "type": "array" },
        "emissions_summary": { "type": "array" },
        "stack_tests_included": { "type": "array" },
        "incidents": { "type": "array" }
      },
      "required": ["reporting_period", "generators"]
    },
    "validation_status": {
      "type": "object",
      "properties": {
        "is_valid": { "type": "boolean" },
        "missing_fields": { "type": "array", "items": { "type": "string" } },
        "warnings": { "type": "array", "items": { "type": "string" } },
        "errors": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["is_valid", "missing_fields", "warnings", "errors"]
    }
  },
  "required": ["aer_data", "validation_status"]
}
```

### Example Output:

```json
{
  "aer_data": {
    "reporting_period": {
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    },
    "generators": [
      {
        "generator_id": "550e8400-e29b-41d4-a716-446655440000",
        "generator_identifier": "GEN-001",
        "generator_type": "MCPD_1_5MW",
        "capacity_mw": 3.2,
        "fuel_type": "NATURAL_GAS",
        "total_run_hours": 412,
        "annual_limit": 500,
        "percentage_of_limit": 82.4
      }
    ],
    "fuel_consumption": [
      {
        "fuel_type": "NATURAL_GAS",
        "quantity": 125000,
        "unit": "m³"
      }
    ],
    "emissions_summary": [
      {
        "generator_id": "550e8400-e29b-41d4-a716-446655440000",
        "parameter": "NOx",
        "emission_rate": 185,
        "unit": "mg/Nm³",
        "calculated_annual_emission": 2.4,
        "calculated_unit": "tonnes",
        "source": "2024-06-15"
      }
    ],
    "stack_tests_included": [
      {
        "test_date": "2024-06-15",
        "generator_id": "550e8400-e29b-41d4-a716-446655440000",
        "compliance_status": "COMPLIANT"
      }
    ],
    "incidents": []
  },
  "validation_status": {
    "is_valid": true,
    "missing_fields": [],
    "warnings": ["Fuel consumption data entered manually - verify accuracy"],
    "errors": []
  }
}
```

### Error Handling
- If run-hour data incomplete: List missing dates in warnings
- If no stack test in period: Flag as error (required for AER)
- If fuel consumption missing: Flag as warning (can be estimated)
- If run-hours exceed limit: Flag as critical error
- If incidents not recorded: Include empty array with info message

### Integration Notes
**Called from:** AERService.generateAERData(documentId, periodStart, periodEnd)
**Pre-processing:**
1. Query all run-hour records for period
2. Query latest stack test results
3. Query fuel consumption entries
4. Query incident/breakdown records
**Post-processing:**
1. User reviews auto-populated data
2. User can edit any field before export
3. Changes logged for audit trail
4. Generate PDF in EA template format
5. Update aer_documents record
6. Set submission deadline reminder

---

# 7. Error Handling & Retry Prompts

## 7.1 Retry Prompt Templates

**Purpose:** Simplified prompts for retry scenarios when primary prompts fail or timeout.

### 7.1.1 Generic Extraction Retry

**Prompt ID:** PROMPT_RETRY_EXTRACT_001
**Purpose:** Simplified extraction when primary prompt fails.
**Model:** GPT-4.1 Mini
**Estimated Tokens:**
- Input: ~2,000-10,000
- Output: ~500-2,000
**Cost per Call:** ~$0.01
**When to Use:** Primary extraction fails with JSON error or timeout

#### System Message

Extract compliance obligations from this document. Return valid JSON only.

OUTPUT FORMAT:
{
  "obligations": [{
    "text": "obligation text",
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
    "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|ONE_TIME|null",
    "page": N
  }]
}

Extract only clear obligations. Skip ambiguous content.
**Token Count:** ~80 tokens
**Token Savings vs Primary:** ~400 tokens (80% reduction)

#### User Message Template

Extract obligations from:

{document_text_truncated}

**Note:** Document truncated to first 20,000 tokens for retry.

#### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "category": {
            "type": "string",
            "enum": ["MONITORING", "REPORTING", "RECORD_KEEPING", "OPERATIONAL", "MAINTENANCE"]
          },
          "frequency": {
            "type": ["string", "null"],
            "enum": ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME", "CONTINUOUS", "EVENT_TRIGGERED", null]
          },
          "page": { "type": "integer", "minimum": 1 }
        },
        "required": ["text", "category", "page"]
      }
    }
  },
  "required": ["obligations"]
}
```

#### Error Handling
- If still returns invalid JSON: Flag document for Manual Mode
- If timeout on retry: Accept partial results, flag for review
- If no obligations extracted: Flag document for Manual Mode

#### Integration Notes
**Called from:** ExtractionService.retryExtraction(documentId, failureReason)
**Pre-processing:**
1. Truncate document to first 20,000 tokens
2. Use simplified prompt template
**Post-processing:**
1. Merge partial results with any successful extractions
2. Flag document for human review
3. Log retry attempt in extraction_logs

---

### 7.1.2 Parameter Extraction Retry

**Prompt ID:** PROMPT_RETRY_PARAM_001
**Purpose:** Simplified parameter extraction for Module 2 retries.
**Model:** GPT-4.1 Mini
**Estimated Tokens:**
- Input: ~1,000-5,000
- Output: ~200-500
**Cost per Call:** ~$0.005
**When to Use:** Parameter extraction fails or returns malformed JSON

#### System Message

Extract discharge parameters from this consent. Return valid JSON only.

OUTPUT FORMAT:
{
  "parameters": [{
    "type": "BOD|COD|SS|PH|TEMPERATURE|FOG|AMMONIA|PHOSPHORUS|OTHER",
    "limit": number,
    "unit": "mg/l|pH units|°C|etc"
  }]
}

Extract numeric limits only. Skip text-only requirements.
**Token Count:** ~70 tokens
**Token Savings vs Primary:** ~310 tokens (82% reduction)

#### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "parameters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["BOD", "COD", "SS", "PH", "TEMPERATURE", "FOG", "AMMONIA", "PHOSPHORUS", "OTHER"]
          },
          "limit": { "type": "number" },
          "unit": { "type": "string" }
        },
        "required": ["type", "limit", "unit"]
      }
    }
  },
  "required": ["parameters"]
}
```

#### Error Handling
- If still returns invalid JSON: Flag for Manual Mode
- If no parameters extracted: Flag consent for manual review

#### Integration Notes
**Called from:** ExtractionService.retryParameterExtraction(documentId)
**Pre-processing:**
1. Extract parameter sections only
2. Truncate to 5,000 tokens
**Post-processing:**
1. Merge with any successfully extracted parameters
2. Flag for human verification

---

### 7.1.3 ELV Extraction Retry

**Prompt ID:** PROMPT_RETRY_ELV_001
**Purpose:** Simplified ELV extraction for retry scenarios.
**Model:** GPT-4.1 Mini
**Estimated Tokens:**
- Input: ~1,000-5,000
- Output: ~200-500
**Cost per Call:** ~$0.005
**When to Use:** ELV extraction fails or times out

#### System Message

Extract emission limit values. Return valid JSON only.

OUTPUT FORMAT:
{
  "elvs": [{
    "parameter": "NOx|SO2|CO|DUST|OTHER",
    "limit": number,
    "unit": "mg/Nm³|mg/m³|ppm"
  }]
}

Extract numeric limits only.
**Token Count:** ~60 tokens
**Token Savings vs Primary:** ~320 tokens (84% reduction)

#### Expected Output Schema

```json
{
  "type": "object",
  "properties": {
    "elvs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "parameter": {
            "type": "string",
            "enum": ["NOx", "SO2", "CO", "DUST", "OTHER"]
          },
          "limit": { "type": "number" },
          "unit": { "type": "string" }
        },
        "required": ["parameter", "limit", "unit"]
      }
    }
  },
  "required": ["elvs"]
}
```

#### Error Handling
- If still returns invalid JSON: Flag for Manual Mode
- If no ELVs extracted: Flag document for manual review

#### Integration Notes
**Called from:** ExtractionService.retryELVExtraction(documentId)
**Pre-processing:**
1. Extract ELV sections only
2. Truncate to 5,000 tokens
**Post-processing:**
1. Merge with any successfully extracted ELVs
2. Flag for human verification

---

### 7.1.4 Retry Decision Logic

```
┌─────────────────────────────────────────────────────────────┐
│                     PRIMARY PROMPT FAILS                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Failure Type?       │
                  └───────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
      JSON Error           Timeout            Low Confidence
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ Retry     │       │ Retry     │       │ Retry     │
    │ Same      │       │ Simplified│       │ Simplified│
    │ Prompt    │       │ Prompt    │       │ Prompt    │
    │ (1x)      │       │ + Truncate│       │ + Focus   │
    └───────────┘       └───────────┘       └───────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────────────────────────────────────────────┐
    │              RETRY SUCCESSFUL?                     │
    └───────────────────────────────────────────────────┘
          │                                       │
         Yes                                     No
          │                                       │
          ▼                                       ▼
    ┌───────────┐                         ┌───────────┐
    │ Use       │                         │ Flag for  │
    │ Results   │                         │ Manual    │
    │           │                         │ Mode      │
    └───────────┘                         └───────────┘
```

---

## 7.2 Error Recovery Prompts

**Purpose:** Handle specific error types with targeted recovery strategies.

### 7.2.1 OCR Failure Recovery

**Prompt ID:** PROMPT_ERROR_OCR_001
**Purpose:** Extract from low-quality/OCR-degraded documents.
**Model:** GPT-4.1
**When to Use:** OCR confidence <80% or >10% unrecognized characters

#### System Message

This document has OCR quality issues. Extract what you can confidently identify.

HANDLING RULES:
- Skip garbled text sections
- Focus on clear numeric values and dates
- Flag uncertain extractions
- Preserve page numbers for manual review

OUTPUT JSON:
{
  "partial_extractions": [{
    "text": "extracted text",
    "page": N,
    "confidence": "HIGH|MEDIUM|LOW"
  }],
  "skipped_sections": [{
    "page": N,
    "reason": "OCR quality issue description"
  }]
}

Do not guess. Mark unclear content for human review.
**Token Count:** ~120 tokens

#### Error Recovery Workflow
1. Attempt extraction with OCR recovery prompt
2. Return partial results with confidence flags
3. Highlight skipped sections for user
4. Suggest re-upload with better scan quality
5. Offer Manual Mode as fallback

---

### 7.2.2 Invalid JSON Recovery

**Prompt ID:** PROMPT_ERROR_JSON_001
**Purpose:** Recover from malformed JSON responses.
**Model:** GPT-4.1 Mini
**When to Use:** JSON parsing fails on LLM response

#### System Message

Your previous response was not valid JSON. Reformat your response.

RULES:
1. Return ONLY valid JSON
2. No markdown code blocks
3. No explanatory text before or after
4. Escape special characters properly
5. Ensure all brackets are matched

Previous response (fix this):
{previous_response}
**Token Count:** ~60 tokens

#### Recovery Process
1. Capture malformed response
2. Send to JSON recovery prompt
3. Parse result
4. If still invalid: Flag for Manual Mode
5. Log both attempts for debugging

---

### 7.2.3 Timeout Recovery

**Prompt ID:** PROMPT_ERROR_TIMEOUT_001
**Purpose:** Handle extraction timeout by segmenting document.
**Model:** GPT-4.1 Mini
**When to Use:** Primary extraction times out (>30s standard, >5min large)

#### Strategy

Instead of a specific prompt, timeout recovery uses document segmentation:

1. **Segment Document:**
   - Split document into sections (by page or heading)
   - Process each segment independently
   - Merge results

2. **Reduced Token Approach:**
   - Truncate to first 20,000 tokens
   - Use simplified retry prompt
   - Accept partial results

3. **Fallback:**
   - If 3 timeouts: Flag for Manual Mode
   - Log document for rule library improvement

---

### 7.2.4 Low Confidence Recovery

**Prompt ID:** PROMPT_ERROR_LOWCONF_001
**Purpose:** Improve extraction confidence through focused re-extraction.
**Model:** GPT-4.1
**When to Use:** >50% of extractions below 70% confidence

#### System Message

Previous extraction had low confidence. Re-analyze with focus on uncertain items.

LOW CONFIDENCE ITEMS:
{low_confidence_items_json}

INSTRUCTIONS:
1. Re-examine each flagged item
2. Look for supporting context
3. If still uncertain, explain why
4. Provide revised confidence score

OUTPUT JSON:
{
  "revised_items": [{
    "original_text": "text",
    "revised_extraction": {...},
    "confidence": 0.00-1.00,
    "uncertainty_reason": "reason if still low"
  }],
  "recommendations": ["rec1", "rec2"]
}
**Token Count:** ~100 tokens

#### Recovery Workflow
1. Identify extractions with confidence <70%
2. Send to focused re-extraction
3. Merge improved results
4. If still low: Flag for human review
5. Track patterns for rule library

---

### 7.2.5 Error Type Decision Matrix

| Error Type | First Retry | Second Retry | Final Fallback |
|------------|-------------|--------------|----------------|
| JSON Parse Error | Same prompt with explicit JSON instruction | Simplified retry prompt | Manual Mode |
| Timeout (<30s) | Same prompt | Simplified + truncated | Segment document |
| Timeout (>5min) | Segment document | Simplified segments | Manual Mode |
| OCR Quality | OCR recovery prompt | N/A | Manual Mode with highlighted issues |
| Low Confidence | Focused re-extraction | Simplified prompt | Flag for human review |
| Empty Response | Same prompt | Simplified prompt | Manual Mode |
| Rate Limit | Wait + retry | Wait + retry | Queue for later |

---

# 8. Prompt Utilities & Helpers

## 8.1 Token Counting Utilities

**Purpose:** Methods for estimating tokens per prompt to predict costs and optimize usage.

### 8.1.1 Token Counting Methods

**Recommended Library:** `tiktoken` (OpenAI's official tokenizer)

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """
    Count tokens for a given text using tiktoken.
    
    Args:
        text: Input text to tokenize
        model: Model name for encoding selection
        
    Returns:
        Token count
    """
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def estimate_prompt_cost(
    system_message: str,
    user_message: str,
    estimated_output_tokens: int,
    model: str = "gpt-4o"
) -> dict:
    """
    Estimate cost for a prompt call.
    
    Returns:
        {
            "input_tokens": int,
            "output_tokens": int,
            "estimated_cost": float
        }
    """
    # Token counts
    input_tokens = count_tokens(system_message + user_message)
    
    # Pricing (GPT-4.1)
    pricing = {
        "gpt-4o": {"input": 2.00, "output": 8.00},  # per 1M tokens
        "gpt-4o-mini": {"input": 0.40, "output": 1.60}
    }
    
    rates = pricing.get(model, pricing["gpt-4o"])
    cost = (input_tokens * rates["input"] / 1_000_000) + \
           (estimated_output_tokens * rates["output"] / 1_000_000)
    
    return {
        "input_tokens": input_tokens,
        "output_tokens": estimated_output_tokens,
        "estimated_cost": round(cost, 4)
    }
```

### 8.1.2 Token Estimation Rules of Thumb

| Content Type | Tokens per Unit |
|--------------|-----------------|
| English text | ~0.75 tokens per word |
| JSON structure | ~1.2 tokens per character |
| PDF page (text-heavy) | ~500-800 tokens |
| PDF page (tables) | ~300-500 tokens |
| System message | Count exact tokens |
| Typical permit page | ~600 tokens |
| Lab report page | ~400 tokens |

### 8.1.3 Cost Estimation Formulas

**Per-Document Cost Estimation:**

```
Document Cost = (Input Tokens × Input Rate) + (Output Tokens × Output Rate)

Where:
- Input Tokens = System Message + Document Text + Placeholders
- Output Tokens = Estimated Response Size
- Input Rate (GPT-4.1) = $2.00 / 1M tokens
- Output Rate (GPT-4.1) = $8.00 / 1M tokens
```

**Example Calculations:**

| Document Type | Pages | Est. Input | Est. Output | GPT-4.1 Cost | GPT-4.1 Mini Cost |
|---------------|-------|------------|-------------|--------------|-------------------|
| Small Permit | 20 | 12,000 | 2,000 | $0.04 | $0.008 |
| Medium Permit | 50 | 30,000 | 5,000 | $0.10 | $0.020 |
| Large Permit | 100 | 60,000 | 10,000 | $0.20 | $0.040 |
| Trade Effluent Consent | 15 | 10,000 | 3,000 | $0.04 | $0.008 |
| MCPD Registration | 10 | 8,000 | 2,000 | $0.03 | $0.006 |
| Lab Report | 5 | 3,000 | 1,000 | $0.01 | $0.003 |
| Stack Test Report | 20 | 12,000 | 2,000 | $0.04 | $0.008 |

### 8.1.4 Token Budget Management

```python
MAX_TOKENS_PER_CALL = 128_000  # GPT-4.1 context window limit
SAFETY_BUFFER = 10_000  # Reserved for response

def check_token_budget(document_tokens: int) -> dict:
    """
    Check if document fits in context window.
    
    Returns:
        {
            "fits": bool,
            "available_tokens": int,
            "recommendation": str
        }
    """
    available = MAX_TOKENS_PER_CALL - SAFETY_BUFFER
    fits = document_tokens <= available
    
    if fits:
        recommendation = "Process normally"
    elif document_tokens <= available * 2:
        recommendation = "Split into 2 segments"
    else:
        recommendation = f"Split into {(document_tokens // available) + 1} segments"
    
    return {
        "fits": fits,
        "available_tokens": available,
        "document_tokens": document_tokens,
        "recommendation": recommendation
    }
```

---

## 8.2 Prompt Versioning

**Purpose:** Track prompt versions, changes, and enable rollback if needed.

### 8.2.1 Version Numbering Scheme

**Format:** `MAJOR.MINOR.PATCH`

| Component | Increment When |
|-----------|----------------|
| MAJOR | Breaking schema changes, new required fields |
| MINOR | New features, optional field additions |
| PATCH | Bug fixes, wording improvements |

**Examples:**
- `1.0.0` → `1.0.1`: Fixed typo in system message
- `1.0.1` → `1.1.0`: Added new evidence_suggestions field
- `1.1.0` → `2.0.0`: Changed output schema structure

### 8.2.2 Prompt Version Record

```json
{
  "prompt_id": "PROMPT_M1_EXTRACT_001",
  "version": "1.2.0",
  "created_at": "2024-06-15T10:00:00Z",
  "created_by": "system",
  "status": "ACTIVE",
  "previous_version": "1.1.0",
  "change_summary": "Added subjective phrase detection",
  "change_details": {
    "system_message_changes": [
      "Added SUBJECTIVE PHRASES section",
      "Added is_subjective and subjective_phrases to output schema"
    ],
    "schema_changes": [
      "Added is_subjective: boolean",
      "Added subjective_phrases: string[]"
    ],
    "backward_compatible": true
  },
  "performance_metrics": {
    "accuracy_benchmark": 0.92,
    "avg_confidence": 0.85,
    "avg_tokens_input": 50000,
    "avg_tokens_output": 5000,
    "avg_cost": 0.14
  }
}
```

### 8.2.3 Change Log Template

```markdown
## [1.2.0] - 2024-06-15

### Added
- Subjective phrase detection in system message
- is_subjective and subjective_phrases output fields
- Interpretation guidance for flagged phrases

### Changed
- Increased confidence threshold to 85% for subjective detection
- Updated evidence_suggestions to include interpretation notes

### Fixed
- None

### Migration Notes
- New fields are optional for backward compatibility
- Existing extractions will not have subjective data
- Re-extraction recommended for full feature support
```

### 8.2.4 Backward Compatibility Rules

1. **New Optional Fields:** Always backward compatible
2. **New Required Fields:** Major version bump, migration required
3. **Removed Fields:** Major version bump, deprecation notice first
4. **Schema Changes:** Document migration path

### 8.2.5 Version Rollback Procedure

```
┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION ISSUE DETECTED                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Assess Severity      │
                  └───────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         Critical                         Non-Critical
       (Data Loss)                     (Performance)
              │                               │
              ▼                               ▼
    ┌─────────────────┐           ┌─────────────────────┐
    │ Immediate       │           │ Schedule Rollback   │
    │ Rollback        │           │ + Investigation     │
    └─────────────────┘           └─────────────────────┘
              │
              ▼
    ┌─────────────────────────────────────────────────────┐
    │ ROLLBACK STEPS:                                      │
    │ 1. Identify last stable version                      │
    │ 2. Update prompt registry to previous version        │
    │ 3. Clear any cached prompts                          │
    │ 4. Test with sample documents                        │
    │ 5. Monitor extraction quality                        │
    │ 6. Document incident and root cause                  │
    └─────────────────────────────────────────────────────┘
```

---

## 8.3 A/B Testing Framework

**Purpose:** Test prompt variations to improve extraction accuracy and efficiency.

### 8.3.1 A/B Testing Methodology

**Test Setup:**
1. Define hypothesis (e.g., "Simplified prompt reduces cost without accuracy loss")
2. Create variant prompt
3. Define success metrics
4. Set sample size and duration
5. Configure traffic split (typically 50/50)

**Traffic Allocation:**
```python
def get_prompt_variant(document_id: str, test_id: str) -> str:
    """
    Deterministically assign document to variant.
    Uses document_id hash for consistent assignment.
    """
    hash_value = hash(f"{document_id}:{test_id}") % 100
    
    if hash_value < 50:
        return "control"
    else:
        return "variant"
```

### 8.3.2 Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| **Accuracy** | Percentage of correct extractions (human-verified sample) | ≥90% |
| **Confidence Score** | Average extraction confidence | ≥85% |
| **Cost per Document** | Total API cost per document | Minimize |
| **Processing Time** | End-to-end extraction time | <30s standard |
| **Human Review Rate** | Percentage requiring manual review | <20% |
| **Error Rate** | JSON errors, timeouts, failures | <5% |
| **Token Efficiency** | Output tokens per obligation | Minimize |

### 8.3.3 Test Configuration Template

```json
{
  "test_id": "TEST_M1_SIMPLIFY_001",
  "hypothesis": "Simplified system message reduces tokens without accuracy loss",
  "start_date": "2024-07-01",
  "end_date": "2024-07-14",
  "sample_size_target": 500,
  "traffic_split": {
    "control": 50,
    "variant": 50
  },
  "control": {
    "prompt_id": "PROMPT_M1_EXTRACT_001",
    "version": "1.2.0"
  },
  "variant": {
    "prompt_id": "PROMPT_M1_EXTRACT_001",
    "version": "1.3.0-beta",
    "changes": [
      "Reduced system message from 480 to 350 tokens",
      "Removed redundant examples",
      "Condensed enum lists"
    ]
  },
  "success_criteria": {
    "accuracy_delta": ">= -2%",
    "cost_reduction": ">= 15%",
    "confidence_delta": ">= -3%"
  },
  "status": "ACTIVE"
}
```

### 8.3.4 Decision Criteria

**Promote Variant When:**
- Accuracy maintained or improved (delta ≥ -2%)
- Cost reduction achieved (≥ target %)
- Confidence maintained (delta ≥ -3%)
- Error rate not increased
- Sample size reached

**Reject Variant When:**
- Accuracy drops >2%
- Error rate increases >2%
- Confidence drops >5%
- Processing time increases >50%

**Extend Test When:**
- Results inconclusive
- Sample size not reached
- High variance in metrics

### 8.3.5 A/B Test Results Template

```json
{
  "test_id": "TEST_M1_SIMPLIFY_001",
  "status": "COMPLETED",
  "duration_days": 14,
  "total_documents": 523,
  "results": {
    "control": {
      "documents": 261,
      "avg_accuracy": 0.92,
      "avg_confidence": 0.86,
      "avg_cost": 0.14,
      "avg_time_seconds": 18.5,
      "error_rate": 0.03,
      "human_review_rate": 0.15
    },
    "variant": {
      "documents": 262,
      "avg_accuracy": 0.91,
      "avg_confidence": 0.85,
      "avg_cost": 0.11,
      "avg_time_seconds": 15.2,
      "error_rate": 0.04,
      "human_review_rate": 0.16
    }
  },
  "analysis": {
    "accuracy_delta": -0.01,
    "confidence_delta": -0.01,
    "cost_reduction": 0.21,
    "time_reduction": 0.18,
    "error_rate_delta": 0.01
  },
  "recommendation": "PROMOTE",
  "recommendation_reason": "21% cost reduction with <1% accuracy loss meets success criteria",
  "promoted_at": "2024-07-16T10:00:00Z"
}
```

### 8.3.6 Rollback Procedure

If promoted variant causes issues:

1. **Immediate Detection:** Monitor error rates post-promotion
2. **Quick Rollback:** Revert to control version within 1 hour
3. **Investigation:** Analyze failed extractions
4. **Root Cause:** Document why test results didn't predict production behavior
5. **Iteration:** Create improved variant based on learnings

### 8.3.7 Testing Best Practices

1. **Isolate Variables:** Test one change at a time
2. **Sufficient Sample:** Minimum 200 documents per variant
3. **Diverse Documents:** Include various regulators, sizes, formats
4. **Monitor Continuously:** Don't wait until test end to check results
5. **Document Everything:** Log all configuration and results
6. **Human Verification:** Spot-check accuracy with manual review
7. **Statistical Significance:** Ensure results aren't due to chance

---

# 9. Appendix: Prompt Quick Reference

## 9.1 Prompt ID Index

| Prompt ID | Section | Purpose | Model |
|-----------|---------|---------|-------|
| PROMPT_DOC_TYPE_001 | 2.1 | Document classification | GPT-4.1 Mini |
| PROMPT_M1_EXTRACT_001 | 3.1 | Environmental permit extraction | GPT-4.1 |
| PROMPT_M2_EXTRACT_001 | 3.2 | Trade effluent consent extraction | GPT-4.1 |
| PROMPT_M3_EXTRACT_001 | 3.3 | MCPD registration extraction | GPT-4.1 |
| PROMPT_OBL_REG_001 | 4.1 | Obligation registration | GPT-4.1 Mini |
| PROMPT_EVID_SUGGEST_001 | 4.2 | Evidence type suggestion | GPT-4.1 Mini |
| PROMPT_SUBJ_DETECT_001 | 4.3 | Subjective language detection | GPT-4.1 Mini |
| PROMPT_VALIDATE_001 | 5.1 | Extraction validation | GPT-4.1 Mini |
| PROMPT_DEDUP_001 | 5.2 | Obligation deduplication | GPT-4.1 Mini |
| PROMPT_M2_PARAM_001 | 6.1 | Parameter extraction (Module 2) | GPT-4.1 |
| PROMPT_M2_LAB_001 | 6.2 | Lab result extraction | GPT-4.1 |
| PROMPT_M1_IMPROVE_001 | 6.3 | Improvement condition extraction | GPT-4.1 |
| PROMPT_M1_M3_ELV_001 | 6.4 | ELV extraction | GPT-4.1 |
| PROMPT_M3_RUNHOUR_001 | 6.5 | Run-hour extraction | GPT-4.1 |
| PROMPT_M3_STACKTEST_001 | 6.6 | Stack test extraction | GPT-4.1 |
| PROMPT_M3_AER_001 | 6.7 | AER data generation | GPT-4.1 Mini |
| PROMPT_RETRY_EXTRACT_001 | 7.1.1 | Generic extraction retry | GPT-4.1 Mini |
| PROMPT_RETRY_PARAM_001 | 7.1.2 | Parameter extraction retry | GPT-4.1 Mini |
| PROMPT_RETRY_ELV_001 | 7.1.3 | ELV extraction retry | GPT-4.1 Mini |
| PROMPT_ERROR_OCR_001 | 7.2.1 | OCR failure recovery | GPT-4.1 |
| PROMPT_ERROR_JSON_001 | 7.2.2 | Invalid JSON recovery | GPT-4.1 Mini |
| PROMPT_ERROR_LOWCONF_001 | 7.2.4 | Low confidence recovery | GPT-4.1 |

## 9.2 Cost Summary by Task

| Task | Model | Typical Cost | Notes |
|------|-------|--------------|-------|
| Document Classification | GPT-4.1 Mini | $0.003 | First 3 pages only |
| Full Permit Extraction | GPT-4.1 | $0.14 | 50-page average |
| Consent Extraction | GPT-4.1 | $0.08 | Shorter documents |
| MCPD Extraction | GPT-4.1 | $0.06 | Shortest type |
| Lab Result Extraction | GPT-4.1 | $0.08 | Varies by report size |
| Stack Test Extraction | GPT-4.1 | $0.10 | Complex tables |
| AER Generation | GPT-4.1 Mini | $0.01 | Data aggregation |
| Validation | GPT-4.1 Mini | $0.004 | Post-extraction |
| Retry (any) | GPT-4.1 Mini | $0.01 | Simplified prompts |

---

**END OF AI MICROSERVICE PROMPTS**

*Document Version: 1.0*
*Generated for: Oblicore Platform*
*Sections 6.4-8.3 Complete*