# ✅ Oblicore — MASTER BUILD ORDER

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**The Complete, Final, Unified Dependency Flow**

*Nothing missing. No contradictions. No drift.*

> [v1 UPDATE – Version Header – 2024-12-27]

---

## 📋 **DOCUMENT STATUS**

- ✅ **Master Commercial Plan (MCP):** Complete (v1.0 updated)
- ✅ **Product Logic Specification (1.1):** Complete (v1.0 updated)
- ✅ **Canonical Dictionary (1.2):** Complete (v1.0 updated)
- ✅ **User Workflow Maps (1.3):** Complete (v1.0 updated)
- ✅ **AI Layer Design & Cost Optimization (1.5a):** Complete
- ✅ **AI Extraction Rules Library (1.6):** Complete
- ✅ **AI Microservice Prompts (1.7):** Complete (29 production-ready prompts)
- ✅ **Technical Architecture & Stack (2.1):** Complete (v1.0 updated)
- ✅ **Database Schema (2.2):** Complete (v1.0 updated)
- ✅ **Backend API Specification (2.5):** Complete (v1.0 updated)
- ✅ **RLS & Permissions Rules (2.8):** Complete (v1.0 updated)
- ✅ **Background Jobs Specification (2.3):** Complete (v1.0 updated)
- ✅ **Notification & Messaging (2.4):** Complete (v1.0 updated)
- ✅ **Frontend Routes & Component Map (2.6):** Complete (v1.0 updated)
- ✅ **UI/UX Design System (2.9):** Complete (v1.0 updated)
- ✅ **Testing QA Strategy (2.11):** Complete (v1.0 updated)
- ✅ **Onboarding Flow Specification (2.7):** Complete (v1.0 updated)
- ✅ **Pricing Model Explorer:** Complete (v1.0 updated)
- ✅ **New Packs Impact Analysis:** Complete (marked as pre-v1.0 analysis)

## 🔄 **CRITICAL ORDER CORRECTION**

**Product Logic Specification (PLS) must be generated BEFORE Canonical Dictionary.**

**Why:** The MCP is commercial/strategic, not functionally detailed. To create an accurate, complete Canonical Dictionary (with all entities, tables, fields, enums, and statuses), Claude needs the functional workflows, rules, behaviors, and edge cases defined in the PLS first. Without the PLS, the Canonical Dictionary will be incomplete or require guesswork.

**Correct Sequence:**
1. MCP (commercial vision)
2. **Product Logic Specification** (functional rules, workflows, behaviors)
3. **Canonical Dictionary** (entities, tables, naming, enums - derived from PLS)
4. All subsequent documents

---

## 🎯 **BUILD PRINCIPLES**

### Allocation Rules
- **Claude generates:** Business logic, terminology, workflows, AI prompts
- **Cursor generates:** Engineering artifacts, code structure, technical implementation

### Dependency Rules
- Each document depends on all documents listed in its "Depends On" section
- Documents must be generated in numerical order
- No document can be generated until all dependencies are complete

### Quality Rules
- Each document must reference its dependencies explicitly
- Terminology must match Canonical Dictionary exactly
- Logic must align with Product Logic Specification
- Workflows must match User Workflow Maps

---

# 🔵 **LEVEL 0 — FOUNDATION**

## **0.1 Master Commercial Plan (MCP)** ✅

**Status:** ✅ Complete  
**Created by:** Claude (with your edits)  
**File:** `EP_Compliance_Master_Plan.md`

**Source of truth for:**
- The modular architecture (currently 3 modules: Environmental Permits, Trade Effluent, MCPD/Generators). New modules can be added via configuration without code changes.
- ICPs (Waste Operators, Food Processors, Small Manufacturers)
- Pricing (£149/month base, £59/month Module 2, £79/month Module 3) - stored in `modules` table
- Module sequencing (Module 1 first, Modules 2/3 demand-triggered)
- ROI logic (500–900% ROI per module)
- Competitive landscape
- Commercial wedge statements
- Regulatory boundaries

**Feeds into:**
→ All subsequent documents

---

# 🔵 **LEVEL 1 — "NO DRIFT GUARANTEES" (Claude Only)**

These lock terminology + logic so Cursor cannot drift.

---

## **1.1 Product Logic Specification (PLS)** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**Depends on:** MCP (0.1)

**Document Format:**
- Markdown format with clear sections and subsections
- Use examples, scenarios, and step-by-step flows where helpful
- Be specific and detailed—this is the functional blueprint
- Write at a functional level (what happens, when, why) not a technical level (how it's coded)

**What Claude Must Create:**

This document expands the MCP into complete functional detail. It must define:

1. **Obligations → Evidence → Deadlines → Audit Packs:** Complete data flow logic
   - How obligations are created from permits
   - How evidence links to obligations
   - How deadlines are calculated (from what date, what frequency)
   - How audit packs compile evidence
   - What happens at each step

2. **AI extraction behaviour:** 
   - When LLM extracts automatically vs. when it flags for review
   - Confidence thresholds (e.g., >85% = auto-extract, <85% = flag)
   - What triggers human review
   - How extraction errors are handled

3. **Module routing logic:** 
   - How system determines which module handles which document type (configurable via `modules` table)
   - Module routing is dynamic (based on `modules.document_types` JSONB field)
   - Cross-module rule interactions

4. **Human-required review points:** 
   - Subjective obligations (how identified, what happens)
   - Low-confidence extractions (threshold, workflow)
   - Edge cases (what are they, how handled)

5. **Module switching logic:** 
   - How Module 2/3 activate (triggers, prerequisites)
   - Cross-sell trigger detection (what keywords, what actions)
   - User activation vs. automatic detection

6. **Cross-module dependencies:** 
   - Module prerequisites (how modules.requires_module_id enforces prerequisites dynamically)
   - Prerequisite chains (how modules can have multiple levels of prerequisites)
   - What happens if user tries to activate without prerequisite (system queries modules table to check)

7. **How the LLM should process each document type:**
   - EA permits: Extract standard conditions, identify monitoring frequencies, detect deadlines
   - Trade effluent consents: Extract parameter limits, identify sampling frequencies, detect exceedance thresholds
   - MCPD registrations: Extract run-hour limits, identify reporting requirements, detect generator types
   - Step-by-step processing workflow for each

8. **The exact workflow for AI pattern matching:** 
   - Rule library lookup → LLM extraction → Confidence scoring → Human review flagging
   - What happens at each stage
   - Error handling at each stage

9. **Feature-by-feature logic:** 
   - How each feature works functionally (not technically)
   - What inputs, what outputs, what validations
   - For each major feature: permit upload, extraction, evidence linking, scheduling, audit packs, etc.
   - **Excel import logic:** How users can import existing permit/obligation data from Excel/CSV files
     - Excel import as alternative to PDF upload (for users with existing spreadsheets)
     - Excel file format requirements (.xlsx, .xls, CSV)
     - Required columns: permit_number, permit_type, obligation_title, obligation_description, frequency, deadline_date, site_id
     - Optional columns: evidence_linked, notes, regulator, permit_date
     - Column mapping logic (how Excel columns map to database fields)
     - Validation rules (required fields, date formats, frequency values)
     - Error handling (invalid rows, missing required fields, duplicate detection)
     - Bulk import processing (create multiple obligations from single Excel file)
     - Import source tracking (mark obligations as imported from Excel vs extracted from PDF)
     - Import preview (show what will be imported before confirmation)
     - Import completion notification (success count, error count, error details)

10. **Rules for extraction:** 
    - What gets extracted automatically
    - What gets flagged for review
    - What requires human confirmation
    - Examples of each

11. **Rules for subjective flags:** 
   - When obligations are marked as subjective
   - Why (what patterns trigger this)
   - Interpretation locking and history (immutable audit trail - see PLS Section A.6.1)
    - What happens next (workflow)

12. **Monitoring logic:** 
   - How monitoring schedules work
   - How deadlines are calculated (from permit date? from last completion?)
   - Recurring vs. one-time obligations
   - How schedules are customized
   - Schedule modifications logged with audit trail (modified_by, modified_at, previous_values - see PLS Section B.7.3)

13. **Evidence logic:** 
   - How evidence links to obligations (one-to-one? one-to-many?)
   - What evidence types are valid (photos, PDFs, CSVs, etc.)
   - Evidence validation rules
   - Evidence expiry/retention rules
   - Evidence enforcement rule (7-day grace period, escalation logic - see PLS Section B.4.1.1)
   - Document size limits (200 pages max, 10 images per page, 150-600 DPI resolution - see PLS Section B.1.1)

14. **Excel import logic:**
   - **Import methods:** Excel import as alternative to PDF upload for users with existing permit/obligation data
   - **Supported formats:** .xlsx, .xls, CSV (comma-separated values)
   - **File size limits:** 10MB max per Excel file, 10,000 rows max per file
   - **Required columns:** permit_number (or permit_id), obligation_title, obligation_description, frequency, deadline_date (or next_deadline), site_id (or site_name)
   - **Optional columns:** permit_type, permit_date, regulator, evidence_linked, evidence_file_path, notes, category, status
   - **Column mapping:** Flexible column mapping (user can map Excel columns to system fields)
   - **Data validation:** 
     - Date format validation (accepts multiple formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
     - Frequency validation (daily, weekly, monthly, quarterly, annually, one-time)
     - Site validation (site_id must exist, or site_name will be matched/created)
     - Permit validation (permit_number must be unique per site, or will create new permit)
   - **Duplicate detection:** Check for duplicate obligations (same permit_number + obligation_title + site_id)
   - **Bulk processing:** Process all valid rows, skip invalid rows with error reporting
   - **Import preview:** Show preview of what will be imported (obligations count, sites affected, errors)
   - **Import confirmation:** User confirms import after preview, can edit/correct errors before importing
   - **Import source tracking:** Mark obligations with `import_source: 'excel'` vs `import_source: 'pdf_extraction'` vs `import_source: 'manual'`
   - **Error handling:** 
     - Invalid rows: Skip row, report error with row number and reason
     - Missing required fields: Skip row, report missing field
     - Invalid date formats: Attempt to parse, report if unparseable
     - Invalid frequency values: Report error, suggest valid values
   - **Post-import:** 
     - Create obligations from valid rows
     - Link to permits (create permit if permit_number doesn't exist)
     - Create sites if site_name doesn't exist (with user confirmation)
     - Send import completion notification (success count, error count, error details)
   - **Onboarding integration:** Excel import option during onboarding (alternative to PDF upload)

15. **Audit pack logic:** 
   - How audit packs are compiled
   - What evidence is included (all? filtered?)
   - Format and structure
   - Reference integrity rules (how deleted/archived evidence/obligations are handled during generation - see PLS Section B.8.3)
    - Generation triggers

16. **Module 2 logic:** 
    - Trade effluent workflows (consent upload → parameter extraction → tracking)
    - Parameter tracking (how values are stored, compared, alerted)
    - Exceedance detection (80% threshold, 100% breach logic)
    - Water company report generation

16. **Module 3 logic:** 
    - MCPD workflows (registration upload → run-hour tracking)
    - Run-hour tracking (manual entry, automatic from maintenance records)
    - AER generation (data collection, auto-population, submission)

17. **Cross-module flows:** 
    - How modules interact
    - How cross-sell triggers work (detection, notification, activation)
    - Data sharing between modules

18. **Manual override rules:** 
    - When users can override AI extractions
    - How (what UI, what validation)
    - What happens to overridden data

19. **User-level workflows:** 
    - Step-by-step user journeys for each feature
    - What user sees, what actions available, what happens next
    - Decision points and branches

20. **Edge cases:** 
    - Unusual scenarios (multiple permits per site, permit variations, expired permits, etc.)
    - How each is handled
    - Error states

21. **Failure modes:** 
   - What happens when extraction fails
   - What happens when deadlines are missed
   - What happens when evidence is missing
   - Recovery workflows
   - Background job failures (retry logic, DLQ processing - see PLS Section B.7.4)

22. **What the AI is allowed to do and NOT allowed to do:** 
    - Clear boundaries for AI behavior
    - What AI can decide automatically
    - What requires human judgment
    - Regulatory compliance boundaries

**Purpose:**
This document expands the MCP into functional detail. It bridges the gap between the commercial/strategic MCP and the technical Canonical Dictionary. Without this, Claude cannot produce a complete, accurate canonical dictionary without guessing or hallucinating.

**Critical:** This document must be comprehensive and detailed enough that Claude can derive ALL entities, tables, fields, enums, and statuses for the Canonical Dictionary without any guesswork.

**Key Sections Added:**
- **A.9.2:** What the AI IS Allowed to Do - AI capabilities and boundaries (Note: SLOs/performance targets are defined in Technical Architecture, not PLS)
- **B.1.1:** Document Upload Validation - Size limits (200 pages, 10 images/page, 150-600 DPI), blocked formats
- **B.4.1.1:** Evidence Enforcement Rule - 7-day grace period, escalation logic for unlinked evidence
- **B.5.0:** End-of-Period Auto-Review for Dormant Obligations - Automated review triggers and escalation
- **B.6.0:** Sustained Evidence Failure Escalation - Multi-level escalation for repeated evidence gaps
- **B.7.4:** Background Job Retry and Dead-Letter Queue Rules (status transitions, retry logic, DLQ processing)
- **B.8.3:** Audit Pack Reference Integrity Rules (builder acceptance criteria for evidence/obligation deletion handling)
- **B.11:** Obligation Versioning and History (version tracking, regeneration vs retention policy)
- **B.13:** Regulator Challenge State Machine - Complete workflow for regulator questions/queries/challenges
- **B.14:** Cross-Module Prohibition Rules - Rule isolation, document type enforcement, cross-module data sharing
- **C.4:** Module Extension Pattern - How to add new modules (registration, routing, activation, pricing)
- **A.6.1:** Interpretation Locking and History (immutable audit trail for subjective interpretations)
- **B.10.2.2:** Viewer Role RLS Rules (detailed read-only access policies)
- **B.10.2.3:** Consultant Data Boundary Rules (cross-client data isolation)

**Feeds:**
→ Canonical Dictionary (1.2)
→ User Workflow Maps (1.3)
→ AI Extraction Rules Library (1.6)
→ Backend API (2.5)
→ Background Jobs (2.3)

---

## **1.2 Canonical Dictionary** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**Depends on:**
→ MCP (0.1)
→ Product Logic Specification (1.1)

**Document Format:**
- Structured dictionary format (markdown tables or sections)
- Each entity/table clearly defined with all attributes
- All enums listed with all possible values
- Naming conventions explicitly stated
- Cross-references to PLS where logic is defined

**What Claude Must Create:**

1. **ALL entities:** 
   - Company, Site, Permit, Obligation, Evidence, Schedule, Audit Pack, Consent, Parameter, Run-Hour, Generator, AER
   - For each entity: purpose, key attributes, relationships to other entities
   - Derived from PLS functional logic

2. **ALL tables:** 
   - Exact table names (snake_case convention)
   - All field names (snake_case convention)
   - Field types (text, integer, boolean, date, timestamp, JSON, etc.)
   - Field constraints (nullable, unique, foreign keys)
   - Naming conventions explicitly documented

3. **LLM vocabulary:** 
   - Terms the LLM must recognize (e.g., "monitoring frequency", "standard condition", "discharge limit")
   - Regulatory terminology (EA, SEPA, NRW terms)
   - Industry terminology (BOD, COD, run-hours, etc.)
   - Mapping: term → entity/field → meaning

4. **Permit terms:** 
   - EA, SEPA, NRW, Part A, Part B, standard conditions, variation, renewal
   - What each term means in the system context
   - How terms map to entities/fields

5. **Trade effluent terms:** 
   - Consent, parameter, BOD, COD, pH, temperature, exceedance, surcharge
   - What each term means in the system context
   - How terms map to entities/fields

6. **MCPD terms:** 
   - Registration, run-hour, annual limit, monthly limit, generator, CHP, stack test
   - What each term means in the system context
   - How terms map to entities/fields

7. **AER terms:** 
   - Annual Emissions Report, EA portal, emissions calculation, fuel consumption
   - What each term means in the system context
   - How terms map to entities/fields

8. **AI interpretation rules:** 
   - What "subjective obligation" means (exact definition)
   - What "objective obligation" means (exact definition)
   - How AI distinguishes between them
   - Confidence score meanings

9. **Subjective wording patterns:** 
   - Phrases that require human review ("as appropriate", "where necessary", "reasonable measures")
   - Complete list of patterns
   - How patterns are detected

10. **Compliance obligation categories:** 
    - Monitoring, Reporting, Record-Keeping, Operational, Maintenance
    - What each category means
    - How obligations are categorized
    - Category-specific rules

11. **Enums and statuses:** 
    - ALL status values for each entity (e.g., obligation_status: pending, in_progress, completed, overdue, n/a)
    - State transitions (what statuses can transition to what)
    - Enumeration types (all possible values for each enum field)
    - Derived from PLS workflows and logic

12. **Naming conventions:** 
    - Consistent naming across all entities, tables, fields
    - Case conventions (snake_case for tables/fields, PascalCase for entities?)
    - Prefix/suffix rules
    - Abbreviation rules

**Critical Instructions:**

1. **Derive from PLS:** Every entity, table, field, enum, and status must be derived from the functional logic defined in the PLS. Do not invent entities that aren't needed by the PLS workflows.

2. **Add missing technical elements:** Claude MUST add missing technical definitions wherever the MCP or PLS are insufficient, as long as additions are required to make the product buildable and remain aligned to the MCP. Examples:
   - Technical fields needed for system operation (created_at, updated_at, id, etc.)
   - Status fields needed for state management
   - Foreign key relationships needed for data integrity
   - Index fields needed for performance

3. **Completeness:** The dictionary must be complete and buildable—no gaps, no guesswork. Every entity mentioned in PLS must have a complete definition here.

4. **Consistency:** All naming must be consistent. All enums must be complete. All relationships must be defined.

5. **Buildability:** Cursor must be able to generate the database schema directly from this dictionary without additional interpretation.

**Feeds:**
→ Database Schema (2.2)
→ Backend API (2.5)
→ AI Extraction Rules Library (1.6)
→ User Workflow Maps (1.3)
→ Technical Architecture (2.1)

---

## **1.3 User Workflow Maps** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**Depends on:**
→ MCP (0.1)
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)

**Document Format:**
- Step-by-step workflows (numbered or bulleted)
- User actions clearly marked
- System responses clearly marked
- Decision points and branches
- Can include flow diagrams (text-based or mermaid)
- Use terminology from Canonical Dictionary exactly

**What Claude Must Create:**

Complete user journey maps for all workflows. Each workflow must show:
- Starting point (what triggers this workflow)
- Step-by-step user actions
- System responses at each step
- Decision points (if user chooses X, then Y; if Z, then W)
- End states (what happens when workflow completes)
- Error paths (what happens if something goes wrong)

**Includes full workflows for:**
- **Module 1 (Environmental Permits):**
  - Permit upload → extraction → review → evidence linking
  - **Excel import workflow:** Excel/CSV import → validation → preview → confirmation → bulk obligation creation
    - User uploads Excel file with permit/obligation data
    - System validates file format and required columns
    - System shows import preview (obligations count, errors, warnings)
    - User reviews preview, edits errors if needed, confirms import
    - System creates obligations in bulk, links to permits/sites
    - System sends import completion notification
  - Evidence capture (mobile-responsive upload, photos, CSV import)
  - Monitoring schedule creation and customization
  - Compliance dashboard navigation
  - Audit pack generation and download
  - Multi-site switching and consolidated view
  - Permit variation handling
- **Module 2 (Trade Effluent):**
  - Consent document upload → parameter extraction
  - Lab result import (CSV/PDF) → validation → parameter tracking
  - Exceedance detection and alerting
  - Water company report generation
  - Sampling schedule creation
- **Module 3 (MCPD/Generators):**
  - MCPD registration upload → run-hour limit extraction
  - Run-hour entry (manual + automatic from maintenance records)
  - Multi-generator aggregation
  - AER generation workflow
  - Stack test scheduling
  - Maintenance record linking
- **Cross-module workflows:**
  - Module 2 activation (from Module 1)
  - Module 3 activation (from Module 1)
  - Cross-sell trigger detection

**Feeds:**
→ Frontend Routes (2.6)
→ UI/UX Design System (2.9)
→ Onboarding Flow (2.7)
→ Notification & Messaging (2.4)

---

## **1.4 Module 2 & 3 Workflow Specifications** 📝

**Status:** ❌ **SUPERSEDED** — Covered in PLS Sections C.2 and C.3  
**Created by:** N/A  
**Reason:** All Module 2 & 3 workflow logic is comprehensively covered in Product Logic Specification (1.1) Sections C.2 (Trade Effluent) and C.3 (MCPD/Generators). No separate document needed.

**Note:** This document is no longer required. All workflows, logic, and specifications for Modules 2 and 3 are defined in the PLS.

---

## **1.5 AER (Annual Emissions Report) Specification** 📝

**Status:** ❌ **SUPERSEDED** — Covered in PLS Section C.3.8  
**Created by:** N/A  
**Reason:** All AER logic, document structure, workflows, and requirements are comprehensively covered in Product Logic Specification (1.1) Section C.3.8 (Annual Return Logic). No separate document needed.

**Note:** This document is no longer required. All AER specifications are defined in the PLS.

---

## **1.5a AI Layer Design & Cost Optimization** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**Depends on:**
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)
→ *Note: Model selection decision (GPT-4.1, GPT-4.1 Mini) and pricing are documented in this document itself*

**Note:** User Workflow Maps (1.3) and MCP are NOT needed. This document is about technical AI integration (prompts, API calls, cost optimization), not user experience flows or business strategy. The PLS contains all functional requirements needed.

**Document Format:**
- Markdown with clear sections
- Include code examples (prompt templates, JSON schemas)
- Include cost calculations and estimates
- Be specific and actionable
- Target: 8,000-12,000 words (concise but complete)

**What Claude Must Create:**

This document defines the AI integration layer design, cost optimization strategies, and prompt engineering for OpenAI API integration. It must define:

1. **Model Selection & Strategy:**
   - Primary model: GPT-4.1 (1M token context, $2/$8 per 1M tokens)
   - Secondary model: GPT-4.1 Mini (1M token context, $0.40/$1.60 per 1M tokens)
   - When to use which model (extraction vs simple tasks)
   - Fine-tuning strategy (future consideration)
   - Cost justification (documented in this document)

2. **Token Optimization Strategies:**
   - GPT-4.1's 1M token context = process full documents (no segmentation for most)
   - Only segment if document >800k tokens (very rare, max 500k per segment)
   - Prompt compression techniques (remove redundancy, use 3-4 few-shot examples)
   - Response format optimization (JSON mode, minimize output tokens)

3. **Cost Control Mechanisms:**
   - Rule library first strategy (always check library before API call)
   - Target rule library hit rate (>60% to avoid API calls)
   - Retry limits (max 2 retries per document)
   - Timeout management (30 seconds per API call)
   - Rate limit management (queuing, exponential backoff)
   - Parallel processing (concurrent documents within rate limits)
   - Caching strategies (cache rule matches, cache identical segments)
   - Cost monitoring & alerts (budget thresholds)

4. **Prompt Engineering:**
   - System message templates (<500 tokens, concise, directive)
   - User message templates (with placeholders)
   - Few-shot examples (3-4 examples per prompt type - concise but complete)
   - JSON schema definitions (exact output format)
   - Error handling instructions in prompts
   - 5 prompt templates: Permit Extraction, Parameter Extraction, Run-Hour Extraction, Subjective Detection, Confidence Scoring

5. **Extraction Workflow:**
   - Optimized step-by-step extraction pipeline (using GPT-4.1's 1M token context)
   - Primary flow: Process entire document in one call (if <800k tokens)
   - Fallback: Segment only if document >800k tokens (very rare)
   - Rule library lookup before API call (≥90% match = skip API)
   - Parallel processing strategy (concurrent documents within rate limits)
   - Rate limit management (queuing, exponential backoff)
   - Error recovery flows (retries, fallbacks, manual review flags)

6. **Cost Tracking & Analytics:**
   - Database schema additions for cost tracking:
     - `extraction_logs.input_tokens`
     - `extraction_logs.output_tokens`
     - `extraction_logs.estimated_cost`
     - `extraction_logs.rule_library_hits`
     - `extraction_logs.api_calls_made`
   - Analytics queries (cost per document, cost per module, rule library effectiveness)
   - Cost optimization metrics (targets and KPIs)

7. **Cost Estimates:**
   - Average cost per permit extraction (GPT-4.1): ~$0.14 per document
   - Average cost per task (GPT-4.1 Mini): ~$0.028 per task
   - Cost with rule library (60% hit rate): ~$5.60/month for 100 documents
   - Cost without rule library (100% API calls): ~$14/month for 100 documents
   - Cost savings from GPT-4.1's 1M context: Eliminates segmentation overhead
   - Monthly cost projections: 50/200/500 customers scaling scenarios
   - Pricing verified as of November 2025 (note to verify before implementation)

8. **Integration Points:**
   - How prompts feed into API calls
   - How responses are validated and transformed
   - How errors are handled and logged
   - How costs are tracked in extraction_logs
   - How rule library integrates with API calls
   - How background jobs process extractions

**Cost Optimization Targets:**
- Rule Library Hit Rate: >60% (avoids API calls)
- Average Tokens per Extraction: <60,000 total (but GPT-4.1 can handle up to 1M tokens)
- Cost per Permit: <$1.00 (with rule library) - actual: ~$0.14 with GPT-4.1
- Retry Rate: <5%
- Manual Mode Rate: <2%
- Monthly Cost: ~$5.60/month for 100 documents (with 60% rule library hit rate)

**Purpose:**
This document ensures the AI layer is cost-optimized and well-designed before generating prompts and rules library. It defines exact model selection (GPT-4.1), token optimization (1M context), cost control, and prompt templates that will be used in subsequent documents.

**Critical:** This must be created BEFORE AI Extraction Rules Library (1.6) because:
- Rules library design depends on prompt structure
- Cost constraints inform which patterns to prioritize
- Token limits affect rule library complexity
- Prompt templates inform rule matching logic

**Feeds:**
→ AI Extraction Rules Library (1.6)
→ AI Microservice Prompts (1.7)
→ AI Integration Layer (2.10)

---

## **1.6 AI Extraction Rules Library** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**Depends on:**
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)
→ AI Layer Design & Cost Optimization (1.5a) — *CRITICAL: Prompt structure and cost constraints inform rules design*

**Note:** Module 2 & 3 workflows and AER specifications are now fully covered in PLS Sections C.2, C.3, and C.3.8. No separate documents (1.4, 1.5) required.

**This is the "rules engine" for the LLM. Defines:**

**1. Rule Library Structure & Format:**
- Exact JSON schema for each rule pattern (pattern_id, pattern_version, pattern_regex, pattern_semantic, module, regulator, obligation_category, default_frequency, evidence_types, is_subjective, confidence_boost, source_documents, added_date, last_validated, usage_count, success_rate, false_positive_count, false_negative_count, is_active)
- Pattern matching methodology (regex, semantic, hybrid approach)
- Pattern match scoring algorithm (how ≥90% threshold is calculated)
- Rule versioning system (how rules are versioned and tracked)
- Rule metadata (source document, added date, last validated, usage count, success rate, false positive/negative counts)
- Database schema for rule storage (rule_library_patterns table structure with all fields)

**2. Pattern Matching Algorithm:**
- How pattern matching works (regex first? semantic first? hybrid?)
- Step-by-step matching workflow:
  1. For each document segment: Try regex pattern matching (fast, exact)
  2. If regex match ≥90%, use library rule
  3. If regex match 70-89%, try semantic matching
  4. If semantic match ≥90%, use library rule
  5. If all matches <90%, pass to LLM
- How match score is calculated (0-100%)
- Why ≥90% threshold (not 85%, not 95%) - justification
- What happens when multiple patterns match (highest score wins? user chooses?)
- How to handle partial matches (e.g., 75% match - use LLM or flag for review?)
- Calculate confidence boost: Library match gets +15% confidence, LLM extraction gets no boost
- Log pattern usage: Record which pattern matched, match score, if user confirmed/edited/rejected

**3. Pattern Categories by Module:**

**Module 1 Patterns:**
- EA permit patterns (standard conditions, monitoring frequencies, reporting requirements)
- EA standard conditions (numbered conditions, e.g., "Condition 2.3.1")
- SEPA permit variations
- NRW permit variations
- Improvement conditions (deadline-based)
- Subjective wording detection ("as appropriate", "where necessary", "reasonable measures") - 12 "always flag" phrases + 4 context-dependent
- Frequency detection patterns (annual, quarterly, monthly, weekly, daily)
- Deadline detection patterns (explicit dates, relative dates)
- Obligation categorization (Monitoring, Reporting, Record-Keeping, Operational, Maintenance)

**Module 2 Patterns:**
- Water company consent patterns (Thames Water, Severn Trent, etc.)
- Parameter limit extraction (BOD, COD, pH, temperature, SS, FOG, Ammonia, Phosphorus)
- Sampling frequency patterns (daily, weekly, monthly)
- Exceedance threshold patterns (80% warning, 100% breach)
- Discharge volume patterns

**Module 3 Patterns:**
- MCPD registration patterns
- Generator type identification (MCPD_1_5MW, MCPD_5_50MW, Specified, Emergency)
- Run-hour limit extraction (annual, monthly)
- Stack test frequency patterns
- Maintenance requirement patterns

**AER Patterns:**
- Annual return structure recognition
- Emissions calculation patterns
- Fuel consumption tracking patterns

**4. Learning & Improvement Mechanism (CRITICAL - Technical Moat):**

**A. Pattern Discovery Process:**
- How new patterns are identified from user corrections
- How patterns are extracted from human-reviewed extractions
- How patterns are validated before adding to library
- Who approves new patterns (manual review process)

**B. Feedback Loop System:**
- How user corrections feed back into rule library
- How to track: "User edited extraction X → pattern Y was used → pattern Y needs refinement"
- How to identify patterns that fail frequently (low success_rate)
- How to deprecate/remove bad patterns

**C. Rule Refinement Process:**
- How existing rules are improved based on feedback
- How rule versions are incremented (1.0 → 1.1 → 1.2)
- How to test rule changes before deployment
- How to rollback bad rule updates

**D. Accuracy Tracking:**
- How to measure rule library accuracy over time
- How to track: pattern match rate, LLM fallback rate, user correction rate
- How to identify which patterns need improvement
- How to set accuracy targets (e.g., 85% target, 90% for library matches)

**E. Database Learning Mechanism:**
- How `extraction_logs` data is analyzed to find patterns
- How user corrections in `review_queue_items` inform rule updates
- How `obligations.original_extraction` vs `obligations` (edited) differences create new rules
- How to query: "What patterns failed most often this month?"
- How to identify patterns that need improvement (low success_rate, high false_positive_count)

**5. Rule Library Versioning:**
- How rules are versioned (semantic versioning: major.minor.patch)
- When to increment major/minor/patch versions
- How `rule_library_version` is stored in `extraction_logs`
- How to track which extractions used which rule version
- How to rollback to previous rule version if accuracy drops

**6. Confidence Scoring Integration:**
- How rule library matches affect confidence scores
- Confidence boost for library matches (+15%? +10%?) - define exact boost amount
- How to combine pattern match score with LLM confidence
- How confidence thresholds apply to library matches vs LLM extractions
- Example calculations: Library match (95% pattern + 15% boost = 100% capped) vs LLM extraction (82% base, no boost)

**7. Hallucination Prevention Rules:**
- How rule library helps prevent hallucinations (grounding in known patterns)
- How to detect when LLM extraction doesn't match any known pattern (novel = higher hallucination risk)
- How pattern matching validates LLM output
- Rules for when to trust library match vs LLM extraction

**8. Error Handling & Edge Cases:**
- What happens when no pattern matches (LLM fallback)
- What happens when pattern matches but user rejects (pattern needs refinement)
- What happens when pattern matches but confidence is borderline (70-89%)
- How to handle novel condition types (never seen before)
- How to handle ambiguous patterns (could match multiple rules)
- Low-confidence extraction thresholds
- When humans must confirm (subjective obligations, edge cases)

**9. Pattern Maintenance Process:**
- Who maintains the rule library (internal team? users?)
- How often rules are reviewed/updated (weekly? monthly?)
- How to prioritize which patterns to improve first (by failure rate? by usage?)
- How to test rule changes before deployment
- How to measure impact of rule updates (accuracy before/after)
- How rule updates are deployed (hot reload? restart required?)

**10. Database Schema for Rule Library:**
- Should rules be stored in database? (yes, for versioning and tracking)
- Table structure for rules (rule_library_patterns table with all fields: id, pattern_id, pattern_version, pattern_regex, pattern_semantic, applicability (JSONB with module_types array, regulators array, document_types array), obligation_category, default_frequency, evidence_types, is_subjective, confidence_boost, source_documents, added_date, last_validated, usage_count, success_rate, false_positive_count, false_negative_count, is_active, created_at, updated_at)
- How rules are loaded into memory for fast matching
- How rule updates are deployed (hot reload? restart required?)
- Analytics queries for rule usage and effectiveness

**11. Integration Points:**
- How rules feed into LLM prompts (context for extraction)
- How rules affect confidence scores (boost calculation)
- How rules prevent hallucinations (pattern validation)
- How extraction_logs inform rules (learning queries)
- How review_queue_items inform rules (user correction feedback)

**Document Structure:**
1. Introduction (purpose, how it fits into extraction pipeline, versioning overview)
2. Rule Library Structure (JSON schema, pattern format, rule versioning system)
3. Pattern Matching Algorithm (regex matching, semantic matching, hybrid approach, match scoring methodology, threshold logic ≥90%)
4. Pattern Categories by Module (Module 1, 2, 3, AER patterns - all listed)
5. Learning & Improvement Mechanism (CRITICAL - technical moat: Pattern Discovery, Feedback Loop, Rule Refinement, Accuracy Tracking, Database Learning)
6. Rule Library Versioning (semantic versioning: major.minor.patch, when to increment, rollback procedures)
7. Confidence Scoring Integration (how library matches boost confidence, combine with LLM confidence, threshold application)
8. Hallucination Prevention Rules (how patterns validate LLM output, detect novel patterns, trust rules)
9. Error Handling & Edge Cases (no match, user rejection, borderline confidence, novel conditions, ambiguous patterns)
10. Pattern Maintenance Process (who maintains, update frequency, prioritization, testing, deployment, impact measurement)
11. Database Schema (rule_library_patterns table structure, loading into memory, deployment)
12. Integration Points (how rules connect to LLM prompts, confidence scores, hallucination prevention, extraction_logs)

**Feeds:**
→ AI Microservice Prompts (1.7)
→ Backend API (2.5)
→ AI Integration Layer (2.10)

---

## **1.7 AI Microservice Prompts** 📝

**Status:** ✅ Complete  
**Created by:** Claude  
**File:** `AI_Microservice_Prompts_Complete.md`  
**Depends on:**
→ AI Extraction Rules Library (1.6)
→ AI Layer Design & Cost Optimization (1.5a) — *CRITICAL: Uses prompt templates and cost optimization strategies*
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.4)

**Document includes:**
- **29 production-ready prompts** covering all extraction and processing tasks
- **Complete prompt templates** for:
  - Document type classification
  - Environmental permit extraction (Module 1)
  - Trade effluent consent extraction (Module 2)
  - MCPD registration extraction (Module 3)
  - Parameter extraction (Module 2)
  - Lab result extraction (Module 2)
  - ELV extraction (Modules 1 & 3)
  - Run-hour extraction (Module 3)
  - Stack test extraction (Module 3)
  - AER generation (Module 3)
  - Obligation registration
  - Evidence type suggestion
  - Subjective condition detection
  - Extraction validation
  - Obligation deduplication
  - Improvement condition extraction
  - Retry prompts (3 types)
  - Error recovery prompts (4 types)

**Each prompt includes:**
- Prompt ID, Purpose, Model selection
- Token estimates and cost calculations
- Confidence thresholds
- System message (<500 tokens, optimized)
- User message template (with placeholders)
- Expected output schema (complete JSON)
- Example output (realistic examples)
- Error handling (comprehensive strategies)
- Integration notes (pre/post-processing, service calls)

**Additional sections:**
- Token counting utilities
- Prompt versioning strategy
- A/B testing framework
- Prompt quick reference index
- Cost summary by task

**Quality verified:**
- ✅ All system messages <500 tokens
- ✅ All prompts have complete JSON schemas
- ✅ All prompts have example outputs
- ✅ All prompts have error handling
- ✅ All prompts have integration notes
- ✅ Production-ready and complete

**Feeds:**
→ AI Integration Layer (2.10)

---

## **1.8 (Optional) Pricing Model Explorer** 📝

**Status:** ⏳ Optional  
**Created by:** Claude  
**Depends on:** MCP (0.1)

**Explores:**
- Permit-based pricing variations
- Site-based pricing variations
- Module-based pricing variations
- Bundles and expansion revenue scenarios
- Competitive pricing analysis

---

## **1.9 (Optional) Marketing Messaging Packs** 📝

**Status:** ⏳ Optional  
**Created by:** Claude  
**Depends on:** MCP (0.1)

**Includes:**
- Pain hooks per ICP
- A/B positioning tests
- Cold outreach scripts
- Demo flow scripts

---

# 🔵 **LEVEL 2 — "BUILDABLE ARTIFACTS" (Cursor Only)**

Cursor generates these because they are engineering documents.

---

## **2.1 Technical Architecture & Stack** 📝

**Status:** ✅ Complete  
**Created by:** Cursor  
**Depends on:**
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)

**Defines:**
- **Postgres (Supabase) structure:** Database platform, version, region
- **RLS rules:** High-level RLS strategy (detailed rules come in 2.8)
- **Background jobs:** Job execution framework (BullMQ, Supabase Realtime, or Vercel Background Jobs)
- **Webhooks:** External webhook handling (if any)
- **Storage:** Supabase Storage buckets, file organization, encryption
- **Indexing:** Search indexes, performance optimization
- **API conventions:** REST vs. GraphQL, authentication, rate limiting
- **Frontend framework:** Next.js 14 App Router structure
- **AI service:** OpenAI API integration points
- **Environment setup:** Dev/staging/prod configuration

**Feeds:**
→ Database Schema (2.2)
→ Background Jobs (2.3)
→ Backend API (2.5)

---

## **2.2 Database Schema** 📝

**Status:** ✅ Complete  
**Created by:** Cursor  
**Depends on:**
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)
→ User Workflow Maps (1.3)
→ Technical Architecture (2.1)

**Tables for:**
- **Core entities:** companies, sites, users, roles, user_roles, user_site_assignments
- **Module registry:** modules (module registry, replaces hardcoded enums)
- **Module 1:** documents (permits), obligations, evidence_items, schedules, deadlines, audit_packs, obligation_evidence_links, document_site_assignments
- **Import tracking:** excel_imports (import_id, user_id, site_id, file_name, file_size, row_count, success_count, error_count, status, imported_at, errors JSONB)
- **Module 2:** consents, parameters, lab_results, exceedances, discharge_volumes, water_company_reports
- **Module 3:** mcpd_registrations, generators, run_hour_records, stack_tests, maintenance_records, aer_documents
- **System:** notifications, background_jobs, audit_logs, dead_letter_queue, regulator_questions, review_queue_items, escalations, system_settings
- **AI/Extraction:** extraction_logs
- **Cross-module:** module_activations, cross_sell_triggers
- **Note:** New fields added: obligations.version_number, obligations.version_history (obligation versioning - see PLS Section B.11), background_jobs.dead_letter_queue_id, background_jobs.health_status, background_jobs.last_heartbeat (job health monitoring - see PLS Section B.7.4), documents.import_source (enum: 'pdf_extraction', 'excel_import', 'manual'), obligations.import_source (enum: 'pdf_extraction', 'excel_import', 'manual'), obligations.excel_import_id (references excel_imports.id)

**Note:** Module-specific tables follow the same pattern. To add Module 4 (Packaging) or any future module, create new tables following the same pattern. See Module Extension Pattern in Canonical Dictionary (Section B.31) for detailed guidance.

**Each table includes:**
- Field definitions (name, type, constraints)
- Foreign key relationships
- Indexes
- RLS enablement flags
- Validation rules

**Feeds:**
→ Background Jobs (2.3)
→ Backend API (2.5)
→ RLS & Permissions (2.8)

---

## **2.3 Background Jobs Specification** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ Product Logic Specification (1.1)
→ Database Schema (2.2)
→ Technical Architecture (2.1)

**Defines background jobs for:**
- **Monitoring schedule job:** Recurring obligation checks, deadline calculations
- **Deadline alert job:** 7/3/1 day warnings for upcoming deadlines
- **Evidence reminder job:** Notifications for obligations requiring evidence
- **Module 2: Sampling schedule job:** Daily/weekly/monthly triggers for lab sampling
- **Module 3: Run-hour limit monitoring job:** 80%/90%/100% threshold checks
- **AER generation job:** Annual return compilation and generation
- **Permit renewal reminder job:** Notifications for approaching permit renewals
- **Cross-sell trigger detection job:** Effluent keyword detection, run-hour breach detection
- **Document processing job:** PDF upload → OCR → text extraction → LLM parsing
- **Excel import processing job:** Excel/CSV upload → validation → parsing → bulk obligation creation → notification
  - Trigger: Excel file uploaded via API
  - Input: Excel file (multipart/form-data), site_id, user_id, import_options (JSONB)
  - Execution steps:
    1. Validate file format (.xlsx, .xls, CSV)
    2. Parse Excel file (extract rows, columns)
    3. Validate required columns (permit_number, obligation_title, frequency, deadline_date)
    4. Validate data (dates, frequencies, site references)
    5. Detect duplicates (same permit_number + obligation_title + site_id)
    6. Create preview (count obligations, errors, warnings)
    7. Store preview in excel_imports table (status: 'pending_review')
    8. Send notification to user (import ready for review)
  - After user confirmation:
    1. Create obligations from valid rows
    2. Create permits if permit_number doesn't exist
    3. Link obligations to permits/sites
    4. Update excel_imports table (status: 'completed', success_count, error_count)
    5. Send completion notification
  - Error handling: Invalid rows skipped, errors logged in excel_imports.errors JSONB
- **Audit pack generation job:** Evidence compilation into inspector-ready PDFs (includes reference integrity validation - see PLS Section B.8.3)

**Each job includes:**
- Trigger conditions
- Input parameters
- Execution steps
- Error handling
- Retry logic (explicit rules for status transitions, exponential backoff, DLQ processing - see PLS Section B.7.4)
- Dead-letter queue (DLQ) rules (when jobs move to DLQ, DLQ processing workflow)
- Health check integration (heartbeat monitoring, stale job detection)
- Success/failure notifications

**Feeds:**
→ Notification & Messaging (2.4)
→ Backend API (2.5)

---

## **2.4 Notification & Messaging Specification** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ User Workflow Maps (1.3)
→ Product Logic Specification (1.1)
→ Database Schema (2.2)
→ Background Jobs (2.3)

**Document Format:**
- Markdown format with clear sections and subsections
- Include code examples (TypeScript interfaces, SQL schemas, template examples)
- Include database schema definitions
- Include integration code examples
- Be specific and detailed—this is the implementation blueprint
- Target: 8,000-12,000 words (comprehensive but focused)

**What Cursor Must Create:**

This document defines the complete notification and messaging system. It must include:

**1. Email Notification Templates:**

**Template Structure:**
- Subject line templates with variables (e.g., `{{obligation_title}} - {{days_remaining}} days remaining`)
- HTML email body templates with branding guidelines
- Plain text fallback templates
- Variable substitution system (`{{variable_name}}` syntax)
- Unsubscribe link requirements (per email type)
- Example templates for each notification type

**Email Template Types:**

**A. Deadline Warning Templates:**
- **7-day warning:** Subject, body, variables (obligation_title, deadline_date, site_name, company_name, days_remaining)
- **3-day warning:** Subject, body, variables (same as 7-day + urgency indicator)
- **1-day warning:** Subject, body, variables (same as 3-day + critical indicator)
- HTML structure (header, body, footer, branding)
- Plain text version
- Example rendered emails

**B. Overdue Obligation Template:**
- Subject line template
- Body template with overdue obligation list
- Variables (obligation_title, overdue_days, site_name, company_name, deadline_date)
- Escalation indicator (if escalated)
- Action buttons (link to obligation, link to evidence upload)
- Example rendered email

**C. Evidence Reminder Template:**
- Subject line template
- Body template with obligation details
- Variables (obligation_title, evidence_required, days_since_deadline, site_name, company_name)
- Evidence upload link
- Grace period indicator (if within 7-day grace period - see PLS Section B.4.1.1)
- Example rendered email

**D. Permit Renewal Reminder Template:**
- Subject line template
- Body template with permit details
- Variables (permit_reference, expiry_date, days_until_expiry, site_name, company_name)
- Renewal action link
- Example rendered email

**E. Module 2: Parameter Exceedance Alert Template:**
- Subject line template (80% threshold warning)
- Body template with parameter details
- Variables (parameter_name, current_value, limit_value, percentage, site_name, company_name, sample_date)
- Water company contact information (if applicable)
- Action link (view parameter tracking)
- Example rendered email

**F. Module 3: Run-Hour Limit Breach Alert Templates:**
- **80% threshold:** Subject, body, variables (generator_name, current_hours, limit_hours, percentage, site_name, company_name)
- **90% threshold:** Subject, body, variables (same as 80% + urgency indicator)
- **100% threshold:** Subject, body, variables (same as 90% + critical breach indicator)
- Action link (view run-hour tracking)
- Example rendered emails

**G. Audit Pack Ready Notification Template:**
- Subject line template
- Body template with audit pack details
- Variables (audit_pack_name, generation_date, site_name, company_name, obligation_count, evidence_count)
- Download link
- Preview link
- Example rendered email

**H. Excel Import Notification Templates:**
- **Import Ready for Review:** Subject, body, variables (file_name, row_count, valid_rows, error_count, site_name)
  - Subject: "Excel import ready for review - {{file_name}}"
  - Body: Import preview with obligation count, errors summary, review link
  - Action button: "Review Import"
- **Import Completed:** Subject, body, variables (file_name, success_count, error_count, obligation_count, site_name)
  - Subject: "Excel import completed - {{success_count}} obligations imported"
  - Body: Success summary, error details (if any), view obligations link
  - Action button: "View Obligations"
- **Import Failed:** Subject, body, variables (file_name, error_message, error_details)
  - Subject: "Excel import failed - {{file_name}}"
  - Body: Error explanation, error details, retry link
  - Action button: "Retry Import"
- HTML structure (header, body, footer, branding)
- Plain text version
- Example rendered emails

**2. SMS Notification Templates:**

**SMS Template Structure:**
- Character limits (160 characters standard, 320 for concatenated)
- Template format with variables
- Variable substitution system
- Example templates for each trigger type

**SMS Template Types:**

**A. Critical Deadline SMS (1 day remaining):**
- Template: `{{site_name}}: {{obligation_title}} due tomorrow. View: {{short_link}}`
- Character count: <160
- Variables (site_name, obligation_title, short_link)
- Example rendered SMS

**B. Limit Breach SMS (100% threshold):**
- Template: `{{site_name}}: {{parameter_name}} breach ({{current_value}}/{{limit_value}}). View: {{short_link}}`
- Character count: <160
- Variables (site_name, parameter_name, current_value, limit_value, short_link)
- Example rendered SMS

**3. Escalation Chain Logic:**

**Escalation State Machine:**
- Escalation levels (Level 1: Site Manager, Level 2: Compliance Manager, Level 3: MD)
- Escalation trigger conditions (per notification type)
- Escalation timing logic (immediate vs delayed)
- Escalation recipient determination logic (role-based lookup)
- Escalation state transitions (PENDING → ESCALATED_LEVEL_1 → ESCALATED_LEVEL_2 → ESCALATED_LEVEL_3 → RESOLVED)

**Escalation Rules by Notification Type:**

**A. Deadline Warnings:**
- Level 1 (Site Manager): Immediate on 7-day warning
- Level 2 (Compliance Manager): If no action after 24h on 3-day warning
- Level 3 (MD): If no action after 48h on 1-day warning

**B. Overdue Obligations:**
- Level 1 (Site Manager): Immediate on overdue
- Level 2 (Compliance Manager): If no action after 24h
- Level 3 (MD): If no action after 48h

**C. Evidence Reminders:**
- Level 1 (Site Manager): Immediate on reminder
- Level 2 (Compliance Manager): If no evidence after 7-day grace period (see PLS Section B.4.1.1)
- Level 3 (MD): If no evidence after 14 days overdue

**D. Limit Breaches:**
- Level 1 (Site Manager): Immediate on 80% threshold
- Level 2 (Compliance Manager): Immediate on 90% threshold
- Level 3 (MD): Immediate on 100% threshold

**Escalation Implementation:**
- SQL queries to determine escalation recipients (role-based lookup from `user_roles` and `user_site_assignments`)
- Escalation state tracking in `notifications` table
- Escalation history logging
- Escalation resolution tracking

**4. Notification Queue Database Schema:**

**Table Structure:**
- `notifications` table schema (id, notification_type, channel, recipient_id, recipient_email, recipient_phone, subject, body_html, body_text, variables JSONB, status, delivery_status, delivery_provider, delivery_provider_id, delivery_error, escalation_level, escalation_state, scheduled_for, sent_at, delivered_at, read_at, created_at, updated_at)
- Status enum: PENDING, QUEUED, SENDING, SENT, DELIVERED, FAILED, RETRYING, CANCELLED
- Delivery status enum: PENDING, SENT, DELIVERED, FAILED, BOUNCED, COMPLAINED
- Escalation state enum: PENDING, ESCALATED_LEVEL_1, ESCALATED_LEVEL_2, ESCALATED_LEVEL_3, RESOLVED

**Delivery Status Tracking:**
- Webhook handlers for delivery provider callbacks (SendGrid, Twilio)
- Delivery confirmation handling
- Bounce handling (hard bounces vs soft bounces)
- Complaint handling (unsubscribe requests)

**5. Rate Limiting:**

**Rate Limit Rules:**
- Email rate limits: 100 emails/hour per user, 500 emails/hour per company, 10,000 emails/hour global
- SMS rate limits: 10 SMS/hour per user, 50 SMS/hour per company, 1,000 SMS/hour global
- Rate limit enforcement mechanism (database-based rate limiting with Redis caching)
- Rate limit error handling (queue notification for later delivery)
- Queue prioritization (CRITICAL > HIGH > MEDIUM > LOW)

**Rate Limit Implementation:**
- Rate limit checking logic (before queueing notification)
- Rate limit exceeded handling (queue with delayed delivery)
- Rate limit reset logic (hourly reset)
- Rate limit monitoring and alerting

**6. Notification Preferences:**

**User Notification Preferences:**
- Database schema for `user_notification_preferences` table (user_id, notification_type, channel_preference, frequency_preference, enabled, created_at, updated_at)
- Channel preferences: EMAIL_ONLY, SMS_ONLY, EMAIL_AND_SMS, IN_APP_ONLY, ALL_CHANNELS
- Frequency preferences: IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST, NEVER
- Preference management API endpoints (GET, PUT `/api/v1/users/{userId}/notification-preferences`)

**Preference Application Logic:**
- How preferences filter notifications before sending
- Preference inheritance (company defaults vs user overrides)
- Preference validation rules

**7. Integration Points:**

**Background Jobs Integration:**
- How background jobs create notifications (code examples)
- Notification creation from Deadline Alert Job (2.3)
- Notification creation from Evidence Reminder Job (2.3)
- Notification creation from Module 2/3 monitoring jobs (2.3)
- Notification creation from Audit Pack Generation Job (2.3)

**Real-Time Notification Delivery:**
- WebSocket integration for in-app notifications
- Real-time notification broadcasting (Supabase Realtime)
- Notification badge updates
- Notification read/unread tracking

**Notification History/Archive:**
- Notification history queries (by user, by type, by date range)
- Notification archive policy (retain for 90 days)
- Notification analytics (delivery rates, read rates, escalation rates)

**8. Delivery Provider Integration:**

**Email Provider (SendGrid):**
- API integration setup
- Template management
- Webhook configuration (delivery, bounce, complaint)
- Error handling and retry logic

**SMS Provider (Twilio):**
- API integration setup
- Short code configuration
- Webhook configuration (delivery status)
- Error handling and retry logic

**9. Retry Logic:**

**Failed Delivery Retry:**
- Retry strategy: Exponential backoff (2 retries, delays: 5min, 30min)
- Retry conditions (transient errors only)
- Retry limit: 3 attempts total
- Dead-letter handling (after max retries)

**10. Error Handling:**

**Error Types:**
- Invalid recipient (email/phone format errors)
- Provider errors (SendGrid/Twilio API errors)
- Rate limit errors (queue for later)
- Template rendering errors (fallback to plain text)

**Error Handling Implementation:**
- Error logging to `notification_errors` table
- Error notification to admins (critical failures)
- Error recovery workflows

**11. Testing Requirements:**

**Test Scenarios:**
- Template rendering tests (all variables substituted correctly)
- Escalation chain tests (correct recipients at each level)
- Rate limiting tests (limits enforced correctly)
- Delivery provider integration tests (webhook handling)
- Preference application tests (preferences filter correctly)

**Feeds:**
→ Backend API (2.5)

---

## **2.5 Backend API Specification** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ Product Logic Specification (1.1)
→ Database Schema (2.2)
→ Background Jobs (2.3)
→ Notification & Messaging (2.4)

**Document Format:**
- Markdown format with clear sections and subsections
- Include OpenAPI/Swagger-style endpoint specifications
- Include request/response JSON schemas with examples
- Include TypeScript interfaces for request/response types
- Include error response examples
- Include authentication/authorization details
- Be specific and detailed—this is the API implementation blueprint
- Target: 15,000-20,000 words (comprehensive API documentation)

**What Cursor Must Create:**

This document defines the complete REST API specification. It must include:

**1. API Structure:**

**Base URL:**
- Production: `https://api.epcompliance.com/api/v1`
- Staging: `https://api-staging.epcompliance.com/api/v1`
- Development: `http://localhost:3000/api/v1`

**API Versioning:**
- Version strategy: URL-based versioning (`/api/v1/...`)
- Version header: `X-API-Version: 1.0` (optional)
- Deprecation policy: 6-month deprecation notice before version removal

**Request/Response Headers:**
- Required headers: `Authorization: Bearer {jwt_token}`, `Content-Type: application/json`
- Optional headers: `X-API-Version`, `X-Request-ID` (for tracing)
- Response headers: `X-Request-ID`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`

**Content-Type Specifications:**
- JSON: `application/json` (default)
- File upload: `multipart/form-data`
- File download: `application/pdf`, `application/zip`, `text/csv`

**2. Authentication & Authorization:**

**Authentication Mechanism:**
- JWT token-based authentication
- Token structure: Header (alg, typ), Payload (user_id, company_id, role, permissions, exp, iat), Signature
- Token expiration: 24 hours (access token), 7 days (refresh token)
- Token refresh endpoint: `POST /api/v1/auth/refresh`

**Authorization:**
- Role-based access control (Owner, Admin, Staff, Consultant, Viewer)
- RLS integration (API respects database RLS policies)
- Permission checks per endpoint (CRUD matrix from PLS Section B.10.2.1)
- Viewer role restrictions (read-only access - see PLS Section B.10.2.2)

**3. Standard Error Response Format:**

**Error Response Schema:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "request_id": "uuid",
    "timestamp": "ISO 8601"
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST`: Invalid request parameters
- `401 UNAUTHORIZED`: Missing or invalid authentication token
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `422 UNPROCESSABLE_ENTITY`: Validation errors
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded
- `500 INTERNAL_SERVER_ERROR`: Server error
- `503 SERVICE_UNAVAILABLE`: Service temporarily unavailable

**4. Pagination:**

**Pagination Strategy:**
- Cursor-based pagination (recommended for large datasets)
- Offset-based pagination (fallback for simple lists)
- Default page size: 20 items
- Maximum page size: 100 items

**Pagination Parameters:**
- Cursor: `?cursor={base64_encoded_cursor}&limit=20`
- Offset: `?offset=0&limit=20` (fallback)

**Pagination Response Format:**
```json
{
  "data": [],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**5. Filtering & Sorting:**

**Filter Parameter Format:**
- Query string: `?filter[field]=value&filter[field2]=value2`
- Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `like`, `in`, `not_in`
- Example: `?filter[status]=overdue&filter[site_id][in]=uuid1,uuid2`

**Sort Parameter Format:**
- Query string: `?sort=field1,-field2` (negative = descending)
- Example: `?sort=deadline_date,-created_at`

**Available Filter/Sort Fields:**
- Per endpoint: List all filterable/sortable fields
- Field validation rules

**6. Detailed Endpoint Specifications:**

**A. Document Upload Endpoints:**

**POST /api/v1/documents**
- **Purpose:** Upload permit/consent/MCPD registration document
- **Request:** Multipart form data (file, site_id, document_type, metadata JSONB)
- **Request Schema:** TypeScript interface with file (File), site_id (UUID), document_type (enum), metadata (JSONB)
- **Response:** 201 Created with document object (id, status, extraction_status, created_at)
- **Response Schema:** TypeScript interface
- **Error Codes:** 400 (invalid file), 413 (file too large), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 10 uploads/hour per user
- **File Limits:** 200 pages max, 10 images/page, 150-600 DPI (see PLS Section B.1.1)
- **Example Request/Response:** Complete JSON examples

**GET /api/v1/documents/{documentId}**
- **Purpose:** Retrieve document details
- **Request:** Path parameter (documentId)
- **Response:** 200 OK with document object
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (not found), 403 (insufficient permissions)
- **Authentication:** Required (all roles, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**B. AI Extraction Endpoints:**

**POST /api/v1/documents/{documentId}/extract**
- **Purpose:** Trigger LLM parsing for document
- **Request:** Path parameter (documentId), optional body (force_reprocess boolean)
- **Response:** 202 Accepted with job_id (background job created)
- **Response Schema:** TypeScript interface (job_id, status, estimated_completion_time)
- **Error Codes:** 404 (document not found), 409 (extraction already in progress)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 5 extractions/hour per user
- **Integration:** Creates background job (Document Processing Job - see 2.3)

**GET /api/v1/documents/{documentId}/extraction-results**
- **Purpose:** Retrieve extraction results
- **Request:** Path parameter (documentId)
- **Response:** 200 OK with extraction results (obligations array, confidence scores, extraction_logs)
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (not found), 202 (extraction in progress)
- **Authentication:** Required (all roles, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**C. Evidence Linking Endpoints:**

**POST /api/v1/evidence**
- **Purpose:** Upload evidence file
- **Request:** Multipart form data (file, obligation_id, evidence_type, metadata JSONB)
- **Response:** 201 Created with evidence object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 400 (invalid file), 404 (obligation not found)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 20 uploads/hour per user

**POST /api/v1/obligations/{obligationId}/evidence/{evidenceId}/link**
- **Purpose:** Link existing evidence to obligation
- **Request:** Path parameters (obligationId, evidenceId)
- **Response:** 200 OK with link object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (obligation/evidence not found), 409 (already linked)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 100 links/hour per user

**D. Scheduling Endpoints:**

**POST /api/v1/schedules**
- **Purpose:** Create monitoring schedule
- **Request:** Body (obligation_id, frequency, start_date, custom_schedule JSONB)
- **Response:** 201 Created with schedule object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 422 (validation error), 404 (obligation not found)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 50 schedules/hour per user

**PUT /api/v1/schedules/{scheduleId}**
- **Purpose:** Update monitoring schedule
- **Request:** Path parameter (scheduleId), body (frequency, custom_schedule JSONB)
- **Response:** 200 OK with updated schedule object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 50 updates/hour per user
- **Audit Trail:** Logs schedule modifications (modified_by, modified_at, previous_values - see PLS Section B.7.3)

**E. Alerts Endpoints:**

**GET /api/v1/users/{userId}/notification-preferences**
- **Purpose:** Retrieve user notification preferences
- **Request:** Path parameter (userId)
- **Response:** 200 OK with preferences object
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (user not found), 403 (insufficient permissions)
- **Authentication:** Required (all roles, own preferences or Admin)
- **Rate Limiting:** 100 requests/hour per user

**PUT /api/v1/users/{userId}/notification-preferences**
- **Purpose:** Update user notification preferences
- **Request:** Path parameter (userId), body (preferences object)
- **Response:** 200 OK with updated preferences object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (user not found), 422 (validation error)
- **Authentication:** Required (all roles, own preferences or Admin)
- **Rate Limiting:** 10 updates/hour per user

**GET /api/v1/notifications**
- **Purpose:** Retrieve notification history
- **Request:** Query parameters (filter, sort, pagination)
- **Response:** 200 OK with notifications array (paginated)
- **Response Schema:** TypeScript interface
- **Error Codes:** 400 (invalid filter/sort)
- **Authentication:** Required (all roles, own notifications or Admin)
- **Rate Limiting:** 100 requests/hour per user

**F. Audit Pack Generator Endpoints:**

**POST /api/v1/audit-packs**
- **Purpose:** Trigger audit pack generation
- **Request:** Body (site_id, date_range, obligation_ids array, include_archived boolean)
- **Response:** 202 Accepted with job_id (background job created)
- **Response Schema:** TypeScript interface (job_id, status, estimated_completion_time)
- **Error Codes:** 404 (site not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff)
- **Rate Limiting:** 5 generations/hour per user
- **Integration:** Creates background job (Audit Pack Generation Job - see 2.3)
- **Reference Integrity:** Validates evidence/obligation references (see PLS Section B.8.3)

**GET /api/v1/audit-packs/{auditPackId}**
- **Purpose:** Retrieve audit pack details
- **Request:** Path parameter (auditPackId)
- **Response:** 200 OK with audit pack object (status, download_url, preview_url)
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (not found), 202 (generation in progress)
- **Authentication:** Required (all roles, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**GET /api/v1/audit-packs/{auditPackId}/download**
- **Purpose:** Download audit pack PDF
- **Request:** Path parameter (auditPackId)
- **Response:** 200 OK with PDF file (Content-Type: application/pdf)
- **Error Codes:** 404 (not found), 202 (generation in progress)
- **Authentication:** Required (all roles, RLS applies)
- **Rate Limiting:** 10 downloads/hour per user

**G. Module 2 Endpoints:**

**POST /api/v1/module-2/lab-results**
- **Purpose:** Import lab results (CSV/PDF)
- **Request:** Multipart form data (file, consent_id, import_format)
- **Response:** 201 Created with import job_id
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 400 (invalid file), 404 (consent not found)
- **Authentication:** Required (Owner, Admin, Staff, Module 2 active)
- **Rate Limiting:** 10 imports/hour per user

**GET /api/v1/module-2/parameters**
- **Purpose:** Retrieve parameter tracking data
- **Request:** Query parameters (filter, sort, pagination)
- **Response:** 200 OK with parameters array (paginated)
- **Response Schema:** TypeScript interface
- **Error Codes:** 400 (invalid filter/sort)
- **Authentication:** Required (all roles, Module 2 active, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**GET /api/v1/module-2/exceedances**
- **Purpose:** Retrieve exceedance alerts
- **Request:** Query parameters (filter, sort, pagination)
- **Response:** 200 OK with exceedances array (paginated)
- **Response Schema:** TypeScript interface
- **Error Codes:** 400 (invalid filter/sort)
- **Authentication:** Required (all roles, Module 2 active, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**POST /api/v1/module-2/water-company-reports**
- **Purpose:** Generate water company report
- **Request:** Body (consent_id, date_range, parameters array)
- **Response:** 202 Accepted with job_id (background job created)
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (consent not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff, Module 2 active)
- **Rate Limiting:** 5 reports/hour per user

**H. Module 3 Endpoints:**

**POST /api/v1/module-3/run-hours**
- **Purpose:** Create run-hour entry
- **Request:** Body (generator_id, hours, date, source, maintenance_record_id optional)
- **Response:** 201 Created with run-hour record object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (generator not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff, Module 3 active)
- **Rate Limiting:** 100 entries/hour per user

**POST /api/v1/module-3/aer/generate**
- **Purpose:** Trigger AER generation
- **Request:** Body (mcpd_registration_id, year, generators array)
- **Response:** 202 Accepted with job_id (background job created)
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (registration not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff, Module 3 active)
- **Rate Limiting:** 5 generations/hour per user

**POST /api/v1/module-3/stack-tests**
- **Purpose:** Create stack test schedule
- **Request:** Body (generator_id, scheduled_date, test_type)
- **Response:** 201 Created with stack test object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (generator not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff, Module 3 active)
- **Rate Limiting:** 20 schedules/hour per user

**POST /api/v1/module-3/maintenance-records**
- **Purpose:** Create maintenance record
- **Request:** Multipart form data (file optional, generator_id, maintenance_type, date, description)
- **Response:** 201 Created with maintenance record object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (generator not found), 422 (validation error)
- **Authentication:** Required (Owner, Admin, Staff, Module 3 active)
- **Rate Limiting:** 50 records/hour per user

**I. Multi-Site Endpoints:**

**GET /api/v1/sites**
- **Purpose:** Retrieve user's accessible sites
- **Request:** Query parameters (filter, sort, pagination)
- **Response:** 200 OK with sites array (paginated)
- **Response Schema:** TypeScript interface
- **Error Codes:** 400 (invalid filter/sort)
- **Authentication:** Required (all roles, RLS applies)
- **Rate Limiting:** 100 requests/hour per user

**GET /api/v1/sites/{siteId}/consolidated-view**
- **Purpose:** Retrieve consolidated multi-site view
- **Request:** Path parameter (siteId), query parameters (date_range)
- **Response:** 200 OK with consolidated data (obligations, deadlines, compliance status)
- **Response Schema:** TypeScript interface
- **Error Codes:** 404 (site not found), 403 (insufficient permissions)
- **Authentication:** Required (all roles, multi-site access)
- **Rate Limiting:** 50 requests/hour per user

**J. Module Activation Endpoints:**

**POST /api/v1/modules/{moduleId}/activate**
- **Purpose:** Activate module for company
- **Request:** Path parameter (moduleId), body (site_ids array optional)
- **Response:** 200 OK with activation object
- **Request/Response Schemas:** TypeScript interfaces
- **Error Codes:** 404 (module not found), 422 (prerequisites not met), 409 (already active)
- **Authentication:** Required (Owner, Admin)
- **Rate Limiting:** 5 activations/hour per user
- **Prerequisites:** Checks `modules.requires_module_id` from `modules` table
- **Cross-Sell:** Handles cross-sell triggers (see PLS Section C.4)

**GET /api/v1/modules**
- **Purpose:** Retrieve available modules
- **Request:** Query parameters (filter, sort)
- **Response:** 200 OK with modules array
- **Response Schema:** TypeScript interface
- **Error Codes:** None
- **Authentication:** Required (all roles)
- **Rate Limiting:** 100 requests/hour per user

**7. Rate Limiting:**

**Rate Limit Headers:**
- `X-Rate-Limit-Limit`: Maximum requests per window
- `X-Rate-Limit-Remaining`: Remaining requests in current window
- `X-Rate-Limit-Reset`: Unix timestamp when limit resets

**Rate Limit Responses:**
- 429 Too Many Requests with Retry-After header
- Error response body with rate limit details

**Per-Endpoint Rate Limits:**
- Document upload: 10/hour per user
- AI extraction: 5/hour per user
- Evidence upload: 20/hour per user
- Audit pack generation: 5/hour per user
- Default: 100 requests/hour per user

**8. File Upload Specifications:**

**File Size Limits:**
- Maximum file size: 50MB per file
- Maximum total upload: 200MB per request

**Allowed File Types:**
- Documents: PDF, DOC, DOCX
- Images: JPG, PNG, GIF, WEBP
- Data: CSV, XLSX
- Archives: ZIP (for bulk uploads)

**Upload Progress Tracking:**
- Chunked upload support (for large files)
- Progress endpoint: `GET /api/v1/uploads/{uploadId}/progress`

**9. Webhook Endpoints (if applicable):**

**POST /api/v1/webhooks**
- **Purpose:** Register webhook
- **Request:** Body (url, events array, secret)
- **Response:** 201 Created with webhook object
- **Request/Response Schemas:** TypeScript interfaces

**Webhook Delivery:**
- HTTP POST to registered URL
- Signature verification (HMAC-SHA256)
- Retry logic (3 attempts, exponential backoff)
- Webhook event types: document.extracted, obligation.deadline_approaching, audit_pack.generated

**10. OpenAPI/Swagger Specification:**

**OpenAPI 3.0 Specification:**
- Complete OpenAPI YAML/JSON file
- All endpoints documented
- Request/response schemas
- Authentication schemes
- Example requests/responses

**Feeds:**
→ Frontend Routes (2.6)
→ AI Integration Layer (2.10)

---

## **2.6 Frontend Routes & Component Map** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ User Workflow Maps (1.3)
→ Product Logic Specification (1.1)
→ Backend API (2.5)

**Document Format:**
- Markdown format with clear sections and subsections
- Include route definitions with exact URL patterns
- Include component hierarchy trees (text-based or mermaid diagrams)
- Include TypeScript interfaces for component props
- Include data fetching specifications (React Query/SWR hooks)
- Include navigation flow diagrams
- Be specific and detailed—this is the frontend implementation blueprint
- Target: 12,000-15,000 words (comprehensive route documentation)

**What Cursor Must Create:**

This document defines the complete frontend routing and component structure. It must include:

**1. Route Structure:**

**Base Route Configuration:**
- Framework: Next.js 14 App Router
- Route file structure: `app/{route}/page.tsx`
- Route groups: `(auth)`, `(dashboard)`, `(modules)`
- Dynamic routes: `[siteId]`, `[documentId]`, `[obligationId]`

**Route Metadata:**
- Page titles (metadata.title)
- Page descriptions (metadata.description)
- Breadcrumb configuration
- Route guards (authentication, authorization, module activation)

**2. Detailed Route Specifications:**

**A. Upload Screens:**

**Route: `/sites/[siteId]/documents/upload`**
- **URL Pattern:** `/sites/:siteId/documents/upload`
- **Component Structure:**
  - `DocumentUploadPage` (page component)
    - `DocumentUploadForm` (form component)
      - `FileDropzone` (drag-drop component)
      - `DocumentTypeSelector` (dropdown)
      - `MetadataForm` (optional metadata fields)
    - `UploadProgress` (progress indicator)
    - `UploadSuccess` (success message with navigation)
- **Data Fetching:**
  - `useSite(siteId)` - Fetch site details
  - `useDocumentUpload()` - Mutation hook for file upload
  - `useDocumentTypes()` - Fetch available document types
- **User Interactions:**
  - File drag-drop or click to select
  - Document type selection
  - Metadata entry (optional)
  - Form submission
  - Cancel navigation
- **Navigation Flow:**
  - Entry: From site dashboard or navigation menu
  - Success: Navigate to `/sites/[siteId]/documents/[documentId]/review`
  - Cancel: Navigate back to `/sites/[siteId]/dashboard`
- **Route Guards:**
  - Authentication required
  - Authorization: Owner, Admin, Staff roles
  - Site access: User must have access to siteId

**Route: `/sites/[siteId]/module-2/consents/upload`**
- **URL Pattern:** `/sites/:siteId/module-2/consents/upload`
- **Component Structure:** Similar to document upload, module-specific
- **Data Fetching:** Module 2 specific hooks
- **Route Guards:** Module 2 activation required

**Route: `/sites/[siteId]/module-3/registrations/upload`**
- **URL Pattern:** `/sites/:siteId/module-3/registrations/upload`
- **Component Structure:** Similar to document upload, module-specific
- **Data Fetching:** Module 3 specific hooks
- **Route Guards:** Module 3 activation required

**B. Obligation Review Screens:**

**Route: `/sites/[siteId]/obligations`**
- **URL Pattern:** `/sites/:siteId/obligations`
- **Component Structure:**
  - `ObligationsListPage` (page component)
    - `ObligationsFilterBar` (filter component)
    - `ObligationsTable` (table component)
      - `ObligationRow` (row component, repeated)
        - `ObligationStatusBadge` (status indicator)
        - `ObligationActions` (edit, mark N/A, link evidence buttons)
    - `ObligationsPagination` (pagination component)
- **Data Fetching:**
  - `useObligations(siteId, filters, pagination)` - Fetch obligations list
  - `useObligationFilters()` - Fetch available filter options
- **User Interactions:**
  - Filter by status, category, deadline
  - Sort by deadline, status, title
  - Pagination (next/previous pages)
  - Click obligation row → navigate to detail
  - Edit obligation → open edit modal
  - Mark N/A → confirmation dialog
  - Link evidence → navigate to evidence upload
- **Navigation Flow:**
  - Entry: From site dashboard or navigation menu
  - Click row: Navigate to `/sites/[siteId]/obligations/[obligationId]`
  - Edit: Open edit modal (inline or separate page)
  - Link evidence: Navigate to `/sites/[siteId]/obligations/[obligationId]/evidence/upload`

**Route: `/sites/[siteId]/obligations/[obligationId]`**
- **URL Pattern:** `/sites/:siteId/obligations/:obligationId`
- **Component Structure:**
  - `ObligationDetailPage` (page component)
    - `ObligationHeader` (title, status, deadline)
    - `ObligationDetails` (description, frequency, evidence requirements)
    - `EvidenceList` (linked evidence items)
    - `ObligationActions` (edit, mark N/A, link evidence, schedule)
- **Data Fetching:**
  - `useObligation(obligationId)` - Fetch obligation details
  - `useObligationEvidence(obligationId)` - Fetch linked evidence
- **User Interactions:**
  - Edit obligation details
  - Mark obligation as N/A
  - Link new evidence
  - Create/update monitoring schedule
  - View evidence details
- **Navigation Flow:**
  - Entry: From obligations list or direct link
  - Back: Navigate to `/sites/[siteId]/obligations`
  - Link evidence: Navigate to evidence upload

**C. Evidence Capture Screens:**

**Route: `/sites/[siteId]/obligations/[obligationId]/evidence/upload`**
- **URL Pattern:** `/sites/:siteId/obligations/:obligationId/evidence/upload`
- **Component Structure:**
  - `EvidenceUploadPage` (page component)
    - `EvidenceUploadForm` (form component)
      - `FileUpload` (file input, mobile-responsive)
      - `PhotoCapture` (camera component for mobile)
      - `CSVImport` (CSV import component)
      - `EvidenceTypeSelector` (dropdown)
      - `EvidenceMetadataForm` (optional metadata)
    - `EvidencePreview` (preview component)
- **Data Fetching:**
  - `useObligation(obligationId)` - Fetch obligation context
  - `useEvidenceUpload()` - Mutation hook for evidence upload
  - `useEvidenceTypes()` - Fetch available evidence types
- **User Interactions:**
  - File upload (drag-drop or click)
  - Photo capture (mobile camera)
  - CSV import (file selection)
  - Evidence type selection
  - Form submission
  - Cancel navigation
- **Navigation Flow:**
  - Entry: From obligation detail page or obligations list
  - Success: Navigate back to obligation detail page
  - Cancel: Navigate back to previous page
- **Mobile Responsiveness:**
  - Touch-optimized file upload
  - Camera integration for photo capture
  - Simplified form layout

**D. Site Dashboard:**

**Route: `/sites/[siteId]/dashboard`**
- **URL Pattern:** `/sites/:siteId/dashboard`
- **Component Structure:**
  - `SiteDashboardPage` (page component)
    - `TrafficLightStatus` (compliance status indicator)
    - `OverdueObligationsCard` (overdue obligations list)
    - `UpcomingDeadlinesCard` (upcoming deadlines list)
    - `RecentActivityCard` (recent evidence uploads, schedule updates)
    - `QuickActions` (upload document, upload evidence, generate audit pack)
- **Data Fetching:**
  - `useSiteDashboard(siteId)` - Fetch dashboard data (aggregated)
  - `useOverdueObligations(siteId)` - Fetch overdue obligations
  - `useUpcomingDeadlines(siteId, days=7)` - Fetch upcoming deadlines
  - `useRecentActivity(siteId)` - Fetch recent activity
- **User Interactions:**
  - Click overdue obligation → navigate to obligation detail
  - Click upcoming deadline → navigate to obligation detail
  - Click quick action → navigate to respective upload/generation page
  - Refresh dashboard data
- **Navigation Flow:**
  - Entry: Default route after site selection
  - Click obligation: Navigate to obligation detail
  - Quick actions: Navigate to respective pages

**E. Multi-Site Dashboard:**

**Route: `/dashboard`**
- **URL Pattern:** `/dashboard`
- **Component Structure:**
  - `MultiSiteDashboardPage` (page component)
    - `SiteSwitcher` (dropdown/selector)
    - `ConsolidatedView` (aggregated data across sites)
      - `ConsolidatedStatus` (overall compliance status)
      - `ConsolidatedObligations` (obligations across sites)
      - `ConsolidatedDeadlines` (deadlines across sites)
- **Data Fetching:**
  - `useUserSites()` - Fetch user's accessible sites
  - `useConsolidatedView(siteIds, dateRange)` - Fetch consolidated data
- **User Interactions:**
  - Site selection (switch active site)
  - View consolidated data
  - Filter by date range
  - Navigate to specific site dashboard
- **Navigation Flow:**
  - Entry: Default route for multi-site users
  - Site selection: Navigate to `/sites/[siteId]/dashboard`
  - Click obligation: Navigate to site-specific obligation detail

**F. Module Selection Screens:**

**Route: `/modules`**
- **URL Pattern:** `/modules`
- **Component Structure:**
  - `ModuleSelectionPage` (page component)
    - `ModuleCard` (module card component, repeated)
      - `ModuleInfo` (name, description, pricing)
      - `ModulePrerequisites` (required modules)
      - `ModuleActivationButton` (activate button)
    - `CrossSellPrompts` (cross-sell trigger notifications)
- **Data Fetching:**
  - `useModules()` - Fetch available modules from `modules` table
  - `useUserModuleActivations()` - Fetch user's active modules
  - `useCrossSellTriggers()` - Fetch cross-sell trigger notifications
- **User Interactions:**
  - View module details
  - Activate module (with confirmation)
  - Dismiss cross-sell prompts
- **Navigation Flow:**
  - Entry: From navigation menu or cross-sell prompt
  - Activation: Navigate to module-specific screens
  - Cross-sell: Navigate to module activation

**G. Dynamic Module Screens:**

**Route Pattern: `/sites/[siteId]/modules/[moduleId]/[moduleRoute]`**
- **URL Pattern:** `/sites/:siteId/modules/:moduleId/:moduleRoute` (dynamic based on `modules` table)
- **Component Structure:**
  - `DynamicModulePage` (page component, loads module-specific routes from `modules` table)
    - `ModuleRouteRenderer` (renders module-defined UI routes)
- **Data Fetching:**
  - `useModuleRoutes(moduleId)` - Fetch module routes from `modules` table
  - `useModuleData(moduleId, siteId)` - Fetch module-specific data
- **User Interactions:**
  - Module-specific interactions (defined by module)
- **Navigation Flow:**
  - Entry: From module selection or navigation menu
  - Module-specific navigation (defined by module)
- **Note:** See Module Extension Pattern in Canonical Dictionary (Section B.31) for guidance

**H. Module 2 Screens:**

**Route: `/sites/[siteId]/module-2/parameters`**
- **URL Pattern:** `/sites/:siteId/module-2/parameters`
- **Component Structure:**
  - `ParameterTrackingPage` (page component)
    - `ParameterList` (parameters table)
    - `ParameterChart` (visualization component)
    - `ExceedanceAlerts` (exceedance notifications)
- **Data Fetching:**
  - `useParameters(siteId)` - Fetch parameter tracking data
  - `useExceedances(siteId)` - Fetch exceedance alerts
- **Route Guards:** Module 2 activation required

**Route: `/sites/[siteId]/module-2/lab-results/import`**
- **URL Pattern:** `/sites/:siteId/module-2/lab-results/import`
- **Component Structure:** Similar to document upload, CSV/PDF import specific
- **Data Fetching:** Module 2 lab result import hooks
- **Route Guards:** Module 2 activation required

**I. Module 3 Screens:**

**Route: `/sites/[siteId]/module-3/run-hours`**
- **URL Pattern:** `/sites/:siteId/module-3/run-hours`
- **Component Structure:**
  - `RunHourTrackingPage` (page component)
    - `RunHourEntryForm` (form component)
    - `RunHourList` (run-hour records table)
    - `RunHourChart` (visualization component)
    - `LimitBreachAlerts` (breach notifications)
- **Data Fetching:**
  - `useRunHours(siteId)` - Fetch run-hour records
  - `useLimitBreaches(siteId)` - Fetch limit breach alerts
- **Route Guards:** Module 3 activation required

**Route: `/sites/[siteId]/module-3/aer/generate`**
- **URL Pattern:** `/sites/:siteId/module-3/aer/generate`
- **Component Structure:** AER generation form and status
- **Data Fetching:** AER generation hooks
- **Route Guards:** Module 3 activation required

**J. Audit Pack View:**

**Route: `/sites/[siteId]/audit-packs`**
- **URL Pattern:** `/sites/:siteId/audit-packs`
- **Component Structure:**
  - `AuditPacksListPage` (page component)
    - `AuditPackList` (audit packs table)
    - `GenerateAuditPackButton` (trigger generation)
- **Data Fetching:**
  - `useAuditPacks(siteId)` - Fetch audit packs list
  - `useAuditPackGeneration()` - Mutation hook for generation

**Route: `/sites/[siteId]/audit-packs/[auditPackId]`**
- **URL Pattern:** `/sites/:siteId/audit-packs/:auditPackId`
- **Component Structure:**
  - `AuditPackDetailPage` (page component)
    - `AuditPackPreview` (preview component)
    - `AuditPackDownload` (download button)
    - `AuditPackStatus` (generation status indicator)
- **Data Fetching:**
  - `useAuditPack(auditPackId)` - Fetch audit pack details
  - `useAuditPackDownload(auditPackId)` - Download mutation

**3. Component Hierarchy:**

**Shared Components:**
- `Layout` (main layout wrapper)
  - `Header` (navigation header)
  - `Sidebar` (navigation sidebar)
  - `Footer` (footer)
- `Button` (reusable button component)
- `Input` (reusable input component)
- `Modal` (reusable modal component)
- `Table` (reusable table component)
- `Pagination` (reusable pagination component)

**Route-Specific Components:**
- Per route: List all route-specific components
- Component props interfaces (TypeScript)
- Component state management (local state vs global state)

**4. Data Fetching Logic:**

**Data Fetching Strategy:**
- React Query (TanStack Query) for server state
- SWR as alternative (if preferred)
- Custom hooks per data entity (`useObligations`, `useEvidence`, etc.)

**Data Fetching Patterns:**
- List queries: `useQuery` with pagination/filtering
- Detail queries: `useQuery` with ID parameter
- Mutations: `useMutation` for create/update/delete
- Optimistic updates: Update cache immediately, rollback on error
- Cache invalidation: Invalidate related queries after mutations

**Loading States:**
- Skeleton loaders for initial load
- Spinner for mutations
- Error boundaries for error handling

**5. State Management:**

**Global State:**
- User state (current user, authentication)
- Company state (current company)
- Site state (current site selection)
- Module activation state (active modules)

**Route-Level State:**
- Form state (local component state)
- Filter state (URL query parameters)
- Pagination state (URL query parameters)

**State Persistence:**
- Authentication state: localStorage
- Site selection: localStorage
- Form drafts: sessionStorage (optional)

**6. Navigation Flow:**

**Navigation Patterns:**
- Programmatic navigation: `useRouter().push()`
- Link navigation: `<Link>` components
- Back navigation: Browser back button or programmatic

**Navigation Guards:**
- Authentication guard: Redirect to login if not authenticated
- Authorization guard: Redirect to dashboard if insufficient permissions
- Module activation guard: Redirect to module selection if module not active

**Breadcrumb Navigation:**
- Breadcrumb component per route
- Breadcrumb configuration (title, path, parent routes)

**7. Route Guards:**

**Authentication Guard:**
- Check JWT token validity
- Redirect to `/login` if not authenticated
- Store return URL for post-login redirect

**Authorization Guard:**
- Check user role/permissions
- Check site access (RLS)
- Redirect to `/dashboard` if insufficient permissions

**Module Activation Guard:**
- Check module activation status
- Redirect to `/modules` if module not active
- Show activation prompt if prerequisites not met

**8. Deep Linking Support:**

**Deep Link Patterns:**
- Obligation detail: `/sites/[siteId]/obligations/[obligationId]`
- Evidence upload: `/sites/[siteId]/obligations/[obligationId]/evidence/upload`
- Audit pack: `/sites/[siteId]/audit-packs/[auditPackId]`

**Deep Link Handling:**
- Validate site access before rendering
- Show loading state while validating
- Redirect to dashboard if access denied

**9. Mobile-First Responsive Design:**

**Responsive Breakpoints (from Design System 2.9):**
- **Mobile:** < 640px (sm) - Single column, stacked layout
- **Tablet:** 640px - 1024px (md) - 2-3 columns, optimized touch
- **Desktop:** 1024px - 1280px (lg) - 3-4 columns, hover states
- **Large Desktop:** > 1280px (xl) - 4+ columns, expanded layouts

**Mobile Navigation Patterns:**
- **Header:** Hamburger menu (mobile), full navigation (desktop)
- **Sidebar:** Collapsible drawer (mobile), persistent sidebar (desktop)
- **Bottom Navigation:** Fixed bottom nav for primary actions (mobile only)
- **Tab Navigation:** Horizontal scrollable tabs (mobile), full tabs (desktop)

**Mobile-Specific Components:**
- **File Upload:** Touch-optimized file picker, camera integration
- **Forms:** Full-width inputs, stacked fields, large touch targets (min 44x44px)
- **Tables:** Card layout on mobile, table view on desktop
- **Modals:** Full-screen on mobile (< 640px), centered modal on desktop
- **Data Tables:** Horizontal scroll with sticky header, or card conversion

**Touch Interactions:**
- **Swipe Gestures:** Swipe to delete, swipe to navigate
- **Pull to Refresh:** Refresh data on list screens
- **Long Press:** Context menus, bulk selection
- **Pinch to Zoom:** Image/PDF preview zoom

**Responsive Typography:**
- **Mobile:** Smaller font sizes (base: 14px), tighter line heights
- **Desktop:** Larger font sizes (base: 16px), relaxed line heights
- **Fluid Typography:** Use `clamp()` for responsive font scaling

**10. Accessibility Requirements (WCAG 2.1 AA Compliance):**

**Keyboard Navigation:**
- **Tab Order:** Logical tab sequence through all interactive elements
- **Skip Links:** Skip to main content, skip navigation
- **Keyboard Shortcuts:**
  - `Ctrl/Cmd + K`: Global search
  - `Ctrl/Cmd + /`: Show keyboard shortcuts
  - `Esc`: Close modals, dropdowns
  - `Enter/Space`: Activate buttons, links
  - `Arrow Keys`: Navigate dropdowns, lists, tables
- **Focus Management:** Visible focus indicators (2px solid outline), focus trap in modals

**Screen Reader Support:**
- **ARIA Labels:** All interactive elements have descriptive labels
- **ARIA Roles:** Semantic roles (button, link, navigation, region, etc.)
- **ARIA Live Regions:** Announce dynamic content changes (notifications, status updates)
- **ARIA Descriptions:** Additional context for complex interactions
- **Alt Text:** All images have descriptive alt text
- **Form Labels:** All form inputs have associated labels

**Color Contrast:**
- **Text:** Minimum 4.5:1 contrast ratio for normal text
- **Large Text:** Minimum 3:1 contrast ratio for large text (18px+)
- **UI Components:** Minimum 3:1 contrast ratio for interactive elements
- **Status Indicators:** Color + text/icon (not color alone)

**Accessible Components:**
- **Buttons:** Proper button semantics, keyboard accessible
- **Forms:** Error messages associated with inputs, validation feedback
- **Modals:** Focus trap, focus restoration, escape key to close
- **Dropdowns:** Keyboard navigation (arrow keys, enter to select)
- **Tables:** Proper table headers, row/column associations

**11. Performance Optimization:**

**Code Splitting:**
- **Route-Based Splitting:** Each route loads only required code
- **Component Lazy Loading:** Lazy load heavy components (charts, PDF viewers)
- **Dynamic Imports:** Use `next/dynamic` for code splitting

**Image Optimization:**
- **Next.js Image Component:** Use `next/image` for automatic optimization
- **Lazy Loading:** Images load on scroll/viewport entry
- **Responsive Images:** Serve appropriate sizes for device
- **Format Optimization:** WebP with fallback to JPEG/PNG

**Data Fetching Optimization:**
- **Prefetching:** Prefetch data for likely next routes
- **Caching:** React Query cache configuration (staleTime, cacheTime)
- **Pagination:** Load data in chunks, infinite scroll for large lists
- **Debouncing:** Debounce search/filter inputs (300ms)

**Loading Performance:**
- **Skeleton Loaders:** Show skeleton UI during initial load
- **Progressive Loading:** Load critical content first, secondary content after
- **Bundle Size:** Target < 200KB initial bundle, < 1MB total bundle

**12. Error Handling & States:**

**Error Boundaries:**
- **Route-Level Boundaries:** Catch errors per route, show error UI
- **Component-Level Boundaries:** Catch errors in specific components
- **Error Recovery:** Retry button, fallback UI, error reporting

**Error States:**
- **Network Errors:** Retry button, offline indicator
- **Validation Errors:** Inline error messages, form-level errors
- **Permission Errors:** Clear message, action to request access
- **404 Errors:** Helpful 404 page with navigation options
- **500 Errors:** User-friendly error message, support contact

**Empty States:**
- **No Data:** Illustrative empty state with action to create
- **No Results:** Search/filter empty state with suggestions
- **No Permissions:** Clear message explaining why data isn't visible
- **Empty States per Route:** Specific empty states for each route type

**Loading States:**
- **Initial Load:** Skeleton loaders matching content structure
- **Refreshing:** Subtle loading indicator (spinner, progress bar)
- **Mutations:** Button loading state, inline progress
- **Pagination:** Loading indicator for next page

**13. Animation & Transitions:**

**Page Transitions:**
- **Route Transitions:** Smooth fade/slide between routes (200-300ms)
- **Loading Transitions:** Fade in content after load
- **Modal Transitions:** Slide up (mobile), fade in (desktop)

**Micro-Interactions:**
- **Button Hover:** Subtle scale/color change (100ms)
- **Form Focus:** Input border color change, label animation
- **Success States:** Checkmark animation, success toast
- **Error States:** Shake animation for invalid inputs

**Performance Considerations:**
- **GPU Acceleration:** Use `transform` and `opacity` for animations
- **Reduce Motion:** Respect `prefers-reduced-motion` media query
- **Animation Duration:** Keep animations short (100-300ms)

**14. Form Validation & UX:**

**Validation Patterns:**
- **Real-Time Validation:** Validate on blur, show errors immediately
- **Inline Errors:** Error messages below inputs, error icons
- **Success Indicators:** Green checkmark for valid inputs
- **Form-Level Errors:** Summary of errors at top of form

**Validation Feedback:**
- **Error Messages:** Clear, actionable error messages
- **Success Messages:** Confirmation after successful submission
- **Loading States:** Disable form during submission, show progress

**Form UX:**
- **Auto-Save:** Save form drafts to sessionStorage (optional)
- **Field Dependencies:** Show/hide fields based on selections
- **Progressive Disclosure:** Show advanced options on demand
- **Smart Defaults:** Pre-fill fields where possible

**15. Search & Filter UX:**

**Search Patterns:**
- **Global Search:** Search across all entities (documents, obligations, sites)
- **Contextual Search:** Search within current view (obligations, evidence)
- **Search Suggestions:** Autocomplete suggestions as user types
- **Search Results:** Highlighted matches, result categories

**Filter Patterns:**
- **Filter Bar:** Persistent filter bar above content
- **Filter Chips:** Visual filter chips showing active filters
- **Filter Sidebar:** Collapsible filter sidebar (desktop)
- **Filter Presets:** Save/load filter presets

**Filter UX:**
- **Clear Filters:** Easy way to clear all filters
- **Filter Count:** Show number of results matching filters
- **Filter Persistence:** Persist filters in URL query params

**16. Notification & Toast System:**

**Toast Notifications:**
- **Types:** Success, Error, Warning, Info
- **Position:** Top-right (desktop), top-center (mobile)
- **Duration:** Auto-dismiss after 5 seconds (configurable)
- **Actions:** Undo button for destructive actions

**In-App Notifications:**
- **Notification Center:** Bell icon with unread count
- **Notification List:** List of notifications with actions
- **Mark as Read:** Mark individual or all as read
- **Notification Types:** Deadline alerts, evidence reminders, system notifications

**17. Print Styles:**

**Print-Optimized Routes:**
- **Audit Packs:** Print-friendly PDF generation
- **Reports:** Print styles for compliance reports
- **Obligation Lists:** Print-friendly table layouts

**Print CSS:**
- **Hide Navigation:** Hide header, sidebar, footer
- **Page Breaks:** Control page breaks for multi-page content
- **Print Colors:** Ensure sufficient contrast in print
- **Print Headers:** Page numbers, document title

**18. Offline Support:**

**Offline Detection:**
- **Online/Offline Indicator:** Show connection status
- **Offline Queue:** Queue actions when offline, sync when online
- **Offline Cache:** Cache critical data for offline access

**Offline UX:**
- **Offline Message:** Clear message when offline
- **Offline Actions:** Show which actions are queued
- **Sync Status:** Show sync progress when coming online

**19. Progressive Web App (PWA):**

**PWA Features:**
- **Service Worker:** Cache static assets, API responses
- **App Manifest:** App metadata, icons, theme colors
- **Install Prompt:** "Add to Home Screen" prompt
- **Offline Support:** Basic offline functionality

**PWA Configuration:**
- **Icons:** Multiple icon sizes (192x192, 512x512)
- **Theme Colors:** Match brand colors
- **Display Mode:** Standalone or fullscreen

**20. Internationalization (i18n) Readiness:**

**i18n Structure:**
- **Translation Keys:** Use translation keys, not hardcoded text
- **Locale Detection:** Detect user locale from browser
- **Locale Switching:** Language switcher in user settings
- **RTL Support:** Right-to-left layout support (if needed)

**i18n Implementation:**
- **Translation Files:** JSON files per locale
- **Pluralization:** Handle plural forms correctly
- **Date/Time Formatting:** Locale-aware date/time formatting
- **Number Formatting:** Locale-aware number formatting

**21. Dark Mode Support:**

**Dark Mode Implementation:**
- **Theme Toggle:** Toggle in user settings, system preference detection
- **Theme Persistence:** Save theme preference in localStorage
- **Color Tokens:** Use CSS variables for theme colors
- **Component Themes:** All components support dark mode

**Dark Mode Colors:**
- **Backgrounds:** Dark backgrounds (gray-900, gray-800)
- **Text:** Light text (gray-100, gray-200)
- **Borders:** Subtle borders (gray-700)
- **Status Colors:** Adjusted for dark mode contrast

**22. Component Library Integration:**

**Design System Integration:**
- **Design Tokens:** Use tokens from Design System (2.9)
- **Component Library:** Reference component specs from Design System
- **Consistency:** Ensure all routes use design system components
- **Customization:** Allow route-specific customization where needed

**Component Usage:**
- **Shared Components:** Use shared components from design system
- **Route-Specific Components:** Extend design system components
- **Component Props:** Follow design system component APIs

**23. State Management Details:**

**Global State (Zustand/Redux):**
- **User State:** Current user, authentication status
- **Company State:** Current company, company list
- **Site State:** Current site selection, site list
- **Module State:** Active modules, module data
- **UI State:** Sidebar open/closed, theme, notifications

**Route-Level State:**
- **Form State:** React Hook Form or Formik for form state
- **Filter State:** URL query parameters for filters
- **Pagination State:** URL query parameters for pagination
- **Modal State:** Local component state for modals

**State Persistence:**
- **Authentication:** localStorage for auth tokens
- **Site Selection:** localStorage for last selected site
- **Form Drafts:** sessionStorage for unsaved form data
- **User Preferences:** localStorage for UI preferences

**24. Keyboard Shortcuts:**

**Global Shortcuts:**
- `Ctrl/Cmd + K`: Open global search
- `Ctrl/Cmd + /`: Show keyboard shortcuts help
- `Ctrl/Cmd + N`: New document/obligation (context-dependent)
- `Esc`: Close modals, dropdowns, sidebars

**Route-Specific Shortcuts:**
- **Obligations List:** `F` to focus filter, `N` to create new
- **Document Upload:** `Ctrl/Cmd + Enter` to submit
- **Evidence Upload:** `Ctrl/Cmd + Enter` to submit

**Shortcut Help:**
- **Shortcut Modal:** Show all shortcuts in modal (`Ctrl/Cmd + /`)
- **Contextual Hints:** Show shortcuts in tooltips

**25. Route-Specific Requirements:**

**For Each Route, Specify:**
- **Mobile Layout:** How route adapts to mobile (< 640px)
- **Tablet Layout:** How route adapts to tablet (640-1024px)
- **Accessibility:** Specific accessibility requirements
- **Performance:** Lazy loading, code splitting requirements
- **Error States:** Route-specific error handling
- **Empty States:** Route-specific empty states
- **Loading States:** Route-specific loading patterns
- **Keyboard Shortcuts:** Route-specific shortcuts

**Feeds:**
→ Onboarding Flow (2.7)
→ UI/UX Design System (2.9)

---

## **2.7 Onboarding Flow Specification** 📝

**Status:** ✅ Complete  
**Created by:** Cursor  
**Depends on:**
→ User Workflow Maps (1.3)
→ Frontend Routes (2.6)

**Document Format:**
- Markdown format with clear sections and subsections
- Include flow diagrams (mermaid or text-based)
- Include step-by-step sequences with UI mockups/descriptions
- Include state machine definitions
- Include completion tracking logic
- Be specific and detailed—this is the onboarding implementation blueprint
- Target: 8,000-10,000 words (comprehensive flow documentation with quick onboarding optimization)

**What Cursor Must Create:**

This document defines the complete onboarding flow system. It must include:

**1. First-Time User Flow:**

**Flow Sequence:**
1. Signup (email, password, company name) - < 30 seconds
2. Email verification (verify email address) - < 1 minute (can be deferred)
3. Site creation (site name, address, regulator) - < 1 minute (with smart defaults)
4. **Upload method selection:** Choose "Upload PDF permit" OR "Import from Excel" - < 10 seconds
   - **PDF Upload Path:**
     4a. Permit upload (drag-drop tutorial, processing status) - < 2 minutes
     4b. Extraction review (review extracted obligations, edit if needed) - < 1 minute
   - **Excel Import Path:**
     4a. Excel file upload (drag-drop, file selection) - < 30 seconds
     4b. Import preview (review obligations to be imported, errors) - < 1 minute
     4c. Import confirmation (confirm import, see success) - < 30 seconds
5. Evidence capture tutorial (upload first evidence, link to obligation) - < 1 minute (can be deferred)
6. Dashboard introduction (navigate dashboard, understand traffic lights) - < 1 minute
7. Completion (onboarding complete, show next steps) - < 30 seconds

**Total Time Target:** < 10 minutes (full flow), < 3 minutes (quick start)

**State Machine:**
- States: SIGNUP → EMAIL_VERIFICATION → SITE_CREATION → UPLOAD_METHOD_SELECTION → [PERMIT_UPLOAD → EXTRACTION_REVIEW] OR [EXCEL_IMPORT → IMPORT_PREVIEW → IMPORT_CONFIRMATION] → EVIDENCE_TUTORIAL → DASHBOARD_INTRO → COMPLETE
- Transitions: Each step → next step (with skip/back options)
- Branch: After UPLOAD_METHOD_SELECTION, branch to PDF path or Excel path
- Completion criteria: All required steps completed (either PDF path or Excel path)

**UI Elements:**
- Progress indicator (step X of Y)
- Tooltips (contextual help at each step)
- Skip button (skip optional steps)
- Back button (return to previous step)
- Completion badge (show completion status)

**2. Permit Upload Tutorial:**

**Tutorial Steps:**
1. Introduction (what is a permit, why upload it)
2. Upload method selection (PDF upload vs Excel import explanation)
3. **PDF Upload Path:**
   - Drag-drop demonstration (animated example)
   - File selection (click to browse)
   - Processing status (show processing animation)
   - Extraction results (show extracted obligations)
   - Review obligations (how to edit, mark N/A)
4. **Excel Import Path:**
   - Introduction (import existing permit/obligation data from Excel)
   - Excel file format explanation (required columns, format)
   - File upload demonstration (drag-drop Excel file)
   - Import preview explanation (show valid rows, errors)
   - Import confirmation (confirm import, see success)

**UI Elements:**
- Highlighted drop zone (visual indicator)
- Animated drag-drop example (demonstration)
- Processing status indicator (progress bar, estimated time)
- Success message (extraction complete)
- Next step button (continue to review)

**3. Evidence Capture Tutorial:**

**Tutorial Steps:**
1. Introduction (what is evidence, why link it)
2. Mobile upload demonstration (camera integration)
3. File upload demonstration (drag-drop or click)
4. Linking to obligation (select obligation, link evidence)
5. Evidence verification (view linked evidence)

**UI Elements:**
- Mobile camera interface (for mobile devices)
- File upload interface (for desktop)
- Obligation selector (dropdown or search)
- Link confirmation (show linked evidence)
- Success message (evidence linked successfully)

**4. Multi-Site Setup Flow:**

**Flow Sequence:**
1. Site switcher introduction (explain multi-site concept)
2. Add additional site (site creation form)
3. Site switching demonstration (switch between sites)
4. Consolidated view introduction (explain consolidated dashboard)
5. Completion (multi-site setup complete)

**UI Elements:**
- Site switcher component (highlighted)
- Add site button (prominent)
- Site creation form (guided form)
- Site switching animation (visual feedback)
- Consolidated view explanation (tooltip or modal)

**5. Module Activation Flow:**

**Flow Sequence:**
1. Cross-sell prompt (detect trigger, show prompt)
2. Module information (module details, pricing, benefits)
3. Prerequisites check (check required modules)
4. Activation confirmation (confirm activation, payment if applicable)
5. Module setup (module-specific onboarding)
6. Completion (module active, show module screens)

**UI Elements:**
- Cross-sell prompt modal (non-intrusive)
- Module card (information display)
- Prerequisites indicator (show required modules)
- Activation button (prominent CTA)
- Module setup wizard (module-specific steps)

**6. Consultant Onboarding:**

**Flow Sequence:**
1. Consultant signup (multi-client access option)
2. Client selection (select or add client)
3. Client site access (request access to client sites)
4. Multi-client dashboard (switch between clients)
5. Completion (consultant onboarding complete)

**UI Elements:**
- Client selector (dropdown or list)
- Client access request form (request access)
- Multi-client dashboard (client switcher)
- Client data isolation indicator (visual boundary)

**7. 14-Day Access Flow:**

**Flow Sequence:**
1. Admin creates account (admin creates user account)
2. Admin uploads documents (admin uploads permits, completes extraction)
3. Admin links evidence (admin links evidence to obligations)
4. User receives access (user receives email with access link)
5. User logs in (user logs in, sees pre-populated data)
6. User completes setup (user completes any remaining steps)

**UI Elements:**
- Admin onboarding interface (admin-specific UI)
- Pre-populated data indicator (show what's already done)
- Completion checklist (show remaining steps)
- Welcome message (explain what's been done)

**8. Completion Tracking:**

**Completion Criteria:**
- First-time user: All required steps completed
- Permit upload: Document uploaded and reviewed
- Evidence capture: At least one evidence linked
- Multi-site: At least one additional site added (optional)
- Module activation: Module activated and setup complete

**Completion Tracking Implementation:**
- Database schema: `user_onboarding_progress` table (user_id, flow_type, step, completed_at, skipped)
- Progress API: `GET /api/v1/users/{userId}/onboarding-progress`
- Progress update: `PUT /api/v1/users/{userId}/onboarding-progress/{step}`

**9. Skip/Back Navigation:**

**Skip Logic:**
- Optional steps can be skipped
- Skip button on each optional step
- Skip confirmation (confirm skip)
- Skip tracking (record skipped steps)

**Back Navigation:**
- Back button on each step (except first)
- Back navigation preserves form data
- Back navigation updates progress

**10. Flow Diagrams:**

**Mermaid Diagrams:**
- First-time user flow diagram
- Permit upload tutorial flow diagram
- Evidence capture tutorial flow diagram
- Multi-site setup flow diagram
- Module activation flow diagram

**11. Quick Start Flow (Priority 1 - Quick Onboarding):**

**Objective:** Get users to value in < 3 minutes

**Minimal Viable Onboarding Sequence:**
1. Signup (email, password, company name) - < 30 seconds
2. Site creation (site name, address, regulator) - < 1 minute
3. Permit upload (drag-drop, auto-process) - < 1 minute
4. Quick value demonstration (show extracted obligations, traffic light status) - < 30 seconds

**Quick Start Features:**
- **Skip tutorials:** Show "Skip tutorial" option prominently
- **Auto-process:** Process permit automatically, show results immediately
- **Early value:** Show dashboard with extracted obligations right away
- **Defer advanced:** Move evidence capture, multi-site setup to post-onboarding

**Time Targets:**
- Quick start completion: < 3 minutes
- Full onboarding: < 10 minutes
- Permit upload: < 2 minutes
- Evidence capture: < 1 minute
- Dashboard intro: < 1 minute

**UI Elements:**
- "Quick Start" vs "Full Tutorial" option at signup
- Progress timer (show time elapsed)
- Skip tutorial button (always visible)
- Value demonstration after permit upload (show compliance status)

**12. Time-to-Value Optimization (Priority 1 - Quick Onboarding):**

**Quick Wins Strategy:**
- **Immediate value:** Show extracted obligations within 1 minute of signup
- **Early success:** Display "You're now tracking compliance" message after permit upload
- **Progress visualization:** Show compliance improvement over time
- **ROI indicators:** Display "Time saved: X hours" after first evidence upload

**Value Demonstration Points:**
- After permit upload: Show extracted obligations count, compliance status
- After evidence link: Show "X obligations now have evidence" message
- After dashboard intro: Show "You're tracking X obligations across Y sites"

**Success Moments:**
- Celebrate permit upload completion
- Celebrate first evidence link
- Celebrate onboarding completion
- Show progress milestones

**13. Smart Defaults & Auto-Fill (Priority 1 - Quick Onboarding):**

**Pre-Fill Strategies:**
- **Company name:** Extract from email domain (e.g., john@acme.com → "Acme")
- **Regulator:** Auto-detect from site address/postcode (if possible)
- **Site address:** Use browser geolocation (with permission)
- **Permit type:** Suggest common types based on regulator

**Auto-Detection Logic:**
- **Regulator detection:** Match postcode/region to regulator database
- **Permit type detection:** Analyze uploaded document filename/content
- **Obligation linking:** Auto-link evidence to obligations based on keywords/metadata

**Batch Operations:**
- **Multiple file upload:** Allow uploading multiple permits at once
- **Bulk evidence upload:** Upload multiple evidence files, link to multiple obligations
- **Bulk site creation:** Import sites from CSV/spreadsheet

**UI Elements:**
- Pre-filled form fields (with edit option)
- "Use suggested" button for auto-detected values
- Batch upload interface (drag multiple files)
- Progress indicator for batch operations

**14. Progressive Disclosure (Priority 1 - Quick Onboarding):**

**Core vs Advanced Features:**
- **Core features (show first):** Document upload, obligation tracking, evidence linking, dashboard
- **Advanced features (show later):** Multi-site setup, module activation, advanced scheduling, audit packs

**Progressive Disclosure Strategy:**
- **Onboarding:** Show only core features
- **Post-onboarding:** Show contextual prompts for advanced features
- **Feature discovery:** Highlight new features as user progresses
- **Contextual prompts:** Show "Did you know?" tooltips for advanced features

**Contextual Prompts:**
- After 3 obligations tracked: "Add more sites to track multiple locations"
- After 5 evidence items: "Activate Module 2 for parameter tracking"
- After 10 obligations: "Generate audit pack for compliance review"

**UI Elements:**
- "Learn more" links (non-blocking)
- Contextual tooltips (show when relevant)
- Feature discovery badges (highlight new features)
- "Skip for now" option (always available)

**15. Onboarding Analytics & Metrics (Priority 2 - Quick Onboarding):**

**Completion Tracking:**
- **Completion rate:** Track % of users who complete onboarding
- **Drop-off points:** Identify where users abandon onboarding
- **Time-to-complete:** Track average time to complete each step
- **Skip rate:** Track which steps are skipped most often

**Metrics to Track:**
- Onboarding start rate (signups who start onboarding)
- Step completion rate (per step)
- Time per step (average, median)
- Drop-off rate (per step)
- Skip rate (per step)
- Overall completion rate
- Time-to-value (time to first value demonstration)

**A/B Testing Framework:**
- Test different onboarding flows (quick start vs full tutorial)
- Test different UI elements (progress indicators, tooltips)
- Test different messaging (value propositions, CTAs)
- Test different time targets (3 min vs 5 min quick start)

**Analytics Implementation:**
- Event tracking: `onboarding_started`, `onboarding_step_completed`, `onboarding_skipped`, `onboarding_completed`
- Time tracking: Track time spent on each step
- Drop-off tracking: Track where users abandon flow
- Completion tracking: Track overall completion rate

**16. Contextual Help System (Priority 2 - Quick Onboarding):**

**Inline Help:**
- **Tooltips:** Show contextual hints on hover/focus (non-blocking)
- **Inline hints:** Show helpful text below form fields
- **Contextual help:** Show help relevant to current step
- **Help center links:** Link to detailed documentation (don't block flow)

**Help Display Strategy:**
- **First-time users:** Show more help, tooltips
- **Returning users:** Show less help, hide tooltips
- **Power users:** Hide help by default, show on demand
- **Context-aware:** Show help relevant to current action

**UI Elements:**
- Inline tooltips (show on hover/focus)
- "?" help icons (click to show help)
- Contextual help panels (slide-in, non-blocking)
- Help center integration (link to docs)

**Help Content:**
- Step-by-step instructions (per step)
- Video tutorials (optional, don't block)
- FAQ links (common questions)
- Support contact (if needed)

**17. Progress Persistence & Recovery (Priority 2 - Quick Onboarding):**

**Auto-Save Logic:**
- **Form data:** Auto-save form inputs every 10 seconds
- **Progress:** Auto-save progress after each step
- **State:** Persist onboarding state across sessions
- **Recovery:** Resume onboarding from last completed step

**Resume Onboarding:**
- **Session recovery:** Detect incomplete onboarding on login
- **Progress indicator:** Show "Resume onboarding" prompt
- **Step restoration:** Restore to last completed step
- **Data preservation:** Restore form data from previous session

**Email Reminders:**
- **Incomplete onboarding:** Send reminder after 24 hours if incomplete
- **Progress update:** Show progress in reminder email
- **Completion incentive:** Highlight benefits of completing onboarding
- **Direct link:** Include direct link to resume onboarding

**UI Elements:**
- "Resume onboarding" banner (if incomplete)
- Progress indicator (show completed steps)
- Auto-save indicator ("Saving..." / "Saved")
- Email reminder opt-out (user preference)

**18. Role-Based Onboarding Variants (Priority 2 - Quick Onboarding):**

**Owner/Admin Flow:**
- **Full setup:** Complete onboarding with all steps
- **Company setup:** Company creation, site creation, user management
- **Time target:** < 10 minutes
- **Focus:** Full platform understanding

**Staff Flow:**
- **Simplified:** Skip company setup, focus on site operations
- **Site-focused:** Start with site selection, document upload
- **Time target:** < 5 minutes
- **Focus:** Daily operations (upload, evidence, tracking)

**Consultant Flow:**
- **Multi-client:** Client selection, multi-client dashboard
- **Access-focused:** Request access to client sites
- **Time target:** < 5 minutes
- **Focus:** Multi-client management

**Viewer Flow:**
- **Read-only:** Minimal onboarding, dashboard tour only
- **No uploads:** Skip document/evidence upload steps
- **Time target:** < 2 minutes
- **Focus:** Viewing compliance status

**UI Elements:**
- Role detection (detect role from signup/invitation)
- Role-specific flow (show relevant steps only)
- Role-specific time targets (adjust expectations)
- Role-specific value demonstration (show relevant features)

**19. Post-Onboarding Experience (Priority 2 - Quick Onboarding):**

**Completion Celebration:**
- **Success message:** "Welcome! You're all set up"
- **Achievement badge:** Show completion badge
- **Progress summary:** Show what was accomplished
- **Next steps:** Show recommended next actions

**Next Steps Checklist:**
- Upload additional permits (if needed)
- Link evidence to obligations
- Set up monitoring schedules
- Invite team members
- Explore advanced features

**Feature Discovery:**
- **Contextual prompts:** Show "Did you know?" prompts for advanced features
- **Feature highlights:** Highlight new features as user progresses
- **Tutorial links:** Link to feature-specific tutorials (optional)
- **Progressive disclosure:** Show advanced features gradually

**Follow-Up Communications:**
- **Welcome email:** Send welcome email with next steps
- **Tips email:** Send tips email after 3 days
- **Feature highlights:** Send feature highlights after 7 days
- **Support offer:** Offer help/support if needed

**UI Elements:**
- Completion celebration modal
- Next steps checklist (interactive)
- Feature discovery prompts (non-intrusive)
- Email preferences (opt-in/opt-out)

**20. Mobile Quick Onboarding (Priority 2 - Quick Onboarding):**

**Mobile-Optimized Flow:**
- **Simplified forms:** Reduce form fields, use mobile-friendly inputs
- **Touch-optimized:** Large touch targets, swipe gestures
- **Camera-first:** Prioritize camera for evidence capture
- **Progressive enhancement:** Show core features first, advanced later

**Mobile-Specific Features:**
- **Camera integration:** Direct camera access for evidence capture
- **Location services:** Use GPS for site address
- **Touch gestures:** Swipe to navigate, long-press for options
- **Offline support:** Allow offline form completion, sync when online

**Mobile Time Targets:**
- Quick start: < 4 minutes (slightly longer due to mobile constraints)
- Permit upload: < 2 minutes
- Evidence capture: < 1 minute (camera-first)

**UI Elements:**
- Mobile-optimized forms (larger inputs, touch-friendly)
- Camera interface (native camera integration)
- Touch gestures (swipe, long-press)
- Mobile progress indicator (bottom of screen)

**Feeds:**
→ UI/UX Design System (2.9)

---

## **2.8 RLS & Permissions Rules** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ Product Logic Specification (1.1)
→ Canonical Dictionary (1.2)
→ User Workflow Maps (1.3)
→ Database Schema (2.2)

**Document Format:**
- Markdown format with clear sections and subsections
- Include exact RLS policy SQL for each table
- Include complete CRUD matrices (per role per entity)
- Include permission evaluation logic (pseudocode)
- Include test cases for permission scenarios
- Include TypeScript interfaces for permission checks
- Be specific and detailed—this is the security implementation blueprint
- Target: 10,000-12,000 words (comprehensive security documentation)

**What Cursor Must Create:**

This document defines the complete RLS and permissions system. It must include:

**1. RLS Policy Structure:**

**Policy Naming Convention:**
- Format: `{table_name}_{operation}_{scope}`
- Example: `obligations_select_site_access`, `documents_insert_company_access`

**Policy Components:**
- Policy name
- Table name
- Operation (SELECT, INSERT, UPDATE, DELETE)
- Policy condition (WHEN clause)
- Policy action (USING clause for SELECT, WITH CHECK for INSERT/UPDATE)

**2. Exact RLS Policies for ALL 32 Tables:**

**A. Core Entity Tables (9 tables):**

**A.1 Companies Table:**
- `companies_select_user_access` (SELECT)
- `companies_insert_owner_access` (INSERT - Owner only)
- `companies_update_owner_admin_access` (UPDATE - Owner/Admin)
- `companies_delete_owner_access` (DELETE - Owner only)

**A.2 Sites Table:**
- `sites_select_user_access` (SELECT)
- `sites_insert_owner_admin_access` (INSERT - Owner/Admin)
- `sites_update_owner_admin_access` (UPDATE - Owner/Admin)
- `sites_delete_owner_admin_access` (DELETE - Owner/Admin)

**A.3 Users Table:**
- `users_select_company_access` (SELECT - same company)
- `users_insert_owner_admin_access` (INSERT - Owner/Admin)
- `users_update_owner_admin_access` (UPDATE - Owner/Admin)
- `users_delete_owner_access` (DELETE - Owner only)

**A.4 User Roles Table:**
- `user_roles_select_company_access` (SELECT - same company)
- `user_roles_insert_owner_admin_access` (INSERT - Owner/Admin)
- `user_roles_update_owner_admin_access` (UPDATE - Owner/Admin)
- `user_roles_delete_owner_access` (DELETE - Owner only)

**A.5 User Site Assignments Table:**
- `user_site_assignments_select_company_access` (SELECT - same company)
- `user_site_assignments_insert_owner_admin_access` (INSERT - Owner/Admin)
- `user_site_assignments_update_owner_admin_access` (UPDATE - Owner/Admin)
- `user_site_assignments_delete_owner_admin_access` (DELETE - Owner/Admin)

**A.6 Modules Table:**
- `modules_select_all_access` (SELECT - all users)
- `modules_insert_system_access` (INSERT - system/service role only)
- `modules_update_system_access` (UPDATE - system/service role only)
- `modules_delete_system_access` (DELETE - system/service role only)

**A.7 Documents Table:**
- `documents_select_site_access` (SELECT)
- `documents_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `documents_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `documents_delete_owner_admin_access` (DELETE - Owner/Admin)

**A.8 Document Site Assignments Table:**
- `document_site_assignments_select_site_access` (SELECT)
- `document_site_assignments_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `document_site_assignments_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `document_site_assignments_delete_owner_admin_access` (DELETE - Owner/Admin)

**A.9 Obligations Table:**
- `obligations_select_site_access` (SELECT)
- `obligations_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `obligations_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `obligations_delete_owner_admin_access` (DELETE - Owner/Admin)

**B. Core Module 1 Tables (5 tables):**

**B.1 Schedules Table:**
- `schedules_select_site_access` (SELECT)
- `schedules_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `schedules_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `schedules_delete_owner_admin_access` (DELETE - Owner/Admin)

**B.2 Deadlines Table:**
- `deadlines_select_site_access` (SELECT)
- `deadlines_insert_system_access` (INSERT - system only, auto-generated)
- `deadlines_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `deadlines_delete_owner_admin_access` (DELETE - Owner/Admin)

**B.3 Evidence Items Table:**
- `evidence_items_select_site_access` (SELECT)
- `evidence_items_insert_staff_access` (INSERT - Owner/Admin/Staff/Consultant)
- `evidence_items_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `evidence_items_delete_none` (DELETE - No one can delete, system archives only)

**B.4 Obligation Evidence Links Table:**
- `obligation_evidence_links_select_site_access` (SELECT)
- `obligation_evidence_links_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `obligation_evidence_links_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `obligation_evidence_links_delete_staff_access` (DELETE - Owner/Admin/Staff)

**B.5 Audit Packs Table:**
- `audit_packs_select_site_access` (SELECT)
- `audit_packs_insert_staff_access` (INSERT - Owner/Admin/Staff/Consultant)
- `audit_packs_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `audit_packs_delete_owner_admin_access` (DELETE - Owner/Admin)

**C. Module 2 Tables (Trade Effluent - 4 tables):**

**C.1 Parameters Table:**
- `parameters_select_site_access` (SELECT - site access + module activated)
- `parameters_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `parameters_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `parameters_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**C.2 Lab Results Table:**
- `lab_results_select_site_access` (SELECT - site access + module activated)
- `lab_results_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `lab_results_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `lab_results_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**C.3 Exceedances Table:**
- `exceedances_select_site_access` (SELECT - site access + module activated)
- `exceedances_insert_system_access` (INSERT - system only, auto-generated)
- `exceedances_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `exceedances_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**C.4 Discharge Volumes Table:**
- `discharge_volumes_select_site_access` (SELECT - site access + module activated)
- `discharge_volumes_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `discharge_volumes_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `discharge_volumes_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**D. Module 3 Tables (MCPD/Generators - 5 tables):**

**D.1 Generators Table:**
- `generators_select_site_access` (SELECT - site access + module activated)
- `generators_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `generators_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `generators_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**D.2 Run Hour Records Table:**
- `run_hour_records_select_site_access` (SELECT - site access + module activated)
- `run_hour_records_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `run_hour_records_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `run_hour_records_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**D.3 Stack Tests Table:**
- `stack_tests_select_site_access` (SELECT - site access + module activated)
- `stack_tests_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `stack_tests_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `stack_tests_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**D.4 Maintenance Records Table:**
- `maintenance_records_select_site_access` (SELECT - site access + module activated)
- `maintenance_records_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `maintenance_records_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `maintenance_records_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**D.5 AER Documents Table:**
- `aer_documents_select_site_access` (SELECT - site access + module activated)
- `aer_documents_insert_staff_access` (INSERT - Owner/Admin/Staff + module activated)
- `aer_documents_update_staff_access` (UPDATE - Owner/Admin/Staff + module activated)
- `aer_documents_delete_owner_admin_access` (DELETE - Owner/Admin + module activated)

**E. Cross-Module Tables (9 tables):**

**E.1 Notifications Table:**
- `notifications_select_user_access` (SELECT - own notifications)
- `notifications_insert_system_access` (INSERT - system only)
- `notifications_update_system_access` (UPDATE - system only)
- `notifications_delete_user_access` (DELETE - own notifications)

**E.2 Audit Logs Table:**
- `audit_logs_select_company_access` (SELECT - same company, read-only)
- `audit_logs_insert_system_access` (INSERT - system only, immutable)
- `audit_logs_update_none` (UPDATE - no one can update, immutable)
- `audit_logs_delete_none` (DELETE - no one can delete, immutable)

**E.3 Regulator Questions Table:**
- `regulator_questions_select_site_access` (SELECT)
- `regulator_questions_insert_staff_access` (INSERT - Owner/Admin/Staff)
- `regulator_questions_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `regulator_questions_delete_owner_admin_access` (DELETE - Owner/Admin)

**E.4 Review Queue Items Table:**
- `review_queue_items_select_site_access` (SELECT)
- `review_queue_items_insert_system_access` (INSERT - system only)
- `review_queue_items_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `review_queue_items_delete_system_access` (DELETE - system only)

**E.5 Escalations Table:**
- `escalations_select_site_access` (SELECT)
- `escalations_insert_system_access` (INSERT - system only, auto-generated)
- `escalations_update_staff_access` (UPDATE - Owner/Admin/Staff)
- `escalations_delete_owner_admin_access` (DELETE - Owner/Admin)

**E.6 Excel Imports Table:**
- `excel_imports_select_user_access` (SELECT - own imports)
- `excel_imports_insert_user_access` (INSERT - any authenticated user)
- `excel_imports_update_user_access` (UPDATE - own imports)
- `excel_imports_delete_user_access` (DELETE - own imports)

**E.7 Module Activations Table:**
- `module_activations_select_company_access` (SELECT - same company)
- `module_activations_insert_owner_admin_access` (INSERT - Owner/Admin only)
- `module_activations_update_owner_admin_access` (UPDATE - Owner/Admin only)
- `module_activations_delete_owner_access` (DELETE - Owner only)

**E.8 Cross-Sell Triggers Table:**
- `cross_sell_triggers_select_company_access` (SELECT - same company)
- `cross_sell_triggers_insert_system_access` (INSERT - system only)
- `cross_sell_triggers_update_owner_admin_access` (UPDATE - Owner/Admin)
- `cross_sell_triggers_delete_owner_admin_access` (DELETE - Owner/Admin)

**E.9 Extraction Logs Table:**
- `extraction_logs_select_site_access` (SELECT)
- `extraction_logs_insert_system_access` (INSERT - system only)
- `extraction_logs_update_system_access` (UPDATE - system only)
- `extraction_logs_delete_owner_admin_access` (DELETE - Owner/Admin)

**F. Consultant Data Boundary:**

**Consultant Isolation Policy Pattern (applied to all tables with company_id or site_id):**
```sql
-- Example: Consultant isolation for companies table
CREATE POLICY companies_consultant_isolation ON companies
FOR ALL
USING (
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'consultant'
    )
    THEN
      id IN (
        SELECT company_id FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'consultant'
      )
    ELSE TRUE
  END
);
```

**Note:** Consultant isolation must be combined with role-based policies (e.g., consultant can only READ, not CREATE/UPDATE/DELETE for most entities)

**3. Complete CRUD Matrix for ALL 28 Entities:**

**CRUD Matrix per Role per Entity (C=Create, R=Read, U=Update, D=Delete, -=No Access):**

| Entity | Owner | Admin | Staff | Viewer | Consultant |
|--------|-------|-------|-------|--------|------------|
| **Companies** | CRUD | CRU | R | R | R (client only) |
| **Sites** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Users** | CRUD | CRUD | R | R | R (client only) |
| **User Roles** | CRUD | CRUD | - | - | - |
| **User Site Assignments** | CRUD | CRUD | - | - | - |
| **Modules** | R | R | R | R | R |
| **Documents** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Document Site Assignments** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Obligations** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Schedules** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Deadlines** | CRUD | CRUD | CU | R | CU (client only) |
| **Evidence Items** | CRU | CRU | CRU | R | CRU (client only) |
| **Obligation Evidence Links** | CRUD | CRUD | CRUD | R | CRUD (client only) |
| **Audit Packs** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Parameters (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Lab Results (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Exceedances (Module 2)** | CRUD* | CRUD* | CU* | R* | CU* (client only) |
| **Discharge Volumes (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Generators (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Run Hour Records (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Stack Tests (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Maintenance Records (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **AER Documents (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Notifications** | R (own) | R (own) | R (own) | R (own) | R (own) |
| **Audit Logs** | R (company) | R (company) | R (company) | R (company) | R (client only) |
| **Regulator Questions** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Review Queue Items** | CRUD | CRUD | CU | R | CU (client only) |
| **Escalations** | CRUD | CRUD | CU | R | CU (client only) |
| **Excel Imports** | CRUD (own) | CRUD (own) | CRUD (own) | R (own) | CRUD (own) |
| **Module Activations** | CRUD | CRUD | R | R | R |
| **Cross-Sell Triggers** | CRUD | CRUD | R | R | R (client only) |
| **Extraction Logs** | CRUD | CRUD | R | R | R (client only) |

*Module 2/3 entities require module activation (check `module_activations` table)

**Special Rules:**
- **Evidence Deletion:** No role can DELETE evidence items (system archives only after retention period)
- **Deadline Creation:** Deadlines are auto-generated by system (no manual INSERT)
- **Exceedance Creation:** Exceedances are auto-generated by system (no manual INSERT)
- **Escalation Creation:** Escalations are auto-generated by system (no manual INSERT)
- **Review Queue Creation:** Review queue items are auto-generated by system (no manual INSERT)
- **Audit Logs:** Immutable (no UPDATE or DELETE by any role)
- **Notifications:** Users can only access their own notifications
- **Excel Imports:** Users can only access their own imports
- **Consultant Restrictions:** Consultants can only access assigned client companies/sites (enforced via RLS)

**4. Permission Evaluation Logic:**

**4.1 Permission Check Function (Exact SQL Implementation):**

```sql
-- Function to check if user has company access
CREATE OR REPLACE FUNCTION has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = has_company_access.user_id
    AND user_roles.company_id = has_company_access.company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has site access
CREATE OR REPLACE FUNCTION has_site_access(user_id UUID, site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_site_assignments.user_id = has_site_access.user_id
    AND user_site_assignments.site_id = has_site_access.site_id
  )
  OR EXISTS (
    SELECT 1 FROM sites s
    INNER JOIN user_roles ur ON s.company_id = ur.company_id
    WHERE s.id = has_site_access.site_id
    AND ur.user_id = has_site_access.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role permission for operation
CREATE OR REPLACE FUNCTION role_has_permission(
  user_id UUID,
  entity_type TEXT,
  operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role for the entity's company
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = role_has_permission.user_id
  LIMIT 1;
  
  -- Check permission based on role and operation
  CASE user_role
    WHEN 'owner' THEN
      RETURN TRUE; -- Owner has all permissions
    WHEN 'admin' THEN
      RETURN operation != 'DELETE' OR entity_type IN ('companies', 'users'); -- Admin can delete most, but not companies/users
    WHEN 'staff' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type NOT IN ('users', 'user_roles', 'module_activations');
    WHEN 'viewer' THEN
      RETURN operation = 'READ'; -- Viewer is read-only
    WHEN 'consultant' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type IN ('documents', 'obligations', 'evidence_items', 'audit_packs');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check module activation
CREATE OR REPLACE FUNCTION is_module_activated(
  company_id UUID,
  module_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM module_activations
    WHERE module_activations.company_id = is_module_activated.company_id
    AND module_activations.module_id = is_module_activated.module_id
    AND module_activations.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**4.2 Permission Check Pseudocode (Application Layer):**

```
function checkPermission(userId, resource, operation):
  // Get user roles
  roles = getUserRoles(userId)
  
  // Check company-level access
  if not hasCompanyAccess(userId, resource.company_id):
    return false
  
  // Check consultant isolation (if consultant role)
  if roles.includes('consultant'):
    if not isConsultantAssignedToCompany(userId, resource.company_id):
      return false
  
  // Check site-level access (if resource has site_id)
  if resource.site_id and not hasSiteAccess(userId, resource.site_id):
    return false
  
  // Check module activation (for Module 2/3 entities)
  if resource.module_id:
    if not isModuleActivated(resource.company_id, resource.module_id):
      return false
  
  // Check role-based permissions
  for role in roles:
    if roleHasPermission(role, resource.type, operation):
      return true
  
  return false

function hasCompanyAccess(userId, companyId):
  return exists(
    SELECT 1 FROM user_roles
    WHERE user_id = userId
    AND company_id = companyId
  )

function hasSiteAccess(userId, siteId):
  return exists(
    SELECT 1 FROM user_site_assignments
    WHERE user_id = userId
    AND site_id = siteId
  )
  OR exists(
    SELECT 1 FROM sites s
    INNER JOIN user_roles ur ON s.company_id = ur.company_id
    WHERE s.id = siteId
    AND ur.user_id = userId
  )

function isConsultantAssignedToCompany(consultantId, companyId):
  return exists(
    SELECT 1 FROM user_roles
    WHERE user_id = consultantId
    AND company_id = companyId
    AND role = 'consultant'
  )

function isModuleActivated(companyId, moduleId):
  return exists(
    SELECT 1 FROM module_activations
    WHERE company_id = companyId
    AND module_id = moduleId
    AND is_active = TRUE
  )
```

**4.3 Permission Check API Endpoint:**

**GET /api/v1/permissions/check**

**Purpose:** Check if user has permission for an operation

**Request:**
```json
{
  "resource_type": "obligations",
  "resource_id": "uuid",
  "operation": "UPDATE"
}
```

**Response:**
```json
{
  "data": {
    "has_permission": true,
    "reason": "User has Staff role with UPDATE permission for obligations",
    "role": "staff",
    "company_access": true,
    "site_access": true,
    "module_activated": true
  }
}
```

**5. Viewer Role RLS Rules (see PLS Section B.10.2.2):**

**Viewer Role Restrictions:**
- Cannot INSERT any records (except read-only views)
- Cannot UPDATE any records
- Cannot DELETE any records
- Can only SELECT records (with site/company access)

**Viewer Role Policies:**
- All INSERT policies: No policies (viewers cannot insert)
- All UPDATE policies: No policies (viewers cannot update)
- All DELETE policies: No policies (viewers cannot delete)
- All SELECT policies: Same as other roles (with site/company access)

**6. Consultant Data Boundary Rules (see PLS Section B.10.2.3):**

**Cross-Client Data Isolation:**
- Consultants can only access companies assigned to them
- Assignment tracked in `consultant_client_assignments` table
- RLS policies enforce isolation at database level
- API layer validates consultant access before queries

**Consultant Access Logic:**
```
function checkConsultantAccess(consultantId, companyId):
  return exists(
    SELECT 1 FROM consultant_client_assignments
    WHERE consultant_id = consultantId
    AND company_id = companyId
  )
```

**7. Multi-Site Permissions:**

**Cross-Site Access Rules:**
- Users can access multiple sites (within their company)
- Site access determined by `user_site_assignments` table
- RLS policies check site access for site-scoped resources
- Consolidated views aggregate data across accessible sites

**8. Module Permissions:**

**Module Activation Permissions:**
- Only Owner and Admin can activate modules
- Activation checked via `user_roles` table (role = 'owner' or 'admin')
- Prerequisites checked via `modules.requires_module_id` (see PLS Section C.4)

**Module Data Access:**
- Module data follows same RLS rules as other data
- Module activation grants access to module-specific screens
- Module deactivation restricts access to module screens

**9. Permission Testing:**

**9.1 Test Cases for Core Tables (20+ test cases required):**

**Test Case 1: Owner can access own company data**
- Setup: Create owner user, create company, assign owner to company
- Test: Owner queries company data
- Expected: Returns company data
- RLS Policy: `companies_select_user_access`

**Test Case 2: Staff cannot access other company data**
- Setup: Create staff user, create two companies, assign staff to company A only
- Test: Staff queries company B data
- Expected: Returns empty result (RLS filters out)
- RLS Policy: `companies_select_user_access`

**Test Case 3: Viewer cannot create obligations**
- Setup: Create viewer user, assign to site
- Test: Viewer attempts to INSERT obligation
- Expected: Returns 403 Forbidden (no INSERT policy for viewer)
- RLS Policy: No INSERT policy for viewer role

**Test Case 4: Consultant can only access assigned clients**
- Setup: Create consultant user, create two companies, assign consultant to company A only
- Test: Consultant queries company B data
- Expected: Returns empty result (RLS filters out)
- RLS Policy: `consultant_data_isolation`

**Test Case 5: Staff cannot delete obligations**
- Setup: Create staff user, assign to site, create obligation
- Test: Staff attempts to DELETE obligation
- Expected: Returns 403 Forbidden (no DELETE policy for staff)
- RLS Policy: No DELETE policy for staff role

**Test Case 6: Admin can delete documents**
- Setup: Create admin user, assign to site, create document
- Test: Admin attempts to DELETE document
- Expected: DELETE succeeds
- RLS Policy: `documents_delete_owner_admin_access`

**Test Case 7: Evidence cannot be deleted by any role**
- Setup: Create owner user, assign to site, create evidence
- Test: Owner attempts to DELETE evidence
- Expected: Returns 403 Forbidden (no DELETE policy for any role)
- RLS Policy: No DELETE policy (system archives only)

**Test Case 8: Module 2 data requires module activation**
- Setup: Create owner user, assign to site, Module 2 not activated
- Test: Owner attempts to INSERT parameter
- Expected: Returns 403 Forbidden (module not activated)
- RLS Policy: `parameters_insert_staff_access` (checks module activation)

**Test Case 9: Consultant cannot access unassigned client sites**
- Setup: Create consultant user, assign to company A site 1, company A has site 2
- Test: Consultant queries site 2 data
- Expected: Returns empty result (RLS filters out)
- RLS Policy: Consultant isolation + site access

**Test Case 10: User can only access own notifications**
- Setup: Create two users, create notification for user A
- Test: User B queries notifications
- Expected: Returns only user B's notifications
- RLS Policy: `notifications_select_user_access`

**9.2 Test Cases for Edge Cases (15+ test cases required):**

**Test Case 11: Soft-deleted records access**
- Setup: Create owner user, create company, soft-delete company
- Test: Owner queries soft-deleted company
- Expected: Returns empty result (RLS filters soft-deleted)
- RLS Policy: Add `AND deleted_at IS NULL` condition

**Test Case 12: Nested resource access via parent**
- Setup: Create staff user, assign to site, create document, create obligation linked to document
- Test: Staff queries obligation (via document relationship)
- Expected: Returns obligation (has site access via document)
- RLS Policy: Check site_id on obligation

**Test Case 13: Bulk operations permissions**
- Setup: Create staff user, assign to site
- Test: Staff attempts bulk INSERT of 100 obligations
- Expected: All succeed (if site access granted)
- RLS Policy: Same as single INSERT

**Test Case 14: Time-based access (historical data)**
- Setup: Create staff user, assign to site, create obligation with past deadline
- Test: Staff queries historical obligations
- Expected: Returns all obligations (no time restriction)
- RLS Policy: No time-based filtering

**Test Case 15: Service role bypasses RLS**
- Setup: Use service role JWT (not user JWT)
- Test: Service role queries any data
- Expected: Returns all data (RLS bypassed for service role)
- RLS Policy: Check `auth.role() = 'service_role'`

**9.3 Test Cases for Module-Specific Permissions (10+ test cases required):**

**Test Case 16: Module 2 parameter access requires activation**
- Setup: Create owner user, assign to site, Module 2 not activated
- Test: Owner queries parameters
- Expected: Returns empty result (module not activated)
- RLS Policy: `parameters_select_site_access` + module check

**Test Case 17: Module 3 generator access requires activation**
- Setup: Create owner user, assign to site, Module 3 activated
- Test: Owner queries generators
- Expected: Returns generators (module activated)
- RLS Policy: `generators_select_site_access` + module check

**9.4 Performance Test Cases (5+ test cases required):**

**Test Case 18: RLS policy performance with large dataset**
- Setup: Create 10,000 obligations across 100 sites, assign user to 10 sites
- Test: User queries obligations
- Expected: Returns only 1,000 obligations (10 sites), query completes in < 500ms
- RLS Policy: Requires indexes on `site_id`, `user_site_assignments`

**Test Case 19: Consultant isolation performance**
- Setup: Create consultant assigned to 50 companies, 500 sites total
- Test: Consultant queries obligations
- Expected: Returns only obligations from assigned companies, query completes in < 1s
- RLS Policy: Requires indexes on `company_id`, `user_roles`

**10. RLS Policy Deployment:**

**10.1 Migration Strategy:**

**Migration File Structure:**
```
migrations/
├── 001_enable_rls_on_tables.sql
├── 002_create_rls_policies_core.sql
├── 003_create_rls_policies_module2.sql
├── 004_create_rls_policies_module3.sql
├── 005_create_rls_policies_cross_module.sql
├── 006_create_permission_functions.sql
└── 007_create_rls_indexes.sql
```

**Migration Steps:**
1. Enable RLS on all tables: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. Create RLS policies for each table (SELECT, INSERT, UPDATE, DELETE)
3. Create permission check functions
4. Create indexes for RLS policy performance
5. Test policies in staging environment
6. Deploy to production

**10.2 Policy Versioning:**

**Version Tracking:**
- Track policy changes in `policy_versions` table
- Include policy name, version, SQL, created_at, created_by
- Rollback to previous version if needed

**10.3 Policy Rollback Procedures:**

**Rollback Steps:**
1. Identify problematic policy
2. Disable policy: `DROP POLICY {policy_name} ON {table};`
3. Restore previous version from `policy_versions` table
4. Re-create policy from previous version
5. Test rollback in staging
6. Deploy rollback to production

**10.4 Policy Testing:**

**Unit Tests:**
- Test each RLS policy individually
- Test with different user roles
- Test with different data scenarios

**Integration Tests:**
- Test RLS policies with API endpoints
- Test RLS policies with background jobs
- Test RLS policies with real-time subscriptions

**Performance Tests:**
- Measure RLS overhead (query time with/without RLS)
- Test with large datasets (10,000+ rows)
- Test with complex joins
- Benchmark: RLS should add < 50ms overhead per query

**11. Service Role vs User JWT Handling:**

**11.1 Service Role Usage:**

**When to Use Service Role:**
- Background jobs (document processing, Excel import, monitoring schedules)
- Admin operations (system maintenance, bulk operations)
- Cross-tenant operations (if needed)
- Migration scripts

**Service Role Bypass:**
- Service role JWT bypasses RLS policies
- Use `auth.role() = 'service_role'` check in policies
- Service role should still respect business logic constraints

**11.2 User JWT Usage:**

**When to Use User JWT:**
- User-facing API requests
- Real-time subscriptions
- User-initiated operations
- Onboarding flows

**User JWT RLS Enforcement:**
- All RLS policies apply to user JWT
- Policies check `auth.uid()` for user identity
- Policies check `user_roles` and `user_site_assignments` for access

**12. Edge Cases and Special Scenarios:**

**12.1 Soft Delete Handling:**

**RLS Policy Pattern for Soft Deletes:**
```sql
-- Add deleted_at check to all SELECT policies
CREATE POLICY {table}_select_{scope} ON {table}
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Existing access conditions
  )
);
```

**Who Can See Soft-Deleted Records:**
- Only Owner/Admin can see soft-deleted records (for restore purposes)
- Add separate policy: `{table}_select_deleted_owner_admin`

**Who Can Restore:**
- Only Owner/Admin can restore soft-deleted records
- UPDATE policy: `{table}_update_deleted_owner_admin` (sets `deleted_at = NULL`)

**Who Can Permanently Delete:**
- Only Owner can permanently delete (hard delete)
- Requires separate DELETE policy with `deleted_at IS NOT NULL` check

**12.2 Nested Resource Access:**

**Access via Parent Resource:**
- Obligations accessed via documents: Check `document.site_id` in obligation policy
- Evidence accessed via obligations: Check `obligation.site_id` in evidence policy
- Schedules accessed via obligations: Check `obligation.site_id` in schedule policy

**RLS Policy Pattern:**
```sql
-- Obligations accessible via document relationship
CREATE POLICY obligations_select_via_document ON obligations
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**12.3 Module-Specific Permissions:**

**Module Activation Check:**
- Add module activation check to Module 2/3 table policies
- Pattern: `AND is_module_activated(company_id, module_id)`

**RLS Policy Pattern:**
```sql
CREATE POLICY parameters_select_site_module ON parameters
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND is_active = TRUE
  )
);
```

**12.4 Time-Based Permissions:**

**Historical Data Access:**
- No time restrictions on historical data
- Users can access all historical records (within site/company access)

**Future-Dated Records:**
- No restrictions on future-dated records
- Users can create obligations with future deadlines

**12.5 Bulk Operations:**

**Bulk Create:**
- Same RLS policies apply to bulk INSERT
- Each row checked individually against RLS policies
- Partial success: Some rows succeed, some fail (based on RLS)

**Bulk Update:**
- Same RLS policies apply to bulk UPDATE
- Each row checked individually against RLS policies

**Bulk Delete:**
- Same RLS policies apply to bulk DELETE
- Each row checked individually against RLS policies

**13. Performance Considerations:**

**13.1 Index Requirements:**

**Required Indexes for RLS Performance:**
```sql
-- Indexes for user_roles lookups
CREATE INDEX idx_user_roles_user_id_company_id ON user_roles(user_id, company_id);
CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);

-- Indexes for user_site_assignments lookups
CREATE INDEX idx_user_site_assignments_user_id_site_id ON user_site_assignments(user_id, site_id);
CREATE INDEX idx_user_site_assignments_user_id_role ON user_site_assignments(user_id, role);

-- Indexes for module_activations lookups
CREATE INDEX idx_module_activations_company_id_module_id ON module_activations(company_id, module_id) WHERE is_active = TRUE;

-- Indexes for company_id and site_id on all tables
CREATE INDEX idx_{table}_company_id ON {table}(company_id);
CREATE INDEX idx_{table}_site_id ON {table}(site_id);
```

**13.2 Query Optimization:**

**RLS Policy Optimization:**
- Use EXISTS subqueries (faster than IN subqueries)
- Use indexed columns in policy conditions
- Avoid complex joins in policy conditions
- Cache permission checks where possible

**13.3 Caching Strategy:**

**Permission Check Caching:**
- Cache company access checks (TTL: 5 minutes)
- Cache site access checks (TTL: 5 minutes)
- Cache role checks (TTL: 5 minutes)
- Invalidate cache on role/site assignment changes

**14. TypeScript Interfaces:**

**14.1 Permission Check Interfaces:**

```typescript
interface PermissionCheckRequest {
  resource_type: string;
  resource_id: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
}

interface PermissionCheckResponse {
  has_permission: boolean;
  reason?: string;
  role?: string;
  company_access: boolean;
  site_access: boolean;
  module_activated?: boolean;
}

interface RolePermission {
  role: 'owner' | 'admin' | 'staff' | 'viewer' | 'consultant';
  entity_type: string;
  operations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE')[];
}
```

**14.2 RLS Policy Configuration Interface:**

```typescript
interface RLSPolicyConfig {
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  policy_name: string;
  using_clause: string;
  with_check_clause?: string;
  roles?: string[];
}
```

**Feeds:**
→ (No dependencies — final security layer)

---

## **2.9 UI/UX Design System** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ User Workflow Maps (1.3)
→ Frontend Routes (2.6)
→ Onboarding Flow (2.7)

**Document Format:**
- Markdown format with clear sections and subsections
- Include design tokens (colors, typography, spacing)
- Include component API specifications (props, events, slots)
- Include component examples (code snippets)
- Include accessibility guidelines (WCAG compliance)
- Include responsive breakpoints
- Be specific and detailed—this is the design system implementation blueprint
- Target: 10,000-12,000 words (comprehensive design system)

**What Cursor Must Create:**

This document defines the complete UI/UX design system. It must include:

**1. Design Tokens:**

**Color Palette:**
- **Primary Accent Color:** #026A67 (Industrial Deep Teal)
  - **Primary Dark:** #014D4A (darker teal variant for hover states, active states)
  - **Primary Light:** #039A96 (lighter teal variant for backgrounds, highlights)
- **Enterprise Neutrals:**
  - **Dark Charcoal:** #101314 (header, navigation, power sections, dark backgrounds)
  - **Soft Slate:** #E2E6E7 (panels, backgrounds, subtle borders)
  - **White:** #FFFFFF (content backgrounds, cards)
  - **Black:** #000000 (text, icons)
- **Status / Semantic Colors:**
  - **Success:** #1E7A50 (compliant status, success actions, positive indicators)
  - **Warning:** #CB7C00 (at risk, warnings, caution indicators)
  - **Danger:** #B13434 (non-compliant, errors, critical alerts)
  - **Info:** #026A67 (information - uses primary teal)
- **Text Colors:**
  - **Text Primary:** #101314 (Dark Charcoal - main text)
  - **Text Secondary:** #6B7280 (medium gray - secondary text)
  - **Text Tertiary:** #9CA3AF (light gray - tertiary text)
  - **Text Disabled:** #D1D5DB (disabled gray - disabled text)
- **Background Colors:**
  - **Background Primary:** #FFFFFF (White - main content areas)
  - **Background Secondary:** #E2E6E7 (Soft Slate - panels, cards)
  - **Background Tertiary:** #F9FAFB (very light gray - subtle backgrounds)
  - **Background Dark:** #101314 (Dark Charcoal - dark mode, headers)

**Typography Scale:**
- **Font Family:** System font stack (Inter, -apple-system, BlinkMacSystemFont, etc.)
- **Font Sizes:** xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px)
- **Line Heights:** Tight (1.25), Normal (1.5), Relaxed (1.75)
- **Font Weights:** Light (300), Normal (400), Medium (500), Semibold (600), Bold (700)
- **Headings:** h1 (3xl, bold), h2 (2xl, semibold), h3 (xl, semibold), h4 (lg, medium), h5 (base, medium), h6 (sm, medium)

**Spacing Scale:**
- **Spacing Values:** 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)
- **Margin/Padding:** Use spacing scale consistently
- **Gap:** Use spacing scale for flex/grid gaps

**Border Radius:**
- **Values:** None (0), sm (2px), base (4px), md (6px), lg (8px), xl (12px), 2xl (16px), full (9999px)
- **Usage:** Buttons (md), Cards (lg), Modals (xl), Inputs (base)

**Shadows:**
- **Values:** sm (subtle), base (default), md (elevated), lg (high), xl (very high)
- **Usage:** Cards (base), Modals (lg), Dropdowns (sm)

**Breakpoints:**
- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md)
- **Desktop:** 1024px - 1280px (lg)
- **Large Desktop:** > 1280px (xl)

**2. Component Specifications:**

**A. Buttons:**

**Button Variants:**
- Primary (solid, brand color)
- Secondary (outline, secondary color)
- Danger (solid, red)
- Ghost (transparent, hover background)
- Link (text only, underline on hover)

**Button Sizes:**
- Small (sm): Height 32px, padding 8px 16px, text sm
- Medium (md): Height 40px, padding 12px 24px, text base
- Large (lg): Height 48px, padding 16px 32px, text lg

**Button States:**
- Default: Normal appearance
- Hover: Slight darken/lighten, cursor pointer
- Active: Pressed state (slight scale down)
- Disabled: Opacity 50%, cursor not-allowed, no interactions
- Loading: Spinner icon, disabled state

**Button Component API:**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**B. Forms:**

**Input Fields:**
- **Types:** Text, Email, Password, Number, Date, Time, Textarea, Select, File Upload

**File Upload Components:**
- **Standard File Upload:** Single file, drag-drop, click to browse
- **Excel File Upload:** Specialized component for Excel/CSV import
  - Accepts: .xlsx, .xls, .csv
  - File size limit: 10MB
  - Row limit: 10,000 rows
  - Visual: Excel icon, file type indicator
  - Validation: File format validation, size validation
  - Progress: Upload progress bar, processing indicator
- **Bulk File Upload:** Multiple files, batch processing
- **File Preview:** Show file details (name, size, type) before upload

**Excel Import Components:**
- **ExcelImportDropzone:** Drag-drop zone for Excel files
  - Visual: Excel icon, "Drop Excel file here" text
  - Accepts: .xlsx, .xls, .csv
  - Validation feedback: Show error if invalid format
- **ImportPreview:** Preview table showing valid rows, errors, warnings
  - Columns: Row number, Status (valid/error/warning), Data preview, Error message
  - Actions: Edit errors, Skip errors, Confirm import
- **ColumnMappingHelper:** Help users map Excel columns to system fields
  - Show expected columns: permit_number, obligation_title, frequency, deadline_date
  - Auto-detect column mapping (fuzzy match column names)
  - Manual mapping: Dropdown to select system field for each Excel column
- **ImportOptions:** Checkboxes for import options
  - Create missing sites
  - Create missing permits
  - Skip duplicates
- **ImportProgress:** Progress indicator during import processing
  - Progress bar: Upload → Validation → Processing → Complete
  - Status messages: "Uploading...", "Validating...", "Processing...", "Complete"
- **ImportSuccess:** Success message after import
  - Show: Success count, Error count (if any), Link to view obligations
  - Actions: View obligations, Import another file

**Component API:**
```typescript
interface ExcelImportDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[]; // ['.xlsx', '.xls', '.csv']
  maxSize: number; // 10MB
  maxRows: number; // 10,000
  disabled?: boolean;
}

interface ImportPreviewProps {
  importId: string;
  validRows: ImportRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  onConfirm: () => void;
  onEdit: (rowIndex: number) => void;
  onSkip: (rowIndex: number) => void;
}

interface ImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  errors?: string[];
  warnings?: string[];
}
```
- **States:** Default, Focus, Error, Disabled, Read-only
- **Validation:** Error message display, success indicator
- **Accessibility:** Labels, ARIA attributes, keyboard navigation

**Input Component API:**
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'time';
  label: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}
```

**Dropdowns:**
- **Types:** Single select, Multi-select, Searchable
- **States:** Default, Open, Selected, Disabled
- **Accessibility:** Keyboard navigation (arrow keys, enter), ARIA attributes

**File Uploads:**
- **Types:** Single file, Multiple files, Drag-drop
- **States:** Default, Dragging, Uploading, Success, Error
- **Mobile:** Camera integration for photo capture

**C. Dashboards:**

**Traffic Light Status Indicators:**
- **Green (Compliant):** All obligations met, no overdue items
- **Yellow (At Risk):** Upcoming deadlines (7-3 days), missing evidence
- **Red (Non-Compliant):** Overdue obligations, missing evidence past grace period

**Obligation Lists:**
- **Table View:** Sortable columns, filterable rows, pagination
- **Card View:** Card layout with key information
- **Status Indicators:** Color-coded badges (green/yellow/red)
- **Edit Controls:** Inline edit, modal edit, bulk actions

**Deadline Calendars:**
- **Month View:** Calendar grid with deadline indicators
- **Week View:** Week timeline with deadlines
- **List View:** Chronological list of deadlines

**D. Evidence Cards:**

**File Preview:**
- **Image Files:** Thumbnail preview
- **PDF Files:** PDF preview (first page thumbnail)
- **Other Files:** File type icon

**Linking Interface:**
- **Obligation Selector:** Searchable dropdown or modal
- **Link Confirmation:** Show linked obligation details
- **Unlink Option:** Remove link with confirmation

**Upload Status:**
- **Uploading:** Progress bar, percentage
- **Success:** Success icon, completion message
- **Error:** Error icon, error message, retry button

**E. Audit Pack View:**

**Preview:**
- **PDF Preview:** Embedded PDF viewer
- **Page Navigation:** Previous/next page buttons
- **Zoom Controls:** Zoom in/out, fit to width/height

**Download:**
- **Download Button:** Prominent CTA button
- **Download Status:** Progress indicator for large files
- **Download History:** Track download events

**Generation Status:**
- **Pending:** "Generating..." message, progress indicator
- **Complete:** "Ready" message, download button
- **Error:** Error message, retry button

**3. Layout System:**

**Grid System:**
- **12-Column Grid:** Responsive grid system
- **Breakpoints:** Mobile (1 column), Tablet (2-3 columns), Desktop (3-4 columns)
- **Gutters:** Consistent spacing between columns

**Container Widths:**
- **Mobile:** Full width (with padding)
- **Tablet:** Max width 768px (centered)
- **Desktop:** Max width 1024px (centered)
- **Large Desktop:** Max width 1280px (centered)

**Layout Components:**
- **Header:** Navigation header with logo, menu, user profile
- **Sidebar:** Navigation sidebar (collapsible on mobile)
- **Footer:** Footer with links, copyright
- **Main Content:** Main content area with padding

**4. Complete Navigation System Specifications:**

**A. Top Navigation Bar (Header):**

**Header Structure:**
- **Background:** Dark Charcoal (#101314) - Procore-inspired dark header
- **Height:** 64px (desktop), 56px (mobile)
- **Layout:** Horizontal flex layout with logo, navigation, search, user menu

**Logo Placement:**
- **Position:** Left side of header
- **Size:** 40px height (desktop), 32px (mobile)
- **Spacing:** 16px padding from left edge
- **Logo Variants:** Light logo on dark background, dark logo on light background (for light mode)
- **Click Action:** Navigate to dashboard

**Navigation Links:**
- **Position:** Center-left of header (after logo)
- **Items:** Dashboard, Sites, Documents, Obligations, Evidence, Modules, Audit Packs
- **Styling:** White text (#FFFFFF), hover: Primary Teal (#026A67)
- **Active State:** Primary Teal underline, bold font weight
- **Spacing:** 24px between items (desktop), hidden on mobile (moved to sidebar)

**Site Switcher Component:**
- **Position:** After navigation links
- **Design:** Dropdown button showing current site name
- **Dropdown:** Site list with search, current site highlighted
- **Styling:** White text, Primary Teal hover, dropdown with white background
- **Mobile:** Moved to sidebar
- **Component API:**
```typescript
interface SiteSwitcherProps {
  currentSiteId: string;
  sites: Site[];
  onSiteChange: (siteId: string) => void;
}
```

**Search Bar:**
- **Position:** Center-right of header
- **Design:** Search input with search icon, expandable on focus
- **Width:** 240px (collapsed), 400px (expanded)
- **Mobile:** Hidden (moved to mobile search overlay)
- **Features:** Autocomplete, recent searches, keyboard shortcuts (Cmd/Ctrl+K)

**Notifications Bell:**
- **Position:** Right side, before user menu
- **Design:** Bell icon with badge count (red badge if unread)
- **Badge:** Red circle (#B13434) with white count, positioned top-right
- **Dropdown:** Notification list dropdown (max 10 items, "View All" link)
- **Mobile:** Moved to mobile menu

**User Profile Menu:**
- **Position:** Rightmost in header
- **Design:** Avatar circle with dropdown menu
- **Avatar:** User initials or profile image, 32px diameter
- **Dropdown Menu Items:** Profile, Settings, Help, Logout
- **Styling:** White background dropdown, hover states, divider between sections
- **Mobile:** Moved to mobile menu

**B. Sidebar Navigation:**

**Sidebar Structure:**
- **Background:** Dark Charcoal (#101314) - Procore-inspired dark sidebar
- **Width:** 256px (expanded), 64px (collapsed)
- **Height:** Full viewport height minus header
- **Position:** Fixed left, below header
- **Z-index:** 100 (below modals, above content)

**Sidebar Collapse:**
- **Collapse Button:** Top-right of sidebar, icon-only button
- **Collapsed State:** Show icons only, tooltip on hover
- **Animation:** Smooth 200ms transition
- **Mobile:** Always collapsed (drawer overlay)

**Navigation Menu Items:**
- **Layout:** Vertical list, icon + text (expanded), icon only (collapsed)
- **Spacing:** 8px between items
- **Padding:** 12px vertical, 16px horizontal
- **Active State:** Primary Teal background (#026A67), white text, left border (4px Primary Teal)
- **Hover State:** Light gray background (#374151), white text
- **Icon Size:** 20px × 20px
- **Text:** White (#FFFFFF), font size 14px, font weight 500

**Nested Navigation:**
- **Expandable Sections:** Chevron icon indicates expandable
- **Sub-menu Items:** Indented 24px, smaller font (13px)
- **Animation:** Smooth expand/collapse (200ms)
- **Active Sub-item:** Primary Teal text, bold font weight

**Module-Specific Navigation:**
- **Conditional Display:** Show Module 2/3 items only if module activated
- **Module Indicators:** Badge showing "Module 2" or "Module 3" next to item
- **Module Items:** Parameters (Module 2), Lab Results (Module 2), Generators (Module 3), Run Hours (Module 3)

**Role-Based Navigation:**
- **Owner/Admin:** All menu items visible
- **Staff:** Hide "User Management", "System Settings"
- **Viewer:** Show read-only items only (no create/edit actions)
- **Consultant:** Show client-specific items only

**Mobile Sidebar (Drawer):**
- **Behavior:** Overlay drawer from left, dark backdrop
- **Width:** 280px (80% of screen width, max 320px)
- **Animation:** Slide in from left (300ms), fade backdrop
- **Close:** Swipe left, tap backdrop, or close button
- **Touch Gestures:** Swipe left to close

**C. Breadcrumb Navigation:**

**Breadcrumb Component:**
- **Position:** Below header, above page title
- **Background:** Transparent or light gray (#F9FAFB)
- **Padding:** 12px vertical, 16px horizontal
- **Font Size:** 14px
- **Separator:** Chevron icon (>) or slash (/), gray color (#9CA3AF)

**Breadcrumb Structure:**
- **Format:** Home > Sites > [Site Name] > [Page Name]
- **Clickable:** All items except current page
- **Hover:** Underline on hover
- **Current Page:** Bold font weight, Primary Teal color (#026A67)

**When to Show:**
- **Show:** Detail pages, nested routes (3+ levels deep)
- **Hide:** Top-level pages (dashboard, sites list)
- **Mobile:** Show if space allows, otherwise hide

**Breadcrumb Component API:**
```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
}
```

**D. Mobile Navigation:**

**Bottom Navigation Bar:**
- **Position:** Fixed bottom, full width
- **Height:** 64px
- **Background:** Dark Charcoal (#101314)
- **Border:** Top border, 1px solid #374151
- **Items:** 4-5 primary actions (Dashboard, Sites, Documents, Obligations, Profile)
- **Layout:** Icon + label, centered
- **Active State:** Primary Teal icon and text
- **Inactive State:** Gray icon and text (#9CA3AF)
- **Touch Targets:** Minimum 44px × 44px

**Hamburger Menu:**
- **Position:** Left side of mobile header
- **Icon:** Three horizontal lines, white color
- **Size:** 24px × 24px
- **Animation:** Transform to X on open (rotate 90deg)
- **Touch Target:** 44px × 44px

**Mobile Search Overlay:**
- **Trigger:** Search icon in mobile header
- **Behavior:** Full-screen overlay, slide down animation
- **Components:** Search input, recent searches, suggestions
- **Close:** X button, swipe down, or tap backdrop

**E. Module Navigation:**

**Module Switcher:**
- **Position:** In sidebar, below main navigation
- **Design:** Dropdown or expandable section
- **Items:** Module 1 (Core), Module 2 (Trade Effluent), Module 3 (MCPD/Generators)
- **Active Module:** Highlighted with Primary Teal
- **Inactive Modules:** Grayed out, show activation prompt

**Module Activation Prompts:**
- **Design:** Card with module info, "Activate" button
- **Position:** In sidebar or as inline prompt
- **Styling:** White background card, Primary Teal CTA button

**F. Role-Based Navigation:**

**Navigation Menu Variations:**
- **Owner:** All items visible (Dashboard, Sites, Documents, Obligations, Evidence, Modules, Audit Packs, Users, Settings)
- **Admin:** Same as Owner except "System Settings" (read-only)
- **Staff:** Hide "User Management", "System Settings", "Module Activation"
- **Viewer:** Read-only items only (Dashboard, Sites, Documents, Obligations, Evidence, Audit Packs - view only)
- **Consultant:** Client-specific items (Dashboard, Documents, Obligations, Evidence, Audit Packs - for assigned clients only)

**Permission-Based UI:**
- **Hide/Show Logic:** Check user role before rendering menu items
- **Disabled State:** Show item but disabled (grayed out) if no permission
- **Tooltip:** Show "Requires [Role] permission" on hover if disabled

**5. Screen-Specific Component Specifications:**

**A. Dashboard Screens:**

**Dashboard Layout:**
- **Grid System:** 12-column grid, responsive
- **Widget Spacing:** 24px gap between widgets
- **Mobile:** Single column, stacked widgets

**Traffic Light Status Widget:**
- **Size:** Large card (full width or 6 columns)
- **Design:** Three large circles (Green/Yellow/Red) with status text
- **Green (Compliant):** #1E7A50, "All Compliant" text
- **Yellow (At Risk):** #CB7C00, "At Risk" text
- **Red (Non-Compliant):** #B13434, "Non-Compliant" text
- **Click Action:** Filter obligations by status
- **Mobile:** Stacked vertically, smaller circles

**Obligation Summary Cards:**
- **Layout:** Grid of 3-4 cards
- **Card Design:** White background (#FFFFFF), shadow (base), rounded corners (lg)
- **Content:** Title, count, trend indicator (↑↓), link to detail
- **Hover:** Slight elevation (shadow md), cursor pointer
- **Mobile:** Single column, full width

**Upcoming Deadlines Widget:**
- **Design:** List of deadlines, sorted by date
- **Items:** Deadline date, obligation title, days remaining, status badge
- **Urgency Colors:** Red (< 3 days), Yellow (3-7 days), Green (> 7 days)
- **Click Action:** Navigate to obligation detail
- **Mobile:** Card layout, scrollable

**Evidence Status Widget:**
- **Design:** Progress bar showing evidence completion percentage
- **Components:** Progress bar, percentage text, missing evidence count
- **Colors:** Green (complete), Yellow (partial), Red (missing)
- **Click Action:** Navigate to evidence list

**Quick Actions Panel:**
- **Design:** Horizontal row of action buttons
- **Actions:** Upload Document, Add Obligation, Upload Evidence, Generate Audit Pack
- **Styling:** Primary Teal buttons, icon + text
- **Mobile:** Vertical stack, full-width buttons

**B. Document Screens:**

**Document List Table:**
- **Design:** Sortable table with columns (Name, Type, Upload Date, Status, Actions)
- **Row Actions:** View, Edit, Delete (dropdown menu)
- **Sortable Columns:** Click header to sort, show sort indicator (↑↓)
- **Filterable:** Filter by type, status, date range
- **Pagination:** Bottom pagination, 25 items per page
- **Mobile:** Convert to card layout, swipe actions

**Document Card View:**
- **Design:** Grid of cards (3 columns desktop, 2 tablet, 1 mobile)
- **Card Content:** Thumbnail, title, type badge, date, status badge, actions menu
- **Hover:** Elevation increase, show actions
- **Click:** Navigate to document detail

**Document Upload Interface:**
- **Drag-Drop Zone:** Large dropzone, dashed border, Primary Teal on drag
- **File Input:** Hidden file input, click zone to trigger
- **File Preview:** Show selected file name, size, type, remove button
- **Progress Bar:** Upload progress with percentage
- **Mobile:** Full-width dropzone, camera integration

**PDF Viewer Component:**
- **Design:** Embedded PDF viewer with controls
- **Controls:** Zoom in/out, fit to width/height, page navigation
- **Toolbar:** Download, print, fullscreen buttons
- **Mobile:** Full-screen viewer, swipe to navigate pages

**C. Obligation Screens:**

**Obligation List Table:**
- **Design:** Sortable table with columns (Title, Frequency, Deadline, Status, Evidence, Actions)
- **Status Badges:** Green/Yellow/Red traffic light badges
- **Bulk Actions:** Select multiple, bulk edit, bulk delete
- **Filters:** Status, frequency, deadline range, site
- **Mobile:** Card layout, swipe to reveal actions

**Obligation Card View:**
- **Design:** Card with title, frequency, deadline, status badge, evidence count
- **Layout:** Grid (3 columns desktop, 2 tablet, 1 mobile)
- **Hover:** Elevation increase, show quick actions
- **Click:** Navigate to obligation detail

**Deadline Calendar:**
- **Month View:** Calendar grid with deadline indicators (colored dots)
- **Week View:** Week timeline with deadline bars
- **List View:** Chronological list of deadlines
- **Click Deadline:** Navigate to obligation detail
- **Mobile:** List view default, tap to switch views

**D. Evidence Screens:**

**Evidence Upload Interface:**
- **Design:** Drag-drop zone + file picker + camera button
- **Camera Integration:** Direct camera access on mobile, photo capture
- **File Types:** Images, PDFs, documents
- **Preview:** Thumbnail preview before upload
- **Mobile:** Full-screen camera interface

**Evidence Grid View:**
- **Design:** Masonry grid layout (Pinterest-style)
- **Items:** Thumbnail, title, date, linked obligations count
- **Hover:** Show overlay with actions (view, link, delete)
- **Mobile:** 2-column grid

**Evidence List View:**
- **Design:** List with thumbnail, metadata, linked obligations
- **Actions:** View, link to obligation, unlink, delete
- **Mobile:** Single column, touch-optimized

**Evidence Linking Modal:**
- **Design:** Modal with obligation selector (searchable dropdown)
- **Search:** Search obligations by title, filter by site
- **Multi-Select:** Select multiple obligations to link
- **Confirmation:** Show linked obligations before confirming

**E. Module 2 Screens (Trade Effluent):**

**Parameter Management Interface:**
- **Design:** List of parameters with current value, limit, status
- **Form:** Parameter entry form with validation
- **Limit Indicators:** Visual indicator (progress bar) showing limit proximity
- **Exceedance Alerts:** Red alert cards for exceeded limits

**Lab Results Entry:**
- **Design:** Form with parameter selector, value input, date, source
- **CSV Upload:** Bulk entry via CSV upload
- **Validation:** Value must be numeric, date must be valid
- **Mobile:** Stacked form, full-width inputs

**Exceedance Alerts:**
- **Design:** Alert cards with parameter name, exceeded value, limit, date
- **Styling:** Red background (#B13434), white text, urgent styling
- **Actions:** Acknowledge, view details, link to parameter

**F. Module 3 Screens (MCPD/Generators):**

**Generator Management:**
- **Design:** List of generators with name, type, status
- **Form:** Generator creation/edit form
- **Run Hour Tracking:** Show total run hours, last entry date
- **Mobile:** Card layout

**Run Hour Entry:**
- **Design:** Form with generator selector, hours input, date, source
- **Bulk Entry:** Multiple generators, same date
- **Chart Visualization:** Line chart showing run hours over time
- **Mobile:** Full-screen form, simplified chart

**G. Admin Screens:**

**User Management Interface:**
- **Design:** Table of users with name, email, role, sites, actions
- **Role Assignment:** Dropdown to change role, confirmation modal
- **Site Assignment:** Multi-select to assign sites
- **Filters:** Filter by role, site, company
- **Mobile:** Card layout, stacked actions

**Site Management:**
- **Design:** List of sites with name, address, regulator, actions
- **Creation Form:** Site creation form with validation
- **Settings:** Site-specific settings (modules, users, permissions)
- **Mobile:** Card layout, full-screen forms

**6. Mobile-First Responsive Specifications:**

**A. Mobile Navigation:**

**Mobile Header:**
- **Height:** 56px
- **Components:** Hamburger menu (left), logo (center), notifications/user menu (right)
- **Background:** Dark Charcoal (#101314)
- **Sticky:** Fixed top, scrolls with content

**Mobile Sidebar Drawer:**
- **Width:** 280px (80% screen width, max 320px)
- **Animation:** Slide in from left (300ms ease-out)
- **Backdrop:** Dark overlay (rgba(0,0,0,0.5)), fade in (200ms)
- **Close:** Swipe left, tap backdrop, or close button
- **Touch Gestures:** Swipe left to close, swipe right to open

**Bottom Navigation Bar:**
- **Position:** Fixed bottom, full width
- **Height:** 64px (including safe area on iOS)
- **Items:** 4-5 primary actions (Dashboard, Sites, Documents, Obligations, Profile)
- **Layout:** Icon (24px) + label (12px font), centered
- **Active State:** Primary Teal (#026A67) icon and text
- **Inactive State:** Gray (#9CA3AF) icon and text
- **Touch Targets:** Minimum 44px × 44px per item

**B. Mobile Screen Adaptations:**

**Table → Card Conversion:**
- **Trigger:** Screen width < 768px
- **Conversion:** Each table row becomes a card
- **Card Layout:** Vertical stack of fields, actions at bottom
- **Swipe Actions:** Swipe left to reveal actions (edit, delete)

**Form Layouts:**
- **Mobile:** Single column, full-width inputs
- **Stacking:** Labels above inputs, buttons full-width
- **Spacing:** 16px vertical spacing between fields
- **Keyboard:** Inputs adjust for virtual keyboard

**Modal Behavior:**
- **Mobile:** Full-screen modals (not centered)
- **Close:** Swipe down to dismiss, or close button
- **Animation:** Slide up from bottom (300ms)
- **Backdrop:** Full-screen dark overlay

**Touch Gestures:**
- **Swipe Left:** Delete action (on list items)
- **Swipe Right:** Navigate back (on detail pages)
- **Pull-to-Refresh:** Refresh data (on list pages)
- **Long-Press:** Context menu (on cards, list items)

**C. Mobile-Specific Components:**

**Mobile Search Overlay:**
- **Design:** Full-screen overlay, slide down animation
- **Components:** Search input, recent searches, suggestions
- **Close:** Swipe down, tap backdrop, or X button
- **Keyboard:** Auto-focus input, show keyboard

**Mobile Filters:**
- **Design:** Bottom sheet filter panel
- **Components:** Filter options, apply/cancel buttons
- **Animation:** Slide up from bottom (300ms)
- **Filter Chips:** Show active filters as chips above list

**Mobile Actions (FAB):**
- **Design:** Floating action button, bottom-right
- **Size:** 56px × 56px
- **Icon:** Plus icon, white color
- **Actions:** Primary action (upload, create)
- **Position:** Above bottom navigation bar

**Mobile Camera:**
- **Design:** Full-screen camera interface
- **Components:** Camera viewfinder, capture button, gallery button
- **Features:** Flash toggle, camera flip (front/back)
- **After Capture:** Preview, retake, use photo

**D. Responsive Breakpoint Details:**

**Breakpoint: Mobile (< 640px):**
- **Layout:** Single column, full width
- **Navigation:** Bottom nav, hamburger menu
- **Tables:** Card layout
- **Modals:** Full-screen
- **Forms:** Stacked, full-width inputs
- **Spacing:** 16px padding

**Breakpoint: Tablet (640px - 1024px):**
- **Layout:** 2-column grid (where applicable)
- **Navigation:** Sidebar (collapsible), top header
- **Tables:** Table layout (scrollable)
- **Modals:** Centered, max width 600px
- **Forms:** 2-column (where applicable)
- **Spacing:** 24px padding

**Breakpoint: Desktop (1024px - 1280px):**
- **Layout:** 3-4 column grid
- **Navigation:** Full sidebar, top header
- **Tables:** Full table layout
- **Modals:** Centered, max width 800px
- **Forms:** 2-column layout
- **Spacing:** 32px padding

**Breakpoint: Large Desktop (> 1280px):**
- **Layout:** 4+ column grid, max width 1280px (centered)
- **Navigation:** Full sidebar, top header
- **Tables:** Full table layout
- **Modals:** Centered, max width 1000px
- **Forms:** 2-column layout
- **Spacing:** 40px padding

**7. Advanced UI/UX Patterns:**

**A. Data Display Components:**

**Table Component:**
- **Design:** Sortable, filterable, paginated table
- **Features:** Row selection (checkbox), bulk actions, column resizing
- **Sorting:** Click header to sort, show sort indicator (↑↓)
- **Filtering:** Column filters (dropdown, text input, date range)
- **Pagination:** Bottom pagination, page size selector
- **Mobile:** Card layout, swipe actions
- **Component API:**
```typescript
interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  onRowClick?: (row: T) => void;
}
```

**Card Component:**
- **Variants:** Default (white background), Elevated (shadow), Outlined (border)
- **Hover States:** Elevation increase, cursor pointer
- **Click Behavior:** Navigate to detail or trigger action
- **Content:** Header, body, footer, actions
- **Mobile:** Full-width, stacked content

**List Component:**
- **Variants:** Default, Bordered (border between items), Striped (alternating background)
- **Item Spacing:** 8px between items
- **Actions:** Inline actions (right side), hover to reveal
- **Mobile:** Touch-optimized, swipe actions

**Grid Component:**
- **Layout:** Responsive grid, auto-fit columns
- **Gap:** 24px between items
- **Masonry Option:** Pinterest-style masonry layout
- **Mobile:** 1-2 columns

**B. Data Visualization:**

**Chart Components:**
- **Types:** Line chart, Bar chart, Pie chart, Area chart
- **Styling:** Primary Teal (#026A67) for primary data, gray for secondary
- **Interactive:** Hover to show tooltip, click to drill down
- **Responsive:** Auto-resize on window resize
- **Mobile:** Simplified charts, touch interactions

**Progress Indicators:**
- **Progress Bar:** Horizontal bar, percentage display
- **Circular Progress:** Circular progress indicator
- **Step Indicators:** Multi-step progress (onboarding, forms)
- **Colors:** Green (complete), Yellow (in progress), Red (error)

**Status Indicators:**
- **Traffic Lights:** Large circles (Green/Yellow/Red)
- **Badges:** Small colored badges with text
- **Icons:** Status icons (checkmark, warning, error)
- **Color Coding:** Green (#1E7A50), Yellow (#CB7C00), Red (#B13434)

**Timeline Component:**
- **Design:** Vertical timeline with events/deadlines
- **Items:** Date, title, description, status badge
- **Mobile:** Horizontal scrollable timeline

**C. Interactive Elements:**

**Dropdown Menus:**
- **Design:** Dropdown with menu items, hover states
- **Positioning:** Auto-position (above/below, left/right)
- **Keyboard Navigation:** Arrow keys, Enter to select, Escape to close
- **Mobile:** Full-screen overlay menu

**Context Menus:**
- **Design:** Right-click menu, action menu
- **Positioning:** Positioned at cursor/click point
- **Items:** Action items with icons, dividers between sections
- **Mobile:** Long-press to show, bottom sheet style

**Tooltips:**
- **Design:** Small popover with text, arrow pointer
- **Positioning:** Auto-position (top/bottom/left/right)
- **Delay:** 300ms delay before showing
- **Accessibility:** ARIA-describedby, keyboard accessible

**Popovers:**
- **Design:** Larger popover with content, close button
- **Positioning:** Positioned relative to trigger
- **Dismiss:** Click outside, Escape key, close button
- **Mobile:** Full-screen overlay

**Modals:**
- **Sizes:** Small (400px), Medium (600px), Large (800px), XL (1000px), Fullscreen
- **Overlay:** Dark backdrop (rgba(0,0,0,0.5))
- **Focus Trap:** Trap focus within modal
- **Animation:** Fade in backdrop, scale in modal (200ms)
- **Mobile:** Full-screen modals

**Drawers:**
- **Side Drawers:** Slide in from left/right (300px width)
- **Bottom Drawers:** Slide up from bottom (mobile)
- **Animation:** Slide animation (300ms)
- **Backdrop:** Dark overlay, tap to close

**D. Feedback & Notifications:**

**Toast Notifications:**
- **Design:** Small notification card, slide in from top-right
- **Types:** Success (green), Warning (yellow), Error (red), Info (teal)
- **Positioning:** Stack vertically, auto-dismiss after 5 seconds
- **Actions:** Dismiss button, action button (optional)
- **Mobile:** Full-width, bottom position

**Alert Banners:**
- **Design:** Full-width banner at top of page
- **Variants:** Success, Warning, Error, Info
- **Dismissible:** X button to dismiss
- **Persistent:** Can be persistent or dismissible

**Loading States:**
- **Skeleton Loaders:** Gray placeholder boxes, shimmer animation
- **Spinners:** Circular spinner, Primary Teal color
- **Progress Indicators:** Progress bar with percentage
- **Placement:** Center of content area or inline

**Empty States:**
- **Design:** Illustration, message, CTA button
- **Illustrations:** Custom illustrations or icons
- **Messaging:** Clear, helpful message
- **CTAs:** Primary action button (e.g., "Upload Document")

**Error States:**
- **Design:** Error illustration, error message, recovery actions
- **Illustrations:** Error icon or illustration
- **Messaging:** Clear error message, helpful suggestions
- **Actions:** Retry button, contact support link

**E. Form Patterns:**

**Form Layouts:**
- **Single Column:** All fields stacked vertically (mobile default)
- **Two Column:** Fields side-by-side (desktop, wide forms)
- **Responsive Stacking:** Two column → single column on mobile
- **Field Grouping:** Group related fields with section headers

**Field Grouping:**
- **Section Headers:** Bold header, 24px spacing above
- **Field Spacing:** 16px vertical spacing between fields
- **Grouping Logic:** Group by function (e.g., "Basic Information", "Advanced Options")

**Validation Display:**
- **Inline Errors:** Error message below field, red text (#B13434)
- **Field-Level Errors:** Show error icon, red border
- **Form-Level Errors:** Error summary at top of form
- **Success Indicators:** Green checkmark for valid fields

**Form Actions:**
- **Button Placement:** Primary action right, secondary left
- **Mobile:** Stacked buttons, primary on top, full-width
- **Loading State:** Disable form, show loading spinner on submit button

**F. Search & Filter:**

**Search Interface:**
- **Design:** Search input with search icon, clear button
- **Autocomplete:** Show suggestions as user types
- **Recent Searches:** Show recent searches below input
- **Keyboard:** Cmd/Ctrl+K to open search, Escape to close

**Filter Interface:**
- **Filter Panel:** Side panel or bottom sheet (mobile)
- **Filter Types:** Dropdown, checkbox, date range, text input
- **Active Filters:** Show as chips above content
- **Clear Filters:** "Clear All" button

**Sort Interface:**
- **Sort Dropdown:** Dropdown with sort options
- **Multi-Column Sort:** Allow sorting by multiple columns
- **Sort Indicators:** Show ↑↓ arrows in table headers
- **Mobile:** Sort button opens bottom sheet

**8. Procore-Inspired Design Elements:**

**A. Dark Sidebar/Header:**

**Dark Sidebar Specifications:**
- **Background:** Dark Charcoal (#101314)
- **Width:** 256px (expanded), 64px (collapsed)
- **Text Color:** White (#FFFFFF)
- **Hover State:** Light gray (#374151)
- **Active State:** Primary Teal (#026A67)
- **Border:** Right border, 1px solid #374151

**Dark Header Specifications:**
- **Background:** Dark Charcoal (#101314)
- **Height:** 64px
- **Text Color:** White (#FFFFFF)
- **Logo:** Light logo variant
- **Border:** Bottom border, 1px solid #374151

**B. Content Cards:**

**White Cards on Dark Background:**
- **Card Background:** White (#FFFFFF)
- **Shadow:** Base shadow (subtle elevation)
- **Border Radius:** Large (lg - 8px)
- **Padding:** 24px
- **Contrast:** High contrast against dark background

**C. Large Headers:**

**Header Specifications:**
- **Size:** text-3xl (30px) for page titles, font-bold
- **Color:** White on dark backgrounds, Dark Charcoal (#101314) on light
- **Spacing:** 32px margin below header
- **Status Prominence:** Large status indicators, prominent placement

**D. Button Styles:**

**Primary Button:**
- **Background:** Primary Teal (#026A67)
- **Text:** White, font-semibold
- **Hover:** Darker teal (#014D4A)
- **Size:** Medium (40px height) default, Large (48px) for CTAs

**Secondary Button (Outline Style):**
- **Background:** Transparent
- **Border:** 2px solid Dark Charcoal (#101314)
- **Text:** Dark Charcoal (#101314)
- **Hover:** Dark Charcoal background, white text
- **Styling:** Bold, confident, not "app cute"

**E. Logo Usage:**

**Logo Specifications:**
- **Placement:** Left side of header, 16px padding
- **Size:** 40px height (desktop), 32px (mobile)
- **Variants:** Light logo (white) on dark background, dark logo on light background
- **No Gradient:** Flat color only, no gradients
- **Wordmark:** Black wordmark + Teal motif (subtle eco-technology tie)

**9. Detailed Accessibility Specifications:**

**A. Keyboard Navigation:**

**Complete Keyboard Shortcuts:**
- **Tab:** Move to next interactive element
- **Shift+Tab:** Move to previous interactive element
- **Enter/Space:** Activate button/link
- **Arrow Keys:** Navigate dropdowns, lists, tables
- **Escape:** Close modals, dropdowns, menus
- **Cmd/Ctrl+K:** Open search
- **Cmd/Ctrl+/:** Show keyboard shortcuts help

**Keyboard Navigation Patterns:**
- **Tables:** Arrow keys to navigate cells, Enter to activate
- **Dropdowns:** Arrow keys to navigate options, Enter to select
- **Modals:** Tab cycles through elements, Escape closes
- **Menus:** Arrow keys to navigate, Enter to select

**Focus Management:**
- **Focus Indicators:** 2px solid Primary Teal outline, visible on all interactive elements
- **Focus Trap:** Trap focus within modals, drawers
- **Focus Restoration:** Restore focus to trigger after modal closes
- **Skip Links:** Skip to main content link (visible on focus)

**B. Screen Reader Support:**

**ARIA Patterns:**
- **Labels:** All interactive elements have descriptive labels
- **Roles:** Semantic roles (button, link, navigation, main, etc.)
- **Descriptions:** aria-describedby for additional context
- **Live Regions:** aria-live for dynamic content announcements
- **Landmarks:** Navigation, main, complementary landmarks

**Live Regions:**
- **Usage:** Announce form errors, success messages, loading states
- **Politeness:** "polite" for non-urgent, "assertive" for urgent
- **Examples:** "Form submitted successfully", "Error: Email is required"

**C. Visual Accessibility:**

**Color Contrast Specifications:**
- **Text on White:** Dark Charcoal (#101314) - 16.7:1 contrast ratio ✅
- **Text on Dark:** White (#FFFFFF) - 16.7:1 contrast ratio ✅
- **Primary Teal on White:** #026A67 - 4.8:1 contrast ratio ✅
- **Primary Teal on Dark:** #026A67 - 3.2:1 contrast ratio ✅
- **Error Red on White:** #B13434 - 4.9:1 contrast ratio ✅
- **Minimum:** 4.5:1 for text, 3:1 for UI components (WCAG AA)

**Focus Indicators:**
- **Design:** 2px solid Primary Teal (#026A67) outline
- **Visibility:** Always visible, high contrast
- **Consistency:** Same style across all interactive elements

**Text Scaling:**
- **Support:** Up to 200% text scaling
- **Layout Adjustments:** Layout adapts to larger text (stacking, wrapping)
- **No Horizontal Scrolling:** Content wraps, no horizontal scroll

**Motion Preferences:**
- **Respect:** prefers-reduced-motion media query
- **Animation Alternatives:** Reduce or remove animations when motion reduced
- **Transitions:** Use CSS transitions, respect user preference

**10. Performance Specifications:**

**A. Loading Performance:**

**Skeleton Loaders:**
- **Design:** Gray placeholder boxes matching content layout
- **Animation:** Shimmer animation (subtle, not distracting)
- **Usage:** Show for all async content (lists, tables, cards)
- **Placement:** Replace content area during loading

**Lazy Loading:**
- **Images:** Lazy load images below fold, show placeholder
- **Components:** Lazy load heavy components (charts, PDF viewer)
- **Routes:** Code split by route, lazy load route components
- **Placeholders:** Show skeleton loader during lazy load

**Progressive Enhancement:**
- **Core Content First:** Load essential content first
- **Enhancements Later:** Load non-critical features after core
- **Graceful Degradation:** Features work without JavaScript where possible

**B. Visual Performance:**

**Image Optimization:**
- **Formats:** WebP with fallback to JPEG/PNG
- **Responsive Images:** srcset for different screen sizes
- **Lazy Loading:** Native lazy loading, Intersection Observer fallback
- **Placeholders:** Blur-up placeholders, low-quality image placeholders

**Animation Performance:**
- **GPU Acceleration:** Use transform and opacity for animations
- **Performance Budget:** 60fps animations, < 16ms per frame
- **Reduce Motion:** Respect prefers-reduced-motion
- **Optimization:** Use will-change sparingly, remove after animation

**Render Optimization:**
- **Virtual Scrolling:** Virtual scrolling for long lists (1000+ items)
- **Windowing:** Render only visible items, virtualize large tables
- **Memoization:** Memoize expensive computations, React.memo for components
- **Debouncing:** Debounce search input, resize handlers

**11. Component Composition Patterns:**

**A. Page Layouts:**

**Standard Page Layouts:**
- **Dashboard Layout:** Header + sidebar + main content (grid of widgets)
- **Detail Layout:** Header + breadcrumb + tabs + content + actions
- **Form Layout:** Header + form (single/two column) + actions
- **List Layout:** Header + filters + table/cards + pagination

**B. Section Compositions:**

**Common Section Patterns:**
- **Header + Content + Actions:** Page header, content area, action buttons (right)
- **Card Header + Body + Footer:** Card with header, body content, footer actions
- **Tab Navigation + Content:** Tabs above content, content changes on tab switch

**C. Component Combinations:**

**Form + Validation:**
- **Pattern:** Form fields with inline validation, error summary at top
- **Validation Display:** Real-time validation, error messages below fields
- **Success Indicators:** Green checkmark for valid fields

**Table + Filters:**
- **Pattern:** Filter panel (left/side) + table (right/main)
- **Active Filters:** Show as chips above table
- **Filter Actions:** Apply, Clear, Reset buttons

**List + Actions:**
- **Pattern:** List with bulk actions toolbar (above list)
- **Bulk Selection:** Select all checkbox, individual checkboxes
- **Bulk Actions:** Delete, Edit, Export buttons (disabled if none selected)

**Detail + Tabs:**
- **Pattern:** Detail view with tab navigation
- **Tabs:** Horizontal tabs above content
- **Content:** Tab content changes on tab switch, preserve scroll position

**12. Design System Documentation Standards:**

**A. Component Documentation:**

**Usage Guidelines:**
- **When to Use:** Clear description of when to use component
- **When Not to Use:** When component should not be used
- **Examples:** Code examples showing usage
- **Variants:** All variants documented with examples

**Do's and Don'ts:**
- **Do's:** Visual examples of correct usage
- **Don'ts:** Visual examples of incorrect usage (with explanation)
- **Best Practices:** Best practices for component usage

**Accessibility Notes:**
- **Keyboard Navigation:** Keyboard navigation patterns
- **Screen Reader:** Screen reader support, ARIA usage
- **Focus Management:** Focus handling, focus indicators

**Performance Notes:**
- **Performance Considerations:** Performance implications
- **Optimization Tips:** Tips for optimal performance
- **Lazy Loading:** When to lazy load component

**B. Design Tokens Documentation:**

**Token Usage Guidelines:**
- **When to Use:** When to use which token
- **Token Hierarchy:** Token hierarchy (primary, secondary, tertiary)
- **Overrides:** When/how to override tokens

**Token Naming Conventions:**
- **Naming Pattern:** color-primary-500, spacing-md, etc.
- **Consistency:** Consistent naming across all tokens
- **Documentation:** Document all tokens with usage examples

**4. Accessibility:**

**WCAG Compliance:**
- **Level:** WCAG 2.1 AA compliance
- **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
- **Keyboard Navigation:** All interactive elements keyboard accessible
- **Screen Reader Support:** ARIA labels, roles, descriptions
- **Focus Management:** Visible focus indicators, logical tab order

**Keyboard Navigation Patterns:**
- **Tab:** Move to next interactive element
- **Shift+Tab:** Move to previous interactive element
- **Enter/Space:** Activate button/link
- **Arrow Keys:** Navigate dropdowns, lists
- **Escape:** Close modals, dropdowns

**Screen Reader Support:**
- **ARIA Labels:** Descriptive labels for all interactive elements
- **ARIA Roles:** Semantic roles (button, link, navigation, etc.)
- **ARIA Descriptions:** Additional context where needed
- **Live Regions:** Announce dynamic content changes

**Focus Management:**
- **Focus Indicators:** Visible focus outline (2px solid, brand color)
- **Focus Trap:** Trap focus within modals
- **Focus Restoration:** Restore focus after modal closes

**5. Mobile Responsiveness:**

**Mobile Layouts:**
- **Navigation:** Hamburger menu, bottom navigation
- **Forms:** Full-width inputs, stacked layout
- **Tables:** Card layout on mobile, table on desktop
- **Modals:** Full-screen on mobile, centered on desktop

**Touch Interactions:**
- **Touch Targets:** Minimum 44x44px
- **Touch Feedback:** Visual feedback on touch (ripple, highlight)
- **Swipe Gestures:** Swipe to delete, swipe to navigate

**6. Component Library:**

**Component List:**
- Button, Input, Textarea, Select, Checkbox, Radio, Switch
- Card, Modal, Dropdown, Tooltip, Toast, Alert
- Table, Pagination, Tabs, Accordion, Breadcrumb
- Progress Bar, Spinner, Skeleton Loader
- File Upload, Image Preview, PDF Preview

**Component Documentation:**
- Component name and description
- Props interface (TypeScript)
- Usage examples (code snippets)
- Variants and states
- Accessibility notes

**Feeds:**
→ (No dependencies — final UI layer)

---

## **2.10 AI Integration Layer** 📝

**Status:** ⏳ To be generated  
**Created by:** Cursor  
**Depends on:**
→ AI Microservice Prompts (1.7)
→ AI Layer Design & Cost Optimization (1.5a)
→ AI Extraction Rules Library (1.6) — *CRITICAL: Uses rules library to validate extractions*
→ Backend API (2.5)

**Document Format:**
- Markdown format with clear sections and subsections
- Include TypeScript interfaces for API wrapper functions
- Include code examples for OpenAI API integration
- Include error handling implementations
- Include cost tracking implementations
- Include integration with Background Jobs (Document Processing Job)
- Be specific and detailed—this is the AI integration implementation blueprint
- Target: 8,000-10,000 words (comprehensive AI integration)

**What Cursor Must Create:**

This document defines the complete AI integration layer. It must include:

**1. API Key Management:**

**A. API Key Storage:**

**Environment Variables:**
- Primary key: `OPENAI_API_KEY` (required)
- Fallback keys: `OPENAI_API_KEY_FALLBACK_1`, `OPENAI_API_KEY_FALLBACK_2` (optional)
- Key validation: Test key validity on application startup
- Key rotation: Support multiple keys for seamless rotation

**API Key Storage Implementation:**
```typescript
interface APIKeyConfig {
  primary: string;
  fallbacks: string[];
  currentKey: string;
  rotationEnabled: boolean;
}

class APIKeyManager {
  private config: APIKeyConfig;
  
  async validateKey(key: string): Promise<boolean> {
    // Test key validity by making a test API call
  }
  
  async rotateKey(): Promise<void> {
    // Rotate to next fallback key
  }
  
  getCurrentKey(): string {
    return this.config.currentKey;
  }
}
```

**B. API Key Usage:**

**Primary Key Strategy:**
- Default key: Use primary key for all requests
- Failover logic: Automatically switch to fallback keys if primary fails
- Key rotation: Rotate keys periodically (every 90 days)
- Key validation: Validate keys on startup and periodically

**Key Rotation Implementation:**
```typescript
async function rotateAPIKey(): Promise<void> {
  // 1. Generate new key in OpenAI dashboard
  // 2. Update environment variable (fallback key)
  // 3. Test new key validity
  // 4. Switch to new key
  // 5. Keep old key as fallback for 7 days
  // 6. Remove old key after 7 days
}
```

**C. Key Validation:**

**Validation Strategy:**
- Startup validation: Test all keys on application startup
- Periodic validation: Validate keys every 24 hours
- Failure handling: Alert admins if all keys invalid
- Validation endpoint: Test key with minimal API call

**Validation Implementation:**
```typescript
async function validateAPIKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

**2. Request Formatting:**

**A. OpenAI API Request Structure:**

**Model Selection:**
- Primary model: GPT-4.1 (for high-accuracy extractions)
- Fallback model: GPT-4.1 Mini (for cost optimization, fallback scenarios)
- Model selection logic: Use GPT-4.1 for complex documents, GPT-4.1 Mini for simple documents
- Model fallback: Automatically fallback to GPT-4.1 Mini if GPT-4.1 fails

**Request Format:**
- System message: Load from prompt template (see Section 4)
- User message: Load from prompt template, substitute variables
- JSON schema: Enforce structured JSON output
- Temperature: 0.2 (low temperature for consistent outputs)
- Max tokens: 4000 (for obligation extraction), 2000 (for parameter extraction)

**Request Formatting Code:**
```typescript
interface OpenAIRequest {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface RequestConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  temperature: number;
  maxTokens: number;
  systemMessage: string;
  userMessage: string;
  jsonSchema?: object;
}

async function formatOpenAIRequest(
  config: RequestConfig,
  documentContent: string
): Promise<OpenAIRequest> {
  return {
    model: config.model,
    messages: [
      { role: 'system', content: config.systemMessage },
      { role: 'user', content: config.userMessage.replace('{{document}}', documentContent) }
    ],
    response_format: { type: 'json_object' },
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };
}
```

**B. Token Optimization:**

**Prompt Compression:**
- Remove unnecessary whitespace: Compress prompts before sending
- Minimize context: Only include relevant document sections
- Optimize JSON schema: Use concise schema definitions
- Token counting: Count tokens before sending (enforce limits)

**Token Optimization Implementation:**
```typescript
function compressPrompt(prompt: string): string {
  // Remove extra whitespace
  // Remove comments
  // Optimize structure
  return prompt.replace(/\s+/g, ' ').trim();
}

function countTokens(text: string): number {
  // Use tiktoken or similar library
  // Approximate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

**C. Request Batching:**

**Batching Strategy:**
- Batch size: Up to 5 documents per batch (respect token limits)
- Batch processing: Process multiple documents in single API call
- Batch error handling: Handle partial batch failures gracefully
- Batch optimization: Group similar documents together

**Batching Implementation:**
```typescript
interface BatchRequest {
  documents: Array<{ id: string; content: string }>;
  maxBatchSize: number;
  maxTokensPerBatch: number;
}

async function batchProcessDocuments(
  batch: BatchRequest
): Promise<Array<{ documentId: string; result: any }>> {
  // Group documents into batches
  // Process each batch
  // Handle partial failures
  // Return results
}
```

**3. Cost Optimization Implementation:**

**A. Token Management:**

**Token Counting:**
- Input tokens: Count tokens in system message + user message
- Output tokens: Count tokens in LLM response
- Token limits: Enforce 1M token context limit (GPT-4.1), 128K (GPT-4.1 Mini)
- Token tracking: Track token usage per request, per document, per module

**Token Counting Implementation:**
```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  estimatedCost: number;
}

class TokenCounter {
  async countTokens(text: string, model: string): Promise<number> {
    // Use tiktoken library for accurate token counting
    // Model-specific tokenizers
  }
  
  calculateCost(usage: TokenUsage): number {
    // Calculate cost based on model pricing
    // GPT-4.1: $0.03/1K input tokens, $0.06/1K output tokens
    // GPT-4.1 Mini: $0.001/1K input tokens, $0.002/1K output tokens
  }
}
```

**Token Limits Enforcement:**
- Pre-request validation: Check token count before API call
- Truncation strategy: Truncate document content if exceeds limit
- Error handling: Return error if document too large
- Optimization: Compress prompts to fit within limits

**B. Batching Strategy:**

**Batch Size Limits:**
- Maximum batch size: 5 documents per batch
- Token limit per batch: 800K tokens (leave margin for 1M limit)
- Batch optimization: Group documents by size/complexity
- Batch error handling: Handle partial batch failures

**Batching Implementation:**
```typescript
interface BatchConfig {
  maxDocuments: number;
  maxTokensPerBatch: number;
  batchTimeout: number; // milliseconds
}

class DocumentBatcher {
  async createBatches(
    documents: Document[],
    config: BatchConfig
  ): Promise<Document[][]> {
    // Group documents into batches
    // Respect token limits
    // Optimize batch composition
  }
  
  async processBatch(batch: Document[]): Promise<BatchResult> {
    // Process batch
    // Handle errors
    // Return results
  }
}
```

**Batch Error Handling:**
- Partial failures: Continue processing successful documents
- Retry logic: Retry failed documents individually
- Error reporting: Report which documents failed and why
- Recovery: Allow manual retry of failed documents

**C. Caching Strategy:**

**Cache Rule Library Matches:**
- Cache key: Document hash + rule pattern hash
- Cache threshold: ≥90% match = cache result
- Cache TTL: 30 days (or until rule library updated)
- Cache invalidation: Invalidate on rule library updates

**Cache Identical Segments:**
- Segment identification: Identify identical document segments
- Cache key: Segment hash
- Cache result: LLM extraction result for segment
- Cache reuse: Reuse cached results for identical segments

**Cache Implementation:**
```typescript
interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
}

class ExtractionCache {
  async get(key: string): Promise<any | null> {
    // Check cache
    // Validate TTL
    // Return cached value or null
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    // Store in cache
    // Set TTL
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Invalidate cache entries matching pattern
  }
}
```

**Cache Invalidation:**
- Rule library updates: Invalidate all rule-related caches
- Manual invalidation: Allow admins to invalidate cache
- TTL expiration: Automatic expiration based on TTL
- Cache monitoring: Monitor cache hit rates

**4. Prompt Template Integration:**

**A. Prompt Template Loading:**

**Template Source:**
- Load from: AI Microservice Prompts (Document 1.7)
- Template storage: Store templates in database or file system
- Template versioning: Track prompt versions, support A/B testing
- Template validation: Validate template syntax on load

**Template Loading Implementation:**
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemMessage: string;
  userMessage: string;
  jsonSchema: object;
  variables: string[];
}

class PromptTemplateLoader {
  async loadTemplate(templateId: string, version?: string): Promise<PromptTemplate> {
    // Load template from storage
    // Validate template
    // Return template object
  }
  
  async getLatestVersion(templateId: string): Promise<PromptTemplate> {
    // Get latest version of template
  }
}
```

**B. Template Variable Substitution:**

**Variable Substitution:**
- Variable format: `{{variable_name}}`
- Required variables: `{{document}}`, `{{site_id}}`, `{{document_type}}`
- Optional variables: `{{context}}`, `{{previous_extractions}}`
- Variable validation: Validate all required variables present

**Variable Substitution Implementation:**
```typescript
interface TemplateVariables {
  document?: string;
  siteId?: string;
  documentType?: string;
  context?: string;
  [key: string]: any;
}

function substituteVariables(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (variables[key] === undefined) {
      throw new Error(`Missing required variable: ${key}`);
    }
    return String(variables[key]);
  });
}
```

**C. Template Versioning:**

**Version Management:**
- Version format: Semantic versioning (e.g., "1.0.0")
- Version tracking: Track which version used for each extraction
- A/B testing: Support multiple versions for testing
- Version rollback: Rollback to previous version if issues

**Version Tracking Implementation:**
```typescript
interface TemplateVersion {
  templateId: string;
  version: string;
  createdAt: Date;
  isActive: boolean;
  usageCount: number;
}

async function trackTemplateUsage(
  templateId: string,
  version: string,
  extractionId: string
): Promise<void> {
  // Log template version usage
  // Update usage statistics
}
```

**D. Prompt Template Usage:**

**System Message:**
- Load from template: Load system message from prompt template
- Variable substitution: Substitute variables in system message
- Validation: Validate system message before use

**User Message:**
- Load from template: Load user message from prompt template
- Variable substitution: Substitute document content and other variables
- Context addition: Add relevant context (previous extractions, site info)

**JSON Schema:**
- Load from template: Load JSON schema from prompt template
- Schema validation: Validate schema structure
- Schema enforcement: Enforce schema in API request

**5. Confidence Scoring:**

**A. Confidence Score Interpretation:**

**LLM Confidence Scores:**
- Extract from response: LLM provides confidence scores in JSON response
- Score range: 0-100 (percentage)
- Score interpretation: Higher score = more confident extraction
- Score validation: Validate confidence scores are within range

**Confidence Score Structure:**
```typescript
interface ConfidenceScore {
  score: number; // 0-100
  source: 'llm' | 'rule_library' | 'combined';
  factors: {
    llmConfidence?: number;
    ruleMatch?: boolean;
    patternMatch?: number;
  };
}

interface ExtractionResult {
  obligation: Obligation;
  confidence: ConfidenceScore;
  flagged: boolean;
  reviewRequired: boolean;
}
```

**B. Confidence Thresholds:**

**Threshold Configuration:**
- Auto-extract threshold: >85% = auto-extract, no review needed
- Review threshold: <85% = flag for human review
- Critical threshold: <70% = high priority review
- Subjective threshold: Always flag subjective obligations (see PLS Section A.6)

**Threshold Application:**
```typescript
function applyConfidenceThreshold(
  confidence: ConfidenceScore,
  isSubjective: boolean
): { autoExtract: boolean; reviewRequired: boolean } {
  if (isSubjective) {
    return { autoExtract: false, reviewRequired: true };
  }
  
  if (confidence.score > 85) {
    return { autoExtract: true, reviewRequired: false };
  }
  
  return { autoExtract: false, reviewRequired: true };
}
```

**C. Confidence Boost:**

**Rule Library Boost:**
- Library match boost: +15% confidence boost for rule library matches
- Pattern match boost: +10% confidence boost for pattern matches (≥90% match)
- Combined scoring: Combine LLM confidence + rule library boost
- Boost calculation: `final_confidence = min(100, llm_confidence + boost)`

**Confidence Boost Implementation:**
```typescript
function applyConfidenceBoost(
  llmConfidence: number,
  hasRuleMatch: boolean,
  patternMatchScore?: number
): number {
  let boosted = llmConfidence;
  
  if (hasRuleMatch) {
    boosted += 15; // Rule library match boost
  }
  
  if (patternMatchScore && patternMatchScore >= 0.9) {
    boosted += 10; // Pattern match boost
  }
  
  return Math.min(100, boosted);
}
```

**D. Confidence Score Application:**

**Threshold Comparison:**
- Compare scores: Compare confidence scores to thresholds
- Auto-extract: Automatically extract high-confidence items
- Flag for review: Flag low-confidence items for human review
- Log scores: Store confidence scores in extraction_logs table

**Confidence Logging:**
```typescript
async function logConfidenceScore(
  extractionLogId: string,
  confidence: ConfidenceScore,
  decision: 'auto_extract' | 'flagged_for_review'
): Promise<void> {
  await updateExtractionLog(extractionLogId, {
    confidence_score: confidence.score,
    confidence_source: confidence.source,
    extraction_decision: decision
  });
}
```

**6. Rules Library Integration:**

**A. Rule Library Lookup:**

**Pattern Matching Strategy:**
- Regex First, Then Semantic:**
- Step 1: Try regex patterns first (fastest, most accurate)
- Step 2: If no regex match, try semantic matching (slower, more flexible)
- Step 3: If no match, proceed with LLM extraction
- Match threshold: ≥90% match = use library rule

**Pattern Matching Implementation:**
```typescript
interface RuleMatch {
  ruleId: string;
  patternId: string;
  matchScore: number;
  matchType: 'regex' | 'semantic';
  extractedData: any;
}

class RuleLibraryMatcher {
  async findMatches(
    documentContent: string,
    documentType: string
  ): Promise<RuleMatch[]> {
    // 1. Try regex patterns
    const regexMatches = await this.tryRegexPatterns(documentContent, documentType);
    if (regexMatches.length > 0) {
      return regexMatches;
    }
    
    // 2. Try semantic matching
    const semanticMatches = await this.trySemanticMatching(documentContent, documentType);
    return semanticMatches.filter(m => m.matchScore >= 0.9);
  }
  
  private async tryRegexPatterns(content: string, type: string): Promise<RuleMatch[]> {
    // Load regex patterns for document type
    // Apply patterns
    // Return matches with scores
  }
  
  private async trySemanticMatching(content: string, type: string): Promise<RuleMatch[]> {
    // Use embedding similarity
    // Calculate match scores
    // Return matches
  }
}
```

**B. Match Threshold:**

**Threshold Application:**
- High confidence: ≥90% match = use library rule, skip LLM
- Medium confidence: 70-89% match = use library rule + LLM validation
- Low confidence: <70% match = use LLM extraction only
- Threshold configuration: Configurable per rule pattern

**C. Rule Library Application:**

**Validate Extractions:**
- Compare output: Compare LLM output to library patterns
- Validation logic: Check if LLM output matches known patterns
- Apply rules: Use library rules when match found
- Fallback: Use LLM extraction if no library match

**Rule Application Implementation:**
```typescript
async function applyRuleLibrary(
  documentContent: string,
  documentType: string,
  llmOutput: any
): Promise<{ useLibrary: boolean; ruleMatch?: RuleMatch; llmOutput?: any }> {
  // 1. Try rule library first
  const matches = await ruleLibraryMatcher.findMatches(documentContent, documentType);
  
  if (matches.length > 0 && matches[0].matchScore >= 0.9) {
    return {
      useLibrary: true,
      ruleMatch: matches[0]
    };
  }
  
  // 2. Validate LLM output against library patterns
  const llmValidation = await validateLLMOutput(llmOutput, documentType);
  
  if (llmValidation.matchScore >= 0.9) {
    return {
      useLibrary: true,
      ruleMatch: llmValidation
    };
  }
  
  // 3. Use LLM output
  return {
    useLibrary: false,
    llmOutput
  };
}
```

**D. Rule Usage Logging:**

**Usage Tracking:**
- Track patterns: Log which patterns matched
- Track frequency: Track how often each pattern used
- Track accuracy: Track accuracy of rule-based extractions
- Analytics: Generate analytics on rule library effectiveness

**Usage Logging Implementation:**
```typescript
async function logRuleUsage(
  ruleId: string,
  patternId: string,
  matchScore: number,
  extractionId: string
): Promise<void> {
  await db.insert('rule_usage_logs', {
    rule_id: ruleId,
    pattern_id: patternId,
    match_score: matchScore,
    extraction_id: extractionId,
    used_at: new Date()
  });
}
```

**7. Low-Confidence Item Flagging:**

**A. Flagging Logic:**

**Confidence-Based Flagging:**
- Low confidence: Confidence <85% = flag for human review
- Critical flagging: Confidence <70% = high priority review
- Subjective obligations: Always flag (see PLS Section A.6)
- Novel patterns: Flag if no library match and confidence <90%

**Flagging Criteria:**
```typescript
interface FlaggingCriteria {
  confidenceThreshold: number;
  isSubjective: boolean;
  hasRuleMatch: boolean;
  isNovelPattern: boolean;
}

function shouldFlagItem(
  confidence: number,
  criteria: FlaggingCriteria
): boolean {
  // Always flag subjective obligations
  if (criteria.isSubjective) {
    return true;
  }
  
  // Flag low confidence
  if (confidence < criteria.confidenceThreshold) {
    return true;
  }
  
  // Flag novel patterns without rule match
  if (criteria.isNovelPattern && !criteria.hasRuleMatch && confidence < 90) {
    return true;
  }
  
  return false;
}
```

**B. Flagging Implementation:**

**Review Queue Creation:**
- Create review items: Insert flagged items into `review_queue_items` table
- Priority assignment: Assign priority based on confidence score
- Metadata storage: Store extraction metadata for review
- Status tracking: Track review status (pending, reviewed, approved, rejected)

**Review Queue Implementation:**
```typescript
interface ReviewQueueItem {
  id: string;
  extractionId: string;
  documentId: string;
  obligationId?: string;
  confidenceScore: number;
  flagReason: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

async function createReviewQueueItem(
  extraction: ExtractionResult,
  flagReason: string
): Promise<ReviewQueueItem> {
  const priority = extraction.confidence.score < 70 ? 'high' : 
                   extraction.confidence.score < 85 ? 'medium' : 'low';
  
  return await db.insert('review_queue_items', {
    extraction_id: extraction.id,
    document_id: extraction.documentId,
    confidence_score: extraction.confidence.score,
    flag_reason: flagReason,
    priority,
    status: 'pending'
  });
}
```

**C. Notification System:**

**User Notifications:**
- Notification creation: Create notification for flagged items
- Notification type: "Review Required" notification
- Notification delivery: Email + in-app notification
- Notification content: Include obligation details, confidence score, flag reason

**Notification Implementation:**
```typescript
async function notifyReviewRequired(
  userId: string,
  reviewItem: ReviewQueueItem
): Promise<void> {
  await createNotification({
    userId,
    type: 'REVIEW_REQUIRED',
    title: 'Obligation Review Required',
    message: `An obligation requires review (Confidence: ${reviewItem.confidenceScore}%)`,
    actionUrl: `/review/${reviewItem.id}`,
    priority: reviewItem.priority
  });
}
```

**D. Review Workflow:**

**Review Process:**
- User review: Users review flagged items in review queue
- Actions: Approve, reject, or edit extraction
- Status update: Update review queue item status
- Obligation creation: Create obligation if approved
- Feedback loop: Use review feedback to improve extraction accuracy

**8. Data Transformation:**

**A. LLM Output to Database Format:**

**Transformation Strategy:**
- Map obligations: Transform LLM output to obligations table schema
- Map parameters: Transform LLM output to parameters table schema (Module 2)
- Map run-hours: Transform LLM output to run_hour_records table schema (Module 3)
- Validate data: Validate transformed data before insertion
- Apply business rules: Apply business logic during transformation

**Transformation Interfaces:**
```typescript
interface LLMObligationOutput {
  obligations: Array<{
    title: string;
    frequency: string;
    deadline_date?: string;
    description?: string;
    is_subjective?: boolean;
    confidence?: number;
  }>;
}

interface LLMParameterOutput {
  parameters: Array<{
    name: string;
    current_value: number;
    limit: number;
    unit: string;
  }>;
}

interface LLMRunHourOutput {
  generators: Array<{
    generator_name: string;
    run_hours: number;
    date: string;
  }>;
}
```

**B. Obligation Transformation:**

**Obligation Mapping:**
- Title mapping: Map `title` to `obligation_title`
- Frequency mapping: Map `frequency` to `frequency` enum
- Deadline mapping: Parse `deadline_date` to Date object
- Description mapping: Map `description` to `description`
- Subjective flag: Map `is_subjective` to `is_subjective`
- Confidence: Store confidence score

**Obligation Transformation Implementation:**
```typescript
function transformLLMOutputToObligations(
  llmOutput: LLMObligationOutput,
  documentId: string,
  siteId: string,
  importSource: 'PDF_EXTRACTION' | 'EXCEL_IMPORT' | 'MANUAL'
): Obligation[] {
  return llmOutput.obligations.map((obligation, index) => {
    // Validate required fields
    if (!obligation.title || !obligation.frequency) {
      throw new Error(`Missing required fields in obligation ${index}`);
    }
    
    // Parse deadline date
    let deadlineDate: Date | null = null;
    if (obligation.deadline_date) {
      deadlineDate = new Date(obligation.deadline_date);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error(`Invalid deadline date: ${obligation.deadline_date}`);
      }
    }
    
    // Map to database schema
    return {
      id: generateUUID(),
      document_id: documentId,
      site_id: siteId,
      obligation_title: obligation.title,
      frequency: mapFrequency(obligation.frequency),
      deadline_date: deadlineDate,
      description: obligation.description || null,
      is_subjective: obligation.is_subjective || false,
      import_source: importSource,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
}

function mapFrequency(frequency: string): Frequency {
  // Map frequency string to enum
  const frequencyMap: Record<string, Frequency> = {
    'annual': 'ANNUAL',
    'monthly': 'MONTHLY',
    'quarterly': 'QUARTERLY',
    'weekly': 'WEEKLY',
    'daily': 'DAILY'
  };
  
  return frequencyMap[frequency.toLowerCase()] || 'ANNUAL';
}
```

**C. Parameter Transformation (Module 2):**

**Parameter Mapping:**
- Name mapping: Map `name` to `parameter_name`
- Value mapping: Map `current_value` to `current_value` (numeric)
- Limit mapping: Map `limit` to `limit_value` (numeric)
- Unit mapping: Map `unit` to `unit`

**Parameter Transformation Implementation:**
```typescript
function transformLLMOutputToParameters(
  llmOutput: LLMParameterOutput,
  siteId: string
): Parameter[] {
  return llmOutput.parameters.map((param) => {
    // Validate numeric values
    if (isNaN(param.current_value) || isNaN(param.limit)) {
      throw new Error(`Invalid numeric values for parameter: ${param.name}`);
    }
    
    return {
      id: generateUUID(),
      site_id: siteId,
      parameter_name: param.name,
      current_value: param.current_value,
      limit_value: param.limit,
      unit: param.unit,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
}
```

**D. Run Hour Transformation (Module 3):**

**Run Hour Mapping:**
- Generator mapping: Map `generator_name` to `generator_id` (lookup)
- Hours mapping: Map `run_hours` to `hours` (numeric)
- Date mapping: Parse `date` to Date object

**Run Hour Transformation Implementation:**
```typescript
async function transformLLMOutputToRunHours(
  llmOutput: LLMRunHourOutput,
  siteId: string
): Promise<RunHourRecord[]> {
  const records: RunHourRecord[] = [];
  
  for (const generatorData of llmOutput.generators) {
    // Lookup generator by name
    const generator = await findGeneratorByName(siteId, generatorData.generator_name);
    if (!generator) {
      throw new Error(`Generator not found: ${generatorData.generator_name}`);
    }
    
    // Validate hours
    if (isNaN(generatorData.run_hours)) {
      throw new Error(`Invalid run hours for generator: ${generatorData.generator_name}`);
    }
    
    // Parse date
    const recordDate = new Date(generatorData.date);
    if (isNaN(recordDate.getTime())) {
      throw new Error(`Invalid date: ${generatorData.date}`);
    }
    
    records.push({
      id: generateUUID(),
      generator_id: generator.id,
      site_id: siteId,
      hours: generatorData.run_hours,
      record_date: recordDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  return records;
}
```

**E. Data Validation:**

**Validation Rules:**
- Required fields: Validate all required fields present
- Data types: Validate data types (dates, numbers, enums)
- Business rules: Apply business logic validation
- Constraints: Validate against database constraints

**Validation Implementation:**
```typescript
function validateObligation(obligation: Obligation): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!obligation.obligation_title) {
    errors.push('obligation_title is required');
  }
  if (!obligation.frequency) {
    errors.push('frequency is required');
  }
  
  // Date validation
  if (obligation.deadline_date && isNaN(obligation.deadline_date.getTime())) {
    errors.push('deadline_date must be a valid date');
  }
  
  // Frequency enum validation
  const validFrequencies = ['ANNUAL', 'MONTHLY', 'QUARTERLY', 'WEEKLY', 'DAILY'];
  if (!validFrequencies.includes(obligation.frequency)) {
    errors.push(`frequency must be one of: ${validFrequencies.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**9. Error Handling:**

**A. Error Types:**

**API Errors:**
- Rate limit errors: 429 status code (rate limit exceeded)
- Invalid key errors: 401 status code (invalid API key)
- Quota exceeded: 429 status code (quota exceeded)
- Model unavailable: 503 status code (model temporarily unavailable)
- Server errors: 500+ status codes (OpenAI server errors)

**Timeout Errors:**
- Request timeout: Request exceeds 30 seconds
- Connection timeout: Connection cannot be established
- Read timeout: Response reading timeout

**Parsing Errors:**
- Invalid JSON: LLM returns invalid JSON
- Schema mismatch: JSON doesn't match expected schema
- Missing fields: Required fields missing from JSON

**Validation Errors:**
- Data type errors: Invalid data types (dates, numbers)
- Business rule violations: Data violates business rules
- Constraint violations: Data violates database constraints

**Error Type Interfaces:**
```typescript
interface APIError {
  type: 'rate_limit' | 'invalid_key' | 'quota_exceeded' | 'server_error';
  statusCode: number;
  message: string;
  retryAfter?: number; // seconds
}

interface TimeoutError {
  type: 'request_timeout' | 'connection_timeout' | 'read_timeout';
  timeout: number; // milliseconds
  message: string;
}

interface ParsingError {
  type: 'invalid_json' | 'schema_mismatch' | 'missing_fields';
  message: string;
  details?: any;
}

interface ValidationError {
  type: 'data_type_error' | 'business_rule_violation' | 'constraint_violation';
  field: string;
  message: string;
  value?: any;
}
```

**B. Error Handling Implementation:**

**Retry Logic:**
- Retry strategy: Exponential backoff (2 retries, 2s, 4s delays)
- Retry conditions: Retry on transient errors (rate limit, timeout, server errors)
- No retry: Don't retry on permanent errors (invalid key, validation errors)
- Max retries: Maximum 2 retries per request

**Retry Implementation:**
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Calculate delay
      const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (error instanceof APIError) {
    return retryableErrors.includes(error.type);
  }
  return false;
}
```

**C. Fallback Strategy:**

**Model Fallback:**
- Primary model: Use GPT-4.1 for all requests
- Fallback model: Use GPT-4.1 Mini if GPT-4.1 fails
- Fallback conditions: Fallback on rate limit, quota exceeded, model unavailable
- Fallback logging: Log fallback usage for cost tracking

**Fallback Implementation:**
```typescript
async function callOpenAIWithFallback(
  request: OpenAIRequest
): Promise<OpenAIResponse> {
  try {
    // Try primary model
    return await callOpenAI(request);
  } catch (error) {
    if (shouldFallback(error)) {
      // Fallback to GPT-4.1 Mini
      const fallbackRequest = {
        ...request,
        model: 'gpt-4o-mini' as const
      };
      
      await logFallbackUsage(request.model, 'gpt-4o-mini', error);
      return await callOpenAI(fallbackRequest);
    }
    throw error;
  }
}

function shouldFallback(error: any): boolean {
  if (error instanceof APIError) {
    return ['rate_limit', 'quota_exceeded', 'server_error'].includes(error.type);
  }
  return false;
}
```

**D. Error Logging:**

**Error Logging:**
- Log to extraction_logs: Log all errors to extraction_logs table
- Error details: Store error type, message, stack trace
- Context: Store request context (document ID, model, tokens)
- Error aggregation: Aggregate errors for analytics

**Error Logging Implementation:**
```typescript
async function logExtractionError(
  extractionLogId: string,
  error: Error,
  context: {
    documentId: string;
    model: string;
    requestTokens: number;
  }
): Promise<void> {
  await updateExtractionLog(extractionLogId, {
    status: 'FAILED',
    error_message: error.message,
    error_type: error.constructor.name,
    error_stack: error.stack,
    error_context: context
  });
}
```

**E. Error Notifications:**

**Admin Notifications:**
- Critical errors: Notify admins of critical errors (invalid key, quota exceeded)
- Error threshold: Notify if error rate exceeds threshold
- Error summary: Send daily error summary to admins
- Alert escalation: Escalate if errors persist

**Error Notification Implementation:**
```typescript
async function notifyAdminOfError(
  error: Error,
  context: any
): Promise<void> {
  if (isCriticalError(error)) {
    await createNotification({
      userId: 'admin',
      type: 'CRITICAL_ERROR',
      title: 'Critical AI Integration Error',
      message: `Error: ${error.message}`,
      priority: 'high',
      metadata: context
    });
  }
}

function isCriticalError(error: any): boolean {
  if (error instanceof APIError) {
    return ['invalid_key', 'quota_exceeded'].includes(error.type);
  }
  return false;
}
```

**10. Rate Limiting:**

**A. Rate Limit Detection:**

**Rate Limit Detection:**
- Status code: Detect 429 status code (rate limit exceeded)
- Response headers: Parse rate limit headers (`x-ratelimit-*`)
- Error message: Parse rate limit error messages
- Retry-After header: Extract retry delay from `Retry-After` header

**Rate Limit Detection Implementation:**
```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

function detectRateLimit(response: Response): RateLimitInfo | null {
  if (response.status !== 429) {
    return null;
  }
  
  const headers = response.headers;
  const limit = parseInt(headers.get('x-ratelimit-limit') || '0');
  const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0');
  const resetTime = new Date(parseInt(headers.get('x-ratelimit-reset') || '0') * 1000);
  const retryAfter = parseInt(headers.get('retry-after') || '0');
  
  return {
    limit,
    remaining,
    resetTime,
    retryAfter: retryAfter > 0 ? retryAfter : undefined
  };
}
```

**B. Rate Limit Handling:**

**Request Queuing:**
- Queue requests: Queue requests when rate limited
- Queue priority: Maintain priority queue (critical requests first)
- Queue processing: Process queue when rate limit resets
- Queue monitoring: Monitor queue size and wait times

**Request Queue Implementation:**
```typescript
interface QueuedRequest {
  id: string;
  request: OpenAIRequest;
  priority: number;
  queuedAt: Date;
  retryAfter?: Date;
}

class RateLimitQueue {
  private queue: QueuedRequest[] = [];
  
  async enqueue(request: OpenAIRequest, priority: number = 0): Promise<string> {
    const queuedRequest: QueuedRequest = {
      id: generateUUID(),
      request,
      priority,
      queuedAt: new Date()
    };
    
    this.queue.push(queuedRequest);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    return queuedRequest.id;
  }
  
  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      // Check if we can process (rate limit reset)
      if (await canProcessRequest()) {
        await executeRequest(request);
      } else {
        // Re-queue if still rate limited
        this.queue.unshift(request);
        await sleep(1000); // Wait 1 second
      }
    }
  }
}
```

**C. Exponential Backoff:**

**Backoff Strategy:**
- Initial delay: Start with 2 seconds delay
- Backoff multiplier: Multiply delay by 2 for each retry
- Max delay: Cap delay at 60 seconds
- Jitter: Add random jitter to prevent thundering herd

**Backoff Implementation:**
```typescript
function calculateBackoffDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000; // Use Retry-After header value
  }
  
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}
```

**D. Rate Limit Monitoring:**

**Usage Tracking:**
- Track limits: Track rate limit usage from response headers
- Track remaining: Monitor remaining requests
- Track reset time: Track when rate limit resets
- Alerting: Alert when approaching rate limit

**Rate Limit Monitoring Implementation:**
```typescript
class RateLimitMonitor {
  private currentLimit: RateLimitInfo | null = null;
  
  async updateLimitInfo(info: RateLimitInfo): Promise<void> {
    this.currentLimit = info;
    
    // Alert if approaching limit
    if (info.remaining < info.limit * 0.1) {
      await alertRateLimitApproaching(info);
    }
  }
  
  async canMakeRequest(): Promise<boolean> {
    if (!this.currentLimit) {
      return true;
    }
    
    return this.currentLimit.remaining > 0 && 
           new Date() >= this.currentLimit.resetTime;
  }
}
```

**11. Cost Tracking:**

**A. Token Counting:**

**Token Counting:**
- Input tokens: Count tokens in system message + user message
- Output tokens: Count tokens in LLM response
- Accurate counting: Use tiktoken library for accurate token counting
- Model-specific: Use model-specific tokenizers

**Token Counting Implementation:**
```typescript
import { encoding_for_model } from 'tiktoken';

interface TokenCount {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

class TokenCounter {
  private encoders: Map<string, any> = new Map();
  
  async countTokens(text: string, model: string): Promise<number> {
    if (!this.encoders.has(model)) {
      this.encoders.set(model, encoding_for_model(model));
    }
    
    const encoder = this.encoders.get(model);
    return encoder.encode(text).length;
  }
  
  async countRequestTokens(
    request: OpenAIRequest,
    response: OpenAIResponse
  ): Promise<TokenCount> {
    const inputTokens = await this.countInputTokens(request);
    const outputTokens = await this.countOutputTokens(response);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  }
  
  private async countInputTokens(request: OpenAIRequest): Promise<number> {
    let total = 0;
    for (const message of request.messages) {
      total += await this.countTokens(message.content, request.model);
    }
    return total;
  }
  
  private async countOutputTokens(response: OpenAIResponse): Promise<number> {
    return await this.countTokens(response.choices[0].message.content, response.model);
  }
}
```

**B. Cost Calculation:**

**Pricing Model:**
- GPT-4.1 pricing: $0.03 per 1K input tokens, $0.06 per 1K output tokens
- GPT-4.1 Mini pricing: $0.001 per 1K input tokens, $0.002 per 1K output tokens
- Cost calculation: `cost = (inputTokens / 1000 * inputPrice) + (outputTokens / 1000 * outputPrice)`
- Cost rounding: Round to 4 decimal places

**Cost Calculation Implementation:**
```typescript
interface ModelPricing {
  inputPricePer1K: number;
  outputPricePer1K: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    inputPricePer1K: 0.03,
    outputPricePer1K: 0.06
  },
  'gpt-4o-mini': {
    inputPricePer1K: 0.001,
    outputPricePer1K: 0.002
  }
};

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model pricing: ${model}`);
  }
  
  const inputCost = (inputTokens / 1000) * pricing.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputPricePer1K;
  const totalCost = inputCost + outputCost;
  
  return Math.round(totalCost * 10000) / 10000; // Round to 4 decimal places
}
```

**C. Cost Logging:**

**Logging to Database:**
- Log to extraction_logs: Log token counts and costs to extraction_logs table
- Fields: `input_tokens`, `output_tokens`, `estimated_cost`, `model`
- Timestamp: Log timestamp for cost analytics
- Aggregation: Enable cost aggregation queries

**Cost Logging Implementation:**
```typescript
async function trackCost(
  extractionLogId: string,
  tokenCount: TokenCount,
  model: string
): Promise<void> {
  const cost = calculateCost(tokenCount.inputTokens, tokenCount.outputTokens, model);
  
  await updateExtractionLog(extractionLogId, {
    input_tokens: tokenCount.inputTokens,
    output_tokens: tokenCount.outputTokens,
    total_tokens: tokenCount.totalTokens,
    estimated_cost: cost,
    model_used: model
  });
}
```

**D. Cost Analytics:**

**Cost Aggregation:**
- Per document: Aggregate costs per document
- Per module: Aggregate costs per module (Module 1, 2, 3)
- Per time period: Aggregate costs per day/week/month
- Per user/company: Aggregate costs per user/company

**Cost Analytics Implementation:**
```typescript
interface CostAnalytics {
  totalCost: number;
  totalTokens: number;
  averageCostPerDocument: number;
  costByModule: Record<string, number>;
  costByTimePeriod: Array<{ period: string; cost: number }>;
}

async function getCostAnalytics(
  filters: {
    startDate?: Date;
    endDate?: Date;
    companyId?: string;
    moduleId?: string;
  }
): Promise<CostAnalytics> {
  // Query extraction_logs table
  // Aggregate costs
  // Return analytics
}
```

**12. Background Job Integration:**

**A. Document Processing Job Integration:**

**Job Triggers:**
- Background job: Document Processing Job (from Background Jobs Spec 2.3) calls AI integration layer
- Job input: Document ID, site ID, user ID, extraction options
- Job status: Update job status (PENDING → RUNNING → COMPLETED/FAILED)
- Job progress: Update job progress during processing

**Job Integration Implementation:**
```typescript
interface DocumentProcessingJobInput {
  documentId: string;
  siteId: string;
  userId: string;
  extractionOptions: {
    useRuleLibrary: boolean;
    confidenceThreshold: number;
    autoExtract: boolean;
  };
}

async function processDocument(jobInput: DocumentProcessingJobInput): Promise<void> {
  const { documentId, siteId, userId, extractionOptions } = jobInput;
  
  try {
    // Update job status to RUNNING
    await updateJobStatus(jobInput.jobId, 'RUNNING');
    
    // 1. Load document from storage
    const document = await loadDocument(documentId);
    
    // 2. Check rule library first (if enabled)
    let extractionResult: ExtractionResult | null = null;
    if (extractionOptions.useRuleLibrary) {
      const ruleMatches = await ruleLibraryMatcher.findMatches(document.content, document.type);
      if (ruleMatches.length > 0 && ruleMatches[0].matchScore >= 0.9) {
        extractionResult = await applyRuleLibraryMatch(ruleMatches[0], documentId, siteId);
      }
    }
    
    // 3. Call OpenAI API if no rule library match
    if (!extractionResult) {
      const llmOutput = await callOpenAIWithFallback(createRequest(document));
      extractionResult = await transformLLMOutput(llmOutput, documentId, siteId);
    }
    
    // 4. Apply confidence thresholds
    const flaggedItems = await applyConfidenceThresholds(extractionResult, extractionOptions);
    
    // 5. Store results in database
    await storeExtractionResults(extractionResult, flaggedItems);
    
    // 6. Update job status to COMPLETED
    await updateJobStatus(jobInput.jobId, 'COMPLETED', {
      obligationsCreated: extractionResult.obligations.length,
      flaggedForReview: flaggedItems.length
    });
    
  } catch (error) {
    // Update job status to FAILED
    await updateJobStatus(jobInput.jobId, 'FAILED', {
      error: error.message
    });
    
    // Log error
    await logExtractionError(documentId, error);
    
    throw error;
  }
}
```

**B. Job Status Updates:**

**Status Management:**
- Status transitions: PENDING → RUNNING → COMPLETED/FAILED
- Progress updates: Update progress percentage during processing
- Result storage: Store extraction results in job metadata
- Error storage: Store error details in job metadata

**Status Update Implementation:**
```typescript
async function updateJobStatus(
  jobId: string,
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  metadata?: any
): Promise<void> {
  await db.update('background_jobs', {
    id: jobId,
    status,
    updated_at: new Date(),
    ...(metadata && { metadata })
  });
}

async function updateJobProgress(
  jobId: string,
  progress: number // 0-100
): Promise<void> {
  await db.update('background_jobs', {
    id: jobId,
    progress,
    updated_at: new Date()
  });
}
```

**C. Job Results Storage:**

**Results Storage:**
- Store obligations: Store extracted obligations in obligations table
- Store parameters: Store extracted parameters in parameters table (Module 2)
- Store run hours: Store extracted run hours in run_hour_records table (Module 3)
- Link to document: Link extractions to source document

**Results Storage Implementation:**
```typescript
async function storeExtractionResults(
  result: ExtractionResult,
  flaggedItems: FlaggedItem[]
): Promise<void> {
  // Store obligations
  for (const obligation of result.obligations) {
    await db.insert('obligations', obligation);
  }
  
  // Store parameters (Module 2)
  if (result.parameters) {
    for (const parameter of result.parameters) {
      await db.insert('parameters', parameter);
    }
  }
  
  // Store run hours (Module 3)
  if (result.runHours) {
    for (const runHour of result.runHours) {
      await db.insert('run_hour_records', runHour);
    }
  }
  
  // Create review queue items for flagged items
  for (const item of flaggedItems) {
    await createReviewQueueItem(item);
  }
}
```

**D. Job Error Handling:**

**Error Handling:**
- Retry logic: Job retries handled by BullMQ (see Background Jobs Spec 2.3)
- DLQ handling: Failed jobs sent to Dead-Letter Queue after max retries
- Error logging: Log errors to extraction_logs table
- Error notifications: Notify users/admins of job failures

**Error Handling Implementation:**
```typescript
async function handleJobError(
  jobId: string,
  error: Error,
  jobInput: DocumentProcessingJobInput
): Promise<void> {
  // Log error
  await logExtractionError(jobInput.documentId, error, {
    jobId,
    model: 'gpt-4o',
    requestTokens: 0
  });
  
  // Update job status
  await updateJobStatus(jobId, 'FAILED', {
    error: error.message,
    errorStack: error.stack
  });
  
  // Notify user
  await notifyUser(jobInput.userId, {
    type: 'EXTRACTION_FAILED',
    documentId: jobInput.documentId,
    error: error.message
  });
}
```

**13. Testing Requirements:**

**A. API Key Management Tests:**

**Test Scenarios:**
- Valid key test: Test with valid API key
- Invalid key test: Test with invalid API key (should fail gracefully)
- Key rotation test: Test key rotation process
- Fallback key test: Test fallback to secondary key
- Key validation test: Test key validation on startup

**Test Implementation:**
```typescript
describe('API Key Management', () => {
  it('should use primary key by default', async () => {
    const manager = new APIKeyManager({ primary: 'valid-key' });
    expect(manager.getCurrentKey()).toBe('valid-key');
  });
  
  it('should fallback to secondary key on failure', async () => {
    const manager = new APIKeyManager({
      primary: 'invalid-key',
      fallbacks: ['valid-key']
    });
    // Mock API call failure
    // Verify fallback
  });
  
  it('should validate keys on startup', async () => {
    const manager = new APIKeyManager({ primary: 'valid-key' });
    const isValid = await manager.validateKey('valid-key');
    expect(isValid).toBe(true);
  });
});
```

**B. Request Formatting Tests:**

**Test Scenarios:**
- Correct format test: Test request formatting with correct inputs
- Token limit test: Test request respects token limits
- Variable substitution test: Test template variable substitution
- JSON schema test: Test JSON schema enforcement

**C. Cost Optimization Tests:**

**Test Scenarios:**
- Batching test: Test document batching (up to 5 documents)
- Caching test: Test rule library match caching
- Token optimization test: Test prompt compression
- Cost calculation test: Test accurate cost calculation

**D. Error Handling Tests:**

**Test Scenarios:**
- Retry test: Test exponential backoff retry logic
- Fallback test: Test model fallback (GPT-4.1 → GPT-4.1 Mini)
- Timeout test: Test request timeout handling
- Rate limit test: Test rate limit detection and handling

**E. Cost Tracking Tests:**

**Test Scenarios:**
- Token counting test: Test accurate token counting
- Cost calculation test: Test cost calculation accuracy
- Cost logging test: Test cost logging to database
- Cost analytics test: Test cost aggregation queries

**14. Performance Monitoring:**

**A. Performance Metrics:**

**Metrics to Track:**
- API response times: Track OpenAI API response times
- Token usage: Track token usage per request
- Cost per extraction: Track cost per document extraction
- Cache hit rate: Track rule library cache hit rate
- Error rate: Track error rate (success vs. failure)

**Performance Monitoring Implementation:**
```typescript
interface PerformanceMetrics {
  apiResponseTime: number; // milliseconds
  tokenUsage: TokenCount;
  cost: number;
  cacheHit: boolean;
  errorOccurred: boolean;
}

class PerformanceMonitor {
  async trackMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Store metrics in database
    // Aggregate for analytics
    // Alert on anomalies
  }
  
  async getAverageResponseTime(timePeriod: string): Promise<number> {
    // Query metrics
    // Calculate average
  }
}
```

**B. Health Checks:**

**Health Check Endpoints:**
- API health: Check OpenAI API availability
- Key validity: Check API key validity
- Rate limit status: Check current rate limit status
- Cache status: Check cache health

**Health Check Implementation:**
```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    api: boolean;
    keys: boolean;
    rateLimit: boolean;
    cache: boolean;
  };
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    api: await checkAPIAvailability(),
    keys: await checkKeyValidity(),
    rateLimit: await checkRateLimitStatus(),
    cache: await checkCacheHealth()
  };
  
  const allHealthy = Object.values(checks).every(c => c === true);
  const someHealthy = Object.values(checks).some(c => c === true);
  
  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks
  };
}
```

**15. TypeScript Interfaces:**

**A. Core Interfaces:**

**Request/Response Interfaces:**
```typescript
interface OpenAIRequest {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**B. Extraction Interfaces:**

**Extraction Result Interfaces:**
```typescript
interface ExtractionResult {
  id: string;
  documentId: string;
  siteId: string;
  obligations: Obligation[];
  parameters?: Parameter[];
  runHours?: RunHourRecord[];
  confidence: ConfidenceScore;
  flaggedItems: FlaggedItem[];
  cost: number;
  tokens: TokenCount;
  createdAt: Date;
}

interface ConfidenceScore {
  score: number; // 0-100
  source: 'llm' | 'rule_library' | 'combined';
  factors: {
    llmConfidence?: number;
    ruleMatch?: boolean;
    patternMatch?: number;
  };
}

interface FlaggedItem {
  obligation: Obligation;
  confidence: ConfidenceScore;
  flagReason: string;
  priority: 'low' | 'medium' | 'high';
}
```

**C. Configuration Interfaces:**

**Configuration Interfaces:**
```typescript
interface AIIntegrationConfig {
  apiKeys: APIKeyConfig;
  models: {
    primary: string;
    fallback: string;
  };
  thresholds: {
    confidence: number;
    ruleMatch: number;
  };
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  caching: CacheConfig;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  queueEnabled: boolean;
}
```

**Feeds:**
→ (No dependencies — final AI layer)

---

## **2.11 (Optional) Testing & QA Strategy** 📝

**Status:** ⏳ Optional  
**Created by:** Cursor  
**Depends on:**
→ AI Rules Library (1.6)
→ Backend API (2.5)

**Document Format:**
- Markdown format with clear sections and subsections
- Include test framework selection and setup
- Include test case specifications
- Include test data fixtures
- Include performance benchmarks
- Be specific and detailed—this is the testing implementation blueprint
- Target: 6,000-8,000 words (comprehensive testing strategy)

**What Cursor Must Create (if made required):**

This document defines the complete testing and QA strategy. It must include:

**1. Test Framework Selection:**

**A. Test Framework:**

**Unit Testing:**
- Frontend: Jest + React Testing Library
- Backend: Jest + Supertest
- Test runner: Jest (Node.js test runner)
- Assertion library: Jest built-in assertions
- Mocking: Jest mocks + MSW (Mock Service Worker)

**Integration Testing:**
- API Testing: Jest + Supertest
- Database Testing: Jest + Supabase test client
- External Services: MSW for mocking external APIs
- Background Jobs: Jest + BullMQ test utilities

**E2E Testing:**
- Framework: Playwright (recommended) or Cypress
- Browser support: Chrome, Firefox, Safari, Edge
- Test execution: Headless mode for CI/CD
- Screenshots: Automatic screenshots on failure

**Performance Testing:**
- Framework: k6 (recommended) or Artillery
- Load testing: Simulate expected user load
- Stress testing: Test under peak load conditions
- Performance monitoring: Track metrics (response time, throughput)

**Test Framework Setup:**
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};

// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**B. Test Organization:**

**Test File Structure:**
- Mirror source structure: Tests mirror source file structure
- Test location: Tests in `__tests__` folders or alongside source files
- Test naming: `*.test.ts` for unit tests, `*.spec.ts` for integration tests
- Test suites: Group related tests using `describe` blocks

**Test Organization Example:**
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
  api/
    obligations/
      index.ts
      index.test.ts
  __tests__/
    integration/
      api.test.ts
      database.test.ts
e2e/
  flows/
    onboarding.spec.ts
    document-upload.spec.ts
```

**C. Test Configuration:**

**Test Configuration Interfaces:**
```typescript
interface TestConfig {
  environment: 'test' | 'ci';
  database: {
    url: string;
    reset: boolean;
  };
  mocks: {
    openai: boolean;
    sendgrid: boolean;
    twilio: boolean;
  };
  coverage: {
    enabled: boolean;
    threshold: number;
  };
}

interface TestSuite {
  name: string;
  tests: Test[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}
```

**2. Unit Testing:**

**A. Unit Test Coverage Targets:**

**Coverage Requirements:**
- Minimum coverage: 80% for critical paths (authentication, data transformation, business logic)
- Target coverage: 90% for business logic (obligation processing, deadline calculations)
- Coverage tools: Jest coverage, Istanbul (nyc)
- Coverage reporting: Generate HTML coverage reports

**Coverage Configuration:**
```typescript
// jest.config.js coverage settings
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/business-logic/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

**B. Component Tests:**

**Component Test Examples:**
- Render components: Test component rendering
- Test interactions: Test user interactions (clicks, form submissions)
- Test props: Test component props handling
- Test state: Test component state changes
- Test accessibility: Test accessibility attributes

**Component Test Implementation:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**C. Function Tests:**

**Function Test Examples:**
- Pure functions: Test pure functions (no side effects)
- Edge cases: Test edge cases (null, undefined, empty arrays)
- Error handling: Test error conditions
- Business logic: Test business logic functions

**Function Test Implementation:**
```typescript
import { calculateDeadline, parseFrequency } from './deadline-utils';

describe('Deadline Utils', () => {
  describe('parseFrequency', () => {
    it('should parse "ANNUAL" frequency', () => {
      expect(parseFrequency('ANNUAL')).toBe('ANNUAL');
    });
    
    it('should throw error for invalid frequency', () => {
      expect(() => parseFrequency('INVALID')).toThrow('Invalid frequency');
    });
  });
  
  describe('calculateDeadline', () => {
    it('should calculate annual deadline', () => {
      const startDate = new Date('2024-01-01');
      const deadline = calculateDeadline(startDate, 'ANNUAL');
      expect(deadline).toEqual(new Date('2025-01-01'));
    });
    
    it('should handle leap years', () => {
      const startDate = new Date('2024-02-29');
      const deadline = calculateDeadline(startDate, 'ANNUAL');
      expect(deadline).toEqual(new Date('2025-02-28'));
    });
  });
});
```

**D. Hook Tests:**

**Hook Test Examples:**
- State hooks: Test useState hooks
- Effect hooks: Test useEffect hooks
- Custom hooks: Test custom hooks
- Hook interactions: Test hook interactions

**Hook Test Implementation:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useObligations } from './useObligations';

describe('useObligations Hook', () => {
  it('should fetch obligations on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useObligations('site-123'));
    
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.obligations).toHaveLength(5);
  });
  
  it('should handle errors', async () => {
    // Mock API error
    const { result, waitForNextUpdate } = renderHook(() => useObligations('site-123'));
    
    await waitForNextUpdate();
    expect(result.current.error).toBeTruthy();
  });
});
```

**E. Excel Import Tests:**

**Excel Import Test Scenarios:**
- File parsing: Test Excel file parsing (.xlsx, .xls, CSV formats)
- Column mapping: Test column mapping validation
- Data validation: Test data validation (dates, frequencies, required fields)
- Duplicate detection: Test duplicate detection logic
- Error handling: Test error handling (invalid rows, missing fields)
- Bulk creation: Test bulk obligation creation

**Excel Import Test Implementation:**
```typescript
import { parseExcelFile, validateExcelData, detectDuplicates } from './excel-import';

describe('Excel Import', () => {
  describe('parseExcelFile', () => {
    it('should parse valid .xlsx file', async () => {
      const file = new File([excelBuffer], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await parseExcelFile(file);
      
      expect(result.rows).toHaveLength(10);
      expect(result.columns).toContain('permit_number');
    });
    
    it('should parse CSV file', async () => {
      const csvContent = 'permit_number,obligation_title,frequency,deadline_date\nPERM-001,Test Obligation,ANNUAL,2024-12-31';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await parseExcelFile(file);
      
      expect(result.rows).toHaveLength(1);
    });
  });
  
  describe('validateExcelData', () => {
    it('should validate required columns', () => {
      const data = [{ permit_number: 'PERM-001' }]; // Missing required columns
      const result = validateExcelData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required column: obligation_title');
    });
    
    it('should validate date formats', () => {
      const data = [{
        permit_number: 'PERM-001',
        obligation_title: 'Test',
        frequency: 'ANNUAL',
        deadline_date: 'invalid-date'
      }];
      const result = validateExcelData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format in row 1');
    });
  });
  
  describe('detectDuplicates', () => {
    it('should detect duplicate obligations', () => {
      const data = [
        { permit_number: 'PERM-001', obligation_title: 'Test', site_id: 'site-1' },
        { permit_number: 'PERM-001', obligation_title: 'Test', site_id: 'site-1' }
      ];
      const duplicates = detectDuplicates(data);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].row).toBe(2);
    });
  });
});
```

**F. Mocking Strategy:**

**Mocking Implementation:**
- API mocks: MSW (Mock Service Worker) for API mocking
- Database mocks: Mock Supabase client
- External service mocks: Mock OpenAI, SendGrid, Twilio APIs
- File mocks: Mock file uploads

**Mocking Setup:**
```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/obligations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: '1', title: 'Test Obligation', frequency: 'ANNUAL' }
        ]
      })
    );
  }),
  
  rest.post('/api/v1/obligations', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 'new-id', ...req.body })
    );
  })
];

// src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**3. Integration Testing:**

**A. API Integration Tests:**

**API Test Scope:**
- Endpoint testing: Test all API endpoints with real database
- Authentication: Test JWT authentication
- Authorization: Test RBAC and RLS policies
- Request/Response: Test request validation and response formatting
- Error handling: Test error responses

**API Integration Test Implementation:**
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, teardownTestDatabase } from './helpers/database';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('POST /api/v1/obligations', () => {
    it('should create obligation with valid data', async () => {
      const token = await getAuthToken();
      const response = await request(app)
        .post('/api/v1/obligations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          document_id: 'doc-123',
          site_id: 'site-123',
          obligation_title: 'Test Obligation',
          frequency: 'ANNUAL',
          deadline_date: '2024-12-31'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.obligation_title).toBe('Test Obligation');
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/obligations')
        .send({ obligation_title: 'Test' });
      
      expect(response.status).toBe(401);
    });
    
    it('should return 400 for invalid data', async () => {
      const token = await getAuthToken();
      const response = await request(app)
        .post('/api/v1/obligations')
        .set('Authorization', `Bearer ${token}`)
        .send({ obligation_title: '' }); // Missing required fields
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

**B. Database Integration Tests:**

**Database Test Scope:**
- Query testing: Test database queries with real data
- RLS policies: Test Row Level Security policies
- Transactions: Test transaction handling
- Constraints: Test database constraints
- Migrations: Test database migrations

**Database Integration Test Implementation:**
```typescript
import { createClient } from '@supabase/supabase-js';
import { setupTestDatabase } from './helpers/database';

describe('Database Integration Tests', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SERVICE_KEY!);
    await setupTestDatabase();
  });
  
  describe('RLS Policies', () => {
    it('should enforce RLS for user data', async () => {
      // Test as user A
      const userASupabase = createClient(process.env.TEST_SUPABASE_URL!, userAToken);
      const { data, error } = await userASupabase
        .from('obligations')
        .select('*')
        .eq('site_id', 'site-b'); // User A should not access Site B
      
      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });
  });
  
  describe('Database Queries', () => {
    it('should query obligations by site', async () => {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('site_id', 'site-123');
      
      expect(error).toBeNull();
      expect(data).toHaveLength(5);
    });
  });
});
```

**C. External Service Integration Tests:**

**External Service Test Scope:**
- OpenAI API: Test OpenAI API integration (mocked)
- SendGrid: Test email sending (mocked)
- Twilio: Test SMS sending (mocked)
- Service failures: Test service failure handling

**External Service Test Implementation:**
```typescript
import { server } from '../test/mocks/server';
import { rest } from 'msw';

describe('External Service Integration', () => {
  describe('OpenAI API', () => {
    it('should call OpenAI API for document extraction', async () => {
      server.use(
        rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
          return res(ctx.json({
            choices: [{
              message: { content: JSON.stringify({ obligations: [] }) }
            }]
          }));
        })
      );
      
      const result = await extractObligations('document-id');
      expect(result).toBeDefined();
    });
  });
});
```

**D. Background Job Integration Tests:**

**Background Job Test Scope:**
- Job execution: Test job execution with BullMQ
- Retry logic: Test job retry logic
- DLQ handling: Test Dead-Letter Queue handling
- Job status: Test job status updates

**Background Job Test Implementation:**
```typescript
import { Queue } from 'bullmq';
import { processDocumentJob } from '../src/jobs/document-processing';

describe('Background Job Integration', () => {
  let queue: Queue;
  
  beforeAll(() => {
    queue = new Queue('document-processing', {
      connection: { host: 'localhost', port: 6379 }
    });
  });
  
  it('should process document job successfully', async () => {
    const job = await queue.add('process-document', {
      documentId: 'doc-123',
      siteId: 'site-123'
    });
    
    await job.waitUntilFinished(queue);
    
    expect(job.returnvalue.status).toBe('COMPLETED');
  });
  
  it('should retry failed jobs', async () => {
    // Mock failure
    const job = await queue.add('process-document', {
      documentId: 'invalid-doc'
    });
    
    await job.waitUntilFinished(queue);
    expect(job.attemptsMade).toBeGreaterThan(1);
  });
});
```

**E. Excel Import Integration Tests:**

**Excel Import Integration Test Scenarios:**
- Full flow: Excel upload → validation → preview → confirmation → obligation creation
- Background job: Excel import job execution
- Error handling: Invalid file format, missing columns, validation errors
- Notifications: Import ready for review, import completed, import failed
- Database operations: Create obligations, link to permits/sites, track import source

**Excel Import Integration Test Implementation:**
```typescript
describe('Excel Import Integration', () => {
  it('should complete full Excel import flow', async () => {
    // 1. Upload Excel file
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelBuffer, 'test.xlsx');
    
    expect(uploadResponse.status).toBe(201);
    const importId = uploadResponse.body.data.id;
    
    // 2. Get preview
    const previewResponse = await request(app)
      .get(`/api/v1/obligations/import/excel/${importId}/preview`);
    
    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.data.validRows).toHaveLength(10);
    
    // 3. Confirm import
    const confirmResponse = await request(app)
      .post(`/api/v1/obligations/import/excel/${importId}/confirm`);
    
    expect(confirmResponse.status).toBe(200);
    
    // 4. Verify obligations created
    const obligationsResponse = await request(app)
      .get('/api/v1/obligations')
      .query({ site_id: 'site-123' });
    
    expect(obligationsResponse.body.data).toHaveLength(10);
  });
  
  it('should handle invalid Excel file', async () => {
    const response = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', invalidExcelBuffer, 'invalid.xlsx');
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('Invalid file format');
  });
});
```

**F. Test Database Setup:**

**Test Database Configuration:**
- Separate database: Use separate Supabase test project
- Data seeding: Seed test data before tests
- Data cleanup: Clean up test data after tests
- Isolation: Isolate test data per test suite

**Test Database Setup Implementation:**
```typescript
import { createClient } from '@supabase/supabase-js';

export async function setupTestDatabase(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Seed test data
  await supabase.from('companies').insert({ id: 'company-123', name: 'Test Company' });
  await supabase.from('sites').insert({ id: 'site-123', company_id: 'company-123', name: 'Test Site' });
}

export async function teardownTestDatabase(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Clean up test data
  await supabase.from('obligations').delete().eq('site_id', 'site-123');
  await supabase.from('sites').delete().eq('id', 'site-123');
  await supabase.from('companies').delete().eq('id', 'company-123');
}
```

**4. End-to-End Testing:**

**A. E2E Test Framework:**

**Framework Selection:**
- Framework: Playwright (recommended) or Cypress
- Browser support: Chrome, Firefox, Safari, Edge
- Test execution: Headless mode for CI/CD
- Screenshots: Automatic screenshots on failure
- Video recording: Record videos of test runs (optional)

**E2E Test Framework Setup:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**B. E2E Test Scenarios:**

**User Signup and Login:**
- Signup flow: Test user registration
- Email verification: Test email verification flow
- Login flow: Test user login
- Password reset: Test password reset flow

**E2E Test Implementation:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="companyName"]', 'Test Company');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/verify-email/);
  });
  
  test('should login existing user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

**Document Upload and Extraction:**
- Upload flow: Test PDF document upload
- Extraction: Test AI extraction process
- Review: Test obligation review flow
- Editing: Test obligation editing

**Document Upload E2E Test:**
```typescript
test.describe('Document Upload', () => {
  test('should upload and extract obligations from PDF', async ({ page }) => {
    await page.goto('/sites/site-123/documents/upload');
    
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test/fixtures/sample-permit.pdf');
    
    // Wait for upload
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="extraction-status"]')).toContainText('Processing');
    
    // Wait for extraction
    await expect(page.locator('[data-testid="extraction-complete"]')).toBeVisible({ timeout: 60000 });
    
    // Verify obligations extracted
    const obligations = page.locator('[data-testid="obligation-item"]');
    await expect(obligations).toHaveCount(5);
  });
});
```

**Excel Import Workflow:**
- Excel upload: User uploads Excel file
- Preview: User reviews preview
- Confirmation: User confirms import
- Obligation creation: Verify obligations created

**Excel Import E2E Test:**
```typescript
test.describe('Excel Import', () => {
  test('should import obligations from Excel file', async ({ page }) => {
    await page.goto('/sites/site-123/obligations/import/excel');
    
    // Upload Excel file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test/fixtures/obligations.xlsx');
    
    // Wait for preview
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="valid-rows"]')).toContainText('10');
    
    // Confirm import
    await page.click('button[data-testid="confirm-import"]');
    
    // Wait for completion
    await expect(page.locator('[data-testid="import-complete"]')).toBeVisible();
    
    // Verify obligations created
    await page.goto('/sites/site-123/obligations');
    const obligations = page.locator('[data-testid="obligation-item"]');
    await expect(obligations).toHaveCount(10);
  });
});
```

**C. Test Data Management:**

**Test Data Fixtures:**
- Pre-defined data: Create reusable test data fixtures
- Data isolation: Isolate test data per test
- Data cleanup: Clean up test data after tests
- Data factories: Use factories to generate test data

**Test Data Fixtures Implementation:**
```typescript
// test/fixtures/users.ts
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'OWNER'
  },
  staff: {
    email: 'staff@test.com',
    password: 'password123',
    role: 'STAFF'
  }
};

// test/fixtures/companies.ts
export const testCompanies = {
  company1: {
    id: 'company-123',
    name: 'Test Company 1'
  }
};

// test/fixtures/sites.ts
export const testSites = {
  site1: {
    id: 'site-123',
    company_id: 'company-123',
    name: 'Test Site 1'
  }
};

// test/helpers/test-data.ts
export async function createTestUser(userData: any) {
  // Create user in test database
}

export async function cleanupTestData() {
  // Clean up all test data
}
```

**5. Permit Parsing Test Suite:**

**A. Test Permits:**

**Test Permit Collection:**
- 50+ test permits: EA, SEPA, NRW permits
- Variety: Different permit types, formats, complexities
- Expected results: Pre-defined expected extractions
- Permit storage: Store test permits in `test/fixtures/permits/`

**Test Permit Structure:**
```typescript
interface TestPermit {
  id: string;
  filename: string;
  regulator: 'EA' | 'SEPA' | 'NRW';
  permitType: string;
  expectedObligations: Array<{
    title: string;
    frequency: string;
    deadline_date?: string;
    is_subjective: boolean;
  }>;
  expectedParameters?: Array<{
    name: string;
    limit: number;
    unit: string;
  }>;
}

// test/fixtures/permits/index.ts
export const testPermits: TestPermit[] = [
  {
    id: 'ea-permit-001',
    filename: 'ea-permit-001.pdf',
    regulator: 'EA',
    permitType: 'Environmental Permit',
    expectedObligations: [
      { title: 'Annual Compliance Report', frequency: 'ANNUAL', is_subjective: false },
      { title: 'Monitor emissions', frequency: 'MONTHLY', is_subjective: false }
    ]
  },
  // ... more test permits
];
```

**B. Extraction Accuracy Validation:**

**Accuracy Metrics:**
- Objective obligations: Test extraction accuracy (target: 90%+)
- Subjective obligations: Test subjective detection (target: 85%+)
- Overall accuracy: Test overall extraction accuracy (target: 85%+)
- Precision: Test precision (correct extractions / total extractions)
- Recall: Test recall (correct extractions / expected extractions)

**Accuracy Validation Implementation:**
```typescript
import { extractObligations } from '../src/ai-integration';
import { testPermits } from './fixtures/permits';

describe('Permit Parsing Accuracy', () => {
  test.each(testPermits)('should extract obligations from $id', async (permit) => {
    const result = await extractObligations(permit.filename);
    
    // Calculate accuracy
    const accuracy = calculateAccuracy(result.obligations, permit.expectedObligations);
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });
  
  function calculateAccuracy(extracted: any[], expected: any[]): number {
    let correct = 0;
    for (const expectedObligation of expected) {
      const match = extracted.find(e => 
        e.title === expectedObligation.title &&
        e.frequency === expectedObligation.frequency
      );
      if (match) correct++;
    }
    return correct / expected.length;
  }
});
```

**C. Subjective Detection Testing:**

**Subjective Detection:**
- Test subjective detection: Test if subjective obligations are correctly flagged
- Test objective detection: Test if objective obligations are not flagged
- Test confidence scores: Test confidence scores for subjective vs objective

**Subjective Detection Test:**
```typescript
describe('Subjective Detection', () => {
  it('should flag subjective obligations', async () => {
    const result = await extractObligations('subjective-permit.pdf');
    
    const subjectiveObligations = result.obligations.filter(o => o.is_subjective);
    expect(subjectiveObligations.length).toBeGreaterThan(0);
    
    // All subjective obligations should be flagged for review
    for (const obligation of subjectiveObligations) {
      expect(obligation.flagged_for_review).toBe(true);
    }
  });
});
```

**6. Module 2/3 Cross-Sell Trigger Testing:**

**A. Effluent Keyword Detection:**

**Keyword Detection Tests:**
- Test keyword detection: Test if effluent keywords are detected in permits
- Test trigger creation: Test if cross-sell triggers are created
- Test notification: Test if users are notified of triggers

**Effluent Keyword Detection Test:**
```typescript
describe('Module 2 Cross-Sell Triggers', () => {
  it('should detect effluent keywords in permit', async () => {
    const permit = await loadPermit('effluent-permit.pdf');
    const triggers = await detectCrossSellTriggers(permit);
    
    expect(triggers).toContainEqual({
      type: 'MODULE_2_EFFLUENT',
      keywords: ['effluent', 'discharge', 'trade effluent'],
      confidence: 0.95
    });
  });
  
  it('should create cross-sell trigger record', async () => {
    const trigger = await createCrossSellTrigger({
      site_id: 'site-123',
      module: 'MODULE_2',
      trigger_type: 'EFFLUENT_KEYWORDS',
      keywords: ['effluent', 'discharge']
    });
    
    expect(trigger.id).toBeDefined();
    expect(trigger.status).toBe('PENDING');
  });
});
```

**B. Run-Hour Breach Detection:**

**Breach Detection Tests:**
- Test breach detection: Test if run-hour breaches are detected
- Test trigger creation: Test if triggers are created for breaches
- Test notification: Test if users are notified of breaches

**Run-Hour Breach Detection Test:**
```typescript
describe('Module 3 Cross-Sell Triggers', () => {
  it('should detect run-hour breach in MCPD registration', async () => {
    const registration = await loadMCPDRegistration('mcpd-registration.pdf');
    const breaches = await detectRunHourBreaches(registration);
    
    expect(breaches.length).toBeGreaterThan(0);
    expect(breaches[0].generator_name).toBeDefined();
    expect(breaches[0].run_hours).toBeGreaterThan(breaches[0].limit);
  });
});
```

**C. Trigger Accuracy:**

**Trigger Accuracy Tests:**
- Test false positives: Test if triggers are not created incorrectly
- Test false negatives: Test if triggers are not missed
- Test accuracy: Test overall trigger detection accuracy (target: 90%+)

**Trigger Accuracy Test:**
```typescript
describe('Trigger Accuracy', () => {
  it('should have high accuracy for effluent keyword detection', async () => {
    const testPermits = await loadTestPermits('effluent');
    let correct = 0;
    
    for (const permit of testPermits) {
      const triggers = await detectCrossSellTriggers(permit);
      const hasEffluent = permit.content.toLowerCase().includes('effluent');
      
      if (hasEffluent && triggers.length > 0) correct++;
      if (!hasEffluent && triggers.length === 0) correct++;
    }
    
    const accuracy = correct / testPermits.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.90);
  });
});
```

**7. Performance Benchmarks:**

**A. Performance Targets:**

**Response Time Targets:**
- Document parsing: 60 seconds target (see PLS Section B.5)
- API response times: <200ms for simple queries, <1s for complex queries
- Page load times: <2s for initial load, <500ms for navigation
- Background job execution: Job-specific targets (see Background Jobs Spec 2.3)

**Performance Target Configuration:**
```typescript
interface PerformanceTargets {
  documentParsing: {
    maxTime: number; // 60000ms (60 seconds)
    p95Time: number; // 45000ms (45 seconds)
  };
  apiResponse: {
    simpleQueries: number; // 200ms
    complexQueries: number; // 1000ms
  };
  pageLoad: {
    initialLoad: number; // 2000ms
    navigation: number; // 500ms
  };
}

export const performanceTargets: PerformanceTargets = {
  documentParsing: {
    maxTime: 60000,
    p95Time: 45000
  },
  apiResponse: {
    simpleQueries: 200,
    complexQueries: 1000
  },
  pageLoad: {
    initialLoad: 2000,
    navigation: 500
  }
};
```

**B. Performance Testing:**

**Load Testing:**
- Simulate expected load: Test with expected number of concurrent users
- Measure response times: Track API response times under load
- Measure throughput: Track requests per second
- Identify bottlenecks: Identify performance bottlenecks

**Load Testing Implementation:**
```typescript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  },
};

export default function () {
  const response = http.get('https://api.example.com/api/v1/obligations');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**C. Stress Testing:**

**Stress Testing:**
- Test peak load: Test under peak load conditions (2x expected load)
- Test failure points: Identify failure points
- Test recovery: Test system recovery after stress

**Stress Testing Implementation:**
```typescript
// k6 stress test script
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 0 },
  ],
};
```

**D. Performance Monitoring:**

**Performance Monitoring:**
- Track metrics: Track response times, throughput, error rates
- Set alerts: Alert on performance degradation
- Analyze trends: Analyze performance trends over time

**Performance Monitoring Implementation:**
```typescript
import { performance } from 'perf_hooks';

export async function trackPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance metric
    await logPerformanceMetric({
      name,
      duration,
      timestamp: new Date()
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    await logPerformanceMetric({
      name,
      duration,
      error: error.message,
      timestamp: new Date()
    });
    throw error;
  }
}
```

**8. Test Data Management:**

**A. Test Data Fixtures:**

**Fixture Types:**
- User fixtures: Test users with different roles (OWNER, STAFF, CONSULTANT, VIEWER)
- Company fixtures: Test companies
- Site fixtures: Test sites
- Document fixtures: Test permits, consents, MCPD registrations
- Obligation fixtures: Test obligations
- Evidence fixtures: Test evidence items

**Test Data Fixtures Implementation:**
```typescript
// test/fixtures/users.ts
export const userFixtures = {
  owner: {
    id: 'user-owner-123',
    email: 'owner@test.com',
    password: 'password123',
    role: 'OWNER',
    company_id: 'company-123'
  },
  staff: {
    id: 'user-staff-123',
    email: 'staff@test.com',
    password: 'password123',
    role: 'STAFF',
    company_id: 'company-123'
  }
};

// test/fixtures/obligations.ts
export const obligationFixtures = [
  {
    id: 'obligation-123',
    document_id: 'doc-123',
    site_id: 'site-123',
    obligation_title: 'Annual Compliance Report',
    frequency: 'ANNUAL',
    deadline_date: new Date('2024-12-31'),
    is_subjective: false
  }
];

// test/fixtures/excel-import.ts
export const excelImportFixtures = {
  valid: {
    filename: 'valid-obligations.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 10
  },
  invalid: {
    filename: 'invalid-obligations.xlsx',
    columns: ['permit_number'], // Missing required columns
    rowCount: 5
  },
  validationErrors: {
    filename: 'validation-errors.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    errors: ['Invalid date format', 'Invalid frequency value']
  },
  duplicates: {
    filename: 'duplicates.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    duplicateRows: [2, 5] // Rows 2 and 5 are duplicates
  },
  large: {
    filename: 'large-file.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 10000
  },
  csv: {
    filename: 'obligations.csv',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 20
  },
  optionalColumns: {
    filename: 'optional-columns.xlsx',
    columns: [
      'permit_number',
      'obligation_title',
      'frequency',
      'deadline_date',
      'site_id',
      'permit_type',
      'permit_date',
      'regulator',
      'evidence_linked',
      'notes'
    ],
    rowCount: 15
  }
};
```

**B. Test Data Seeding:**

**Seeding Strategy:**
- Seed scripts: SQL scripts to seed test data
- Seed functions: TypeScript functions to seed test data
- Seed cleanup: Clean up seeded data after tests
- Seed isolation: Isolate seed data per test suite

**Test Data Seeding Implementation:**
```typescript
// test/helpers/seed.ts
import { createClient } from '@supabase/supabase-js';
import { userFixtures, obligationFixtures } from '../fixtures';

export async function seedTestData(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Seed users
  for (const user of Object.values(userFixtures)) {
    await supabase.from('users').insert(user);
  }
  
  // Seed obligations
  await supabase.from('obligations').insert(obligationFixtures);
}

export async function cleanupTestData(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Clean up in reverse order (respect foreign keys)
  await supabase.from('obligations').delete().in('id', obligationFixtures.map(o => o.id));
  await supabase.from('users').delete().in('id', Object.values(userFixtures).map(u => u.id));
}
```

**C. Test Data Factories:**

**Data Factories:**
- Generate test data: Generate test data programmatically
- Randomize data: Randomize test data for variety
- Factory functions: Create factory functions for each entity type

**Test Data Factory Implementation:**
```typescript
// test/factories/obligation-factory.ts
import { faker } from '@faker-js/faker';

export function createObligation(overrides?: Partial<Obligation>): Obligation {
  return {
    id: faker.string.uuid(),
    document_id: faker.string.uuid(),
    site_id: faker.string.uuid(),
    obligation_title: faker.lorem.sentence(),
    frequency: faker.helpers.arrayElement(['ANNUAL', 'MONTHLY', 'QUARTERLY']),
    deadline_date: faker.date.future(),
    is_subjective: faker.datatype.boolean(),
    ...overrides
  };
}

export function createObligations(count: number): Obligation[] {
  return Array.from({ length: count }, () => createObligation());
}
```

**9. CI/CD Integration:**

**A. CI/CD Pipeline Configuration:**

**Pipeline Stages:**
- Install dependencies: Install npm packages
- Lint: Run ESLint
- Unit tests: Run unit tests
- Integration tests: Run integration tests
- E2E tests: Run E2E tests (optional, can run in parallel)
- Coverage: Generate coverage reports
- Build: Build application

**CI/CD Pipeline Implementation:**
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**B. Test Reporting:**

**Test Reports:**
- Console output: Test results in console
- HTML reports: Generate HTML test reports
- Coverage reports: Generate coverage reports
- Test artifacts: Store test artifacts (screenshots, videos)

**C. Test Failure Handling:**

**Failure Handling:**
- Fail build: Fail build on test failures
- Retry logic: Retry flaky tests
- Notifications: Notify team on test failures

**10. Test Maintenance:**

**A. Test Maintenance Strategy:**

**Test Updates:**
- Update tests: Update tests when code changes
- Refactor tests: Refactor tests for maintainability
- Remove obsolete: Remove obsolete tests

**B. Test Review:**

**Test Review Process:**
- Regular reviews: Review tests regularly (monthly)
- Code coverage: Monitor code coverage trends
- Test quality: Ensure test quality standards

**C. Test Cleanup:**

**Test Cleanup:**
- Remove obsolete: Remove obsolete tests
- Consolidate duplicates: Consolidate duplicate tests
- Optimize performance: Optimize slow tests

**11. TypeScript Interfaces:**

**A. Test Configuration Interfaces:**

**Test Config Interfaces:**
```typescript
interface TestConfig {
  environment: 'test' | 'ci';
  database: {
    url: string;
    reset: boolean;
  };
  mocks: {
    openai: boolean;
    sendgrid: boolean;
    twilio: boolean;
  };
  coverage: {
    enabled: boolean;
    threshold: number;
  };
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}
```

**B. Test Data Interfaces:**

**Test Data Interfaces:**
```typescript
interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'OWNER' | 'STAFF' | 'CONSULTANT' | 'VIEWER';
  company_id: string;
}

interface TestObligation {
  id: string;
  document_id: string;
  site_id: string;
  obligation_title: string;
  frequency: string;
  deadline_date: Date;
  is_subjective: boolean;
}

interface TestPermit {
  id: string;
  filename: string;
  regulator: 'EA' | 'SEPA' | 'NRW';
  expectedObligations: TestObligation[];
}
```

---

## **2.12 (Optional) Deployment & DevOps Strategy** 📝

**Status:** ⏳ Optional  
**Created by:** Cursor  
**Depends on:**
→ Technical Architecture (2.1)
→ Database Schema (2.2)

**Document Format:**
- Markdown format with clear sections and subsections
- Include environment configuration files
- Include deployment scripts
- Include monitoring setup
- Include CI/CD pipeline configuration
- Be specific and detailed—this is the deployment implementation blueprint
- Target: 6,000-8,000 words (comprehensive deployment strategy)

**What Cursor Must Create (if made required):**

This document defines the complete deployment and DevOps strategy. It must include:

**1. Environment Configuration:**

**Environment Variables:**
- **Required Variables:**
  - `DATABASE_URL`: Supabase database URL
  - `SUPABASE_URL`: Supabase project URL
  - `SUPABASE_ANON_KEY`: Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
  - `OPENAI_API_KEY`: OpenAI API key
  - `SENDGRID_API_KEY`: SendGrid API key (email)
  - `TWILIO_ACCOUNT_SID`: Twilio account SID (SMS)
  - `TWILIO_AUTH_TOKEN`: Twilio auth token
  - `REDIS_URL`: Redis connection URL (BullMQ)
  - `NODE_ENV`: Environment (development, staging, production)
- **Optional Variables:**
  - `LOG_LEVEL`: Logging level (debug, info, warn, error)
  - `SENTRY_DSN`: Sentry DSN (error tracking)
  - `ANALYTICS_ID`: Analytics ID

**Environment-Specific Configs:**
- **Development:** Local development configuration
- **Staging:** Staging environment configuration
- **Production:** Production environment configuration

**Secrets Management:**
- **Storage:** Environment variables (Vercel, Supabase secrets)
- **Rotation:** Key rotation procedures
- **Access:** Access control for secrets

**2. Supabase Configuration:**

**RLS Configuration:**
- **RLS Policies:** Deploy RLS policies via migrations
- **Policy Testing:** Test RLS policies before deployment
- **Policy Rollback:** Rollback procedures for RLS policies

**Storage Buckets:**
- **Buckets:** documents, evidence, audit-packs, aer-documents
- **Bucket Configuration:** Public/private settings, CORS settings
- **Bucket Policies:** Storage policies for access control

**Edge Functions:**
- **Functions:** Document processing, notification delivery
- **Function Deployment:** Deploy edge functions via Supabase CLI
- **Function Monitoring:** Monitor function execution, errors

**Database Migrations:**
- **Migration Tool:** Supabase CLI migrations
- **Migration Files:** SQL migration files in `supabase/migrations/`
- **Migration Versioning:** Timestamp-based versioning
- **Migration Testing:** Test migrations on staging before production

**3. OpenAI API Key Management:**

**API Key Storage:**
- **Storage:** Environment variables (Vercel, Supabase secrets)
- **Access:** Restricted access to API keys
- **Rotation:** Key rotation procedures (every 90 days)

**API Key Rotation:**
- **Rotation Process:** Generate new key, update environment, test, deploy
- **Rollback:** Rollback to previous key if issues
- **Monitoring:** Monitor API key usage, errors

**4. Database Migration Strategy:**

**Migration Version Control:**
- **Versioning:** Timestamp-based versioning (`YYYYMMDDHHMMSS_description.sql`)
- **Version Tracking:** Track applied migrations in `schema_migrations` table
- **Version History:** Maintain migration history

**Migration Process:**
- **Development:** Create migration locally, test
- **Staging:** Apply migration to staging, test
- **Production:** Apply migration to production, verify

**Rollback Procedures:**
- **Rollback Strategy:** Create rollback migrations
- **Rollback Testing:** Test rollback procedures
- **Rollback Execution:** Execute rollback if issues

**5. Monitoring & Logging:**

**Error Tracking:**
- **Service:** Sentry (recommended) or similar
- **Error Collection:** Collect errors from frontend and backend
- **Error Alerts:** Alert on critical errors
- **Error Analysis:** Analyze error trends

**Performance Monitoring:**
- **Service:** Vercel Analytics, Supabase Analytics
- **Metrics:** API response times, page load times, database query times
- **Alerts:** Alert on performance degradation
- **Analysis:** Analyze performance trends

**Audit Log Retention:**
- **Retention Policy:** Retain audit logs for 90 days (configurable)
- **Log Storage:** Store logs in `audit_logs` table
- **Log Archival:** Archive old logs (optional)

**6. CI/CD Pipeline:**

**A. Pipeline Stages:**

**Pipeline Configuration:**
- Build: Build application (Next.js build)
- Test: Run tests (unit, integration, E2E)
- Lint: Run ESLint and TypeScript checks
- Deploy Staging: Deploy to staging environment
- Deploy Production: Deploy to production (manual approval)

**CI/CD Pipeline Implementation:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
  
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://app.epcompliance.com
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

**B. Pipeline Triggers:**

**Trigger Configuration:**
- Push to main: Trigger production deployment (with approval)
- Push to develop: Trigger staging deployment (automatic)
- Pull Request: Run tests and build (no deployment)
- Manual: Manual trigger for production deployment

**C. Deployment Workflows:**

**Staging Deployment:**
- Automatic: Deploy automatically on push to develop
- No approval: No manual approval required
- Rollback: Easy rollback if issues

**Production Deployment:**
- Manual approval: Require manual approval before deployment
- Approval workflow: Use GitHub Environments for approval
- Rollback: Rollback to previous version if issues

**Deployment Workflow Implementation:**
```typescript
// scripts/deploy.ts
import { execSync } from 'child_process';

export async function deployToStaging(): Promise<void> {
  console.log('Deploying to staging...');
  
  // Run tests
  execSync('npm run test', { stdio: 'inherit' });
  
  // Build
  execSync('npm run build', { stdio: 'inherit' });
  
  // Deploy to Vercel staging
  execSync('vercel --prod --env=staging', { stdio: 'inherit' });
  
  console.log('Staging deployment complete');
}

export async function deployToProduction(): Promise<void> {
  console.log('Deploying to production...');
  
  // Run tests
  execSync('npm run test', { stdio: 'inherit' });
  
  // Build
  execSync('npm run build', { stdio: 'inherit' });
  
  // Deploy to Vercel production
  execSync('vercel --prod', { stdio: 'inherit' });
  
  console.log('Production deployment complete');
}
```

**7. Deployment Procedures:**

**Pre-Deployment Checklist:**
- All tests passing
- Migrations tested on staging
- Environment variables configured
- Secrets rotated (if needed)
- Backup database (production)

**Deployment Steps:**
1. Run tests
2. Build application
3. Run database migrations (staging first)
4. Deploy to staging
5. Verify staging deployment
6. Deploy to production (with approval)
7. Verify production deployment
8. Monitor for issues

**Post-Deployment Verification:**
- Verify application is running
- Verify database migrations applied
- Verify API endpoints working
- Verify background jobs running
- Monitor error logs

**8. Rollback Procedures:**

**A. Rollback Triggers:**

**Rollback Conditions:**
- Critical errors: Critical errors in production (500 errors, crashes)
- Performance degradation: Significant performance degradation (>50% slower)
- Data integrity issues: Data corruption or integrity issues
- Security issues: Security vulnerabilities discovered

**Rollback Decision Matrix:**
```typescript
interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
}

function shouldRollback(errorRate: number, responseTime: number): RollbackDecision {
  if (errorRate > 0.1) { // >10% error rate
    return {
      shouldRollback: true,
      reason: 'High error rate detected',
      severity: 'critical'
    };
  }
  
  if (responseTime > 2000) { // >2s response time
    return {
      shouldRollback: true,
      reason: 'Performance degradation detected',
      severity: 'high'
    };
  }
  
  return {
    shouldRollback: false,
    reason: 'No issues detected',
    severity: 'medium'
  };
}
```

**B. Rollback Process:**

**Rollback Steps:**
1. Identify issue: Identify the issue causing problems
2. Decide to rollback: Make decision to rollback
3. Rollback application: Rollback application to previous version (Vercel rollback)
4. Rollback database migrations: Rollback database migrations if needed
5. Verify rollback: Verify rollback success
6. Investigate issue: Investigate root cause
7. Fix issue: Fix the issue
8. Re-deploy: Re-deploy after fix

**Rollback Implementation:**
```typescript
// scripts/rollback.ts
import { execSync } from 'child_process';

export async function rollbackApplication(): Promise<void> {
  console.log('Rolling back application...');
  
  // Get previous deployment
  const deployments = execSync('vercel ls', { encoding: 'utf-8' });
  const previousDeployment = parseDeployments(deployments)[1]; // Second most recent
  
  // Rollback to previous deployment
  execSync(`vercel rollback ${previousDeployment.id}`, { stdio: 'inherit' });
  
  console.log('Application rollback complete');
}

export async function rollbackDatabaseMigration(migrationName: string): Promise<void> {
  console.log(`Rolling back database migration: ${migrationName}`);
  
  // Run rollback migration
  execSync(`supabase migration rollback ${migrationName}`, { stdio: 'inherit' });
  
  console.log('Database migration rollback complete');
}
```

**C. Rollback Verification:**

**Verification Steps:**
- Application status: Verify application is running
- Error rate: Verify error rate is back to normal
- Performance: Verify performance is back to normal
- Data integrity: Verify data integrity

**Rollback Verification Implementation:**
```typescript
export async function verifyRollback(): Promise<boolean> {
  // Check application health
  const healthCheck = await fetch('https://app.epcompliance.com/api/health');
  if (!healthCheck.ok) {
    return false;
  }
  
  // Check error rate
  const errorRate = await getErrorRate();
  if (errorRate > 0.05) { // >5% error rate
    return false;
  }
  
  // Check response time
  const responseTime = await getAverageResponseTime();
  if (responseTime > 1000) { // >1s response time
    return false;
  }
  
  return true;
}
```

**9. TypeScript Interfaces:**

**A. Deployment Configuration Interfaces:**

**Deployment Config Interfaces:**
```typescript
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildId: string;
  deployedAt: Date;
  deployedBy: string;
}

interface EnvironmentConfig {
  name: string;
  url: string;
  database: {
    url: string;
    migrations: string[];
  };
  secrets: Record<string, string>;
}

interface RollbackConfig {
  enabled: boolean;
  previousVersion: string;
  rollbackReason: string;
  rollbackBy: string;
  rollbackAt: Date;
}
```

**B. Monitoring Interfaces:**

**Monitoring Interfaces:**
```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    openai: boolean;
    sendgrid: boolean;
  };
  timestamp: Date;
}

interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}
```

---

# ✅ **FINAL BUILD ORDER (DO NOT DEVIATE)**

## **STEP 1 – CLAUDE (Foundation & Business Logic)**

1. ✅ **MCP** (already done)
2. ✅ **Product Logic Specification (PLS)** (1.1) — *Complete (includes Module 2/3, AER logic, and all 31 issue fixes)*
3. ✅ **Canonical Dictionary** (1.2) — *Complete*
4. ✅ **User Workflow Maps** (1.3) — *Complete*
5. ❌ ~~**Module 2 & 3 Workflow Specifications** (1.4)~~ — *SUPERSEDED by PLS Sections C.2 & C.3*
6. ❌ ~~**AER Specification** (1.5)~~ — *SUPERSEDED by PLS Section C.3.8*
7. ✅ **AI Layer Design & Cost Optimization** (1.5a) — *Complete*
8. ✅ **AI Extraction Rules Library** (1.6) — *Complete*
9. ✅ **AI Microservice Prompts** (1.7) — *Complete - 29 production-ready prompts*
10. ⏳ (Optional) **Pricing Model Explorer** (1.8)
11. ⏳ (Optional) **Marketing Messaging Packs** (1.9)

## **STEP 2 – CURSOR (Engineering Artifacts)**

12. ✅ **Technical Architecture & Stack** (2.1) — *Complete*
13. ✅ **Database Schema** (2.2) — *Complete*
14. ⏳ **Background Jobs Specification** (2.3)
15. ⏳ **Notification & Messaging Specification** (2.4)
16. ⏳ **Backend API Specification** (2.5)
17. ⏳ **Frontend Routes & Component Map** (2.6)
18. ⏳ **Onboarding Flow Specification** (2.7)
19. ⏳ **RLS & Permissions Rules** (2.8)
20. ⏳ **UI/UX Design System** (2.9)
21. ⏳ **AI Integration Layer** (2.10) — *Depends on 1.5a, 1.6, 1.7, 2.5*
22. ⏳ (Optional) **Testing & QA Strategy** (2.11)
23. ⏳ (Optional) **Deployment & DevOps Strategy** (2.12)

---

# 🔗 **DEPENDENCY MAP**

## **Critical Path Dependencies**

```
MCP (0.1)
  ├─→ Product Logic Specification (1.1)
  │     ├─→ Canonical Dictionary (1.2)
  │     │     ├─→ User Workflow Maps (1.3)
  │     │     │     ├─→ AI Layer Design & Cost Optimization (1.5a)
  │     │     │     │     ├─→ AI Extraction Rules Library (1.6)
  │     │     │     │     │     └─→ AI Microservice Prompts (1.7)
  │     │     │     │     │           │
  │     │     │     │     │           └─→ AI Integration Layer (2.10)
  │     │     │     │     │
  │     │     │     │     └─→ AI Integration Layer (2.10)
  │     │     │     │
  │     │     │     ├─→ Technical Architecture (2.1)
  │     │     │     │     └─→ Database Schema (2.2)
  │     │     │     │           ├─→ Background Jobs (2.3)
  │     │     │     │           │     └─→ Notification & Messaging (2.4)
  │     │     │     │           │           └─→ Backend API (2.5)
  │     │     │     │           │                 ├─→ Frontend Routes (2.6)
  │     │     │     │           │                 │     ├─→ Onboarding Flow (2.7)
  │     │     │     │           │                 │     └─→ UI/UX Design System (2.9)
  │     │     │     │           │                 │
  │     │     │     │           │                 └─→ AI Integration Layer (2.10)
  │     │     │     │           │
  │     │     │     │           └─→ RLS & Permissions (2.8)
  │     │     │     │
  │     │     │     └─→ (All Cursor documents depend on User Workflow Maps)
  │     │     │
  │     │     └─→ (Canonical Dictionary feeds all terminology)
  │     │
  │     └─→ (Product Logic Specification includes Module 2/3 & AER logic - no separate docs needed)
```

---

> [v1 UPDATE – v1.0 Features Build Order – 2024-12-27]

# 🔵 **LEVEL 2.5 — v1.0 COMMERCIAL CAPABILITIES**

## **v1.0 Pack Types Implementation Order**

**Status:** ✅ Complete  
**Added:** 2024-12-27

### Build Sequence:

1. **Foundation (Database & Logic)**
   - ✅ Extend `audit_packs` table with `pack_type` and distribution fields
   - ✅ Create `consultant_client_assignments` table
   - ✅ Create `pack_distributions` table
   - ✅ Add pack type enum to Canonical Dictionary
   - ✅ Add pack generation logic to Product Logic Specification (Section I.8)
   - ✅ Add Consultant Control Centre logic (Section C.5)

2. **Backend (API & Jobs)**
   - ✅ Update pack generation endpoints with pack_type parameter
   - ✅ Add pack-specific endpoints (regulator, tender, board, insurer)
   - ✅ Add pack distribution endpoints
   - ✅ Add Consultant Control Centre endpoints
   - ✅ Extend pack generation job to handle all pack types
   - ✅ Add pack distribution job
   - ✅ Add consultant client sync job

3. **Security (RLS & Permissions)**
   - ✅ Add consultant client assignments RLS policies
   - ✅ Add pack access policies (plan-based)
   - ✅ Add pack distribution policies
   - ✅ Update existing policies for consultant role

4. **Frontend (UI & Routes)**
   - ✅ Add pack type selector component
   - ✅ Add pack generation modal (pack type-specific)
   - ✅ Add pack distribution panel
   - ✅ Add Consultant Dashboard routes
   - ✅ Add Consultant Client Management routes
   - ✅ Add pack management routes

5. **Testing & QA**
   - ✅ Add pack generation test cases (all 5 types)
   - ✅ Add consultant feature test cases
   - ✅ Add pack distribution test cases
   - ✅ Add consultant RLS test cases

6. **Commercial & Documentation**
   - ✅ Update Master Commercial Plan with v1.0 pricing
   - ✅ Update Pricing Model Explorer
   - ✅ Update Onboarding Flow with pack discovery
   - ✅ Update User Workflow Maps with pack workflows
   - ✅ Update Notification templates for pack types

**Reference:** CHANGELOG.md for complete v1.0 update summary

---

# ✅ **VERIFICATION CHECKLIST**

Before generating each document, verify:

- [ ] All dependencies are complete
- [ ] Terminology matches Canonical Dictionary
- [ ] Logic aligns with Product Logic Specification
- [ ] Workflows match User Workflow Maps
- [ ] Module-specific logic matches PLS Sections C.2 & C.3 (Module 2/3 logic)
- [ ] AI patterns match AI Rules Library
- [ ] Technical decisions align with Technical Architecture
- [ ] Database structure matches Database Schema
- [ ] API endpoints match Backend API
- [ ] UI flows match Frontend Routes
- [ ] v1.0 pack types implemented per Product Logic Specification Section I.8
- [ ] Consultant features implemented per Product Logic Specification Section C.5
- [ ] Plan-based access control enforced for pack types

---

# 🎯 **SUCCESS CRITERIA**

## **Completeness: 10/10**
- ✅ All critical documents included
- ✅ All dependencies mapped
- ✅ No missing workflows or features

## **Order Correctness: 10/10**
- ✅ Dependencies respected
- ✅ Logical sequence maintained
- ✅ No circular dependencies

## **Allocation Accuracy: 10/10**
- ✅ Claude = Business logic
- ✅ Cursor = Engineering artifacts
- ✅ Clear separation maintained

---

**END OF MASTER BUILD ORDER**

*This is the definitive, final build order. Follow it exactly.*

