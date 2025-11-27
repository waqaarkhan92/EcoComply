# PRODUCT LOGIC SPECIFICATION (PLS)
## Oblicore Platform — Modules 1–3

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Depends On:** Master Commercial Plan (MCP)

> [v1 UPDATE – Version Header – 2024-12-27]

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

**Standard Conditions:**
- Pattern: "Schedule X", "Condition X.X", numbered lists
- Treatment: Match against standard conditions library first; if match found (confidence ≥90%), use library version
- Human review trigger: No library match found

**Site-Specific Conditions:**
- Pattern: Conditions not matching standard library
- Treatment: Full LLM extraction with mandatory human review
- Human review trigger: Always flagged

**Improvement Conditions:**
- Pattern: Contains deadline date, "by [date]", "within [timeframe]", "improvement programme"
- Treatment: Extract deadline date, create one-time schedule
- Human review trigger: Date parsing uncertainty, ambiguous deadline phrasing

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
| **70–84%** | Flag for review | Yellow highlight; "Review recommended" label |
| **<70%** | Require review | Red highlight; cannot proceed without human confirmation |

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
- **Maximum Retries:** 2 attempts (initial attempt + 2 retries = 3 total attempts)
- **Retry Triggers:**
  - LLM timeout (>30 seconds for standard documents, >5 minutes for large documents)
  - Invalid JSON response from LLM
  - Network timeout
  - Rate limit errors (429)
- **Retry Delay:** Exponential backoff: 2 seconds (first retry), 4 seconds (second retry)
- **After Max Retries:** Flag for manual review; user can retry manually or enter Manual Mode

**Timeout Policy:**
- **Standard Documents (<50 pages):** 30 seconds timeout
- **Large Documents (≥50 pages):** 5 minutes timeout
- **OCR Processing:** 60 seconds timeout
- **Pack Generation:** 60 seconds (standard), 5 minutes (large packs with >500 items) — applies to all pack types

**Enforcement:**
- All AI operations must use these values
- Workflow documents reference this policy
- AI Layer implementation must match these values
- No hardcoded retry/timeout values in workflows - all reference this section

**References:**
- AI Layer implementation: `maxRetries: 2`, `timeout: 30_000` (standard), `timeout: 300_000` (large)
- Workflow retry logic: "Retry processing (up to 2 additional attempts)" = references this policy
- PLS error handling table: "LLM timeout (>30s) | Retry once" = references this policy (retry once = 1 retry after initial attempt = 2 total attempts)

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

> "Extracted obligations are derived by AI and may contain errors. Users must verify all extractions against original documents. Oblicore does not guarantee completeness or accuracy of extractions. All compliance decisions remain the user's responsibility."

**Implementation:**
- Disclaimer appears on every extraction review screen
- Disclaimer included in all pack headers (all pack types)
- Users must check "I have reviewed and verified these obligations" before finalising document setup

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
- `frequency` - Required: Frequency value (daily, weekly, monthly, quarterly, annually, one-time)
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
- Frequency validation: Must be one of: daily, weekly, monthly, quarterly, annually, one-time
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

**Primary Model (GPT-4.1):**
- **Use Cases:** All standard document extraction tasks
- **Trigger:** Document size < 50 pages, standard document types
- **Model Identifier:** `gpt-4o`
- **Timeout:** 30 seconds (standard), 5 minutes (large documents)

**Secondary Model (GPT-4.1-mini):**
- **Use Cases:** Simple documents, low-priority extractions, retry attempts
- **Trigger:** Document size < 20 pages, simple document structure, cost optimization needed
- **Model Identifier:** `gpt-4o-mini`
- **Timeout:** 30 seconds

**Model Selection Decision Tree:**
1. **If** document size ≥ 50 pages, **then** use GPT-4.1 (primary)
2. **If** document size < 20 pages AND simple structure, **then** use GPT-4.1-mini (secondary)
3. **If** document size 20-49 pages, **then** use GPT-4.1 (primary)
4. **If** primary model fails (timeout/error), **then** retry with GPT-4.1-mini
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
| LLM timeout (>30s) | Retry once; if fails, flag entire segment for manual review |
| Invalid JSON response | Retry with simplified prompt; if fails, flag for manual |
| Empty extraction | Flag segment; may indicate non-obligation content |
| Confidence all <50% | Flag document quality issue; prompt user to verify scan quality |

---

## B.3 Deadline Calculation Rules

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

## B.7 Monitoring Schedule Generation

### B.7.1 Schedule Auto-Generation

When obligation is created with frequency:
1. System creates schedule record
2. Schedule linked to obligation
3. First deadline calculated from base date
4. Subsequent deadlines auto-generated on rolling basis

### B.7.2 Schedule Record Structure

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

**See Also:** `Canonical_Dictionary.md` - `background_jobs` table, `job_status` enum, `dead_letter_queue` table

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
- **Upload Restrictions:** Consultants can only upload documents/evidence to assigned client companies/sites
- **Cross-Client Prohibition:** Consultants cannot:
  - View data from unassigned clients
  - Upload documents to unassigned clients
  - Link evidence across different clients
  - Generate packs for unassigned clients (all pack types restricted to assigned clients)

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

## B.11 Obligation Versioning and History

**Purpose:** Track all changes to obligations over time to maintain audit trail and enable "what obligation existed at time of breach" queries.

**Versioning Logic:**
- **Initial Version:** When obligation is extracted, `version_number = 1`, `version_history = []`
- **On Edit:** When obligation is modified:
  1. Increment `version_number` (1 → 2 → 3, etc.)
  2. Create version history entry:
     - `version_number`: Previous version number
     - `edited_by`: User who made the change
     - `edited_at`: Timestamp of change
     - `previous_values`: JSON snapshot of all fields before change
     - `new_values`: JSON snapshot of all fields after change
     - `edit_reason`: Reason for change (required)
  3. Append entry to `version_history` array (immutable append)
  4. Update current obligation fields with new values

**Version History Query:**
- **Query by Version:** `SELECT * FROM obligations WHERE id = :id AND version_number = :version`
- **Query by Date:** System can reconstruct obligation state at any point in time by querying version_history
- **Diff Between Versions:** System can generate diff showing what changed between any two versions

**Regeneration vs Retention Policy:**
- **Retention:** All obligation versions retained indefinitely (never deleted)
- **Regeneration:** When document is updated, system attempts to match obligations to new document version
  - **If** match found, **then** obligation continues with same version_number (no new version created)
  - **If** no match, **then** old obligation archived, new obligation created (version_number = 1)
- **Override Exceptions:** Admin/Owner can override obligation regeneration (keep old obligation, create new obligation separately)

**Audit Trail:**
- All version changes logged in `audit_logs`:
  - `action_type = 'OBLIGATION_VERSION_CREATED'`
  - `previous_values`: Full obligation state before change
  - `new_values`: Full obligation state after change
  - `version_number`: New version number

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

### C.1.9 Module 1 Pack Structure (Legacy — See Section I.8 for v1.0 Pack Types)

> **v1.0 Update:** This section describes Module 1 pack structure. For v1.0 pack types (Regulator, Tender, Board, Insurer, Audit), see Section I.8. Module 1 data is used in all pack types.

**Note:** Module 1 data (permits, obligations, evidence) is used in all 5 pack types. Pack type determines content structure and presentation format. See Section I.8 for pack type-specific logic.

**Additional Module 1 Elements:**
- Permit summary (activities, regulator, permit number)
- Condition compliance matrix
- Improvement condition status summary
- ELV compliance summary (if applicable)
- Regulator contact information

---

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

**Input Methods:**
1. **Manual Entry:** Form with parameter dropdowns, value input
2. **CSV Upload:** Template provided; maps columns to parameters
3. **PDF Upload:** LLM extracts values from lab reports (flagged for review)

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

### C.2.9 Module 2 Audit Pack Structure

**Additional Module 2 Elements:**
- Consent summary (water company, consent number)
- Parameter compliance matrix
- Exceedance history
- Trend charts (3-month, 12-month)
- Lab result appendix

---

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

### C.3.9 Module 3 Audit Pack Structure

**Additional Module 3 Elements:**

---

## C.4 Module Extension Pattern

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
  "trigger_type": "keyword|external|user_request",
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
| LLM Extraction | Timeout (>30s) | Retry once; then flag for manual |
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
| All evidence | 6 years from upload |
| Evidence linked to incidents | 10 years |
| Evidence for improvement conditions | Until condition closed + 2 years |

### H.7.2 Deletion Rules

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
- Watermark: "Oblicore - Generated [date]"

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
- **Email:** Growth Plan packs only (Tender, Board, Insurer, Audit). Core Plan Regulator Pack download only (no email distribution).
- **Shared Link:** Growth Plan packs only (Tender, Board, Insurer, Audit)
- **Rationale:** Email/shared link distribution is premium feature for client-facing packs (Tender, Board, Insurer)
- **Consultant Edition:** Can distribute client packs to clients (all distribution methods available for assigned clients)

**Shared Link Security:**
- Time-limited (default: 30 days)
- Access-controlled (requires authentication or password)
- Tracked (views logged in `pack_distributions` table)

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
- Distribution tracked in `pack_distributions` table
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

*Document Version: 1.0*  
*Generated for: Oblicore Platform*  
*Source Documents: Master Commercial Plan (MCP), Master Build Order*
