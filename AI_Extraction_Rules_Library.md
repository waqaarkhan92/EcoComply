# AI Extraction Rules Library
## Oblicore Platform — Modules 1–3

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Depends On:** Product Logic Specification (PLS), Canonical Dictionary, AI Layer Design & Cost Optimization  
**Purpose:** Technical specification for the rule library system, pattern matching algorithms, and learning mechanisms

> [v1 UPDATE – Version Header – 2024-12-27]

---

# 1. Introduction

## 1.1 Purpose

The AI Extraction Rules Library is the platform's pattern-matching engine that enables accurate, cost-effective extraction of compliance obligations from regulatory documents. By matching document text against known patterns before invoking the LLM, the system achieves three critical objectives:

1. **Cost Reduction:** Library matches eliminate API calls (~$0.14 saved per match)
2. **Consistency:** Known patterns produce identical extractions across documents
3. **Accuracy:** Pre-validated patterns have higher confidence baselines (+15% boost)

## 1.2 Design Philosophy

The rule library follows a "structure over catalog" approach:

- **This document defines HOW the system works** — schemas, algorithms, and processes
- **Actual patterns are stored in the database** — learned and refined over time
- **Learning mechanism is the technical moat** — patterns improve with each user correction

## 1.3 Integration Points

The rule library integrates with:

| Component | Integration |
|-----------|-------------|
| Document Ingestion Pipeline | Called after text extraction, before LLM |
| LLM Extraction Service | Fallback when pattern match <90% |
| Confidence Scoring | Provides +15% confidence boost for matches |
| Review Queue | User corrections feed learning mechanism |
| Extraction Logs | Pattern usage tracked for analytics |

---

# 2. Rule Library Structure & Format

## 2.1 Rule Pattern JSON Schema

Every rule pattern in the library follows this structure:

```json
{
  "pattern_id": "string (unique identifier: {REGULATOR}_{MODULE}_{CATEGORY}_{SEQUENCE})",
  "pattern_version": "string (semantic version: major.minor.patch)",
  "priority": "integer (1-999, lower = higher priority, default: 500)",
  "display_name": "string (human-readable name)",
  "description": "string (what this pattern matches)",
  
  "matching": {
    "regex_primary": "string (primary regex pattern)",
    "regex_variants": ["string array (alternative regex patterns)"],
    "semantic_keywords": ["string array (for semantic matching fallback)"],
    "negative_patterns": ["string array (patterns that should NOT match)"],
    "min_text_length": "integer (minimum characters required)",
    "max_text_length": "integer (maximum characters allowed)"
  },
  
  "extraction_template": {
    "category": "MONITORING|REPORTING|RECORD_KEEPING|OPERATIONAL|MAINTENANCE",
    "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|ONE_TIME|CONTINUOUS|EVENT_TRIGGERED|null",
    "deadline_relative": "string|null",
    "is_subjective": "boolean",
    "subjective_phrases": ["string array"],
    "evidence_types": ["string array"],
    "condition_type": "STANDARD|SITE_SPECIFIC|IMPROVEMENT|ELV|PARAMETER_LIMIT|RUN_HOUR_LIMIT|REPORTING"
  },
  
  "applicability": {
    "module_types": ["MODULE_1", "MODULE_2", "MODULE_3", "MODULE_4", ...],  // Array of module codes (can include any module_code from modules table)
    "regulators": ["EA", "SEPA", "NRW", "WATER_COMPANY"],
    "document_types": ["ENVIRONMENTAL_PERMIT", "TRADE_EFFLUENT_CONSENT", "MCPD_REGISTRATION"],
    "water_companies": ["string array (for Module 2: Thames Water, Severn Trent, etc.)"]
  },
  
  **Note:** The `module_types` array is flexible and can include any `module_code` from the `modules` table. To add patterns for a new module (e.g., Module 4 - Packaging), simply add the module code to the array.
  
  **Validation Rule:** Before applying any pattern, the system MUST validate that all values in the `module_types` array exist in the `modules` table:
  ```sql
  SELECT COUNT(*) FROM modules 
  WHERE module_code = ANY(ARRAY['MODULE_1', 'MODULE_2', ...]::TEXT[])
  AND is_active = true
  ```
  **If** validation fails (module_code not found or inactive), **then**:
  - Pattern is skipped (not applied)
  - Error logged: "Pattern [pattern_id] references invalid module_code: [code]"
  - Pattern remains in database but is excluded from matching until validation passes
  
  "metadata": {
    "source_documents": ["string array (document IDs pattern was derived from)"],
    "added_date": "ISO 8601 timestamp",
    "added_by": "string (user ID or 'system')",
    "last_validated": "ISO 8601 timestamp",
    "validated_by": "string (user ID or 'system')",
    "notes": "string (implementation notes)"
  },
  
  "performance": {
    "usage_count": "integer",
    "success_count": "integer",
    "false_positive_count": "integer",
    "false_negative_count": "integer",
    "user_override_count": "integer",
    "success_rate": "decimal (calculated: success_count / usage_count)",
    "last_used_at": "ISO 8601 timestamp|null"
  },
  
  "status": {
    "is_active": "boolean",
    "deprecated_at": "ISO 8601 timestamp|null",
    "deprecated_reason": "string|null",
    "replaced_by_pattern_id": "string|null"
  }
}
```

## 2.2 Pattern ID Convention

Pattern IDs follow the format: `{REGULATOR}_{MODULE}_{CATEGORY}_{SEQUENCE}`

Examples:
- `EA_M1_MONITORING_001` — Environment Agency, Module 1, Monitoring, first pattern
- `SEPA_M1_REPORTING_003` — SEPA, Module 1, Reporting, third pattern
- `THAMES_M2_PARAMETER_BOD_001` — Thames Water, Module 2, BOD parameter pattern
- `EA_M3_RUNHOUR_001` — Environment Agency, Module 3, run-hour pattern

## 2.3 Pattern Versioning

Patterns use semantic versioning (`major.minor.patch`):

| Version Component | When to Increment | Example |
|-------------------|-------------------|---------|
| **Major** | Breaking change to extraction output | 1.0.0 → 2.0.0 |
| **Minor** | New regex variants added, coverage expanded | 1.0.0 → 1.1.0 |
| **Patch** | Bug fix, regex refinement, typo correction | 1.0.0 → 1.0.1 |

## 2.4 Example Rule Patterns

### Example 1: EA Standard Monitoring Condition

```json
{
  "pattern_id": "EA_M1_MONITORING_001",
  "pattern_version": "1.2.0",
  "priority": 100,
  "display_name": "EA Standard Emissions Monitoring",
  "description": "Matches standard EA condition for periodic emissions monitoring",
  
  "matching": {
    "regex_primary": "(?i)the\\s+operator\\s+shall\\s+monitor\\s+emissions?\\s+(?:of\\s+)?([\\w\\s]+)\\s+(?:from\\s+)?(?:emission\\s+point\\s+)?([A-Z]\\d+)?\\s+(?:on\\s+)?(?:a\\s+)?(daily|weekly|monthly|quarterly|annual)\\s+basis",
    "regex_variants": [
      "(?i)monitoring\\s+of\\s+([\\w\\s]+)\\s+shall\\s+be\\s+(?:undertaken|carried\\s+out)\\s+(daily|weekly|monthly|quarterly|annually)",
      "(?i)emissions?\\s+(?:of\\s+)?([\\w\\s]+)\\s+shall\\s+be\\s+monitored\\s+(daily|weekly|monthly|quarterly|annually)"
    ],
    "semantic_keywords": ["monitor", "emissions", "emission point", "basis", "sampling"],
    "negative_patterns": ["report to the Environment Agency", "notify"],
    "min_text_length": 50,
    "max_text_length": 500
  },
  
  "extraction_template": {
    "category": "MONITORING",
    "frequency": null,
    "deadline_relative": null,
    "is_subjective": false,
    "subjective_phrases": [],
    "evidence_types": ["Monitoring report", "Lab results", "Method certification"],
    "condition_type": "STANDARD"
  },
  
  "applicability": {
    "module_types": ["MODULE_1"],
    "regulators": ["EA"],
    "document_types": ["ENVIRONMENTAL_PERMIT"],
    "water_companies": []
  },
  
  "metadata": {
    "source_documents": ["doc_001", "doc_042", "doc_089"],
    "added_date": "2025-01-15T10:30:00Z",
    "added_by": "system",
    "last_validated": "2025-03-20T14:00:00Z",
    "validated_by": "admin_001",
    "notes": "Frequency extracted from regex capture group 3"
  },
  
  "performance": {
    "usage_count": 847,
    "success_count": 812,
    "false_positive_count": 12,
    "false_negative_count": 23,
    "user_override_count": 35,
    "success_rate": 0.959,
    "last_used_at": "2025-05-28T09:15:00Z"
  },
  
  "status": {
    "is_active": true,
    "deprecated_at": null,
    "deprecated_reason": null,
    "replaced_by_pattern_id": null
  }
}
```

### Example 2: Subjective Obligation Detection

```json
{
  "pattern_id": "GENERIC_SUBJECTIVE_001",
  "pattern_version": "1.0.0",
  "display_name": "Subjective Language - As Appropriate",
  "description": "Detects 'as appropriate' subjective phrasing",
  
  "matching": {
    "regex_primary": "(?i)\\b(as\\s+appropriate|where\\s+necessary|where\\s+practicable|reasonable\\s+measures|adequate\\s+steps|as\\s+soon\\s+as\\s+practicable|to\\s+the\\s+satisfaction\\s+of|unless\\s+otherwise\\s+agreed|appropriate\\s+measures|suitable\\s+provision|best\\s+endeavours)\\b",
    "regex_variants": [],
    "semantic_keywords": ["appropriate", "necessary", "practicable", "reasonable", "adequate", "satisfaction"],
    "negative_patterns": [],
    "min_text_length": 20,
    "max_text_length": 1000
  },
  
  "extraction_template": {
    "category": null,
    "frequency": null,
    "deadline_relative": null,
    "is_subjective": true,
    "subjective_phrases": [],
    "evidence_types": [],
    "condition_type": null
  },
  
  "applicability": {
    "module_types": ["MODULE_1", "MODULE_2", "MODULE_3"],
    "regulators": ["EA", "SEPA", "NRW", "WATER_COMPANY"],
    "document_types": ["ENVIRONMENTAL_PERMIT", "TRADE_EFFLUENT_CONSENT", "MCPD_REGISTRATION"],
    "water_companies": []
  },
  
  "metadata": {
    "source_documents": [],
    "added_date": "2025-01-01T00:00:00Z",
    "added_by": "system",
    "last_validated": "2025-01-01T00:00:00Z",
    "validated_by": "system",
    "notes": "Core subjective phrase detection - always applied"
  },
  
  "performance": {
    "usage_count": 2341,
    "success_count": 2298,
    "false_positive_count": 43,
    "false_negative_count": 0,
    "user_override_count": 43,
    "success_rate": 0.982,
    "last_used_at": "2025-05-28T11:00:00Z"
  },
  
  "status": {
    "is_active": true,
    "deprecated_at": null,
    "deprecated_reason": null,
    "replaced_by_pattern_id": null
  }
}
```

### Example 3: Module 2 Parameter Limit

```json
{
  "pattern_id": "THAMES_M2_PARAMETER_BOD_001",
  "pattern_version": "1.1.0",
  "priority": 200,
  "display_name": "Thames Water BOD Limit",
  "description": "Extracts BOD parameter limits from Thames Water consents",
  
  "matching": {
    "regex_primary": "(?i)BOD\\s*(?:\\(5\\s*day(?:\\s+ATU)?\\))?\\s*[:\\-]?\\s*(?:Maximum\\s+)?(?:max\\.?\\s+)?([0-9,]+(?:\\.[0-9]+)?)\\s*(mg\\/l|ppm)",
    "regex_variants": [
      "(?i)Biochemical\\s+Oxygen\\s+Demand\\s*[:\\-]?\\s*(?:not\\s+(?:to\\s+)?exceed\\s+)?([0-9,]+(?:\\.[0-9]+)?)\\s*(mg\\/l|ppm)",
      "(?i)BOD\\s+shall\\s+not\\s+exceed\\s+([0-9,]+(?:\\.[0-9]+)?)\\s*(mg\\/l|ppm)"
    ],
    "semantic_keywords": ["BOD", "biochemical oxygen demand", "mg/l", "limit", "maximum"],
    "negative_patterns": ["COD", "chemical oxygen demand"],
    "min_text_length": 15,
    "max_text_length": 200
  },
  
  "extraction_template": {
    "category": "MONITORING",
    "frequency": "MONTHLY",
    "deadline_relative": null,
    "is_subjective": false,
    "subjective_phrases": [],
    "evidence_types": ["Lab certificate", "Sample results", "COC form"],
    "condition_type": "PARAMETER_LIMIT"
  },
  
  "applicability": {
    "module_types": ["MODULE_2"],
    "regulators": ["WATER_COMPANY"],
    "document_types": ["TRADE_EFFLUENT_CONSENT"],
    "water_companies": ["Thames Water", "Thames Water Utilities"]
  },
  
  "metadata": {
    "source_documents": ["doc_201", "doc_234", "doc_267"],
    "added_date": "2025-02-01T09:00:00Z",
    "added_by": "admin_002",
    "last_validated": "2025-04-15T16:30:00Z",
    "validated_by": "admin_001",
    "notes": "Limit value extracted from capture group 1, unit from group 2"
  },
  
  "performance": {
    "usage_count": 156,
    "success_count": 149,
    "false_positive_count": 3,
    "false_negative_count": 4,
    "user_override_count": 7,
    "success_rate": 0.955,
    "last_used_at": "2025-05-27T14:22:00Z"
  },
  
  "status": {
    "is_active": true,
    "deprecated_at": null,
    "deprecated_reason": null,
    "replaced_by_pattern_id": null
  }
}
```

---

# 3. Pattern Matching Algorithm

## 3.1 Matching Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT SEGMENT INPUT                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: LOAD APPLICABLE PATTERNS                                 │
│ - Filter by module_types array in applicability JSONB, regulator, document_type
│ - Load only is_active = true patterns                            │
│ - Sort by priority ASC, then usage_count DESC (priority first)   │
│   Priority order: 1 (highest) → 999 (lowest)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: REGEX MATCHING (Fast Path)                               │
│ - For each pattern: test regex_primary against segment           │
│ - If no match: test regex_variants                               │
│ - Calculate match score (0-100%)                                 │
│ - Track best match                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
      Best Score ≥90%                 Best Score <90%
              │                               │
              ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────────────┐
│ USE LIBRARY MATCH   │     │ STEP 3: SEMANTIC MATCHING (Fallback) │
│ - Apply template    │     │ - If regex score 70-89%              │
│ - Log as library_hit│     │ - Compare semantic_keywords          │
│ - Confidence +15%   │     │ - Calculate semantic score           │
└─────────────────────┘     └─────────────────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                      Combined Score ≥90%              Score <90%
                              │                               │
                              ▼                               ▼
                  ┌─────────────────────┐     ┌─────────────────────┐
                  │ USE LIBRARY MATCH   │     │ PASS TO LLM         │
                  │ - Apply template    │     │ - Full extraction   │
                  │ - Log as library_hit│     │ - Log as api_call   │
                  │ - Confidence +15%   │     │ - Standard confidence│
                  └─────────────────────┘     └─────────────────────┘
```

## 3.2 Match Score Calculation

### 3.2.1 Regex Match Score

```typescript
function calculateRegexMatchScore(
  segment: string,
  pattern: RulePattern
): number {
  // Try primary regex
  const primaryMatch = segment.match(new RegExp(pattern.matching.regex_primary, 'gi'));
  
  if (primaryMatch) {
    // Calculate coverage: how much of segment is matched
    const matchedLength = primaryMatch.reduce((sum, m) => sum + m.length, 0);
    const coverageScore = Math.min(matchedLength / segment.length, 1.0);
    
    // Check for negative patterns (reduce score if found)
    let negativePenalty = 0;
    for (const negPattern of pattern.matching.negative_patterns) {
      if (new RegExp(negPattern, 'i').test(segment)) {
        negativePenalty += 0.15; // 15% penalty per negative pattern
      }
    }
    
    // Calculate final score
    const baseScore = 0.85 + (coverageScore * 0.15); // 85-100% range
    const finalScore = Math.max(baseScore - negativePenalty, 0);
    
    return finalScore;
  }
  
  // Try variant patterns with lower base score
  for (const variant of pattern.matching.regex_variants) {
    const variantMatch = segment.match(new RegExp(variant, 'gi'));
    if (variantMatch) {
      const matchedLength = variantMatch.reduce((sum, m) => sum + m.length, 0);
      const coverageScore = Math.min(matchedLength / segment.length, 1.0);
      return 0.75 + (coverageScore * 0.15); // 75-90% range for variants
    }
  }
  
  return 0; // No match
}
```

### 3.2.2 Semantic Match Score

```typescript
function calculateSemanticMatchScore(
  segment: string,
  pattern: RulePattern
): number {
  const segmentLower = segment.toLowerCase();
  const keywords = pattern.matching.semantic_keywords;
  
  if (keywords.length === 0) return 0;
  
  // Count keyword matches
  let matchCount = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i].toLowerCase();
    const weight = 1 - (i * 0.1); // Earlier keywords weighted higher
    totalWeight += weight;
    
    if (segmentLower.includes(keyword)) {
      matchCount += weight;
    }
  }
  
  // Calculate percentage of weighted keywords found
  const keywordScore = matchCount / totalWeight;
  
  // Scale to 70-95% range (semantic matches shouldn't auto-accept)
  return 0.70 + (keywordScore * 0.25);
}
```

### 3.2.3 Combined Score Logic

```typescript
function calculateCombinedScore(
  regexScore: number,
  semanticScore: number
): number {
  // If regex score is high, use it directly
  if (regexScore >= 0.90) {
    return regexScore;
  }
  
  // If regex score is moderate (70-89%), combine with semantic
  if (regexScore >= 0.70) {
    // Weighted combination: 70% regex, 30% semantic
    return (regexScore * 0.70) + (semanticScore * 0.30);
  }
  
  // Low regex score: use semantic if available
  if (semanticScore >= 0.75) {
    return semanticScore;
  }
  
  // Neither score is sufficient
  return Math.max(regexScore, semanticScore);
}
```

## 3.3 ≥90% Threshold Justification

The 90% match threshold was chosen based on:

1. **Accuracy vs. Coverage Trade-off:** At 90%, false positive rate is <3% while maintaining 60%+ library hit rate
2. **Cost Optimization:** Higher threshold means more LLM calls; lower threshold means more errors to correct
3. **User Trust:** Users expect library matches to be highly accurate; 90% provides this confidence
4. **Learning Mechanism:** Borderline matches (70-89%) go to LLM, with results feeding back to improve patterns

## 3.4 Multiple Match Handling

When multiple patterns match the same segment:

```typescript
function selectBestMatch(
  matches: PatternMatch[]
): PatternMatch | null {
  if (matches.length === 0) return null;
  
  // Sort by: 1) Score descending, 2) Success rate descending, 3) Usage count descending
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.pattern.performance.success_rate !== a.pattern.performance.success_rate) {
      return b.pattern.performance.success_rate - a.pattern.performance.success_rate;
    }
    return b.pattern.performance.usage_count - a.pattern.performance.usage_count;
  });
  
  // Return highest scoring match if above threshold
  if (matches[0].score >= 0.90) {
    return matches[0];
  }
  
  return null; // No match meets threshold
}
```

## 3.5 Partial Match Handling (70-89%)

Segments with 70-89% match scores receive special handling:

1. **Pass to LLM** with pattern context for guidance
2. **LLM prompt includes:** "This text partially matches pattern '{pattern_id}'. Verify if the extracted structure is correct."
3. **If LLM extraction matches template:** Pattern gets +1 to `success_count`
4. **If LLM extraction differs:** Flag for potential pattern improvement

---

# 4. Pattern Categories by Module

## 4.1 Module 1 Patterns (Environmental Permits)

### 4.1.1 EA Standard Conditions

Standard conditions appear on most Environment Agency permits with consistent wording.

**Pattern Examples:**

```json
{
  "pattern_id": "EA_M1_STANDARD_MANAGEMENT_001",
  "regex_primary": "(?i)the\\s+operator\\s+shall\\s+(?:manage|operate)\\s+(?:the\\s+)?(?:activities|operations)\\s+(?:in\\s+accordance|so\\s+as\\s+to)",
  "category": "OPERATIONAL",
  "frequency": "CONTINUOUS"
}
```

```json
{
  "pattern_id": "EA_M1_STANDARD_NOTIFICATION_001",
  "regex_primary": "(?i)the\\s+operator\\s+shall\\s+(?:notify|inform)\\s+the\\s+(?:Environment\\s+Agency|EA)\\s+(?:in\\s+writing)?\\s+(?:within|at\\s+least)\\s+(\\d+)\\s+(days?|hours?|weeks?)",
  "category": "REPORTING",
  "frequency": "EVENT_TRIGGERED"
}
```

```json
{
  "pattern_id": "EA_M1_STANDARD_RECORD_001",
  "regex_primary": "(?i)(?:records?|documentation)\\s+(?:shall|must)\\s+be\\s+(?:kept|maintained|retained)\\s+(?:for\\s+(?:at\\s+least\\s+)?(\\d+)\\s+years?)?",
  "category": "RECORD_KEEPING",
  "frequency": "CONTINUOUS"
}
```

### 4.1.2 Improvement Conditions

Time-bound requirements with explicit deadlines.

```json
{
  "pattern_id": "EA_M1_IMPROVEMENT_DATE_001",
  "regex_primary": "(?i)(?:improvement\\s+condition|IC)\\s*\\d*\\s*[:\\.]?\\s*(?:by|before|no\\s+later\\s+than)\\s+(\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2})",
  "category": "REPORTING",
  "frequency": "ONE_TIME"
}
```

### 4.1.3 SEPA/NRW Variations

Scottish and Welsh regulatory patterns.

```json
{
  "pattern_id": "SEPA_M1_MONITORING_001",
  "regex_primary": "(?i)the\\s+(?:licence\\s+)?holder\\s+shall\\s+(?:carry\\s+out|undertake|perform)\\s+monitoring",
  "applicability": { "regulators": ["SEPA"] },
  "category": "MONITORING"
}
```

### 4.1.4 Subjective Wording Detection

**Always Flag (12 phrases):**

| Phrase | Pattern ID |
|--------|------------|
| as appropriate | SUBJECTIVE_ALWAYS_001 |
| where necessary | SUBJECTIVE_ALWAYS_002 |
| where practicable | SUBJECTIVE_ALWAYS_003 |
| reasonable measures | SUBJECTIVE_ALWAYS_004 |
| adequate steps | SUBJECTIVE_ALWAYS_005 |
| as soon as practicable | SUBJECTIVE_ALWAYS_006 |
| to the satisfaction of | SUBJECTIVE_ALWAYS_007 |
| unless otherwise agreed | SUBJECTIVE_ALWAYS_008 |
| appropriate measures | SUBJECTIVE_ALWAYS_009 |
| suitable provision | SUBJECTIVE_ALWAYS_010 |
| best endeavours | SUBJECTIVE_ALWAYS_011 |
| best practicable means | SUBJECTIVE_ALWAYS_012 |

**Context-Dependent (4 phrases):**

| Phrase | Condition for Flagging | Pattern ID |
|--------|------------------------|------------|
| regularly | No frequency specified | SUBJECTIVE_CONTEXT_001 |
| maintained | No criteria specified | SUBJECTIVE_CONTEXT_002 |
| adequate | No standard referenced | SUBJECTIVE_CONTEXT_003 |
| prevent | Success criteria unclear | SUBJECTIVE_CONTEXT_004 |

### 4.1.5 Frequency Detection Patterns

```json
{
  "pattern_id": "FREQUENCY_DAILY_001",
  "regex_primary": "(?i)\\b(daily|each\\s+day|every\\s+day|every\\s+24\\s+hours?)\\b",
  "extraction_template": { "frequency": "DAILY" }
}
```

```json
{
  "pattern_id": "FREQUENCY_MONTHLY_001",
  "regex_primary": "(?i)\\b(monthly|each\\s+month|every\\s+month|once\\s+(?:a|per)\\s+month)\\b",
  "extraction_template": { "frequency": "MONTHLY" }
}
```

```json
{
  "pattern_id": "FREQUENCY_ANNUAL_001",
  "regex_primary": "(?i)\\b(annually|annual|yearly|each\\s+year|every\\s+year|once\\s+(?:a|per)\\s+year)\\b",
  "extraction_template": { "frequency": "ANNUAL" }
}
```

## 4.2 Module 2 Patterns (Trade Effluent)

### 4.2.1 Water Company Consent Patterns

```json
{
  "pattern_id": "SEVERN_M2_CONSENT_HEADER_001",
  "regex_primary": "(?i)Severn\\s+Trent\\s+(?:Water\\s+)?(?:Services\\s+)?(?:Ltd|Limited)?.*trade\\s+effluent\\s+consent",
  "applicability": { "water_companies": ["Severn Trent Water", "Severn Trent"] }
}
```

```json
{
  "pattern_id": "ANGLIAN_M2_CONSENT_HEADER_001",
  "regex_primary": "(?i)Anglian\\s+Water\\s+(?:Services\\s+)?(?:Ltd|Limited)?.*(?:trade\\s+effluent\\s+consent|consent\\s+to\\s+discharge)",
  "applicability": { "water_companies": ["Anglian Water"] }
}
```

### 4.2.2 Parameter Limit Extraction

```json
{
  "pattern_id": "GENERIC_M2_PARAMETER_COD_001",
  "regex_primary": "(?i)COD\\s*(?:\\(Chemical\\s+Oxygen\\s+Demand\\))?\\s*[:\\-]?\\s*(?:Maximum\\s+)?(?:max\\.?\\s+)?([0-9,]+(?:\\.[0-9]+)?)\\s*(mg\\/l|ppm)",
  "extraction_template": { "parameter_type": "COD" }
}
```

```json
{
  "pattern_id": "GENERIC_M2_PARAMETER_PH_RANGE_001",
  "regex_primary": "(?i)pH\\s*[:\\-]?\\s*(?:not\\s+less\\s+than\\s+)?([0-9]+(?:\\.[0-9]+)?)\\s*(?:and\\s+)?(?:not\\s+(?:greater|more)\\s+than\\s+)?([0-9]+(?:\\.[0-9]+)?)",
  "extraction_template": { "parameter_type": "PH", "limit_type": "RANGE" }
}
```

```json
{
  "pattern_id": "GENERIC_M2_PARAMETER_TEMPERATURE_001",
  "regex_primary": "(?i)Temperature\\s*[:\\-]?\\s*(?:not\\s+to\\s+exceed\\s+)?(?:max(?:imum)?\\s+)?([0-9]+(?:\\.[0-9]+)?)\\s*°?C",
  "extraction_template": { "parameter_type": "TEMPERATURE" }
}
```

### 4.2.3 Volume/Flow Patterns

```json
{
  "pattern_id": "GENERIC_M2_VOLUME_DAILY_001",
  "regex_primary": "(?i)(?:maximum\\s+)?(?:daily\\s+)?(?:volume|flow)\\s*[:\\-]?\\s*(?:not\\s+to\\s+exceed\\s+)?([0-9,]+(?:\\.[0-9]+)?)\\s*(m³|cubic\\s+metres?|litres?)\\/?(day|d)?",
  "extraction_template": { "parameter_type": "VOLUME" }
}
```

## 4.3 Module 3 Patterns (MCPD/Generators)

### 4.3.1 MCPD Registration Patterns

```json
{
  "pattern_id": "EA_M3_MCPD_REGISTRATION_001",
  "regex_primary": "(?i)(?:Medium\\s+Combustion\\s+Plant\\s+Directive|MCPD)\\s+(?:Registration|Permit)\\s*(?:Number|No\\.?|Reference)?\\s*[:\\-]?\\s*([A-Z]{2,3}[\\/-]?\\d+[\\/-]?\\d*)",
  "category": "REPORTING"
}
```

### 4.3.2 Generator Type Identification

```json
{
  "pattern_id": "EA_M3_GENERATOR_1_5MW_001",
  "regex_primary": "(?i)(?:thermal\\s+input|rated\\s+thermal\\s+input|capacity)\\s*[:\\-]?\\s*([1-4](?:\\.[0-9]+)?)\\s*MW(?:th)?",
  "extraction_template": { "generator_type": "MCPD_1_5MW" }
}
```

```json
{
  "pattern_id": "EA_M3_GENERATOR_5_50MW_001",
  "regex_primary": "(?i)(?:thermal\\s+input|rated\\s+thermal\\s+input|capacity)\\s*[:\\-]?\\s*([5-9]|[1-4][0-9]|50)(?:\\.[0-9]+)?\\s*MW(?:th)?",
  "extraction_template": { "generator_type": "MCPD_5_50MW" }
}
```

```json
{
  "pattern_id": "EA_M3_GENERATOR_EMERGENCY_001",
  "regex_primary": "(?i)(?:emergency|standby|backup)\\s+(?:generator|genset|diesel\\s+generator)",
  "extraction_template": { "generator_type": "EMERGENCY_GENERATOR" }
}
```

### 4.3.3 Run-Hour Limit Patterns

```json
{
  "pattern_id": "EA_M3_RUNHOUR_ANNUAL_001",
  "regex_primary": "(?i)(?:annual\\s+)?(?:operating|run|running)\\s+hours?\\s*(?:limit(?:ed)?\\s+to|not\\s+to\\s+exceed|maximum)\\s*[:\\-]?\\s*([0-9,]+)\\s*(?:hours?)?(?:\\s*per\\s*(?:calendar\\s+)?year)?",
  "extraction_template": { "run_hour_period": "CALENDAR_YEAR" }
}
```

```json
{
  "pattern_id": "EA_M3_RUNHOUR_500HR_001",
  "regex_primary": "(?i)(?:limited\\s+to\\s+)?500\\s*(?:hours?|hrs?)\\s*(?:per\\s+(?:calendar\\s+)?year|annually)",
  "extraction_template": { "annual_run_hour_limit": 500, "generator_type": "EMERGENCY_GENERATOR" }
}
```

**Note:** Patterns are stored in the `rule_library_patterns` table with `module_types` array in the `applicability` JSONB field. New modules can add patterns by including their `module_code` in the `module_types` array. The pattern matching logic validates module codes against the `modules` table. See Canonical Dictionary Section B.31 (Module Extension Pattern) for guidance on adding new modules and their patterns.

## 4.4 AER (Annual Emissions Return) Patterns

```json
{
  "pattern_id": "EA_M3_AER_DEADLINE_001",
  "regex_primary": "(?i)(?:annual\\s+)?(?:emissions?\\s+)?(?:return|report|AER)\\s+(?:must|shall)\\s+be\\s+(?:submitted|returned)\\s+(?:by|before|no\\s+later\\s+than)\\s+(\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|\\d{4}-\\d{2}-\\d{2})",
  "category": "REPORTING",
  "frequency": "ANNUAL"
}
```

---

# 5. Learning & Improvement Mechanism

The learning mechanism is the platform's technical moat — the more documents processed, the more accurate extractions become.

## 5.1 Pattern Discovery Process

### 5.1.1 Discovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM EXTRACTION COMPLETE                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: CHECK FOR POTENTIAL NEW PATTERN                          │
│ - Was this segment NOT matched by library?                       │
│ - Did user CONFIRM extraction without edits?                     │
│ - Has similar text been extracted 3+ times with same result?     │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 NO │                   │ YES
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────────────────────────┐
            │ NO ACTION    │   │ STEP 2: GENERATE PATTERN CANDIDATE │
            └──────────────┘   │ - Extract common text patterns      │
                               │ - Generate regex from examples      │
                               │ - Calculate initial success_rate    │
                               └──────────────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────────┐
                               │ STEP 3: QUEUE FOR REVIEW          │
                               │ - Add to pattern_candidates table  │
                               │ - Set status = PENDING_REVIEW      │
                               │ - Notify admin                     │
                               └──────────────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────────┐
                               │ STEP 4: ADMIN APPROVAL            │
                               │ - Review pattern regex            │
                               │ - Test against sample documents   │
                               │ - Approve or reject               │
                               └──────────────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────────┐
                               │ STEP 5: PATTERN ACTIVATION        │
                               │ - Insert into rule_library_patterns│
                               │ - Set is_active = true            │
                               │ - Log pattern creation            │
                               └──────────────────────────────────┘
```

### 5.1.2 Pattern Candidate Generation

```typescript
async function generatePatternCandidate(
  successfulExtractions: ExtractionResult[]
): Promise<PatternCandidate | null> {
  // Require minimum 3 similar successful extractions
  if (successfulExtractions.length < 3) return null;
  
  // Extract common text patterns
  const texts = successfulExtractions.map(e => e.originalText);
  const commonPatterns = findCommonPatterns(texts);
  
  if (commonPatterns.length === 0) return null;
  
  // Generate regex from patterns
  const regexPattern = generateRegexFromPatterns(commonPatterns);
  
  // Verify regex matches all input texts
  const matchRate = texts.filter(t => new RegExp(regexPattern, 'i').test(t)).length / texts.length;
  
  if (matchRate < 0.90) return null;
  
  // Extract common extraction template
  const template = extractCommonTemplate(successfulExtractions);
  
  return {
    suggested_regex: regexPattern,
    match_rate: matchRate,
    sample_count: successfulExtractions.length,
    extraction_template: template,
    source_extractions: successfulExtractions.map(e => e.id),
    status: 'PENDING_REVIEW',
    created_at: new Date().toISOString()
  };
}
```

## 5.2 Feedback Loop System

### 5.2.1 User Correction Tracking

When a user edits an extraction, the system tracks the correction:

```typescript
interface CorrectionRecord {
  extraction_log_id: string;
  obligation_id: string;
  pattern_id_used: string | null;    // Pattern that was used (if any)
  original_data: ExtractedObligation;
  corrected_data: ExtractedObligation;
  correction_type: 'category' | 'frequency' | 'deadline' | 'subjective' | 'text' | 'other';
  corrected_by: string;
  corrected_at: string;
}
```

### 5.2.2 Correction Analysis

```typescript
async function analyzeCorrections(
  patternId: string,
  timeWindow: number = 30 // days
): Promise<CorrectionAnalysis> {
  const corrections = await getCorrectionsForPattern(patternId, timeWindow);
  
  if (corrections.length === 0) {
    return { status: 'no_corrections', recommendation: 'none' };
  }
  
  // Analyze correction types
  const correctionsByType = groupBy(corrections, 'correction_type');
  
  // Calculate correction rate
  const totalUsage = await getPatternUsageCount(patternId, timeWindow);
  const correctionRate = corrections.length / totalUsage;
  
  // Determine recommendation
  if (correctionRate > 0.15) {
    return {
      status: 'high_correction_rate',
      correction_rate: correctionRate,
      primary_correction_type: getMostCommonType(correctionsByType),
      recommendation: 'deprecate_or_major_revision'
    };
  } else if (correctionRate > 0.05) {
    return {
      status: 'moderate_correction_rate',
      correction_rate: correctionRate,
      primary_correction_type: getMostCommonType(correctionsByType),
      recommendation: 'minor_revision'
    };
  }
  
  return {
    status: 'acceptable',
    correction_rate: correctionRate,
    recommendation: 'none'
  };
}
```

### 5.2.3 Pattern Performance Degradation Detection

```sql
-- Identify patterns with declining performance
SELECT 
  pattern_id,
  pattern_version,
  usage_count,
  success_rate,
  false_positive_count,
  user_override_count,
  (user_override_count::DECIMAL / NULLIF(usage_count, 0)) * 100 as override_rate,
  CASE 
    WHEN success_rate < 0.85 THEN 'CRITICAL'
    WHEN success_rate < 0.90 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as health_status
FROM rule_library_patterns
WHERE is_active = true
  AND usage_count >= 10  -- Minimum usage for statistical significance
  AND (
    success_rate < 0.90
    OR (user_override_count::DECIMAL / NULLIF(usage_count, 0)) > 0.10
  )
ORDER BY success_rate ASC, user_override_count DESC;
```

## 5.3 Rule Refinement Process

### 5.3.1 Pattern Update Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                 PATTERN NEEDS REFINEMENT                         │
│ (Identified via correction analysis or manual review)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: CREATE DRAFT VERSION                                     │
│ - Clone current pattern                                          │
│ - Increment version number                                       │
│ - Apply proposed changes                                         │
│ - Set status = 'DRAFT'                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: BACK-TEST AGAINST HISTORICAL DATA                        │
│ - Run draft pattern against last 100 uses of current version     │
│ - Compare extraction results                                     │
│ - Calculate improvement metrics                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
          Improvement ≥5%         No Improvement
                    │                   │
                    ▼                   ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ STEP 3: APPROVE CHANGES       │  │ REJECT CHANGES               │
│ - Set draft status = 'ACTIVE' │  │ - Delete draft version       │
│ - Set old status = 'SUPERSEDED'│ │ - Log rejection reason       │
│ - Log version change          │  │ - Consider alternative fixes │
└──────────────────────────────┘  └──────────────────────────────┘
```

### 5.3.2 Version Rollback Procedure

```typescript
async function rollbackPatternVersion(
  patternId: string,
  targetVersion: string,
  reason: string
): Promise<void> {
  // Get current active version
  const currentPattern = await getActivePattern(patternId);
  
  // Get target version
  const targetPattern = await getPatternByVersion(patternId, targetVersion);
  
  if (!targetPattern) {
    throw new Error(`Target version ${targetVersion} not found for pattern ${patternId}`);
  }
  
  // Deactivate current version
  await updatePattern(currentPattern.id, {
    is_active: false,
    deprecated_at: new Date().toISOString(),
    deprecated_reason: `Rolled back to ${targetVersion}: ${reason}`,
    replaced_by_pattern_id: targetPattern.id
  });
  
  // Reactivate target version
  await updatePattern(targetPattern.id, {
    is_active: true,
    deprecated_at: null,
    deprecated_reason: null,
    replaced_by_pattern_id: null
  });
  
  // Log rollback
  await logPatternEvent({
    pattern_id: patternId,
    event_type: 'ROLLBACK',
    from_version: currentPattern.pattern_version,
    to_version: targetVersion,
    reason: reason,
    performed_by: 'system'
  });
}
```

## 5.4 Accuracy Tracking

### 5.4.1 Key Metrics

| Metric | Formula | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| Library Hit Rate | library_matches / total_segments | ≥60% | <50% |
| Pattern Success Rate | confirmed_extractions / pattern_usage | ≥90% | <85% |
| LLM Fallback Rate | llm_calls / total_segments | ≤40% | >50% |
| User Correction Rate | corrections / total_extractions | ≤10% | >15% |
| False Positive Rate | false_positives / pattern_matches | ≤3% | >5% |

### 5.4.2 Analytics Queries

```sql
-- Weekly accuracy report
SELECT 
  DATE_TRUNC('week', el.extraction_timestamp) as week,
  COUNT(*) as total_extractions,
  SUM(CASE WHEN el.rule_library_hits > 0 THEN 1 ELSE 0 END) as library_hit_extractions,
  ROUND(SUM(el.rule_library_hits)::DECIMAL / SUM(el.segments_processed) * 100, 2) as library_hit_rate,
  AVG(el.flagged_for_review::DECIMAL / NULLIF(el.obligations_extracted, 0)) * 100 as avg_flag_rate,
  SUM(el.flagged_for_review) as total_flagged
FROM extraction_logs el
WHERE el.extraction_timestamp >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', el.extraction_timestamp)
ORDER BY week DESC;
```

```sql
-- Pattern performance by category
SELECT 
  rlp.extraction_template->>'category' as category,
  COUNT(*) as pattern_count,
  AVG(rlp.performance->>'success_rate')::DECIMAL as avg_success_rate,
  SUM((rlp.performance->>'usage_count')::INTEGER) as total_usage,
  SUM((rlp.performance->>'false_positive_count')::INTEGER) as total_false_positives
FROM rule_library_patterns rlp
WHERE rlp.is_active = true
GROUP BY rlp.extraction_template->>'category'
ORDER BY avg_success_rate DESC;
```

## 5.5 Database Learning Mechanism

### 5.5.1 Learning from Extraction Logs

```sql
-- Find segments that failed library match but had successful LLM extraction
SELECT 
  el.document_id,
  d.document_type,
  o.text as obligation_text,
  o.category,
  o.frequency,
  o.confidence_score
FROM extraction_logs el
JOIN documents d ON el.document_id = d.id
JOIN obligations o ON o.document_id = d.id
WHERE el.rule_library_hits = 0  -- No library match
  AND o.confidence_score >= 0.85  -- High confidence LLM extraction
  AND o.status != 'REJECTED'  -- Not rejected in review
  AND el.extraction_timestamp >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY el.extraction_timestamp DESC
LIMIT 100;
```

### 5.5.2 Learning from Review Queue

```sql
-- Analyze corrections to identify pattern improvement opportunities
SELECT 
  rqi.original_data->>'pattern_id_used' as pattern_id,
  rqi.review_action,
  COUNT(*) as action_count,
  jsonb_agg(DISTINCT jsonb_build_object(
    'field', 
    CASE 
      WHEN rqi.original_data->>'category' != rqi.edited_data->>'category' THEN 'category'
      WHEN rqi.original_data->>'frequency' != rqi.edited_data->>'frequency' THEN 'frequency'
      WHEN rqi.original_data->>'is_subjective' != rqi.edited_data->>'is_subjective' THEN 'is_subjective'
      ELSE 'other'
    END
  )) as correction_fields
FROM review_queue_items rqi
WHERE rqi.review_status = 'COMPLETED'
  AND rqi.review_action IN ('edited', 'rejected')
  AND rqi.reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY rqi.original_data->>'pattern_id_used', rqi.review_action
HAVING COUNT(*) >= 3  -- Minimum occurrences for significance
ORDER BY action_count DESC;
```

### 5.5.3 Comparing Original vs. Edited Extractions

```sql
-- Find patterns where users consistently change the same field
SELECT 
  o.source_pattern_id,
  jsonb_agg(DISTINCT o.original_extraction->>'category') as original_categories,
  jsonb_agg(DISTINCT o.category) as corrected_categories,
  COUNT(*) as correction_count
FROM obligations o
WHERE o.original_extraction IS NOT NULL
  AND o.original_extraction->>'category' != o.category
  AND o.source_pattern_id IS NOT NULL
  AND o.updated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY o.source_pattern_id
HAVING COUNT(*) >= 5
ORDER BY correction_count DESC;
```

---

# 6. Rule Library Versioning

## 6.1 Version Numbering System

All patterns use semantic versioning: `MAJOR.MINOR.PATCH`

| Component | Description | When to Increment |
|-----------|-------------|-------------------|
| **MAJOR** | Breaking change to extraction output | Template structure change, category reassignment |
| **MINOR** | Feature addition, backward compatible | New regex variants added, coverage expanded |
| **PATCH** | Bug fixes, no behavioral change | Regex typo fix, negative pattern added |

## 6.2 Library-Level Versioning

The entire rule library has a version tracked in `system_settings`:

```json
{
  "setting_key": "rule_library_version",
  "setting_value": {
    "version": "2.3.1",
    "released_at": "2025-05-15T10:00:00Z",
    "patterns_count": 287,
    "changelog": "Added 12 new Module 2 patterns for Yorkshire Water"
  }
}
```

## 6.3 Priority and Matching Order

### 6.3.1 Priority System

**Purpose:** Control the order in which patterns are matched against document text. Higher priority patterns (lower number) are checked first.

**Priority Values:**
- **1-99:** Critical patterns (must match first)
  - Examples: Specific condition numbers, exact parameter names, critical deadlines
- **100-299:** High-priority patterns (common obligations)
  - Examples: Standard monitoring requirements, common reporting frequencies
- **300-499:** Medium-priority patterns (general obligations)
  - Examples: General compliance statements, standard conditions
- **500-699:** Low-priority patterns (fallback/catch-all)
  - Examples: Generic compliance language, catch-all patterns
- **700-999:** Lowest priority (rarely used patterns)
  - Examples: Edge cases, deprecated patterns

**Default Priority:** 500 (medium priority)

**Priority Assignment Rules:**
1. **Specificity:** More specific patterns get higher priority (lower number)
   - "Condition 2.3" → Priority 50
   - "Monitoring requirement" → Priority 300
2. **Usage:** Frequently used patterns can be promoted (lower priority number)
3. **Confidence:** High-confidence patterns get higher priority
4. **Module-Specific:** Module-specific patterns get higher priority than generic patterns

**Matching Order:**
```sql
SELECT * FROM rule_library_patterns
WHERE is_active = true
  AND applicability->'module_types' @> '["MODULE_1"]'::JSONB
ORDER BY priority ASC, usage_count DESC;
```

**Example:**
- Pattern A: Priority 100, Usage 500 → Matched first
- Pattern B: Priority 200, Usage 1000 → Matched second (priority takes precedence)
- Pattern C: Priority 100, Usage 200 → Matched third (same priority, lower usage)

### 6.3.2 Priority Management

**When to Adjust Priority:**
- **Promote (lower number):** Pattern is frequently used and highly accurate
- **Demote (higher number):** Pattern causes false positives or conflicts with higher-priority patterns
- **Deprecate (priority 999):** Pattern is rarely used or replaced by better pattern

**Priority Update Workflow:**
1. Admin reviews pattern performance metrics
2. Identifies patterns needing priority adjustment
3. Updates `priority` field in `rule_library_patterns` table
4. Changes take effect immediately (no deployment required)

## 6.4 Version Tracking in Extractions

Every extraction log records the rule library version:

```sql
-- Stored in extraction_logs.rule_library_version
SELECT 
  rule_library_version,
  COUNT(*) as extraction_count,
  AVG(obligations_extracted) as avg_obligations,
  AVG(flagged_for_review::DECIMAL / NULLIF(obligations_extracted, 0)) as avg_flag_rate
FROM extraction_logs
GROUP BY rule_library_version
ORDER BY rule_library_version DESC;
```

## 6.4 Rollback Procedure

If a library update degrades accuracy:

1. **Identify regression:** Monitor flag rate, success rate after update
2. **Rollback decision:** If metrics decline >5% within 48 hours
3. **Execute rollback:**
   ```sql
   -- Revert library version
   UPDATE system_settings 
   SET setting_value = jsonb_set(
     setting_value, 
     '{version}', 
     '"2.3.0"'
   )
   WHERE setting_key = 'rule_library_version';
   
   -- Deactivate new patterns
   UPDATE rule_library_patterns
   SET is_active = false
   WHERE added_date >= '2025-05-15T10:00:00Z';
   ```
4. **Post-mortem:** Analyze what went wrong, create fix plan

---

# 7. Confidence Scoring Integration

## 7.1 Confidence Boost for Library Matches

Library matches receive a **+15% confidence boost** because:

1. Patterns are pre-validated against known regulatory text
2. Success rates are tracked and maintained above 90%
3. Extraction templates are verified by admin review

## 7.2 Confidence Calculation

```typescript
function calculateFinalConfidence(
  baseConfidence: number,
  matchSource: 'library' | 'llm',
  patternSuccessRate: number | null
): number {
  if (matchSource === 'library') {
    // Library match: Add 15% boost, scaled by pattern success rate
    const successMultiplier = patternSuccessRate || 0.90;
    const boost = 0.15 * successMultiplier;
    return Math.min(baseConfidence + boost, 1.0); // Cap at 100%
  }
  
  // LLM extraction: Use base confidence
  return baseConfidence;
}
```

## 7.3 Example Calculations

| Scenario | Base Confidence | Boost | Final Confidence |
|----------|-----------------|-------|------------------|
| Library match (95% pattern success) | 0.85 | +0.143 | **0.993** |
| Library match (90% pattern success) | 0.85 | +0.135 | **0.985** |
| LLM extraction | 0.85 | 0 | **0.85** |
| Library match (low base) | 0.72 | +0.135 | **0.855** |
| LLM extraction (high conf) | 0.95 | 0 | **0.95** |

## 7.4 Threshold Application

| Final Confidence | Action | UI Treatment |
|------------------|--------|--------------|
| ≥85% | Auto-accept | Shown as "Confirmed" |
| 70-84% | Flag for review | Yellow highlight |
| <70% | Require review | Red highlight, blocking |

---

# 8. Hallucination Prevention Rules

## 8.1 Library as Grounding Mechanism

The rule library provides grounding for LLM extractions:

1. **Pattern validation:** LLM output compared against known patterns
2. **Template constraints:** Extracted values must match expected templates
3. **Novel detection:** Extractions not matching ANY pattern flagged as higher risk

## 8.2 Hallucination Risk Indicators

```typescript
interface HallucinationRiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  recommendation: 'accept' | 'review' | 'reject';
}

function assessHallucinationRisk(
  extraction: ExtractedObligation,
  documentText: string,
  libraryMatch: PatternMatch | null
): HallucinationRiskAssessment {
  const riskFactors: string[] = [];
  
  // Check 1: Is extracted text in document?
  if (!documentText.includes(extraction.text.substring(0, 50))) {
    riskFactors.push('extracted_text_not_found');
  }
  
  // Check 2: Does frequency match known patterns?
  if (!libraryMatch && extraction.frequency) {
    riskFactors.push('frequency_not_pattern_matched');
  }
  
  // Check 3: Is date extraction plausible?
  if (extraction.deadline_date) {
    const deadlineYear = new Date(extraction.deadline_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (deadlineYear < currentYear - 5 || deadlineYear > currentYear + 10) {
      riskFactors.push('implausible_deadline_date');
    }
  }
  
  // Check 4: Is confidence score consistent with content?
  if (extraction.confidence_score > 0.90 && riskFactors.length > 0) {
    riskFactors.push('high_confidence_with_risk_factors');
  }
  
  // Check 5: Does category match text patterns?
  const categoryPatterns = {
    'MONITORING': ['monitor', 'sample', 'test', 'measure'],
    'REPORTING': ['report', 'notify', 'submit', 'return'],
    'RECORD_KEEPING': ['record', 'log', 'document', 'retain'],
    'OPERATIONAL': ['operate', 'manage', 'maintain', 'ensure'],
    'MAINTENANCE': ['service', 'calibrate', 'inspect', 'repair']
  };
  const textLower = extraction.text.toLowerCase();
  const expectedKeywords = categoryPatterns[extraction.category] || [];
  if (!expectedKeywords.some(kw => textLower.includes(kw))) {
    riskFactors.push('category_keyword_mismatch');
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  let recommendation: 'accept' | 'review' | 'reject';
  
  if (riskFactors.length === 0) {
    riskLevel = 'low';
    recommendation = 'accept';
  } else if (riskFactors.length <= 2) {
    riskLevel = 'medium';
    recommendation = 'review';
  } else {
    riskLevel = 'high';
    recommendation = 'reject';
  }
  
  return { risk_level: riskLevel, risk_factors: riskFactors, recommendation };
}
```

## 8.3 Cross-Validation with Library

```typescript
async function crossValidateWithLibrary(
  llmExtraction: ExtractedObligation,
  libraryMatch: PatternMatch | null
): Promise<ValidationResult> {
  if (!libraryMatch) {
    return { validated: false, source: 'no_library_match' };
  }
  
  const template = libraryMatch.pattern.extraction_template;
  const discrepancies: string[] = [];
  
  // Compare category
  if (template.category && llmExtraction.category !== template.category) {
    discrepancies.push(`category: LLM=${llmExtraction.category}, Library=${template.category}`);
  }
  
  // Compare frequency
  if (template.frequency && llmExtraction.frequency !== template.frequency) {
    discrepancies.push(`frequency: LLM=${llmExtraction.frequency}, Library=${template.frequency}`);
  }
  
  // Compare subjective flag
  if (template.is_subjective !== undefined && 
      llmExtraction.is_subjective !== template.is_subjective) {
    discrepancies.push(`is_subjective: LLM=${llmExtraction.is_subjective}, Library=${template.is_subjective}`);
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

---

# 9. Error Handling & Edge Cases

## 9.1 No Pattern Match Scenario

When no pattern matches a document segment:

```typescript
async function handleNoPatternMatch(
  segment: DocumentSegment,
  documentContext: DocumentContext
): Promise<ExtractionResult> {
  // Log the no-match event
  await logPatternMiss({
    document_id: documentContext.documentId,
    segment_text: segment.text.substring(0, 500),
    document_type: documentContext.documentType,
    regulator: documentContext.regulator
  });
  
  // Fall back to LLM extraction
  const llmResult = await extractWithLLM(segment, documentContext);
  
  // Flag as higher hallucination risk
  llmResult.hallucination_risk = true;
  llmResult.no_pattern_match = true;
  
  // Add to review queue if confidence is borderline
  if (llmResult.confidence_score < 0.85) {
    await addToReviewQueue({
      document_id: documentContext.documentId,
      obligation_data: llmResult,
      review_type: 'NO_PATTERN_MATCH',
      priority: 1
    });
  }
  
  return llmResult;
}
```

## 9.2 Pattern Match but User Rejects

```typescript
async function handlePatternRejection(
  patternId: string,
  obligation: Obligation,
  rejectionReason: string
): Promise<void> {
  // Update pattern performance
  await updatePatternPerformance(patternId, {
    increment_false_positive: true,
    increment_user_override: true
  });
  
  // Log the rejection
  await logPatternRejection({
    pattern_id: patternId,
    obligation_id: obligation.id,
    original_extraction: obligation.original_extraction,
    rejection_reason: rejectionReason
  });
  
  // Check if pattern needs deprecation
  const performance = await getPatternPerformance(patternId);
  if (performance.success_rate < 0.85) {
    await flagPatternForReview(patternId, 'High rejection rate');
  }
}
```

## 9.3 Borderline Confidence (70-89%)

```typescript
async function handleBorderlineConfidence(
  segment: DocumentSegment,
  patternMatch: PatternMatch,
  confidence: number
): Promise<ExtractionResult> {
  // Use library template but flag for review
  const extraction = applyPatternTemplate(patternMatch, segment);
  extraction.confidence_score = confidence;
  
  // Add context to LLM for verification
  const llmVerification = await verifyWithLLM(extraction, segment);
  
  if (llmVerification.agrees) {
    // Boost confidence slightly
    extraction.confidence_score = Math.min(confidence + 0.05, 0.89);
  } else {
    // Flag for mandatory review
    extraction.requires_review = true;
    extraction.review_reason = 'LLM_DISAGREEMENT';
  }
  
  return extraction;
}
```

## 9.4 Novel Condition Types

When encountering a condition type never seen before:

```typescript
async function handleNovelCondition(
  segment: DocumentSegment,
  documentContext: DocumentContext
): Promise<ExtractionResult> {
  // Use LLM with explicit novel condition handling
  const prompt = buildNovelConditionPrompt(segment, documentContext);
  const llmResult = await extractWithLLM(segment, documentContext, prompt);
  
  // Force review
  llmResult.requires_review = true;
  llmResult.is_blocking = true;
  llmResult.review_reason = 'NOVEL_CONDITION_TYPE';
  
  // Queue for pattern discovery
  await queueForPatternDiscovery({
    segment_text: segment.text,
    extraction_result: llmResult,
    document_context: documentContext
  });
  
  return llmResult;
}
```

## 9.5 Ambiguous Pattern Matches

When multiple patterns match with similar scores:

```typescript
async function handleAmbiguousMatch(
  matches: PatternMatch[]
): Promise<PatternMatch | null> {
  // Sort by: Score, Success Rate, Specificity
  matches.sort((a, b) => {
    // Primary: Score
    if (Math.abs(b.score - a.score) > 0.02) {
      return b.score - a.score;
    }
    // Secondary: Success rate
    if (Math.abs(b.pattern.performance.success_rate - a.pattern.performance.success_rate) > 0.02) {
      return b.pattern.performance.success_rate - a.pattern.performance.success_rate;
    }
    // Tertiary: Pattern specificity (fewer applicability items = more specific)
    const aSpecificity = a.pattern.applicability.regulators.length + 
                         a.pattern.applicability.document_types.length;
    const bSpecificity = b.pattern.applicability.regulators.length + 
                         b.pattern.applicability.document_types.length;
    return aSpecificity - bSpecificity;
  });
  
  // If top two are still very close, flag for review
  if (matches.length >= 2 && 
      Math.abs(matches[0].score - matches[1].score) < 0.03 &&
      matches[0].pattern.extraction_template.category !== 
      matches[1].pattern.extraction_template.category) {
    return null; // Let LLM decide
  }
  
  return matches[0];
}
```

---

# 10. Pattern Maintenance Process

## 10.1 Ownership and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **System** | Pattern discovery, performance tracking, deprecation alerts |
| **Platform Admin** | Pattern approval, major version updates, rollbacks |
| **Internal Team** | Weekly pattern review, accuracy monitoring |

## 10.2 Review Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Performance dashboard review | Daily | System (automated alerts) |
| Low-performing pattern analysis | Weekly | Internal Team |
| New pattern candidate review | Weekly | Platform Admin |
| Full library audit | Quarterly | Internal Team + Admin |

## 10.3 Pattern Improvement Prioritization

Patterns are prioritized for improvement based on:

```sql
SELECT 
  pattern_id,
  pattern_version,
  (performance->>'usage_count')::INTEGER as usage,
  (performance->>'success_rate')::DECIMAL as success_rate,
  (performance->>'false_positive_count')::INTEGER as false_positives,
  -- Priority score: high usage + low success = highest priority
  ((performance->>'usage_count')::INTEGER * (1 - (performance->>'success_rate')::DECIMAL)) as priority_score
FROM rule_library_patterns
WHERE is_active = true
  AND (performance->>'usage_count')::INTEGER >= 10
ORDER BY priority_score DESC
LIMIT 20;
```

## 10.4 Testing Before Deployment

Before activating pattern changes:

1. **Unit test:** Pattern regex matches expected samples
2. **Back-test:** Run against last 50 historical uses, compare results
3. **Shadow mode:** Run new pattern alongside old for 24 hours, compare
4. **Staged rollout:** Activate for 10% of extractions, monitor metrics

## 10.5 Pattern Loading Architecture

```typescript
// Patterns are loaded into memory at startup and refreshed periodically
class PatternCache {
  private patterns: Map<string, RulePattern> = new Map();
  private lastRefresh: Date | null = null;
  private refreshIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  
  async getPatterns(
    moduleType: string,
    regulator: string,
    documentType: string
  ): Promise<RulePattern[]> {
    await this.ensureFresh();
    
    return Array.from(this.patterns.values()).filter(p => 
      p.status.is_active &&
      p.applicability.module_types.includes(moduleType) &&
      // Sort by priority (ascending: 1 = highest priority), then by usage_count (descending)
      // Priority takes precedence over usage_count
      p.applicability.regulators.includes(regulator) &&
      p.applicability.document_types.includes(documentType)
    );
  }
  
  private async ensureFresh(): Promise<void> {
    if (this.lastRefresh && 
        Date.now() - this.lastRefresh.getTime() < this.refreshIntervalMs) {
      return;
    }
    await this.refresh();
  }
  
  async refresh(): Promise<void> {
    const patterns = await loadAllActivePatterns();
    this.patterns.clear();
    for (const pattern of patterns) {
      this.patterns.set(pattern.pattern_id, pattern);
    }
    this.lastRefresh = new Date();
  }
}
```

---

# 11. Database Schema

## 11.1 rule_library_patterns Table

```sql
CREATE TABLE rule_library_patterns (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  pattern_id TEXT NOT NULL UNIQUE,
  pattern_version TEXT NOT NULL DEFAULT '1.0.0',
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Matching configuration (JSONB for flexibility)
  matching JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "regex_primary": "string",
  --   "regex_variants": ["string"],
  --   "semantic_keywords": ["string"],
  --   "negative_patterns": ["string"],
  --   "min_text_length": integer,
  --   "max_text_length": integer
  -- }
  
  -- Extraction template
  extraction_template JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "category": "string",
  --   "frequency": "string",
  --   "deadline_relative": "string",
  --   "is_subjective": boolean,
  --   "subjective_phrases": ["string"],
  --   "evidence_types": ["string"],
  --   "condition_type": "string"
  -- }
  
  -- Applicability filters
  applicability JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "module_types": ["MODULE_1", "MODULE_2", "MODULE_3", ...],  -- Any module_code from modules table
  --   "regulators": ["EA", "SEPA", "NRW", "WATER_COMPANY"],
  --   "document_types": ["string"],
  --   "water_companies": ["string"]
  -- }
  
  **Note:** The `module_types` array can include any `module_code` from the `modules` table. New modules can add their patterns by including their module code in this array. Pattern matching logic validates module codes against the `modules` table.
  
  -- Performance tracking
  performance JSONB NOT NULL DEFAULT '{
    "usage_count": 0,
    "success_count": 0,
    "false_positive_count": 0,
    "false_negative_count": 0,
    "user_override_count": 0,
    "success_rate": 1.0,
    "last_used_at": null
  }'::JSONB,
  
  -- Metadata
  source_documents TEXT[] DEFAULT '{}',
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  deprecated_reason TEXT,
  replaced_by_pattern_id TEXT REFERENCES rule_library_patterns(pattern_id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_pattern_version CHECK (pattern_version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT chk_success_rate CHECK (
    (performance->>'success_rate')::DECIMAL >= 0 AND 
    (performance->>'success_rate')::DECIMAL <= 1
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_rlp_pattern_id ON rule_library_patterns(pattern_id);
CREATE INDEX idx_rlp_is_active ON rule_library_patterns(is_active) WHERE is_active = true;
CREATE INDEX idx_rlp_module_types ON rule_library_patterns USING GIN ((applicability->'module_types'));
CREATE INDEX idx_rlp_regulators ON rule_library_patterns USING GIN ((applicability->'regulators'));
CREATE INDEX idx_rlp_document_types ON rule_library_patterns USING GIN ((applicability->'document_types'));
CREATE INDEX idx_rlp_category ON rule_library_patterns((extraction_template->>'category'));
CREATE INDEX idx_rlp_usage_count ON rule_library_patterns(((performance->>'usage_count')::INTEGER) DESC);
CREATE INDEX idx_rlp_success_rate ON rule_library_patterns(((performance->>'success_rate')::DECIMAL) DESC);
CREATE INDEX idx_rlp_created_at ON rule_library_patterns(created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rule_library_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rule_library_patterns_updated_at
  BEFORE UPDATE ON rule_library_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_library_patterns_updated_at();
```

## 11.2 pattern_candidates Table

```sql
CREATE TABLE pattern_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Suggested pattern
  suggested_pattern JSONB NOT NULL,
  -- Structure matches rule_library_patterns fields
  
  -- Discovery metadata
  source_extractions UUID[] NOT NULL DEFAULT '{}',
  sample_count INTEGER NOT NULL DEFAULT 0,
  match_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  
  -- Review status
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  -- Values: PENDING_REVIEW, APPROVED, REJECTED, MERGED
  
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- If approved, link to created pattern
  created_pattern_id TEXT REFERENCES rule_library_patterns(pattern_id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_candidate_status CHECK (
    status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MERGED')
  )
);

CREATE INDEX idx_pc_status ON pattern_candidates(status);
CREATE INDEX idx_pc_created_at ON pattern_candidates(created_at DESC);
```

## 11.3 pattern_events Table

```sql
CREATE TABLE pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pattern_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- Values: CREATED, UPDATED, DEPRECATED, ACTIVATED, ROLLBACK, PERFORMANCE_UPDATE
  
  from_version TEXT,
  to_version TEXT,
  
  event_data JSONB DEFAULT '{}',
  reason TEXT,
  
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_event_type CHECK (
    event_type IN ('CREATED', 'UPDATED', 'DEPRECATED', 'ACTIVATED', 'ROLLBACK', 'PERFORMANCE_UPDATE')
  )
);

CREATE INDEX idx_pe_pattern_id ON pattern_events(pattern_id);
CREATE INDEX idx_pe_event_type ON pattern_events(event_type);
CREATE INDEX idx_pe_created_at ON pattern_events(created_at DESC);
```

---

# 12. Integration Points

## 12.1 Rule Library → LLM Prompts

The rule library provides context to LLM prompts:

```typescript
function buildExtractionPrompt(
  segment: DocumentSegment,
  documentContext: DocumentContext,
  relevantPatterns: RulePattern[]
): ExtractionPrompt {
  // Include pattern hints in prompt
  const patternHints = relevantPatterns
    .slice(0, 3)
    .map(p => ({
      pattern: p.display_name,
      category: p.extraction_template.category,
      frequency: p.extraction_template.frequency
    }));
  
  const systemMessage = `
You are an expert environmental compliance analyst extracting obligations.

KNOWN PATTERNS FOR THIS DOCUMENT TYPE:
${JSON.stringify(patternHints, null, 2)}

If the text closely matches a known pattern, prefer those category/frequency values.
`;

  return {
    systemMessage,
    userMessage: buildUserMessage(segment, documentContext)
  };
}
```

## 12.2 Rule Library → Confidence Scores

```typescript
function adjustConfidenceForLibraryMatch(
  baseConfidence: number,
  matchType: 'library_exact' | 'library_semantic' | 'llm_only',
  patternSuccessRate: number | null
): number {
  switch (matchType) {
    case 'library_exact':
      // +15% boost for exact regex match
      const exactBoost = 0.15 * (patternSuccessRate || 0.90);
      return Math.min(baseConfidence + exactBoost, 1.0);
      
    case 'library_semantic':
      // +10% boost for semantic match
      const semanticBoost = 0.10 * (patternSuccessRate || 0.85);
      return Math.min(baseConfidence + semanticBoost, 1.0);
      
    case 'llm_only':
    default:
      return baseConfidence;
  }
}
```

## 12.3 Extraction Logs → Learning Queries

```typescript
// Daily learning job
async function runDailyLearningAnalysis(): Promise<void> {
  // 1. Find patterns with declining performance
  const decliningPatterns = await findDecliningPatterns(30); // 30-day window
  for (const pattern of decliningPatterns) {
    await flagPatternForReview(pattern.pattern_id, 'Performance decline detected');
  }
  
  // 2. Find potential new patterns
  const candidates = await findPatternCandidates(7); // 7-day window
  for (const candidate of candidates) {
    await createPatternCandidate(candidate);
  }
  
  // 3. Update pattern success rates
  await updateAllPatternSuccessRates();
  
  // 4. Log learning run
  await logLearningRun({
    declining_patterns_flagged: decliningPatterns.length,
    new_candidates_created: candidates.length,
    run_at: new Date().toISOString()
  });
}
```

## 12.4 Review Queue → Pattern Feedback

```typescript
// When review queue item is completed
async function processReviewCompletion(
  item: ReviewQueueItem
): Promise<void> {
  const patternId = item.original_data?.pattern_id_used;
  
  if (!patternId) return;
  
  switch (item.review_action) {
    case 'confirmed':
      await updatePatternPerformance(patternId, {
        increment_success: true
      });
      break;
      
    case 'edited':
      await updatePatternPerformance(patternId, {
        increment_user_override: true
      });
      await logPatternCorrection(patternId, item.original_data, item.edited_data);
      break;
      
    case 'rejected':
      await updatePatternPerformance(patternId, {
        increment_false_positive: true
      });
      await checkPatternHealth(patternId);
      break;
  }
}
```

---

**END OF DOCUMENT**

*Document Version: 1.0*  
*Generated for: Oblicore Platform*  
*Source Documents: Product Logic Specification (PLS), Canonical Dictionary, AI Layer Design & Cost Optimization*
