# AI Layer Design & Cost Optimization
## Oblicore Platform — Modules 1–3

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Depends On:** Product Logic Specification (PLS), Canonical Dictionary  
**Purpose:** Technical specification for AI integration layer, prompt engineering, and cost optimization

> [v1 UPDATE – Version Header – 2024-12-27]

---

# 1. Model Selection & Strategy

## 1.1 Primary Model: GPT-4.1

**Model Identifier:** `gpt-4o`

**Pricing (November 2025):**
- Input: $2.00 per 1M tokens
- Output: $8.00 per 1M tokens

**Context Window:** 1,000,000 tokens

**Use Cases:**
- All document extraction tasks (permits, consents, registrations)
- Obligation parsing and categorisation
- Parameter extraction (Module 2)
- Run-hour extraction (Module 3)
- Subjective language detection
- Confidence scoring

**Why GPT-4.1:**
- 1M token context processes entire documents without segmentation
- Best instruction following for structured output
- Enhanced coding capabilities for JSON parsing
- 26% cheaper than GPT-4o ($2/$8 vs $2.50/$10)
- Superior accuracy for compliance-critical extractions

**Cost per Document:** ~$0.14 (typical 50k input, 5k output tokens)

## 1.2 Secondary Model: GPT-4.1 Mini

**Model Identifier:** `gpt-4o-mini`

**Pricing (November 2025):**
- Input: $0.40 per 1M tokens
- Output: $1.60 per 1M tokens

**Context Window:** 1,000,000 tokens

**Use Cases:**
- Evidence type suggestions
- Simple categorisation (when rule library match exists)
- Pre-filtering and validation tasks
- Non-critical classifications

**Why GPT-4.1 Mini:**
- 80% cheaper than GPT-4.1
- Same 1M token context window
- Matches or exceeds GPT-4o performance
- 50% latency reduction vs GPT-4o
- Suitable for non-critical tasks where cost outweighs marginal accuracy gains

**Cost per Task:** ~$0.028

## 1.3 Model Selection Logic

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

## 1.4 Implementation Configuration

```typescript
// config/ai.config.ts

export const AI_CONFIG = {
  models: {
    primary: {
      identifier: 'gpt-4o',
      maxContextTokens: 1_000_000,
      safeContextLimit: 800_000, // Leave buffer for response
      inputCostPer1M: 2.00,
      outputCostPer1M: 8.00,
      timeout: 30_000, // 30 seconds (standard documents <50 pages)
      largeDocumentTimeout: 300_000, // 5 minutes (large documents ≥50 pages, per PLS Section A.9.1)
      maxRetries: 2
    },
    secondary: {
      identifier: 'gpt-4o-mini',
      maxContextTokens: 1_000_000,
      safeContextLimit: 800_000,
      inputCostPer1M: 0.40,
      outputCostPer1M: 1.60,
      timeout: 15_000, // 15 seconds
      maxRetries: 2
    }
  },
  
  ruleLibrary: {
    matchThreshold: 0.90, // 90% confidence to use library
    targetHitRate: 0.65  // Target 65% library matches
  },
  
  extraction: {
    segmentationThreshold: 800_000, // Only segment if >800k tokens
    maxSegmentSize: 500_000,
    minConfidence: 0.70,
    autoAcceptThreshold: 0.85
  }
};
```

---

# 2. Token Optimization Strategies

## 2.1 Full Document Processing (Primary Strategy)

GPT-4.1's 1M token context eliminates the need for document segmentation in most cases. This provides superior accuracy as the model sees complete document context.

**Document Size Thresholds:**

| Document Size | Token Estimate | Processing Strategy |
|---------------|----------------|---------------------|
| <50 pages | <80k tokens | Single API call |
| 50-200 pages | 80k-300k tokens | Single API call |
| 200-500 pages | 300k-800k tokens | Single API call |
| >500 pages | >800k tokens | Segment by condition (rare) |

**Token Estimation Formula:**
```
tokens ≈ characters × 0.25
tokens ≈ words × 1.3
tokens ≈ pages × 1,500 (typical permit)
```

## 2.2 Segmentation Strategy (Fallback Only)

Segmentation is only required for documents exceeding 800k tokens (extremely rare for regulatory permits).

**Segmentation Rules:**
1. Split at condition boundaries (maintain complete conditions)
2. Maximum segment size: 500k tokens
3. Include 2k token overlap for context continuity
4. Preserve section headers in each segment
5. Batch similar segments if combined <800k tokens

```typescript
// services/segmentation.service.ts

interface Segment {
  id: string;
  content: string;
  tokenCount: number;
  startCondition: string;
  endCondition: string;
  pageRange: { start: number; end: number };
}

function segmentDocument(
  documentText: string,
  tokenCount: number
): Segment[] {
  if (tokenCount <= AI_CONFIG.extraction.segmentationThreshold) {
    return [{
      id: 'full-document',
      content: documentText,
      tokenCount,
      startCondition: 'START',
      endCondition: 'END',
      pageRange: { start: 1, end: -1 }
    }];
  }
  
  // Split at condition boundaries
  const conditions = splitByConditions(documentText);
  const segments: Segment[] = [];
  let currentSegment: string[] = [];
  let currentTokens = 0;
  
  for (const condition of conditions) {
    const conditionTokens = estimateTokens(condition.text);
    
    if (currentTokens + conditionTokens > AI_CONFIG.extraction.maxSegmentSize) {
      // Save current segment and start new
      segments.push(createSegment(currentSegment));
      currentSegment = [condition.text];
      currentTokens = conditionTokens;
    } else {
      currentSegment.push(condition.text);
      currentTokens += conditionTokens;
    }
  }
  
  if (currentSegment.length > 0) {
    segments.push(createSegment(currentSegment));
  }
  
  return segments;
}
```

## 2.3 Prompt Compression Techniques

**System Message Optimisation:**
- Keep system messages under 500 tokens
- Use directive language (no explanations)
- Include only essential schema definitions
- Reference examples by pattern, not full text

**Few-Shot Example Selection:**
- Include 3-4 examples (optimal balance)
- Select examples covering edge cases
- Use concise, representative examples
- Total examples <2,000 tokens

**Response Format Optimisation:**
- Use JSON mode: `response_format: { type: "json_object" }`
- Request only required fields
- Avoid verbose descriptions
- Use abbreviations in non-user-facing fields

## 2.4 Token Budget Allocation

**Per-Extraction Budget (50k input, 5k output):**

| Component | Tokens | Percentage |
|-----------|--------|------------|
| System message | 400 | 0.8% |
| Few-shot examples | 1,500 | 3% |
| Schema definition | 300 | 0.6% |
| Document content | 47,800 | 95.6% |
| **Total Input** | **50,000** | **100%** |

| Component | Tokens | Percentage |
|-----------|--------|------------|
| Structured obligations | 4,500 | 90% |
| Metadata | 500 | 10% |
| **Total Output** | **5,000** | **100%** |

---

# 3. Cost Control Mechanisms

## 3.1 Rule Library First (Primary Cost Control)

The rule library is the most effective cost control mechanism, targeting 60-70% hit rate to eliminate API calls entirely.

**Rule Library Lookup Flow:**
```
Document Segment → Pattern Matching → Score ≥90% → Use Library (Zero Cost)
                                   → Score <90% → API Call (Costs Apply)
```

**Implementation:**
```typescript
// services/rule-library.service.ts

interface RuleMatch {
  ruleId: string;
  score: number;
  templateObligation: ObligationTemplate;
}

async function checkRuleLibrary(
  segment: string,
  documentType: DocumentType,
  module: ModuleType  // Note: ModuleType is a TypeScript type derived from modules table, not a hardcoded enum
): Promise<RuleMatch | null> {
  const patterns = await getRulesForModule(module, documentType);  // Implementation queries modules table
  
  let bestMatch: RuleMatch | null = null;
  let highestScore = 0;
  
  for (const rule of patterns) {
    const score = calculatePatternScore(segment, rule.regexPattern);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        ruleId: rule.ruleId,
        score,
        templateObligation: rule.templateObligation
      };
    }
  }
  
  // Only return if score meets threshold
  if (bestMatch && bestMatch.score >= AI_CONFIG.ruleLibrary.matchThreshold) {
    return bestMatch;
  }
  
  return null;
}
```

## 3.2 Retry Limits

**Retry Configuration:**
- Maximum retries per document: 2
- Retry triggers: Invalid JSON, timeout, validation failure
- Simplified prompt on retry (remove examples, reduce instructions)
- Flag for manual review after 2 failed retries

```typescript
// services/extraction.service.ts

interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  simplifyPromptOnRetry: boolean;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
  simplifyPromptOnRetry: true
};

async function extractWithRetry(
  document: Document,
  attempt: number = 0
): Promise<ExtractionResult> {
  try {
    const prompt = attempt > 0 && RETRY_CONFIG.simplifyPromptOnRetry
      ? buildSimplifiedPrompt(document)
      : buildFullPrompt(document);
    
    return await callOpenAI(prompt);
  } catch (error) {
    if (attempt < RETRY_CONFIG.maxRetries) {
      await delay(RETRY_CONFIG.retryDelayMs);
      return extractWithRetry(document, attempt + 1);
    }
    
    // Flag for manual review after max retries
    return {
      success: false,
      requiresManualReview: true,
      error: error.message,
      attempts: attempt + 1
    };
  }
}
```

## 3.3 Timeout Configuration

**Timeout Settings:**
- API call timeout: 30 seconds (standard documents <50 pages)
- API call timeout: 5 minutes (large documents ≥50 pages, per PLS Section A.9.1)
- OCR processing timeout: 60 seconds
- Total document processing timeout: 120 seconds

```typescript
const TIMEOUT_CONFIG = {
  apiCall: 30_000,           // 30 seconds (standard documents <50 pages)
  apiCallLarge: 300_000,     // 5 minutes (large documents ≥50 pages, per PLS Section A.9.1)
  ocrProcessing: 60_000,     // 60 seconds
  totalProcessing: 120_000 // 2 minutes
};

async function processWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await operation();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## 3.4 Caching Strategy

**What to Cache:**
- Rule library matches (deterministic)
- Document checksums (detect duplicates)
- OCR results (avoid re-processing)

**What NOT to Cache:**
- LLM responses (may vary)
- Confidence scores (contextual)

```typescript
// services/cache.service.ts

interface CacheConfig {
  ruleMatchTTL: number;      // 24 hours
  documentChecksumTTL: number; // 7 days
  ocrResultTTL: number;      // 30 days
}

const CACHE_CONFIG: CacheConfig = {
  ruleMatchTTL: 86400,       // 24 hours in seconds
  documentChecksumTTL: 604800, // 7 days
  ocrResultTTL: 2592000      // 30 days
};

async function getCachedOrCompute<T>(
  key: string,
  ttl: number,
  compute: () => Promise<T>
): Promise<T> {
  const cached = await redisClient.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await compute();
  await redisClient.setex(key, ttl, JSON.stringify(result));
  return result;
}
```

## 3.5 Rate Limit Management

**OpenAI Rate Limits (GPT-4.1):**
- Requests per minute: Varies by tier
- Tokens per minute: Varies by tier

**Queue Implementation:**
```typescript
// services/queue.service.ts

import { Queue, Worker } from 'bullmq';

const extractionQueue = new Queue('extraction', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

const worker = new Worker('extraction', async (job) => {
  const { documentId, priority } = job.data;
  
  // Rate limiter (sliding window)
  await rateLimiter.acquire();
  
  try {
    return await processExtraction(documentId);
  } finally {
    rateLimiter.release();
  }
}, {
  concurrency: 5, // Process 5 documents concurrently
  limiter: {
    max: 60,      // Max 60 requests
    duration: 60000 // Per minute
  }
});
```

## 3.6 Parallel Processing

**Strategy:**
- Process multiple documents concurrently (within rate limits)
- Maximum concurrent extractions: 5 (global limit)
- **Per-organisation limit:** 2 concurrent extractions per company
  - **If** company has 2+ extractions in progress, **then**:
    - Queue additional documents (FIFO order)
    - Display: "Your extraction is queued. Position: [N] in queue"
- **Queue length limits:**
  - **Per-organisation queue:** Maximum 10 documents per company
  - **Global queue:** Maximum 100 documents total
  - **If** queue limit reached, **then**:
    - Display: "Extraction queue is full. Please try again later."
    - Block upload until queue space available
- **Back-pressure behaviour:**
  - **If** global queue > 80 documents, **then**:
    - Slow down new uploads (rate limiting)
    - Display: "System is processing many documents. Your upload may be delayed."
  - **If** global queue = 100 documents, **then**:
    - Block new uploads temporarily
    - Display: "System is at capacity. Please try again in a few minutes."
- Priority queue for urgent documents

```typescript
async function processDocumentBatch(
  documentIds: string[],
  priority: number = 0
): Promise<void> {
  const jobs = documentIds.map(id => ({
    name: 'extract',
    data: { documentId: id, priority }
  }));
  
  await extractionQueue.addBulk(jobs);
}
```

## 3.7 Cost Monitoring & Alerts

**Budget Thresholds:**
- Warning: 80% of monthly budget
- Critical: 95% of monthly budget
- Emergency: 100% of monthly budget (pause non-critical extractions)

```typescript
// services/cost-monitor.service.ts

interface CostAlert {
  level: 'warning' | 'critical' | 'emergency';
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
}

async function checkCostThresholds(): Promise<CostAlert | null> {
  const monthlyBudget = await getMonthlyBudget();
  const currentSpend = await getCurrentMonthSpend();
  const percentUsed = (currentSpend / monthlyBudget) * 100;
  
  if (percentUsed >= 100) {
    return { level: 'emergency', currentSpend, budgetLimit: monthlyBudget, percentUsed };
  }
  if (percentUsed >= 95) {
    return { level: 'critical', currentSpend, budgetLimit: monthlyBudget, percentUsed };
  }
  if (percentUsed >= 80) {
    return { level: 'warning', currentSpend, budgetLimit: monthlyBudget, percentUsed };
  }
  
  return null;
}
```

---

# 4. Prompt Engineering

## 4.1 Permit Extraction Prompt (Module 1)

**System Message (480 tokens):**

```
You are an expert environmental compliance analyst extracting obligations from UK Environmental Permits. Extract ALL discrete compliance requirements.

RULES:
1. Extract only explicit requirements from the document text
2. Quote original text verbatim in "text" field
3. Summarise in plain English (<50 words) in "summary" field
4. Assign exactly one category per obligation
5. Detect subjective language (list phrases if found)
6. Confidence: 0.95+ for clear patterns, 0.70-0.94 for ambiguous, <0.70 if uncertain
7. Include page and condition references

CATEGORIES:
- MONITORING: Testing, sampling, measuring activities
- REPORTING: Submissions to regulators (returns, notifications)
- RECORD_KEEPING: Maintaining logs and documentation
- OPERATIONAL: Day-to-day operational requirements
- MAINTENANCE: Equipment servicing and upkeep

FREQUENCIES: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME, CONTINUOUS, EVENT_TRIGGERED

OUTPUT: JSON array of obligations matching the schema. No explanations outside JSON.
```

**User Message Template:**

```
Extract all compliance obligations from this Environmental Permit.

Document Type: {{document_type}}
Permit Reference: {{permit_reference}}
Regulator: {{regulator}}
Module: 1 (Environmental Permits)

---DOCUMENT START---
{{document_text}}
---DOCUMENT END---

Respond with JSON matching this schema:
{{json_schema}}
```

**JSON Schema:**

```json
{
  "obligations": [
    {
      "text": "string (original obligation text, verbatim)",
      "summary": "string (plain English summary, <50 words)",
      "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
      "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|ONE_TIME|CONTINUOUS|EVENT_TRIGGERED|null",
      "deadline_date": "YYYY-MM-DD|null",
      "deadline_relative": "string (e.g., 'within 14 days of incident')|null",
      "is_subjective": "boolean",
      "subjective_phrases": ["string array"],
      "confidence_score": "number (0.00-1.00)",
      "evidence_suggestions": ["string array"],
      "page_reference": "number",
      "condition_reference": "string (e.g., 'Condition 2.3.1')"
    }
  ],
  "metadata": {
    "total_obligations": "number",
    "flagged_for_review": "number",
    "processing_notes": "string|null"
  }
}
```

**Few-Shot Examples (3 examples, ~1,200 tokens total):**

**Example 1 - Monitoring Obligation:**
```json
Input: "Condition 2.3.1: The operator shall monitor emissions of particulate matter from emission point A1 on a monthly basis using Method BS EN 13284-1."

Output:
{
  "text": "The operator shall monitor emissions of particulate matter from emission point A1 on a monthly basis using Method BS EN 13284-1.",
  "summary": "Monthly monitoring of particulate emissions from A1 using standard method",
  "category": "MONITORING",
  "frequency": "MONTHLY",
  "deadline_date": null,
  "deadline_relative": null,
  "is_subjective": false,
  "subjective_phrases": [],
  "confidence_score": 0.95,
  "evidence_suggestions": ["Monitoring report", "Lab results", "Method certification"],
  "page_reference": 12,
  "condition_reference": "Condition 2.3.1"
}
```

**Example 2 - Reporting with Subjective Language:**
```json
Input: "Condition 4.2: The operator shall notify the Environment Agency as soon as practicable of any malfunction or breakdown which significantly affects emissions."

Output:
{
  "text": "The operator shall notify the Environment Agency as soon as practicable of any malfunction or breakdown which significantly affects emissions.",
  "summary": "Notify EA promptly of malfunctions significantly affecting emissions",
  "category": "REPORTING",
  "frequency": "EVENT_TRIGGERED",
  "deadline_date": null,
  "deadline_relative": "as soon as practicable",
  "is_subjective": true,
  "subjective_phrases": ["as soon as practicable", "significantly"],
  "confidence_score": 0.88,
  "evidence_suggestions": ["Notification record", "Email confirmation", "Incident log"],
  "page_reference": 18,
  "condition_reference": "Condition 4.2"
}
```

**Example 3 - Improvement Condition:**
```json
Input: "Improvement Condition IC1: By 31 December 2025, the operator shall submit a noise management plan to the Environment Agency for approval."

Output:
{
  "text": "By 31 December 2025, the operator shall submit a noise management plan to the Environment Agency for approval.",
  "summary": "Submit noise management plan to EA by end of 2025",
  "category": "REPORTING",
  "frequency": "ONE_TIME",
  "deadline_date": "2025-12-31",
  "deadline_relative": null,
  "is_subjective": false,
  "subjective_phrases": [],
  "confidence_score": 0.97,
  "evidence_suggestions": ["Noise management plan", "EA submission receipt", "Approval letter"],
  "page_reference": 8,
  "condition_reference": "IC1"
}
```

## 4.2 Parameter Extraction Prompt (Module 2)

**System Message (420 tokens):**

```
You are an expert extracting discharge parameters from UK Trade Effluent Consents. Extract ALL parameter limits and conditions.

RULES:
1. Extract every numeric limit with its unit
2. Identify parameter type from standard list
3. Note any conditional limits (time-based, flow-based)
4. Flag parameters without clear limits
5. Confidence based on clarity of limit specification

PARAMETER TYPES: BOD, COD, SS (Suspended Solids), PH, TEMPERATURE, FOG (Fats/Oils/Greases), AMMONIA, PHOSPHORUS, VOLUME, OTHER

LIMIT TYPES: MAXIMUM, AVERAGE, INSTANTANEOUS, ROLLING_AVERAGE

OUTPUT: JSON array of parameters matching the schema. No explanations outside JSON.
```

**User Message Template:**

```
Extract all discharge parameters from this Trade Effluent Consent.

Document Type: {{document_type}}
Consent Reference: {{consent_reference}}
Water Company: {{water_company}}
Module: 2 (Trade Effluent)

---DOCUMENT START---
{{document_text}}
---DOCUMENT END---

Respond with JSON matching this schema:
{{json_schema}}
```

**JSON Schema:**

```json
{
  "parameters": [
    {
      "parameter_type": "BOD|COD|SS|PH|TEMPERATURE|FOG|AMMONIA|PHOSPHORUS|VOLUME|OTHER",
      "parameter_name": "string (if OTHER, specify name)",
      "limit_value": "number",
      "limit_unit": "string (e.g., 'mg/l', '°C', 'm³/day')",
      "limit_type": "MAXIMUM|AVERAGE|INSTANTANEOUS|ROLLING_AVERAGE",
      "monitoring_frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|CONTINUOUS",
      "is_conditional": "boolean",
      "condition_details": "string|null",
      "confidence_score": "number (0.00-1.00)",
      "page_reference": "number",
      "section_reference": "string"
    }
  ],
  "metadata": {
    "total_parameters": "number",
    "flagged_for_review": "number"
  }
}
```

**Few-Shot Examples (3 examples, ~900 tokens):**

**Example 1 - Standard Parameter:**
```json
Input: "BOD (5 day ATU): Maximum 300 mg/l"

Output:
{
  "parameter_type": "BOD",
  "parameter_name": "BOD (5 day ATU)",
  "limit_value": 300,
  "limit_unit": "mg/l",
  "limit_type": "MAXIMUM",
  "monitoring_frequency": "MONTHLY",
  "is_conditional": false,
  "condition_details": null,
  "confidence_score": 0.96,
  "page_reference": 3,
  "section_reference": "Schedule 1"
}
```

**Example 2 - pH Range:**
```json
Input: "pH: Not less than 6.0 and not greater than 10.0"

Output:
{
  "parameter_type": "PH",
  "parameter_name": "pH",
  "limit_value": null,
  "limit_unit": "pH units",
  "limit_type": "RANGE",
  "min_value": 6.0,
  "max_value": 10.0,
  "monitoring_frequency": "CONTINUOUS",
  "is_conditional": false,
  "condition_details": null,
  "confidence_score": 0.98,
  "page_reference": 3,
  "section_reference": "Schedule 1"
}
```

**Example 3 - Conditional Limit:**
```json
Input: "Temperature: Not to exceed 43°C except during emergency discharge events when 50°C is permitted"

Output:
{
  "parameter_type": "TEMPERATURE",
  "parameter_name": "Temperature",
  "limit_value": 43,
  "limit_unit": "°C",
  "limit_type": "MAXIMUM",
  "monitoring_frequency": "CONTINUOUS",
  "is_conditional": true,
  "condition_details": "50°C permitted during emergency discharge events",
  "confidence_score": 0.91,
  "page_reference": 4,
  "section_reference": "Schedule 1"
}
```

## 4.3 Run-Hour Extraction Prompt (Module 3)

**System Message (380 tokens):**

```
You are an expert extracting generator specifications from UK MCPD Registrations. Extract ALL generators, run-hour limits, and emission limits.

RULES:
1. Identify each generator/combustion plant separately
2. Extract thermal input (MW) for each unit
3. Extract annual run-hour limits
4. Note generator type classification
5. Extract any emission limit values (ELVs)

GENERATOR TYPES: MCPD_1_5MW (1-5 MW), MCPD_5_50MW (5-50 MW), SPECIFIED_GENERATOR, EMERGENCY_GENERATOR

OUTPUT: JSON array of generators matching the schema. No explanations outside JSON.
```

**User Message Template:**

```
Extract all generator specifications from this MCPD Registration.

Document Type: {{document_type}}
Registration Reference: {{registration_reference}}
Regulator: {{regulator}}
Module: 3 (MCPD/Generators)

---DOCUMENT START---
{{document_text}}
---DOCUMENT END---

Respond with JSON matching this schema:
{{json_schema}}
```

**JSON Schema:**

```json
{
  "generators": [
    {
      "generator_name": "string",
      "generator_type": "MCPD_1_5MW|MCPD_5_50MW|SPECIFIED_GENERATOR|EMERGENCY_GENERATOR",
      "thermal_input_mw": "number",
      "fuel_type": "string",
      "annual_run_hour_limit": "number|null",
      "run_hour_period": "CALENDAR_YEAR|ROLLING_12_MONTH",
      "emission_limits": [
        {
          "pollutant": "string",
          "limit_value": "number",
          "limit_unit": "string"
        }
      ],
      "is_new_plant": "boolean",
      "commissioning_date": "YYYY-MM-DD|null",
      "confidence_score": "number (0.00-1.00)",
      "page_reference": "number",
      "section_reference": "string"
    }
  ],
  "metadata": {
    "total_generators": "number",
    "flagged_for_review": "number"
  }
}
```

**Few-Shot Examples (3 examples, ~800 tokens):**

**Example 1 - MCPD Generator:**
```json
Input: "Generator 1: Natural gas fired CHP unit, 2.5 MWth. Annual operating hours limited to 1,500 hours."

Output:
{
  "generator_name": "Generator 1",
  "generator_type": "MCPD_1_5MW",
  "thermal_input_mw": 2.5,
  "fuel_type": "Natural gas",
  "annual_run_hour_limit": 1500,
  "run_hour_period": "CALENDAR_YEAR",
  "emission_limits": [],
  "is_new_plant": false,
  "commissioning_date": null,
  "confidence_score": 0.94,
  "page_reference": 5,
  "section_reference": "Schedule 2"
}
```

**Example 2 - Emergency Generator:**
```json
Input: "Emergency standby diesel generator, 800 kW output. For emergency use only, maximum 500 hours per calendar year."

Output:
{
  "generator_name": "Emergency Generator",
  "generator_type": "EMERGENCY_GENERATOR",
  "thermal_input_mw": 0.8,
  "fuel_type": "Diesel",
  "annual_run_hour_limit": 500,
  "run_hour_period": "CALENDAR_YEAR",
  "emission_limits": [],
  "is_new_plant": false,
  "commissioning_date": null,
  "confidence_score": 0.92,
  "page_reference": 7,
  "section_reference": "Schedule 3"
}
```

**Example 3 - New Plant with ELVs:**
```json
Input: "New 8 MW boiler commissioned 15 March 2024. NOx ELV: 200 mg/Nm³."

Output:
{
  "generator_name": "New 8 MW Boiler",
  "generator_type": "MCPD_5_50MW",
  "thermal_input_mw": 8.0,
  "fuel_type": "Unknown",
  "annual_run_hour_limit": null,
  "run_hour_period": "CALENDAR_YEAR",
  "emission_limits": [
    {
      "pollutant": "NOx",
      "limit_value": 200,
      "limit_unit": "mg/Nm³"
    }
  ],
  "is_new_plant": true,
  "commissioning_date": "2024-03-15",
  "confidence_score": 0.89,
  "page_reference": 4,
  "section_reference": "Schedule 1"
}
```

## 4.4 Subjective Detection Prompt

**System Message (300 tokens):**

```
Identify subjective language in compliance obligations that requires human interpretation.

ALWAYS FLAG (exact matches):
- "as appropriate", "where necessary", "where practicable"
- "reasonable measures", "adequate steps", "as soon as practicable"
- "to the satisfaction of", "unless otherwise agreed"
- "appropriate measures", "suitable provision", "best endeavours"

FLAG IF MISSING QUALIFIER:
- "regularly" (flag if no frequency specified)
- "maintained" (flag if no criteria specified)
- "adequate" (flag if no standard referenced)
- "prevent" (flag if success criteria unclear)

OUTPUT: JSON with is_subjective boolean and array of detected phrases.
```

**User Message Template:**

```
Analyse this obligation text for subjective language:

{{obligation_text}}

Respond with JSON:
{
  "is_subjective": boolean,
  "subjective_phrases": ["array of detected phrases"],
  "interpretation_guidance": "string (what the user needs to clarify)"
}
```

## 4.5 Confidence Scoring Prompt

**System Message (280 tokens):**

```
Calculate confidence score for an extracted obligation. Score represents certainty in extraction accuracy.

SCORING COMPONENTS (weights):
- Pattern Match (40%): How closely text matches known regulatory patterns
- Structural Clarity (30%): Document formatting quality (numbered conditions, clear sections)
- Semantic Coherence (20%): Internal consistency of extracted fields
- Source Quality (10%): OCR confidence (100% for native PDF)

THRESHOLDS:
- ≥85%: Auto-accept
- 70-84%: Flag for review
- <70%: Require review before proceeding

OUTPUT: JSON with confidence_score and component breakdown.
```

**User Message Template:**

```
Calculate confidence score for this extraction:

Original Text: {{original_text}}
Extracted Data: {{extracted_json}}
Document Quality: {{ocr_confidence}}
Pattern Match Score: {{pattern_score}}

Respond with JSON:
{
  "confidence_score": number (0.00-1.00),
  "components": {
    "pattern_match": number,
    "structural_clarity": number,
    "semantic_coherence": number,
    "source_quality": number
  },
  "review_reason": "string|null (if score <85%)"
}
```

## 4.6 Prompt Implementation Guidelines

### 4.6.1 System Message Best Practices

System messages should be directive and concise. Follow these guidelines:

**Do:**
- Use imperative verbs ("Extract", "Identify", "Calculate")
- Provide explicit output format requirements
- Include confidence scoring instructions
- Define category/enum values clearly
- Specify what to do with ambiguous cases

**Don't:**
- Explain why rules exist
- Include verbose introductions
- Use conditional language ("you might", "perhaps")
- Repeat instructions that are in the user message

### 4.6.2 Few-Shot Example Selection

Select examples that maximise coverage with minimal tokens:

**Coverage Criteria:**
1. One straightforward example (demonstrates basic extraction)
2. One edge case example (demonstrates handling ambiguity)
3. One complex example (demonstrates multiple fields/conditions)

**Token Budget:**
- Target 3-4 examples per prompt
- Maximum 400 tokens per example
- Total examples section: <1,600 tokens

### 4.6.3 JSON Mode Configuration

Always use JSON mode for structured output:

```typescript
const requestConfig = {
  response_format: { type: 'json_object' },
  temperature: 0.1,  // Low for consistency
  top_p: 0.95,       // Slightly constrained sampling
  max_tokens: 8000   // Sufficient for typical extraction
};
```

**JSON Mode Benefits:**
- Guaranteed valid JSON output
- Eliminates JSON parsing errors
- Reduces retry rate by ~30%

### 4.6.4 Error Handling Instructions in Prompts

Include brief error handling guidance in system messages:

```
ERROR HANDLING:
- If text is illegible: Set confidence <0.50, add "illegible_text" to warnings
- If category unclear: Use "RECORD_KEEPING" as default (safest)
- If date ambiguous: Extract as deadline_relative, not deadline_date
- If multiple interpretations: Choose most restrictive (conservative)
```

### 4.6.5 Simplified Retry Prompts

When retrying after failure, use a simplified prompt structure:

**Original Prompt (~2,000 tokens):**
- Full system message with all rules
- 3-4 few-shot examples
- Complete schema definition

**Simplified Retry Prompt (~800 tokens):**
- Essential rules only (no examples)
- Minimal schema (required fields only)
- Direct instruction: "Extract obligations as JSON array"

```typescript
function buildSimplifiedPrompt(document: Document): ExtractionPrompt {
  return {
    systemMessage: `Extract compliance obligations as JSON. 
      Required fields: text, category, frequency, confidence_score.
      Categories: MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE.
      Output JSON array only.`,
    userMessage: `Document:\n${document.text}\n\nRespond with JSON array of obligations.`
  };
}
```

---

# 5. Extraction Workflow

## 5.1 Complete Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOCUMENT UPLOAD                                    │
│                          (User action)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: FORMAT DETECTION                                                     │
│ - Detect PDF type (native vs scanned)                                        │
│ - Calculate file checksum                                                    │
│ - Check for duplicate uploads                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
               Native PDF                     Scanned PDF
                    │                               │
                    │                               ▼
                    │               ┌─────────────────────────────────────────┐
                    │               │ STEP 2: OCR PROCESSING                   │
                    │               │ - Process via Tesseract                  │
                    │               │ - Timeout: 60 seconds                    │
                    │               │ - Quality check: ≥80% confidence         │
                    │               │ - Flag if quality <80%                   │
                    │               └─────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: TEXT EXTRACTION & NORMALISATION                                      │
│ - Extract full document text                                                 │
│ - Preserve page numbers                                                      │
│ - Normalise encoding (UTF-8)                                                 │
│ - Correct common OCR errors                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: TOKEN COUNT & SEGMENTATION CHECK                                     │
│ - Estimate token count                                                       │
│ - If <800k tokens: Process as single document                                │
│ - If >800k tokens: Segment by condition boundaries (rare)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: MODULE ROUTING                                                       │
│ - Detect document type via keywords                                          │
│ - Query modules table: SELECT * FROM modules WHERE document_types @> '["<document_type>"]'::JSONB AND is_active = true
│ - Route to module returned by query (currently: Environmental Permit → Module 1, Trade Effluent → Module 2, MCPD → Module 3)
│ - Ambiguous → Prompt user selection                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: RULE LIBRARY LOOKUP                                                  │
│ - Match document segments against pattern library                            │
│ - If match score ≥90%: Use library template (zero cost)                      │
│ - If match score <90%: Proceed to LLM extraction                             │
│ - Track library hit rate                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           Match ≥90%                        Match <90%
                    │                               │
                    ▼                               ▼
┌─────────────────────────┐         ┌─────────────────────────────────────────┐
│ USE LIBRARY TEMPLATE    │         │ STEP 7: LLM EXTRACTION (GPT-4.1)         │
│ - Apply template        │         │ - Build prompt with document text        │
│ - Set confidence 0.95   │         │ - Call OpenAI API                        │
│ - Log as library hit    │         │ - Timeout: 30 seconds                    │
│ - Zero API cost         │         │ - Parse JSON response                    │
└─────────────────────────┘         └─────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: RESPONSE VALIDATION                                                  │
│ - Validate JSON schema compliance                                            │
│ - Check required fields present                                              │
│ - Verify enum values valid                                                   │
│ - Check logical consistency                                                  │
│ - Detect potential duplicates (>80% text similarity)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           Validation Passed              Validation Failed
                    │                               │
                    │                               ▼
                    │               ┌─────────────────────────────────────────┐
                    │               │ STEP 8a: RETRY LOGIC                     │
                    │               │ - Retry with simplified prompt           │
                    │               │ - Max 2 retries                          │
                    │               │ - If still fails: Flag for manual review │
                    │               └─────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: CONFIDENCE SCORING                                                   │
│ - Calculate confidence per obligation                                        │
│ - Apply thresholds: ≥85% auto-accept, 70-84% review, <70% blocking           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: HUMAN REVIEW FLAGGING                                               │
│ - Flag confidence <70% as BLOCKING (must review before proceeding)           │
│ - Flag confidence 70-84% as NON-BLOCKING (review recommended)                │
│ - Flag subjective language as NON-BLOCKING                                   │
│ - Add flagged items to Review Queue                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 11: SAVE OBLIGATIONS                                                    │
│ - Create obligation records in database                                      │
│ - Generate schedules for recurring obligations                               │
│ - Log extraction metadata to extraction_logs                                 │
│ - Track costs (input tokens, output tokens, estimated cost)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 12: USER NOTIFICATION                                                   │
│ - Notify user extraction complete                                            │
│ - Show extraction summary                                                    │
│ - Highlight items requiring review                                           │
│ - Display confidence distribution                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Error Handling Matrix

| Error Type | Detection | Action | User Experience |
|------------|-----------|--------|-----------------|
| API Timeout (>30s) | AbortController | Retry once with same prompt | "Processing taking longer than expected..." |
| Invalid JSON | JSON.parse failure | Retry with simplified prompt | "Re-processing document..." |
| Rate Limit (429) | HTTP status code | Queue with exponential backoff | "Document queued, processing shortly..." |
| Validation Failure | Schema validation | Retry, then flag for manual | "Some items need manual review" |
| OCR Quality <80% | OCR confidence check | Flag entire document | "Document quality issues detected" |
| Empty Extraction | Zero obligations | Flag for manual review | "No obligations found - please review" |
| Total Failure | 2+ retry failures | Enter Manual Mode | "Automatic extraction failed - manual entry available" |

## 5.3 Background Job Processing

```typescript
// jobs/extraction.job.ts

interface ExtractionJob {
  documentId: string;
  priority: number;
  scheduledAt: Date;
  attempts: number;
}

const extractionProcessor = async (job: Job<ExtractionJob>) => {
  const { documentId, attempts } = job.data;
  
  // Update document status
  await updateDocumentStatus(documentId, 'PROCESSING');
  
  try {
    // Step 1: Load document
    const document = await loadDocument(documentId);
    
    // Step 2: Check cache for duplicate
    const checksum = await calculateChecksum(document.content);
    const cached = await checkDuplicateExtraction(checksum);
    if (cached) {
      await copyExtractionResults(cached, documentId);
      return { success: true, source: 'cache' };
    }
    
    // Step 3: OCR if needed
    let text = document.text;
    let ocrConfidence = 1.0;
    if (document.isScanned) {
      const ocrResult = await performOCR(document.content);
      text = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    }
    
    // Step 4: Estimate tokens and check segmentation
    const tokenCount = estimateTokens(text);
    const segments = segmentDocument(text, tokenCount);
    
    // Step 5: Process each segment
    const allObligations: Obligation[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let ruleLibraryHits = 0;
    
    for (const segment of segments) {
      // Check rule library first
      // Note: document.module is ModuleType (derived from modules table via document.module_id)
      const ruleMatch = await checkRuleLibrary(segment.content, document.type, document.module);
      
      if (ruleMatch) {
        allObligations.push(...applyRuleTemplate(ruleMatch, segment));
        ruleLibraryHits++;
        continue;
      }
      
      // LLM extraction
      const prompt = buildExtractionPrompt(segment, document);
      const response = await callOpenAI(prompt);
      
      totalInputTokens += response.usage.prompt_tokens;
      totalOutputTokens += response.usage.completion_tokens;
      
      const obligations = parseExtractionResponse(response);
      allObligations.push(...obligations);
    }
    
    // Step 6: Validate and save
    const validated = await validateObligations(allObligations);
    await saveObligations(documentId, validated.obligations);
    
    // Step 7: Log extraction
    await logExtraction({
      documentId,
      modelIdentifier: 'gpt-4o',
      segmentsProcessed: segments.length,
      obligationsExtracted: validated.obligations.length,
      flaggedForReview: validated.flaggedCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost: calculateCost(totalInputTokens, totalOutputTokens),
      ruleLibraryHits,
      ocrRequired: document.isScanned,
      ocrConfidence
    });
    
    // Step 8: Update document status
    await updateDocumentStatus(documentId, 
      validated.flaggedCount > 0 ? 'REVIEW_REQUIRED' : 'COMPLETED'
    );
    
    return { success: true, obligations: validated.obligations.length };
    
  } catch (error) {
    if (attempts < 2) {
      throw error; // BullMQ will retry
    }
    
    // Max retries exceeded - flag for manual
    await updateDocumentStatus(documentId, 'FAILED');
    await createManualReviewFlag(documentId, error.message);
    
    return { success: false, error: error.message };
  }
};
```

---

# 6. Cost Tracking & Analytics

## 6.1 Database Schema Extensions

The existing `extraction_logs` table in the Canonical Dictionary captures basic extraction metadata. The following fields should be added for comprehensive cost tracking:

**Additional Fields for extraction_logs:**

```sql
ALTER TABLE extraction_logs ADD COLUMN input_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extraction_logs ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extraction_logs ADD COLUMN estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0;
ALTER TABLE extraction_logs ADD COLUMN rule_library_hits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extraction_logs ADD COLUMN api_calls_made INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extraction_logs ADD COLUMN model_identifier TEXT NOT NULL DEFAULT 'gpt-4o';

-- Add indexes for cost analytics
CREATE INDEX idx_extraction_logs_estimated_cost ON extraction_logs(estimated_cost);
CREATE INDEX idx_extraction_logs_model_identifier ON extraction_logs(model_identifier);
CREATE INDEX idx_extraction_logs_created_month ON extraction_logs(DATE_TRUNC('month', created_at));
```

**Updated extraction_logs Schema:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| document_id | UUID | Reference to document |
| extraction_timestamp | TIMESTAMP | When extraction occurred |
| model_identifier | TEXT | LLM model used (e.g., 'gpt-4o') |
| rule_library_version | TEXT | Rule library version |
| segments_processed | INTEGER | Number of segments processed |
| obligations_extracted | INTEGER | Number of obligations extracted |
| flagged_for_review | INTEGER | Number flagged for review |
| processing_time_ms | INTEGER | Processing time in milliseconds |
| ocr_required | BOOLEAN | Whether OCR was used |
| ocr_confidence | DECIMAL | OCR confidence if used |
| **input_tokens** | INTEGER | Input tokens used |
| **output_tokens** | INTEGER | Output tokens used |
| **estimated_cost** | DECIMAL | Estimated cost in USD |
| **rule_library_hits** | INTEGER | Segments matched by library |
| **api_calls_made** | INTEGER | Number of API calls made |
| errors | JSONB | Errors encountered |
| warnings | JSONB | Warnings generated |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Record creation timestamp |

## 6.2 Cost Calculation Functions

```typescript
// services/cost.service.ts

interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o'
): CostCalculation {
  const pricing = {
    'gpt-4o': { input: 2.00, output: 8.00 },
    'gpt-4o-mini': { input: 0.40, output: 1.60 }
  };
  
  const rates = pricing[model];
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}

// Example usage
const cost = calculateCost(50000, 5000, 'gpt-4o');
// Returns: { inputCost: 0.10, outputCost: 0.04, totalCost: 0.14 }
```

## 6.3 Analytics Queries

**Note:** Cost tracking queries the `modules` table to aggregate costs by module. New modules are automatically included in cost analytics once registered in the `modules` table. No code changes are needed for new modules to participate in cost tracking.

## 6.3 Analytics Queries

**Cost per Document Type:**

```sql
SELECT 
  d.document_type,
  COUNT(*) as extraction_count,
  AVG(el.input_tokens) as avg_input_tokens,
  AVG(el.output_tokens) as avg_output_tokens,
  SUM(el.estimated_cost) as total_cost,
  AVG(el.estimated_cost) as avg_cost_per_extraction
FROM extraction_logs el
JOIN documents d ON el.document_id = d.id
WHERE el.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY d.document_type
ORDER BY total_cost DESC;
```

**Cost per Module:**

**Note:** This query joins with the `modules` table to get module names dynamically. New modules are automatically included without code changes.

```sql
-- Dynamic implementation (automatically includes all modules):
SELECT 
  m.module_name as module,
  COUNT(*) as extraction_count,
  SUM(el.estimated_cost) as total_cost,
  AVG(el.estimated_cost) as avg_cost
FROM extraction_logs el
JOIN documents d ON el.document_id = d.id
JOIN modules m ON m.document_types @> jsonb_build_array(d.document_type::TEXT)
WHERE el.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND m.is_active = true
GROUP BY m.module_name
ORDER BY total_cost DESC;
```

**Rule Library Effectiveness:**

```sql
SELECT 
  DATE_TRUNC('week', el.created_at) as week,
  COUNT(*) as total_extractions,
  SUM(el.rule_library_hits) as library_matches,
  SUM(el.segments_processed - el.rule_library_hits) as api_calls,
  ROUND(
    (SUM(el.rule_library_hits)::DECIMAL / SUM(el.segments_processed)) * 100, 
    2
  ) as hit_rate_percent,
  SUM(el.estimated_cost) as total_cost
FROM extraction_logs el
WHERE el.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('week', el.created_at)
ORDER BY week DESC;
```

**Most Expensive Extractions:**

```sql
SELECT 
  el.id,
  d.reference_number,
  d.document_type,
  el.input_tokens,
  el.output_tokens,
  el.estimated_cost,
  el.segments_processed,
  el.processing_time_ms,
  el.created_at
FROM extraction_logs el
JOIN documents d ON el.document_id = d.id
WHERE el.created_at >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY el.estimated_cost DESC
LIMIT 20;
```

**Monthly Cost Trend:**

```sql
SELECT 
  DATE_TRUNC('month', el.created_at) as month,
  COUNT(*) as extraction_count,
  SUM(el.input_tokens) as total_input_tokens,
  SUM(el.output_tokens) as total_output_tokens,
  SUM(el.estimated_cost) as total_cost,
  AVG(el.estimated_cost) as avg_cost_per_extraction,
  SUM(el.rule_library_hits)::DECIMAL / NULLIF(SUM(el.segments_processed), 0) * 100 as library_hit_rate
FROM extraction_logs el
WHERE el.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', el.created_at)
ORDER BY month DESC;
```

## 6.4 Cost Dashboard Metrics

**Key Performance Indicators:**

| Metric | Formula | Target |
|--------|---------|--------|
| Rule Library Hit Rate | library_hits / segments_processed | >60% |
| Avg Cost per Document | total_cost / document_count | <$0.10 |
| Retry Rate | retried_extractions / total_extractions | <5% |
| Manual Mode Rate | manual_extractions / total_extractions | <2% |
| Avg Processing Time | sum(processing_time_ms) / extraction_count | <15 seconds |

---

# 7. Integration Points

## 7.1 Prompt → API Call Flow

```typescript
// services/openai.service.ts

interface OpenAIRequest {
  model: string;
  messages: Message[];
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenAI(prompt: ExtractionPrompt): Promise<OpenAIResponse> {
  const request: OpenAIRequest = {
    model: prompt.model || 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.systemMessage },
      { role: 'user', content: prompt.userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistency
    max_tokens: 8000  // Sufficient for typical extraction
  };
  
  const response = await openai.chat.completions.create(request, {
    timeout: AI_CONFIG.models.primary.timeout,
    signal: AbortSignal.timeout(AI_CONFIG.models.primary.timeout)
  });
  
  return {
    content: response.choices[0].message.content,
    usage: response.usage,
    finishReason: response.choices[0].finish_reason
  };
}
```

## 7.2 Response Validation & Transformation

```typescript
// services/validation.service.ts

import { z } from 'zod';

const ObligationSchema = z.object({
  text: z.string().min(1),
  summary: z.string().max(200),
  category: z.enum(['MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED']).nullable(),
  deadline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  deadline_relative: z.string().nullable(),
  is_subjective: z.boolean(),
  subjective_phrases: z.array(z.string()),
  confidence_score: z.number().min(0).max(1),
  evidence_suggestions: z.array(z.string()),
  page_reference: z.number().positive(),
  condition_reference: z.string()
});

const ExtractionResponseSchema = z.object({
  obligations: z.array(ObligationSchema),
  metadata: z.object({
    total_obligations: z.number(),
    flagged_for_review: z.number(),
    processing_notes: z.string().nullable()
  })
});

async function validateAndTransform(
  rawResponse: string,
  documentId: string
): Promise<ValidationResult> {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (e) {
    return { success: false, error: 'Invalid JSON response' };
  }
  
  // Step 2: Validate schema
  const validation = ExtractionResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return { 
      success: false, 
      error: 'Schema validation failed',
      details: validation.error.errors 
    };
  }
  
  // Step 3: Business logic validation
  const obligations = validation.data.obligations;
  const issues: ValidationIssue[] = [];
  
  for (const obligation of obligations) {
    // Check subjective consistency
    if (obligation.is_subjective && obligation.subjective_phrases.length === 0) {
      issues.push({
        field: 'subjective_phrases',
        message: 'is_subjective is true but no phrases provided',
        severity: 'warning'
      });
    }
    
    // Check one-time deadline requirement
    if (obligation.frequency === 'ONE_TIME' && 
        !obligation.deadline_date && 
        !obligation.deadline_relative) {
      issues.push({
        field: 'deadline',
        message: 'ONE_TIME frequency requires deadline',
        severity: 'warning'
      });
    }
    
    // Check for potential duplicates
    const duplicates = await checkDuplicates(documentId, obligation.text);
    if (duplicates.length > 0) {
      issues.push({
        field: 'text',
        message: 'Potential duplicate obligation detected',
        severity: 'info',
        relatedIds: duplicates
      });
    }
  }
  
  return {
    success: true,
    data: validation.data,
    issues
  };
}
```

## 7.3 Error Handling & Logging

```typescript
// services/error-handler.service.ts

enum ExtractionErrorType {
  API_TIMEOUT = 'API_TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_JSON = 'INVALID_JSON',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  OCR_FAILED = 'OCR_FAILED',
  UNKNOWN = 'UNKNOWN'
}

interface ExtractionError {
  type: ExtractionErrorType;
  message: string;
  retryable: boolean;
  details?: unknown;
}

function classifyError(error: Error): ExtractionError {
  if (error.name === 'AbortError') {
    return {
      type: ExtractionErrorType.API_TIMEOUT,
      message: 'API call timed out after 30 seconds',
      retryable: true
    };
  }
  
  if (error.message.includes('429') || error.message.includes('rate limit')) {
    return {
      type: ExtractionErrorType.RATE_LIMIT,
      message: 'OpenAI rate limit exceeded',
      retryable: true
    };
  }
  
  if (error instanceof SyntaxError) {
    return {
      type: ExtractionErrorType.INVALID_JSON,
      message: 'Failed to parse API response as JSON',
      retryable: true
    };
  }
  
  return {
    type: ExtractionErrorType.UNKNOWN,
    message: error.message,
    retryable: false,
    details: error.stack
  };
}

async function handleExtractionError(
  documentId: string,
  error: ExtractionError,
  attempt: number
): Promise<ErrorHandlingResult> {
  // Log error
  await logExtractionError(documentId, error, attempt);
  
  // Determine next action
  if (error.retryable && attempt < AI_CONFIG.models.primary.maxRetries) {
    return { action: 'RETRY', delay: calculateBackoff(attempt) };
  }
  
  if (error.type === ExtractionErrorType.RATE_LIMIT) {
    return { action: 'QUEUE', delay: 60000 }; // Queue for 1 minute
  }
  
  // Flag for manual review
  await flagForManualReview(documentId, error.message);
  return { action: 'MANUAL_REVIEW' };
}

function calculateBackoff(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s...
  return Math.pow(2, attempt) * 1000;
}
```

## 7.4 Cost Tracking Integration

```typescript
// services/extraction-logger.service.ts

interface ExtractionLogEntry {
  documentId: string;
  modelIdentifier: string;
  ruleLibraryVersion: string;
  segmentsProcessed: number;
  obligationsExtracted: number;
  flaggedForReview: number;
  processingTimeMs: number;
  ocrRequired: boolean;
  ocrConfidence: number | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  ruleLibraryHits: number;
  apiCallsMade: number;
  errors: object[];
  warnings: object[];
}

async function logExtraction(entry: ExtractionLogEntry): Promise<void> {
  await db.extractionLogs.create({
    data: {
      id: generateUUID(),
      document_id: entry.documentId,
      extraction_timestamp: new Date(),
      model_identifier: entry.modelIdentifier,
      rule_library_version: entry.ruleLibraryVersion,
      segments_processed: entry.segmentsProcessed,
      obligations_extracted: entry.obligationsExtracted,
      flagged_for_review: entry.flaggedForReview,
      processing_time_ms: entry.processingTimeMs,
      ocr_required: entry.ocrRequired,
      ocr_confidence: entry.ocrConfidence,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      estimated_cost: entry.estimatedCost,
      rule_library_hits: entry.ruleLibraryHits,
      api_calls_made: entry.apiCallsMade,
      errors: entry.errors,
      warnings: entry.warnings,
      created_at: new Date()
    }
  });
  
  // Update running cost totals for monitoring
  await updateCostMetrics(entry.estimatedCost);
}
```

## 7.5 Rule Library Integration

```typescript
// services/rule-library.service.ts

interface Rule {
  ruleId: string;
  module: '1' | '2' | '3';
  patternType: string;
  regexPattern: string;
  templateObligation: ObligationTemplate;
  evidenceSuggestions: string[];
  confidenceBaseline: number;
  version: string;
}

async function integrateRuleLibrary(
  segments: Segment[],
  documentType: DocumentType,
  module: ModuleType  // Note: ModuleType is a TypeScript type derived from modules table
): Promise<RuleLibraryResult> {
  const rules = await loadRulesForModule(module);  // Implementation queries modules table
  const results: SegmentResult[] = [];
  let libraryHits = 0;
  let apiCallsNeeded = 0;
  
  for (const segment of segments) {
    let matched = false;
    
    for (const rule of rules) {
      const score = calculatePatternScore(segment.content, rule.regexPattern);
      
      if (score >= AI_CONFIG.ruleLibrary.matchThreshold) {
        results.push({
          segmentId: segment.id,
          source: 'library',
          ruleId: rule.ruleId,
          score,
          obligation: applyTemplate(rule.templateObligation, segment)
        });
        libraryHits++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      results.push({
        segmentId: segment.id,
        source: 'api',
        ruleId: null,
        score: 0,
        obligation: null // Will be filled by API
      });
      apiCallsNeeded++;
    }
  }
  
  return {
    results,
    libraryHits,
    apiCallsNeeded,
    hitRate: libraryHits / segments.length
  };
}
```

## 7.6 Hallucination Prevention

Hallucination prevention is critical for compliance-sensitive extractions. The following measures are implemented:

### 7.6.1 Grounding Validation

Every extracted obligation must be traceable to source text:

```typescript
// services/grounding.service.ts

interface GroundingCheck {
  isGrounded: boolean;
  sourceText: string | null;
  matchScore: number;
  hallucinationRisk: boolean;
}

async function validateGrounding(
  obligation: ExtractedObligation,
  documentText: string
): Promise<GroundingCheck> {
  // Check if obligation text appears in document
  const exactMatch = documentText.includes(obligation.text);
  
  if (exactMatch) {
    return {
      isGrounded: true,
      sourceText: obligation.text,
      matchScore: 1.0,
      hallucinationRisk: false
    };
  }
  
  // Fuzzy match for OCR variations
  const fuzzyScore = calculateFuzzyMatch(obligation.text, documentText);
  
  if (fuzzyScore >= 0.85) {
    return {
      isGrounded: true,
      sourceText: findClosestMatch(obligation.text, documentText),
      matchScore: fuzzyScore,
      hallucinationRisk: false
    };
  }
  
  // Potential hallucination
  return {
    isGrounded: false,
    sourceText: null,
    matchScore: fuzzyScore,
    hallucinationRisk: true
  };
}
```

### 7.6.2 Hallucination Detection Triggers

The following patterns trigger hallucination alerts:

| Trigger | Detection Method | Action |
|---------|-----------------|--------|
| Extracted text not in source | Fuzzy match <85% | Flag with `hallucination_risk: true` |
| Numeric values inconsistent | Value range check | Flag for manual review |
| Dates outside reasonable range | Date validation | Flag for manual review |
| Categories inconsistent with document type | Type-category mapping | Auto-correct or flag |
| Fabricated condition references | Reference lookup | Flag as invalid |

### 7.6.3 Cross-Validation with Rule Library

For obligations that match rule library patterns, cross-validate LLM output against library templates:

```typescript
async function crossValidateWithLibrary(
  llmObligation: ExtractedObligation,
  ruleMatch: RuleMatch | null
): Promise<ValidationResult> {
  if (!ruleMatch) {
    // No library match - rely on other validation
    return { validated: false, source: 'no_library_match' };
  }
  
  const template = ruleMatch.templateObligation;
  const discrepancies: string[] = [];
  
  // Compare category
  if (llmObligation.category !== template.category) {
    discrepancies.push(`Category mismatch: LLM=${llmObligation.category}, Library=${template.category}`);
  }
  
  // Compare frequency
  if (llmObligation.frequency !== template.frequency) {
    discrepancies.push(`Frequency mismatch: LLM=${llmObligation.frequency}, Library=${template.frequency}`);
  }
  
  // Compare subjective flag
  if (llmObligation.is_subjective !== template.is_subjective) {
    discrepancies.push(`Subjective flag mismatch`);
  }
  
  if (discrepancies.length > 0) {
    return {
      validated: false,
      source: 'library_mismatch',
      discrepancies,
      recommendation: 'Use library template values'
    };
  }
  
  return { validated: true, source: 'library_confirmed' };
}
```

## 7.7 Quality Assurance Pipeline

### 7.7.1 Pre-Extraction Quality Checks

Before extraction begins, validate document quality:

```typescript
async function preExtractionQualityCheck(
  document: Document
): Promise<QualityCheckResult> {
  const checks: QualityCheck[] = [];
  
  // Check 1: File integrity
  const fileIntegrity = await validateFileIntegrity(document.content);
  checks.push({
    name: 'file_integrity',
    passed: fileIntegrity.valid,
    details: fileIntegrity.issues
  });
  
  // Check 2: Page count reasonable
  const pageCount = await getPageCount(document.content);
  checks.push({
    name: 'page_count',
    passed: pageCount > 0 && pageCount < 1000,
    details: `${pageCount} pages`
  });
  
  // Check 3: Text extractable
  const textContent = await extractText(document.content);
  const hasText = textContent.length > 100;
  checks.push({
    name: 'text_extractable',
    passed: hasText,
    details: hasText ? `${textContent.length} characters` : 'No text found'
  });
  
  // Check 4: OCR quality (if scanned)
  if (document.isScanned) {
    const ocrQuality = await assessOCRQuality(document.content);
    checks.push({
      name: 'ocr_quality',
      passed: ocrQuality.confidence >= 0.80,
      details: `${Math.round(ocrQuality.confidence * 100)}% confidence`
    });
  }
  
  const allPassed = checks.every(c => c.passed);
  const criticalFailures = checks.filter(c => !c.passed && c.name !== 'ocr_quality');
  
  return {
    passed: allPassed || criticalFailures.length === 0,
    checks,
    recommendation: allPassed ? 'proceed' : 
                    criticalFailures.length > 0 ? 'reject' : 'proceed_with_caution'
  };
}
```

### 7.7.2 Post-Extraction Quality Metrics

Track extraction quality over time:

```typescript
interface ExtractionQualityMetrics {
  documentId: string;
  totalObligations: number;
  highConfidenceCount: number;      // >=85%
  mediumConfidenceCount: number;    // 70-84%
  lowConfidenceCount: number;       // <70%
  hallucinationRiskCount: number;
  groundingScore: number;           // Average grounding match
  libraryMatchRate: number;
  editRatePostReview: number;       // How many were edited by humans
}

async function calculateQualityMetrics(
  documentId: string,
  obligations: ExtractedObligation[]
): Promise<ExtractionQualityMetrics> {
  const highConfidence = obligations.filter(o => o.confidence_score >= 0.85);
  const mediumConfidence = obligations.filter(o => o.confidence_score >= 0.70 && o.confidence_score < 0.85);
  const lowConfidence = obligations.filter(o => o.confidence_score < 0.70);
  const hallucinationRisks = obligations.filter(o => o.hallucination_risk);
  
  const avgGrounding = obligations.reduce((sum, o) => sum + (o.grounding_score || 1), 0) / obligations.length;
  
  return {
    documentId,
    totalObligations: obligations.length,
    highConfidenceCount: highConfidence.length,
    mediumConfidenceCount: mediumConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    hallucinationRiskCount: hallucinationRisks.length,
    groundingScore: avgGrounding,
    libraryMatchRate: 0, // Calculated separately
    editRatePostReview: 0 // Calculated after review
  };
}
```

---

# 8. Cost Estimates & Projections

## 8.1 Per-Document Cost Analysis

**Typical Environmental Permit (50k input, 5k output):**

| Model | Input Cost | Output Cost | Total | Notes |
|-------|-----------|------------|-------|-------|
| GPT-4.1 | $0.10 | $0.04 | **$0.14** | Primary model |
| GPT-4.1 Mini | $0.02 | $0.008 | **$0.028** | Simple tasks |

**Large Document (200k input, 10k output):**

| Model | Input Cost | Output Cost | Total | Notes |
|-------|-----------|------------|-------|-------|
| GPT-4.1 | $0.40 | $0.08 | **$0.48** | Still single call |

## 8.2 Monthly Projections with Rule Library

**Assumptions:**
- Rule library hit rate: 60%
- Average document: 50k input, 5k output
- Cost per API extraction: $0.14 (GPT-4.1)

| Customers | Permits/Month | API Extractions (40%) | Monthly Cost |
|-----------|---------------|----------------------|--------------|
| 50 | 100 | 40 | **$5.60** |
| 100 | 200 | 80 | **$11.20** |
| 200 | 400 | 160 | **$22.40** |
| 500 | 1,000 | 400 | **$56.00** |

**Annual Cost at Scale:**

| Customers | Annual Permits | Annual API Calls | Annual Cost |
|-----------|----------------|------------------|-------------|
| 50 | 1,200 | 480 | **$67.20** |
| 100 | 2,400 | 960 | **$134.40** |
| 200 | 4,800 | 1,920 | **$268.80** |
| 500 | 12,000 | 4,800 | **$672.00** |

## 8.3 Cost Savings from GPT-4.1's 1M Context

**Without 1M Context (Segmented Approach):**
- Typical 100-page permit: 150k tokens
- Would require 2-3 API calls with GPT-4o (128k limit)
- Additional overhead: ~20% more tokens for context overlap

**With GPT-4.1 (1M Context):**
- Single API call for documents up to ~500 pages
- No segmentation overhead
- Better accuracy (full context visibility)

**Estimated Savings:**
- 20-30% cost reduction vs segmented approach
- 40-50% latency reduction (fewer API calls)

## 8.4 Cost Optimisation Targets

| Metric | Target | Current Best Practice |
|--------|--------|----------------------|
| Rule Library Hit Rate | >60% | Pattern expansion, monthly rule updates |
| Avg Tokens per Extraction | <60,000 | Prompt compression, efficient schemas |
| Cost per Permit | <$1.00 | Library-first strategy (actual: ~$0.14 with GPT-4.1) |
| Retry Rate | <5% | Robust validation, error handling |
| Manual Mode Rate | <2% | Continuous rule library improvement |

## 8.5 Pricing Verification Note

> **Important:** Pricing data in this document is verified as of November 2025. OpenAI pricing may change. Before implementation, verify current pricing at:
> - https://openai.com/pricing
> - https://openai.com/api/pricing

---

# Appendix A: Implementation Checklist

## Phase 1: Core Infrastructure
- [ ] Configure OpenAI API client with GPT-4.1
- [ ] Implement rate limiting and queue system
- [ ] Set up extraction_logs table extensions
- [ ] Create cost calculation functions
- [ ] Build prompt templates for all modules

## Phase 2: Rule Library Integration
- [ ] Design rule library schema
- [ ] Implement pattern matching engine
- [ ] Create library lookup service
- [ ] Build library hit rate tracking

## Phase 3: Extraction Pipeline
- [ ] Implement document segmentation (fallback)
- [ ] Build validation and transformation layer
- [ ] Create retry and error handling logic
- [ ] Set up background job processing

## Phase 4: Cost Monitoring
- [ ] Create cost tracking dashboard
- [ ] Implement budget alerts
- [ ] Build analytics queries
- [ ] Set up cost reporting

## Phase 5: Testing & Optimisation
- [ ] Test with sample permits from each module
- [ ] Benchmark extraction accuracy
- [ ] Optimise prompt token usage
- [ ] Tune confidence thresholds

---

**END OF AI LAYER DESIGN & COST OPTIMIZATION**

*Document Version: 1.0*  
*Generated for: Oblicore Platform*  
*Source Documents: Product Logic Specification (PLS), Canonical Dictionary*
