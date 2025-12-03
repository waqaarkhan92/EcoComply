# PRODUCT LOGIC SPECIFICATION (PLS)
## EcoComply Platform — Modules 1–4

**EcoComply v1.0 — Launch-Ready / Last updated: 2025-02-03**

**Document Version:** 1.6
**Status:** Complete
**Depends On:**
- Commercial Master Plan (00)
- High Level Product Plan (01) - v1.0
- Database Schema (20) - v1.6
- Database Canonical Dictionary (22) - v1.3

> [v1.6 UPDATE – Module 1 & Module 2 Advanced Business Logic – 2025-02-03]
> - Added Section C.1.11: Enforcement Notice Workflow Logic
>   - State machine: ISSUED → IN_RESPONSE → CLOSED/APPEALED
>   - Escalation logic, evidence linking, reporting KPIs
> - Added Section C.1.12: Compliance Decision Workflow Logic
>   - State machine: PENDING → UNDER_REVIEW → APPROVED/REJECTED
>   - Impact analysis, evidence requirements, permit version management
> - Added Section C.1.13: Condition Evidence Rules Logic
>   - Evidence type mapping, frequency logic, validation rules
>   - Integration with schedule generation
> - Added Section C.1.14: Evidence Completeness Scoring Algorithm
>   - Detailed scoring algorithm: (Submitted / Required) × 100
>   - Score interpretation, triggers, missing evidence detection
> - Added Section C.1.15: Condition Permissions Logic
>   - 3-level permissions: VIEW, EDIT, MANAGE
>   - Permission validation, inheritance, revocation rules
> - Added Section C.2.11: Sampling Logistics Workflow Logic
>   - 5-stage workflow: SCHEDULED → SAMPLE_COLLECTED → SUBMITTED_TO_LAB → RESULTS_RECEIVED → CERTIFICATE_LINKED
>   - Lab accreditation tracking, turnaround time monitoring
> - Added Section C.2.12: Monthly Statement Reconciliation Logic
>   - Auto-reconciliation algorithm with ±5% tolerance
>   - Volume variance calculation, discrepancy investigation
> - Added Section C.2.13: Consent State Machine Logic
>   - 10-state machine with validated transitions
>   - Automated state transitions, obligation impact rules
> - Added Section C.2.14: Corrective Actions Workflow Logic
>   - Priority-based tracking (LOW, MEDIUM, HIGH, CRITICAL)
>   - Root cause analysis, preventive measures, escalation rules
> [v1.5 UPDATE – Standardized Audit Pack Specification – 2025-01-01]
> - Added Section B.8.1: Universal Audit Pack Specification
> - Defined 6 universal pack contents required for all modules
> - Standardized pack generation SLA: < 2 minutes
> - Defined regulator access rules (no login required, secure links)
> - Standardized pack provenance signature requirements
> [v1.4 UPDATE – Added Compliance Score System – 2025-01-01]
> - Added Section B.5.4: Compliance Score Calculation
> - Defined score calculation rules for Site and Module levels
> - Integrated with Compliance Clock for real-time updates
> - Defined score boundaries, penalties, and display rules
> [v1.3 UPDATE – Added Module 4 (Hazardous Waste) and Cross-Cutting Features – 2025-12-01]
> [v1.2 UPDATE – Added Compliance Clock, Escalation Workflows, Permit Workflows – 2025-12-01]
> [v1.1 UPDATE – Enhanced Module 1, 2, 3 with new features – 2025-12-01]
> [v1.0 UPDATE – Version Header – 2024-12-27]

---

# A. GLOBAL LOGIC ARCHITECTURE

## A.1 System-Wide Logic Principles

### A.1.1 Canonical Rule: module_code vs module_id Usage

**This section defines the authoritative rule for when to use `module_code` (string) vs `module_id` (UUID). All other documents must reference this section.**

**Rule:**
- **Database Layer (PostgreSQL):** Always use `module_id` (UUID FOREIGN KEY → `modules.id`)
  - All tables: `documents.module_id`, `module_activations.module_id`, `cross_sell_triggers.target_module_id`
  - Foreign keys enforce referential integrity
  - Queries join on `module_id` for performance
- **AI/Pattern Layer (Rule Library):** Use `module_code` (string) in JSONB patterns
  - Rule library patterns store `module_types: ["MODULE_1", "MODULE_2"]` (module_code strings)
  - Validation: System validates `module_code` exists in `modules` table before applying patterns
  - Conversion: When applying patterns, system converts `module_code` → `module_id` via lookup: `SELECT id FROM modules WHERE module_code = 'MODULE_1'`
- **UI/API Layer:** Use `module_id` (UUID) for all operations
  - API endpoints accept/return `module_id`
  - UI displays `module_name` from `modules` table but stores `module_id`
  - No hardcoded `module_code` checks in UI/API code
- **Business Logic Layer:** Use `module_id` (UUID) for all operations
  - Activation logic: Queries `modules` table by `module_id`
  - Billing logic: Joins on `module_id`
  - Cross-sell logic: Uses `target_module_id` (UUID)

**Conversion Pattern:**
```sql
-- Pattern validation (AI Layer):
SELECT COUNT(*) FROM modules 
WHERE module_code = ANY(ARRAY['MODULE_1', 'MODULE_2']::TEXT[])
AND is_active = true

-- Pattern application (Business Logic):
SELECT m.id, m.module_name 
FROM modules m 
WHERE m.module_code = 'MODULE_1'
-- Then use m.id (module_id) for all database operations
```

**Enforcement:**
- No hardcoded `module_code` checks in database queries
- No hardcoded `MODULE_1`/`MODULE_2` constants in business logic
- All module references must go through `modules` table lookup
- Rule library patterns are the ONLY place where `module_code` strings are used

## A.2 System-Wide Logic Principles (Continued)

### A.2.1 Core Design Principles

1. **Document-Centric Architecture:** All compliance management flows from regulatory documents (permits, consents, registrations). Documents are the source of truth for obligations.

2. **80/20 Engine Split:** 80% of logic is shared across all modules (core compliance engine). 20% is module-specific rule libraries.

3. **Human-in-the-Loop by Default:** The system assists but does not replace human judgment. All AI extractions are reviewable and overridable.

4. **Audit Trail Completeness:** Every action, change, and decision is logged with timestamp and user attribution.

5. **Fail-Safe Design:** When uncertain, the system flags for human review rather than making autonomous decisions.

### A.1.2 Data Flow Hierarchy

```
Company
  └─→ Site(s)
        └─→ Document(s) [Permit | Consent | MCPD Registration]
              └─→ Obligation(s)
                    └─→ Schedule(s)
                    └─→ Evidence Item(s)
                          └─→ Pack(s) (5 types: Regulator, Tender, Board, Insurer, Audit)
```

### A.1.3 Module Activation Rules

Module activation rules are defined in the `modules` table (see Canonical Dictionary Section C.4 - Module Registry Table). The system queries this table to determine prerequisites, pricing, and activation methods dynamically.

**How It Works:**
- Prerequisites are enforced via `modules.requires_module_id` foreign key
- Activation logic queries `modules` table to check if prerequisite modules are active
- Pricing is stored in `modules.base_price` and `modules.pricing_model`
- Default modules are identified by `modules.is_default = true`
- Activation methods are determined by module configuration

**Example Current Modules (stored in `modules` table):**
- Module 1 (Environmental Permits): No prerequisite, default on signup, £149/month per site
- Module 2 (Trade Effluent): Requires Module 1, manual activation or cross-sell trigger, £59/month per site
- Module 3 (MCPD/Generators): Requires Module 1, manual activation or cross-sell trigger, £79/month per company

**Activation Logic:**
1. User requests module activation
2. System queries `modules` table to get module configuration
3. If `requires_module_id` is set, system checks `module_activations` table to verify prerequisite is active
4. If prerequisite not active, system displays: "[Prerequisite Module Name] is required before activating this module."
5. If prerequisite active (or no prerequisite), activation proceeds
6. System creates `module_activations` record with `module_id` (not `module_type`)
7. Billing logic queries `modules` table to calculate charges based on `base_price` and `pricing_model`
8. **Billing starts immediately** (see Section E.4.1 for detailed billing logic)

**Deactivation Logic:**
- If Module 1 is deactivated:
  - System queries `modules` table to find all modules where `requires_module_id = Module 1's ID`
  - Module 2 and Module 3 are automatically deactivated (cascade)
  - User notified: "Module 1 is required for Module 2/3. Reactivating Module 1 will restore Module 2/3 access."
  - Module 2/3 data is preserved (not deleted)
  - User can reactivate Module 1 to restore Module 2/3 access
- If Module 2 or Module 3 is deactivated:
  - Can be deactivated independently
  - Data archived (not deleted)
  - Can reactivate to restore access
- Legacy Activations:
  - If user had Module 2 before prerequisite was added:
    - Grandfathered: Module 2 remains active
    - But cannot reactivate if deactivated later (will require Module 1)

> **⚠️ IMPLEMENTATION STATUS (2025-02-01):**
> - **Cascading Deactivation:** ❌ **NOT IMPLEMENTED** - Current implementation only deactivates single module. Cascading deactivation when Module 1 is deactivated is not yet implemented. See `app/api/v1/module-activations/[activationId]/deactivate/route.ts` for current implementation.
> - **Prerequisite Checking:** ✅ **IMPLEMENTED** - Activation endpoint correctly checks prerequisites.
> - **Action Required:** Implement cascading deactivation logic in deactivation endpoint.

**Benefits:**
- New modules can be added without code changes (just insert into `modules` table)
- Prerequisites are enforced via foreign keys (no hardcoded logic)
- Pricing is configurable per module (no code changes needed)
- Activation methods are data-driven (stored in `modules` table)

---

## A.2 Obligation Categories

All obligations extracted from documents fall into one of five categories. Category determines default evidence types, monitoring frequencies, and escalation logic.

### A.2.1 Category Definitions

| Category | Definition | Examples | Default Frequency |
|----------|------------|----------|-------------------|
| **Monitoring** | Measuring, sampling, testing activities | pH testing, emissions monitoring, noise surveys | Daily/Weekly/Monthly |
| **Reporting** | Submitting data/reports to regulators | Annual returns, exceedance notifications, AERs | Annual/Quarterly/Event-triggered |
| **Record-Keeping** | Maintaining logs and documentation | Waste transfer notes, maintenance logs, training records | Ongoing/As-generated |
| **Operational** | Day-to-day operational requirements | Operating hours, material handling, containment | Continuous/Ongoing |
| **Maintenance** | Equipment servicing and upkeep | Stack testing, equipment calibration, repair records | Annual/6-monthly/Scheduled |

### A.2.2 Category Assignment Rules

1. **LLM extracts category** based on obligation text during parsing
2. **Confidence threshold:** ≥85% for auto-assignment; <85% flags for human review
3. **Human override:** Users can change category at any time; override is logged
4. **Default if uncertain:** Record-Keeping (lowest consequence for miscategorisation)

---

## A.3 Condition Types

Conditions are the building blocks of obligations. Each permit/consent/registration contains conditions, which are parsed into discrete obligations.

### A.3.1 Condition Type Definitions

| Condition Type | Definition | Module Applicability |
|----------------|------------|---------------------|
| **Standard Condition** | Boilerplate EA/SEPA/NRW conditions present on most permits | Module 1 |
| **Site-Specific Condition** | Custom conditions unique to the permitted activity | Module 1 |
| **Improvement Condition** | Time-bound requirements with hard deadlines | Module 1 |
| **ELV Condition** | Emission Limit Value - quantitative limits | Module 1, Module 3 |
| **Parameter Limit** | Numeric discharge/quality limits | Module 2 |
| **Run-Hour Limit** | Operating time restrictions | Module 3 |
| **Reporting Requirement** | Periodic submission requirements | All Modules |

### A.3.2 Condition Extraction Rules

> [v1.6 UPDATE – AI Fallback Strategy – 2025-01-01]
> - Primary extraction: model-driven (AI-first approach)
> - Fallback: manual structured capture
> - System must remain fully operable if AI offline or poor confidence
> - Confidence scoring threshold to flag human review

**Primary Extraction: Model-Driven:**
- **AI-First Approach:** All document extraction attempts use AI model (GPT-4o) as primary method
- **Rule Library Pre-Check:** Before calling LLM, check rule library for pattern matches (≥90% confidence)
- **LLM Extraction:** If no rule match, use LLM to extract obligations, parameters, run-hours, or consignment notes
- **Confidence Scoring:** All extractions receive confidence scores (0-100%)
- **Auto-Accept Threshold:** Extractions with confidence ≥85% are auto-accepted (user can still edit)

**Fallback: Manual Structured Capture:**
- **Fallback Triggers:**
  1. AI offline/unavailable (connection timeout, service unavailable, network issues)
  2. Poor confidence (confidence score <70%, multiple extraction failures, parsing errors)
  3. User preference (user explicitly chooses manual entry)
- **Manual Capture Interface:** Module-specific structured forms for manual data entry
  - Module 1: Obligation entry form (title, frequency, deadline, category, description)
  - Module 2: Parameter entry form (name, limit, unit, sampling frequency)
  - Module 3: Generator and run-hour entry form
  - Module 4: Consignment note entry form (EWC code, quantity, carrier, dates)
- **Validation:** Same validation rules apply to manual entries as AI extractions
- **Data Quality:** Manual entries marked with `import_source = 'MANUAL'` in database
- **No AI Dependency:** Manual capture works independently of AI service availability

**System Operability Requirements:**
- **Critical Requirement:** System MUST remain fully operable if AI is offline or confidence is poor
- **Operability Guarantees:**
  1. Document upload always works, even if AI unavailable
  2. Structured manual entry forms always available
  3. All CRUD operations work without AI
  4. Pack generation works with manually entered data
  5. Compliance tracking (clocks, deadlines, evidence) works independently
  6. All user workflows continue to function
- **Graceful Degradation:**
  - AI unavailable: "AI extraction temporarily unavailable. Please use manual entry."
  - Low confidence: "AI extraction confidence is low. Please review and edit, or use manual entry."
  - No blocking: System never blocks user actions due to AI unavailability

**Standard Conditions:**
- Pattern: "Schedule X", "Condition X.X", numbered lists
- Treatment: Match against standard conditions library first; if match found (confidence ≥90%), use library version
- **If no library match:** Try AI extraction; if AI fails or confidence <70%, fallback to manual entry
- Human review trigger: No library match found AND AI extraction confidence <85%

**Site-Specific Conditions:**
- Pattern: Conditions not matching standard library
- Treatment: Full LLM extraction with mandatory human review
- **If AI unavailable or confidence <70%:** Fallback to manual structured capture
- Human review trigger: Always flagged (confidence <85%) OR AI unavailable

**Improvement Conditions:**
- Pattern: Contains deadline date, "by [date]", "within [timeframe]", "improvement programme"
- Treatment: Extract deadline date, create one-time schedule
- **If AI unavailable or confidence <70%:** Fallback to manual entry with date picker
- Human review trigger: Date parsing uncertainty, ambiguous deadline phrasing, OR confidence <85%

---

## A.4 Relationship Logic

### A.4.1 Document → Obligation Relationship

- **One-to-Many:** One document generates multiple obligations
- **No Orphan Obligations:** Every obligation MUST link to exactly one document
- **Document Deletion Logic:** If document is deleted, all linked obligations are archived (not deleted) with reason "source_document_removed"

### A.4.2 Obligation → Evidence Relationship

- **Many-to-Many:** One obligation can have multiple evidence items; one evidence item can satisfy multiple obligations
- **Evidence Linking:** Evidence is linked at the obligation level, not the document level
- **Unlinking:** Evidence can be unlinked by user; action is logged

### A.4.3 Obligation → Schedule Relationship

- **One-to-One or One-to-Many:** Most obligations have one schedule; complex obligations may have multiple schedules (e.g., monthly sampling + annual reporting)
- **Schedule Inheritance:** When obligation frequency is set, schedule is auto-generated
- **Schedule Override:** Users can override auto-generated schedules; override is logged

### A.4.4 Schedule → Deadline Relationship

- **Schedule generates deadlines:** Each schedule instance creates a deadline record
- **Deadline Calculation:** See Section B.3 for calculation rules
- **Deadline Completion:** Deadline marked complete when evidence is linked OR user marks complete manually

---

## A.5 Confidence Scoring Rules

### A.5.1 Confidence Score Definition

Confidence score (0–100%) represents the LLM's certainty in extraction accuracy.

### A.5.2 Confidence Thresholds

| Threshold | Action | User Experience |
|-----------|--------|-----------------|
| **≥85%** | Auto-accept | Extraction shown as "Confirmed"; user can still edit |
| **70–84%** | Flag for review | Yellow highlight; "Review recommended" label; user must review before proceeding |
| **<70%** | Require review OR fallback to manual | Red highlight; "Low confidence - manual entry recommended"; system suggests manual entry as alternative |

### A.5.3 Confidence Score Components

Confidence is calculated from:
1. **Pattern match score** (40%): How closely text matches known patterns
2. **Structural clarity** (30%): Document formatting quality (headers, numbering)
3. **Semantic coherence** (20%): Internal consistency of extracted data
4. **OCR quality** (10%): If scanned PDF, OCR confidence impacts overall score

### A.5.4 Confidence Score Logging

Every extraction records:
- `confidence_score`: Float (0.00–1.00)
- `confidence_components`: JSON object with component breakdown
- `extraction_timestamp`: When extraction occurred
- `model_version`: LLM model identifier
- `rule_library_version`: Version of rule library used

---

## A.6 Subjective Obligation Flags

### A.6.1 Definition

Subjective obligations contain language that requires human interpretation. The system cannot determine compliance automatically.

### A.6.2 Subjective Phrase Patterns

The following phrases trigger subjective flagging:

**Always Flag (100% confidence):**
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

**Context-Dependent Flag (LLM evaluates context):**
- "regularly" (flag if no frequency specified)
- "maintained" (flag if no criteria specified)
- "adequate" (flag if no standard referenced)
- "prevent" (flag if success criteria unclear)

### A.6.3 Subjective Flag Workflow

**Extraction Phase (Non-Blocking):**
1. LLM detects subjective phrase → sets `is_subjective = true`
2. Obligation is extracted and displayed with "Requires Interpretation" badge
3. Extraction proceeds normally (non-blocking) - obligation is created and visible
4. Obligation status set to `PENDING` (cannot be marked complete until interpreted)

**Completion Phase (Blocking):**
5. User attempts to mark obligation as complete
6. **If** `is_subjective = true` AND `interpretation_notes` is NULL, **then**:
   - System blocks completion with message: "This obligation requires interpretation before it can be marked complete. Please add interpretation notes."
   - User must navigate to interpretation workflow
7. **If** `interpretation_notes` is populated, **then**:
   - Obligation can be marked complete normally
   - Interpretation notes are stored and included in packs (all pack types)
   - **Interpretation Locking:** Once interpretation notes are saved, they are locked (immutable)
   - **Interpretation Approval:** No separate approval step required. Interpretation notes added by Staff/Admin/Owner are immediately valid. The `interpreted_by` field serves as the approval record (the person who interpreted is the approver).
   - **Interpretation History:** All interpretation changes logged immutably:
     - Initial interpretation: `action_type = 'INTERPRETATION_ADDED'`, logs `interpreted_by`, `interpreted_at`, `interpretation_notes`
     - Interpretation override (Admin/Owner only): `action_type = 'INTERPRETATION_OVERRIDDEN'`, logs `overridden_by`, `overridden_at`, `previous_interpretation`, `new_interpretation`, `override_reason`
     - All interpretation history stored in `audit_logs` with full audit trail
   - **Chain-of-Custody:** Interpretation has complete chain-of-custody:
     - Who interpreted (user_id) - serves as approver (no separate approval step)
     - When interpreted (timestamp)
     - Who overrode (if applicable, with reason)
     - All changes logged with IP address and session ID
8. Flag cannot be removed by user (system-determined)

### A.6.4 Subjective Obligation Evidence

For subjective obligations:
- System prompts: "How will you demonstrate compliance with this obligation?"
- User must provide evidence type AND interpretation rationale
- Packs include both evidence and rationale (all pack types)

---

## A.7 Human Review Triggers

### A.7.1 Mandatory Human Review Scenarios

| Trigger | Reason | UI Treatment |
|---------|--------|--------------|
| Confidence score <70% | Uncertain extraction | Red flag, blocking |
| Subjective phrase detected | Requires interpretation | Yellow badge, non-blocking for extraction, blocking for completion |
| No library pattern match | Novel condition type | Orange flag, review recommended |
| Date parsing failure | Deadline uncertainty | Red flag, blocking |
| Conflicting obligations detected | Logical inconsistency | Orange flag, review recommended |
| Multi-permit same site | Potential overlap | Information banner |

### A.7.2 Review Workflow

1. Items requiring review appear in "Review Queue" dashboard widget
2. User opens item, sees original text + extracted data side-by-side
3. User can: Confirm, Edit, or Reject extraction
4. Confirm/Edit: Item moves to active obligations
5. Reject: Item archived with `status = rejected`, `rejection_reason` required

### A.7.3 Review Completion Tracking

- `reviewed_by`: User ID
- `reviewed_at`: Timestamp
- `review_action`: enum (confirmed, edited, rejected)
- `original_extraction`: JSON snapshot of pre-review data
- `review_notes`: Optional text field

---

## A.8 Versioning Logic

### A.8.1 Document Versioning

Each document type supports versioning for variations, renewals, and supersessions.

| Event | Versioning Behaviour |
|-------|---------------------|
| **Initial Upload** | Creates version 1.0 |
| **Permit Variation** | Creates version 1.1, 1.2, etc.; links to parent |
| **Permit Renewal** | Creates version 2.0; marks previous version as "superseded" |
| **Document Correction** | User edit creates minor version (1.0.1); original preserved |

### A.8.2 Version States

- **Active:** Current version in force
- **Superseded:** Replaced by newer version; obligations migrated or archived
- **Expired:** Past validity date; no active obligations
- **Draft:** Uploaded but not yet processed

### A.8.3 Obligation Version Migration

When document is superseded:
1. System identifies obligations on old version
2. System attempts to match to obligations on new version
3. **Match found:** Evidence history transfers; schedule continues
4. **No match:** Old obligation archived; user prompted to review new document
5. **Conflict:** Both flagged for human review

### A.8.4 Version History Access

- All versions retained indefinitely
- Users can view any historical version
- Packs can be generated for historical versions (all pack types)
- Evidence linked to specific version at time of linking

---

## A.9 AI Boundaries

### A.9.1 AI Retry and Timeout Policy (Single Source of Truth)

**This section defines the authoritative retry and timeout policy for all AI operations. All other documents must reference this section.**

**Retry Policy:**
- **Maximum Retries:** 2 retry attempts AFTER initial attempt
- **Total Attempts:** 3 (1 initial attempt + 2 retry attempts)
- **Retry Triggers:**
  - LLM timeout (>30 seconds for standard documents ≤49 pages, >5 minutes for large documents ≥50 pages)
  - Invalid JSON response from LLM
  - Network timeout
  - Rate limit errors (429)
- **Retry Delay:** Exponential backoff: 2 seconds (first retry), 4 seconds (second retry)
- **After Max Retries:** Flag for manual review; user can retry manually or enter Manual Mode

**Clarification:**
- `maxRetries: 2` means 2 retry attempts (not 2 total attempts)
- Total attempts = 1 initial + 2 retries = 3 total attempts
- Implementation: `if (attempt < maxRetries)` where `attempt` starts at 0 (initial), then 1 (first retry), then 2 (second retry)

**Timeout Policy:**
- **Standard Documents (≤49 pages):** 30 seconds timeout
- **Large Documents (≥50 pages):** 5 minutes timeout
- **OCR Processing:** 60 seconds timeout
- **Pack Generation:** 60 seconds (standard), 5 minutes (large packs with >500 items) — applies to all pack types

**Timeout Threshold Clarification:**
- Documents with **49 pages or fewer** = Standard (30s timeout)
- Documents with **50 pages or more** = Large (5min timeout)
- Threshold is **inclusive at 50 pages** (50 pages = large document)
- Implementation: `if (pageCount >= 50) { timeout = 300_000 } else { timeout = 30_000 }`

**Enforcement:**
- All AI operations must use these values
- Workflow documents reference this policy
- AI Layer implementation must match these values
- No hardcoded retry/timeout values in workflows - all reference this section

**References:**
- AI Layer implementation: `maxRetries: 2` (2 retry attempts), `totalAttempts: 3`, `retryDelayMs: [2000, 4000]`, `timeout: 30_000` (standard), `timeout: 300_000` (large)
- Workflow retry logic: "Retry processing (up to 2 additional attempts)" = references this policy (2 retries = 3 total attempts)
- PLS error handling table: "LLM timeout (>30s) | Retry twice (3 total attempts)" = references this policy (2 retries after initial attempt = 3 total attempts)

**Implementation Pattern:**
```typescript
const RETRY_CONFIG = {
  maxRetries: 2,              // Number of retry attempts AFTER initial attempt
  totalAttempts: 3,           // Total attempts including initial (1 + 2 retries)
  retryDelayMs: [2000, 4000], // Exponential backoff: 2s (first retry), 4s (second retry)
  simplifyPromptOnRetry: true
};

// Usage:
if (attempt < RETRY_CONFIG.maxRetries) {
  // attempt 0 = initial, attempt 1 = first retry, attempt 2 = second retry
  // Total: 3 attempts (1 initial + 2 retries)
}
```

### A.9.1.1 Error Recovery Scenarios

**OpenAI API Down:**
- After 3 total attempts (1 initial + 2 retries), flag document for manual review
- Set `extraction_status = 'EXTRACTION_FAILED'`
- Notify user: "Extraction temporarily unavailable. Please try again in 1 hour or enter Manual Mode."
- Queue document for automatic retry after 1 hour
- Log error to `extraction_logs` with full context

**Corrupted Document:**
- If PDF cannot be parsed (invalid format, corrupted file), set `extraction_status = 'OCR_FAILED'`
- Notify user: "Document appears corrupted. Please upload a new copy."
- Allow user to upload replacement document
- Original document record preserved (for audit trail) but marked as failed

**Zero Obligations Extracted:**
- If document type is NOT in valid zero-obligation list (Section B.1.1) AND extraction returns 0 obligations:
  - Set `extraction_status = 'ZERO_OBLIGATIONS'`
  - Require user to either:
    - Retry extraction with alternative prompt
    - Enter Manual Mode and create at least one obligation manually
    - Confirm document has no obligations (with reason required)
  - Document cannot be activated until obligations exist OR user confirms zero obligations
- If document type IS in valid zero-obligation list AND extraction returns 0 obligations:
  - Document can be marked as complete with 0 obligations
  - System logs: "Zero obligations validated - document type: [type]"
  - Document status set to `ACTIVE` with `obligation_count = 0`

**Invalid JSON Response:**
- After all retries, if LLM returns invalid JSON:
  - Set `extraction_status = 'EXTRACTION_FAILED'`
  - Log raw response to `extraction_logs.errors` JSONB field
  - Notify user: "Extraction failed due to invalid response. Please try Manual Mode."
  - Allow user to retry extraction or enter Manual Mode
  - Raw response preserved for debugging

**Network Timeout:**
- If network timeout occurs (before LLM timeout):
  - Retry with exponential backoff (same as LLM timeout retry)
  - After max retries, set `extraction_status = 'EXTRACTION_FAILED'`
  - Notify user: "Network timeout. Please check your connection and try again."
  - Allow immediate retry (no 1-hour delay)

**Rate Limit Exceeded:**
- If OpenAI API returns 429 (rate limit):
  - Wait for Retry-After header (if provided)
  - Otherwise, wait 60 seconds before retry
  - Retry up to max retries
  - After max retries, set `extraction_status = 'EXTRACTION_FAILED'`
  - Notify user: "Rate limit exceeded. Please try again in a few minutes."
  - Queue for retry after 5 minutes

### A.9.2 What the AI IS Allowed to Do

1. **Extract text** from PDF documents (OCR + native text)
2. **Parse and segment** document sections
3. **Identify patterns** matching rule library
4. **Extract obligations** with structured data (deadline, frequency, category)
5. **Assign confidence scores** to extractions
6. **Flag subjective language** patterns
7. **Suggest evidence types** based on obligation category
8. **Generate monitoring schedules** from extracted frequencies
9. **Calculate deadlines** from extracted dates and frequencies
10. **Detect cross-sell triggers** (keywords indicating Module 2/3 needs)

### A.9.4 What the AI is NOT Allowed to Do

1. **Interpret legal meaning** of obligations
2. **Determine compliance status** without evidence
3. **Provide regulatory advice** or recommendations
4. **Make decisions** that bypass human review for flagged items
5. **Delete or archive** obligations without user action
6. **Modify user-entered data** without explicit user instruction
7. **Access external systems** beyond document storage
8. **Store or transmit** document content outside the platform
9. **Override user decisions** on obligation interpretation
10. **Guarantee extraction completeness** or accuracy

### A.9.4 Safety Boundaries

**Critical Rule:** The system displays the following disclaimer on all extraction results:

> "Extracted obligations are derived by AI and may contain errors. Users must verify all extractions against original documents. EcoComply does not guarantee completeness or accuracy of extractions. All compliance decisions remain the user's responsibility."

**Implementation:**
- Disclaimer appears on every extraction review screen
- Disclaimer included in all pack headers (all pack types)
- Users must check "I have reviewed and verified these obligations" before finalising document setup

---

## A.10 Universal Compliance Clock

### A.10.1 Purpose and Scope

The Universal Compliance Clock is a platform-wide countdown mechanism that provides real-time visibility into compliance risks across ALL modules. It tracks days remaining until deadlines/expiry for multiple entity types and calculates criticality using Red/Amber/Green indicators.

**Supported Entity Types:**
- `OBLIGATION` - Permit/consent obligations (Module 1, 2, 3)
- `DEADLINE` - Scheduled compliance deadlines (All modules)
- `PARAMETER` - Trade effluent parameter sampling deadlines (Module 2)
- `GENERATOR` - Stack test deadlines, runtime limits (Module 3)
- `CONSENT` - Consent expiry dates (Module 2)
- `WASTE_STREAM` - Storage duration limits (Module 4)
- `CONTRACTOR_LICENCE` - Carrier/contractor licence expiry (Module 4)

### A.10.2 Criticality Calculation Rules

**Criticality Thresholds:**

| Status | Condition | Display Color | Dashboard Badge |
|--------|-----------|---------------|-----------------|
| **RED** | Overdue (days_remaining < 0) OR days_remaining <= 7 | Red (#DC2626) | "URGENT" |
| **AMBER** | 8 <= days_remaining <= 30 | Amber (#F59E0B) | "ATTENTION" |
| **GREEN** | days_remaining > 30 | Green (#10B981) | "ON TRACK" |

**Calculation Formula:**
```
days_remaining = (target_date - CURRENT_DATE)

IF days_remaining < 0 THEN
  criticality = 'RED'
  status = 'OVERDUE'
ELSIF days_remaining <= 7 THEN
  criticality = 'RED'
  status = 'URGENT'
ELSIF days_remaining <= 30 THEN
  criticality = 'AMBER'
  status = 'ATTENTION'
ELSE
  criticality = 'GREEN'
  status = 'ON_TRACK'
END IF
```

### A.10.3 Auto-Update Logic

**Daily Background Job:**
- Runs daily at 00:01 UTC
- Updates all compliance clock entries
- Recalculates days_remaining and criticality for all active entities
- Updates `last_updated` timestamp
- Triggers reminder generation for entities crossing thresholds

**Threshold Crossing Detection:**
- When entity moves from GREEN → AMBER: Generate "Attention Required" reminder
- When entity moves from AMBER → RED: Generate "Urgent Action Required" reminder
- When entity becomes OVERDUE: Generate "Overdue Alert" and trigger escalation workflow (if configured)

**Performance Considerations:**
- Background job processes in batches of 1000 entries
- Uses materialized view (`compliance_clock_dashboard`) for dashboard aggregation (v1.6 NOTE: Test with regular view first - materialized view may not be needed at V1 scale)
- Materialized view refreshed after daily update (if materialized view is used)

### A.10.4 Dashboard Aggregation

**Compliance Clock Dashboard View:**

The `compliance_clock_dashboard` materialized view provides aggregated metrics:

```sql
SELECT
  company_id,
  site_id,
  module_code,
  COUNT(*) FILTER (WHERE criticality = 'RED') AS red_count,
  COUNT(*) FILTER (WHERE criticality = 'AMBER') AS amber_count,
  COUNT(*) FILTER (WHERE criticality = 'GREEN') AS green_count,
  COUNT(*) FILTER (WHERE days_remaining < 0) AS overdue_count,
  COUNT(*) AS total_count
FROM compliance_clocks_universal
WHERE is_active = true
GROUP BY company_id, site_id, module_code
```

**Dashboard Display:**
- Top-level company dashboard: Aggregated counts across all sites and modules
- Site-level dashboard: Counts per site, all modules
- Module-level dashboard: Counts per module, all sites
- Entity-level drill-down: Click count to see detailed list of entities

**Dashboard Widgets:**
1. **Compliance Clock Summary Card:** Shows RED/AMBER/GREEN counts with trend indicators
2. **Overdue Items List:** Sortable list of overdue entities with days overdue
3. **Upcoming Deadlines:** Next 7 days of critical deadlines
4. **Criticality Chart:** Visual representation of compliance status across modules

### A.10.5 Reminder Generation Rules

**Automatic Reminders:**

| Days Before Target | Reminder Type | Recipients | Channels |
|-------------------|---------------|------------|----------|
| 30 days | Early Warning | Assigned user | Email + In-app |
| 14 days | Reminder | Assigned user + Site Manager | Email + In-app |
| 7 days | Urgent Reminder | Assigned user + Site Manager | Email + SMS + In-app |
| 1 day | Final Reminder | All above + Company Admin | Email + SMS + In-app |
| 0 days (overdue) | Overdue Alert | All above | Email + SMS + In-app (daily) |

**Reminder Configuration:**
- Companies can customize reminder intervals per entity type
- Default intervals: 30, 14, 7, 1 days before target
- Minimum interval: 1 day (cannot send more frequently)
- Reminders stored in `reminders` table linked to compliance clock entry

**Reminder Suppression:**
- If entity is marked complete, suppress all future reminders
- If entity is marked N/A with reason, suppress all future reminders
- If entity is in escalation workflow, reminders continue until resolved

### A.10.6 Integration with Escalation Workflows

The Compliance Clock drives escalation workflows (see Section B.10 for escalation logic):

**Escalation Triggers:**
- When entity becomes overdue (days_remaining < 0), check for escalation workflow match
- Match criteria: entity type, obligation category (if applicable), company
- If match found, initiate escalation workflow

**Escalation Status Tracking:**
- Compliance clock entry includes `escalation_workflow_id` (nullable)
- When escalation initiated, link clock entry to escalation record
- Escalation status displayed on dashboard: "In Escalation - Level 2"
- Clock entry remains active until entity completed or escalation resolved

### A.10.7 Module-Specific Business Rules

**Module 1 (Environmental Permits):**
- Obligation deadlines tracked via `OBLIGATION` entity type
- Improvement condition deadlines tracked separately with higher priority
- Permit renewal deadlines tracked via `DEADLINE` entity type
- Evidence submission deadlines tracked per obligation

**Module 2 (Trade Effluent):**
- Sampling deadlines tracked via `PARAMETER` entity type
- Lab result due dates tracked via `DEADLINE` entity type
- Consent expiry tracked via `CONSENT` entity type
- Monthly statement deadlines tracked via `DEADLINE` entity type

**Module 3 (MCPD/Generators):**
- Stack test deadlines tracked via `GENERATOR` entity type
- Runtime cap limits tracked via `GENERATOR` entity type (threshold-based, not date-based)
- Certification expiry tracked via `GENERATOR` entity type
- AER submission deadlines tracked via `DEADLINE` entity type

**Module 4 (Hazardous Waste):**
- Carrier licence expiry tracked via `CONTRACTOR_LICENCE` entity type
- Storage duration limits tracked via `WASTE_STREAM` entity type
- Consignment note submission deadlines tracked via `DEADLINE` entity type
- End-point proof deadlines tracked via `WASTE_STREAM` entity type

### A.10.8 User Actions and Permissions

**User Actions:**
- View compliance clock dashboard (all users with site access)
- Drill down into entity details (all users)
- Mark entity as complete (Staff, Admin, Owner only)
- Mark entity as N/A with reason (Admin, Owner only)
- Extend deadline (Admin, Owner only - logs extension reason)
- Snooze reminder (all users - one-time 7-day snooze max)

**Permissions:**
- Compliance clock respects RLS (Row Level Security)
- Users only see clock entries for sites/entities they have access to
- Consultants see aggregated view across all assigned clients
- Admins/Owners see all entries for their company

### A.10.9 Audit Trail

**All Clock-Related Actions Logged:**
- Criticality changes: From GREEN → AMBER, AMBER → RED, etc.
- Deadline extensions: Who, when, new date, reason
- Entity completion: Who, when, evidence linked
- Entity marked N/A: Who, when, reason
- Reminder sent: When, to whom, channel
- Escalation triggered: When, level, workflow ID

**Log Structure:**
```json
{
  "action_type": "CRITICALITY_CHANGED",
  "entity_type": "OBLIGATION",
  "entity_id": "uuid",
  "previous_criticality": "AMBER",
  "new_criticality": "RED",
  "previous_days_remaining": 8,
  "new_days_remaining": 7,
  "changed_at": "2025-12-01T00:01:00Z",
  "changed_by": "SYSTEM"
}
```

---

# B. MODULE-AGNOSTIC LOGIC RULES (80% Shared Engine)

## B.1 Document Ingestion Pipeline

**Note:** Document ingestion supports two methods:
1. **PDF Upload:** Upload PDF permit → AI extraction → obligations created
2. **Excel Import:** Upload Excel/CSV file → validation → preview → bulk obligation creation

### B.1.1 Document Upload Validation

**Valid Zero-Obligation Document Types:**
Some document types may legitimately have zero obligations. These are exceptions to the standard requirement that all documents must have at least one obligation.

**Valid Zero-Obligation Document Types:**
- **General Binding Rules (GBR) Notices:** Informational notices that do not create new obligations
- **Registration Confirmations:** Simple confirmation documents (e.g., "Your registration has been received")
- **Amendment Notices (No New Obligations):** Amendment documents that only modify existing obligations without creating new ones
- **Acknowledgement Letters:** Simple acknowledgements from regulators
- **Fee Payment Receipts:** Payment confirmations without compliance obligations

**Validation Rules:**
- **If** document type is in valid zero-obligation list AND extraction returns 0 obligations, **then**:
  - Document can be marked as complete with 0 obligations
  - System logs: "Zero obligations validated - document type: [type]"
  - Document status set to `ACTIVE` with `obligation_count = 0`
- **If** document type is NOT in valid zero-obligation list AND extraction returns 0 obligations, **then**:
  - System requires user to either:
    - Retry extraction with alternative prompt
    - Flag for manual review
    - Enter Manual Mode and create at least one obligation manually
  - Document cannot be activated until obligations exist

**Document Type Detection:**
- System uses LLM to detect document type during initial classification
- If document matches zero-obligation type patterns, system flags as potential zero-obligation document
- User can override classification if incorrect

### B.1.1.1 Excel Import Alternative

**Purpose:** Allow users with existing Excel spreadsheets to import permit/obligation data directly without PDF upload and AI extraction.

**Supported Formats:**
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma-separated values)

**File Limits:**
- Maximum file size: 10MB
- Maximum rows: 10,000 rows per file

**Required Columns:**
- `permit_number` (or `permit_id`) - Required: Permit reference number
- `obligation_title` - Required: Title/name of obligation
- `obligation_description` - Required: Description of obligation
- `frequency` - Required: Frequency value (DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME)
- `deadline_date` (or `next_deadline`) - Required: Next deadline date
- `site_id` (or `site_name`) - Required: Site identifier or name

**Optional Columns:**
- `permit_type` - Permit type (ENVIRONMENTAL_PERMIT, TRADE_EFFLUENT_CONSENT, MCPD_REGISTRATION)
- `permit_date` - Permit issue date
- `regulator` - Regulator code (EA, SEPA, NRW, NIEA)
- `evidence_linked` - Boolean indicating if evidence is already linked
- `notes` - Additional notes
- `category` - Obligation category (MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE)

**Column Mapping:**
- System auto-detects column mapping using fuzzy matching
- User can manually map columns if auto-detection fails
- Column names are case-insensitive
- Supports variations: `permit_number`, `Permit Number`, `PERMIT_NUMBER`, `permitNumber`

**Validation Rules:**
- Date format: Accepts multiple formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Frequency validation: Must be one of: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
- Site reference: If `deadline_date` is in the past, still valid (historical data)
- Site validation: `site_id` must exist OR `site_name` will be matched/created (if import option enabled)
- Permit validation: `permit_number` must be unique per site, or will create new permit (if import option enabled)

**Duplicate Detection:**
- Check for duplicate obligations: same `permit_number` + `obligation_title` + `site_id`
- If duplicate found: Skip row (if `skip_duplicates` option enabled) OR create duplicate with warning

**Import Process:**
1. User uploads Excel file via API endpoint
2. Background job validates file format and structure
3. Background job parses Excel file, extracts rows
4. Background job validates each row (required fields, date formats, frequencies)
5. Background job creates preview (valid rows, errors, warnings)
6. User reviews preview, edits errors if needed
7. User confirms import
8. Background job creates obligations in bulk
9. Background job links obligations to permits/sites
10. User receives completion notification

**Import Source Tracking:**
- Obligations created from Excel import marked with `import_source: 'EXCEL_IMPORT'`
- Documents created from Excel import marked with `import_source: 'EXCEL_IMPORT'`
- Distinguishes from PDF extraction (`import_source: 'PDF_EXTRACTION'`) and manual entry (`import_source: 'MANUAL'`)

**Error Handling:**
- Invalid rows: Skipped, errors logged with row number and reason
- Missing required fields: Row skipped, error reported
- Invalid date formats: Attempted parsing, error if unparseable
- Invalid frequency values: Error reported, valid values suggested
- File format errors: Job fails immediately, user notified

**Reference:** Master Build Order Section 2.3 (Excel Import Processing Job), Section 2.5 (Excel Import Endpoints)

### B.1.2 Upload Flow

**Step 1: File Upload**
- Accepted formats: PDF only (native + scanned)
- Maximum file size: 50MB
- **Maximum page count:** 200 pages (hard limit)
  - **If** document exceeds 200 pages, **then**:
    - Display error: "Document exceeds 200 page limit. Please split into multiple documents or contact support."
    - Block upload
- **Maximum images per page:** 10 images per page
  - **If** page contains >10 images, **then**:
    - Display warning: "Page [N] contains [X] images. Processing may be slower."
    - Allow upload but flag for performance monitoring
- **Acceptable resolution:** 
  - Minimum: 150 DPI (for OCR)
  - Recommended: 300 DPI
  - Maximum: 600 DPI (files >600 DPI automatically downsampled to 300 DPI to reduce file size)
  - **If** resolution <150 DPI, **then**:
    - Display warning: "Document resolution is low. OCR quality may be reduced."
    - Allow upload but flag for quality review
- Naming convention: System assigns UUID; original filename preserved in metadata

**Step 2: Format Detection**
- System detects: Native PDF vs. Scanned PDF
- Native PDF: Direct text extraction
- Scanned PDF: OCR processing via Tesseract/equivalent

**Step 3: OCR Processing (if required)**
- OCR quality check: If confidence <80%, flag document for manual review
- OCR output stored separately for debugging
- Processing time limit: 60 seconds (timeout triggers manual review flag)

**Step 4: Text Extraction**
- Full document text extracted
- Page numbers preserved
- Headers/footers identified and tagged

**Step 5: Normalisation**
- Character encoding standardised (UTF-8)
- Whitespace normalised
- Common OCR errors corrected (e.g., "1" vs "l", "0" vs "O")

### B.1.2 Document Segmentation

**Segment Types:**
- Header/title
- Table of contents (if present)
- Condition sections
- Schedules/appendices
- Signature blocks

**Segmentation Rules:**
1. Identify section headers by pattern (numbered, capitalised, etc.)
2. Create segment boundaries at section headers
3. Tag each segment with type
4. Preserve page references for each segment

### B.1.3 Module Routing

After segmentation, system determines document type and routes to appropriate module.

**Routing Logic (Dynamic):**
Module routing is determined by querying the `modules` table based on `document_type`. Each module defines which document types it handles in `modules.document_types` JSONB field.

1. System identifies `document_type` from document content (keywords, structure, etc.)
2. System queries `modules` table: `SELECT * FROM modules WHERE document_types @> '["<document_type>"]'::JSONB AND is_active = true`
3. If exactly one module matches, route document to that module and set `documents.module_id`
4. If multiple modules match, flag for user selection
5. If no module matches, flag for manual review or create new module registration

**Current Module-Document Type Mapping (stored in `modules` table):**
| Document Type | Module | Routing Trigger |
|---------------|--------|-----------------|
| Environmental Permit | Module 1 | Keywords: "Environmental Permit", "Part A", "Part B", "Waste Management Licence" |
| Trade Effluent Consent | Module 2 | Keywords: "Trade Effluent", "Consent", "Discharge" + water company reference |
| MCPD Registration | Module 3 | Keywords: "MCPD", "Medium Combustion Plant", "Generator", "MCP Regulations" |

**Ambiguous Documents:**
- If multiple module keywords detected, flag for user selection
- User must confirm document type before extraction proceeds
- System validates selected document type against `modules.document_types` before routing

**Benefits:**
- New modules can add new document types without code changes (just update `modules.document_types` JSONB)
- Module routing is data-driven (stored in `modules` table)
- Multiple modules can handle the same document type (if needed)

### B.1.4 AI Model Selection and Routing

**Model Selection Logic:**
The system uses a multi-model approach for extraction, with automatic routing based on document characteristics.

**Primary Model (GPT-4o):**
- **Use Cases:** All standard document extraction tasks
- **Trigger:** Document size ≤49 pages, standard document types
- **Model Identifier:** `gpt-4o`
- **Timeout:** 30 seconds (standard), 5 minutes (large documents)

**Secondary Model (GPT-4o-mini):**
- **Use Cases:** Simple documents, low-priority extractions, retry attempts
- **Trigger:** Document size < 20 pages, simple document structure, cost optimization needed
- **Model Identifier:** `gpt-4o-mini`
- **Timeout:** 30 seconds

**Model Selection Decision Tree:**
1. **If** document size ≥ 50 pages, **then** use GPT-4o (primary)
2. **If** document size < 20 pages AND simple structure, **then** use GPT-4o-mini (secondary)
3. **If** document size 20-49 pages, **then** use GPT-4o (primary)
4. **If** primary model fails (timeout/error), **then** retry with GPT-4o-mini
5. **If** both models fail, **then** flag for manual review

**Model Metadata Persistence:**
- `extraction_logs.model_identifier`: Stores which model was used
- `extraction_logs.primary_model_attempted`: Boolean flag
- `extraction_logs.fallback_model_used`: Boolean flag (if secondary model used after primary failure)
- All model selections logged in audit trail

**Workflow Integration:**
- Model selection happens automatically during document ingestion (Step 4: Text Extraction)
- Model identifier is stored before extraction begins
- If model fails, system automatically selects fallback model
- User is not involved in model selection (automatic optimization)

---

## B.2 Obligation Extraction Logic

### B.2.1 Extraction Pipeline

```
Document Text
  └─→ Rule Library Lookup (pattern matching)
        └─→ LLM Extraction (for non-matched sections)
              └─→ Confidence Scoring
                    └─→ Human Review Flagging
                          └─→ Structured Obligation Records
```

### B.2.2 Rule Library Lookup

**Purpose:** Match document sections against known patterns before invoking LLM.

**Process:**
1. For each document segment, check against rule library
2. If pattern match score ≥90%, use library-defined extraction
3. If pattern match score <90%, pass to LLM extraction
4. Library matches are "pre-validated" (higher confidence baseline)

**Rule Library Structure:**
```json
{
  "pattern_id": "EA_STANDARD_CONDITION_2.1",
  "pattern_regex": "operate in accordance with.*management system",
  "module": "1",
  "obligation_category": "Operational",
  "default_frequency": "Continuous",
  "evidence_types": ["Management System Documentation", "Audit Reports"],
  "is_subjective": false
}
```

### B.2.3 LLM Extraction

**Invoked When:** No rule library match OR match confidence <90%

**Input to LLM:**
- Document segment text
- Document type (permit/consent/registration)
- Module context (Module 1/2/3)
- Extraction schema (required fields)

**LLM Output Schema:**
```json
{
  "obligations": [
    {
      "text": "Original obligation text",
      "summary": "Plain English summary (<50 words)",
      "category": "Monitoring|Reporting|Record-Keeping|Operational|Maintenance",
      "frequency": "Daily|Weekly|Monthly|Quarterly|Annual|One-time|Continuous",
      "deadline_date": "YYYY-MM-DD or null",
      "deadline_relative": "e.g., 'within 14 days of incident'",
      "is_subjective": true|false,
      "subjective_phrases": ["phrase1", "phrase2"],
      "confidence_score": 0.00-1.00,
      "evidence_suggestions": ["type1", "type2"],
      "page_reference": 1-N,
      "condition_reference": "e.g., Condition 2.3.1"
    }
  ]
}
```

### B.2.4 Extraction Validation Rules

After LLM extraction, apply validation:

1. **Required Fields Check:**
   - `text`: Must be non-empty
   - `category`: Must be valid enum value
   - `frequency`: Must be valid enum value OR null (flagged for review)
   - `confidence_score`: Must be 0.00–1.00

2. **Logical Consistency Check:**
   - If `is_subjective = true`, `subjective_phrases` must be non-empty
   - If `frequency = One-time`, `deadline_date` or `deadline_relative` must be present
   - `page_reference` must be ≤ document page count

3. **Deduplication Check:**
   - Compare against existing obligations for this document
   - If >80% text similarity with existing obligation, flag as potential duplicate

### B.2.5 Extraction Error Handling

| Error Type | Handling |
|------------|----------|
| LLM timeout (>30s) | Retry twice (3 total attempts); if all fail, flag entire segment for manual review |
| Invalid JSON response | Retry with simplified prompt; if fails, flag for manual |
| Empty extraction | Flag segment; may indicate non-obligation content |
| Confidence all <50% | Flag document quality issue; prompt user to verify scan quality |

---

## B.3 Deadline Calculation Rules

### B.3.0 Deadline Calculation Edge Cases

**Past Base Date:**
- If `base_date` is in the past:
  - Calculate `next_due_date` from today (not base_date)
  - Log warning: "Base date is in the past. Calculating from today."
  - Update `base_date` to today (preserve original in metadata)

**Event-Triggered Frequency:**
- If frequency is "EVENT_TRIGGERED":
  - `next_due_date` = NULL until event occurs
  - User must manually trigger deadline creation
  - System does not auto-generate deadlines
  - Event trigger stored in `obligations.metadata.event_trigger`

**Year Boundary:**
- If business days calculation crosses year boundary:
  - Use business days library that handles holidays across years
  - Account for UK bank holidays in both years
  - Calculate correctly across year boundary

**Grace Period:**
- If grace period pushes deadline into next compliance period:
  - Deadline remains in original compliance period
  - But `due_date` is adjusted by `grace_period_days`
  - Compliance period does not change
  - Example: Deadline due 2024-12-31, grace period 5 days → due_date = 2025-01-05, but compliance_period = "2024"

### B.3.1 Deadline Types

| Type | Calculation Method |
|------|-------------------|
| **Fixed Date** | Explicit date in document (e.g., "by 31 December 2025") |
| **Relative to Event** | Calculated from trigger event (e.g., "within 14 days of incident") |
| **Recurring** | Calculated from permit start date + frequency |
| **Rolling** | Calculated from last completion date + frequency |

### B.3.2 Recurring Deadline Calculation

**Base Date Determination:**
1. If document specifies start date: Use document start date
2. If no start date specified: Use document upload date
3. User can override base date during document setup

**Frequency Calculations:**

| Frequency | Calculation |
|-----------|-------------|
| Daily | Base date + N days |
| Weekly | Base date + (N × 7) days |
| Monthly | Base date + N months (same day, or last day of month if original day doesn't exist) |
| Quarterly | Base date + (N × 3) months |
| Annual | Base date + N years |

**Example:**
- Permit start date: 15 March 2024
- Frequency: Monthly
- Deadlines: 15 Apr, 15 May, 15 Jun, etc.

### B.3.3 Rolling Deadline Calculation

For rolling deadlines (next due date based on last completion):

1. System records last completion date
2. Next deadline = Last completion + Frequency interval
3. If no completion recorded, calculate from base date

**Grace Period:** Configurable per company (default: 0 days)

### B.3.4 Business Day Handling

- All deadlines fall on calendar days by default
- If deadline falls on weekend/UK bank holiday AND `adjust_for_business_days = true`:
  - Move deadline to previous working day
- User can configure per-site: "Adjust deadlines to business days"

> **⚠️ IMPLEMENTATION STATUS (2025-02-01):**
> - **Current Implementation:** Simplified business day handling in `lib/utils/schedule-calculator.ts` - only handles weekends, does not account for UK bank holidays.
> - **Missing Features:**
>   - ❌ UK bank holidays library integration
>   - ❌ Year boundary handling for holidays across years
> - **Action Required:** Integrate proper UK bank holidays library (e.g., `date-holidays` or similar) for accurate business day calculations.

---

## B.4 Evidence Linking Logic

### B.4.1 Evidence-Obligation Linking

**Linking Methods:**
1. **Manual Link:** User selects evidence, chooses obligation(s) to link
2. **Suggested Link:** System suggests obligations based on evidence metadata
3. **Auto-Link:** For certain evidence types, system auto-links (user can unlink)

**Auto-Link Rules:**
- Evidence filename contains obligation reference (e.g., "Condition_2.3_photo.jpg") → Auto-link to Condition 2.3
- Evidence uploaded from obligation detail page → Auto-link to that obligation

### B.4.1.1 Evidence Enforcement Rule

**Rule:** All evidence objects must have at least one valid obligation link within 7 days of upload.

**Enforcement Logic:**

1. **On Upload:** Evidence can be uploaded without immediate link (allows batch uploads)
2. **Grace Period:** 7 days from `evidence.created_at` to establish link
3. **After 7 Days:** System enforces linking requirement:
   - **If** evidence has no obligation links after 7 days, **then**:
     - Set `evidence.enforcement_status = 'UNLINKED_WARNING'`
     - Display warning in "Unlinked Evidence" widget
     - Send notification to evidence uploader: "Evidence [filename] requires obligation link"
   - **If** evidence still unlinked after 14 days, **then**:
     - Set `evidence.enforcement_status = 'UNLINKED_CRITICAL'`
     - Send escalation notification to Admin/Owner
     - Evidence appears in "Action Required" queue
   - **If** evidence still unlinked after 30 days, **then**:
     - Set `evidence.enforcement_status = 'UNLINKED_ARCHIVED'`
     - Evidence is archived (not deleted, but hidden from active views)
     - Requires Admin/Owner action to restore and link

**Exceptions:**
- **Temporary Evidence:** Evidence marked as `is_temporary = true` (e.g., draft photos) exempt from enforcement
- **Archived Evidence:** Evidence marked as `is_archived = true` exempt from enforcement
- **Manual Override:** Admin/Owner can mark evidence as `enforcement_exempt = true` with reason (audit trail required)

**Manual Mode Evidence Upload:**
- **Rule:** Even in Manual Mode, evidence upload requires at least one obligation to exist (either extracted or manually created)
- **Workflow:** If user attempts to upload evidence in Manual Mode before creating obligations:
  1. System displays: "Please create at least one obligation before uploading evidence. Evidence must be linked to an obligation."
  2. System offers: "Create Obligation First" button (navigates to manual obligation creation)
  3. **If** user creates obligation, **then** evidence upload proceeds normally
  4. **If** user cancels, **then** evidence upload is blocked
- **Enforcement:** Same 7-day grace period applies to Manual Mode evidence uploads

**Evidence Linking Enforcement Level:**
- **Default Rule:** All evidence must have at least one obligation link within 7 days (grace period)
- **Hard Enforcement:** After 7 days, evidence without links cannot be used for compliance verification
- **Exception:** Evidence marked as `is_temporary = true` or `enforcement_exempt = true` (requires justification and audit trail)
- **Justification Requirement:** If Admin/Owner marks evidence as `enforcement_exempt = true`, they must provide:
  - Reason for exemption (e.g., "Draft document for internal review only")
  - Audit trail entry with timestamp and user ID
  - Evidence remains in system but excluded from compliance calculations

**Validation:**
- System validates obligation link exists and is valid (obligation not deleted, same company/site)
- Cross-site linking allowed only if both evidence and obligation linked to same multi-site shared permit

**Chain-of-Custody Logging:**
- All evidence actions logged immutably in `audit_logs` table:
  - **Upload:** `action_type = 'EVIDENCE_UPLOADED'`, logs `uploaded_by`, `uploaded_at`, `file_hash`, `storage_path`
  - **Link Creation:** `action_type = 'EVIDENCE_LINKED'`, logs `linked_by`, `linked_at`, `obligation_id`, `evidence_id`
  - **Link Deletion:** `action_type = 'EVIDENCE_UNLINKED'`, logs `unlinked_by`, `unlinked_at`, `reason`
  - **Access:** `action_type = 'EVIDENCE_ACCESSED'`, logs `accessed_by`, `accessed_at`, `ip_address`
  - **Download:** `action_type = 'EVIDENCE_DOWNLOADED'`, logs `downloaded_by`, `downloaded_at`, `ip_address`
  - **Modification Attempt:** `action_type = 'EVIDENCE_MODIFICATION_ATTEMPTED'`, logs `attempted_by`, `attempted_at`, `blocked_reason`
- **Immutable Fields:** `file_hash`, `uploaded_by`, `uploaded_at` cannot be modified after creation
- **Chain-of-Custody Query:** System can generate complete chain-of-custody report showing all evidence actions in chronological order

**Audit Trail:**
- All enforcement actions logged in `evidence_audit_log`:
  - `enforcement_status` changes
  - Link creation/deletion
  - Override actions (who, when, why)

### B.4.2 Evidence Linking Validation

Before link is saved:
1. Evidence must exist in system
2. Obligation must exist and not be archived
3. Evidence upload date must be ≤ current date
4. Evidence cannot be linked to obligations on different documents from different sites (cross-site linking prohibited)

### B.4.2.1 Evidence Approval Requirements

**Purpose:** Ensure all evidence items are reviewed and approved before use in pack generation.

**Approval Fields (Required for All Evidence Items):**
- `reviewer_id` (UUID, REFERENCES users(id)) - User who reviewed/approved the evidence (REQUIRED)
- `is_approved` (BOOLEAN, NOT NULL, DEFAULT false) - Approval status flag (REQUIRED)
- `approved_at` (TIMESTAMP WITH TIME ZONE) - Timestamp when evidence was approved (REQUIRED if `is_approved = true`)

**Approval Workflow:**
1. **Evidence Upload:** Evidence is uploaded with `is_approved = false`, `reviewer_id = NULL`, `approved_at = NULL`
2. **Review Required:** Evidence cannot be used in pack generation until approved
3. **Approval Process:**
   - Manager/Admin/Owner reviews evidence item
   - Sets `is_approved = true`
   - Sets `reviewer_id = current_user_id`
   - Sets `approved_at = NOW()`
   - System logs approval action in audit trail
4. **Rejection Process:**
   - If evidence is rejected, `is_approved` remains `false`
   - Rejection reason can be stored in `metadata.rejection_reason`
   - Rejected evidence cannot be used in pack generation

**Pack Generation Blocking Rule:**
- **ALL evidence items** included in a pack MUST have:
  - `is_approved = true`
  - `reviewer_id IS NOT NULL`
  - `approved_at IS NOT NULL`
- **If ANY evidence item lacks approval**, pack generation MUST be blocked with error:
  - "Cannot generate pack: Evidence item [file_name] (ID: [evidence_id]) has not been approved. Please approve all evidence items before generating pack."
- **Validation Check:** System validates all evidence items linked to obligations in the pack date range before generation proceeds

### B.4.3 Evidence Unlinking

- Users with edit permissions can unlink evidence
- Unlinking is logged: `unlinked_by`, `unlinked_at`, `reason` (optional)
- Evidence remains in system; only link is removed

---

## B.5 Evidence Completeness Logic

### B.5.0 End-of-Period Auto-Review for Dormant Obligations

**Purpose:** At the end of each compliance period, system automatically reviews obligations that had no activity to confirm "no breach occurred" (regulatory requirement).

**Review Trigger:**
- **Scheduled Job:** Runs at end of each compliance period (daily, weekly, monthly, quarterly, annual)
- **Review Scope:** Obligations with:
  - `status = PENDING` or `DUE_SOON`
  - No evidence linked for the completed period
  - Deadline has passed
  - No user activity in the period

**Review Process:**
1. **System:** Identifies dormant obligations at period end
   - Queries obligations where `compliance_period_end <= CURRENT_DATE`
   - Filters: `status IN ('PENDING', 'DUE_SOON')` AND `evidence_count = 0` for the period
2. **System:** Creates review record
   - Sets `obligation.review_status = 'PERIOD_END_REVIEW'`
   - Sets `obligation.period_end_review_date = CURRENT_DATE`
   - Logs: "Period ended with no evidence - requires confirmation"
3. **System:** Sends notification to assigned user
   - Message: "Period ended for obligation [text]. Please confirm: (a) No breach occurred, or (b) Evidence was missed"
   - Requires user response within 7 days
4. **User:** Responds to review
   - **Option A:** "No breach occurred" → Sets `obligation.status = 'NOT_APPLICABLE'` with reason
   - **Option B:** "Evidence was missed" → Sets `obligation.status = 'INCOMPLETE'`, triggers escalation
   - **Option C:** "Upload evidence retroactively" → Allows evidence upload with late flag
5. **System:** If no response after 7 days
   - Escalates to Site Manager
   - If no response after 14 days, escalates to Admin/Owner
   - Sets `obligation.status = 'REVIEW_OVERDUE'`

**Audit Trail:**
- All period-end reviews logged in `audit_logs`
- Review responses logged with timestamp and user
- "No breach" confirmations included in packs (all pack types)

### B.5.1 Completeness Definition

An obligation is "evidence complete" when:
- At least one evidence item is linked, AND
- Evidence item upload date is within current compliance period, AND
- Evidence has not been marked as rejected/invalid

### B.5.2 Compliance Period Definition

| Frequency | Compliance Period |
|-----------|------------------|
| Daily | Current day |
| Weekly | Current week (Mon-Sun) |
| Monthly | Current calendar month |
| Quarterly | Current quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec) |
| Annual | Current calendar year OR permit anniversary year (configurable) |
| One-time | From obligation creation to deadline date |

### B.5.3 Compliance Status Calculation

| Condition | Status |
|-----------|--------|
| Evidence linked within current period | ✅ Complete |
| No evidence, deadline is future | ⏳ Pending |
| No evidence, deadline within 7 days | ⚠️ Due Soon |
| No evidence, deadline passed | ❌ Overdue |
| Obligation marked N/A | ➖ Not Applicable |

### B.5.4 Compliance Score Calculation

**Purpose:** Calculate integer compliance score (0-100) at both Site and Module levels based on obligation completion and evidence status.

**Score Formula:**
```
compliance_score = (completed_and_evidenced_obligations / total_due_obligations) * 100
```

> **⚠️ IMPLEMENTATION STATUS (2025-02-01):**
> - **Current Implementation:** Simplified calculation exists in `lib/jobs/report-generation-job.ts` using `(completed / totalObligations) * 100 - overduePenalty`.
> - **Missing Features:**
>   - ❌ Evidence link validation (`obligation_evidence_links.unlinked_at IS NULL`)
>   - ❌ Compliance period matching for recurring obligations
>   - ❌ Module-level score calculation per spec (SQL query in spec not implemented)
>   - ❌ Site-level score calculation as average of module scores
>   - ❌ Compliance Clock integration penalties (RED: -10, AMBER: -5, GREEN: -2 points)
>   - ❌ Real-time updates on obligation/evidence changes
> - **Action Required:** Implement full compliance score calculation per specification including evidence validation, compliance period matching, and module/site-level calculations.

**Calculation Rules:**

1. **Obligation Inclusion:**
   - Include all obligations with `status IN ('PENDING', 'INCOMPLETE', 'COMPLETE')`
   - Exclude obligations with `status = 'NOT_APPLICABLE'` or `status = 'CANCELLED'`
   - Only count obligations that are currently due (deadline_date <= CURRENT_DATE or recurring obligations in current period)

2. **Completed and Evidenced Definition:**
   - Obligation must have `status = 'COMPLETE'`
   - Obligation must have at least one active evidence link (`obligation_evidence_links.unlinked_at IS NULL`)
   - Evidence link must be for current compliance period (if obligation is recurring)

3. **Module-Level Score Calculation:**
   ```sql
   -- Calculate module compliance score for a site
   WITH obligation_counts AS (
     SELECT 
       COUNT(*) FILTER (WHERE o.status = 'COMPLETE' 
                        AND EXISTS (
                          SELECT 1 FROM obligation_evidence_links oel
                          WHERE oel.obligation_id = o.id
                          AND oel.unlinked_at IS NULL
                          AND oel.compliance_period = CURRENT_COMPLIANCE_PERIOD
                        )) as completed_count,
       COUNT(*) FILTER (WHERE o.status IN ('PENDING', 'INCOMPLETE', 'COMPLETE')
                        AND o.status != 'NOT_APPLICABLE'
                        AND o.status != 'CANCELLED'
                        AND (o.deadline_date <= CURRENT_DATE OR o.frequency IS NOT NULL)) as total_due_count
     FROM obligations o
     WHERE o.site_id = :site_id
       AND o.module_id = :module_id
       AND o.deleted_at IS NULL
   )
   SELECT 
     CASE 
       WHEN total_due_count = 0 THEN 100
       ELSE ROUND((completed_count::DECIMAL / total_due_count) * 100)
     END as compliance_score
   FROM obligation_counts;
   ```

4. **Site-Level Score Calculation:**
   ```sql
   -- Calculate site compliance score (average of all active module scores)
   SELECT 
     CASE 
       WHEN COUNT(*) = 0 THEN 100
       ELSE ROUND(AVG(ma.compliance_score))
     END as site_compliance_score
   FROM module_activations ma
   WHERE ma.site_id = :site_id
     AND ma.status = 'ACTIVE'
     AND ma.compliance_score IS NOT NULL;
   ```

5. **Overdue Penalty:**
   - Overdue obligations (deadline_date < CURRENT_DATE AND status != 'COMPLETE') reduce score
   - Each overdue obligation reduces score by: `(1 / total_due_obligations) * 100`
   - Example: If 10 obligations due and 2 are overdue, score reduced by 20 points

6. **Real-Time Updates:**
   - Score recalculated when:
     - Obligation status changes to 'COMPLETE'
     - Evidence is linked/unlinked to obligation
     - Obligation deadline passes (becomes overdue)
     - New obligation is created
     - Obligation is marked NOT_APPLICABLE or CANCELLED
   - Update triggers:
     - `UPDATE module_activations SET compliance_score = :new_score, compliance_score_updated_at = NOW() WHERE site_id = :site_id AND module_id = :module_id`
     - `UPDATE sites SET compliance_score = :new_score, compliance_score_updated_at = NOW() WHERE id = :site_id`

7. **Compliance Clock Integration:**
   - When compliance clock item becomes overdue (status = 'OVERDUE'):
     - Module score reduced immediately
     - Site score recalculated
   - When compliance clock item is completed:
     - Module score increased (debounced calculation)
     - Site score recalculated (debounced calculation)
   - Clock criticality affects score impact:
     - RED criticality: -10 points per overdue item
     - AMBER criticality: -5 points per overdue item
     - GREEN criticality: -2 points per overdue item

8. **Score Boundaries:**
   - Minimum score: 0 (all obligations overdue and incomplete)
   - Maximum score: 100 (all obligations complete and evidenced)
   - Score is always integer (0-100)

9. **Initial Score:**
   - New sites/modules start with `compliance_score = 100` (no obligations yet)
   - Score decreases as obligations are created and not completed

10. **Score Display:**
    - Color coding:
      - 90-100: Green (✅ Compliant)
      - 70-89: Amber (⚠️ Needs Attention)
      - 0-69: Red (❌ Non-Compliant)

---

## B.6 Escalation and Alerting Logic

### B.6.0 Sustained Evidence Failure Escalation

**Purpose:** Escalate obligations with repeated or sustained evidence failures (not just one-off overdue items).

**Sustained Failure Definition:**
- **Repeated Failures:** Same obligation fails evidence requirement in 2+ consecutive compliance periods
- **Sustained Gap:** Obligation has no evidence for 3+ months continuously
- **Pattern Detection:** System detects pattern of missing evidence across multiple periods

**Escalation Logic:**
1. **Detection:**
   - System monitors obligations with `status = INCOMPLETE` for 2+ consecutive periods
   - System tracks: `consecutive_failure_count`, `months_without_evidence`
   - System flags: `sustained_failure = true` if threshold exceeded

2. **Escalation Levels:**
   - **Level 1 (2 consecutive failures):**
     - Notification to assigned user: "Obligation [text] has missed evidence for 2 consecutive periods"
     - Sets `escalation_level = 1`
   - **Level 2 (3 consecutive failures):**
     - Notification to Site Manager: "Obligation [text] has missed evidence for 3 consecutive periods - requires attention"
     - Sets `escalation_level = 2`
     - Creates Escalation record
   - **Level 3 (4+ consecutive failures OR 3+ months without evidence):**
     - Notification to Admin/Owner: "CRITICAL: Obligation [text] has sustained evidence failures - regulatory risk"
     - Sets `escalation_level = 3`
     - Creates high-priority Escalation record
     - Flags in "Critical Compliance Issues" dashboard widget

3. **Resolution Tracking:**
   - **If** evidence uploaded after escalation, **then**:
     - Reset `consecutive_failure_count = 0`
     - Set `sustained_failure = false`
     - Log resolution in Escalation record
   - **If** evidence not uploaded after Level 3 escalation, **then**:
     - System creates "Compliance Risk Report" for Owner
     - Report includes: obligation details, failure history, regulatory risk assessment

4. **Audit Trail:**
   - All sustained failure escalations logged in `escalations` table
   - Failure pattern stored in `obligation.metadata.sustained_failure_history`
   - Resolution actions logged with timestamp and user

### B.6.1 Escalation and Alerting Logic (Standard)

### B.6.1 Alert Triggers

| Trigger | Alert Timing | Recipients |
|---------|--------------|------------|
| Deadline approaching | 7 days, 3 days, 1 day before | Assigned user + Site Manager |
| Deadline missed | Day of + daily until resolved | Assigned user + Site Manager + Escalation contact |
| Limit threshold (Module 2/3) | At 80% of limit | Site Manager |
| Limit breach (Module 2/3) | At 100% of limit | Site Manager + Escalation contact + Admin |
| Document expiring | 90 days, 30 days, 7 days before | Admin + Site Manager |

### B.6.2 Escalation Chain Logic

**Default Chain:**
1. **Day 0 (deadline day):** Alert to assigned user
2. **Day +1:** Escalate to Site Manager
3. **Day +3:** Escalate to Company Admin
4. **Day +7:** Final escalation + prominent dashboard warning

**Custom Chains:**
- Companies can define custom escalation chains
- Minimum: 2 escalation levels
- Maximum: 5 escalation levels

### B.6.3 Alert Delivery

**Channels:**
- **Email:** All alerts
- **SMS:** Critical alerts only (deadline day, breaches)
- **In-app:** All alerts (notification bell + dashboard widget)

**Alert Consolidation:**
- Multiple due items for same user on same day → Single consolidated email
- Never more than 3 emails per user per day (consolidated)

---

## B.6.4 Configurable Escalation Workflows

### B.6.4.1 Purpose and Design Philosophy

**Traditional Problem:**
Hard-coded escalation logic (Day 0 → User, Day +1 → Manager, Day +3 → Admin, Day +7 → Final) doesn't fit all companies. Different organizations have different escalation requirements based on:
- Company size and structure
- Obligation type and risk level
- Regulatory requirements
- Internal policies

**Solution:**
Company-specific escalation workflows stored in `escalation_workflows` table, replacing hard-coded logic with configurable rules.

> **⚠️ IMPLEMENTATION STATUS (2025-02-01):**
> - **Current Implementation:** Uses hardcoded role-based escalation in `lib/services/escalation-service.ts` (Level 1 = ADMIN/OWNER, Level 2 = ADMIN/OWNER, Level 3 = OWNER) with time-based escalation (24 hours, 48 hours).
> - **Specification Requirements:** Configurable escalation workflows using `escalation_workflows` table with days-overdue-based matching, configurable recipients per level, and obligation category filtering.
> - **Missing Features:**
>   - ❌ Escalation workflow matching logic (days_overdue + obligation_category)
>   - ❌ Configurable recipients per level (using `escalation_workflows.level_N_recipients`)
>   - ❌ Days-overdue-based escalation (currently time-based)
>   - ❌ Escalation record tracking using `escalations` table
> - **Action Required:** Update `lib/services/escalation-service.ts` and `lib/jobs/escalation-check-job.ts` to implement configurable escalation workflows per this specification.

### B.6.4.2 Escalation Workflow Structure

**Workflow Configuration:**

| Field | Description | Example |
|-------|-------------|---------|
| `workflow_name` | Descriptive name | "Critical Obligations - Fast Track" |
| `obligation_category` | Filter by category (nullable) | "MONITORING" or NULL (all categories) |
| `enabled` | Active/inactive toggle | true |
| `level_1_threshold_days` | Days overdue to trigger Level 1 | 1 |
| `level_2_threshold_days` | Days overdue to trigger Level 2 | 3 |
| `level_3_threshold_days` | Days overdue to trigger Level 3 | 7 |
| `level_4_threshold_days` | Days overdue to trigger Level 4 | 14 |
| `level_1_recipients` | User IDs to notify | `["uuid1", "uuid2"]` |
| `level_2_recipients` | User IDs to notify | `["uuid3", "uuid4"]` |
| `level_3_recipients` | User IDs to notify | `["uuid5", "uuid6"]` |
| `level_4_recipients` | User IDs to notify | `["uuid7", "uuid8"]` |

**Example Workflow:**
```json
{
  "workflow_name": "Standard Environmental Permits",
  "company_id": "uuid",
  "obligation_category": null,
  "enabled": true,
  "level_1_threshold_days": 1,
  "level_1_recipients": ["assigned_user_id"],
  "level_2_threshold_days": 3,
  "level_2_recipients": ["site_manager_id"],
  "level_3_threshold_days": 7,
  "level_3_recipients": ["company_admin_id", "compliance_manager_id"],
  "level_4_threshold_days": 14,
  "level_4_recipients": ["owner_id", "all_admins"]
}
```

### B.6.4.3 Escalation Matching Logic

**Daily Background Job (00:01 UTC):**
1. Query all overdue obligations/deadlines (from `compliance_clocks_universal` where `days_remaining < 0`)
2. For each overdue entity:
   - Calculate `days_overdue = ABS(days_remaining)`
   - Match to escalation workflow:
     - **Priority 1:** Match by `obligation_category` (if entity has category AND workflow has category filter)
     - **Priority 2:** Match by company (if no category-specific workflow found, use company default workflow with `obligation_category = NULL`)
   - If no workflow match found, use system default workflow (see B.6.2 Default Chain)

3. Determine escalation level based on `days_overdue`:
   - IF `days_overdue >= level_4_threshold_days` THEN escalation_level = 4
   - ELSIF `days_overdue >= level_3_threshold_days` THEN escalation_level = 3
   - ELSIF `days_overdue >= level_2_threshold_days` THEN escalation_level = 2
   - ELSIF `days_overdue >= level_1_threshold_days` THEN escalation_level = 1
   - ELSE no escalation (not yet reached threshold)

4. Check current escalation status:
   - Query `escalation_records` table for active escalation on this entity
   - IF no active escalation AND escalation_level >= 1, THEN create new escalation record
   - IF active escalation AND current_level < escalation_level, THEN escalate to next level (cannot skip levels)
   - IF active escalation AND current_level = escalation_level, THEN no action (already at this level)

### B.6.4.4 Level Progression Rules

**Sequential Level Requirement:**
- Escalations MUST progress sequentially: Level 1 → 2 → 3 → 4
- Cannot skip levels (e.g., cannot go from Level 1 directly to Level 3)
- Each level must be active for at least the threshold duration before advancing

**Level Advancement Logic:**
```
IF entity is overdue for 1 day:
  - Escalate to Level 1
  - Notify level_1_recipients

IF entity remains overdue for 3 days (total):
  - Advance from Level 1 → Level 2
  - Notify level_2_recipients
  - Keep level_1_recipients in CC

IF entity remains overdue for 7 days (total):
  - Advance from Level 2 → Level 3
  - Notify level_3_recipients
  - Keep level_1 and level_2 recipients in CC

IF entity remains overdue for 14 days (total):
  - Advance from Level 3 → Level 4 (final)
  - Notify level_4_recipients
  - Keep all previous recipients in CC
  - Create dashboard banner warning
```

### B.6.4.5 Notification Rules per Level

**Level 1 Notifications:**
- Primary recipients: `level_1_recipients` (typically assigned user)
- Channels: Email + In-app
- Frequency: Daily until resolved or escalated to Level 2
- Message: "Obligation [text] is 1 day overdue - please complete"

**Level 2 Notifications:**
- Primary recipients: `level_2_recipients` (typically site manager)
- CC recipients: `level_1_recipients`
- Channels: Email + SMS + In-app
- Frequency: Daily until resolved or escalated to Level 3
- Message: "ESCALATION LEVEL 2: Obligation [text] is 3 days overdue - immediate action required"

**Level 3 Notifications:**
- Primary recipients: `level_3_recipients` (typically admin/compliance manager)
- CC recipients: `level_1_recipients` + `level_2_recipients`
- Channels: Email + SMS + In-app + Dashboard banner
- Frequency: Daily until resolved or escalated to Level 4
- Message: "ESCALATION LEVEL 3: Obligation [text] is 7 days overdue - critical compliance risk"

**Level 4 Notifications (Final):**
- Primary recipients: `level_4_recipients` (typically owner + all admins)
- CC recipients: All previous level recipients
- Channels: Email + SMS + In-app + Dashboard banner (red alert)
- Frequency: Daily until resolved
- Message: "FINAL ESCALATION: Obligation [text] is 14 days overdue - URGENT regulatory risk - immediate resolution required"

### B.6.4.6 Escalation Record Structure

**Escalation Record Created When Level 1 Triggered:**
```json
{
  "escalation_id": "uuid",
  "entity_type": "OBLIGATION",
  "entity_id": "uuid",
  "workflow_id": "uuid",
  "current_level": 1,
  "initiated_at": "2025-12-01T00:01:00Z",
  "initiated_by": "SYSTEM",
  "level_1_triggered_at": "2025-12-01T00:01:00Z",
  "level_2_triggered_at": null,
  "level_3_triggered_at": null,
  "level_4_triggered_at": null,
  "resolved_at": null,
  "resolved_by": null,
  "resolution_notes": null,
  "status": "ACTIVE"
}
```

**Escalation Audit Trail:**
- Each level advancement creates audit log entry
- All notifications sent are logged with recipient, channel, timestamp
- Resolution actions logged with user, timestamp, resolution notes
- Full history accessible for compliance audits

### B.6.4.7 Resolution Logic

**Escalation Resolved When:**
1. Entity marked complete (evidence linked), OR
2. Entity marked N/A with reason (Admin/Owner only), OR
3. Deadline extended (Admin/Owner only - logs extension reason), OR
4. Entity no longer overdue (date changed, manually resolved)

**Resolution Actions:**
1. Set `resolved_at` timestamp
2. Set `resolved_by` user ID
3. Require `resolution_notes` (mandatory for audit trail)
4. Set `status = RESOLVED`
5. Stop all further notifications
6. Remove from escalation dashboard
7. Log resolution in audit trail

**Resolution Notification:**
- All recipients from all levels notified of resolution
- Message: "RESOLVED: Obligation [text] escalation resolved - evidence linked / marked N/A / deadline extended"
- Channels: Email + In-app (no SMS for resolution)

### B.6.4.8 Company Configuration UI

**Escalation Workflow Management Screen:**
- Accessible by Admin/Owner roles only
- List all company escalation workflows
- Create/Edit/Delete workflows
- Enable/Disable workflows
- Test workflow (preview notifications)

**Workflow Creation Form:**
1. Workflow name (required)
2. Obligation category filter (optional dropdown - null = all categories)
3. Four escalation levels (each with):
   - Threshold days (required, integer, must be > previous level)
   - Recipient selection (multi-select user dropdown)
   - Preview notification button

**Validation Rules:**
- Level thresholds must be sequential: level_1 < level_2 < level_3 < level_4
- At least Level 1 and Level 2 must be configured (Levels 3 and 4 optional)
- Each level must have at least one recipient
- Recipients must be valid user IDs with email addresses
- Cannot delete workflow if actively used by escalations (must disable instead)

### B.6.4.9 System Default Workflow

**If no company-specific workflow configured:**
Use system default workflow:
- Level 1: 1 day overdue → Assigned user
- Level 2: 3 days overdue → Site Manager
- Level 3: 7 days overdue → Company Admin
- Level 4: 14 days overdue → Owner + All Admins

**System default workflow cannot be deleted or modified - it's the fallback.**

### B.6.4.10 Edge Cases

**Case 1: Recipient user deleted/deactivated:**
- System detects invalid user ID during notification send
- Logs warning: "Escalation recipient [user_id] invalid - skipping notification"
- Sends notification to remaining valid recipients
- Admin notified: "Escalation workflow [name] has invalid recipient - please update"

**Case 2: Multiple workflows match (category-specific vs company default):**
- Category-specific workflow takes priority
- If entity has no category, use company default (obligation_category = NULL)

**Case 3: Workflow disabled mid-escalation:**
- Active escalations continue under original workflow rules
- New escalations use next available workflow or system default

**Case 4: Entity resolved then becomes overdue again:**
- Previous escalation record archived (status = RESOLVED)
- New escalation record created with fresh level progression
- History preserved for audit trail

---

## B.7 SLA Timer Tracking on Deadlines

### B.7.1 Purpose and Design Philosophy

**Problem:**
Deadlines have two types of targets:
1. **External Deadline (`due_date`):** Regulatory/contractual deadline (when regulator expects compliance)
2. **Internal SLA Target (`sla_target_date`):** Internal deadline for staff to complete task (usually earlier than external deadline)

**Example:** External deadline is 30 days to respond to regulator, but internal SLA is 20 days to allow review time.

### B.7.2 SLA vs Due Date Logic

**Relationship:**
- `sla_target_date` can be **before**, **same as**, or **NULL** (no internal SLA)
- `due_date` is always the external/regulatory deadline
- Breaching SLA doesn't change deadline status (can meet external deadline but breach internal SLA)

**Calculation:**
```
IF sla_target_date IS NULL THEN
  sla_status = 'NO_SLA'
ELSIF CURRENT_DATE > sla_target_date THEN
  sla_status = 'SLA_BREACHED'
  sla_breach_duration_hours = (CURRENT_TIMESTAMP - sla_target_date) * 24
ELSIF CURRENT_DATE <= sla_target_date AND CURRENT_DATE <= due_date THEN
  sla_status = 'SLA_ON_TRACK'
ELSE
  sla_status = 'SLA_AT_RISK'  -- Past SLA but not yet due_date
END IF
```

### B.7.3 SLA Breach Tracking

**SLA Breach Record:**
```json
{
  "deadline_id": "uuid",
  "sla_target_date": "2025-12-01",
  "sla_breached_at": "2025-12-02T08:00:00Z",
  "sla_breach_duration_hours": 8,
  "sla_status": "SLA_BREACHED",
  "due_date": "2025-12-10",
  "deadline_status": "PENDING",
  "sla_breach_reason": "Staff capacity issues",
  "sla_breach_acknowledged_by": "uuid",
  "sla_breach_acknowledged_at": "2025-12-02T09:00:00Z"
}
```

### B.7.4 SLA Breach Notifications

**SLA Breach Alerts:**
- When `sla_target_date` passes without completion, send SLA breach alert
- Recipients: Site Manager + Admin (not just assigned user)
- Channels: Email + In-app (no SMS for SLA breaches)
- Message: "SLA BREACH: Deadline [text] breached internal SLA - still on track for external deadline [due_date]"

**SLA Breach vs Deadline Breach:**
- SLA breach: Internal performance issue, notify managers
- Deadline breach: Regulatory risk, trigger escalation workflow
- Both tracked separately for performance metrics

### B.7.5 SLA Performance Metrics

**Company/Site SLA Dashboard:**
- Total deadlines with SLA tracking
- SLA compliance rate: `(deadlines met within SLA / total SLA deadlines) * 100%`
- Average SLA breach duration (hours)
- Trend: SLA performance over time
- By module: SLA performance per module
- By user: Individual SLA performance (for manager review)

**Use Cases:**
- Internal performance monitoring (not regulatory)
- Identify capacity issues before regulatory deadlines breached
- Staff performance reviews
- Process improvement (identify bottlenecks)

---

## B.8 Recurrence Trigger Execution Log

### B.8.1 Purpose and Design Philosophy

**Problem:**
Automated recurrence triggers create schedules/deadlines based on events, but users need to understand:
- WHY was this deadline created?
- WHEN was the trigger executed?
- WHAT event triggered it?
- WHAT was the result?

**Solution:**
Immutable audit trail of all trigger executions stored in `recurrence_trigger_executions` table.

### B.8.2 Trigger Execution Logic

**When Trigger Executes:**
1. Event occurs (e.g., permit variation approved, stack test completed, sampling date reached)
2. System queries `recurrence_trigger_rules` for active rules matching event type
3. For each matching rule:
   - Evaluate trigger conditions
   - If conditions met, execute trigger action (create schedule, deadline, task)
   - Log execution in `recurrence_trigger_executions`

**Execution Record Structure:**
```json
{
  "execution_id": "uuid",
  "trigger_rule_id": "uuid",
  "event_type": "PERMIT_VARIATION_APPROVED",
  "event_id": "uuid",
  "executed_at": "2025-12-01T10:00:00Z",
  "execution_result": "SUCCESS",
  "schedule_id_created": "uuid",
  "deadline_id_created": "uuid",
  "error_message": null,
  "conditions_evaluated": {
    "condition_1": true,
    "condition_2": true,
    "overall": true
  },
  "execution_context": {
    "permit_id": "uuid",
    "obligation_id": "uuid",
    "variation_type": "LIMIT_CHANGE"
  }
}
```

### B.8.3 Execution Result Types

| Result | Description | Actions |
|--------|-------------|---------|
| `SUCCESS` | Trigger executed successfully, schedule/deadline created | Log success, link to created entity |
| `FAILED` | Trigger execution failed (error) | Log error, notify admin |
| `SKIPPED` | Conditions not met, trigger skipped | Log reason, no action taken |
| `DUPLICATE` | Schedule/deadline already exists, skip creation | Log duplicate detection |

### B.8.4 Audit Trail Usage

**User Questions Answered:**
1. "Why was this deadline created?" → Look up `execution_id` linked to deadline, show trigger rule and event
2. "When was the last time this trigger executed?" → Query executions by `trigger_rule_id`, show most recent
3. "How many times has this trigger executed?" → Count executions by `trigger_rule_id`
4. "What events triggered this deadline?" → Show event type and event details from execution log

**UI Display:**
- Deadline detail page: "Created by trigger: [rule name] on [execution_date] due to [event_type]"
- Click "View trigger details" → Show full execution log
- Trigger rule management: "Last executed: [date], Total executions: [count], Success rate: [%]"

### B.8.5 Retention Policy

**Audit Trail Retention:**
- Keep forever (no deletion)
- Immutable (cannot edit after creation)
- Used for regulatory audits and debugging
- System-only writes (no manual editing)

### B.8.6 Debugging Failed Executions

**Failed Execution Handling:**
1. Log error message and stack trace
2. Notify admin: "Trigger execution failed: [rule name] - [error message]"
3. Admin can:
   - View error details
   - Manually retry trigger execution
   - Disable trigger rule if consistently failing
   - Create schedule/deadline manually if trigger fix will take time

**Error Examples:**
- "Obligation not found: obligation_id [uuid] does not exist"
- "Invalid date calculation: base_date + 90 days results in invalid date"
- "Schedule already exists: duplicate schedule detected for obligation_id [uuid]"

---

## B.9 Monitoring Schedule Generation

### B.9.1 Schedule Auto-Generation

When obligation is created with frequency:
1. System creates schedule record
2. Schedule linked to obligation
3. First deadline calculated from base date
4. Subsequent deadlines auto-generated on rolling basis

### B.9.2 Schedule Record Structure

```json
{
  "schedule_id": "uuid",
  "obligation_id": "uuid",
  "frequency": "Monthly",
  "base_date": "2024-03-15",
  "next_due_date": "2024-04-15",
  "last_completed_date": null,
  "is_rolling": true,
  "adjust_for_business_days": false,
  "reminder_days": [7, 3, 1],
  "status": "Active"
}
```

### B.7.3 Schedule Modification

Users can modify:
- `frequency`: Changes future deadlines
- `base_date`: Recalculates all deadlines
- `reminder_days`: Changes alert timing
- `adjust_for_business_days`: Toggle business day adjustment

Changes logged with `modified_by`, `modified_at`, `previous_values`.

### B.7.4 Background Job Retry and Dead-Letter Queue Rules

**Purpose:** Explicit rules for how background job retries and DLQ processing interact with job status transitions.

**Status → Retry Logic:**
- **Status Transition:** `FAILED → PENDING` (triggers retry)
- **Retry Condition:** `retry_count < max_retries` AND `status = 'FAILED'`
- **Retry Delay:** Exponential backoff: `retry_backoff_seconds = 2^retry_count` (e.g., retry 1 = 2s, retry 2 = 4s, retry 3 = 8s)
- **After Retry:** Job status set to `PENDING`, `retry_count` incremented, `scheduled_for` updated to `NOW() + retry_backoff_seconds`

**Status → DLQ Logic:**
- **DLQ Condition:** `retry_count >= max_retries` AND `status = 'FAILED'`
- **DLQ Action:** 
  - Create `dead_letter_queue` record
  - Set `background_jobs.dead_letter_queue_id` to DLQ record UUID
  - Set `background_jobs.status = 'FAILED'` (terminal state)
  - Log error details in DLQ record
- **DLQ Processing:** Admin/Owner can review failed jobs in DLQ, manually retry, or mark as permanently failed

**Health Check Integration:**
- **If** `health_status = 'STALE'` (no heartbeat within `heartbeat_interval_seconds`), **then**:
  - Set `status = 'FAILED'` if job is `RUNNING`
  - Trigger retry logic (if `retry_count < max_retries`)
- **If** `health_status = 'FAILED'`, **then**:
  - Set `status = 'FAILED'` immediately
  - Trigger DLQ logic (if `retry_count >= max_retries`)

**See Also:** `docs/specs/22_Database_Canonical_Dictionary.md` - `background_jobs` table, `job_status` enum, `dead_letter_queue` table

---

## B.8 Pack Logic (Legacy — See Section I.8 for v1.0 Pack Types)

> **Note:** This section describes the original audit pack logic. For v1.0 pack types (Regulator, Tender, Board, Insurer, Audit), see Section I.8.

### B.8.1 Pack Definition

A pack is a compiled PDF document containing (applies to all pack types):
- Document metadata
- All obligations (active)
- Evidence for each obligation
- Compliance status summary
- Gap analysis

### B.8.1 Universal Audit Pack Specification

**Purpose:** Define standardized audit pack structure that applies to ALL modules (Modules 1-4)

**Pack SLA:** < 2 minutes (< 120 seconds) generation time for packs with 100+ evidence items

**Universal Pack Contents (Required for ALL modules):**

1. **Compliance Score:**
   - Site-level compliance score (INTEGER 0-100) at generation time
   - Score breakdown: `{total_obligations, completed_obligations, overdue_count, module_scores: [{module_id, module_name, score}]}`
   - Score timestamp: When score was calculated
   - Color coding: Green (90-100), Amber (70-89), Red (0-69)

2. **Obligation List with Statuses:**
   - All obligations included in pack with:
     - Obligation ID, title, summary
     - Status: PENDING, INCOMPLETE, COMPLETE, OVERDUE, NOT_APPLICABLE
     - Deadline date (if applicable)
     - Frequency (if recurring)
     - Evidence count (number of linked evidence items)
     - Module association
   - Sorted by: Status priority (OVERDUE first), then deadline date

3. **Evidence Attachments (Version-Locked):**
   - All evidence items linked to obligations in pack
   - Version-locked snapshot at generation time:
     - File name, type, size
     - Upload timestamp and uploader
     - File hash (SHA-256) for integrity verification
     - Linked obligation IDs
     - Evidence metadata (compliance period, GPS coordinates if applicable)
   - Evidence items stored in `pack_contents` table with immutable snapshots

4. **Change Justification & Signoff History:**
   - All changes to obligations, evidence, or compliance decisions:
     - Change type: OBLIGATION_COMPLETED, EVIDENCE_LINKED, EVIDENCE_UNLINKED, STATUS_CHANGED, etc.
     - Justification text (why change was made)
     - Signed by: User ID and name
     - Signed at: Timestamp
     - Previous value and new value (for status changes)
   - Sorted by: Most recent first

5. **Compliance Clock Summary:**
   - Overdue items: `[{clock_id, clock_name, days_overdue, criticality, module_id, ...}]`
   - Upcoming items (within 30 days): `[{clock_id, clock_name, days_remaining, criticality, target_date, ...}]`
   - Total active clocks count
   - Criticality breakdown: Red count, Amber count, Green count

6. **Pack Provenance Signature:**
   - Generation timestamp: ISO 8601 format
   - Signer: `{user_id, user_name, user_email, user_role}`
   - Content hash: SHA-256 hash of all pack contents (for integrity verification)
   - Pack version: Incremental version number
   - Generation method: MANUAL, SCHEDULED, PRE_INSPECTION, DEADLINE_BASED
   - Generation SLA compliance: `{target_seconds: 120, actual_seconds: N, compliant: boolean}`

**Regulator Access (No Login Required):**
- Secure access token: Unique, cryptographically secure token (UUID v4 + random suffix)
- Access via secure link: `https://app.epcompliance.com/packs/{secure_access_token}`
- No authentication required for regulators
- Identity tracking mandatory:
  - IP address (required)
  - Email address (optional but recommended)
  - User agent (browser/client identifier)
- Access logging: All views, downloads, and page views tracked in `pack_access_logs`
- Optional expiry: `secure_access_expires_at` (if set, link expires at specified time)

**Pack Generation Process:**

1. **Pre-Generation Validation:**
   - Verify site_id exists and is accessible
   - Verify user has permission to generate pack
   - Check if pack generation is already in progress (prevent duplicates)

2. **Data Snapshot (Version-Lock):**
   - Capture current compliance score (site-level and module-level)
   - Snapshot all obligations matching filters
   - Snapshot all evidence items linked to obligations
   - Snapshot compliance clock items (overdue + upcoming)
   - Snapshot change justification history
   - All snapshots stored in JSONB fields (immutable after generation)

3. **Pack Assembly:**
   - Generate PDF or web-based pack
   - Include all 6 required sections (in order listed above)
   - Apply formatting and branding
   - Generate table of contents with page numbers

4. **Pack Storage:**
   - Store PDF in Supabase Storage (if PDF format)
   - Store pack metadata in `audit_packs` table
   - Store evidence snapshots in `pack_contents` table
   - Generate secure access token
   - Calculate content hash for provenance signature

5. **SLA Tracking:**
   - Record generation start time
   - Record generation end time
   - Calculate `generation_sla_seconds = (end_time - start_time) / 1000`
   - Store in `audit_packs.generation_sla_seconds`
   - If > 120 seconds, log warning but still complete generation

6. **Post-Generation:**
   - Create pack access log entry (if shared link generated)
   - Send notification to pack generator
   - Update pack distribution record (if email sent)

**Module-Specific Additions:**
- Modules may add module-specific sections AFTER the 6 universal sections
- Module-specific sections must not replace or modify universal sections
- Examples:
  - Module 1: Permit versions, redline comparisons, enforcement notices
  - Module 2: Lab results, exceedance history, monthly reconciliations
  - Module 3: Stack test results, runtime monitoring, AER documents
  - Module 4: Consignment notes, chain of custody, validation results

**Pack Types:**
All pack types (AUDIT_PACK, REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, INSURER_BROKER) must include the 6 universal sections. Pack type only affects:
- Recipient and distribution method
- Additional module-specific sections
- Formatting and branding

**Enforcement:**
- Pack generation MUST fail if any of the 6 universal sections cannot be generated
- Pack generation MUST include all 6 sections (no optional sections)
- Pack generation MUST meet SLA (< 120 seconds) or log warning
- Secure access token MUST be generated for regulator packs
- Access logging MUST be enabled for all secure links

---

### B.8.2 Pack Generation Triggers

1. **Manual:** User clicks "Generate Pack" (selects pack type)
2. **Scheduled:** Configurable (weekly, monthly, pre-inspection)
3. **On-Demand:** Before regulator inspection (user-initiated)

**v1.0 Update:** Pack type selection determines content structure. See Section I.8 for pack type-specific logic.

### B.8.3 Pack Structure (Base Structure — Pack Types Customize Content)

**Section 1: Cover Page**
- Company name
- Site name
- Document reference
- Generation date
- Compliance period covered
- Generated by: [User name and role]
- **Note:** No signature or sign-off required. The audit pack is a system-generated document for regulator inspection. The "Generated by" field provides attribution.

**Section 2: Summary Dashboard**
- Total obligations: N
- Complete: N (%)
- Pending: N (%)
- Overdue: N (%)
- Not Applicable: N

**Section 3: Obligation Detail**
For each obligation:
- Condition reference
- Obligation text
- Category
- Frequency
- Status
- Evidence list (with thumbnails for images)
- Last completion date

**Section 4: Evidence Appendix**
- Full-size evidence files
- Organised by obligation
- Page numbers referenced in Section 3

**Section 5: Gap Analysis**
- List of overdue obligations
- List of obligations without evidence
- Recommended actions

**Note:** Audit packs are generated even if evidence is incomplete. Incomplete evidence is explicitly noted in Section 5 (Gap Analysis) with status indicators. The pack generation process does not block on missing evidence - it documents gaps for regulator transparency.

**Reference Integrity Rules (Builder Acceptance Criteria):**
- **Evidence Archival:** If evidence is archived during pack generation:
  - Evidence appears in pack with status indicator: "[Evidence Archived]"
  - Evidence file not included in pack, but metadata retained
  - Gap analysis flags obligation as "Missing Evidence"
  - **Note:** Evidence cannot be deleted by users (see Section H.7.2), only archived by system after retention period
- **Obligation Archival:** If obligation is archived during pack generation:
  - Obligation excluded from pack (not included in count or detail sections)
  - Gap analysis notes: "Obligation [ID] was archived during pack generation"
  - **Note:** Obligations are archived (not deleted) when source document is removed or obligation is marked as superseded
- **Broken Links:** If evidence-obligation link is broken (evidence archived or obligation archived):
  - Evidence appears in "Unlinked Evidence" section if evidence still exists
  - Obligation appears in "Obligations Without Evidence" if obligation still exists
- **Pre-Generation Validation:** Before pack generation starts:
  - Validate all evidence-obligation links exist and are valid
  - Validate all obligations reference valid documents
  - If validation fails, display warning: "Some data has changed. Regenerate pack to include latest changes."
- **Snapshot Consistency:** Pack generation creates snapshot of data at generation time:
  - All data frozen at `generated_at` timestamp
  - Subsequent deletions/archivals do not affect already-generated pack
  - Pack version number incremented if regenerated

### B.8.4 Pack Filters (Applies to All Pack Types)

> **v1.0 Update:** Filter options apply to all pack types. Pack type determines which filters are most relevant. See Section I.8 for pack type-specific filter recommendations.

Users can filter pack content:
- By date range
- By compliance status (all, complete only, gaps only)
- By obligation category
- By specific conditions
- By pack type (v1.0: Regulator, Tender, Board, Insurer, Audit)

**Pack Type-Specific Filter Recommendations:**
- **Regulator Pack:** All obligations, all statuses (shows gaps prominently)
- **Tender Pack:** Complete obligations preferred, evidence samples
- **Board Pack:** All sites, aggregated metrics
- **Insurer Pack:** Risk-focused filters, compliance controls
- **Audit Pack:** All obligations, full evidence

### B.8.5 Pack Export Formats (Applies to All Pack Types)

> **v1.0 Update:** Export formats apply to all pack types. Pack type determines default format. See Section I.8 for pack type-specific format requirements.

**Supported Export Formats:**
- **PDF (Default):** Formatted report for human review and printing (all pack types)
- **JSON (Machine-Readable):** Structured data for programmatic access and integration (all pack types)
- **XML (Regulatory Format):** Standardized format for regulator submissions (Regulator Pack preferred)

**Pack Type-Specific Format Notes:**
- **Regulator Pack:** PDF/A archival format (required), XML optional
- **Tender Pack:** PDF (client-facing format)
- **Board Pack:** PDF (executive summary format)
- **Insurer Pack:** PDF (risk narrative format)
- **Audit Pack:** PDF (full evidence compilation)

**JSON Export Schema:**
```json
{
  "audit_pack_id": "uuid",
  "generated_at": "ISO8601",
  "company": {
    "id": "uuid",
    "name": "string"
  },
  "site": {
    "id": "uuid",
    "name": "string"
  },
  "document": {
    "id": "uuid",
    "reference_number": "string",
    "title": "string"
  },
  "obligations": [
    {
      "obligation_id": "uuid",
      "text": "string",
      "category": "string",
      "status": "string",
      "deadline": "ISO8601",
      "evidence": [
        {
          "evidence_id": "uuid",
          "file_name": "string",
          "uploaded_at": "ISO8601",
          "file_hash": "string"
        }
      ],
      "compliance_period": "string"
    }
  ],
  "evidence_index": [
    {
      "evidence_id": "uuid",
      "file_name": "string",
      "uploaded_at": "ISO8601",
      "linked_obligations": ["uuid"]
    }
  ],
  "timestamps": {
    "generated_at": "ISO8601",
    "period_start": "ISO8601",
    "period_end": "ISO8601"
  }
}
```

**XML Export Schema:**
- Follows regulatory standard format (EA/SEPA/NRW compliant)
- Includes: obligations tree, evidence index, timestamps, metadata
- Validates against XML schema before export

---

## B.9 Cross-Site Logic

### B.9.1 Multi-Site Architecture

- Companies can have multiple sites
- Each site has its own documents, obligations, evidence
- Users can be assigned to one or multiple sites

**Document-Site Relationship:**
- **Primary Site:** Every document has a required `site_id` (primary site)
- **Multi-Site Shared Permits:** Documents can be linked to additional sites via `document_site_assignments` table
- **Usage Pattern:**
  - **Single-Site Permits (Default):** Document belongs to one site only (`documents.site_id` only, no `document_site_assignments` records)
  - **Multi-Site Shared Permits (Exception):** Document shared across multiple sites (e.g., company-wide permit covering multiple sites)
    - Primary site: `documents.site_id` (required)
    - Additional sites: `document_site_assignments` records (optional)
    - Obligations can be shared (`obligations_shared = true`) or replicated per site (`obligations_shared = false`)
- **Billing Impact:**
  - Single-site permits: Billed per site (standard pricing)
  - Multi-site shared permits: Billed once per document (not per site) - see Section B.9.4 (Multi-Site Shared Permit Billing subsection)

### B.9.2 Site Switching

- Dashboard defaults to "All Sites" consolidated view
- User can filter to single site
- Site selection persists during session
- Some actions require site-specific context (e.g., evidence upload)

### B.9.3 Cross-Site Prohibitions

- Evidence CANNOT be linked to obligations on different sites
- **Exception:** Multi-site shared permits - evidence can be linked to obligations on any site linked to the same document (via `document_site_assignments`)
- Audit packs are generated per-site (no cross-site audit packs)
- Schedules are site-specific
- Alerts are sent per-site (user may receive from multiple sites)

### B.9.4 Multi-Site Billing

**Billing Rules:**
- Base price (£149/month) covers first site
- Additional sites: £99/month each
- Module 2 add-on: £59/month per site
- Module 3 add-on: £79/month per company (not per site)

**Multi-Site Shared Permit Billing:**
- **Rule:** Multi-site shared permits are billed once per document (not per site)
- **Logic:** If document has `document_site_assignments` records (multi-site shared), billing is:
  - Per-document pricing: `base_price` × 1 (not multiplied by number of sites)
  - Per-site pricing: `base_price` × 1 (primary site only, additional sites don't add charges)
- **Example:**
  - Single-site permit on Site A: £149/month
  - Same permit shared across Sites A, B, C: £149/month (not £149 × 3)
- **Rationale:** Shared permit is one document covering multiple sites, not separate permits per site

**Note:** Pricing is stored in `modules.base_price` and `modules.pricing_model`. Billing logic queries the `modules` table to calculate charges. New modules can define their own pricing by setting these fields in the `modules` table. No code changes are needed for new pricing models.

**See Section E (Pricing & Billing Logic) for complete billing calculation details including per-document pricing.**

### B.9.5 Multi-Permit Billing Logic

**Pricing Structure:**
- Base Module 1 price (£149/month per site) includes 1 permit
- Additional permits: £49/month each
- Maximum permits per site: No limit (billing scales linearly)

**Billing Calculation:**
- Site with 1 permit: £149/month
- Site with 2 permits: £149 + £49 = £198/month
- Site with 3 permits: £149 + (2 × £49) = £247/month

**Tracking Logic:**
- System tracks permit count per site
- Billing recalculated when permits added/removed
- Permit deletion: Fee removed from next billing cycle
- Permit count includes all active permits (not archived/superseded)

**Example:**
- Company has 1 site with 3 permits
- Monthly billing: £149 (base) + (2 × £49) = £247/month
- If one permit is archived: Billing reduces to £198/month from next cycle

---

## B.10 User Roles Logic

### B.10.1 Role Definitions

| Role | Permissions |
|------|-------------|
| **Owner** | Full access; billing; user management; company settings |
| **Admin** | Full access except billing; user management for assigned sites |
| **Staff** | View/edit obligations; upload evidence; generate packs (all pack types per plan); assigned sites only |
| **Viewer** | Read-only access; can view but not edit; assigned sites only |
| **Consultant** | Multi-company access; Staff permissions across client companies; Generate all pack types for assigned clients; Upload restricted to assigned client companies/sites only |

### B.10.2 Permission Matrix (Action-Based)

| Action | Owner | Admin | Staff | Viewer | Consultant |
|--------|-------|-------|-------|--------|------------|
| View obligations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit obligations | ✅ | ✅ | ✅ | ❌ | ✅ |
| Upload documents | ✅ | ✅ | ✅ | ❌ | ✅ |
| Upload evidence | ✅ | ✅ | ✅ | ❌ | ✅ |
| Generate packs (all pack types per plan) | ✅ | ✅ | ✅ | ✅ | ✅ (all types for clients) |
| Activate modules | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing access | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Subscription management | ✅ | ❌ | ❌ | ❌ | ❌ |
| View settings | ✅ | ✅ | ❌ | ❌ | ❌ |

### B.10.2.1 Entity × Role CRUD Permissions Matrix

**Purpose:** Defines explicit Create, Read, Update, Delete permissions per entity per role. This matrix is used to implement Row Level Security (RLS) policies in the database.

**Legend:**
- **C** = Create (INSERT)
- **R** = Read (SELECT)
- **U** = Update
- **D** = Delete
- **-** = No access

| Entity | Owner | Admin | Staff | Viewer | Consultant |
|--------|-------|-------|-------|--------|------------|
| **Companies** | CRUD | CRU | R | R | R (client companies only) |
| **Sites** | CRUD | CRUD | CRU | R | CRU (client sites only) |
| **Users** | CRUD | CRUD | R | R | R (client users only) |
| **Documents** | CRUD | CRUD | CRU | R | CRU (client documents only) |
| **Obligations** | CRUD | CRUD | CRU | R | CRU (client obligations only) |
| **Evidence** | CRU (no delete) | CRU (no delete) | CRU (no delete) | R | CRU (no delete, client evidence only) |
| **Schedules** | CRUD | CRUD | CRU | R | CRU (client schedules only) |
| **Module Activations** | CRUD | CRUD | - | R | - |
| **Cross-Sell Triggers** | CRUD | CRUD | R | R | R (client triggers only) |
| **Packs (all pack types)** | CRUD | CRUD | CRU | R | CRU (client packs only, all pack types) |
| **Rule Library Patterns** | CRUD | R | R | - | - |
| **Extraction Logs** | CRUD | CRUD | R | R | R (client logs only) |
| **System Settings** | CRUD | R | - | - | - |
| **Company Settings** | CRUD | CRU | - | - | - (read-only, cannot modify) |
| **Subscription/Billing** | CRUD | - | - | - | - (no access) |

**Special Rules:**
- **Owner:** Full access to all entities within their company
- **Admin:** Full access except system settings (read-only) and rule library (read-only)
- **Staff:** Can create/update most entities, cannot delete or manage users/modules
- **Viewer:** Read-only access to all entities
- **Consultant:** Staff-level permissions but scoped to client companies only (multi-company access). Can generate all pack types for assigned clients. See Section C.5 for Consultant Control Centre logic.
- **Evidence Deletion:** Evidence cannot be deleted by any user role (see Section H.7.2). Evidence can only be archived by system after retention period.

**RLS Implementation Notes:**
- RLS policies enforce these permissions at the database level
- Policies check `company_id` for entity access
- Consultant role requires additional check via `consultant_client_assignments` table: `company_id IN (SELECT client_company_id FROM consultant_client_assignments WHERE consultant_id = auth.uid() AND status = 'ACTIVE')`. See Section C.5.2 for Consultant Access Logic.
- Delete operations require additional validation (e.g., cannot delete company with active sites)

### B.10.2.2 Viewer Role RLS Rules (Detailed)

**Purpose:** Explicit Row Level Security (RLS) policies for Viewer role to ensure read-only access is properly enforced at the database level.

**Viewer Role RLS Policies:**

**Companies:**
- **SELECT:** Allowed for companies where user is assigned (via `user_roles` table)
- **INSERT/UPDATE/DELETE:** Denied (no write access)

**Sites:**
- **SELECT:** Allowed for sites where user is assigned (via `user_roles` table)
- **INSERT/UPDATE/DELETE:** Denied (no write access)

**Documents:**
- **SELECT:** Allowed for documents on sites where user is assigned
- **INSERT/UPDATE/DELETE:** Denied (no write access)
- **Filter:** `documents.site_id IN (SELECT site_id FROM user_roles WHERE user_id = current_user_id)`

**Obligations:**
- **SELECT:** Allowed for obligations linked to documents on sites where user is assigned
- **INSERT/UPDATE/DELETE:** Denied (no write access)
- **Filter:** `obligations.document_id IN (SELECT id FROM documents WHERE site_id IN (SELECT site_id FROM user_roles WHERE user_id = current_user_id))`

**Evidence:**
- **SELECT:** Allowed for evidence on sites where user is assigned
- **INSERT/UPDATE/DELETE:** Denied (no write access)
- **Filter:** `evidence_items.site_id IN (SELECT site_id FROM user_roles WHERE user_id = current_user_id)`

**Schedules:**
- **SELECT:** Allowed for schedules linked to obligations on sites where user is assigned
- **INSERT/UPDATE/DELETE:** Denied (no write access)

**Packs (all pack types):**
- **SELECT:** Allowed for packs on sites where user is assigned (or company-level for Board Pack)
- **INSERT/UPDATE/DELETE:** Denied (no write access)

**Enforcement:**
- RLS policies enforced at database level (PostgreSQL Row Level Security)
- Policies checked before any query execution
- No application-level bypass possible

### B.10.2.3 Consultant Data Boundary Rules

**Purpose:** Explicit rules for cross-client data isolation for consultants to ensure regulatory compliance and privacy.

**Data Isolation Rules:**
- **RLS Enforcement:** Consultants can only access data for companies/sites they are assigned to (via `consultant_client_assignments` table)
- **Multi-Site Access:** Consultants can view multiple assigned sites across different client companies
  - Site switcher shows all assigned client sites grouped by company
  - All sites within assigned client companies are accessible
- **Upload Restrictions:** Consultants can only upload documents/evidence to assigned client companies/sites
- **Settings/Subscription Restrictions:** Consultants CANNOT:
  - Access company settings or subscription management
  - View or modify subscription/billing information
  - Change company configuration
  - Access settings navigation (hidden in UI)
- **Cross-Client Prohibition (Tenant Isolation):** Consultants cannot:
  - View data from unassigned clients
  - Upload documents to unassigned clients
  - Link evidence across different clients (strict tenant isolation enforced at RLS level)
  - Generate packs for unassigned clients (all pack types restricted to assigned clients)
  - Evidence cannot leak across clients - evidence and obligations must be from same company

**Assignment Logic:**
- Consultants are assigned to specific client companies via `consultant_client_assignments` table
- `consultant_client_assignments.consultant_id` = consultant user ID
- `consultant_client_assignments.client_company_id` = client company ID
- `consultant_client_assignments.status = 'ACTIVE'` = active assignment
- System validates all consultant actions against assignment scope
- See Section C.5.6 for Consultant Client Assignment Workflow

**RLS Policies for Consultants:**
- **Companies:** `SELECT` only for companies where `client_company_id IN (SELECT client_company_id FROM consultant_client_assignments WHERE consultant_id = auth.uid() AND status = 'ACTIVE')`
- **Sites:** `SELECT` only for sites where `company_id IN (SELECT client_company_id FROM consultant_client_assignments WHERE consultant_id = auth.uid() AND status = 'ACTIVE')`
- **Documents:** `SELECT/INSERT/UPDATE` only for documents on assigned client sites
- **Obligations:** `SELECT/INSERT/UPDATE` only for obligations linked to documents on assigned client sites
- **Evidence:** `SELECT/INSERT/UPDATE` only for evidence on assigned client sites
- **Packs:** `SELECT/INSERT/UPDATE` only for packs associated with assigned client companies (all pack types)
- See Section C.5.2 for detailed Consultant Access Logic and RLS & Permissions Rules Section 11 for RLS policies

**Enforcement:**
- RLS policies enforced at database level (PostgreSQL Row Level Security)
- Application-level validation as backup
- All consultant actions logged with client context
- Violation attempts logged and blocked

**Audit Trail:**
- All consultant actions logged with `company_id` and `site_id` context
- Cross-client access attempts logged as security events
- Regular audit reports for consultant access patterns

### B.10.3 Role Assignment

- Owner role: Automatically assigned to account creator
- Additional users: Invited by Owner/Admin with specified role
- Role changes: Logged with `changed_by`, `changed_at`, `previous_role`

---

## B.11 Obligation Change Tracking

> [v1.6 UPDATE – Obligation Versioning Simplified – 2025-01-01]
> - Removed `obligation_versions` table
> - Obligation change history now tracked via `audit_logs` table
> - `audit_logs` provides comprehensive change tracking with `entity_type = 'obligation'`, `action_type`, `changes` (JSONB)

**Purpose:** Track all changes to obligations over time to maintain audit trail and enable "what obligation existed at time of breach" queries.

**Change Tracking Logic:**
- **Initial Creation:** When obligation is extracted, create `audit_logs` entry:
  - `entity_type = 'obligation'`
  - `action_type = 'OBLIGATION_CREATED'`
  - `entity_id = obligation.id`
  - `changes`: JSONB with initial obligation state
- **On Edit:** When obligation is modified:
  1. Create `audit_logs` entry:
     - `entity_type = 'obligation'`
     - `action_type = 'OBLIGATION_UPDATED'`
     - `entity_id = obligation.id`
     - `user_id`: User who made the change
     - `changes`: JSONB with `previous_values` and `new_values`
     - `metadata.edit_reason`: Reason for change (required)
  2. Update current obligation fields with new values
  3. Update `obligations.updated_at` timestamp

**Change History Query:**
- **Query by Change:** `SELECT * FROM audit_logs WHERE entity_type = 'obligation' AND entity_id = :id ORDER BY created_at DESC`
- **Query by Date:** System can reconstruct obligation state at any point in time by querying `audit_logs` entries chronologically
- **Diff Between Changes:** System can generate diff showing what changed between any two `audit_logs` entries using `changes.previous_values` and `changes.new_values`

**Regeneration vs Retention Policy:**
- **Retention:** All audit log entries retained indefinitely (never deleted)
- **Regeneration:** When document is updated, system attempts to match obligations to new document version
  - **If** match found, **then** obligation continues (no new audit log entry needed)
  - **If** no match, **then** old obligation archived, new obligation created (new audit log entry with `OBLIGATION_CREATED`)
- **Override Exceptions:** Admin/Owner can override obligation regeneration (keep old obligation, create new obligation separately)

**Audit Trail:**
- All changes logged in `audit_logs`:
  - `action_type IN ('OBLIGATION_CREATED', 'OBLIGATION_UPDATED', 'OBLIGATION_DELETED', 'OBLIGATION_ARCHIVED')`
  - `previous_values`: Full obligation state before change (in `changes` JSONB)
  - `new_values`: Full obligation state after change (in `changes` JSONB)
  - `user_id`: User who made the change
  - `created_at`: Timestamp of change

## B.12 Manual Override Rules

### B.11.1 What Can Be Overridden

| Data Element | Override Allowed | Validation |
|--------------|-----------------|------------|
| Obligation text | ✅ | Must be non-empty |
| Obligation category | ✅ | Must be valid enum |
| Obligation frequency | ✅ | Must be valid enum |
| Deadline date | ✅ | Must be valid date |
| Subjective flag | ❌ | System-determined only |
| Confidence score | ❌ | System-determined only |
| Compliance status | Partial | Can mark complete, N/A; cannot mark overdue as complete without evidence |

### B.11.2 Override Workflow

1. User clicks "Edit" on obligation
2. Editable fields shown in form
3. User makes changes
4. User must provide reason for edit (required for audit trail)
5. System saves: `edited_by`, `edited_at`, `edit_reason`, `previous_values`

### B.11.3 Override Audit Trail

All overrides are logged with:
- Original value
- New value
- User who made change
- Timestamp
- Reason (required)

Audit trail visible in obligation history tab.

---

## B.13 Regulator Challenge State Machine

**Purpose:** Defines the complete workflow for handling regulator questions, queries, and challenges.

**State Machine:**
- **OPEN:** Question raised, awaiting response
- **RESPONSE_SUBMITTED:** Response submitted, awaiting regulator acknowledgment
- **RESPONSE_ACKNOWLEDGED:** Regulator acknowledged response
- **FOLLOW_UP_REQUIRED:** Regulator requires additional information
- **CLOSED:** Question resolved, no further action needed
- **RESPONSE_OVERDUE:** Response deadline passed, escalation triggered

**Question Types:**
- **OBLIGATION_CLARIFICATION:** Regulator questions specific obligation interpretation
- **EVIDENCE_REQUEST:** Regulator requests additional evidence
- **COMPLIANCE_QUERY:** General compliance question
- **URGENT:** Urgent question (7-day response deadline)
- **INFORMAL:** Informal query (60-day response deadline)

**Response Deadline Calculation:**
- **Default:** 28 days from `raised_date`
- **URGENT:** 7 days from `raised_date`
- **INFORMAL:** 60 days from `raised_date`

**Workflow:**
1. **Question Raised:** User creates `regulator_questions` record
   - Sets `status = 'OPEN'`
   - Sets `raised_date = CURRENT_DATE`
   - Calculates `response_deadline` based on question type
2. **Response Preparation:** User prepares response
   - Reviews related document/obligation
   - Gathers supporting evidence
3. **Response Submission:** User submits response
   - Sets `response_text`
   - Uploads `response_evidence_ids` (if applicable)
   - Sets `response_submitted_date = CURRENT_DATE`
   - Sets `status = 'RESPONSE_SUBMITTED'`
4. **Regulator Acknowledgment:** If regulator acknowledges
   - Sets `regulator_acknowledged = true`
   - Sets `status = 'RESPONSE_ACKNOWLEDGED'`
5. **Follow-Up:** If regulator requires follow-up
   - Sets `follow_up_required = true`
   - Sets `status = 'FOLLOW_UP_REQUIRED'`
   - Creates new question record linked to original
6. **Closure:** If question resolved
   - Sets `closed_date = CURRENT_DATE`
   - Sets `status = 'CLOSED'`

**Escalation Logic:**
- **If** `response_deadline` within 7 days AND `status = 'OPEN'`, **then** send reminder
- **If** `response_deadline` passed AND `status = 'OPEN'`, **then**:
  - Set `status = 'RESPONSE_OVERDUE'`
  - Escalate to Admin/Owner
  - Send critical alert
- **If** `response_deadline` passed > 14 days, **then** send critical alert to Owner

**Audit Trail:**
- All state transitions logged in `audit_logs`
- Question raised: `action_type = 'REGULATOR_QUESTION_RAISED'`
- Response submitted: `action_type = 'REGULATOR_RESPONSE_SUBMITTED'`
- Status changes: `action_type = 'REGULATOR_QUESTION_STATUS_CHANGED'`

**See User Workflow Maps Section 4.7 for complete workflow details.**

## B.14 Cross-Module Prohibition Rules

### B.12.1 Rule Isolation

- Module 1 rules apply ONLY to Environmental Permits
- Module 2 rules apply ONLY to Trade Effluent Consents
- Module 3 rules apply ONLY to MCPD Registrations

### B.12.2 Document Type Enforcement

- System prevents applying wrong module rules to documents
- If user attempts to upload document type that requires inactive module:
  - System queries `modules` table: `SELECT * FROM modules WHERE document_types @> '["<document_type>"]'::JSONB AND is_active = true`
  - If module found but not activated for this company/site, display: "[Module Name from modules table] is required to manage [document type] documents. Would you like to activate it?"

### B.12.3 Cross-Module Data Sharing

| Data Type | Sharing Permitted |
|-----------|------------------|
| Company data | ✅ Shared across all modules |
| Site data | ✅ Shared across all modules |
| User data | ✅ Shared across all modules |
| Documents | ❌ Module-specific only |
| Obligations | ❌ Module-specific only |
| Evidence | ❌ Module-specific (but same file can be uploaded to multiple modules) |

---

# C. MODULE-SPECIFIC LOGIC RULES (20% Differentiated Engine)

## C.1 Module 1 — Environmental Permits

### C.1.1 Supported Document Types

| Document Type | Regulator | Pattern |
|---------------|-----------|---------|
| Part A Permit | EA (England) | "Environmental Permit", "Part A" |
| Part B Permit | EA (England) | "Part B", "Local Authority Permit" |
| Waste Management Licence | EA (England) | "Waste Management Licence", "WML" |
| PPC Permit | SEPA (Scotland) | "PPC Permit", "SEPA" |
| Environmental Permit | NRW (Wales) | "Natural Resources Wales", "NRW Permit" |
| NIEA Permit | NIEA (N. Ireland) | "NIEA", "Northern Ireland" |

### C.1.2 Extraction Rules for Permit Sections

**Standard Sections:**

| Section Name | Extraction Target |
|--------------|------------------|
| "Conditions" / "Schedule" | Obligation text, condition references |
| "Permitted Activities" | Activity descriptions (informational, not obligations) |
| "Emissions Limits" | ELV values, monitoring requirements |
| "Monitoring Requirements" | Frequencies, parameters, methods |
| "Reporting Requirements" | Deadlines, submission methods |
| "Improvement Programme" | Improvement conditions with deadlines |
| "Site Plan" | Not extracted (stored as appendix) |

### C.1.3 Improvement Condition Logic

Improvement conditions are time-bound requirements with specific deadlines.

**Identification:**
- Contains explicit deadline date
- Keywords: "improvement", "complete by", "implement within", "no later than"

**Treatment:**
- Create one-time obligation
- Deadline date extracted from text
- Category: Operational (default) or as specified
- High priority flag: true
- Reminder schedule: 30 days, 14 days, 7 days, 1 day before deadline

**Completion:**
- User must link evidence demonstrating completion
- Cannot mark complete without evidence
- Once complete, obligation archived (not deleted)

### C.1.4 ELV (Emission Limit Value) Logic

**Identification:**
- Numeric values with units (mg/m³, μg/m³, dB, etc.)
- Keywords: "limit", "shall not exceed", "maximum", "ELV"

**Extraction:**
- Limit value (numeric)
- Unit
- Averaging period (e.g., hourly, daily, monthly average)
- Reference conditions (if specified)

**Monitoring:**
- ELV obligations generate monitoring schedule
- Evidence type: Monitoring report/results
- Exceedance logic: System cannot auto-detect (user marks compliance)

### C.1.5 Monitoring Frequency Logic

**Frequency Extraction:**

| Text Pattern | Extracted Frequency |
|--------------|---------------------|
| "daily", "each day", "every day" | Daily |
| "weekly", "once a week", "each week" | Weekly |
| "monthly", "once a month", "each month" | Monthly |
| "quarterly", "every three months" | Quarterly |
| "annually", "once a year", "each year" | Annual |
| "continuously", "at all times" | Continuous |
| Specific date mentioned | One-time |

**Ambiguous Frequencies:**
- "regularly" without specification → Flag for human review
- Multiple frequencies in one condition → Create multiple schedules

### C.1.6 Evidence Types for Module 1

| Obligation Category | Acceptable Evidence Types |
|--------------------|-----------------------------|
| Monitoring | Lab reports, test certificates, monitoring data (CSV), photos |
| Reporting | Submission receipts, report copies, email confirmations |
| Record-Keeping | Register excerpts, log sheets, database exports |
| Operational | Photos, inspection checklists, procedure documents |
| Maintenance | Service records, calibration certificates, work orders |

### C.1.7 Multi-Permit Logic

**Sites with Multiple Permits:**
- Each permit processed independently
- Obligations listed under respective permit
- Audit pack can include all permits or filter by permit
- Conflicting obligations across permits → Flagged for user review

**Permit Relationship Detection:**
- If permits reference each other, system notes relationship
- Cross-permit conditions flagged with "See also: [other permit reference]"

### C.1.8 Renewal Logic

**Renewal Date Tracking:**
- Extracted from permit (if present)
- If not present, user can set manually
- Reminders: 90 days, 30 days, 7 days before expiry

**Renewal Workflow:**
1. Reminder sent at 90 days
2. User uploads new permit (as variation or renewal)
3. System processes new permit
4. User reviews obligation changes
5. Old permit marked "Superseded"
6. Evidence history migrated where obligations match

### C.1.9 Permit Workflows (Variations, Renewals, Surrenders)

### C.1.9.1 Purpose and Scope

Permit workflows track formal changes to permits through a structured state machine. Three workflow types supported:
- **VARIATION:** Modifying permit conditions (e.g., changing emission limits, adding/removing activities)
- **RENEWAL:** Renewing expiring permit (creates new permit version, supersedes old)
- **SURRENDER:** Formally surrendering permit (triggers closure workflow)

### C.1.9.2 Workflow State Machine

**States:**

| State | Description | Allowed Transitions |
|-------|-------------|-------------------|
| `DRAFT` | Workflow initiated, preparing submission | → SUBMITTED, → CANCELLED |
| `SUBMITTED` | Submitted to regulator, awaiting response | → UNDER_REVIEW, → CANCELLED |
| `UNDER_REVIEW` | Regulator reviewing application | → APPROVED, → REJECTED, → ADDITIONAL_INFO_REQUIRED |
| `ADDITIONAL_INFO_REQUIRED` | Regulator needs more information | → UNDER_REVIEW (after info provided) |
| `APPROVED` | Regulator approved, awaiting final steps | → COMPLETED |
| `REJECTED` | Regulator rejected application | Final state |
| `COMPLETED` | Workflow complete, changes applied | Final state |
| `CANCELLED` | User cancelled workflow | Final state |

**State Transition Logic:**
```
DRAFT → SUBMITTED:
  - Requires: submission_date, regulator_reference, impact_analysis_completed
  - Actions: Send notification to regulat or, create compliance clock entry for response deadline

SUBMITTED → UNDER_REVIEW:
  - Requires: regulator_acknowledgement_date
  - Actions: Update response_deadline based on regulator timeline

UNDER_REVIEW → APPROVED:
  - Requires: approved_date, approved_by (regulator name)
  - Actions: Generate draft updated permit, flag affected obligations for review

APPROVED → COMPLETED:
  - Requires: All affected obligations reviewed, evidence requirements updated
  - Actions: Update permit version, migrate obligations, trigger compliance clock updates
```

### C.1.9.3 Workflow Type-Specific Business Rules

**VARIATION Workflows:**

1. **Impact Analysis Required Before Submission:**
   - User must complete impact analysis identifying affected obligations
   - System prompts: "Which obligations will be affected by this variation?"
   - User selects obligations from list OR marks "All obligations" OR "No obligations affected"
   - Impact analysis stored in `permit_workflows.impact_analysis` (JSONB)

2. **Obligation Linking:**
   - Variations MUST link to affected obligations
   - System creates `permit_workflow_obligations` records for each affected obligation
   - Obligations flagged with "Pending Variation" badge in UI

3. **Approval Workflow:**
   - When regulator approves, system:
     - Creates new permit version (increments minor version: 1.0 → 1.1)
     - Flags affected obligations for review
     - Prompts user: "Review obligation changes and update evidence requirements"

4. **Completion Triggers:**
   - User reviews all affected obligations
   - User confirms evidence requirements updated (if needed)
   - System marks workflow `COMPLETED`
   - Compliance clock entries updated for affected obligations

**RENEWAL Workflows:**

1. **Auto-Creation at 90 Days Before Expiry:**
   - System auto-creates renewal workflow at 90 days before `permit_expiry_date`
   - Status: `DRAFT`
   - Reminder sent to Admin/Owner: "Permit [reference] expires in 90 days - renewal workflow created"

2. **Renewal Submission Requirements:**
   - User must attach renewal application documents
   - User must confirm all obligations currently compliant (or note exceptions)
   - User must update any changed site/activity details

3. **Approval and New Permit Version:**
   - When regulator approves renewal:
     - System creates new permit version (increments major version: 1.x → 2.0)
     - Old permit marked "SUPERSEDED"
     - System attempts to match obligations between old and new versions (see C.1.8 Renewal Logic)
     - Evidence history migrated for matched obligations

4. **Renewal Deadline Tracking:**
   - `permit_workflows.regulator_response_deadline` tracked in compliance clock
   - If renewal not approved before expiry, critical alert to Owner
   - Expired permit flagged on dashboard until renewal completed

**SURRENDER Workflows:**

1. **Surrender Requirements:**
   - User must provide surrender reason (dropdown + free text)
   - User must confirm all outstanding obligations completed OR document exceptions
   - Final inspection evidence required before completion

2. **Final Inspection Requirement:**
   - System requires evidence of final inspection/site clearance
   - Evidence type: "Final Inspection Report" or "Site Clearance Certificate"
   - Cannot mark `COMPLETED` until final inspection evidence attached

3. **Surrender Approval:**
   - When regulator approves surrender:
     - System marks all active obligations as "CLOSED - PERMIT SURRENDERED"
     - Permit status set to "SURRENDERED"
     - Compliance clock entries deactivated
     - All future deadlines cancelled

4. **Surrender Completion:**
   - After final inspection evidence attached and approved:
     - Workflow status set to `COMPLETED`
     - Permit archived (not deleted - retained for audit trail)
     - Dashboard no longer shows permit in active list

### C.1.9.4 Regulator Response Deadline Tracking

**Response Deadline Alerts:**
- Submission creates compliance clock entry for regulator response
- Default response deadline: 13 weeks (91 days) from submission_date (per EA guidelines)
- Alerts at: 4 weeks remaining, 2 weeks remaining, 1 week remaining, overdue
- If response overdue, escalate to Owner with message: "Regulator response overdue for [workflow_type] - contact regulator"

**Deadline Extension:**
- If regulator requests additional info (`ADDITIONAL_INFO_REQUIRED` state):
  - System extends response_deadline by X days (user configurable, default 28 days)
  - New deadline tracked in compliance clock
  - User notified: "Regulator response deadline extended to [new_date] - additional information required"

### C.1.9.5 Evidence Linking for Workflows

**Workflow Evidence Types:**
- **Submission Evidence:** Application documents, impact assessments, supporting studies
- **Regulator Correspondence:** Emails, letters, acknowledgement notices
- **Approval Evidence:** Approval letter, updated permit (if issued separately)
- **Final Evidence:** Completion certificate, final inspection report (surrenders only)

**Evidence Requirements by State:**
- DRAFT → SUBMITTED: Submission application evidence required
- SUBMITTED → UNDER_REVIEW: Regulator acknowledgement evidence required (optional but recommended)
- APPROVED → COMPLETED: Approval letter evidence required
- Surrender APPROVED → COMPLETED: Final inspection evidence required (mandatory)

### C.1.9.6 Workflow Permissions

**Who Can:**
- **Initiate Workflow (DRAFT):** Admin, Owner only
- **Submit Workflow (DRAFT → SUBMITTED):** Admin, Owner only
- **Update Status (SUBMITTED → UNDER_REVIEW, etc.):** Admin, Owner only
- **Complete Workflow (APPROVED → COMPLETED):** Admin, Owner only (after all requirements met)
- **Cancel Workflow:** Owner only

**Audit Trail:**
- All state transitions logged with user, timestamp, reason
- Evidence attachments logged
- Regulator correspondence logged
- Obligation updates logged

### C.1.9.7 Dashboard and UI Integration

**Permit Workflows Dashboard Widget:**
- Active workflows count (by status)
- Overdue regulator responses (red badge)
- Workflows pending user action (amber badge)
- Click to drill down into workflow details

**Workflow Detail Page:**
- Timeline view showing state progression
- Document attachments panel
- Affected obligations list (variations only)
- Regulator correspondence history
- Evidence checklist with completion status

### C.1.10 Module 1 Pack Structure (Legacy — See Section I.8 for v1.0 Pack Types)

> **v1.0 Update:** This section describes Module 1 pack structure. For v1.0 pack types (Regulator, Tender, Board, Insurer, Audit), see Section I.8. Module 1 data is used in all pack types.

**Note:** Module 1 data (permits, obligations, evidence) is used in all 5 pack types. Pack type determines content structure and presentation format. See Section I.8 for pack type-specific logic.

**Additional Module 1 Elements:**
- Permit summary (activities, regulator, permit number)
- Condition compliance matrix
- Improvement condition status summary
- ELV compliance summary (if applicable)
- Regulator contact information

---

### C.1.11 Enforcement Notice Workflow Logic

**Purpose:** Track and manage regulatory enforcement notices with full lifecycle management.

**State Machine:**
```
ISSUED (initial) → IN_RESPONSE (user submitting response) → CLOSED (resolved) or APPEALED (contesting)
```

**Business Rules:**

1. **Notice Creation Logic:**
   - Notice number must be unique per company
   - Notice date cannot be future date
   - Response deadline must be after notice date
   - Regulator must be one of: EA, SEPA, NRW
   - Notice types: WARNING, NOTICE, VARIATION, SUSPENSION, REVOCATION, PROSECUTION
   - Severity ranking: PROSECUTION > REVOCATION > SUSPENSION > NOTICE > VARIATION > WARNING

2. **State Transition Rules:**
   - **ISSUED → IN_RESPONSE:** Triggered when user submits response via "Submit Response" action
     - Requires: response_text (max 5000 characters)
     - Optional: response_document_url
     - Sets: response_submitted_at = NOW()
     - Validation: Must be before response_deadline
   - **IN_RESPONSE → CLOSED:** Triggered when user closes notice via "Close Notice" action
     - Requires: closure_notes explaining resolution
     - Sets: closed_at = NOW(), closed_by = current_user_id
     - Business Logic: System checks if all required corrective actions have evidence linked
   - **CLOSED → APPEALED:** Triggered when user appeals via "Appeal" action
     - Requires: appeal_reason
     - Optional: legal_representative_details
     - Sets: appealed_at = NOW()
     - Business Logic: Creates notification to company administrators

3. **Escalation Logic:**
   - If status = ISSUED and response_deadline in 7 days: Send HIGH priority notification
   - If status = ISSUED and response_deadline in 3 days: Send CRITICAL priority notification
   - If status = ISSUED and response_deadline passed: Send CRITICAL overdue notification (daily)
   - If notice_type IN (SUSPENSION, REVOCATION, PROSECUTION): Send immediate CRITICAL notification

4. **Evidence Linking Logic:**
   - User can link corrective action evidence to enforcement notice
   - Field: corrective_action_evidence_ids (UUID array)
   - Business Rule: Cannot close notice with status = CLOSED unless at least one evidence item linked for notice_type IN (SUSPENSION, REVOCATION, PROSECUTION)
   - Evidence types expected: CORRECTIVE_ACTION_REPORT, IMPROVEMENT_EVIDENCE, CORRESPONDENCE

5. **Reporting Logic:**
   - Dashboard widget: Count of ISSUED notices with response_deadline < 30 days
   - KPI: Average response time (response_submitted_at - notice_date) per regulator
   - KPI: Notice closure rate (CLOSED / Total notices) per site
   - Audit pack inclusion: All enforcement notices for site with status, response, closure details

---

### C.1.12 Compliance Decision Workflow Logic

**Purpose:** Track compliance decisions from regulators (permit applications, variations, transfers, surrenders) with evidence management.

**State Machine:**
```
PENDING (initial) → UNDER_REVIEW (internal review) → APPROVED or REJECTED (final decision)
```

**Business Rules:**

1. **Decision Creation Logic:**
   - Decision reference must be unique per company
   - Decision date cannot be future date
   - Decision types: PERMIT_APPLICATION, VARIATION, TRANSFER, SURRENDER
   - Regulator required (EA, SEPA, NRW)
   - Status must be PENDING on creation

2. **State Transition Rules:**
   - **PENDING → UNDER_REVIEW:** Triggered when compliance manager reviews decision
     - Requires: reviewer_id (user who initiated review)
     - Sets: review_started_at = NOW()
     - Business Logic: Sends notification to all users with Module 1 MANAGE permission
   - **PENDING/UNDER_REVIEW → APPROVED:** Triggered when decision approved
     - Requires: approval_notes
     - Sets: approved_at = NOW(), approved_by = current_user_id
     - Business Logic: 
       - If decision_type = PERMIT_APPLICATION: Prompt user to create new permit document
       - If decision_type = VARIATION: Prompt user to link to existing permit and create new permit version
       - If decision_type = TRANSFER: Update permit ownership
       - If decision_type = SURRENDER: Archive permit (soft delete with surrendered_at timestamp)
   - **PENDING/UNDER_REVIEW → REJECTED:** Triggered when decision rejected
     - Requires: rejection_reason
     - Sets: rejected_at = NOW(), rejected_by = current_user_id
     - Business Logic: Archives decision, sends notification to stakeholders

3. **Evidence Linking Logic:**
   - User can link multiple evidence items to compliance decision
   - Relationship: compliance_decisions ↔ evidence_items (many-to-many)
   - Evidence types expected: APPLICATION_FORM, REGULATOR_CORRESPONDENCE, DECISION_LETTER, SUPPORTING_DOCUMENTS
   - Business Rule: Must have at least one evidence item of type DECISION_LETTER before status can be APPROVED or REJECTED

4. **Impact Analysis Logic:**
   - When decision_type = VARIATION and status = APPROVED:
     - System identifies affected obligations by comparing old vs new permit version
     - Flags affected obligations with change_type: MODIFIED, ADDED, REMOVED
     - Generates obligation change audit trail
   - When decision_type = SURRENDER and status = APPROVED:
     - System marks all obligations for surrendered permit as ARCHIVED
     - Sets archived_at = decision.approved_at
     - Stops all deadline escalations for archived obligations

5. **Reporting Logic:**
   - Dashboard widget: Count of PENDING decisions awaiting review
   - KPI: Average decision processing time (approved_at - decision_date) per decision_type
   - KPI: Approval rate (APPROVED / Total decisions) per regulator
   - Audit pack inclusion: All compliance decisions for site with linked evidence

---

### C.1.13 Condition Evidence Rules Logic

**Purpose:** Define evidence requirements at individual condition level to calculate evidence completeness scores.

**Business Rules:**

1. **Rule Creation Logic:**
   - Condition evidence rule maps: permit_condition (obligation) → required_evidence_type + frequency
   - Fields:
     - condition_id (FK to obligations table where is_permit_condition = true)
     - evidence_type: CERTIFICATE, REPORT, LOG, PHOTO, INVOICE, CORRESPONDENCE, PERMIT, OTHER
     - frequency: ONCE, DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY, AD_HOC
     - mandatory: boolean (true = required for completeness, false = optional)
     - required_fields: JSONB (e.g., {"fields": ["date", "signature", "lab_accreditation"]})
     - format_validation: TEXT (e.g., "PDF, max 10MB")
     - expiry_duration_days: INTEGER (e.g., 365 = evidence expires after 1 year)
   - Validation: One condition can have multiple evidence rules (different evidence types)

2. **Evidence Type Logic:**
   - CERTIFICATE: Lab certificates, ISO certificates, accreditation certificates
     - Typical frequency: ANNUALLY
     - Typically has expiry_duration_days = 365
   - REPORT: Monitoring reports, inspection reports, compliance reports
     - Typical frequency: MONTHLY, QUARTERLY, ANNUALLY
     - May require specific sections present
   - LOG: Daily logs, run hour logs, maintenance logs
     - Typical frequency: DAILY, WEEKLY
     - Format validation: Excel, CSV, PDF
   - PHOTO: Visual evidence, site photos, equipment photos
     - Typical frequency: AD_HOC
     - Format validation: JPG, PNG
   - INVOICE: Payment invoices, disposal invoices
     - Typical frequency: AD_HOC
     - Required fields: date, amount, vendor

3. **Frequency Mapping to Obligation Schedule:**
   - When evidence rule frequency = DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUALLY:
     - System automatically generates schedule instances for linked obligation
     - Schedule due_date = obligation.due_date
     - Evidence submission expected per schedule instance
   - When evidence rule frequency = ONCE:
     - One evidence item required (no recurring schedule)
   - When evidence rule frequency = AD_HOC:
     - No automatic schedule generation
     - Evidence submitted as needed (user-initiated)

4. **Validation Logic:**
   - When user links evidence to obligation:
     - System checks if evidence_type matches any active evidence rule for that condition
     - If required_fields defined: Validates evidence metadata contains required fields
     - If format_validation defined: Validates file type and size
     - If expiry_duration_days defined: Calculates expiry_date = upload_date + expiry_duration_days
   - If validation fails: Shows error message, prevents linking

5. **Completeness Scoring Logic (See C.1.14):**
   - Evidence rules where mandatory = true contribute to completeness score
   - System calculates: (Evidence submitted / Evidence required) × 100

---

### C.1.14 Evidence Completeness Scoring Algorithm

**Purpose:** Automated calculation of evidence completeness per condition (0-100 integer score).

**Scoring Algorithm:**

```typescript
function calculateCompletenessScore(condition_id: UUID): integer {
  // Step 1: Get all mandatory evidence rules for this condition
  const mandatoryRules = db.query(`
    SELECT id, evidence_type, frequency 
    FROM condition_evidence_rules 
    WHERE condition_id = $1 
      AND mandatory = true 
      AND status = 'ACTIVE'
      AND deleted_at IS NULL
  `, [condition_id]);
  
  if (mandatoryRules.length === 0) {
    return 100; // No evidence required = 100% complete
  }
  
  // Step 2: Count evidence required
  let evidenceRequired = 0;
  for (const rule of mandatoryRules) {
    if (rule.frequency === 'ONCE') {
      evidenceRequired += 1;
    } else if (rule.frequency IN ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']) {
      // Count schedule instances in last 12 months
      const scheduleCount = db.query(`
        SELECT COUNT(*) 
        FROM schedules 
        WHERE obligation_id IN (
          SELECT id FROM obligations WHERE condition_id = $1
        )
        AND due_date >= NOW() - INTERVAL '12 months'
        AND due_date <= NOW()
      `, [condition_id]).count;
      evidenceRequired += scheduleCount;
    }
    // AD_HOC frequency does not contribute to required count
  }
  
  // Step 3: Count evidence submitted
  let evidenceSubmitted = 0;
  for (const rule of mandatoryRules) {
    const linkedEvidence = db.query(`
      SELECT COUNT(*) 
      FROM evidence_items ei
      JOIN obligation_evidence oe ON ei.id = oe.evidence_id
      JOIN obligations o ON oe.obligation_id = o.id
      WHERE o.condition_id = $1
        AND ei.evidence_type = $2
        AND ei.deleted_at IS NULL
        AND (ei.expiry_date IS NULL OR ei.expiry_date > NOW())
    `, [condition_id, rule.evidence_type]).count;
    
    evidenceSubmitted += linkedEvidence;
  }
  
  // Step 4: Calculate score
  const score = Math.round((evidenceSubmitted / evidenceRequired) * 100);
  return Math.min(score, 100); // Cap at 100
}
```

**Score Interpretation:**

| Score Range | Status | Badge Color | Meaning |
|-------------|--------|-------------|---------|
| 80-100 | COMPLETE | Green | Evidence requirements met |
| 50-79 | PARTIAL | Yellow | Some evidence missing |
| 0-49 | MISSING | Red | Significant evidence gaps |

**Business Rules:**

1. **Score Calculation Triggers:**
   - Recalculate score when:
     - Evidence linked to obligation for this condition
     - Evidence unlinked from obligation for this condition
     - Evidence expires (expiry_date passes)
     - Evidence rule created/updated/deleted for this condition
     - Evidence rule status changed (ACTIVE ↔ INACTIVE)

2. **Score Storage:**
   - Table: evidence_completeness_scores
   - Fields: condition_id, score (0-100), evidence_required_count, evidence_submitted_count, missing_evidence_types (TEXT[]), last_calculated_at
   - Updated via background job (runs daily) or on-demand via API

3. **Missing Evidence Types Logic:**
   - System identifies which evidence_types are missing:
     ```sql
     SELECT DISTINCT cer.evidence_type
     FROM condition_evidence_rules cer
     WHERE cer.condition_id = $1
       AND cer.mandatory = true
       AND NOT EXISTS (
         SELECT 1 FROM evidence_items ei
         JOIN obligation_evidence oe ON ei.id = oe.evidence_id
         JOIN obligations o ON oe.obligation_id = o.id
         WHERE o.condition_id = cer.condition_id
           AND ei.evidence_type = cer.evidence_type
           AND (ei.expiry_date IS NULL OR ei.expiry_date > NOW())
       )
     ```
   - Stored in missing_evidence_types array for dashboard display

4. **Aggregation Logic:**
   - Site-level completeness score:
     ```
     AVG(evidence_completeness_scores.score) 
     WHERE condition_id IN (site's permit conditions)
     ```
   - Module 1 dashboard widget: Distribution of scores (count of COMPLETE, PARTIAL, MISSING)

---

### C.1.15 Condition Permissions Logic

**Purpose:** Granular permission management at individual condition level (beyond role-based access).

**Permission Levels:**

| Level | Capabilities |
|-------|-------------|
| VIEW | View condition details, linked evidence, schedules (read-only) |
| EDIT | VIEW + Link/unlink evidence, update obligation details, create schedules |
| MANAGE | EDIT + Create/delete obligations, assign permissions to others, delete condition |

**Business Rules:**

1. **Permission Assignment Logic:**
   - Permissions can be assigned to:
     - Individual users (user_id)
     - Roles (role_id) - applies to all users with that role
   - One condition can have multiple permissions (many-to-many)
   - Permission precedence: User-specific permission > Role permission > Company default permission
   - Example: If user has EDIT via user_id and VIEW via role_id, EDIT takes precedence

2. **Permission Validation Logic:**
   - On every API request for condition-related action:
     ```typescript
     function hasConditionPermission(user_id: UUID, condition_id: UUID, required_level: 'VIEW' | 'EDIT' | 'MANAGE'): boolean {
       // Check user-specific permission
       const userPermission = db.query(`
         SELECT permission_level FROM condition_permissions
         WHERE condition_id = $1 AND user_id = $2 AND deleted_at IS NULL
       `, [condition_id, user_id]).permission_level;
       
       if (userPermission && meetsLevel(userPermission, required_level)) {
         return true;
       }
       
       // Check role-based permission
       const rolePermissions = db.query(`
         SELECT permission_level FROM condition_permissions cp
         JOIN user_roles ur ON cp.role_id = ur.role_id
         WHERE cp.condition_id = $1 AND ur.user_id = $2 AND cp.deleted_at IS NULL
       `, [condition_id, user_id]);
       
       for (const perm of rolePermissions) {
         if (meetsLevel(perm.permission_level, required_level)) {
           return true;
         }
       }
       
       return false; // No permission found
     }
     
     function meetsLevel(granted: string, required: string): boolean {
       const hierarchy = { VIEW: 1, EDIT: 2, MANAGE: 3 };
       return hierarchy[granted] >= hierarchy[required];
     }
     ```

3. **Permission Inheritance Logic:**
   - Condition permissions DO NOT inherit from site/company permissions
   - Rationale: Conditions may contain sensitive data requiring explicit access control
   - Users with company ADMIN role automatically have MANAGE permission on all conditions
   - Site MANAGER role automatically has EDIT permission on all conditions for their site

4. **Permission Revocation Logic:**
   - When permission revoked (deleted_at = NOW()):
     - User immediately loses access
     - Any in-progress edits by that user are saved with audit trail
     - User sees "Access Denied" message on next page load
   - When user role changes:
     - System recalculates effective permissions
     - If user had MANAGE via role and role downgraded to VIEW: User loses MANAGE

5. **Audit Trail:**
   - All permission grants/revocations logged in audit_trail table
   - Fields logged: action (GRANT_PERMISSION, REVOKE_PERMISSION), permission_level, target_user_id, granted_by_user_id, timestamp
   - Permission usage tracked: Every condition access logs user_id, condition_id, action (VIEW, EDIT, MANAGE), timestamp


## C.2 Module 2 — Trade Effluent Consents

### C.2.1 Supported Document Types

| Document Type | Issuer | Pattern |
|---------------|--------|---------|
| Trade Effluent Consent | Water Company | "Trade Effluent Consent", "Consent to Discharge" |
| Discharge Permit | Water Company | "Discharge Permit", "Trade Effluent Permit" |

**Water Company Patterns:**
- Thames Water, Severn Trent, Anglian Water, United Utilities, Yorkshire Water, etc.
- Detection: Company name in document header/footer

### C.2.2 Parameter Extraction Rules

**Parameter Identification:**

| Parameter | Keywords | Unit |
|-----------|----------|------|
| BOD (Biochemical Oxygen Demand) | "BOD", "biochemical oxygen demand" | mg/l |
| COD (Chemical Oxygen Demand) | "COD", "chemical oxygen demand" | mg/l |
| SS (Suspended Solids) | "SS", "suspended solids", "TSS" | mg/l |
| pH | "pH" | pH units |
| Temperature | "temperature", "temp" | °C |
| FOG (Fats, Oils, Grease) | "FOG", "fats oils grease", "oil and grease" | mg/l |
| Ammonia | "ammonia", "ammoniacal nitrogen" | mg/l |
| Phosphorus | "phosphorus", "total P" | mg/l |

**Extraction Output:**
```json
{
  "parameter_name": "BOD",
  "limit_value": 300,
  "unit": "mg/l",
  "limit_type": "Maximum",
  "sampling_frequency": "Weekly",
  "confidence_score": 0.92
}
```

### C.2.3 Parameter Limit Logic

**Limit Types:**
- Maximum: "shall not exceed", "maximum", "≤"
- Average: "average", "mean"
- Range: "between X and Y", "X-Y"

**Limit Enforcement:**
- System tracks parameter values over time
- User enters lab results OR uploads CSV
- System compares value to limit

**Discharge Volume Calculations:**
- System tracks discharge volumes if provided in lab results or consent documents
- Volume tracking used for surcharge calculations (water company billing)
- Formula: Volume (m³) × Parameter Value (mg/l) = Total Discharge (g)
- Surcharge prevention: Alert when approaching volume limits or when parameter values approach limits (80% threshold)
- Volume data stored per sample date for trending and reporting
- Used in water company report generation (Section C.2.8)

### C.2.4 Exceedance Detection Logic

**Threshold Alerts:**

| Threshold | Action |
|-----------|--------|
| Value reaches 80% of limit | ⚠️ Warning alert |
| Value reaches 100% of limit | 🔴 Breach alert |
| Value exceeds limit | 🔴 Exceedance recorded + immediate escalation |

**Exceedance Record:**
```json
{
  "exceedance_id": "uuid",
  "parameter_id": "uuid",
  "recorded_value": 350,
  "limit_value": 300,
  "percentage_of_limit": 116.7,
  "recorded_date": "2024-06-15",
  "sample_id": "LAB-2024-001",
  "status": "Open",
  "resolution_notes": null
}
```

### C.2.5 Trend Logic

**Trend Calculation:**
- System calculates 3-month rolling average for each parameter
- Trend displayed on dashboard: ↑ Increasing, ↓ Decreasing, → Stable
- Alert if trend approaches 80% threshold

**Trend Warning:**
- If 3 consecutive results >70% of limit → Trend warning
- If rolling average >75% of limit → Elevated concern flag

### C.2.6 Sampling Schedule Logic

**Schedule Generation:**
- Based on frequency extracted from consent
- If not specified, default based on parameter:
  - pH, Temperature: Daily
  - BOD, COD, SS: Weekly
  - Others: Monthly

**Schedule Customisation:**
- User can adjust frequency (more frequent only, not less)
- Reduced frequency requires consent variation

### C.2.7 Lab Result Ingestion Logic

**Primary Capture Methods (V1 Requirements):**
1. **Email Parsing (Primary):** Automated parsing of lab certificate emails with OCR text extraction
   - System monitors designated email inbox for lab certificates
   - Attachments (PDF, images) automatically extracted and processed
   - OCR extracts parameter values, sample dates, lab references
   - Extracted data flagged for user review before acceptance
   - Email metadata (sender, date, subject) stored for audit trail
2. **CSV Upload (Primary Fallback):** Template provided; maps columns to parameters
   - Standard CSV template with required columns
   - Bulk import support for multiple samples
   - Validation and error reporting before import
   - CSV import traceability via `csv_import_id` for audit trail

**Secondary Capture Methods:**
3. **Manual Entry:** Form with parameter dropdowns, value input (for corrections or missing data)
4. **PDF Upload:** Direct PDF upload with LLM extraction (flagged for review)

**CSV Template Columns:**
- Sample Date (required)
- Sample ID (optional)
- Parameter (required)
- Value (required)
- Unit (required)
- Lab Reference (optional)

**Validation Rules:**
- Value must be numeric
- Unit must match parameter expected unit
- Date must not be future
- Duplicate sample dates flagged for review

**Anomaly Detection and Auto-Flagging:**
- **Anomaly Detection:** System automatically flags lab submissions with anomalies:
  - Values significantly outside historical range (>3 standard deviations)
  - Missing required parameters for sampling period
  - Duplicate sample IDs or dates
  - Parameter values inconsistent with expected units
  - Lab reference format mismatches
- **Auto-Create Corrective Task:** When anomalies detected:
  - System creates corrective action task automatically
  - Task type: `LAB_RESULT_ANOMALY`
  - Task assigned to: Site Manager (or user who submitted result)
  - Task description: "Anomaly detected in lab result [sample_id]: [anomaly_description]"
  - Task requires: Evidence of investigation and resolution
  - Task due date: 7 days from anomaly detection
  - Notification sent to assigned user
  - Corrective task linked to lab result record for traceability

**Integration Fallback Strategy:**
- **V1 MUST:** Email parsing and CSV upload are the primary capture methods
- Any integration with lab portals is a future enhancement and must not delay V1 release
- Pack generation remains fully functional using email/CSV captured data
- Completeness scoring ensures operational defensibility regardless of integration availability

### C.2.8 Water Company Report Formatting

**Report Types:**
- Monthly summary
- Quarterly compliance report
- Annual return

**Report Contents:**
- Consent reference
- Reporting period
- Parameter values (all samples)
- Exceedances (if any)
- Corrective actions taken

**Format:**
- PDF export
- CSV data export
- Formatted per water company requirements (template library)

### C.2.9 Corrective Action Workflows (Module 2)

**Purpose:** Structured response to parameter exceedances and breaches.

**Integration with Module 2:**
- Trade Effluent exceedances (parameter limits breached) automatically trigger corrective action creation
- Corrective action lifecycle: TRIGGER → INVESTIGATION → ACTION → RESOLUTION → CLOSURE (see Section C.4.6 for detailed lifecycle)
- Corrective action items track remediation tasks (e.g., "Repair grease trap", "Update sampling procedure")
- Resolution evidence required before moving to CLOSURE phase
- If `regulator_notification_required = true`, must attach water company notification evidence

**Module 2-Specific Triggers:**
- Parameter value exceeds limit (100%+)
- 3 consecutive results >80% of limit (trend warning escalation)
- Consent breach (volume or quality)
- Sampling chain break (missed sampling window)

**See Section C.4.6 (Corrective Action Lifecycle) and C.4.7 (Corrective Action Items) for complete business logic.**

### C.2.10 Module 2 Audit Pack Structure

**Additional Module 2 Elements:**
- Consent summary (water company, consent number)
- Parameter compliance matrix
- Exceedance history
- Trend charts (3-month, 12-month)
- Lab result appendix
- Corrective action history (breaches and resolutions)

### C.2.11 Module 2 Pack Generation Requirements

**Purpose:** Ensure Trade Effluent packs can only be generated when all required evidence is complete and validated.

**Pre-Generation Validation (Module 2 Specific):**
Before generating any pack type (Regulator, Tender, Board, Insurer, Audit) for Module 2, system MUST validate:

1. **All Sampling Periods Have Results:**
   - For each active consent parameter with a sampling frequency requirement:
     - System checks all sampling periods within the pack date range
     - Each sampling period MUST have at least one lab result record
     - Missing results block pack generation with error: "Cannot generate pack: Missing lab results for [parameter_name] in period [period_start] to [period_end]"
   - Sampling periods are calculated based on:
     - Parameter sampling frequency (daily, weekly, monthly, quarterly)
     - Pack date range specified by user
     - Consent effective dates
   - Example: If parameter requires weekly sampling and pack covers 4 weeks, all 4 weekly periods must have results

2. **All Results Have Validated Evidence:**
   - For each lab result included in the pack:
     - Lab result MUST have at least one evidence item linked
     - Evidence item MUST have `is_approved = true`, `reviewer_id IS NOT NULL`, and `approved_at IS NOT NULL`
     - Evidence items with `is_approved = false` or missing approval fields do not satisfy requirement
     - Missing or unapproved evidence blocks pack generation with error: "Cannot generate pack: Lab result [sample_id] for [parameter_name] on [sample_date] lacks approved evidence"
   - Evidence approval workflow:
     - Lab certificates uploaded via email parsing or CSV import are initially unapproved (`is_approved = false`)
     - Manager/Admin must review and approve evidence (sets `is_approved = true`, `reviewer_id`, `approved_at`)
     - System can auto-approve evidence from trusted sources (sets `is_approved = true`, `reviewer_id = system_user_id`, `approved_at = NOW()`)
     - Unapproved evidence cannot be used in packs

**Pack Generation Blocking Logic:**
```
FOR ALL pack types:
  FOR EACH obligation in pack date range DO
    FOR EACH evidence item linked to obligation DO
      IF evidence.is_approved = false THEN
        BLOCK generation with error: "Evidence [file_name] not approved"
      END IF
      IF evidence.reviewer_id IS NULL THEN
        BLOCK generation with error: "Evidence [file_name] missing reviewer"
      END IF
      IF evidence.approved_at IS NULL THEN
        BLOCK generation with error: "Evidence [file_name] missing approval timestamp"
      END IF
    END FOR
  END FOR
END FOR

IF pack_type includes Module 2 data THEN
  FOR EACH consent parameter in pack date range DO
    FOR EACH sampling period DO
      IF no lab result exists THEN
        BLOCK generation with error message
      END IF
      FOR EACH lab result DO
        IF no approved evidence linked THEN
          BLOCK generation with error message
        END IF
      END FOR
    END FOR
  END FOR
END IF
```

**Error Messages:**
- "Cannot generate pack: Missing lab results for [parameter_name] in period [period_start] to [period_end]"
- "Cannot generate pack: Lab result [sample_id] for [parameter_name] on [sample_date] lacks approved evidence"
- "Cannot generate pack: [count] sampling periods missing results. Please complete all sampling requirements before generating pack."
- "Cannot generate pack: Evidence item [file_name] (ID: [evidence_id]) has not been approved. Please approve all evidence items before generating pack."
- "Cannot generate pack: Evidence item [file_name] (ID: [evidence_id]) is missing reviewer information. Please approve evidence with reviewer details."
- "Cannot generate pack: Evidence item [file_name] (ID: [evidence_id]) is missing approval timestamp. Please approve evidence to record approval time."

**User Actions When Blocked:**
- System displays list of missing results and unapproved evidence
- User can:
  1. Upload missing lab results
  2. Link evidence to existing lab results
  3. Approve pending evidence items (sets `is_approved = true`, `reviewer_id`, `approved_at`)
  4. Adjust pack date range to exclude incomplete periods (if acceptable)
- Once all requirements met (all evidence approved with reviewer_id and approved_at), pack generation proceeds

**Pack Generation Success:**
- When all validation checks pass, pack generation proceeds normally
- Pack includes all validated lab results with evidence links
- Evidence items are version-locked at generation time
- Pack provenance signature includes evidence completeness validation timestamp

---


### C.2.11 Sampling Logistics Workflow Logic

**Purpose:** Track lab sampling from scheduling through certificate linking with 5-stage workflow.

**State Machine:**
```
SCHEDULED (initial) → SAMPLE_COLLECTED → SUBMITTED_TO_LAB → RESULTS_RECEIVED → CERTIFICATE_LINKED (final)
```

**Business Rules:**

1. **Sampling Record Creation Logic:**
   - Sample ID must be unique per company
   - Sampling date cannot be more than 30 days in future
   - Lab must be from approved labs list
   - Parameters must match consent parameters
   - Initial status = SCHEDULED

2. **State Transition Rules:**
   - **SCHEDULED → SAMPLE_COLLECTED:**
     - Triggered by: User clicks "Mark Collected" button
     - Sets: collection_time = user input, collector_name = user input
     - Optional: Chain of custody document upload
     - Validation: collection_time must be <= NOW()
   
   - **SAMPLE_COLLECTED → SUBMITTED_TO_LAB:**
     - Triggered by: User clicks "Submit to Lab" button
     - Requires: lab_reference_number (provided by lab)
     - Sets: submitted_to_lab_at = NOW()
     - Optional: expected_turnaround_date (calculated as submitted_to_lab_at + lab.typical_turnaround_days)
     - Business Logic: Sends email notification to lab contact (if email provided)
   
   - **SUBMITTED_TO_LAB → RESULTS_RECEIVED:**
     - Triggered by: Lab results imported (either manual upload or API integration)
     - Sets: results_received_at = NOW()
     - Business Logic: 
       - System matches lab results to sampling record by lab_reference_number or sample_id
       - Creates lab_results records for each parameter tested
       - Flags exceedances if result > consent limit
   
   - **RESULTS_RECEIVED → CERTIFICATE_LINKED:**
     - Triggered by: User clicks "Link Certificate" button
     - Requires: certificate_document_id (FK to evidence_items)
     - Sets: certificate_linked_at = NOW()
     - Validation: Certificate must be PDF, max 10MB
     - Business Logic:
       - Links certificate as evidence to related obligation
       - Creates obligation_evidence relationship
       - Marks sampling workflow as COMPLETE

3. **Lab Accreditation Tracking:**
   - Each lab has: lab_name, accreditation_body (UKAS, MCERTS, etc.), accreditation_number, accreditation_expiry_date
   - Business Rule: System displays warning if lab.accreditation_expiry_date < NOW() + 30 days
   - Business Rule: Cannot submit to lab if lab.accreditation_expiry_date < NOW() (expired accreditation)

4. **Turnaround Time Tracking:**
   - Calculated: turnaround_time = results_received_at - submitted_to_lab_at (in days)
   - KPI: Average turnaround time per lab (rolling 12 months)
   - Alert: If turnaround_time > expected_turnaround_date + 3 days: Send notification to site manager

5. **Parameter Testing Logic:**
   - When sampling record created, user selects parameters to be tested
   - System validates parameters match consent parameters
   - When results received:
     - System creates lab_results record for each parameter
     - Fields: parameter_name, result_value, unit, test_method, test_date, lab_reference
     - Exceedance detection: If result_value > consent_parameter.limit_value: Set exceedance_flag = true

---

### C.2.12 Monthly Statement Reconciliation Logic

**Purpose:** Reconcile water company monthly statements (billed volumes) with actual discharge volumes recorded in system.

**Auto-Reconciliation Algorithm:**

```typescript
async function autoReconcileMonthlyStatement(statement_id: UUID) {
  // Step 1: Get statement details
  const statement = await db.query(`
    SELECT site_id, consent_id, month, year, volume_billed_m3, concentration_billed_mg_l
    FROM monthly_statements
    WHERE id = $1
  `, [statement_id]);
  
  // Step 2: Get discharge volumes for same month/year
  const dischargeVolumes = await db.query(`
    SELECT SUM(volume_m3) as total_discharged, AVG(concentration_mg_l) as avg_concentration
    FROM discharge_volumes
    WHERE site_id = $1 
      AND consent_id = $2
      AND EXTRACT(MONTH FROM discharge_date) = $3
      AND EXTRACT(YEAR FROM discharge_date) = $4
      AND deleted_at IS NULL
  `, [statement.site_id, statement.consent_id, statement.month, statement.year]);
  
  // Step 3: Calculate variance
  const volumeBilled = statement.volume_billed_m3;
  const volumeDischarged = dischargeVolumes.total_discharged || 0;
  const variance = volumeBilled - volumeDischarged;
  const variancePercentage = (variance / volumeBilled) * 100;
  
  // Step 4: Determine reconciliation status
  let reconciliationStatus: string;
  if (Math.abs(variancePercentage) <= 5) {
    reconciliationStatus = 'MATCHED'; // Within ±5% tolerance
  } else {
    reconciliationStatus = 'DISCREPANCY'; // Outside tolerance
  }
  
  // Step 5: Create reconciliation record
  await db.query(`
    INSERT INTO monthly_statement_reconciliations (
      statement_id, volume_billed_m3, volume_discharged_m3, 
      variance_m3, variance_percentage, status, reconciled_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [statement_id, volumeBilled, volumeDischarged, variance, variancePercentage, reconciliationStatus]);
  
  // Step 6: Update statement status
  await db.query(`
    UPDATE monthly_statements 
    SET reconciliation_status = $1, reconciled_at = NOW()
    WHERE id = $2
  `, [reconciliationStatus, statement_id]);
  
  // Step 7: Send notification if DISCREPANCY
  if (reconciliationStatus === 'DISCREPANCY') {
    await sendNotification({
      type: 'RECONCILIATION_DISCREPANCY',
      severity: 'HIGH',
      message: `Monthly statement variance ${variancePercentage.toFixed(1)}% exceeds tolerance`,
      statement_id,
      site_id: statement.site_id
    });
  }
  
  return { reconciliationStatus, variance, variancePercentage };
}
```

**Business Rules:**

1. **Tolerance Logic:**
   - Tolerance = ±5% variance between billed and discharged volumes
   - Rationale: Allows for measurement uncertainty, meter calibration differences, rounding
   - Status mapping:
     - |variance_percentage| ≤ 5%: MATCHED (green badge)
     - |variance_percentage| > 5%: DISCREPANCY (red badge)

2. **Discrepancy Investigation Logic:**
   - When status = DISCREPANCY:
     - User must provide investigation_notes explaining variance
     - User can mark as RESOLVED with resolution_notes
     - Common reasons: Meter calibration error, data entry error, unmetered discharge, billing error
   - Business Rule: Cannot archive statement until status = MATCHED or RESOLVED

3. **Volume Breakdown Logic:**
   - Reconciliation detail page shows daily discharge volume breakdown for month:
     - Table: Date | Volume Discharged (m³) | Meter Reading | Notes
     - Chart: Bar chart showing daily volumes
   - Helps user identify missing days or anomalies

4. **Concentration Reconciliation (Optional):**
   - If both concentration_billed_mg_l and lab results available:
     - Calculate avg_concentration_discharged from lab_results for month
     - Compare billed vs lab results
     - Status: CONCENTRATION_MATCHED or CONCENTRATION_DISCREPANCY
   - Note: Less critical than volume reconciliation (volume determines billing)

5. **Reporting Logic:**
   - Dashboard widget: Count of DISCREPANCY statements awaiting investigation
   - KPI: Reconciliation rate (MATCHED / Total statements) per site
   - KPI: Average variance percentage per site (rolling 12 months)
   - Alert: If 3 consecutive months show DISCREPANCY: Escalate to senior management

---

### C.2.13 Consent State Machine Logic

**Purpose:** Track consent lifecycle through 10 defined states with validated transitions.

**State Machine Definition:**

```
States (10):
1. DRAFT - Consent being prepared (not yet submitted)
2. APPLICATION_SUBMITTED - Consent application submitted to water company
3. UNDER_REVIEW - Water company reviewing application
4. APPROVED - Water company approved consent (not yet active)
5. ACTIVE - Consent is active and in force
6. SUSPENDED - Consent temporarily suspended by water company
7. EXPIRED - Consent expiry date passed
8. RENEWED - Consent renewed (creates new consent version)
9. SURRENDERED - Site voluntarily surrendered consent
10. REVOKED - Water company revoked consent
```

**Allowed Transitions (State Machine):**

| From State | To States (Allowed) |
|------------|---------------------|
| DRAFT | APPLICATION_SUBMITTED |
| APPLICATION_SUBMITTED | UNDER_REVIEW |
| UNDER_REVIEW | APPROVED, DRAFT (if rejected) |
| APPROVED | ACTIVE |
| ACTIVE | SUSPENDED, EXPIRED, RENEWED, SURRENDERED, REVOKED |
| SUSPENDED | ACTIVE, REVOKED |
| EXPIRED | RENEWED |
| RENEWED | ACTIVE |
| SURRENDERED | (terminal state) |
| REVOKED | (terminal state) |

**Business Rules:**

1. **State Transition Validation:**
   - System enforces allowed transitions via database constraint or API validation
   - Attempting invalid transition returns error: "Cannot transition from {current_state} to {new_state}"
   - Example: Cannot go from DRAFT directly to ACTIVE (must go through APPLICATION_SUBMITTED → UNDER_REVIEW → APPROVED → ACTIVE)

2. **Transition Requirements:**
   - **DRAFT → APPLICATION_SUBMITTED:**
     - Requires: application_document_id (evidence item)
     - Sets: application_submitted_date = NOW()
   - **UNDER_REVIEW → APPROVED:**
     - Requires: approval_document_id (consent document)
     - Sets: approved_date = NOW(), consent_start_date, consent_expiry_date
   - **APPROVED → ACTIVE:**
     - Requires: consent_start_date <= NOW()
     - Sets: activated_date = NOW()
     - Business Logic: Activates all obligations linked to consent
   - **ACTIVE → EXPIRED:**
     - Triggered automatically: Background job checks if consent_expiry_date < NOW()
     - Sets: expired_date = NOW()
     - Business Logic: Deactivates all obligations, sends expiry notification
   - **ACTIVE → RENEWED:**
     - Requires: new_consent_version_id (FK to new consent record)
     - Sets: renewed_date = NOW()
     - Business Logic: Creates new consent version, copies obligations to new version
   - **ACTIVE → SUSPENDED:**
     - Requires: suspension_reason, suspension_document_id
     - Sets: suspended_date = NOW()
     - Business Logic: Pauses all obligation deadlines (deadline_paused = true)
   - **SUSPENDED → ACTIVE:**
     - Requires: reactivation_document_id
     - Sets: reactivated_date = NOW()
     - Business Logic: Resumes all obligation deadlines (deadline_paused = false), recalculates due dates
   - **ACTIVE → REVOKED:**
     - Requires: revocation_reason, revocation_document_id
     - Sets: revoked_date = NOW()
     - Business Logic: Archives all obligations, sends critical notification

3. **State Change Audit Trail:**
   - Table: consent_state_history (or consent_states as per database schema)
   - Fields: consent_id, previous_state, new_state, transition_date, reason, triggered_by_user_id, document_id
   - Every state transition creates audit record

4. **Automated State Transitions:**
   - Background job runs daily (cron: 00:00 UTC):
     - Check all consents where state = ACTIVE AND consent_expiry_date < NOW()
     - Transition to EXPIRED
     - Send expiry notifications 90 days, 60 days, 30 days, 14 days, 7 days before expiry

5. **Obligation Impact Logic:**
   - State changes affect obligations:
     - ACTIVE: Obligations active, deadlines enforced
     - SUSPENDED: Obligations paused, deadlines frozen
     - EXPIRED: Obligations deactivated, no new deadlines
     - REVOKED: Obligations archived, compliance monitoring stops
     - SURRENDERED: Obligations archived, site closed

---

### C.2.14 Corrective Actions Workflow Logic

**Purpose:** Manage corrective actions for parameter exceedances with priority-based tracking.

**State Machine:**
```
PLANNED (initial) → IN_PROGRESS → COMPLETED → VERIFIED (final) or CANCELLED
```

**Business Rules:**

1. **Corrective Action Creation Logic:**
   - Created in response to exceedance event
   - Required fields:
     - exceedance_id (FK to exceedances table)
     - description (what action will be taken)
     - priority: LOW, MEDIUM, HIGH, CRITICAL
     - due_date (deadline for completion)
     - assigned_to_user_id (responsible person)
   - Optional fields:
     - estimated_cost
     - root_cause_analysis
     - preventive_measures

2. **Priority Assignment Logic:**
   - Auto-determined based on exceedance severity:
     ```typescript
     function determineActionPriority(exceedance: Exceedance): Priority {
       const exceedanceRatio = exceedance.measured_value / exceedance.limit_value;
       
       if (exceedanceRatio >= 2.0) {
         return 'CRITICAL'; // Value ≥ 2x limit
       } else if (exceedanceRatio >= 1.5) {
         return 'HIGH'; // Value ≥ 1.5x limit
       } else if (exceedanceRatio >= 1.2) {
         return 'MEDIUM'; // Value ≥ 1.2x limit
       } else {
         return 'LOW'; // Value slightly over limit
       }
     }
     ```
   - User can override auto-assigned priority with justification

3. **State Transition Rules:**
   - **PLANNED → IN_PROGRESS:**
     - Triggered by: assigned user clicks "Start Action"
     - Sets: started_at = NOW()
     - Business Logic: Sends notification to site manager
   
   - **IN_PROGRESS → COMPLETED:**
     - Triggered by: assigned user clicks "Mark Complete"
     - Requires: completion_notes, evidence_document_ids (proof of completion)
     - Sets: completed_at = NOW(), completed_by = current_user_id
     - Validation: Must have at least one evidence document
   
   - **COMPLETED → VERIFIED:**
     - Triggered by: site manager/supervisor clicks "Verify"
     - Requires: verification_notes
     - Sets: verified_at = NOW(), verified_by = current_user_id
     - Business Logic: Links evidence to related obligation for audit trail
   
   - **PLANNED/IN_PROGRESS → CANCELLED:**
     - Triggered by: manager clicks "Cancel Action"
     - Requires: cancellation_reason
     - Sets: cancelled_at = NOW(), cancelled_by = current_user_id
     - Use case: Action no longer needed, duplicate action, alternative solution implemented

4. **Escalation Logic:**
   - If priority = CRITICAL and status = PLANNED for > 24 hours:
     - Send escalation to site director
   - If priority = HIGH and status = PLANNED for > 3 days:
     - Send escalation to site manager
   - If due_date < NOW() + 3 days and status != COMPLETED:
     - Send daily reminders to assigned_to_user_id
   - If due_date < NOW() and status != COMPLETED:
     - Mark as OVERDUE
     - Send critical notification to site manager and assigned user

5. **Root Cause Analysis Logic:**
   - After completion, system prompts for root cause:
     - Equipment failure
     - Process upset
     - Human error
     - External factors (weather, supply issue)
     - Design limitation
     - Maintenance issue
   - User selects root cause category and provides detailed description
   - System tracks root cause distribution for trend analysis

6. **Preventive Measures Tracking:**
   - User documents preventive measures taken to avoid recurrence
   - Common measures:
     - Equipment upgrade/replacement
     - Process modification
     - Additional training
     - Enhanced monitoring
     - Maintenance schedule adjustment
   - System links preventive measures to obligations for future reference

7. **Reporting Logic:**
   - Dashboard widget: Count of IN_PROGRESS and OVERDUE actions per site
   - KPI: Average completion time (completed_at - created_at) per priority level
   - KPI: Verification rate (VERIFIED / COMPLETED) per site
   - Trend chart: Corrective actions count per month (indicates process stability)
   - Root cause distribution pie chart (last 12 months)

## C.3 Module 3 — MCPD/Generator Compliance

### C.3.1 Supported Document Types

| Document Type | Pattern |
|---------------|---------|
| MCPD Registration | "MCPD Registration", "Medium Combustion Plant" |
| Specified Generator Registration | "Specified Generator", "Tranche A/B" |
| Generator Permit | "Generator Permit", "Standby Generator" |

### C.3.2 Run-Hour Tracking Rules

**Run-Hour Limits:**

| Generator Type | Typical Annual Limit | Source |
|----------------|---------------------|--------|
| MCPD 1-5MW | 500 hours/year | MCPD Regulations |
| MCPD 5-50MW | 500 hours/year | MCPD Regulations |
| Specified Generator | 50 hours/year | MCP/Specified Generator Regs |
| Emergency Generator | Varies | Permit-specific |

**Run-Hour Entry Methods:**
1. **Manual Entry:** User logs hours per generator per period
2. **Maintenance Record Link:** Extract run-hours from maintenance logs
3. **CSV Import:** Bulk import with date/generator/hours columns

### C.3.3 Limit Logic

### C.1 Module 1: Environmental Permits

### C.3.3 Limit Logic

**Limit Calculation:**
- Annual limit tracked from registration anniversary date
- Running total calculated: Sum of all entries from anniversary
- Remaining hours displayed: Limit - Running total

**Limit Monitoring:**

| Threshold | Action |
|-----------|--------|
| 80% of annual limit reached | ⚠️ Warning alert |
| 90% of annual limit reached | 🟠 Elevated warning |
| 100% of annual limit reached | 🔴 Breach alert - operations should cease |

### C.3.4 Aggregation Rules

**Multi-Generator Sites:**
- Each generator tracked individually
- Site-level aggregation available
- Company-level aggregation available (all sites)

**Aggregation Display:**
```
Site: Factory A
├─ Generator 1: 150 hours (30% of 500h limit)
├─ Generator 2: 200 hours (40% of 500h limit)
└─ Total Site Run-Hours: 350 hours
```

### C.3.5 Maintenance Logic

**Maintenance Record Linking:**
- Maintenance records can be linked to generators
- Extract run-hours from maintenance records (if present)
- Maintenance evidence satisfies "Maintenance" category obligations

**Maintenance Schedule:**
- System tracks recommended service intervals
- Alerts: 30 days, 7 days before next service due
- Service overdue: Flag on dashboard

### C.3.6 Stack Test Scheduling

**Stack Test Requirements:**
- MCPD regulations require periodic stack testing
- Frequency varies by capacity and emission type

**Schedule Generation:**
- Based on registration requirements
- Default: Annual (if not specified)
- Reminder: 60 days, 30 days, 7 days before due

**Evidence:**
- Stack test report (PDF)
- Results linked to generator
- Exceedances flagged (using ELV logic from Module 1)

### C.3.7 Emissions Logic

**Emissions Tracking:**
- NOx, SO2, CO, particulates (as specified in registration)
- Values entered from stack test results
- Compared against ELVs in registration

**Emissions Calculations:**
- If run-hours + emission rates provided, system calculates annual emissions
- Formula: Annual Emissions = (Run Hours) × (Emission Rate)
- Displayed in AER preparation dashboard

### C.3.8 Annual Return (AER) Logic

**AER = Annual Emissions Report**

**Data Required:**
- Total run-hours per generator
- Fuel consumption
- Emission results (from stack tests)
- Any incidents/breakdowns

**AER Document Structure:**
- **EA Standard Format Sections:**
  1. Generator Details (ID, type, capacity, location)
  2. Reporting Period (start date, end date)
  3. Run-Hours Summary (total hours per generator, aggregated if multiple)
  4. Fuel Consumption (type, quantity, units)
  5. Emissions Data (NOx, SO2, CO, particulates - values from stack tests)
  6. Stack Test Results (test dates, results, compliance status)
  7. Incidents/Breakdowns (if any, with dates and descriptions)
- **Required Fields:** Generator ID, Period, Total Hours, Fuel Type, Emissions Values
- **Export Format:** PDF (EA template format) or CSV (data export for manual entry)
- **Validation Rules:** All required fields must be populated before export; system validates data completeness

**Auto-Population:**
- System pre-fills AER form from tracked data:
  - Run-hours from run_hour_records table (aggregated per generator)
  - Fuel consumption from user-entered data or maintenance records
  - Emissions from stack_test_results table
  - Generator details from generators table
- User reviews and confirms all auto-populated data
- User can edit any field before export
- Changes logged for audit trail

**Submission Workflow:**
- **EA Portal Integration:** If EA portal API available, system can submit directly (future enhancement)
- **Manual Export:** Primary method - user exports PDF/CSV and uploads to EA portal manually
- **Export Triggers:** User-initiated only (no automatic submission)
- **Pre-Submission Validation:** System checks all required fields populated, calculations verified

**AER Timeline:**
- Data collection: Throughout year (continuous tracking)
- Report generation: Month before deadline (user-triggered)
- Submission deadline: Varies by registration (typically Jan-Mar, based on registration anniversary)
- Reminders: 60 days, 30 days, 7 days before deadline

**Historical Data Requirements:**
- All run-hour records retained for 6 years (minimum regulatory requirement)
- Stack test results retained for 6 years
- Fuel consumption data retained for 6 years
- AER generated documents retained indefinitely (archived after submission)
- Historical AERs accessible for comparison and audit purposes

### C.3.9 Fuel Usage Logs & Sulphur Content Reporting

**Purpose:** Track detailed fuel consumption and sulphur content for each generator to ensure compliance with fuel quality regulations and for accurate AER reporting.

**Data Capture:**
- **Manual Entry:** Users can manually log fuel usage (date, fuel type, quantity, unit, sulphur content).
- **Automated Integration (Future):** Integration with fuel management systems to automatically import data.
- **Sulphur Content Reports:** Dedicated entries for lab test results of fuel sulphur content.

**Key Fields:**
- `fuel_usage_logs`: `log_date`, `fuel_type`, `quantity`, `unit`, `sulphur_content_percentage`, `sulphur_content_mg_per_kg`, `evidence_id`
- `sulphur_content_reports`: `test_date`, `fuel_type`, `batch_reference`, `sulphur_content_percentage`, `sulphur_content_mg_per_kg`, `regulatory_limit_percentage`, `regulatory_limit_mg_per_kg`, `compliance_status`, `evidence_id`

**Validation Rules:**
- `quantity` must be non-negative.
- `sulphur_content_percentage` must be between 0 and 100.
- `sulphur_content_mg_per_kg` calculated from percentage if not provided, and vice-versa.
- `compliance_status` for sulphur reports derived by comparing `sulphur_content` to `regulatory_limit`.

**Integration with AER:**
- AER generation job will aggregate fuel usage logs for the reporting period.
- The most recent sulphur content report for each fuel type used in the period will be included in the AER.
- `aer_documents.fuel_consumption_data` will be populated from aggregated `fuel_usage_logs`.
- `aer_documents.fuel_usage_log_id` will link to the relevant fuel usage log entry if a single log is the source for the AER's fuel data.

**Compliance Monitoring:**
- System can trigger alerts if sulphur content exceeds regulatory limits.
- Fuel usage data contributes to overall emissions calculations in the AER.

**Reference:** High Level Product Plan Module 3 (Fuel usage logs + sulphur content reporting)

### C.3.10 Module 3 Audit Pack Structure

**Additional Module 3 Elements:**
- Generator registrations and permits
- Runtime monitoring compliance data
- Stack test results and certification
- Exemption evidence and tracking
- Regulation threshold compliance
- Annual emissions reports (AERs)

### C.3.11 Runtime Monitoring Reason Codes

**Purpose:** Structured reason codes for manual runtime entries to maintain audit trail defensibility.

**Reason Codes:**

| Code | Description | Validation Status | Notes Required |
|------|-------------|------------------|----------------|
| `TESTING` | Generator testing/commissioning | PENDING | Optional |
| `EMERGENCY` | Emergency operation (power outage, backup) | PENDING | Recommended |
| `MAINTENANCE` | Maintenance/repair runtime | PENDING | Optional |
| `ROUTINE` | Routine scheduled operation | APPROVED | Optional |
| `OTHER` | Other reason (specify) | PENDING | **MANDATORY** |

**Business Rules:**

1. **Manual Entry Requirements:**
   - `entry_reason_code` REQUIRED for all `data_source = 'MANUAL'` entries
   - If `entry_reason_code = 'OTHER'`, then `entry_reason_notes` MANDATORY (explain reason)
   - CSV imports auto-link to `csv_import_id` for traceability

2. **Validation Workflow:**
   - Manual entries default to `validation_status = 'PENDING'`
   - Managers can APPROVE/REJECT manual entries
   - REJECTED entries don't count toward runtime limits
   - APPROVED entries count normally

3. **Approval Logic:**
   - TESTING, EMERGENCY, MAINTENANCE: Require manager approval before counting toward limits
   - ROUTINE: Auto-approved (still tracked for audit)
   - OTHER: Require manager approval + justification notes

4. **Audit Pack Inclusion:**
   - All manual entries included in Module 3 audit packs
   - Reason codes displayed with entry
   - Validation status shown (APPROVED/PENDING/REJECTED)
   - Used to justify manual data entry during audits

---

## C.4 Module 4 — Hazardous Waste Chain of Custody

### C.4.1 Supported Document Types

| Document Type | Pattern | Purpose |
|---------------|---------|---------|
| Waste Transfer Note (WTN) | "Waste Transfer Note", "WTN", "Consignment Note" | Track waste movements |
| Hazardous Waste Consignment Note | "Hazardous Waste", "Consignment", "HWCN" | Track hazardous waste specifically |
| Carrier Licence | "Waste Carrier Licence", "Carrier Registration" | Track carrier authorizations |
| Treatment/Disposal Certificate | "Certificate of Destruction", "Treatment Certificate" | End-point proof |

### C.4.2 Waste Stream Classification

**EWC Code System:**
- European Waste Catalogue (EWC) codes classify waste types
- Format: 6-digit code (e.g., 16 01 03 = End-of-life tyres)
- Hazardous wastes marked with asterisk (*) in official list
- System validates EWC codes against official catalogue

**Classification Business Rules:**
1. User enters/selects EWC code when creating waste stream
2. System validates code exists in EWC catalogue
3. System auto-determines if hazardous based on code
4. If hazardous, additional validation rules apply (carrier licence, volume limits, storage duration)

### C.4.3 Consignment Note Validation Rules Engine

**Purpose:** Configurable pre-submission validation prevents compliance violations before waste leaves site.

**Rule Types:**

| Rule Type | Description | Config Example | Severity |
|-----------|-------------|----------------|----------|
| `CARRIER_LICENCE` | Validate carrier licence valid and matches waste type | `{"check_expiry": true, "check_waste_type_match": true}` | ERROR |
| `VOLUME_LIMIT` | Check volume against permit limits | `{"max_volume_tonnes": 100, "check_against_permit": true}` | ERROR |
| `STORAGE_DURATION` | Check waste not stored beyond limit | `{"max_days": 30, "check_ewc_specific_limits": true}` | WARNING |
| `EWC_CODE` | Validate EWC code correct for waste description | `{"validate_against_catalogue": true, "check_hazardous_flag": true}` | ERROR |
| `DESTINATION` | Check destination site authorized for waste type | `{"check_permit_authorisation": true}` | ERROR |
| `CUSTOM` | Company-specific custom rule | User-defined JSONB | Configurable |

**Severity Levels:**

| Severity | Pre-Validation Effect | User Experience |
|----------|---------------------|-----------------|
| `ERROR` | Blocks submission | Cannot submit until fixed |
| `WARNING` | Allows submission, flags for review | Can submit but warned |
| `INFO` | Informational only | No blocking, just notification |

### C.4.4 Validation Execution Logic

**When Validation Runs:**
1. **Auto-validation on save:** When user saves consignment note (DRAFT status)
2. **Pre-submission validation:** Before user marks consignment note SUBMITTED
3. **Manual re-validation:** User clicks "Re-validate" after fixing issues

**Validation Process:**
```
FOR EACH active validation_rule WHERE company_id = consignment.company_id:
  1. Evaluate rule based on rule_type and rule_config
  2. Determine result: PASS, FAIL, WARNING
  3. If FAIL and severity = ERROR:
     - Set pre_validation_status = 'FAILED'
     - Block submission
  4. If WARNING:
     - Set pre_validation_status = 'WARNING'
     - Allow submission but flag for review
  5. Log execution in validation_executions table
END FOR

IF any rule result = FAIL AND severity = ERROR THEN
  pre_validation_status = 'FAILED'
  Display: "Consignment validation failed - fix errors before submission"
ELSIF any rule result = WARNING THEN
  pre_validation_status = 'WARNING'
  Display: "Consignment has warnings - review before submission"
ELSE
  pre_validation_status = 'PASSED'
  Allow submission
END IF
```

**Rule Execution Order:**
1. ERROR severity rules first (most critical)
2. WARNING severity rules second
3. INFO severity rules last

### C.4.5 Validation Execution Audit Log

**Purpose:** Immutable log of all validation checks for compliance audits and debugging.

**Execution Record:**
```json
{
  "execution_id": "uuid",
  "validation_rule_id": "uuid",
  "consignment_note_id": "uuid",
  "executed_at": "2025-12-01T10:00:00Z",
  "result": "FAIL",
  "validation_data": {
    "carrier_licence_expiry": "2025-11-01",
    "consignment_date": "2025-12-01",
    "days_expired": 30,
    "rule": "Carrier licence expired"
  },
  "error_message": "Carrier licence expired 30 days ago - cannot accept waste"
}
```

**Business Rules:**
- System-only writes (no manual editing)
- One record per rule per validation run
- Results: PASS, FAIL, WARNING
- `validation_data` (JSONB) stores context: actual vs limit, dates, etc.
- Used for compliance audits and debugging
- Retention: Keep forever

### C.4.6 Corrective Action Lifecycle (Modules 2 & 4)

**Purpose:** Structured workflow for responding to breaches, exceedances, and chain-breaks.

**Five-Phase Lifecycle:**

| Phase | Description | Entry Criteria | Exit Criteria |
|-------|-------------|----------------|---------------|
| `TRIGGER` | Automatically created when issue detected | Breach/exceedance/chain-break detected | Investigation initiated |
| `INVESTIGATION` | Root cause analysis and impact assessment | User starts investigation | Root cause documented |
| `ACTION` | Corrective action items assigned and tracked | Investigation complete | All action items completed |
| `RESOLUTION` | Evidence of resolution documented | All actions complete | Evidence approved |
| `CLOSURE` | Formal closure (approval required if config set) | Resolution approved | Closure approved (if required) |

**Phase Progression Rules:**
```
TRIGGER → INVESTIGATION:
  - Requires: investigation_initiated_by, investigation_start_date
  - User action: Click "Start Investigation"

INVESTIGATION → ACTION:
  - Requires: root_cause_analysis (text), impact_assessment (text), at least 1 action item created
  - User action: Complete investigation, create action items

ACTION → RESOLUTION:
  - Requires: ALL action items status = COMPLETED, resolution evidence attached
  - Cannot progress if any action item PENDING or IN_PROGRESS

RESOLUTION → CLOSURE:
  - IF closure_requires_approval = true:
    - Requires: closure_approved_by (Admin/Owner), closure_approval_date
  - IF regulator_notification_required = true:
    - Requires: regulator_notification_sent_date, regulator_notification_evidence
  - User action: Submit for closure approval (if required) OR mark closed (if no approval required)
```

**Cannot Skip Phases:** Must progress sequentially TRIGGER → INVESTIGATION → ACTION → RESOLUTION → CLOSURE

### C.4.7 Corrective Action Items (Sub-tasks)

**Purpose:** Individual trackable tasks within corrective action with cross-site visibility.

**Item Structure:**
```json
{
  "item_id": "uuid",
  "corrective_action_id": "uuid",
  "item_description": "Replace faulty pH sensor",
  "assigned_user_id": "uuid",
  "due_date": "2025-12-15",
  "status": "IN_PROGRESS",
  "completion_evidence_id": "uuid",
  "completed_by": null,
  "completed_at": null
}
```

**Business Rules:**

1. **Cross-Site Visibility:**
   - Assigned users can see and update their action items across all sites
   - Action item visible on user's personal dashboard regardless of site
   - RLS respects site boundaries but action items assigned to user always visible to that user

2. **Due Date Tracking:**
   - Each action item has individual due_date
   - Compliance clock tracks action item deadlines separately
   - Alerts: 3 days before due, 1 day before due, overdue

3. **Completion Requirements:**
   - Completion requires evidence attachment
   - Evidence type: Photo, document, or data record
   - Assigned user marks item COMPLETED
   - Completion logged with timestamp and user

4. **Parent Dependency:**
   - Parent corrective action cannot move to RESOLUTION until ALL items COMPLETED
   - If any item PENDING or IN_PROGRESS, parent stuck in ACTION phase
   - System displays: "X action items remaining before resolution"

5. **Notification Rules:**
   - Auto-notify assigned user on creation
   - Reminder 3 days before due date
   - Overdue alert daily until completed

### C.4.8 Chain of Custody Tracking

**Purpose:** Trace waste from generation through disposal/recovery with complete evidence trail.

**Chain Stages:**

| Stage | Description | Required Evidence | Compliance Clock Entity |
|-------|-------------|------------------|------------------------|
| Generation | Waste produced on site | Waste description, EWC code | N/A |
| Storage | Waste stored awaiting collection | Storage location, storage date | WASTE_STREAM (storage duration limit) |
| Collection | Carrier collects waste | Signed consignment note | N/A |
| Transport | Waste in transit | Carrier tracking (optional) | N/A |
| Reception | Destination receives waste | Destination signature | N/A |
| Treatment/Disposal | Final treatment/disposal | Certificate of destruction/recycling | WASTE_STREAM (end-point proof deadline) |

**Chain-Break Detection:**

Chains break when:
1. Consignment note not returned within X days (default: 30 days)
2. End-point proof not received within Y days of collection (default: 90 days)
3. Carrier licence expires mid-transport
4. Validation rule fails (blocked consignment)

**Chain-Break Triggers:**
- Automatic corrective action created (see C.4.6)
- Dashboard alert: "Chain break detected - [reason]"
- Escalation to Site Manager + Admin
- Cannot close waste stream until chain complete

### C.4.9 Carrier/Contractor Licence Tracking

**Purpose:** Ensure all carriers/contractors have valid licences before accepting waste.

**Licence Validation:**
1. **Pre-Consignment Check:**
   - When creating consignment note, system checks carrier licence
   - If expired: Validation rule FAIL, blocks submission
   - If expiring within 30 days: WARNING, flag for user attention

2. **Compliance Clock Integration:**
   - Carrier licence expiry tracked via `CONTRACTOR_LICENCE` entity type
   - Alerts: 90 days, 30 days, 7 days before expiry
   - Overdue: RED criticality, block new consignments

3. **Licence-Waste Type Matching:**
   - Licence specifies authorized waste types (EWC codes)
   - System validates consignment EWC code matches carrier authorization
   - If mismatch: Validation FAIL, blocks submission

### C.4.10 Volume Limits Tracking

**Purpose:** Track cumulative waste volumes against permit limits.

**Volume Calculation:**
```
site_cumulative_volume = SUM(consignment_notes.volume_tonnes)
  WHERE consignment_notes.site_id = site.id
  AND consignment_notes.collection_date >= permit_anniversary_date
  AND consignment_notes.collection_date < permit_anniversary_date + 1 year

volume_remaining = permit.annual_volume_limit - site_cumulative_volume

volume_percentage = (site_cumulative_volume / permit.annual_volume_limit) * 100
```

**Volume Alerts:**

| Threshold | Alert Level | Action |
|-----------|-------------|--------|
| 70% | Warning | Email to Site Manager |
| 85% | Urgent | Email + SMS to Site Manager + Admin |
| 95% | Critical | Email + SMS + Dashboard banner (all users) |
| 100% | Breach | Block new consignments, escalate to Owner |

### C.4.11 Storage Duration Limits

**Purpose:** Ensure waste not stored beyond regulatory limits.

**Storage Rules:**
- Hazardous waste: Default max 30 days storage
- EWC-specific limits: Some waste types have shorter limits (e.g., 7 days for certain hazardous liquids)
- Company-specific limits: Companies can set stricter limits

**Storage Calculation:**
```
storage_duration_days = CURRENT_DATE - waste_stream.generated_date

IF storage_duration_days > max_storage_days THEN
  storage_status = 'OVERDUE'
  Create corrective action (TRIGGER phase)
ELSIF storage_duration_days >= (max_storage_days * 0.8) THEN
  storage_status = 'AT_RISK'
  Send warning alert
ELSE
  storage_status = 'OK'
END IF
```

**Compliance Clock Integration:**
- Storage deadline tracked via `WASTE_STREAM` entity type
- Target date = generated_date + max_storage_days
- Criticality calculated per universal compliance clock rules

### C.4.12 End-Point Proof (Return Evidence)

**Purpose:** Close chain of custody with destruction/recycling certificate.

**End-Point Proof Requirements:**
- Certificate of destruction (for disposal)
- Certificate of recycling/recovery (for recycling)
- Must include: waste description, quantity received, treatment method, date, authorisation details
- Must be signed by authorized treatment facility

**Chain Closure Logic:**
1. **Upload End-Point Proof:**
   - User uploads certificate
   - System links to consignment note(s)
   - System validates: quantity matches consignment, dates align, facility authorized

2. **Chain Completion:**
   - All stages complete: Generation → Storage → Collection → Transport → Reception → Treatment
   - End-point proof received and validated
   - Chain status: `COMPLETE`
   - Compliance clock entry deactivated

3. **Missing End-Point Proof:**
   - If not received within 90 days: Chain-break corrective action created
   - Escalate to Site Manager: "End-point proof overdue for consignment [ref]"
   - Cannot close waste stream until proof received

### C.4.13 Module 4 Audit Pack Structure

**Module 4 Audit Pack Contents:**
- Waste stream classifications (EWC codes)
- All consignment notes with validation status
- Complete chain of custody documentation
- End-point proof certificates
- Carrier licence validity evidence
- Volume tracking (cumulative vs permit limits)
- Storage duration compliance
- Chain-break alerts and resolutions (corrective actions)
- Validation rule execution logs

**Pack Generation SLA:** <2 minutes for 100+ consignment notes

---

## C.5 Module Extension Pattern

This section defines the pattern for adding new modules to the platform (e.g., Module 4 - Packaging Regulations, Module 5 - Asbestos Management, Module 6 - Fire Safety).

### C.4.1 Module Registration

**Step 1: Register Module in `modules` Table**
- Insert new row into `modules` table with:
  - `module_code`: Unique identifier (e.g., 'MODULE_4', 'MODULE_PACKAGING')
  - `module_name`: Human-readable name (e.g., 'Packaging Regulations')
  - `module_description`: Description of module purpose
  - `requires_module_id`: Prerequisite module (if any), or NULL
  - `pricing_model`: 'per_site', 'per_company', or 'per_document'
  - `base_price`: Base price in GBP
  - `document_types`: JSONB array of document types this module handles
  - `cross_sell_keywords`: Array of keywords that trigger cross-sell prompts

**Step 2: Define Module-Specific Entities**
- Follow the same pattern as Module 2/3 entities (see Sections B.13-B.22 in Canonical Dictionary)
- Each module can define its own entities (e.g., Module 4 might have PackagingRegistration, PRNCertificate)
- Entities should follow naming conventions and include standard fields (id, created_at, updated_at)

**Step 3: Define Module-Specific Tables**
- Create database tables following the same pattern as Module 2/3 tables (see Canonical Dictionary Section B.31 for Module Extension Pattern guidance)
- Tables should reference `documents` table via `document_id` foreign key
- Tables should include standard fields and follow naming conventions

**Step 4: Define Module-Specific Logic**
- Document extraction rules for module's document types
- Define module-specific workflows (evidence capture, scheduling, reporting)
- Define module-specific audit pack structure
- Follow the same pattern as Sections C.1, C.2, C.3

**Step 5: Add Extraction Rules**
- Add module-specific patterns to AI Extraction Rules Library
- Patterns reference module via `module_id` (UUID) or `module_code` in JSON
- Follow the same pattern as Module 1/2/3 patterns

**Step 6: Add Workflows**
- Document module-specific workflows in User Workflow Maps
- Follow the same pattern as Module 1/2/3 workflows

### C.4.2 Module Routing

Module routing is automatic once module is registered:
- System queries `modules` table based on `document_type`
- If `modules.document_types` contains the document type, route to that module
- No code changes needed - routing is data-driven

### C.4.3 Module Activation

Module activation is automatic once module is registered:
- Prerequisites are enforced via `modules.requires_module_id` foreign key
- Activation logic queries `modules` table to determine prerequisites
- No code changes needed - activation is data-driven

### C.4.4 Module Pricing

Module pricing is automatic once module is registered:
- Pricing is stored in `modules.base_price` and `modules.pricing_model`
- Billing logic queries `modules` table to calculate charges
- No code changes needed - pricing is data-driven

### C.4.5 Example: Adding Module 4 (Packaging Regulations)

1. **Register Module:**
   ```sql
   INSERT INTO modules (module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, document_types, cross_sell_keywords)
   VALUES (
     'MODULE_4',
     'Packaging Regulations',
     'Packaging waste compliance and PRN (Packaging Recovery Note) management',
     NULL,  -- No prerequisite
     'per_site',
     49.00,
     true,
     false,
     '["PACKAGING_REGISTRATION", "PRN_CERTIFICATE"]'::JSONB,
     ARRAY['packaging', 'PRN', 'packaging waste', 'producer responsibility']
   );
   ```

2. **Define Entities:** Create PackagingRegistration, PRNCertificate entities (see Canonical Dictionary Section B.31)

3. **Define Tables:** Create packaging_registrations, prn_certificates tables (see Canonical Dictionary Section B.31)

4. **Define Logic:** Document packaging-specific extraction rules, workflows, audit packs (follow Sections C.1, C.2, C.3 pattern)

5. **Add Rules:** Add packaging patterns to AI Extraction Rules Library

6. **Add Workflows:** Document packaging workflows in User Workflow Maps

**Result:** Module 4 is now fully integrated - routing, activation, pricing all work automatically via `modules` table queries.

**See Also:**
- Canonical Dictionary Section B.31: Module Extension Pattern (database perspective)
- Canonical Dictionary Section C.4: Module Registry Table (`modules` table definition)

---

# D. CROSS-MODULE LOGIC

## D.1 Module Prerequisites

### D.1.1 Activation Rules

| Module | Prerequisite | Enforcement |
|--------|--------------|-------------|
Module prerequisites are defined in `modules.requires_module_id`. Activation logic enforces prerequisites by checking the `module_activations` table.

**How It Works:**
1. User requests module activation
2. System queries `modules` table to get `requires_module_id` for requested module
3. If `requires_module_id` is NULL, no prerequisite (activation allowed)
4. If `requires_module_id` is set, system checks `module_activations` table to verify prerequisite module is active
5. If prerequisite not active, block activation with message: "[Prerequisite Module Name] is required before activating this module."
6. If prerequisite active (or no prerequisite), activation proceeds

**Current Module Prerequisites (stored in `modules` table):**
| Module | Prerequisite | Stored As |
|--------|--------------|-----------|
| Module 1 | None | `requires_module_id = NULL` |
| Module 2 | Module 1 active | `requires_module_id` → Module 1's `modules.id` |
| Module 3 | Module 1 active | `requires_module_id` → Module 1's `modules.id` |

**Benefits:**
- Prerequisites are enforced via foreign keys (no hardcoded logic)
- New modules can define their own prerequisites (just set `requires_module_id`)
- Prerequisite chains are supported (Module 4 could require Module 2, which requires Module 1)

### D.1.2 Deactivation Rules

Deactivation logic queries the `modules` table to find all modules that have `requires_module_id` pointing to the module being deactivated. If any are active, block deactivation with warning.

**How It Works:**
1. User requests module deactivation
2. System queries `modules` table: `SELECT * FROM modules WHERE requires_module_id = <module_being_deactivated_id> AND is_active = true`
3. System checks `module_activations` table to see if any dependent modules are active
4. **Edge Case: Permit Revoked but Module Active**
   - **If** document status = 'REVOKED' or 'EXPIRED' AND module is still active, **then**:
     - System prompts: "Document [reference] is revoked/expired but Module [name] is still active. Do you want to deactivate the module?"
     - **If** user confirms, **then** proceed with deactivation
     - **If** user cancels, **then** module remains active (user may have other active documents for this module)
   - **If** all documents for module are revoked/expired AND no active documents remain, **then**:
     - System suggests: "All documents for Module [name] are revoked/expired. Would you like to deactivate the module?"
     - User can deactivate or keep module active (for future documents)
5. If dependent modules are active:
   - Block deactivation
   - Display warning: "Deactivating [Module Name] will also deactivate [List of Dependent Modules]. Are you sure?"
   - If user confirms, cascade deactivation to all dependent modules
6. If no dependent modules are active (or module has no dependents), deactivation proceeds
7. Data is archived (not deleted) - can reactivate to restore access

**Benefits:**
- Deactivation rules are data-driven (based on `modules.requires_module_id`)
- No hardcoded module-specific logic
- New modules automatically participate in deactivation cascade logic
- Dependent modules are discovered dynamically (no code changes needed)

## D.2 Cross-Sell Trigger Detection

### D.2.1 Module 2 Cross-Sell Triggers

**Note:** Cross-sell triggers are configurable per module. Keywords can be stored in `modules.cross_sell_keywords` JSONB field or in `cross_sell_triggers` table. The system queries `modules` table to determine which modules have cross-sell keywords configured.

**Keyword Detection in Module 1 Documents:**
- "trade effluent"
- "discharge consent"
- "water company"
- "sewer"
- "effluent"
- "discharge to drain"

**Trigger Action:**
1. System detects keyword during Module 1 extraction
2. Creates `cross_sell_trigger` record
3. User sees banner: "We detected references to trade effluent in your permit. Would you like to activate Module 2?"
4. User can dismiss or activate

**External Triggers:**
- User manually indicates trade effluent interest
- Water company enforcement notice uploaded (detected by keywords)

### D.2.2 Module 3 Cross-Sell Triggers

**Note:** Cross-sell triggers are configurable per module. Keywords can be stored in `modules.cross_sell_keywords` JSONB field or in `cross_sell_triggers` table. The system queries `modules` table to determine which modules have cross-sell keywords configured.

**Keyword Detection in Module 1 Documents:**
- "generator"
- "MCPD"
- "standby power"
- "CHP"
- "combustion plant"
- "back-up generator"

**Trigger Action:**
- Same flow as Module 2 triggers

**External Triggers:**
- User manually indicates generator interest
- Run-hour breach in existing Module 3 data (if previously active)

### D.2.3 Cross-Sell Trigger Record

```json
{
  "trigger_id": "uuid",
  "company_id": "uuid",
  "target_module_id": "uuid (from modules table, queried dynamically based on keywords)",
  "trigger_type": "KEYWORD|EXTERNAL_EVENT|USER_REQUEST",
  "trigger_source": "document_id or external",
  "detected_keywords": ["trade effluent", "sewer"],
  "status": "pending|dismissed|converted",
  "created_at": "timestamp",
  "responded_at": "timestamp",
  "response_action": "activated|dismissed"
}
```

## D.3 Shared Data Across Modules

### D.3.1 Shared Entities

| Entity | Shared Across |
|--------|---------------|
| Company | All modules |
| Site | All modules |
| User | All modules |
| Notification Settings | All modules |

### D.3.2 Module-Isolated Entities

| Entity | Module |
|--------|--------|
| Permit | Module 1 |
| Permit Obligation | Module 1 |
| Consent | Module 2 |
| Parameter | Module 2 |
| Lab Result | Module 2 |
| MCPD Registration | Module 3 |
| Generator | Module 3 |
| Run-Hour Record | Module 3 |

### D.3.3 Evidence Sharing

**Evidence files are stored centrally but linked per-module:**
- Same file can be uploaded once and linked to obligations in different modules
- Evidence metadata (upload date, uploader) is shared
- Evidence-obligation links are module-specific

## D.4 Combined Dashboard Logic

### D.4.1 Dashboard Widgets

**Module-Agnostic Widgets:**
- Upcoming deadlines (all modules)
- Overdue items (all modules)
- Recent activity (all modules)

**Module-Specific Widgets:**
- Module 1: Permit compliance summary
- Module 2: Parameter status, exceedance alerts
- Module 3: Run-hour utilisation, generator status

### D.4.2 Widget Visibility

- Widgets only display if module is active
- If Module 2 not active, Module 2 widgets hidden
- If Module 3 not active, Module 3 widgets hidden

## D.5 Cross-Module Audit Pack

### D.5.1 Combined Audit Pack Option

**User can generate:**
1. Single-module audit pack (Module 1 only, Module 2 only, etc.)
2. Combined audit pack (all active modules)

**Combined Pack Structure:**
- Section A: Module 1 (Environmental Permits)
- Section B: Module 2 (Trade Effluent) - if active
- Section C: Module 3 (MCPD/Generators) - if active
- Section D: Cross-module summary

---

# E. PRICING & BILLING LOGIC

## E.1 Pricing Models

Pricing is stored in `modules.base_price` and `modules.pricing_model`. Billing logic queries the `modules` table to calculate charges.

**Pricing Models:**
- `per_site`: Charged per site per billing period (monthly)
- `per_company`: Charged per company per billing period (monthly)
- `per_document`: Charged per document per billing period (monthly)

## E.2 Billing Calculation Logic

### E.2.1 Per-Site Pricing

**Calculation:**
```sql
SELECT 
  m.module_name,
  m.base_price,
  COUNT(DISTINCT ma.site_id) as active_sites,
  m.base_price * COUNT(DISTINCT ma.site_id) as total_charge
FROM modules m
JOIN module_activations ma ON m.id = ma.module_id
WHERE ma.company_id = :company_id
  AND ma.status = 'ACTIVE'
  AND m.pricing_model = 'per_site'
GROUP BY m.id, m.module_name, m.base_price
```

**Example:**
- Module 1: £149/month per site
- Company has 3 sites with Module 1 active
- Total charge: £149 × 3 = £447/month

### E.2.2 Per-Company Pricing

**Calculation:**
```sql
SELECT 
  m.module_name,
  m.base_price,
  COUNT(DISTINCT ma.company_id) as active_companies,
  m.base_price as total_charge  -- Fixed per company, regardless of sites
FROM modules m
JOIN module_activations ma ON m.id = ma.module_id
WHERE ma.company_id = :company_id
  AND ma.status = 'ACTIVE'
  AND m.pricing_model = 'per_company'
GROUP BY m.id, m.module_name, m.base_price
```

**Example:**
- Module 3: £79/month per company
- Company has Module 3 active (regardless of number of generators/sites)
- Total charge: £79/month

### E.2.3 Per-Document Pricing

**Calculation:**
```sql
SELECT 
  m.module_name,
  m.base_price,
  COUNT(DISTINCT d.id) as active_documents,
  m.base_price * COUNT(DISTINCT d.id) as total_charge
FROM modules m
JOIN documents d ON m.id = d.module_id
WHERE d.company_id = :company_id
  AND d.status IN ('ACTIVE', 'DRAFT')
  AND d.extraction_status != 'ARCHIVED'
  AND m.pricing_model = 'per_document'
GROUP BY m.id, m.module_name, m.base_price
```

**Billing Rules:**
- **Active Documents:** Documents with `status = 'ACTIVE'` are billed
- **Draft Documents:** Documents with `status = 'DRAFT'` are billed if older than 7 days (prevents accidental charges)
- **Archived Documents:** Documents with `extraction_status = 'ARCHIVED'` are NOT billed
- **Document Deletion:** If document deleted, billing stops immediately (prorated if mid-period)

**Example:**
- Module X: £25/month per document
- Company has 5 active documents for Module X
- Total charge: £25 × 5 = £125/month

**Proration Logic:**
- **Document Added Mid-Period:** Charge prorated: `(base_price / days_in_period) * days_remaining`
- **Document Removed Mid-Period:** Credit prorated: `(base_price / days_in_period) * days_used`
- **Period Start:** Full charge for all active documents
- **Period End:** Final calculation includes all mid-period changes

### E.2.4 Combined Billing Calculation

**Total Monthly Charge:**
```sql
SELECT 
  SUM(
    CASE 
      WHEN m.pricing_model = 'per_site' THEN 
        m.base_price * COUNT(DISTINCT ma.site_id)
      WHEN m.pricing_model = 'per_company' THEN 
        m.base_price
      WHEN m.pricing_model = 'per_document' THEN 
        m.base_price * COUNT(DISTINCT d.id)
    END
  ) as total_monthly_charge
FROM modules m
LEFT JOIN module_activations ma ON m.id = ma.module_id AND ma.company_id = :company_id AND ma.status = 'ACTIVE'
LEFT JOIN documents d ON m.id = d.module_id AND d.company_id = :company_id AND d.status IN ('ACTIVE', 'DRAFT') AND d.extraction_status != 'ARCHIVED'
WHERE (ma.id IS NOT NULL OR d.id IS NOT NULL)
GROUP BY m.id, m.pricing_model, m.base_price
```

## E.3 Billing Period Logic

- **Billing Period:** Monthly (1st to last day of month)
- **Billing Date:** 1st of each month (for previous month)
- **Grace Period:** 7 days from billing date for payment
- **Suspension:** If payment not received after grace period, modules deactivated

## E.4 Billing Events

**Trigger Events:**
- Module activation → Immediate charge (prorated if mid-period)
- Module deactivation → Credit issued (prorated if mid-period)
- Document added → Charge added (prorated if mid-period)
- Document removed → Credit issued (prorated if mid-period)

### E.4.1 Module Activation Billing Logic

**Billing Rules:**
1. **Immediate Activation:** Module is activated immediately upon user confirmation
2. **Prorated Charge:** If activated mid-month, customer is charged prorated amount for current month
3. **Next Billing Cycle:** Full module price charged on next billing date (1st of month)
4. **Billing Start:** Billing starts from activation date (not next billing cycle)

**Proration Calculation:**
```typescript
function calculateProratedCharge(
  basePrice: number,
  activationDate: Date,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): number {
  const daysInPeriod = getDaysInMonth(billingPeriodStart);
  const daysRemaining = getDaysBetween(activationDate, billingPeriodEnd) + 1; // +1 to include activation day
  return (basePrice / daysInPeriod) * daysRemaining;
}
```

**Example: Module 2 Activation (Mid-Month)**
- Module 2 price: £59/month per site
- Activation date: 15th of month (30-day month)
- Days remaining: 16 days (15th to 30th, inclusive)
- Prorated charge: £59 × (16 / 30) = **£31.47**
- Next month (1st): Full charge **£59.00**

**Example: Module 3 Activation (Start of Month)**
- Module 3 price: £79/month per company
- Activation date: 1st of month
- Days remaining: 30 days (full month)
- Charge: Full price **£79.00** (no proration needed)

**Deactivation Billing:**
- **No Refunds:** No refunds for partial months after deactivation
- **Access Continuation:** Module access continues until end of current billing period
- **Data Preservation:** Module data preserved for 90 days after deactivation
- **Next Billing Cycle:** No charge for deactivated module on next billing date

**Example: Module 2 Deactivation (Mid-Month)**
- Module 2 deactivated: 20th of month
- Access continues: Until 30th of month (end of billing period)
- No refund: Customer has access until period end
- Next month: No charge for Module 2

**Billing Implementation:**
- Activation creates `module_activations` record with `activated_at` timestamp
- Billing system queries `module_activations` with `status = 'ACTIVE'` and `activated_at <= billing_period_end`
- Proration calculated based on `activated_at` date relative to billing period
- Site added → Charge added for per-site modules (prorated if mid-period)
- Site removed → Credit issued for per-site modules (prorated if mid-period)

---

# F. AI LOGIC REQUIREMENTS

## F.1 Rule Library Requirements

### F.1.1 Library Structure

**Hierarchy:**
```
Rule Library
├─ Module 1 Rules
│   ├─ EA Standard Conditions
│   ├─ SEPA Standard Conditions
│   ├─ NRW Standard Conditions
│   └─ Industry-Specific Patterns
├─ Module 2 Rules
│   ├─ Water Company Consent Patterns
│   └─ Parameter Detection Patterns
└─ Module 3 Rules
    ├─ MCPD Registration Patterns
    └─ Generator Identification Patterns
```

### F.1.2 Rule Record Structure

```json
{
  "rule_id": "EA-SC-2.3.1",
  "module": "1",
  "pattern_type": "standard_condition",
  "regex_pattern": "operate.*management.*system",
  "template_obligation": {
    "text": "Operate in accordance with a management system",
    "category": "Operational",
    "frequency": "Continuous",
    "is_subjective": false
  },
  "evidence_suggestions": ["Management system documentation"],
  "confidence_baseline": 0.95,
  "version": "2024.1",
  "last_updated": "2024-01-15"
}
```

### F.1.3 Rule Library Updates

- Library versioned separately from main application
- Updates pushed as configuration changes
- All extractions log rule library version used

## F.2 Confidence Scoring Methodology

### F.2.1 Score Calculation

```
Confidence Score = (Pattern Match × 0.4) + (Structure × 0.3) + (Semantic × 0.2) + (OCR × 0.1)
```

**Component Scores:**

| Component | Score Range | Calculation |
|-----------|-------------|-------------|
| Pattern Match | 0-100% | % match against rule library patterns |
| Structure | 0-100% | Document formatting quality assessment |
| Semantic | 0-100% | Internal consistency of extracted fields |
| OCR | 0-100% | OCR confidence (100% for native PDF) |

### F.2.2 Confidence Thresholds Application

| Total Score | Action |
|-------------|--------|
| ≥85% | Auto-accept; show as "Confirmed" |
| 70-84% | Flag for review; show as "Review Recommended" |
| <70% | Require review; block until human confirms |

## F.3 Subjective Language Detection

### F.3.1 Detection Methodology

**Exact Match List:**
```python
SUBJECTIVE_PHRASES = [
    "as appropriate",
    "where necessary",
    "where practicable",
    "reasonable measures",
    "adequate steps",
    "as soon as practicable",
    "to the satisfaction of",
    "unless otherwise agreed",
    "appropriate measures",
    "suitable provision",
    "best endeavours",
    "reasonably practicable"
]
```

**Fuzzy Match Patterns:**
- "regular*" without frequency qualifier
- "adequate*" without standard reference
- "suitable*" without criteria
- "prevent*" without success criteria

### F.3.2 Detection Workflow

1. Text normalised (lowercase, whitespace normalised)
2. Exact match check against phrase list
3. Fuzzy match check against patterns
4. If match found: `is_subjective = true`
5. Store matched phrases in `subjective_phrases` array

## F.4 Mandatory Human Review Nodes

### F.4.1 Review-Required Scenarios

| Scenario | Review Type | Blocking? |
|----------|-------------|-----------|
| Confidence <70% | Full review | Yes |
| Subjective language detected | Interpretation required | No |
| No rule library match | Novel condition review | No |
| Date parsing failure | Deadline confirmation | Yes |
| Potential duplicate detected | Deduplication review | No |
| OCR quality <80% | Document quality check | Yes |

### F.4.2 Review Queue Management

- Items auto-added to Review Queue
- Sorted by: Blocking status, then by document upload date
- Review Queue shows: Document name, extraction count, blocking items count

## F.5 Extraction Pattern Workflow

### F.5.1 Step-by-Step Flow

```
1. Document Upload
   └─→ Format Detection (Native/Scanned)
        └─→ OCR (if scanned)
             └─→ Text Extraction
                  └─→ Document Segmentation
                       └─→ Module Routing
                            └─→ For Each Segment:
                                 ├─→ Rule Library Lookup
                                 │    ├─→ [Match ≥90%] Use Library Template
                                 │    └─→ [Match <90%] Pass to LLM
                                 └─→ LLM Extraction
                                      └─→ Confidence Scoring
                                           └─→ Human Review Flagging
                                                └─→ Store Obligation Records
```

### F.5.2 Error Handling at Each Stage

| Stage | Error Type | Handling |
|-------|-----------|----------|
| Upload | Invalid file type | Reject with message |
| OCR | Timeout (>60s) | Flag document for manual processing |
| Segmentation | No sections found | Flag for manual review |
| Module Routing | Ambiguous type | Prompt user selection |
| Rule Lookup | Library unavailable | Proceed to LLM only |
| LLM Extraction | Timeout (>30s) | Retry twice (3 total attempts); then flag for manual |
| LLM Extraction | Invalid response | Retry with simplified prompt |
| Confidence Scoring | Calculation error | Default to 0% (require review) |

## F.6 Hallucination Prevention

### F.6.1 Prevention Techniques

1. **Grounding:** LLM output must quote original document text
2. **Structured Output:** Force JSON schema compliance
3. **Confidence Calibration:** Flag low-confidence extractions
4. **Cross-Validation:** Compare against rule library where possible
5. **Human Review:** Final human verification for uncertain items

### F.6.2 Hallucination Detection

**Red Flags:**
- Extracted text not found in source document
- Numeric values inconsistent with document
- Dates outside reasonable range
- Categories inconsistent with document type

**Detection Action:**
- Flag item with `hallucination_risk = true`
- Add to Review Queue with elevated priority

## F.7 Logging and Validation

### F.7.1 Extraction Logging

Every extraction creates log record:
```json
{
  "extraction_id": "uuid",
  "document_id": "uuid",
  "extraction_timestamp": "ISO8601",
  "model_identifier": "gpt-4o",
  "rule_library_version": "2024.1",
  "segments_processed": 15,
  "obligations_extracted": 73,
  "flagged_for_review": 8,
  "processing_time_ms": 12500,
  "errors": []
}
```

### F.7.2 Validation Rules

**Pre-Save Validation:**
1. All required fields present
2. Field types correct
3. Enum values valid
4. Foreign keys valid
5. No duplicate obligations
6. Confidence score within bounds

**Post-Save Validation:**
1. Obligation count matches extraction count
2. All schedules generated for recurring obligations
3. Review items added to queue

---

# G. MONITORING & ALERT LOGIC

## G.1 Frequency Types

| Frequency | Definition | Schedule Generation |
|-----------|------------|-------------------|
| Daily | Every day | 365 deadlines/year |
| Weekly | Every 7 days | 52 deadlines/year |
| Monthly | Same day each month | 12 deadlines/year |
| Quarterly | Every 3 months | 4 deadlines/year |
| Annual | Once per year | 1 deadline/year |
| One-time | Single occurrence | 1 deadline total |
| Continuous | Ongoing/constant | No scheduled deadlines; status-based |
| Event-triggered | On specific event | Deadline created when event occurs |

## G.2 Deadline Calculation Rules

### G.2.1 Base Date Determination

**Priority Order:**
1. Document-specified start date
2. Permit anniversary date
3. Document upload date
4. User-specified date

### G.2.2 Calculation Examples

**Monthly from Permit Start:**
- Permit start: 15 March 2024
- Frequency: Monthly
- Deadlines: 15 Apr, 15 May, 15 Jun...

**Annual from Upload:**
- Upload date: 20 June 2024
- Frequency: Annual
- First deadline: 20 June 2025

**One-Time Improvement:**
- Document states: "Complete by 31 December 2024"
- Single deadline: 31 December 2024

### G.2.3 Month-End Handling

If base date is 31st and month has fewer days:
- January 31 → February 28/29
- Rule: Use last day of month

### G.2.4 Rolling vs. Fixed

**Fixed Schedule:**
- Deadlines calculated from base date
- Example: Always due on 15th of each month

**Rolling Schedule:**
- Next deadline calculated from last completion
- Example: "Monthly" after completion on 10th → Next due 10th of next month

**Default:** Fixed schedule. Rolling is opt-in per obligation.

## G.3 Alert Generation Logic

### G.3.1 Deadline Alerts

| Days Before | Alert Level | Channel |
|-------------|-------------|---------|
| 7 days | Reminder | Email + In-app |
| 3 days | Warning | Email + In-app |
| 1 day | Urgent | Email + SMS + In-app |
| 0 days (deadline day) | Due Today | Email + SMS + In-app |
| -1 day (overdue) | Overdue | Email + SMS + In-app (daily until resolved) |

### G.3.2 Threshold Alerts (Module 2/3)

| Threshold | Alert Level | Channel |
|-----------|-------------|---------|
| 80% of limit | Warning | Email + In-app |
| 90% of limit | Urgent | Email + SMS + In-app |
| 100% of limit | Breach | Email + SMS + In-app + Escalation |

### G.3.3 Alert Record Structure

```json
{
  "alert_id": "uuid",
  "type": "deadline|threshold|breach",
  "severity": "info|warning|urgent|critical",
  "obligation_id": "uuid",
  "user_id": "uuid",
  "channel": "email|sms|in_app",
  "sent_at": "timestamp",
  "delivered_at": "timestamp",
  "read_at": "timestamp",
  "actioned_at": "timestamp"
}
```

## G.4 Escalation Logic

### G.4.1 Escalation Chain

```
Level 1 (Day 0): Assigned User
Level 2 (Day +1): Site Manager
Level 3 (Day +3): Company Admin
Level 4 (Day +7): All Admins + Banner Warning
```

### G.4.2 Escalation Record

```json
{
  "escalation_id": "uuid",
  "obligation_id": "uuid",
  "current_level": 2,
  "escalated_at": "timestamp",
  "escalated_to": "user_id",
  "reason": "deadline_overdue",
  "resolved_at": null
}
```

### G.4.3 Escalation Resolution

- Escalation resolved when obligation marked complete
- Resolution logged: `resolved_by`, `resolved_at`, `resolution_notes`
- Escalation chain resets after resolution

## G.5 Early Warning Logic

### G.5.1 Trend-Based Warnings

**Module 2 (Trade Effluent):**
- If 3 consecutive samples >70% of limit → Trend warning
- If rolling average >75% of limit → Elevated concern

**Module 3 (MCPD):**
- If run-hour utilisation >50% at mid-year → Pace warning
- If projected annual total >90% of limit → Elevated concern

### G.5.2 Warning Display

- Dashboard widget: "Early Warnings"
- Shows: Obligation, current value, trend direction, projected breach date
- Click-through to detailed trend view

## G.6 Notification Routing

### G.6.1 Recipient Determination

| Alert Type | Primary Recipient | CC Recipients |
|------------|------------------|---------------|
| Deadline alert | Obligation assignee | Site Manager (if different) |
| Threshold warning | Site Manager | Company Admin |
| Breach alert | Site Manager + Admin | All site staff |
| Escalation | Next level in chain | Previous level |

### G.6.2 Notification Preferences

Users can configure:
- Alert channels (email on/off, SMS on/off, in-app on/off)
- Alert timing (immediate, daily digest, weekly digest)
- Alert types (all, warnings only, urgent only)
- Quiet hours (no SMS between 22:00-07:00)

---

# H. EVIDENCE LOGIC

## H.1 Evidence Capture Logic

### H.1.1 Upload Methods

| Method | Supported Types | Size Limit |
|--------|-----------------|------------|
| Drag-drop | PDF, images, CSV | 50MB |
| Mobile camera | JPEG, PNG | 20MB |
| CSV import | CSV only | 10MB |
| File picker | All supported types | 50MB |

### H.1.2 Evidence Upload Flow

1. User initiates upload (button/drag-drop/camera)
2. File validated (type, size)
3. File uploaded to secure storage
4. Thumbnail generated (for images)
5. Evidence record created
6. User prompted to link to obligation(s)

### H.1.3 Mobile Capture

- Camera access via browser API
- Auto-capture GPS coordinates (optional, requires permission)
- Auto-capture timestamp
- Option to add notes before upload

## H.2 Evidence → Obligation Mapping

### H.2.1 Linking Logic

**Link Record:**
```json
{
  "link_id": "uuid",
  "evidence_id": "uuid",
  "obligation_id": "uuid",
  "linked_by": "user_id",
  "linked_at": "timestamp",
  "compliance_period": "2024-Q2",
  "notes": "Optional linking notes"
}
```

### H.2.2 Multi-Linking

- One evidence item can satisfy multiple obligations
- User selects obligations during/after upload
- Limit: 20 obligations per evidence item (prevent abuse)

### H.2.3 Link Suggestions

System suggests links based on:
- Evidence filename matching condition reference
- Evidence upload date matching deadline date
- Evidence type matching obligation evidence requirements

## H.3 Evidence Mandatory Fields

| Field | Required | Auto-Generated |
|-------|----------|----------------|
| evidence_id | Yes | Yes |
| file_name | Yes | From upload |
| file_type | Yes | Detected |
| file_size | Yes | Calculated |
| uploaded_by | Yes | Current user |
| uploaded_at | Yes | Current timestamp |
| storage_path | Yes | System-generated |
| description | No | User-provided |
| compliance_period | No | From linked obligation |

## H.4 Evidence Verification Rules

### H.4.1 Automatic Verification

| Check | Rule | Action on Fail |
|-------|------|----------------|
| File integrity | Hash matches stored hash | Flag as corrupted |
| Date validity | Upload date ≤ current date | Reject upload |
| Size check | File size >0 bytes | Reject upload |
| Type check | Extension matches content | Flag for review |

### H.4.2 Manual Verification

- Admin/Owner can mark evidence as "Verified"
- Verification logged: `verified_by`, `verified_at`
- Verified evidence displays badge in UI

## H.5 Evidence Aging Logic

### H.5.1 Freshness Definition

Evidence is "fresh" for a compliance period if:
- Upload date is within compliance period, OR
- Evidence is explicitly linked to that period

### H.5.2 Stale Evidence Handling

- Evidence older than current compliance period marked "Historical"
- Historical evidence visible but grayed out
- Cannot link historical evidence to current period obligations (warning if attempted)

## H.6 Evidence Types

### H.6.1 Supported File Types

| Category | Extensions | Max Size |
|----------|------------|----------|
| Documents | PDF | 50MB |
| Images | JPEG, PNG, GIF, WEBP | 20MB |
| Data | CSV, XLSX | 10MB |
| Archives | ZIP (for bulk upload) | 100MB |

### H.6.2 Blocked File Types

**Explicitly Blocked Formats:**
The following file types are explicitly blocked and will be rejected with an error message:

| Category | Blocked Extensions | Reason |
|----------|-------------------|--------|
| **CAD Files** | .dwg, .dxf, .step, .stp, .iges, .igs | Not supported for extraction; use PDF export |
| **Spreadsheet Images** | Images of spreadsheets (detected by filename/OCR) | Use native CSV/XLSX format instead |
| **Word Documents** | .doc, .docx | Use PDF export; Word format not supported |
| **PowerPoint** | .ppt, .pptx | Use PDF export; presentation format not supported |
| **Executables** | .exe, .bat, .sh, .app | Security risk |
| **Compressed (non-ZIP)** | .rar, .7z, .tar, .gz | Use ZIP format only |
| **Media Files** | .mp4, .avi, .mov, .mp3, .wav | Not supported for evidence |
| **Code Files** | .js, .py, .java, .cpp, .sql | Not relevant for compliance evidence |

**Blocking Logic:**
- **File Extension Check:** System checks file extension on upload
- **MIME Type Validation:** System validates MIME type matches extension
- **Content Detection:** For images, system detects if image contains spreadsheet/table (OCR-based detection)
- **Error Message:** "File type [extension] is not supported. Please convert to PDF, CSV, or XLSX format."

**Exception Handling:**
- **If** user uploads blocked format, **then**:
  - Display error: "File type [extension] is not supported. Supported formats: PDF, CSV, XLSX, JPEG, PNG, GIF, WEBP, ZIP"
  - Offer conversion suggestion: "Please convert to PDF and re-upload"
  - Block upload and return to upload screen

### H.6.3 Evidence Type by Obligation Category

| Obligation Category | Recommended Evidence Types |
|--------------------|-----------------------------|
| Monitoring | Lab reports (PDF), data exports (CSV), photos |
| Reporting | Submission receipts (PDF), report copies |
| Record-Keeping | Register excerpts (PDF), log exports (CSV) |
| Operational | Photos, inspection checklists (PDF) |
| Maintenance | Service records (PDF), certificates, photos |

## H.7 Evidence Retention Rules

### H.7.1 Retention Periods

| Evidence Type | Minimum Retention |
|---------------|-------------------|
| All evidence (STANDARD) | 7 years from upload |
| Evidence linked to incidents (INCIDENT) | 10 years |
| Evidence for improvement conditions (IMPROVEMENT_CONDITION) | Until condition closed + 2 years |

### H.7.2 Deletion Rules

**Evidence Immutability Rules:**

1. **Evidence Cannot Be Deleted:**
   - Once uploaded, evidence cannot be deleted by users
   - Only system can archive after retention period (7 years for STANDARD, 10 years for INCIDENT, condition closed + 2 years for IMPROVEMENT_CONDITION)
   - This ensures complete audit trail and regulatory compliance

2. **Evidence Can Be Unlinked:**
   - Users can unlink evidence from obligations
   - Unlinking is logged in audit_logs
   - Evidence remains in system (not deleted)

3. **Evidence Replacement:**
   - If user uploads wrong file:
     - Upload new evidence file
     - Link new evidence to obligation
     - Unlink old evidence (if needed)
     - Old evidence remains (for audit trail)

4. **Evidence Correction:**
   - If evidence is linked to wrong obligation:
     - Unlink from wrong obligation
     - Link to correct obligation
     - Both actions logged
     - Evidence file itself unchanged

- Evidence cannot be deleted by users
- System marks evidence as "Archived" after retention period
- Archived evidence moved to cold storage
- Full deletion requires Owner request + 30-day hold

---

# I. AUDIT PACK LOGIC

## I.1 Module-Specific Pack Structures

### I.1.1 Module 1 Audit Pack

**Sections:**
1. Cover page
2. Permit summary
3. Compliance dashboard summary
4. Obligation matrix (all obligations with status)
5. Gap analysis (overdue + missing evidence)
6. Evidence appendix (organised by condition)
7. Improvement condition status (if applicable)
8. Revision history

### I.1.2 Module 2 Audit Pack

**Sections:**
1. Cover page
2. Consent summary
3. Parameter compliance matrix
4. Exceedance summary
5. Trend charts
6. Lab result appendix
7. Gap analysis
8. Revision history

### I.1.3 Module 3 Audit Pack

**Sections:**
1. Cover page
2. Generator inventory
3. Run-hour summary (per generator, per period)
4. Limit utilisation chart
5. Maintenance summary
6. Stack test results
7. AER preparation status
8. Gap analysis
9. Revision history

## I.2 Evidence Matrix Rules

### I.2.1 Matrix Structure

| Condition | Obligation | Frequency | Evidence Count | Last Evidence Date | Status |
|-----------|------------|-----------|----------------|-------------------|--------|
| 2.3.1 | pH monitoring | Weekly | 12 | 2024-06-10 | ✅ Complete |
| 2.3.2 | Noise survey | Annual | 0 | N/A | ❌ Overdue |

### I.2.2 Matrix Population

- Auto-generated from obligation and evidence data
- Status calculated at generation time
- Frozen at generation (subsequent changes don't affect generated pack)

## I.3 Gap Analysis Logic

### I.3.1 Gap Types

| Gap Type | Criteria |
|----------|----------|
| Missing Evidence | Obligation with no evidence in current period |
| Overdue | Deadline passed, no completion recorded |
| Approaching | Deadline within 7 days, no evidence |
| Incomplete | Evidence linked but marked as partial |

### I.3.2 Gap Prioritisation

1. Overdue (highest priority)
2. Approaching
3. Missing Evidence
4. Incomplete

### I.3.3 Gap Recommendations

For each gap, system suggests:
- Required evidence type
- Action: "Upload [evidence type] to resolve"
- Deadline: Next due date

## I.4 Regulator-Ready Formatting

### I.4.1 Format Requirements

- PDF/A format (archival)
- Page numbers
- Table of contents
- Bookmarks for navigation
- Professional formatting
- Watermark: "EcoComply - Generated [date]"

### I.4.2 Regulator-Specific Templates

| Regulator | Template Adjustments |
|-----------|---------------------|
| EA (England) | Standard template |
| SEPA (Scotland) | Scottish terminology, SEPA logo placeholder |
| NRW (Wales) | Welsh/English bilingual options |
| NIEA (N. Ireland) | NIEA terminology |

## I.5 Pack Compilation (Base Process — All Pack Types)

### I.5.1 Compilation Process

1. User initiates generation (selects pack type, or scheduled trigger)
2. System queries all relevant data (pack type-specific)
3. Evidence files retrieved from storage
4. PDF generated with pack type-specific formatting
5. Stored in audit_packs table (with pack_type field)
6. User notified: "[Pack Type] pack ready for download"

**v1.0 Update:** Pack type determines content structure. See Section I.8 for pack type-specific compilation logic.

### I.5.2 Generation Time Limits

- Target: <60 seconds for typical pack
- Large packs (>100 evidence items): Background processing, email when ready
- Maximum evidence items: 500 per pack

### I.5.3 Pack Generation Failure Scenarios

**Mid-Process Failure:**
- If generation fails after partial completion:
  - Mark pack as `status = 'FAILED'` in audit_packs table (if pack record exists)
  - Log error details to `audit_logs` table
  - Notify user: "Pack generation failed. Please try again."
  - Allow user to retry (will regenerate from scratch)
  - Partial data not saved (transaction rollback)

**PDF Generation Library Failure:**
- If PDF library throws error:
  - Retry twice (3 total attempts) with different PDF library (if available)
  - If still fails:
    - Mark pack as `status = 'FAILED'`
    - Return error: "PDF generation unavailable. Please contact support."
    - Log error for debugging
    - Alert admins

**Storage Quota Exceeded:**
- If Supabase storage quota reached:
  - Return error: "Storage quota exceeded. Please contact support to increase quota."
  - Do not generate pack
  - Alert admins immediately
  - Log quota status

**Timeout (>5 minutes):**
- If generation takes >5 minutes:
  - Cancel generation
  - Mark as failed
  - Notify user: "Pack generation timed out. Please try with smaller date range or fewer obligations."
  - Suggest: Reduce date range, filter obligations, or contact support
  - Log timeout for performance analysis

**Missing Evidence Files:**
- If evidence files are missing from storage:
  - Continue generation (don't fail)
  - Include note in pack: "Evidence file [filename] not found in storage"
  - Mark obligation as "Evidence Missing" in pack
  - Log missing files to audit_logs
  - Notify user: "Some evidence files were missing. Pack generated with gaps noted."

## I.6 Pack Content Filters (Applies to All Pack Types)

### I.6.1 Available Filters

| Filter | Options |
|--------|---------|
| Date range | Custom start/end dates |
| Status | All, Complete only, Gaps only |
| Category | Monitoring, Reporting, etc. |
| Conditions | Specific condition selection |
| Evidence | Include evidence / Exclude evidence |

### I.6.2 Filter Defaults

- Date range: Current compliance year
- Status: All
- Category: All
- Conditions: All
- Evidence: Include

## I.7 Pack Generation Triggers (Applies to All Pack Types)

### I.7.1 Trigger Types

| Trigger | Initiator |
|---------|-----------|
| Manual | User clicks "Generate Pack" (selects pack type) |
| Scheduled | Configured schedule (weekly/monthly) |
| Pre-inspection | User marks upcoming inspection |
| Deadline-based | Auto-generate before permit renewal |

**v1.0 Update:** Pack type selection is part of manual trigger. See Section I.8.6 for pack type selection logic.

### I.7.2 Scheduled Generation

- User configures schedule in settings
- Options: Weekly (Friday), Monthly (last day), Quarterly
- **Pack Type Selection:** User must select pack type for scheduled generation
  - Default: Regulator Pack for Core Plan
  - Default: Audit Pack for Growth Plan
  - User can override default in schedule settings
- Generated pack sent via email to configured recipients

---

> [v1 UPDATE – Pack Generation Logic – 2024-12-27]

# I.8 v1.0 Pack Types — Generation Logic

## I.8.1 Pack Type Enum

**Pack Types:**
- `AUDIT_PACK` — Full evidence compilation (existing, all plans)
- `REGULATOR_INSPECTION` — Inspector-ready compliance pack (Core plan, included)
- `TENDER_CLIENT_ASSURANCE` — Compliance summary for tenders (Growth plan)
- `BOARD_MULTI_SITE_RISK` — Multi-site risk summary (Growth plan)
- `INSURER_BROKER` — Risk narrative for insurance (requires Growth Plan, same as Tender Pack — independent pack type)

**Pack Type Access Control:**
- Core Plan: `REGULATOR_INSPECTION`, `AUDIT_PACK`
- Growth Plan: All pack types
- Consultant Edition: All pack types for assigned clients

## I.8.2 Regulator/Inspection Pack Logic

**Purpose:** Inspector-ready compliance evidence compilation for regulatory inspections.

**Content Structure:**
1. Cover page (company name, site name, permit reference, generation date)
2. Executive summary (compliance status overview, key metrics)
3. Permit summary (permit details, expiry date, conditions count)
4. Compliance dashboard summary (traffic light status, obligation counts)
5. Obligation matrix (all obligations with evidence status)
6. Gap analysis (overdue + missing evidence, prioritized)
7. Evidence appendix (full evidence files organized by condition)
8. Improvement condition status (if applicable)
9. Revision history

**Data Sources (reuses existing data only):**
- `documents` table (permit details)
- `obligations` table (all obligations with status)
- `evidence_items` table (linked evidence)
- `obligation_evidence_links` table (evidence-to-obligation mapping)
- `schedules` table (monitoring schedules)
- `deadlines` table (upcoming deadlines)

**Generation Rules:**
- Includes all obligations regardless of status
- Shows complete evidence trail
- Highlights gaps prominently
- Professional regulator-ready formatting
- PDF/A archival format

## I.8.3 Tender/Client Assurance Pack Logic

**Purpose:** Compliance summary for client tenders and assurance requests.

**Content Structure:**
1. Cover page (company name, compliance summary, generation date)
2. Compliance overview (high-level status, key metrics)
3. Evidence samples (representative evidence, not full appendix)
4. Risk assessment (compliance risk summary, gap highlights)
5. Action plan (remediation steps for identified gaps)
6. Compliance certification statement

**Data Sources (reuses existing data only):**
- Same as Regulator Pack but filtered/aggregated differently
- Evidence samples: Latest evidence per obligation category
- Risk assessment: Derived from gap analysis

**Generation Rules:**
- Summary-focused (not exhaustive evidence)
- Emphasizes compliance strengths
- Highlights remediation plans for gaps
- Professional client-facing format
- Suitable for external sharing

## I.8.4 Board/Multi-Site Risk Pack Logic

**Purpose:** Multi-site risk summary and compliance trends for board reporting.

**Content Structure:**
1. Executive summary (multi-site compliance overview)
2. Risk dashboard (aggregated metrics across all sites)
3. Site-by-site compliance matrix
4. Trend analysis (compliance trends over time)
5. Key metrics (overdue obligations, evidence gaps, inspection readiness)
6. Risk prioritization (sites requiring attention)
7. Action items (board-level recommendations)

**Data Sources (reuses existing data only):**
- Aggregates data from `sites` table (all company sites)
- Cross-site obligation aggregation
- Cross-site evidence completeness
- Historical compliance trends from `audit_packs` table

**Access Requirements:**
- **Plan:** Growth Plan or Consultant Edition
- **Role:** Owner or Admin only (Staff cannot generate Board Packs)
- **Rationale:** Board Pack contains company-wide risk data requiring executive-level access

**Generation Rules:**
- Multi-site aggregation (requires `company_id` scope)
- Board-level summary (not detailed evidence)
- Trend visualization (compliance over time)
- Risk-focused presentation
- Suitable for executive reporting

**Validation Rules:**
- Board Pack MUST have `company_id` (required)
- Board Pack MUST have `site_id = NULL` (enforced — multi-site scope)
- All other pack types require both `company_id` AND `site_id`
- System validates: `IF pack_type = 'BOARD_MULTI_SITE_RISK' THEN site_id MUST BE NULL`
- System validates: `IF pack_type = 'BOARD_MULTI_SITE_RISK' THEN user role MUST BE 'OWNER' OR 'ADMIN'`

**Multi-Site Aggregation Logic:**
```sql
-- Example: Aggregate compliance metrics across all company sites
SELECT 
  COUNT(DISTINCT s.id) as total_sites,
  COUNT(DISTINCT o.id) as total_obligations,
  COUNT(DISTINCT CASE WHEN o.status = 'OVERDUE' THEN o.id END) as overdue_count,
  COUNT(DISTINCT e.id) as total_evidence_items,
  AVG(compliance_score) as avg_compliance_score
FROM companies c
JOIN sites s ON s.company_id = c.id
LEFT JOIN documents d ON d.site_id = s.id
LEFT JOIN obligations o ON o.document_id = d.id
LEFT JOIN evidence_items e ON e.site_id = s.id
WHERE c.id = :company_id
GROUP BY c.id
```

## I.8.5 Insurer/Broker Pack Logic

**Purpose:** Risk narrative and compliance controls for insurance purposes.

**Pack Type:** `INSURER_BROKER` — Separate pack type (not automatically bundled)

**Access:** Growth Plan required (same as Tender Pack, but independent generation)

**Note:** "Bundled" refers to plan requirement (both require Growth Plan), not automatic generation. Users can generate Insurer Pack independently of Tender Pack.

**Content Structure:**
1. Risk narrative (compliance risk overview)
2. Compliance controls summary (evidence of controls in place)
3. Evidence overview (summary of evidence types, not full files)
4. Gap analysis (identified risks and mitigation)
5. Compliance certification (compliance status statement)

**Data Sources (reuses existing data only):**
- Same data sources as other packs
- Focused on risk narrative and controls
- Evidence overview (not full evidence files)

**Generation Rules:**
- Risk-focused narrative
- Emphasizes compliance controls
- Evidence overview (not exhaustive)
- Professional insurance-ready format
- Suitable for broker/insurer sharing
- Independent generation (not tied to Tender Pack generation)

## I.8.6 Pack Type Selection Logic

**User Selection Flow:**
1. User navigates to pack generation
2. System checks user's plan (Core/Growth/Consultant)
3. System displays available pack types based on plan
4. User selects pack type
5. System validates plan access (enforces Growth plan for Tender/Board/Insurer packs)
6. System generates pack with appropriate content structure

**Plan-Based Access:**
- Core Plan: `REGULATOR_INSPECTION`, `AUDIT_PACK` only
- Growth Plan: All pack types
- Consultant Edition: All pack types (for assigned clients)

**Pack Type Validation:**
```typescript
function canGeneratePackType(userPlan: string, packType: string): boolean {
  const corePackTypes = ['REGULATOR_INSPECTION', 'AUDIT_PACK'];
  const growthPackTypes = ['TENDER_CLIENT_ASSURANCE', 'BOARD_MULTI_SITE_RISK', 'INSURER_BROKER'];
  
  if (corePackTypes.includes(packType)) {
    return true; // Available to all plans
  }
  
  if (growthPackTypes.includes(packType)) {
    return userPlan === 'GROWTH' || userPlan === 'CONSULTANT';
  }
  
  return false;
}
```

## I.8.7 Pack Distribution Logic

**Distribution Methods:**
- `DOWNLOAD` — User downloads pack directly
- `EMAIL` — Pack sent via email to specified recipients
- `SHARED_LINK` — Shareable link generated (time-limited, access-controlled)

**Distribution Rules:**
- **Download:** All pack types, all plans (Core Plan can download Regulator Pack and Audit Pack)
- **Email:** 
  - Core Plan: Regulator Pack and Audit Pack only (email to inspectors/internal auditors)
  - Growth Plan: All pack types (Regulator, Audit, Tender, Board, Insurer)
  - **Rationale:** Email is a basic expectation for regulator/inspector communication. Client-facing packs (Tender, Board, Insurer) require Growth Plan.
- **Shared Link:** Growth Plan packs only (Tender, Board, Insurer, Audit)
  - **Rationale:** Shared links are premium feature for professional client engagement
- **Consultant Edition:** Can distribute client packs to clients (all distribution methods available for assigned clients)

**Shared Link Security:**
- Time-limited (default: 30 days)
- Access-controlled (requires authentication or password)
- Tracked (views logged in `pack_sharing` table)

---

> [v1 UPDATE – Consultant Control Centre – 2024-12-27]

# C.5 Consultant Control Centre Logic

## C.5.1 Consultant User Model

**Consultant Role:**
- Consultant is a `User` with `role = 'CONSULTANT'` in `user_roles` table
- Consultant must have `plan = 'CONSULTANT'` (Consultant Edition subscription)
- Role and plan must match: `role = 'CONSULTANT'` requires `plan = 'CONSULTANT'`
- Consultant can be assigned to multiple client companies
- Consultant access is scoped via `consultant_client_assignments` table

**Validation:**
- System enforces: If `role = 'CONSULTANT'`, then `plan` MUST be `'CONSULTANT'`
- Cannot have Consultant role without Consultant Edition subscription
- Consultant Edition subscription grants `role = 'CONSULTANT'` automatically

**Consultant Assignment:**
- Assignment stored in `consultant_client_assignments` table
- Fields: `consultant_id`, `client_company_id`, `assigned_at`, `status`
- Status: `ACTIVE` (can access) or `INACTIVE` (access revoked)

## C.5.2 Consultant Access Logic

**Access Scope:**
- Consultant can only access assigned client companies
- Consultant can access all sites within assigned companies
- Consultant can view/edit obligations, evidence, schedules for assigned clients
- Consultant can generate packs for assigned clients
- Consultant cannot manage billing or company settings

**Access Validation:**
```typescript
function canConsultantAccessCompany(consultantId: UUID, companyId: UUID): boolean {
  const assignment = await db.query(`
    SELECT 1 FROM consultant_client_assignments
    WHERE consultant_id = :consultantId
      AND client_company_id = :companyId
      AND status = 'ACTIVE'
  `);
  return assignment.length > 0;
}
```

## C.5.3 Consultant Dashboard Logic

**Dashboard Content:**
- Client list (all assigned clients with compliance status)
- Client compliance overview (aggregated metrics)
- Recent activity (client updates, pack generations)
- Upcoming deadlines (across all clients)
- Client alerts (overdue obligations, gaps)

**Multi-Client Aggregation:**
- Aggregates data from all assigned client companies
- Shows cross-client compliance trends
- Highlights clients requiring attention
- Provides client switching interface

## C.5.4 Consultant Pack Generation

**Pack Generation for Clients:**
- Consultant can generate any pack type for assigned clients
- Pack generation follows same logic as regular users
- Packs are associated with client company (not consultant's company)
- Consultant can distribute packs to clients via email/shared link

**Client Pack Distribution:**
- Consultant can email packs directly to client contacts
- Consultant can generate shareable links for clients
- Distribution tracked in `pack_sharing` table
- Client receives notification when pack is distributed

## C.5.5 Consultant Permissions Matrix

| Action | Consultant Permission |
|--------|----------------------|
| View assigned clients | ✅ Yes |
| View client obligations | ✅ Yes (assigned clients only) |
| Edit client obligations | ✅ Yes (assigned clients only) |
| Upload client evidence | ✅ Yes (assigned clients only) |
| Generate client packs | ✅ Yes (all pack types for assigned clients) |
| Distribute client packs | ✅ Yes (email/shared link) |
| Manage client users | ❌ No |
| Manage client billing | ❌ No |
| Manage client company settings | ❌ No |
| Access unassigned clients | ❌ No |

## C.5.6 Consultant Client Assignment Workflow

**Assignment Process:**
1. Client company owner/admin assigns consultant
2. System creates `consultant_client_assignments` record
3. Consultant receives notification: "You've been assigned to [Client Company]"
4. Consultant can now access client data
5. Consultant appears in client's user list (read-only view)

**Revocation Process:**
1. Client company owner/admin revokes consultant access
2. System updates `consultant_client_assignments.status = 'INACTIVE'`
3. Consultant immediately loses access to client data
4. Consultant receives notification: "Access to [Client Company] revoked"
5. Historical pack generations remain (consultant attribution preserved)

---

# J. EDGE CASES & FAILURE MODES

## J.1 Missing Sections

### J.1.1 Scenario

Document uploaded but expected sections not found.

### J.1.2 Handling

1. System attempts full-document extraction
2. If <5 obligations extracted from >10 page document: Flag quality warning
3. User prompted: "This document may be incomplete or poorly scanned. Please review."
4. Options: Proceed with extracted data, Re-upload document, Manual entry mode

## J.2 Bad Scans

### J.2.1 Detection

- OCR confidence <80%
- >10% of text contains unrecognised characters
- Page orientation issues detected

### J.2.2 Handling

1. Alert user: "Document quality issues detected"
2. Show problematic pages/sections
3. Options: Proceed with warnings, Re-upload better scan, Manual entry
4. If proceeding, all extractions flagged for mandatory review

## J.3 Conflicting Obligations

### J.3.1 Scenario

Two obligations in same document specify conflicting requirements.
Example: Condition 3.1 says "monthly monitoring", Condition 5.2 says "quarterly monitoring" for same parameter.

### J.3.2 Detection

- LLM flags potential conflicts during extraction
- Rule: Same subject + different frequency = conflict

### J.3.3 Handling

1. Both obligations created
2. Conflict badge displayed
3. User must review and resolve:
   - Choose one (mark other as superseded)
   - Keep both (confirm both are valid)
   - Merge (create single obligation with clarification)
4. Resolution logged

## J.4 Overlapping Deadlines

### J.4.1 Scenario

Multiple obligations with same deadline date.

### J.4.2 Handling

- Not treated as error (common scenario)
- Dashboard groups by deadline date
- Consolidated alert: "5 items due on 15 June 2024"

## J.5 Multi-Site Shared Permits

### J.5.1 Scenario

Single permit covers multiple sites.

### J.5.2 Handling

1. User uploads permit
2. User selects: "Single site" or "Multiple sites"
3. If multiple sites:
   - User selects which sites
   - Document linked to all selected sites
   - Obligations replicated per site OR shared (user choice)
4. Evidence can be linked site-specifically or across all linked sites

## J.6 Version Conflicts

### J.6.1 Scenario

User uploads new permit version while obligations from old version are incomplete.

### J.6.2 Handling

1. System detects version conflict
2. Warning: "Outstanding items exist on previous version"
3. Options:
   - Migrate outstanding items to new version
   - Archive outstanding items (mark as superseded)
   - Keep both versions active temporarily
4. Migration attempts auto-matching; unmatched items flagged

## J.7 Extraction Failure

### J.7.1 Total Extraction Failure

**Scenario:** LLM returns no valid obligations.

**Handling:**
1. Retry with alternative prompt
2. If retry fails, enter Manual Mode
3. Manual Mode: User creates obligations manually with text selection
4. Log extraction failure for rule library improvement

### J.7.2 Partial Extraction Failure

**Scenario:** Some sections extract, others fail.

**Handling:**
1. Show successful extractions
2. Highlight failed sections
3. Prompt: "Some sections could not be processed automatically"
4. Options: Manual entry for failed sections, Retry, Skip

## J.8 Deadline Miss Handling

### J.8.1 Deadline Missed - No Evidence

**Status:** Overdue

**Actions:**
1. Alert sent (escalating)
2. Dashboard shows overdue badge
3. Pack gap analysis includes (all pack types)
4. User can:
   - Upload evidence (changes status to Late Complete)
   - Mark N/A with reason (changes status to N/A)
   - Request extension (status remains Overdue with note)

### J.8.2 Deadline Missed - Evidence Exists

**Status:** Late Complete

**Actions:**
1. Evidence linked post-deadline
2. Status: Complete (Late)
3. Late flag visible in packs (all pack types)
4. No further alerts

## J.9 Evidence Missing Scenarios

### J.9.1 Expected Evidence Not Uploaded

**Detection:**
- Compliance period ended
- Obligation has no evidence for that period

**Handling:**
1. Status: Incomplete
2. Alert: "Evidence expected but not found for [period]"
3. User can upload retroactively
4. Packs note evidence gap (all pack types)

### J.9.2 Evidence Uploaded but Not Linked

**Detection:**
- Evidence in system with matching metadata
- Not linked to any obligation

**Handling:**
1. Dashboard widget: "Unlinked Evidence"
2. Suggestions shown: "This evidence may relate to [obligation]"
3. User can link or ignore

## J.10 Error States

### J.10.1 Error State Definitions

| State | Definition | User Experience |
|-------|------------|-----------------|
| Upload Failed | File upload did not complete | Retry prompt |
| Processing Failed | Extraction failed after upload | Manual mode option |
| Storage Error | Evidence not saved | Retry, then support contact |
| Sync Error | Data inconsistency detected | Admin notification |
| Timeout | Operation exceeded time limit | Retry or background processing |

### J.10.2 Error Recovery Workflows

**General Recovery:**
1. Error logged with stack trace
2. User-friendly message displayed
3. Retry option offered
4. If 3 retries fail: Support contact prompt
5. All errors tracked for system health monitoring

**Data Recovery:**
- All critical data changes are transactional
- Failed transactions rolled back
- Recovery point: Last successful save

---

# APPENDIX: GLOSSARY

| Term | Definition |
|------|------------|
| **AER** | Annual Emissions Report - required annual submission for MCPD registrations |
| **BOD** | Biochemical Oxygen Demand - trade effluent parameter |
| **COD** | Chemical Oxygen Demand - trade effluent parameter |
| **EA** | Environment Agency (England) |
| **ELV** | Emission Limit Value |
| **MCPD** | Medium Combustion Plant Directive |
| **NRW** | Natural Resources Wales |
| **OCR** | Optical Character Recognition |
| **RLS** | Row Level Security |
| **SEPA** | Scottish Environment Protection Agency |
| **WML** | Waste Management Licence |

---

**END OF PRODUCT LOGIC SPECIFICATION**

*Document Version: 1.3*
*Generated for: EcoComply Platform*
*Last Updated: 2025-12-01*

---

# CHANGELOG

## Version 1.3 (2025-12-01)

### Major Additions

**Cross-Cutting Features (All Modules):**
1. **Universal Compliance Clock (Section A.10):**
   - Platform-wide countdown mechanism for ALL modules
   - Supports 7 entity types: OBLIGATION, DEADLINE, PARAMETER, GENERATOR, CONSENT, WASTE_STREAM, CONTRACTOR_LICENCE
   - Red/Amber/Green criticality calculation (RED: ≤7 days, AMBER: 8-30 days, GREEN: >30 days)
   - Automatic daily background job updates at 00:01 UTC
   - Dashboard aggregation with drill-down capability
   - Reminder generation at configurable intervals
   - Audit trail for all clock-related actions

2. **Configurable Escalation Workflows (Section B.6.4):**
   - Company-specific escalation rules replacing hard-coded logic
   - Four escalation levels with configurable day thresholds
   - Recipient lists per level (user IDs to notify)
   - Optional obligation_category filtering
   - Sequential level progression (cannot skip levels)
   - Resolution tracking and notification
   - System default workflow as fallback

3. **SLA Timer Tracking on Deadlines (Section B.7):**
   - Separate internal SLA tracking from external deadlines
   - sla_target_date can differ from due_date
   - Track breach time separately: sla_breached_at, sla_breach_duration_hours
   - SLA performance metrics dashboard
   - Used for internal performance monitoring

4. **Recurrence Trigger Execution Log (Section B.8):**
   - Immutable audit trail of all trigger executions
   - Answers: "Why was this deadline created?"
   - System-only writes, retained forever
   - Used for debugging and regulatory audits

**Module 1 (Environmental Permits):**
5. **Permit Workflows (Section C.1.9):**
   - State machine for variations, renewals, surrenders
   - States: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → COMPLETED
   - Impact analysis required for variations
   - Auto-creation of renewal workflows 90 days before expiry
   - Final inspection evidence required for surrenders
   - Regulator response deadline tracking in compliance clock

**Module 2 (Trade Effluent):**
6. **Corrective Action Workflows (Section C.2.9):**
   - Five-phase lifecycle: TRIGGER → INVESTIGATION → ACTION → RESOLUTION → CLOSURE
   - Automatically triggered by exceedances
   - Corrective action items (sub-tasks) with cross-site visibility
   - Resolution evidence required, optional closure approval
   - Referenced from Section C.4.6 (full lifecycle documentation)

**Module 3 (MCPD/Generators):**
7. **Runtime Monitoring Reason Codes (Section C.3.10):**
   - Structured reason codes for manual runtime entries
   - Codes: TESTING, EMERGENCY, MAINTENANCE, ROUTINE, OTHER
   - Validation workflow: PENDING → APPROVED/REJECTED
   - REJECTED entries don't count toward runtime limits
   - Mandatory notes for OTHER reason code
   - CSV import traceability via csv_import_id

**Module 4 (Hazardous Waste) - NEW MODULE (Section C.4):**
8. **Validation Rules Engine (Section C.4.3-C.4.5):**
   - Configurable pre-submission validation for consignment notes
   - Rule types: CARRIER_LICENCE, VOLUME_LIMIT, STORAGE_DURATION, EWC_CODE, DESTINATION, CUSTOM
   - Severity levels: ERROR (blocks), WARNING (flags), INFO (notifies)
   - Immutable validation execution audit log
   - Rule execution order: ERROR → WARNING → INFO

9. **Corrective Action Lifecycle (Section C.4.6-C.4.7):**
   - Five-phase lifecycle (applies to Modules 2 & 4)
   - Corrective action items (sub-tasks) with due dates and evidence requirements
   - Cross-site visibility for assigned users
   - Parent-child dependency: Cannot move to RESOLUTION until all items COMPLETED
   - Auto-notify assigned users on creation and before due dates

10. **Chain of Custody Tracking (Section C.4.8-C.4.12):**
    - Six chain stages: Generation → Storage → Collection → Transport → Reception → Treatment/Disposal
    - Chain-break detection with automatic corrective action creation
    - Carrier/contractor licence tracking with compliance clock integration
    - Volume limits tracking with threshold alerts (70%, 85%, 95%, 100%)
    - Storage duration limits with EWC-specific rules
    - End-point proof requirements (certificates of destruction/recycling)
    - Complete audit trail for regulatory inspections

### Document Structure Changes

- Updated document title: "Modules 1–3" → "Modules 1–4"
- Updated version: 1.0 → 1.3
- Updated dependencies to reference Database Schema v1.3 and Canonical Dictionary v1.3
- Added Module 4 section (C.4) with 13 subsections
- Renumbered Module Extension Pattern from C.4 → C.5

### Cross-References Added

- Universal Compliance Clock referenced in all module sections
- Corrective Action Lifecycle documented once (C.4.6) and referenced from Module 2 (C.2.9)
- Escalation Workflows integrated with Compliance Clock (Section A.10.6)
- SLA Timer Tracking documented separately from deadline tracking

### Audit Trail & Compliance Enhancements

- All new features include comprehensive audit trail requirements
- Immutable logs for trigger executions and validation executions
- Complete chain-of-custody documentation for Module 4
- Enhanced pack generation requirements across all modules

---

## Version 1.0 (2024-12-27)

- Initial version covering Modules 1-3
- Core business logic for Environmental Permits, Trade Effluent, MCPD/Generators
- Audit pack generation logic (5 pack types)
- Cross-module logic and prerequisites
- AI extraction boundaries and retry policies  
*Source Documents: Master Commercial Plan (MCP), Master Build Order*
