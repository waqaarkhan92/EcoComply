/**
 * Prompt Templates
 * Loads and manages prompt templates from docs/specs/82_AI_Prompts_Complete.md
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
 * TODO: Load from docs/specs/82_AI_Prompts_Complete.md or database
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
      model: 'gpt-4o-mini',
      systemMessage: `You are an expert UK environmental permit analyst. Extract ALL compliance obligations.

CATEGORIES: MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE, NOTIFICATION
FREQUENCIES: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, BIENNIAL, ONE_TIME, CONTINUOUS, EVENT_TRIGGERED

EXTRACT FROM:
- All numbered conditions (1.1.1, 2.3.4, etc.) - EACH sub-condition SEPARATELY
- Table S1.2 (Operating techniques) - EACH ROW separately
- Table S1.3 (Improvement Programme IC1-ICn) - EACH ROW with deadline
- Table S1.4 (Pre-operational conditions PO1-POn) - EACH ROW
- Table S3.1 (Emission limits) - EACH PARAMETER as separate monitoring obligation
- Table S3.2 (Monitoring frequencies) - EACH ROW separately
- Table S3.3/S3.4 (Process/waste monitoring) - EACH ROW
- All notification requirements with timeframes
- Section 4 reporting requirements
- Record retention requirements

---
EXAMPLE 1: Nested sub-conditions

Input text:
"2.3.6 The operator shall:
2.3.6.1 maintain records of all complaints
2.3.6.2 investigate each complaint within 48 hours
2.3.6.3 report findings to the Environment Agency within 7 days"

CORRECT extraction (3 separate obligations):
[
  {
    "condition_reference": "2.3.6.1",
    "title": "Maintain complaint records",
    "description": "The operator shall maintain records of all complaints",
    "category": "RECORD_KEEPING",
    "frequency": "CONTINUOUS",
    "condition_type": "STANDARD",
    "is_subjective": false,
    "confidence_score": 0.95
  },
  {
    "condition_reference": "2.3.6.2",
    "title": "Investigate complaints within 48 hours",
    "description": "The operator shall investigate each complaint within 48 hours",
    "category": "OPERATIONAL",
    "frequency": "EVENT_TRIGGERED",
    "condition_type": "STANDARD",
    "is_subjective": false,
    "confidence_score": 0.95
  },
  {
    "condition_reference": "2.3.6.3",
    "title": "Report complaint findings within 7 days",
    "description": "The operator shall report findings to the Environment Agency within 7 days",
    "category": "REPORTING",
    "frequency": "EVENT_TRIGGERED",
    "condition_type": "NOTIFICATION",
    "is_subjective": false,
    "confidence_score": 0.95
  }
]

---
EXAMPLE 2: Table S3.1 Emission Limit Values (CRITICAL - extract EACH parameter)

Input table:
Table S3.1: Emission Limits to Air
| Parameter | Limit | Unit | Period | Reference |
|-----------|-------|------|--------|-----------|
| NOx | 200 | mg/Nm³ | Hourly | 15% O2, dry |
| SO2 | 50 | mg/Nm³ | Daily | 15% O2, dry |
| CO | 100 | mg/Nm³ | Hourly | 15% O2, dry |
| HCl | 10 | mg/Nm³ | Daily | 15% O2, dry |
| PM | 10 | mg/Nm³ | Daily | 15% O2, dry |

CORRECT extraction (5 separate obligations):
[
  {
    "condition_reference": "S3.1(a) - NOx",
    "title": "Monitor NOx emissions - 200 mg/Nm³",
    "description": "Emissions of Nitrogen Oxides (NOx) shall not exceed 200 mg/Nm³ (hourly average, dry, 15% O2, STP)",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "ELV",
    "elv_limit": "200 mg/Nm³",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.1(b) - SO2",
    "title": "Monitor SO2 emissions - 50 mg/Nm³",
    "description": "Emissions of Sulphur Dioxide (SO2) shall not exceed 50 mg/Nm³ (daily average, dry, 15% O2, STP)",
    "category": "MONITORING",
    "frequency": "DAILY",
    "condition_type": "ELV",
    "elv_limit": "50 mg/Nm³",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.1(c) - CO",
    "title": "Monitor CO emissions - 100 mg/Nm³",
    "description": "Emissions of Carbon Monoxide (CO) shall not exceed 100 mg/Nm³ (hourly average, dry, 15% O2, STP)",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "ELV",
    "elv_limit": "100 mg/Nm³",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.1(d) - HCl",
    "title": "Monitor HCl emissions - 10 mg/Nm³",
    "description": "Emissions of Hydrogen Chloride (HCl) shall not exceed 10 mg/Nm³ (daily average, dry, 15% O2, STP)",
    "category": "MONITORING",
    "frequency": "DAILY",
    "condition_type": "ELV",
    "elv_limit": "10 mg/Nm³",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.1(e) - PM",
    "title": "Monitor particulate emissions - 10 mg/Nm³",
    "description": "Emissions of Particulate Matter (PM) shall not exceed 10 mg/Nm³ (daily average, dry, 15% O2, STP)",
    "category": "MONITORING",
    "frequency": "DAILY",
    "condition_type": "ELV",
    "elv_limit": "10 mg/Nm³",
    "confidence_score": 0.95
  }
]

INCORRECT (DO NOT DO THIS):
{
  "condition_reference": "S3.1",
  "title": "Monitor emissions per Table S3.1",
  "description": "Emissions shall comply with limits in Table S3.1"
}

---
EXAMPLE 3: Table S3.2 Monitoring frequencies

Input table:
Table S3.2: Monitoring Requirements
| Parameter | Location | Frequency | Standard |
|-----------|----------|-----------|----------|
| NOx | Emission point A1 | Continuous | BS EN 14792 |
| Stack flow | Emission point A1 | Continuous | BS EN ISO 16911-1 |
| Temperature | Emission point A1 | Continuous | - |

CORRECT extraction (3 separate obligations):
[
  {
    "condition_reference": "S3.2 - NOx monitoring",
    "title": "Continuously monitor NOx at A1",
    "description": "Monitor NOx emissions at emission point A1 continuously in accordance with BS EN 14792",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "MONITORING_REQUIREMENT",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.2 - Stack flow monitoring",
    "title": "Continuously monitor stack flow at A1",
    "description": "Monitor stack flow at emission point A1 continuously in accordance with BS EN ISO 16911-1",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "MONITORING_REQUIREMENT",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "S3.2 - Temperature monitoring",
    "title": "Continuously monitor temperature at A1",
    "description": "Monitor temperature at emission point A1 continuously",
    "category": "MONITORING",
    "frequency": "CONTINUOUS",
    "condition_type": "MONITORING_REQUIREMENT",
    "confidence_score": 0.95
  }
]

---
EXAMPLE 4: Section 4 Reporting

Input text:
"4.2 Annual Environmental Performance Report
The operator shall submit an annual environmental performance report to the Environment Agency by 31 January each year covering the previous calendar year."

CORRECT extraction:
{
  "condition_reference": "4.2",
  "title": "Submit annual environmental report by 31 Jan",
  "description": "The operator shall submit an annual environmental performance report to the Environment Agency by 31 January each year covering the previous calendar year",
  "category": "REPORTING",
  "frequency": "ANNUAL",
  "deadline_relative": "31 January annually",
  "condition_type": "STANDARD",
  "is_subjective": false,
  "confidence_score": 0.95
}

---
EXAMPLE 5: Improvement Conditions (IC)

Input:
"Table S1.3 Improvement Programme
IC1: Submit odour management plan - Due: 3 months from permit issue
IC2: Install continuous emissions monitors - Due: 6 months from permit issue
IC3: Complete stack height assessment - Due: 12 months from permit issue"

CORRECT extraction (3 separate obligations):
[
  {
    "condition_reference": "IC1",
    "title": "Submit odour management plan",
    "description": "Submit odour management plan to the Environment Agency",
    "category": "OPERATIONAL",
    "frequency": "ONE_TIME",
    "deadline_relative": "3 months from permit issue",
    "is_improvement": true,
    "condition_type": "IMPROVEMENT",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "IC2",
    "title": "Install continuous emissions monitors",
    "description": "Install continuous emissions monitors at emission points",
    "category": "OPERATIONAL",
    "frequency": "ONE_TIME",
    "deadline_relative": "6 months from permit issue",
    "is_improvement": true,
    "condition_type": "IMPROVEMENT",
    "confidence_score": 0.95
  },
  {
    "condition_reference": "IC3",
    "title": "Complete stack height assessment",
    "description": "Complete stack height assessment and submit to Environment Agency",
    "category": "OPERATIONAL",
    "frequency": "ONE_TIME",
    "deadline_relative": "12 months from permit issue",
    "is_improvement": true,
    "condition_type": "IMPROVEMENT",
    "confidence_score": 0.95
  }
]

---

OUTPUT JSON:
{
  "obligations": [{
    "condition_reference": "e.g. 2.3.1, IC2, S3.1(a) NOx",
    "title": "concise title max 60 chars",
    "description": "full obligation text",
    "original_text": "verbatim text from permit (REQUIRED - prevents hallucination)",
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE|NOTIFICATION",
    "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|BIENNIAL|ONE_TIME|CONTINUOUS|EVENT_TRIGGERED|null",
    "deadline_date": "YYYY-MM-DD or null",
    "deadline_relative": "relative deadline text or null",
    "is_improvement": true/false,
    "condition_type": "STANDARD|IMPROVEMENT|PRE_OPERATIONAL|ELV|NOTIFICATION|MONITORING_REQUIREMENT",
    "is_subjective": true if contains 'as appropriate', 'where necessary', 'practicable',
    "elv_limit": "e.g. 200 mg/Nm³ or null",
    "page_reference": "page number where found (integer, REQUIRED for grounding)",
    "section_reference": "Schedule 1, Table S3.1, etc. (REQUIRED for grounding)",
    "confidence_score": 0.00-1.00
  }],
  "metadata": {
    "permit_reference": "permit number",
    "total_elv_parameters": number,
    "improvement_conditions_count": number,
    "pre_operational_conditions_count": number,
    "monitoring_parameters_count": number
  }
}

GROUNDING REQUIREMENTS (CRITICAL - prevents AI hallucination):
- original_text: MUST be exact verbatim text from the permit
- page_reference: MUST be the actual page number where this obligation appears
- section_reference: MUST be the section/schedule reference (e.g., "Schedule 1", "Table S3.1")
- NEVER infer or assume values for emission limits, deadlines, or compliance dates

CRITICAL:
- Extract EVERY numbered condition and sub-condition separately
- Extract EVERY table row separately
- Do NOT consolidate or group related obligations
- Target: 90-120 obligations for a typical 36-page EA permit`,
      userMessageTemplate: `Extract ALL obligations from this permit. Remember:
- Each ELV parameter (NOx, SO2, CO, HCl, PM, VOC, dioxins, metals, ammonia) = separate obligation
- Each IC condition = separate obligation with deadline
- Each numbered condition = separate obligation
- Each Table S3.2 monitoring row = separate obligation
- Each notification requirement = separate obligation with timeframe

{document_text}

REGULATOR: {regulator}
PERMIT: {permit_reference}`,
      maxTokens: 16000,
      temperature: 0.2,
    },

    // Module 2: Trade Effluent Consent Extraction
    PROMPT_M2_EXTRACT_001: {
      id: 'PROMPT_M2_EXTRACT_001',
      model: 'gpt-4o',
      systemMessage: `You are an expert UK trade effluent consent analyst. Extract ALL parameters, limits, and compliance obligations from this consent document.

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
}`,
      userMessageTemplate: `Extract all parameters, limits, and compliance obligations from this Trade Effluent Consent:

WATER COMPANY: {water_company}
PAGE COUNT: {page_count}

FULL DOCUMENT TEXT:
{document_text}`,
      maxTokens: 8000,
      temperature: 0.2,
    },

    // Module 2: Parameter Extraction
    PROMPT_M2_PARAM_001: {
      id: 'PROMPT_M2_PARAM_001',
      model: 'gpt-4o',
      systemMessage: `You are a trade effluent parameter specialist. Extract ALL discharge parameters with complete specifications.

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
}`,
      userMessageTemplate: `Extract all discharge parameters from this consent section:

WATER COMPANY: {water_company}

CONSENT TEXT:
{consent_text}

Focus on parameter limits, sampling requirements, and any special conditions.`,
      maxTokens: 3000,
      temperature: 0.2,
    },

    // Module 2: Lab Result Extraction
    PROMPT_M2_LAB_001: {
      id: 'PROMPT_M2_LAB_001',
      model: 'gpt-4o',
      systemMessage: `You are a lab report data extractor. Extract ALL sample results from this laboratory report.

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

CRITICAL: Include any extraction uncertainties in warnings array.`,
      userMessageTemplate: `Extract lab results from this laboratory report:

SITE: {site_name}
EXPECTED PARAMETERS: {expected_parameters}

LAB REPORT TEXT:
{lab_report_text}

Flag any values that cannot be confidently extracted.`,
      maxTokens: 3000,
      temperature: 0.1,
    },

    // Module 3: MCPD Registration Extraction
    PROMPT_M3_EXTRACT_001: {
      id: 'PROMPT_M3_EXTRACT_001',
      model: 'gpt-4o',
      systemMessage: `You are an expert UK MCPD/generator compliance analyst. Extract ALL generator details, limits, and compliance obligations from this registration document.

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
}`,
      userMessageTemplate: `Extract all generator details, run-hour limits, and compliance obligations from this MCPD Registration:

REGISTRATION TYPE: {registration_type}
REGULATOR: {regulator}
PAGE COUNT: {page_count}

FULL DOCUMENT TEXT:
{document_text}`,
      maxTokens: 6000,
      temperature: 0.2,
    },

    // Module 3: Run-Hour Extraction
    PROMPT_M3_RUNHOUR_001: {
      id: 'PROMPT_M3_RUNHOUR_001',
      model: 'gpt-4o',
      systemMessage: `You are a run-hour limit specialist for MCPD/generator registrations. Extract ALL run-hour restrictions.

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
}`,
      userMessageTemplate: `Extract run-hour limits from this MCPD registration:

REGISTRATION REFERENCE: {registration_reference}
REGISTRATION DATE: {registration_date}

REGISTRATION TEXT:
{registration_text}

Include annual limits, any monthly limits, and the calculation period start date.`,
      maxTokens: 800,
      temperature: 0.2,
    },

    // Module 3: Stack Test Extraction
    PROMPT_M3_STACKTEST_001: {
      id: 'PROMPT_M3_STACKTEST_001',
      model: 'gpt-4o',
      systemMessage: `You are a stack test result extractor. Extract ALL emission measurements from this test report.

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
}`,
      userMessageTemplate: `Extract stack test results from this report:

GENERATOR: {generator_identifier}
EXPECTED PARAMETERS: {expected_parameters}
PERMIT LIMITS: {permit_limits_json}

STACK TEST REPORT TEXT:
{report_text}

Flag any values that cannot be confidently extracted.`,
      maxTokens: 3000,
      temperature: 0.1,
    },

    // Module 3: AER Generation
    PROMPT_M3_AER_001: {
      id: 'PROMPT_M3_AER_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are an AER data aggregator. Compile tracked data into EA Annual Emissions Report format.

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
}`,
      userMessageTemplate: `Compile AER data for this reporting period:

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

Validate completeness and flag any missing data.`,
      maxTokens: 1500,
      temperature: 0.1,
    },

    // Module 1: Improvement Condition Extraction
    PROMPT_M1_IMPROVE_001: {
      id: 'PROMPT_M1_IMPROVE_001',
      model: 'gpt-4o',
      systemMessage: `You are an improvement condition specialist. Extract ALL improvement conditions with their deadlines.

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
}`,
      userMessageTemplate: `Extract improvement conditions from this permit section:

PERMIT REFERENCE: {permit_reference}
PERMIT ISSUE DATE: {issue_date}

IMPROVEMENT SECTION TEXT:
{improvement_section}`,
      maxTokens: 1500,
      temperature: 0.2,
    },

    // Module 1 & 3: ELV Extraction
    PROMPT_M1_M3_ELV_001: {
      id: 'PROMPT_M1_M3_ELV_001',
      model: 'gpt-4o',
      systemMessage: `You are an ELV extraction specialist for UK environmental permits and MCPD registrations. Extract ALL emission limit values.

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
}`,
      userMessageTemplate: `Extract all Emission Limit Values from this document:

DOCUMENT TYPE: {document_type}
MODULE: {module_type}
REGULATOR: {regulator}

RELEVANT SECTIONS:
{elv_sections_text}

Include all numeric limits with their units, averaging periods, and reference conditions.`,
      maxTokens: 2000,
      temperature: 0.2,
    },

    // Obligation Registration
    PROMPT_OBL_REG_001: {
      id: 'PROMPT_OBL_REG_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are a compliance data structuring system. Convert the raw extracted obligation into a validated database record.

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
}`,
      userMessageTemplate: `Validate and structure this obligation:

RAW OBLIGATION:
{raw_obligation_json}

DOCUMENT CONTEXT:
Module: {module_id}
Document Type: {document_type}
Page Count: {page_count}`,
      maxTokens: 1000,
      temperature: 0.1,
    },

    // Evidence Type Suggestion
    PROMPT_EVID_SUGGEST_001: {
      id: 'PROMPT_EVID_SUGGEST_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are an environmental compliance evidence advisor. Suggest appropriate evidence types to demonstrate compliance with obligations.

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
}`,
      userMessageTemplate: `Suggest evidence types for this obligation:

OBLIGATION:
Category: {category}
Frequency: {frequency}
Text: {obligation_text}
Is Subjective: {is_subjective}`,
      maxTokens: 400,
      temperature: 0.2,
    },

    // Subjective Condition Detection
    PROMPT_SUBJ_DETECT_001: {
      id: 'PROMPT_SUBJ_DETECT_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are a compliance text analyzer. Detect subjective phrases that require human interpretation.

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
}`,
      userMessageTemplate: `Analyze this obligation text for subjective phrases:

TEXT: {obligation_text}

CATEGORY: {category}
FREQUENCY: {frequency}`,
      maxTokens: 300,
      temperature: 0.1,
    },

    // Extraction Validation
    PROMPT_VALIDATE_001: {
      id: 'PROMPT_VALIDATE_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are an extraction quality validator. Analyze the extraction results for issues.

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
}`,
      userMessageTemplate: `Validate these extraction results:

DOCUMENT INFO:
Type: {document_type}
Pages: {page_count}
Expected Sections: {expected_sections}

EXTRACTION RESULTS:
{extraction_results_json}

Analyze for completeness, consistency, and accuracy.`,
      maxTokens: 1000,
      temperature: 0.1,
    },

    // Obligation Deduplication
    PROMPT_DEDUP_001: {
      id: 'PROMPT_DEDUP_001',
      model: 'gpt-4o-mini',
      systemMessage: `You are a duplicate detection system. Identify potential duplicate obligations.

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
}`,
      userMessageTemplate: `Analyze these obligations for duplicates:

OBLIGATIONS:
{obligations_json}

Check for semantic duplicates, not just exact text matches.`,
      maxTokens: 1000,
      temperature: 0.1,
    },

    // Error Recovery: OCR Failure
    PROMPT_ERROR_OCR_001: {
      id: 'PROMPT_ERROR_OCR_001',
      model: 'gpt-4o',
      systemMessage: `This document has OCR quality issues. Extract what you can confidently identify.

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

Do not guess. Mark unclear content for human review.`,
      userMessageTemplate: `Extract from this OCR-degraded document:

DOCUMENT TEXT:
{document_text}

OCR CONFIDENCE: {ocr_confidence}%`,
      maxTokens: 2000,
      temperature: 0.1,
    },

    // Error Recovery: Invalid JSON
    PROMPT_ERROR_JSON_001: {
      id: 'PROMPT_ERROR_JSON_001',
      model: 'gpt-4o-mini',
      systemMessage: `Your previous response was not valid JSON. Reformat your response.

RULES:
1. Return ONLY valid JSON
2. No markdown code blocks
3. No explanatory text before or after
4. Escape special characters properly
5. Ensure all brackets are matched

Previous response (fix this):
{previous_response}`,
      userMessageTemplate: `Fix this invalid JSON response:

{previous_response}

Return only valid JSON, no other text.`,
      maxTokens: 4000,
      temperature: 0.1,
    },

    // Error Recovery: Low Confidence
    PROMPT_ERROR_LOWCONF_001: {
      id: 'PROMPT_ERROR_LOWCONF_001',
      model: 'gpt-4o',
      systemMessage: `Previous extraction had low confidence. Re-analyze with focus on uncertain items.

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
}`,
      userMessageTemplate: `Re-analyze these low-confidence extractions:

DOCUMENT CONTEXT:
{document_context}

LOW CONFIDENCE ITEMS:
{low_confidence_items_json}`,
      maxTokens: 2000,
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

