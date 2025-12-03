# USER WORKFLOW MAPS
## EcoComply Platform — Modules 1–4

**EcoComply v1.0 — Launch-Ready / Last updated: 2025-01-01**

**Document Version:** 1.1  
**Status:** Updated  
**Depends On:** Master Commercial Plan (MCP), Product Logic Specification (PLS), Canonical Dictionary, High Level Product Plan (01)

> [v2.0 UPDATE – Site-First Dynamic Module Model – 2025-01-01]
> Complete refactoring to site-first workflows:
> - Every workflow begins at Site → Module
> - Permit is the primary entry path for compliance setup
> - Non-permit modules must not imply a standalone tenant
> - All workflows start with site context selection
> 
> [v1.7 UPDATE – Added Missing Workflows – 2025-01-XX]
> New workflows added:
> - Regulator Challenge State Machine Workflow
> - Manual Override Workflow
> - Unlinked Evidence Management Workflow
> - Module Cascading Deactivation Workflow
> - Pack Access Logs Viewing Workflow
> - Pack Contents Viewing Workflow
> 
> [v1.1 UPDATE – Added Module 4 and New Features – 2025-01-01]
> New workflows added:
> - Module 4 (Hazardous Waste) workflows
> - Compliance Clock workflows
> - Condition-level evidence mapping workflows
> - Recurrence trigger workflows
> - Permit change tracking workflows
> - Enhanced corrective action lifecycle workflows
> - Consultant Mode workflows
> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

- [1. Introduction](#1-introduction)
- [2. Module 1: Environmental Permits](#2-module-1-environmental-permits)
  - [2.1 Permit Upload & Extraction](#21-permit-upload--extraction)
  - [2.1.1 Subjective Interpretation Workflow](#211-subjective-interpretation-workflow)
  - [2.2 Obligation Review & Editing](#22-obligation-review--editing)
  - [2.3 Evidence Capture & Linking](#23-evidence-capture--linking)
  - [2.3.1 Condition-Level Evidence Mapping Workflow](#231-condition-level-evidence-mapping-workflow)
  - [2.4 Obligation Completion Workflow](#24-obligation-completion-workflow)
  - [2.4.1 Recurrence Trigger Configuration Workflow](#241-recurrence-trigger-configuration-workflow)
  - [2.5 Monitoring Schedule Creation](#25-monitoring-schedule-creation)
  - [2.5 Compliance Dashboard Navigation](#25-compliance-dashboard-navigation)
  - [2.6 Pack Generation (v1.0)](#26-pack-generation-v10)
  - [2.6.1 Pack Distribution Workflow (Growth Plan)](#261-pack-distribution-workflow-growth-plan)
  - [2.7 Permit Change Tracking Workflow](#27-permit-change-tracking-workflow)
  - [2.8 Consultant Control Centre Workflows](#28-consultant-control-centre-workflows)
    - [2.8.1 Consultant Onboarding Workflow](#281-consultant-onboarding-workflow)
    - [2.8.2 Client Assignment Workflow](#282-client-assignment-workflow)
    - [2.8.3 Consultant Pack Generation for Client](#283-consultant-pack-generation-for-client)
- [3. Module 2: Trade Effluent](#3-module-2-trade-effluent)
  - [3.1 Corrective Action Lifecycle Workflow](#31-corrective-action-lifecycle-workflow)
- [4. Module 3: MCPD/Generators](#4-module-3-mcpdgenerators)
- [5. Module 4: Hazardous Waste Chain of Custody](#5-module-4-hazardous-waste-chain-of-custody)
  - [5.1 Waste Stream Classification Workflow](#51-waste-stream-classification-workflow)
  - [5.2 Consignment Note Creation & Validation Workflow](#52-consignment-note-creation--validation-workflow)
  - [5.3 Chain of Custody Tracking Workflow](#53-chain-of-custody-tracking-workflow)
  - [5.4 End-Point Proof Workflow](#54-end-point-proof-workflow)
  - [5.5 Corrective Action Lifecycle Workflow (Module 4)](#55-corrective-action-lifecycle-workflow-module-4)
- [6. Cross-Cutting Workflows](#6-cross-cutting-workflows)
  - [6.1 Compliance Clock Workflow](#61-compliance-clock-workflow)
  - [6.9 Regulator Challenge State Machine Workflow](#69-regulator-challenge-state-machine-workflow)
  - [6.10 Manual Override Workflow](#610-manual-override-workflow)
  - [6.11 Unlinked Evidence Management Workflow](#611-unlinked-evidence-management-workflow)
  - [6.12 Module Cascading Deactivation Workflow](#612-module-cascading-deactivation-workflow)
  - [6.13 Pack Access Logs Viewing Workflow](#613-pack-access-logs-viewing-workflow)
  - [6.14 Pack Contents Viewing Workflow](#614-pack-contents-viewing-workflow)

---

# 1. INTRODUCTION

This document defines complete step-by-step user journey maps for all workflows in the EcoComply Platform. Each workflow specifies the user actions, system responses, decision points, and error paths.

**Terminology Note:** All entity names, field names, statuses, and enums match the Canonical Dictionary exactly.

**Module Extension Note:** New modules define their own workflows following the same pattern as Modules 1, 2, and 3. Module activation workflows query `modules.requires_module_id` to determine prerequisites and activation flow. Workflows can be registered per module in the `modules.workflow_config` JSONB field (optional). See Canonical Dictionary Section B.31 (Module Extension Pattern) and Product Logic Specification Section C.4 (Module Extension Pattern - business logic) for guidance on adding new modules and their workflows. For the `modules` table structure, see Canonical Dictionary Section C.4 (Module Registry Table).

---

# 2. PERMITS MODULE (Site-Level)

> [v2.0 UPDATE – Site-First Dynamic Module Model – 2025-01-01]
> 
> **Key Changes:**
> - All workflows begin at Site → Permits Module
> - Permit is the primary entry path for compliance setup
> - Workflows are site-scoped, not tenant-scoped

## 2.1 Permit Upload & Extraction

### Starting Point
- **Trigger:** User navigates to Site → Permits → Documents → Upload Permit
- **Prerequisites:** User has Staff, Admin, or Owner role; Site exists
- **Entry Path:** Site Context → Permits Module → Documents → Upload

### Step-by-Step Flow

**Upload Method Selection:**
1. **User:** Navigates to Site → Permits → Documents
2. **User:** Clicks "Upload Permit" button
3. **System:** Shows upload method selector: "Upload PDF" (default) OR "Import from Excel"
4. **User:** Selects upload method

**PDF Upload Path:**
1. **User:** Clicks "Upload PDF" option (or default selection)

2. **System:** Displays upload modal with drag-drop zone
   - Shows accepted format: PDF only
   - Shows maximum file size: 50MB

3. **User:** Drags and drops PDF file (or uses file picker)

4. **System:** Validates file
   - **If** file type is not PDF, **then** display error "Only PDF files are accepted" and reject upload
   - **If** file size exceeds 50MB, **then** display error "File exceeds 50MB limit" and reject upload
   - **Else** proceed to Step 5

5. **System:** Uploads file to secure storage
   - Creates Document record with `status = DRAFT`
   - Creates ExtractionLog record with `extraction_status = PENDING`
   - Stores original filename in metadata
   - Assigns UUID as system filename

6. **System:** Detects file format
   - **If** native PDF, **then** proceed to direct text extraction
   - **If** scanned PDF, **then** proceed to OCR processing

7. **System:** Performs OCR processing (if required)
   - **If** OCR confidence < 80%, **then** flag Document for manual review with message "Document quality issues detected"
   - **If** processing time exceeds 60 seconds, **then** set `extraction_status = FAILED` and prompt user to re-upload better scan

8. **System:** Extracts full document text
   - Preserves page numbers
   - Identifies headers/footers
   - Normalises character encoding to UTF-8

9. **System:** Segments document into sections
   - Identifies section headers by pattern (numbered, capitalised)
   - Creates segment boundaries
   - Tags each segment with type (header, conditions, schedules, etc.)

10. **System:** Performs module routing
    - Identifies document type from keywords and structure
    - Queries `modules` table: `SELECT * FROM modules WHERE document_types @> '["<document_type>"]'::JSONB AND is_active = true`
    - **If** exactly one module matches, **then** route to that module's extraction rules and set `documents.module_id`
    - **If** ambiguous (multiple module keywords or multiple modules match), **then** prompt user to confirm document type

11. **User:** (If prompted) Selects document type from dropdown

12. **System:** For each document segment, performs extraction:
    - First attempts Rule Library Lookup (pattern match ≥90% uses library template)
    - Falls back to LLM Extraction if no match
    - Calculates confidence_score for each Obligation
    - Detects subjective phrases and sets `is_subjective = true` where applicable
    - Performs hallucination detection:
      - Checks if extracted text found in source document
      - Validates numeric values against document
      - Checks dates are within reasonable range
      - Validates categories match document type
      - **If** hallucination detected, **then**:
        - Set `hallucination_risk = true`
        - Set `is_blocking = true`
        - Set `priority = 999` (highest priority)
        - Set `review_type = 'HALLUCINATION'`
        - **Auto-escalation:** If `hallucination_risk = true` AND `confidence_score < 50%`, **then**:
          - Automatically escalate to Admin/Owner review queue
          - Send immediate notification to Admin/Owner
          - Block document activation until reviewed
        - **Threshold-based escalation:** If hallucination detected in 3+ obligations in same document, **then**:
          - Escalate entire document for manual review
          - Flag document as `extraction_status = 'REVIEW_REQUIRED'`
          - Prevent document activation

13. **System:** Creates Obligation records
    - Links each Obligation to Document
    - Sets initial `status = PENDING`
    - Sets `review_status = PENDING` for items requiring review
    - Flags items with `confidence_score < 85%` for human review (non-blocking)
    - Flags items with `confidence_score < 70%` as blocking (requires review before activation)
    - Creates ReviewQueueItem records for all flagged items:
      - Items with `confidence_score < 85%` → `review_type = LOW_CONFIDENCE`, `is_blocking = false` (if ≥70%), `is_blocking = true` (if <70%)
      - Items with `is_subjective = true` → `review_type = SUBJECTIVE`, `is_blocking = false`
      - Items with hallucination detected → `review_type = NO_MATCH` (or appropriate type), `hallucination_risk = true`, `is_blocking = true`, `priority = elevated`
      - Items with other review triggers → appropriate `review_type` (DATE_FAILURE, DUPLICATE, OCR_QUALITY, CONFLICT)

14. **System:** Updates Document record
    - Sets `extraction_status = COMPLETED` (or `REVIEW_REQUIRED` if flagged items exist)
    - Displays extraction summary to user

15. **System:** Displays extraction results screen
    - Shows total Obligations extracted
    - Shows count of items flagged for review
    - Shows disclaimer: "Extracted obligations are derived by AI and may contain errors..."

16. **User:** Reviews extraction summary and proceeds to Obligation Review workflow

**Excel Import Path:**
1. **User:** Clicks "Import from Excel" option
2. **System:** Shows Excel import form with file dropzone (accepts .xlsx, .xls, .csv)
3. **User:** Drags Excel file OR clicks to browse
4. **System:** Validates file format (must be .xlsx, .xls, or .csv)
5. **System:** Validates file size (must be ≤10MB) and row count (must be ≤10,000 rows)
6. **User:** Selects import options (create missing sites, create missing permits, skip duplicates)
7. **User:** Clicks "Import" button
8. **System:** Uploads file, creates import record, triggers background job
9. **System:** Shows "Processing..." message with import ID
10. **Background Job:** Validates file, parses rows, validates data (dates, frequencies, required fields)
11. **Background Job:** Creates preview (valid rows, errors, warnings)
12. **System:** Sends notification: "Excel import ready for review"
13. **User:** Receives notification, clicks review link
14. **System:** Shows import preview page with:
    - Valid rows table (shows obligations to be created)
    - Errors table (shows rows with errors, error messages)
    - Warnings table (shows rows with warnings, e.g., duplicates)
15. **User:** Reviews preview, edits errors if needed (optional)
16. **User:** Clicks "Confirm Import" button
17. **Background Job:** Creates obligations in bulk from valid rows
18. **Background Job:** Links obligations to permits/sites
19. **System:** Sends notification: "Excel import completed - X obligations imported"
20. **User:** Receives notification, clicks "View Obligations"
21. **System:** Navigates to obligations list, shows imported obligations

### End States
- **PDF Upload Success:** Document `status = DRAFT`, Obligations created, user proceeds to review
- **PDF Upload Partial Success:** Document processed with some items flagged for review
- **PDF Upload Failure:** Document rejected, user prompted to re-upload
- **Excel Import Success:** Obligations created in bulk, user navigates to obligations list
- **Excel Import Failure:** Import fails, user receives error notification with retry option

### Error Paths

#### 1. Upload Failed
- **Trigger:** File upload fails (network error, storage error, invalid format)
- **System Action:**
  1. Display retry prompt with error message
  2. Allow up to 3 retry attempts
  3. **If** 3 retries fail, **then** display support contact information
  4. **If** user cancels, **then** return to document upload screen

#### 2. OCR Total Failure
- **Trigger:** OCR processing fails completely (no text extracted, OCR confidence = 0%)
- **System Action:**
  1. Set `document.extraction_status = 'OCR_FAILED'`
  2. Display error message: "Document text could not be extracted. Please ensure the document is clear and readable."
  3. Offer three options:
     - **Option A:** Re-upload with better scan/photo
     - **Option B:** Enter Manual Mode (user creates obligations manually)
     - **Option C:** Contact support for assistance
  4. **If** user chooses re-upload, **then** delete failed document and return to upload screen
  5. **If** user chooses Manual Mode, **then**:
     - Create document with `extraction_status = 'MANUAL_MODE'`
     - Set `document.validation_status = 'PENDING_VALIDATION'` (not automatically valid)
     - Display manual obligation entry form
     - **Important:** Document is NOT considered valid until:
       - At least one obligation is manually created
       - User explicitly confirms document is complete
       - System validates document has minimum required obligations for document type
     - **If** user attempts to mark document as complete with 0 obligations, **then**:
       - System displays warning: "Documents must have at least one obligation. Please create obligations manually or contact support if this document truly has no obligations."
       - System prevents document activation until obligations exist
  6. **If** user chooses support, **then** create support ticket with document ID and error details

#### 3. Processing Failed (Partial Failure)
- **Trigger:** Document processing fails after OCR (LLM error, timeout, etc.)
- **System Action:**
  1. Set `document.extraction_status = 'PROCESSING_FAILED'`
  2. Display error message: "Document processing encountered an error. You can retry or enter Manual Mode."
  3. Offer two options:
     - **Option A:** Retry processing (up to 2 additional attempts)
     - **Option B:** Enter Manual Mode
  4. **If** retry succeeds, **then** proceed with normal extraction workflow
  5. **If** retry fails, **then** offer Manual Mode only

#### 4. Zero Obligations Extracted
- **Trigger:** Extraction completes successfully but returns 0 obligations
- **System Action:**
  1. Set `document.extraction_status = 'ZERO_OBLIGATIONS'`
  2. Display warning: "No obligations were found in this document. This may indicate: (a) document is not a permit/consent, (b) document format is unusual, or (c) extraction needs review."
  3. Offer three options:
     - **Option A:** Retry with alternative extraction prompt (system uses different LLM prompt strategy)
     - **Option B:** Flag for manual review (document appears in "Review Queue" for human review)
     - **Option C:** Enter Manual Mode (user creates obligations manually)
  4. **If** user chooses retry, **then**:
     - System uses alternative prompt template
     - If still 0 obligations, offer Manual Mode or Review Queue
  5. **If** user chooses Review Queue, **then**:
     - Set `document.review_status = 'PENDING_REVIEW'`
     - Document appears in admin/staff review queue
     - Reviewer can manually extract obligations or mark as "No obligations in document"
  6. **If** user chooses Manual Mode, **then** proceed to manual obligation entry

#### 5. Total Extraction Failure (LLM Returns No Valid Obligations)
- **Trigger:** LLM extraction returns invalid/malformed data or no obligations after all retries
- **System Action:**
  1. Set `document.extraction_status = 'EXTRACTION_FAILED'`
  2. Log failure details in `extraction_logs` table
  3. Display error: "Automatic extraction failed. You can enter obligations manually or contact support."
  4. Offer two options:
     - **Option A:** Enter Manual Mode
     - **Option B:** Contact Support
  5. **If** user chooses Manual Mode, **then**:
     - Create document with `extraction_status = 'MANUAL_MODE'`
     - Set `document.validation_status = 'PENDING_VALIDATION'` (not automatically valid)
     - Display manual entry form
     - **Important:** Document is NOT considered valid until:
       - At least one obligation is manually created
       - User explicitly confirms document is complete
       - System validates document has minimum required obligations for document type
     - **If** user attempts to mark document as complete with 0 obligations, **then**:
       - System displays warning: "Documents must have at least one obligation. Please create obligations manually or contact support if this document truly has no obligations."
       - System prevents document activation until obligations exist
  6. **If** user chooses Support, **then** create support ticket with full extraction log details

---

## 2.1.1 Subjective Interpretation Workflow

### Starting Point
- **Trigger:** System flags obligation as `is_subjective = true` during extraction
- **Context:** Obligation contains language requiring human interpretation (e.g., "reasonable measures", "best practice", "as appropriate")

### Step-by-Step Flow

1. **System:** Flags obligation during extraction
   - Sets `obligation.is_subjective = true`
   - Sets `obligation.review_status = 'PENDING_INTERPRETATION'`
   - Sets `obligation.status = 'PENDING'` (cannot be marked complete until interpreted)

2. **System:** Displays obligation in "Subjective Review Queue"
   - Appears in dedicated queue for Staff/Admin/Owner roles
   - Badge indicator: "Requires Interpretation"
   - Shows original extracted text

3. **User (Staff/Admin/Owner):** Reviews subjective obligation
   - Clicks on obligation from review queue
   - Views original extracted text
   - Views document context (full document available)

4. **User:** Provides interpretation
   - **Option A:** Add interpretation notes (required)
     - User enters interpretation in `obligation.interpretation_notes` field
     - Example: "Reasonable measures = weekly visual inspection + monthly meter reading"
   - **Option B:** Mark as non-applicable
     - If obligation doesn't apply to this site/company
     - Sets `obligation.status = 'NOT_APPLICABLE'`
     - Requires reason: `obligation.interpretation_notes = "Reason: [explanation]"`

5. **System:** Updates obligation
   - **If** interpretation provided, **then**:
     - Sets `obligation.review_status = 'INTERPRETED'`
     - Sets `obligation.status = 'PENDING'` (now actionable)
     - Sets `obligation.interpreted_by = user_id`
     - Sets `obligation.interpreted_at = NOW()`
     - Removes from review queue
   - **If** marked N/A, **then**:
     - Sets `obligation.review_status = 'NOT_APPLICABLE'`
     - Sets `obligation.status = 'NOT_APPLICABLE'`
     - Removes from review queue

6. **System:** Creates compliance obligation from interpretation
   - **If** interpretation provided, **then** system may create derived obligations:
     - Example: "Reasonable measures" → creates "Weekly visual inspection" + "Monthly meter reading" obligations
     - Derived obligations link to original via `obligation.parent_obligation_id`
   - Derived obligations have `is_subjective = false` (now concrete)

### End States
- **Interpreted:** Obligation has interpretation notes, is actionable, removed from queue
- **Not Applicable:** Obligation marked N/A with reason, removed from queue
- **Pending:** Still awaiting interpretation (remains in queue)

### Error Paths
- **No Interpretation Provided:** System prevents saving until `interpretation_notes` field is populated
- **Invalid Interpretation:** System validates interpretation notes are non-empty and meaningful (min 10 characters)

---

## 2.2 Obligation Review & Editing

### Starting Point
- **Trigger:** User completes permit upload OR user clicks "Review Queue" dashboard widget
- **Prerequisites:** Document has Obligations with `review_status = PENDING`

### Step-by-Step Flow

1. **User:** Navigates to Review Queue (via prompt after upload or dashboard widget)

2. **System:** Displays Review Queue
    - Shows items sorted by: priority DESC (highest first), then blocking status (blocking first), then Document upload date
    - Shows for each item: Document name, Obligation text snippet, review type badge, hallucination risk indicator (if `hallucination_risk = true`)
    - Review type badges: LOW_CONFIDENCE (yellow), SUBJECTIVE (orange), NO_MATCH (red), DATE_FAILURE (amber), DUPLICATE (blue), OCR_QUALITY (grey), CONFLICT (red), HALLUCINATION (red with warning icon)

3. **User:** Clicks on an item to review

4. **System:** Opens side-by-side review screen
    - Left panel: Original document text with page reference
    - Right panel: Extracted Obligation data (text, summary, category, frequency, deadline)
    - Highlights confidence_score with colour coding:
      - ≥85%: Green (Confirmed)
      - 70-84%: Yellow (Review Recommended)
      - <70%: Red (Review Required)
    - **If** `hallucination_risk = true`, **then** displays prominent warning banner: "⚠️ Hallucination Risk: Extracted text may not match source document. Please verify carefully."
    - Shows review type badge and `is_blocking` indicator

5. **User:** Reviews extraction against original text
    - **If** extraction is correct, **then** clicks "Confirm"
    - **If** extraction needs editing, **then** modifies fields and clicks "Save"
    - **If** extraction is invalid, **then** clicks "Reject"

6. **System:** Processes user action
    - **If** Confirm:
      - Sets `review_status = CONFIRMED`
      - Sets `status = PENDING` (active)
      - Logs: `reviewed_by`, `reviewed_at`, `review_action = confirmed`
    - **If** Save (with edits):
      - Stores original extraction in `original_extraction` field
      - Updates Obligation fields with new values
      - Sets `review_status = EDITED`
      - Requires user to provide edit reason
      - Logs: all changes with previous values
    - **If** Reject:
      - Requires user to provide rejection reason
      - Sets `review_status = REJECTED`
      - Sets Obligation `status = REJECTED`
      - Archives Obligation (not deleted)

7. **User:** (For subjective Obligations) Adds interpretation notes
    - System prompts: "How will you demonstrate compliance with this obligation?"
    - User enters interpretation notes (required before marking complete later)

8. **System:** Updates Review Queue count

9. **User:** Continues reviewing remaining items until queue is empty

10. **System:** Validates subjective obligations before allowing completion:
    - **If** any obligation has `is_subjective = true` AND `interpretation_notes` IS NULL, **then**:
      - System blocks document activation
      - Displays error: "The following obligations require interpretation before the document can be activated: [list of subjective obligations]"
      - User must navigate to interpretation workflow for each subjective obligation
      - System prevents `extraction_status = COMPLETED` until all subjective obligations have interpretation notes
    - **If** all subjective obligations have interpretation notes, **then** proceed to Step 11

11. **System:** When all blocking items reviewed and subjective obligations interpreted:
    - Updates Document `extraction_status = COMPLETED`
    - Updates Document `status = ACTIVE`
    - Generates Schedules for all active Obligations with defined frequencies

### End States
- **Review Complete:** All Obligations reviewed; Document is ACTIVE
- **Partial Review:** Some items still in queue; Document remains in REVIEW_REQUIRED status

### Error Paths
- **Conflicting Obligations Detected:** Both Obligations displayed with conflict badge; user must choose one, keep both, or merge

---

## 2.3 Evidence Capture & Linking

### Starting Point
- **Trigger:** User clicks "Upload Evidence" from Site dashboard, Obligation detail page, or mobile camera capture
- **Prerequisites:** Site exists; at least one active Obligation exists

### Step-by-Step Flow

1. **User:** Initiates evidence upload via one of:
    - Dashboard "Upload Evidence" button
    - Obligation detail page "Add Evidence" button
    - Mobile camera capture (opens camera directly)

2. **System:** Displays upload interface
    - Shows drag-drop zone (or camera viewfinder on mobile)
    - Lists supported types: PDF (50MB), Images (20MB), CSV/XLSX (10MB), ZIP (100MB)

3. **User:** Uploads file or captures photo
    - For mobile capture: auto-captures GPS coordinates (if permitted), auto-captures timestamp

4. **System:** Validates file
    - **If** file type not supported, **then** display error and reject
    - **If** file exceeds size limit, **then** display error and reject
    - **If** file integrity check fails, **then** flag as corrupted
    - **Else** proceed to Step 5

5. **System:** Creates EvidenceItem record
    - Generates unique `evidence_id`
    - Sets `uploaded_by` to current User
    - Sets `uploaded_at` to current timestamp
    - Stores file in secure storage with generated `storage_path`
    - Generates thumbnail (for images)

6. **User:** (Optional) Adds description/notes

7. **System:** Displays linking interface
    - **If** uploaded from Obligation detail page, **then** auto-suggests that Obligation
    - Shows list of active Obligations with search/filter
    - Shows suggested links based on: filename matching condition reference, upload date matching deadline, evidence type matching Obligation category

8. **User:** Selects Obligation(s) to link
    - Can select multiple Obligations (up to 20)
    - Can add linking notes for each
    - **If** user attempts to skip linking (clicks "Skip" or "Cancel"), **then**:
      - System displays warning: "Evidence must be linked to an obligation within 7 days. You can link it later, but it will not be used for compliance verification until linked."
      - Evidence is saved with `enforcement_status = 'PENDING_LINK'`
      - 7-day grace period timer starts

9. **System:** Creates ObligationEvidenceLink records
    - **If** obligation link created, **then**:
      - Evidence is created with `is_approved = false`, `reviewer_id = NULL`, `approved_at = NULL`
      - Evidence requires approval before it can be used in pack generation
      - System displays notification: "Evidence uploaded. Please approve evidence before generating packs."
    - **If** user attempts to skip linking (clicks "Skip" or "Cancel"), **then**:
      - Sets `evidence.enforcement_status = 'LINKED'`
      - Evidence can be used for compliance verification
    - **If** no obligation link created, **then**:
      - Sets `evidence.enforcement_status = 'PENDING_LINK'`
      - 7-day grace period timer starts
      - Evidence cannot be used for compliance verification until linked
    - Sets `linked_by` to current User
    - Sets `linked_at` to current timestamp
    - Sets `compliance_period` based on Obligation's current period
    - Validates: EvidenceItem exists, Obligation not archived
    - Validates site linking:
      - **If** EvidenceItem and Obligation are on same Site, **then** allow linking
      - **If** EvidenceItem and Obligation are on different Sites, **then** check if both are linked to same multi-site shared permit:
        - Check if Obligation's Document has `document_site_assignments` records
        - Check if EvidenceItem's Site is in those assignments
        - **If** yes, **then** allow linking (controlled exception for multi-site shared permits)
        - **If** no, **then** reject with error: "Evidence cannot be linked to obligations on different sites"

10. **System:** Updates Obligation status
    - **If** evidence upload date within compliance period, **then** set Obligation `status = COMPLETED`
    - **If** evidence upload date after deadline, **then** set Obligation `status = LATE_COMPLETE`
    - **If** compliance period has ended and no evidence linked for that period, **then** set Obligation `status = INCOMPLETE`

11. **System:** Displays confirmation
    - Shows linked Obligations
    - Shows updated compliance status

### End States
- **Success:** EvidenceItem created and linked; Obligation status updated to COMPLETED or LATE_COMPLETE
- **Evidence Not Linked:** EvidenceItem created but not linked (appears in "Unlinked Evidence" widget)

### Error Paths
- **Storage Error:** Evidence not saved; retry prompt displayed, then support contact
- **Link Validation Failure:** Cross-site linking attempted; error displayed: "Evidence cannot be linked to obligations on different sites **unless both are linked to the same multi-site shared permit**"

---

## 2.3.2 Evidence Approval Workflow

> [v1.6 UPDATE – Evidence Approval Requirement – 2025-01-01]

**Purpose:** Approve evidence items before they can be used in pack generation.

### Starting Point
- **Trigger:** Manager/Admin/Owner reviews evidence item OR user attempts pack generation with unapproved evidence
- **Prerequisites:** Evidence item exists; User has Owner, Admin, or Manager role

### Step-by-Step Flow

1. **User:** Navigates to evidence item detail page OR receives notification about unapproved evidence

2. **System:** Displays evidence approval interface
   - Shows evidence file preview/thumbnail
   - Shows evidence metadata: file_name, file_type, uploaded_by, uploaded_at, linked_obligations
   - Shows current approval status:
     - **If** `is_approved = false`: Displays "Pending Approval" badge
     - **If** `is_approved = true`: Displays "Approved" badge with reviewer name and approval timestamp

3. **User (Owner/Admin/Manager):** Reviews evidence item
   - Views evidence file (download or preview)
   - Reviews linked obligations
   - Checks evidence metadata and compliance period

4. **User:** Clicks "Approve Evidence" button

5. **System:** Validates user role
   - **If** user is not Owner, Admin, or Manager, **then** display error "Only Owners, Admins, and Managers can approve evidence"
   - **Else** proceed to Step 6

6. **User:** (Optional) Adds review notes
   - System displays text area for review notes
   - Notes stored in `metadata.review_notes` field

7. **User:** Clicks "Confirm Approval"

8. **System:** Approves evidence item
   - Sets `is_approved = true`
   - Sets `reviewer_id = current_user.id`
   - Sets `approved_at = NOW()`
   - Stores review notes in `metadata.review_notes` (if provided)
   - Updates `updated_at = NOW()`
   - Logs approval action in audit trail:
     - `action_type = 'EVIDENCE_APPROVED'`
     - `entity_type = 'evidence_item'`
     - `entity_id = evidence_item.id`
     - `user_id = current_user.id`
     - `timestamp = NOW()`

9. **System:** Updates evidence status
   - Evidence can now be used in pack generation
   - If evidence was blocking pack generation, system displays notification: "Evidence approved. You can now generate packs."

10. **System:** Notifies relevant users
    - Sends notification to evidence uploader: "Your evidence [file_name] has been approved"
    - If evidence was blocking pack generation, notifies pack requester: "Evidence approved. Pack generation can proceed."

### End States
- **Approved:** Evidence item approved with reviewer_id and approved_at set; can be used in pack generation
- **Rejected:** Evidence item remains unapproved (is_approved = false); cannot be used in pack generation

### Error Paths
- **Insufficient Permissions:** User not Owner/Admin/Manager; error displayed, approval blocked
- **Evidence Not Found:** Evidence item not found; 404 error displayed
- **Already Approved:** Evidence already approved; system displays current approval details (reviewer, timestamp)

### Bulk Approval Workflow

**Starting Point:**
- **Trigger:** Manager/Admin/Owner navigates to "Pending Evidence Approval" page
- **Prerequisites:** User has Owner, Admin, or Manager role

**Step-by-Step Flow:**

1. **User:** Navigates to Evidence Library → "Pending Approval" filter

2. **System:** Displays list of unapproved evidence items
   - Shows: file_name, uploaded_by, uploaded_at, linked_obligations_count
   - Groups by: site, compliance_period, or upload_date (user-selectable)

3. **User:** Selects evidence items to approve (multi-select)

4. **User:** Clicks "Approve Selected" button

5. **System:** Validates all selected items
   - Checks user has approval permissions
   - Validates evidence items exist and are not archived

6. **System:** Approves all selected evidence items in batch
   - For each evidence item:
     - Sets `is_approved = true`
     - Sets `reviewer_id = current_user.id`
     - Sets `approved_at = NOW()`
   - Logs batch approval in audit trail

7. **System:** Displays confirmation
   - Shows count of approved items
   - Shows any items that failed approval (if any)

### End States
- **Bulk Approved:** All selected evidence items approved; can be used in pack generation
- **Partial Approval:** Some items approved, some failed; user can retry failed items

**Reference:** Product Logic Specification Section B.4.2.1 (Evidence Approval Requirements)

---

## 2.4 Obligation Completion Workflow

### Starting Point
- **Trigger:** User marks obligation as complete OR evidence is linked to obligation
- **Prerequisites:** Obligation exists and is in PENDING or DUE_SOON status

### Step-by-Step Flow

1. **User:** Initiates completion via one of:
   - Clicks "Mark Complete" on obligation detail page
   - Links evidence to obligation (auto-completes if within compliance period)
   - Uploads evidence from obligation detail page (auto-links and completes)

2. **System:** Validates completion prerequisites
   - **If** `is_subjective = true` AND `interpretation_notes` IS NULL, **then**:
     - Block completion with error: "This obligation requires interpretation before it can be marked complete. Please add interpretation notes."
     - User must navigate to interpretation workflow (Section 2.1.1)
   - **If** obligation has required evidence types AND no evidence linked, **then**:
     - Display warning: "This obligation typically requires evidence. Are you sure you want to mark it complete without evidence?"
     - User can proceed with justification or cancel to upload evidence
   - **If** deadline has passed AND no evidence linked, **then**:
     - Display warning: "Deadline has passed. Completing without evidence will mark as LATE_COMPLETE."
     - User can proceed or cancel to upload evidence

3. **User:** (Optional) Provides completion justification
   - If marking complete without evidence, system prompts for reason
   - Reason stored in `obligation.completion_notes`
   - Reason included in audit pack

4. **System:** Calculates completion status
   - **If** evidence linked AND evidence upload date ≤ deadline, **then**:
     - Set `obligation.status = COMPLETED`
     - Set `obligation.completed_at = NOW()`
   - **If** evidence linked AND evidence upload date > deadline, **then**:
     - Set `obligation.status = LATE_COMPLETE`
     - Set `obligation.completed_at = NOW()`
     - Set `obligation.late_reason = 'Evidence uploaded after deadline'`
   - **If** no evidence AND deadline passed, **then**:
     - Set `obligation.status = LATE_COMPLETE`
     - Set `obligation.completed_at = NOW()`
     - Set `obligation.late_reason = 'Completed without evidence after deadline'`
   - **If** no evidence AND deadline not passed, **then**:
     - Set `obligation.status = COMPLETED`
     - Set `obligation.completed_at = NOW()`
     - Set `obligation.completion_notes = [user justification]`

5. **System:** Updates related entities
   - Updates Schedule: If obligation has schedule, marks schedule period as complete
   - Updates Deadline: If obligation has deadline, marks deadline as complete
   - Updates Evidence: If evidence linked, sets `evidence.compliance_status = 'LINKED_TO_COMPLETED'`
   - Triggers notifications: Sends completion notification to assigned user and site manager

6. **System:** Logs completion in audit trail
   - Creates AuditLog entry:
     - `action_type = 'OBLIGATION_COMPLETED'`
     - `entity_type = 'obligation'`
     - `entity_id = obligation.id`
     - `previous_values = {status: 'PENDING', ...}`
     - `new_values = {status: 'COMPLETED', completed_at: NOW(), ...}`
     - `user_id = current_user.id`
     - `ip_address = request.ip`
     - `session_id = request.session_id`

7. **System:** Updates compliance score (real-time)
   - Recalculates module-level compliance score:
     - Formula: `(completed_and_evidenced_obligations / total_due_obligations) * 100`
     - Applies overdue penalties if applicable
   - Recalculates site-level compliance score:
     - Average of all active module scores
   - Updates `module_activations.compliance_score` and `sites.compliance_score`
   - Updates `compliance_score_updated_at` timestamp
   - Invalidates frontend queries (triggers UI refresh)
   - Updates dashboard widgets in real-time
   - Triggers compliance alerts if score drops below threshold (70%)
   - Updates Compliance Clock if score affects criticality

8. **User:** Views completion confirmation
   - System displays: "Obligation marked as complete"
   - Shows completion timestamp
   - Shows linked evidence (if any)
   - Shows completion notes (if any)

### End States
- **Completed:** Obligation marked complete, evidence linked (if applicable), audit trail logged
- **Late Complete:** Obligation completed after deadline, late flag visible in audit pack
- **Blocked:** Obligation cannot be completed (subjective interpretation required, or other blocking condition)

### Error Paths
- **Subjective Interpretation Required:** User must add interpretation notes before completion
- **Evidence Validation Failure:** Evidence link fails validation (wrong site, wrong document, etc.)
- **Completion Blocked:** System prevents completion due to business rules

---

## 2.5 Monitoring Schedule Creation

### Starting Point
- **Trigger:** Automatic after Obligation review OR User clicks "Create Schedule" on Obligation detail
- **Prerequisites:** Obligation has defined frequency (not null, not CONTINUOUS)

### Step-by-Step Flow

1. **System:** Detects Obligation with frequency during review completion
    - OR **User:** Clicks "Create Schedule" on Obligation without Schedule

2. **System:** Auto-generates Schedule record
    - Sets `frequency` from Obligation
    - Determines `base_date`:
      - First: Document-specified start date
      - Second: Permit anniversary date
      - Third: Document upload date
      - Fourth: User-specified date

3. **System:** Calculates first deadline
    - Applies frequency rules:
      - DAILY: base_date + N days
      - WEEKLY: base_date + (N × 7) days
      - MONTHLY: base_date + N months (same day or last day if doesn't exist)
      - QUARTERLY: base_date + (N × 3) months
      - ANNUAL: base_date + N years
    - Sets `next_due_date`

4. **System:** Applies business day adjustment (if configured)
    - **If** `adjust_for_business_days = true` AND deadline falls on weekend/UK bank holiday
    - **Then** move deadline to previous working day

5. **System:** Creates Schedule record
    - Sets `status = ACTIVE`
    - Sets `is_rolling = false` (default; fixed schedule)
    - Sets `reminder_days = [7, 3, 1]` (default)

6. **System:** Generates Deadline record for next occurrence
    - Sets `status = PENDING`
    - Sets `due_date` from calculated date
    - Sets `compliance_period` based on frequency

7. **User:** (Optional) Clicks "Edit Schedule" to customise
    - Can modify: frequency, base_date, reminder_days, adjust_for_business_days, is_rolling
    - System requires reason for changes (logged to audit trail)

8. **System:** Recalculates all future deadlines if Schedule modified

### End States
- **Schedule Active:** Schedule created with ACTIVE status; generating deadlines
- **Schedule Paused:** User has paused schedule; no new deadlines generated

### Error Paths
- **No Frequency Defined:** Prompt user to set frequency before creating Schedule
- **Invalid Base Date:** Display validation error; require valid date

---

## 2.5 Compliance Dashboard Navigation

### Starting Point
- **Trigger:** User logs in OR navigates to dashboard
- **Prerequisites:** User is authenticated; has access to at least one Site

### Step-by-Step Flow

1. **User:** Navigates to Dashboard (default landing after login)

2. **System:** Determines dashboard scope
    - Default: "All Sites" consolidated view
    - Shows site selector dropdown

3. **System:** Loads and displays widgets:

    **Module-Agnostic Widgets:**
    - Upcoming Deadlines: Next 7 days, grouped by date
    - Overdue Items: Count with red badge, click to expand
    - Recent Activity: Last 10 actions across all modules
    - Review Queue: Items awaiting human review

    **Module 1 Specific:**
    - Permit Compliance Summary: Traffic light status per permit
    - Improvement Conditions: Progress tracker

4. **System:** Calculates and displays compliance statistics
    - Total Obligations: N
    - Complete: N (green %)
    - Pending: N (amber %)
    - Overdue: N (red %)
    - Incomplete: N (orange %) - compliance period ended without evidence
    - Late Complete: N (yellow %) - completed after deadline
    - Not Applicable: N (grey)

5. **User:** Clicks on a widget to drill down
    - Upcoming Deadlines → Deadline list view
    - Overdue Items → Filtered Obligation list (status = OVERDUE)
    - Permit card → Permit detail view

6. **User:** Uses site selector to filter
    - Selects specific Site from dropdown
    - Dashboard updates to show only that Site's data
    - Selection persists during session

7. **User:** Uses date range picker (if available)
    - Filters data by selected period
    - Updates all widgets accordingly

8. **System:** Updates dashboard data in real-time
    - Reflects evidence uploads
    - Reflects status changes
    - Shows new alerts

### End States
- **Dashboard Displayed:** User viewing current compliance status
- **Filtered View:** User viewing specific Site or date range

### Error Paths
- **No Data Available:** Display "No permits uploaded yet" message with upload prompt
- **Access Denied:** User lacks permission; redirect to accessible Site or display error

---

## 2.6 Pack Generation (Universal - All Modules)

> [v1.5 UPDATE – Standardized Pack Generation – 2025-01-01]

**Universal Pack Specification:**
- **SLA:** < 2 minutes (< 120 seconds) generation time
- **Required Contents (All Modules):**
  1. Compliance Score (site-level + module breakdown)
  2. Obligation list with statuses
  3. Evidence attachments (version-locked)
  4. Change justification & signoff history
  5. Compliance Clock summary (overdue + upcoming)
  6. Pack provenance signature (timestamp + signer + hash)
- **Regulator Access:** Secure link (no login required)

### Starting Point
- **Trigger:** User clicks "Generate Pack" OR scheduled generation trigger
- **Prerequisites:** At least one active Document with Obligations exists; User plan has access to pack type

### Step-by-Step Flow

1. **User:** Clicks "Generate Pack" button

2. **System:** Displays pack type selector
    - Shows available pack types based on user plan
    - Core Plan: Regulator Pack, Audit Pack only
    - Growth Plan: All pack types
    - Consultant Edition: All pack types (for assigned clients)

3. **User:** Selects pack type

4. **System:** Validates plan access
    - **If** pack type not available for plan, **then** display upgrade prompt
    - **Else** proceed to configuration

5. **System:** Displays pack-specific configuration form:
    - **Regulator Pack:** Date range, document selector, recipient name
    - **Tender Pack:** Date range, document selector, client name, purpose
    - **Board Pack:** Date range, company scope (all sites), recipient name
    - **Insurer Pack:** Date range, document selector, broker name, purpose
    - **Audit Pack:** Date range, document selector, filters

6. **User:** Configures options and clicks "Generate"

7. **System:** Validates configuration
    - **If** Board Pack and user not Owner/Admin, **then** display error "Board Pack requires Owner/Admin role"
    - **If** Board Pack and site_id provided, **then** display error "Board Pack requires company-level scope (no site_id)"
    - **If** Board Pack and company_id missing, **then** display error "Board Pack requires company_id"
    - **If** non-Board Pack and site_id missing, **then** display error "Pack type requires site_id"
    - **If** no Obligations match filters, **then** display warning "No data matches your filters"
    - **Evidence Approval Validation (REQUIRED for ALL pack types):**
      - Queries all obligations in pack date range
      - For each obligation, queries all linked evidence items
      - Validates each evidence item has:
        - `is_approved = true`
        - `reviewer_id IS NOT NULL`
        - `approved_at IS NOT NULL`
      - **If ANY evidence item lacks approval**, **then**:
        - Display error: "Cannot generate pack: [count] evidence items require approval"
        - Show list of unapproved evidence items with:
          - Evidence file name
          - Linked obligation title
          - Missing approval fields (reviewer_id, approved_at, or is_approved)
        - Provide "Approve Evidence" button linking to evidence approval page
        - Block pack generation until all evidence is approved
    - **If** pack includes Module 2 (Trade Effluent) data, **then** perform Module 2 pre-generation validation (see Section 3.4)
    - **Else** proceed to generation

8. **System:** Initiates generation
    - Creates AuditPack record with `pack_type`, `status = GENERATING`
    - **If** estimated size > 100 evidence items:
      - Display message "Large pack - generating in background"
      - Send email notification when ready
    - **Else** proceed synchronously

9. **System:** Compiles pack content (pack type-specific structure):
    - **Regulator Pack:** Inspector-ready format (see PLS Section I.8.2)
    - **Tender Pack:** Client-facing summary (see PLS Section I.8.3)
    - **Board Pack:** Multi-site aggregation (see PLS Section I.8.4)
    - **Insurer Pack:** Risk narrative (see PLS Section I.8.5)
    - **Audit Pack:** Full evidence compilation (existing structure)

10. **System:** Generates pack with standardized structure:
    - **Section 1: Compliance Score**
      - Site-level compliance score (INTEGER 0-100)
      - Score breakdown: total_obligations, completed, overdue, module_scores
      - Color-coded badge (Green/Amber/Red)
    - **Section 2: Obligation List with Statuses**
      - All obligations with: ID, title, status, deadline_date, evidence_count
      - Sorted by: Status priority (OVERDUE first), then deadline
    - **Section 3: Evidence Attachments (Version-Locked)**
      - All evidence items linked to obligations
      - Version-locked snapshots stored in `pack_contents` table
      - File metadata: name, type, size, hash, upload timestamp
    - **Section 4: Change Justification & Signoff History**
      - All changes: OBLIGATION_COMPLETED, EVIDENCE_LINKED, STATUS_CHANGED, etc.
      - Justification text, signer name, timestamp
      - Sorted by: Most recent first
    - **Section 5: Compliance Clock Summary**
      - Overdue items: [{clock_id, clock_name, days_overdue, criticality, ...}]
      - Upcoming items (within 30 days): [{clock_id, clock_name, days_remaining, ...}]
      - Total active clocks count
    - **Section 6: Pack Provenance Signature**
      - Generation timestamp (ISO 8601)
      - Signer: {user_id, user_name, user_email, user_role}
      - Content hash (SHA-256) for integrity verification
      - Pack version number
      - Generation SLA: {target_seconds: 120, actual_seconds: N, compliant: boolean}
    - **Module-Specific Sections (if applicable):**
      - Added AFTER the 6 universal sections
      - Module 1: Permit versions, redline comparisons, enforcement notices
      - Module 2: Lab results, exceedance history, monthly reconciliations
      - Module 3: Stack test results, runtime monitoring, AER documents
      - Module 4: Consignment notes, chain of custody, validation results

11. **System:** Stores pack with all standardized fields:
    - Updates `audit_packs` table with:
      - `compliance_score`, `compliance_score_breakdown`
      - `obligation_summary`, `evidence_summary`
      - `change_justification_history`, `compliance_clock_summary`
      - `pack_provenance_signature`
      - `generation_sla_seconds` (actual generation time)
    - Stores evidence snapshots in `pack_contents` table (version-locked)
    - Generates `secure_access_token` (if `recipient_type = 'REGULATOR'`)
    - Sets `secure_access_expires_at` (if expiry configured)

12. **System:** Creates access log entry (if secure link generated):
    - Records IP address (required)
    - Records email if provided (optional)
    - Records user agent
    - Initializes view_count = 0

13. **System:** Validates SLA compliance:
    - IF `generation_sla_seconds > 120` THEN:
      - Logs warning: "Pack generation exceeded SLA (actual: {seconds}s, target: 120s)"
      - Still completes generation (does not fail)
    - ELSE:
      - Logs success: "Pack generation completed within SLA"

14. **System:** Generates PDF or web-based pack with formatting

11. **System:** Stores completed pack
    - Updates AuditPack record with `pack_type`, file path, `status = COMPLETED`
    - Records: `generated_by`, `generated_at`, `recipient_type`, `recipient_name`, `purpose`

12. **System:** Notifies user
    - **If** synchronous: Display download prompt
    - **If** background: Send pack type-specific email notification

13. **User:** Downloads pack PDF

### End States
- **Pack Ready:** PDF generated and available for download
- **Background Processing:** Large pack queued; email notification pending

### Error Paths
- **Plan Access Denied:** Display upgrade prompt with pack type benefits
- **Generation Timeout:** Offer retry or background processing
- **Maximum Evidence Exceeded:** Display error; prompt user to narrow filters
- **Unapproved Evidence:** Display error with list of unapproved evidence items, provide "Approve Evidence" action

**Regulator Access (No Login Required):**
- If `recipient_type = 'REGULATOR'`:
  - System generates secure access token
  - System creates secure link: `https://app.epcompliance.com/packs/{secure_access_token}`
  - Regulator accesses pack via secure link (no authentication required)
  - System logs all access in `pack_access_logs`:
    - IP address (required)
    - Email (optional, if provided)
    - User agent
    - View count, download count, pages viewed
  - Access tracked for audit compliance

**SLA Enforcement:**
- Pack generation MUST complete within 120 seconds
- If exceeded, pack still generates but warning logged
- Frontend displays SLA status: "Generated in {seconds}s" (green if < 120s, amber if > 120s)

**Module Consistency:**
- ALL modules (1-4) use the SAME 6 universal sections
- Module-specific sections are ADDITIONAL (not replacements)
- No module can omit or modify the 6 universal sections

**Reference:** Product Logic Specification Section B.8.1 (Universal Audit Pack Specification)

---

## 2.6.1 Pack Distribution Workflow (Growth Plan)

> [v1 UPDATE – Pack Distribution Workflow – 2024-12-27]

### Starting Point
- **Trigger:** User clicks "Distribute Pack" on pack detail page
- **Prerequisites:** Pack exists, User has appropriate plan:
  - Core Plan: Can email Regulator Pack and Audit Pack
  - Growth Plan/Consultant Edition: Can email all pack types + use shared links

### Step-by-Step Flow

1. **User:** Clicks "Distribute Pack" button

2. **System:** Displays distribution method selector
    - Email distribution
    - Shared link generation

3. **User:** Selects distribution method

4. **IF Email Distribution:**
    - **User:** Enters recipient emails and optional message
    - **User:** Clicks "Send"
    - **System:** Sends email with pack PDF attachment
    - **System:** Creates `pack_distributions` record
    - **System:** Notifies user "Pack distributed successfully"

5. **IF Shared Link:**
    - **User:** Configures expiration (default: 30 days)
    - **User:** Clicks "Generate Link"
    - **System:** Generates unique token
    - **System:** Updates `audit_packs` record with `shared_link_token` and `shared_link_expires_at`
    - **System:** Creates `pack_distributions` record
    - **System:** Displays shareable link
    - **User:** Copies link or sends via email

### End States
- **Email Sent:** Pack distributed via email
- **Link Generated:** Shareable link created and displayed

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

---

## 2.7 Consultant Control Centre Workflows

> [v1 UPDATE – Consultant Workflows – 2024-12-27]

### 2.7.1 Consultant Onboarding Workflow

**Starting Point:**
- **Trigger:** User signs up with Consultant role OR existing user upgrades to Consultant Edition
- **Prerequisites:** User account exists

**Step-by-Step Flow:**

1. **User:** Signs up or upgrades to Consultant Edition

2. **System:** Displays Consultant onboarding flow
    - Welcome message
    - Consultant features overview
    - Client assignment instructions

3. **User:** Completes consultant profile
    - Company name (consultant firm)
    - Contact information
    - Specializations

4. **System:** Creates consultant account
    - Sets `role = 'CONSULTANT'` in `user_roles` table
    - Grants Consultant Edition access

5. **System:** Displays Consultant Dashboard
    - Empty state: "No clients assigned yet"
    - CTA: "Add your first client" or "Wait for client assignment"

**End State:** Consultant account ready, awaiting client assignments

**Reference:** Product Logic Specification Section C.5.1 (Consultant User Model)

---

### 2.7.2 Client Assignment Workflow

**Starting Point:**
- **Trigger:** Client company Owner/Admin assigns consultant
- **Prerequisites:** Consultant account exists, Client company exists

**Step-by-Step Flow:**

1. **Client Owner/Admin:** Navigates to Company Settings → Users

2. **Client Owner/Admin:** Clicks "Assign Consultant"

3. **System:** Displays consultant search/select interface
    - Search by email or consultant firm name
    - Display consultant profile

4. **Client Owner/Admin:** Selects consultant and clicks "Assign"

5. **System:** Creates `consultant_client_assignments` record
    - `consultant_id` = selected consultant
    - `client_company_id` = current company
    - `status = 'ACTIVE'`
    - `assigned_by` = current user

6. **System:** Notifies consultant
    - Email: "You've been assigned to [Client Company]"
    - In-app notification
    - Consultant Dashboard updated

7. **Consultant:** Receives notification and can now access client data

**End State:** Consultant has access to assigned client company

**Reference:** Product Logic Specification Section C.5.6 (Consultant Client Assignment Workflow)

---

### 2.7.3 Consultant Pack Generation for Client

**Starting Point:**
- **Trigger:** Consultant clicks "Generate Pack" for assigned client
- **Prerequisites:** Consultant assigned to client, Client has active documents

**Step-by-Step Flow:**

1. **Consultant:** Navigates to Audit Packs page or client site

2. **System:** Validates consultant assignment
   - Checks `consultant_client_assignments` table
   - **If** consultant not assigned to client, **then** display error "You do not have access to this client" and block pack generation
   - **Else** proceed to Step 3

3. **Consultant:** Selects pack type and date range

4. **System:** Validates pack generation request
   - Validates `company_id` against `consultant_client_assignments`
   - **If** client not assigned, **then** return `403 FORBIDDEN` error
   - **Else** proceed with pack generation

5. **System:** Generates pack for assigned client only

**End State:** Pack generated successfully for assigned client

**Error Paths:**
- **403 FORBIDDEN:** Consultant not assigned to client company
- **Validation Error:** Pack generation blocked if client assignment invalid

**Reference:** RLS Permissions Specification Section 11.5 (Consultant Restrictions)

---

### 2.7.4 Consultant Access Restrictions Workflow

**Purpose:** Defines restrictions and error handling for consultant role to ensure tenant isolation and prevent unauthorized access.

**Consultant Restrictions:**

**Settings & Subscription Access:**
1. **Consultant:** Attempts to navigate to Settings
2. **System:** Hides Settings link from navigation (consultant role)
3. **If** consultant accesses `/settings` directly, **then** return `403 FORBIDDEN` error
4. **System:** Blocks access to:
   - Company settings (`/company`)
   - Site settings (`/sites/[siteId]/settings`)
   - Subscription management (`/settings/subscription`)
   - Billing information (`/settings/billing`)

**Multi-Site Access:**
1. **Consultant:** Views Dashboard or Sites page
2. **System:** Shows all assigned client sites, grouped by company
3. **Site Switcher:** Displays sites with company prefix (e.g., "Client Company A - Site 1")
4. **Consultant:** Can switch between sites across different client companies
5. **System:** Validates site access via `consultant_client_assignments` on each navigation

**Evidence Isolation:**
1. **Consultant:** Attempts to upload evidence
2. **System:** Validates site belongs to assigned client company
3. **If** site not in assigned client company, **then** block upload with error "You can only upload evidence to assigned client sites"
4. **Consultant:** Attempts to link evidence to obligation
5. **System:** Validates evidence and obligation are from same client company
6. **If** cross-client linking detected, **then** block with error "Evidence cannot be linked across different clients"
7. **RLS Enforcement:** Database-level policies prevent cross-client evidence linking

**Pack Generation Validation:**
1. **Consultant:** Initiates pack generation
2. **System:** Validates client assignment before generation
3. **If** client not assigned, **then** return `403 FORBIDDEN` with message "You can only generate packs for assigned clients"
4. **System:** Validates site belongs to assigned client company
5. **All pack types** (Regulator, Tender, Board, Insurer, Audit) restricted to assigned clients only

**Error Messages:**
- Settings access: "Consultants cannot access company settings or subscription management"
- Unassigned client: "You do not have access to this client. Contact the client administrator to request access."
- Cross-client evidence: "Evidence cannot be linked across different clients. Please select evidence from the same client company."
- Unassigned site: "You can only access sites from assigned client companies."

**End States:**
- **Success:** Consultant accesses allowed resources for assigned clients
- **Blocked:** Consultant receives clear error message explaining restriction

**Reference:** 
- RLS Permissions Specification Section 11.5 (Consultant Restrictions)
- Product Logic Specification Section B.10.2.3 (Consultant Data Boundary Rules)

1. **Consultant:** Navigates to Consultant Dashboard → Clients → [Client Name]

2. **Consultant:** Clicks "Generate Pack" for client

3. **System:** Displays pack type selector (all pack types available)

4. **Consultant:** Selects pack type and configures options

5. **System:** Validates consultant assignment
    - **If** consultant not assigned to client, **then** display error "Access denied"
    - **Else** proceed to generation

6. **System:** Generates pack (same as regular pack generation)

7. **System:** Associates pack with client company (not consultant's company)

8. **System:** Notifies consultant and client contacts
    - Consultant: "Pack generated for [Client Name]"
    - Client: "Your consultant generated a [Pack Type] pack"

**End State:** Pack generated and available to both consultant and client

**Reference:** Product Logic Specification Section C.5.4 (Consultant Pack Generation)

---

## 2.8 Multi-Site Management

---

## 2.7 Multi-Site Management

### Starting Point
- **Trigger:** User clicks "Add Site" OR accesses Site management
- **Prerequisites:** User has Owner or Admin role

### Step-by-Step Flow

1. **User:** Clicks "Add Site" in Company settings

2. **System:** Displays Site creation form
    - Site name (required)
    - Address (required)
    - Site-specific settings (grace period, business day adjustment)

3. **User:** Completes form and clicks "Create Site"

4. **System:** Creates Site record
    - Links to Company
    - Sets `is_active = true`
    - Triggers billing recalculation (£99/month additional site)

5. **System:** Displays new Site in Site selector

6. **User:** Navigates between Sites using Site selector
    - Dashboard filters to selected Site
    - All actions (upload, evidence) scoped to selected Site

7. **User:** (For multi-site permits) Uploads permit covering multiple Sites

8. **System:** During upload, prompts:
    - "Does this permit cover a single site or multiple sites?"

9. **User:** Selects "Multiple sites"

10. **System:** Displays Site selection
    - Checkbox list of all Sites

11. **User:** Selects applicable Sites
    - **System:** Prompts: "Which site should be the primary site?" (defaults to first selected)
    - **User:** (Optional) Selects primary site from list

12. **System:** Creates Document linked to all selected Sites
    - Sets `documents.site_id` to primary site (NOT NULL, required)
    - Creates `document_site_assignments` records for all selected sites
    - Sets `is_primary = true` for the primary site in `document_site_assignments`
    - Sets `is_primary = false` for all other sites
    - Prompts: "Should obligations be replicated per site or shared?"

13. **User:** Chooses replication strategy
    - **Replicated:** Separate Obligation records per Site; evidence tracked per Site
    - **Shared:** Single Obligation linked to all Sites; evidence can be linked site-specifically or across all

14. **System:** Sets `obligations_shared` flag and creates Obligations
    - Sets `document_site_assignments.obligations_shared = true` if user chose "Shared"
    - Sets `document_site_assignments.obligations_shared = false` if user chose "Replicated"
    - **If** `obligations_shared = true`:
      - Creates one Obligation record per condition extracted
      - Links Obligation to Document (not site-specific)
      - Evidence can be linked from any site in `document_site_assignments`
    - **If** `obligations_shared = false`:
      - Creates separate Obligation records for each Site
      - Links each Obligation to Document and specific Site
      - Evidence must be linked from same Site as Obligation

15. **User:** Can view consolidated dashboard ("All Sites") or filter by specific Site

### End States
- **Site Added:** New Site available; billing updated
- **Multi-Site Permit:** Document linked to multiple Sites with chosen Obligation strategy

### Error Paths
- **Billing Failure:** Site creation rolls back; prompt user to update payment method
- **Cross-Site Evidence Linking Attempted:** Error displayed; evidence must be linked within same Site **unless both are linked to same multi-site shared permit (obligations_shared = true)**

---

## 2.8 Permit Variation Handling

### Starting Point
- **Trigger:** User uploads new permit version OR clicks "Add Variation"
- **Prerequisites:** Existing active Document for Site

### Step-by-Step Flow

1. **User:** Clicks "Add Variation" on existing permit OR uploads new permit with matching reference

2. **System:** Detects potential version relationship
    - Compares permit reference numbers
    - Prompts: "Is this a variation to [Permit Reference]?"

3. **User:** Confirms variation relationship

4. **System:** Creates new Document with version link
    - Sets version number: increments minor version (1.0 → 1.1)
    - Sets `parent_document_id` to original Document
    - Processes extraction as normal

5. **System:** Compares Obligations between versions
    - Identifies matched Obligations (similar text, same condition reference)
    - Identifies new Obligations (no match in previous version)
    - Identifies removed Obligations (exist in previous, not in new)

6. **System:** Displays version comparison
    - Shows matched Obligations with changes highlighted
    - Shows new Obligations
    - Shows removed Obligations

7. **User:** Reviews and confirms changes

8. **System:** Handles outstanding items on old version
    - **If** outstanding Deadlines exist on old version:
      - Prompts: "Outstanding items exist on previous version"
      - Options:
        - Migrate outstanding items to new version
        - Archive outstanding items (mark as superseded)
        - Keep both versions active temporarily

9. **User:** Selects handling option

10. **System:** Executes migration/archiving
    - **If** Migrate:
      - Auto-matches Obligations by text similarity (>80%)
      - Transfers evidence history and Schedule continuation
      - Flags unmatched items for manual review
    - **If** Archive:
      - Sets old Obligations `status = REJECTED` with reason "source_document_superseded"

11. **System:** Updates Document statuses
    - Old Document: `status = SUPERSEDED`
    - New Document: `status = ACTIVE`

12. **System:** Logs all version changes in AuditLog

### End States
- **Variation Applied:** New version active; old version superseded; evidence migrated
- **Versions Coexist:** Temporary parallel tracking until user resolves

### Error Paths
- **Version Conflict:** Outstanding items on old version not resolved; blocks new version activation
- **Migration Failure:** Auto-matching fails; flagged items require manual review

---

# 3. MODULE 2: TRADE EFFLUENT

## 3.1 Consent Upload & Parameter Extraction

### Starting Point
- **Trigger:** User navigates to Site → Trade Effluent → Documents → Upload Consent
- **Prerequisites:** Trade Effluent module active (derived from tenancy entitlements); Site exists
- **Entry Path:** Site Context → Trade Effluent Module → Documents → Upload

### Step-by-Step Flow

1. **User:** Navigates to Site → Trade Effluent → Documents
2. **User:** Clicks "Upload Consent" button

2. **System:** Displays upload modal (same as permit upload)

3. **User:** Uploads Trade Effluent Consent PDF

4. **System:** Performs document ingestion pipeline (same as Section 2.1, Steps 4-10)
    - Routes to Trade Effluent module (derived from tenancy entitlements)

5. **System:** Extracts consent metadata
    - Water company name (Thames Water, Severn Trent, etc.)
    - Consent reference number
    - Discharge location

6. **System:** Extracts Parameter records
    - For each detected parameter:
      - Identifies `parameter_type` (BOD, COD, SS, PH, TEMPERATURE, FOG, AMMONIA, PHOSPHORUS)
      - Extracts `limit_value` (numeric)
      - Extracts `unit` (mg/l, pH units, °C)
      - Determines `limit_type` (MAXIMUM, AVERAGE, RANGE)
      - Extracts `sampling_frequency` if specified
      - Calculates `confidence_score`

7. **System:** Creates Parameter records linked to Document
    - Sets `warning_threshold_percent = 80` (default)

8. **System:** Generates default sampling schedules for each Parameter
    - **If** frequency specified in consent, **then** use specified frequency
    - **Else** apply defaults:
      - PH, TEMPERATURE: DAILY
      - BOD, COD, SS: WEEKLY
      - Others: MONTHLY

9. **System:** Displays extraction results
    - Shows Parameter table with limits
    - Shows confidence scores
    - Flags low-confidence items for review

10. **User:** Reviews and confirms Parameter extraction

11. **System:** Sets Document `status = ACTIVE`

### End States
- **Consent Active:** Parameters extracted; sampling schedules generated
- **Review Required:** Low-confidence Parameters flagged for user review

### Error Paths
- **No Parameters Found:** Prompt user to enter Parameters manually
- **Water Company Not Recognised:** Prompt user to select from list

---

## 3.2 Lab Result Import & Validation

> [UPDATE – Email Parsing + CSV as Primary Capture Methods – 2025-01-01]

**Primary Capture Methods:**
- **Email Parsing:** Automated parsing of lab certificate emails with OCR (primary method)
- **CSV Upload:** Template-based bulk import (primary fallback method)
- **Manual Entry:** Form-based entry (for corrections or missing data)
- **PDF Upload:** Direct PDF upload with LLM extraction (secondary method)

### Starting Point
- **Trigger:** User clicks "Add Lab Results" OR uploads CSV
- **Prerequisites:** At least one active Parameter exists

### Step-by-Step Flow

1. **User:** Navigates to Site → Trade Effluent → Parameters
2. **User:** Clicks "Add Lab Results" button

2. **System:** Displays input options:
    - Email Parsing (primary - automated from lab emails)
    - CSV Upload (primary fallback - template provided)
    - Manual Entry (form - for corrections)
    - PDF Upload (secondary - lab report for extraction)

**Email Parsing Path (Primary Method):**

2a. **System:** Monitors designated email inbox for lab certificates
    - Checks email attachments (PDF, images)
    - Extracts lab certificate data via OCR
    - Parses parameter values, sample dates, lab references
    - Flags extracted data for user review

2b. **System:** Displays extracted lab results for review
    - Shows extracted values in review table
    - Highlights low-confidence extractions
    - User can edit values before acceptance

2c. **User:** Reviews and confirms extracted data
    - Edits incorrect values if needed
    - Confirms valid extractions
    - Clicks "Accept Results"

2d. **System:** Creates LabResult records from confirmed extractions
    - Links to appropriate Parameter
    - Stores email metadata (sender, date, subject) for audit trail
    - Proceeds to Step 10 (anomaly detection)

### Manual Entry Path:

3. **User:** Selects "Manual Entry"

4. **System:** Displays form:
    - Sample Date (required)
    - Sample ID (optional)
    - Parameter dropdown (lists active Parameters)
    - Value (required, numeric)
    - Unit (auto-filled from Parameter, editable)
    - Lab Reference (optional)

5. **User:** Completes form and clicks "Save"

6. **System:** Validates entry
    - **If** value not numeric, **then** display error
    - **If** date is future, **then** display error
    - **If** unit doesn't match Parameter, **then** display warning
    - **Else** proceed to Step 10

### CSV Upload Path:

3. **User:** Selects "CSV Upload"

4. **System:** Offers template download
    - Columns: Sample Date, Sample ID, Parameter, Value, Unit, Lab Reference

5. **User:** Uploads completed CSV

6. **System:** Validates CSV
    - Checks column headers match template
    - Validates each row:
      - Value must be numeric
      - Date must not be future
      - Unit must match Parameter
      - Duplicate sample dates flagged for review

7. **System:** Displays validation summary
    - Shows valid rows count
    - Shows invalid rows with errors
    - Shows duplicate warnings

8. **User:** Reviews and confirms import

9. **System:** Creates LabResult records for valid rows

### PDF Upload Path:

3. **User:** Selects "PDF Upload"

4. **User:** Uploads lab report PDF

5. **System:** Performs LLM extraction on lab report
    - Extracts sample dates, parameter values, units
    - Calculates confidence_score for each extracted value

6. **System:** Displays extracted values for review
    - Flags all extractions for human confirmation

7. **User:** Reviews, edits if needed, confirms

8. **System:** Creates LabResult records

### For All Paths:

10. **System:** Creates LabResult record(s)
    - Links to Parameter
    - Calculates `percentage_of_limit` (Value / Limit × 100)
    - Sets `entry_method` (MANUAL, CSV, PDF_EXTRACTION)

11. **System:** Checks for anomalies and exceedances
    - **Anomaly Detection:**
      - Checks if value significantly outside historical range (>3 standard deviations)
      - Checks if parameter value inconsistent with expected units
      - Checks if lab reference format mismatches
      - Checks if duplicate sample IDs or dates detected
      - **If** anomaly detected, **then**:
        - Flags lab result with `anomaly_detected = true`
        - Creates corrective action task automatically:
          - Task type: `LAB_RESULT_ANOMALY`
          - Task assigned to: Site Manager (or user who submitted result)
          - Task description: "Anomaly detected in lab result [sample_id]: [anomaly_description]"
          - Task due date: 7 days from detection
          - Task requires: Evidence of investigation and resolution
        - Sends notification to assigned user
        - Links corrective task to lab result record
    - **Exceedance Detection:**
      - **If** value ≥ 100% of limit:
        - Creates Exceedance record
        - Sends breach alert (email + SMS + in-app)
        - Sets Exceedance `status = OPEN`
      - **If** value ≥ 80% of limit:
        - Sends warning alert

12. **System:** Updates Parameter trend data
    - Calculates 3-month rolling average
    - Updates trend direction indicator (↑ ↓ →)

### End States
- **Results Recorded:** LabResult records created; Parameter trends updated
- **Exceedance Detected:** Exceedance record created; alerts sent

### Error Paths
- **CSV Format Error:** Display specific row/column errors; prompt user to fix and re-upload
- **Duplicate Sample Dates:** Flag for user decision (skip, overwrite, keep both)

---

## 3.3 Parameter Tracking & Monitoring

### Starting Point
- **Trigger:** User navigates to Site → Trade Effluent → Dashboard
- **Prerequisites:** Parameters exist with LabResults

### Step-by-Step Flow

1. **User:** Navigates to Site → Trade Effluent → Dashboard
2. **User:** Views Trade Effluent dashboard

2. **System:** Displays Parameter status cards:
    - For each Parameter:
      - Current value (most recent LabResult)
      - Limit value
      - Percentage of limit (with colour coding)
      - Trend indicator (↑ ↓ →)
      - Days until next sample due

3. **System:** Colour codes status:
    - Green: < 70% of limit
    - Amber: 70-79% of limit
    - Orange: 80-89% of limit
    - Red: ≥ 90% of limit

4. **User:** Clicks on Parameter card to view detail

5. **System:** Displays Parameter detail view:
    - All LabResults in table (sortable, filterable)
    - Trend chart (3-month, 12-month options)
    - Limit line on chart
    - 80% warning threshold line on chart
    - Exceedance history

6. **User:** Hovers over chart points for detailed values

7. **User:** Uses date filter to view specific period

8. **System:** Updates chart and statistics for selected period

### Trend Warning Logic:

9. **System:** Monitors for trend warnings:
    - **If** 3 consecutive results > 70% of limit:
      - Display trend warning badge
      - Send trend warning alert
    - **If** rolling average > 75% of limit:
      - Display "Elevated Concern" flag
      - Add to "Early Warnings" dashboard widget

### End States
- **Monitoring Active:** User viewing current Parameter status and trends
- **Warning Displayed:** Trend warning or elevated concern flag visible

### Error Paths
- **No Data:** Display "No lab results recorded" message with prompt to add

---

## 3.4 Module 2 Pack Generation Validation Workflow

### Starting Point
- **Trigger:** User attempts to generate pack that includes Module 2 (Trade Effluent) data
- **Prerequisites:** Pack generation initiated; Module 2 active; Pack date range specified

### Step-by-Step Flow

1. **System:** Detects Module 2 data in pack scope
   - Checks if pack date range includes any Trade Effluent consents
   - Checks if any active parameters exist for those consents

2. **System:** Validates All Sampling Periods Have Results
   - For each active consent parameter in pack date range:
     - Calculates all sampling periods based on parameter frequency (daily, weekly, monthly, quarterly)
     - For each sampling period:
       - Checks if at least one lab result exists for that period
       - **If** no lab result found, **then**:
         - Adds to missing results list
         - Records: `{parameter_name, period_start, period_end, frequency}`

3. **System:** Validates All Results Have Validated Evidence
   - For each lab result in pack date range:
     - Checks if lab result has at least one evidence item linked
     - Checks if evidence item has `validation_status = 'APPROVED'` or `validation_status = 'VERIFIED'`
     - **If** no evidence linked, **then**:
         - Adds to missing evidence list
         - Records: `{sample_id, parameter_name, sample_date, issue: 'NO_EVIDENCE'}`
     - **If** evidence exists but `validation_status = 'PENDING'`, **then**:
         - Adds to unvalidated evidence list
         - Records: `{sample_id, parameter_name, sample_date, evidence_id, issue: 'PENDING_VALIDATION'}`
     - **If** evidence exists but `validation_status = 'REJECTED'`, **then**:
         - Adds to rejected evidence list
         - Records: `{sample_id, parameter_name, sample_date, evidence_id, issue: 'REJECTED_EVIDENCE'}`

4. **System:** Checks Validation Results
   - **If** missing results list is empty AND missing evidence list is empty AND unvalidated evidence list is empty AND rejected evidence list is empty, **then**:
     - Proceed to pack generation (Step 8)
   - **Else**:
     - Block pack generation
     - Display validation error screen (Step 5)

5. **System:** Displays Validation Error Screen
   - Shows error message: "Cannot generate pack: Trade Effluent evidence requirements not met"
   - Displays missing results section:
     - Table with columns: Parameter, Period Start, Period End, Frequency, Status
     - Each row shows missing period
     - "Add Lab Result" button for each row
   - Displays missing/unvalidated evidence section:
     - Table with columns: Sample ID, Parameter, Sample Date, Evidence Status, Action
     - Color coding: Red for missing, Amber for pending, Red for rejected
     - "Link Evidence" button for missing evidence
     - "Validate Evidence" button for pending evidence
     - "Replace Evidence" button for rejected evidence

6. **User:** Reviews validation errors and takes action
   - **Option A:** Upload missing lab results
     - User clicks "Add Lab Result" for missing period
     - System opens lab result entry form (see Section 3.2)
     - User completes and saves
     - System re-validates (returns to Step 2)
   - **Option B:** Link evidence to lab results
     - User clicks "Link Evidence" for lab result
     - System opens evidence linking modal
     - User selects existing evidence or uploads new evidence
     - System links evidence to lab result
     - System re-validates (returns to Step 3)
   - **Option C:** Validate pending evidence
     - User clicks "Validate Evidence" for pending evidence
     - System opens evidence validation modal
     - User reviews evidence and selects: Approve or Reject
     - If Approve: Sets `validation_status = 'APPROVED'`
     - If Reject: Sets `validation_status = 'REJECTED'`, requires rejection reason
     - System re-validates (returns to Step 3)
   - **Option D:** Replace rejected evidence
     - User clicks "Replace Evidence" for rejected evidence
     - System opens evidence upload modal
     - User uploads new evidence
     - System links new evidence to lab result
     - System re-validates (returns to Step 3)
   - **Option E:** Adjust pack date range (if acceptable)
     - User clicks "Adjust Date Range"
     - System opens date range picker
     - User selects new date range that excludes incomplete periods
     - System re-validates with new date range (returns to Step 2)

7. **System:** Re-validates after user actions
   - Repeats Steps 2-4 with updated data
   - **If** all requirements met, **then** proceed to Step 8
   - **Else** return to Step 5 with updated error list

8. **System:** Proceeds with Pack Generation
   - All validation checks passed
   - Pack generation continues with Module 2 data included
   - Pack includes all validated lab results with evidence links
   - Evidence items are version-locked at generation time

### End States
- **Pack Generation Proceeds:** All validation checks passed; pack generation continues
- **Validation Errors Resolved:** User fixed all issues; pack generation can proceed

### Error Paths
- **Missing Sampling Periods:** User must add lab results for all periods or adjust date range
- **Missing Evidence:** User must link evidence to all lab results
- **Unvalidated Evidence:** User must validate all pending evidence items
- **Rejected Evidence:** User must replace rejected evidence with approved evidence

### UI Components
- **Validation Error Screen:**
  - Error summary card (red background)
  - Missing results table (with action buttons)
  - Missing/unvalidated evidence table (with action buttons)
  - "Retry Validation" button (re-runs validation)
  - "Adjust Date Range" button (allows date range modification)
  - "Cancel Pack Generation" button (returns to pack configuration)

### Integration Points
- **Lab Result Entry:** Links to Section 3.2 (Lab Result Import & Validation)
- **Evidence Linking:** Links to Section 2.4 (Evidence Linking Workflow)
- **Evidence Validation:** Uses evidence validation modal (Manager/Admin only)

---

## 3.5 Parameter Limit → Schedule Generation → Exceedance Detection Workflow

### Starting Point
- **Trigger:** Parameter extracted from consent document OR user manually creates Parameter
- **Prerequisites:** Consent document exists; Parameter has limit value defined

### Step-by-Step Flow

1. **System:** Parameter created (from extraction or manual entry)
   - Parameter record includes: `parameter_type`, `limit_value`, `unit`, `warning_threshold_percent = 80`

2. **System:** Automatically generates sampling schedule
   - **If** frequency specified in consent, **then** use specified frequency
   - **Else** apply defaults:
     - PH, TEMPERATURE: DAILY
     - BOD, COD, SS: WEEKLY
     - Others: MONTHLY
   - Creates Schedule record with:
     - `obligation_id` (linked to parameter monitoring obligation)
     - `frequency` (from consent or default)
     - `next_due_date` (calculated from frequency)
     - `status = ACTIVE`

3. **System:** Schedule triggers lab sampling reminders
   - **If** `next_due_date` approaches (within 3 days), **then** send reminder notification
   - **If** `next_due_date` passed, **then** send overdue notification

4. **User:** Uploads LabResult (via CSV or manual entry)
   - LabResult includes: `parameter_type`, `value`, `sampling_date`, `lab_reference`

5. **System:** Validates LabResult against Parameter limit
   - Compares `lab_result.value` with `parameter.limit_value`
   - Calculates percentage: `(value / limit_value) * 100`

6. **System:** Checks thresholds and creates Exceedance if needed
   - **If** `value ≥ limit_value`, **then**:
     - Creates Exceedance record
     - Sets `exceedance.status = OPEN`
     - Sets `exceedance.severity = BREACH` (limit exceeded)
     - Triggers breach alert workflow (Section 3.4)
   - **If** `value ≥ (limit_value * 0.8)` AND `value < limit_value`, **then**:
     - Sets `parameter.warning_status = APPROACHING_LIMIT`
     - Sends warning notification (non-critical)
   - **If** `value < (limit_value * 0.8)`, **then**:
     - Sets `parameter.warning_status = NORMAL`
     - No action required

7. **User:** Investigates exceedance and takes corrective action
   - Views Exceedance details
   - Documents corrective action in `exceedance.resolution_notes`
   - Uploads evidence of corrective action (if required)

8. **User:** Marks Exceedance as resolved
   - Sets `exceedance.status = RESOLVED`
   - Records `resolved_at` timestamp
   - System logs resolution in audit trail

9. **System:** Updates Parameter status
   - **If** exceedance resolved, **then** set `parameter.warning_status = NORMAL`
   - **If** multiple exceedances, **then** track exceedance count and frequency

### End States
- **Normal Operation:** Parameter within limits; schedule active; no exceedances
- **Warning State:** Parameter approaching limit (80-100%); warning notifications sent
- **Breach State:** Parameter exceeds limit; exceedance created; breach alerts sent; corrective action required

### Error Paths
- **Schedule Generation Failure:** System logs error; user can manually create schedule
- **Exceedance Detection Failure:** System logs error; user can manually create exceedance record

---

## 3.4 Exceedance Detection & Alerting

### Starting Point
- **Trigger:** Automatic when LabResult value ≥ limit OR manual exceedance report
- **Prerequisites:** Parameter with limit defined; LabResult recorded

### Step-by-Step Flow

1. **System:** Detects exceedance when LabResult saved
    - Compares `recorded_value` to Parameter `limit_value`
    - **If** value ≥ limit, **then** proceed

2. **System:** Creates Exceedance record:
    - Sets `recorded_value`, `limit_value`
    - Calculates `percentage_of_limit`
    - Sets `recorded_date` from LabResult
    - Links to LabResult via `sample_id`
    - Sets `status = OPEN`

3. **System:** Triggers immediate escalation:
    - Sends alert to Site Manager + Admin
    - Channels: Email + SMS + In-app notification
    - Message includes: Parameter name, recorded value, limit, percentage

4. **System:** Displays Exceedance in dashboard:
    - Red alert banner on Trade Effluent dashboard
    - Entry in "Exceedance History" widget

5. **User:** Views Exceedance and investigates

6. **User:** Clicks "Resolve Exceedance" when corrective action taken

7. **System:** Prompts for resolution details:
    - Resolution notes (required)
    - Corrective actions taken
    - Supporting evidence (optional upload)

8. **User:** Completes resolution form

9. **System:** Updates Exceedance record:
    - Sets `status = RESOLVED`
    - Stores `resolution_notes`
    - Records `resolved_at` timestamp
    - Logs to AuditLog

10. **User:** (Optional) Closes Exceedance after verification

11. **System:** Sets `status = CLOSED`

### End States
- **Exceedance Open:** Alert sent; awaiting investigation
- **Exceedance Resolved:** Corrective action documented
- **Exceedance Closed:** Final verification complete

### Error Paths
- **Alert Delivery Failure:** Retry alert; log failure; escalate to backup contact

---

## 3.5 Water Company Report Generation

### Starting Point
- **Trigger:** User clicks "Generate Report" OR scheduled report generation
- **Prerequisites:** LabResults exist for reporting period

### Step-by-Step Flow

1. **User:** Clicks "Generate Water Company Report"

2. **System:** Displays report options:
    - Report type: Monthly summary, Quarterly compliance, Annual return
    - Reporting period (date range)
    - Water company selection (if multiple consents)

3. **User:** Selects options and clicks "Generate"

4. **System:** Compiles report data:
    - Consent reference
    - Reporting period
    - All LabResults for period (grouped by Parameter)
    - Any Exceedances during period
    - Discharge volume calculations (if data available)

5. **System:** Applies water company template
    - Selects template based on water company
    - Formats per water company requirements

6. **System:** Generates report:
    - PDF export (formatted report)
    - **JSON export (machine-readable):** User can select "Export as JSON" option
    - **XML export (regulatory format):** User can select "Export as XML" option
    - CSV export (raw data)

7. **System:** Displays report preview

8. **User:** Reviews report
    - **If** corrections needed, **then** edits source data and regenerates
    - **If** acceptable, **then** downloads

9. **User:** Downloads report in preferred format

10. **User:** Submits to water company (manual process outside system)

### End States
- **Report Generated:** PDF/CSV ready for download and submission
- **Report Scheduled:** Automatic generation configured for recurring reports

### Error Paths
- **Insufficient Data:** Display warning "No data for selected period"; prompt to adjust dates
- **Missing Parameters:** Display list of Parameters without results for period

---

## 3.6 Sampling Schedule Management

### Starting Point
- **Trigger:** Auto-generated from consent OR user manual setup
- **Prerequisites:** Parameters exist

### Step-by-Step Flow

1. **System:** Auto-generates sampling schedules after consent upload (per Section 3.1)

2. **User:** Views sampling schedules on Trade Effluent dashboard
    - Shows each Parameter with next sample due date
    - Shows days until due

3. **User:** Clicks "Manage Schedules" to customise

4. **System:** Displays schedule management view:
    - List of Parameters with current frequencies
    - Next due dates
    - Reminder settings

5. **User:** Selects Parameter to edit schedule

6. **System:** Displays schedule edit form:
    - Frequency (can only increase, not decrease below consent requirement)
    - Base date
    - Reminder days

7. **User:** Modifies schedule and saves

8. **System:** Validates changes
    - **If** frequency reduced below consent requirement:
      - Display error: "Sampling frequency cannot be reduced below consent requirement without consent variation"
    - **Else** save changes and recalculate next due date

9. **System:** Generates Deadline records per schedule

10. **System:** Sends reminders per configured reminder_days

### End States
- **Schedules Active:** All Parameters have active sampling schedules
- **Schedule Modified:** User customisation applied

### Error Paths
- **Invalid Frequency Reduction:** Block change; display consent requirement

---

## 3.7 Corrective Action Lifecycle Workflow (Trade Effluent)

> [v1.1 UPDATE – Corrective Action Lifecycle Workflow – 2025-01-01]

### Starting Point
- **Trigger:** Breach or exceedance event detected
- **Prerequisites:** Trade Effluent module active (derived from tenancy entitlements); Exceedance or breach exists
- **Entry Path:** Site Context → Trade Effluent Module → Corrective Actions

### Step-by-Step Flow

1. **System:** Detects breach or exceedance event
2. **System:** Creates corrective action record
3. **System:** Displays alert to user
4. **User:** Views corrective action details
5. **Investigation Phase:**
   - **User:** Reviews root cause analysis
   - **User:** Assesses impact
   - **User:** Documents investigation findings
6. **Action Assignment Phase:**
   - **User:** Creates action items
   - **User:** Assigns owners
   - **User:** Sets due dates
7. **Resolution Phase:**
   - **User:** Uploads evidence of resolution
   - **User:** Documents corrective measures taken
8. **Closure Phase:**
   - **User:** Reviews all evidence
   - **User:** Closes corrective action
   - **User:** Provides regulator justification
9. **System:** Updates compliance score
10. **System:** Updates exceedance status

### End States
- **Resolved:** Corrective action closed, breach resolved
- **In Progress:** Action items assigned, resolution in progress

---

# 4. MODULE 3: MCPD/GENERATORS

## 4.1 MCPD Registration Upload

### Starting Point
- **Trigger:** User navigates to Site → MCPD / Generators → Documents → Upload Registration
- **Prerequisites:** MCPD / Generators module active (derived from tenancy entitlements); Site exists
- **Entry Path:** Site Context → MCPD / Generators Module → Documents → Upload

### Step-by-Step Flow

1. **User:** Navigates to Site → MCPD / Generators → Documents
2. **User:** Clicks "Upload MCPD Registration" button

2. **System:** Displays upload modal

3. **User:** Uploads MCPD Registration PDF

4. **System:** Performs document ingestion pipeline
    - Routes to MCPD / Generators module (derived from tenancy entitlements)

5. **System:** Extracts registration metadata:
    - Registration reference
    - Anniversary date (for AER submission)
    - Submission deadline

6. **System:** Extracts Generator records:
    - Generator identifier
    - Generator type (MCPD_1_5MW, MCPD_5_50MW, SPECIFIED_GENERATOR, EMERGENCY_GENERATOR)
    - Capacity (MW)
    - Fuel type
    - Location description
    - Annual run-hour limit (default based on type)
    - Monthly limit (if applicable)

7. **System:** Sets default limits based on generator type:
    - MCPD_1_5MW: 500 hours/year
    - MCPD_5_50MW: 500 hours/year
    - SPECIFIED_GENERATOR: 50 hours/year
    - EMERGENCY_GENERATOR: Per permit

8. **System:** Creates Generator records linked to Document

9. **System:** Displays extraction results:
    - Generator inventory table
    - Limit values
    - Confidence scores

10. **User:** Reviews and confirms Generator setup

11. **System:** Sets Document `status = ACTIVE`
    - Generates Stack Test schedules (default: ANNUAL)
    - Generates AER reminders (60, 30, 7 days before deadline)

### End States
- **Registration Active:** Generators tracked; schedules generated
- **Review Required:** Low-confidence extractions flagged

### Error Paths
- **No Generators Found:** Prompt user to add generators manually
- **Unknown Generator Type:** Prompt user to select from options

---

## 4.2 Run-Hour Entry & Tracking

### Starting Point
- **Trigger:** User clicks "Log Run Hours" OR uploads CSV
- **Prerequisites:** At least one Generator exists

### Step-by-Step Flow

1. **User:** Navigates to Site → MCPD / Generators → Run Hours
2. **User:** Clicks "Log Run Hours" button

2. **System:** Displays entry options:
    - Manual Entry
    - CSV Import
    - Link from Maintenance Record

### Manual Entry Path:

3. **User:** Selects Generator from dropdown

4. **System:** Displays current status:
    - Annual limit
    - Hours used YTD
    - Hours remaining
    - Percentage utilisation

5. **User:** Enters:
    - Recording period (date range or single date)
    - Hours recorded (numeric)
    - Notes (optional)

6. **System:** Validates entry:
    - **If** hours negative, **then** display error
    - **If** recording date in future, **then** display error
    - **Else** proceed

7. **System:** Creates RunHourRecord:
    - Calculates `running_total` (sum of all records for anniversary period)
    - Calculates `percentage_of_limit`
    - Sets `entry_method = MANUAL`

8. **System:** Checks limit thresholds and updates compliance score:
   - **If** running_total ≥ 80% of limit:
     - Sends warning alert
     - Sets `generator.warning_status = APPROACHING_LIMIT`
     - Updates compliance score: `compliance_score = compliance_score - 5` (if not already penalized)
   - **If** running_total ≥ 90% of limit:
     - Sends elevated warning
     - Sets `generator.warning_status = CRITICAL_WARNING`
     - Updates compliance score: `compliance_score = compliance_score - 10` (if not already penalized)
   - **If** running_total ≥ 100% of limit:
     - Sends breach alert
     - Sets `generator.warning_status = BREACH`
     - Sets `generator.compliance_status = NON_COMPLIANT`
     - Updates compliance score: `compliance_score = compliance_score - 25` (breach penalty)
     - Displays prominent warning: "Limit reached - operations should cease"
     - Creates BreachRecord linked to Generator
     - Logs breach in audit trail
     - Triggers breach notification workflow (see below)

9. **System:** Calculates overall MCPD / Generators module compliance score
   - Aggregates all Generator compliance scores
   - Calculates site-level compliance: `AVG(generator.compliance_score)`
   - Updates `site.module_3_compliance_score`
   - **If** site compliance score < 70%, **then**:
     - Sends site-level compliance warning to Admin/Owner
     - Flags site in compliance dashboard

10. **System:** Breach notification workflow (if breach detected)
    - **Immediate Actions:**
      - Sends email/SMS alert to Site Manager, Admin, Owner
      - Creates notification in dashboard (high priority)
      - Logs breach event in `breach_logs` table
    - **Follow-up Actions (within 24 hours):**
      - Sends reminder if breach not acknowledged
      - Escalates to Owner if no response after 48 hours
    - **Resolution Tracking:**
      - User must document breach resolution
      - System tracks time to resolution
      - Compliance score penalty reduced by 50% if resolved within 7 days

### CSV Import Path:

3. **User:** Downloads CSV template:
    - Columns: Generator ID, Date, Hours, Notes

4. **User:** Uploads completed CSV

5. **System:** Validates and imports (similar to lab results CSV)

6. **System:** Updates running totals for all affected generators

### Link from Maintenance Record Path:

3. **User:** Selects "Link from Maintenance Record"

4. **System:** Displays MaintenanceRecords with run-hour data

5. **User:** Selects record to extract hours from

6. **System:** Creates RunHourRecord linked to MaintenanceRecord

### End States
- **Hours Logged:** RunHourRecord created; utilisation updated
- **Threshold Warning:** Alert sent for approaching limit
- **Limit Breach:** Breach alert sent; operations warning displayed

### Error Paths
- **Invalid Hours:** Display validation error; reject entry
- **Duplicate Period:** Warn user of existing record for same period; offer to overwrite or add

---

## 4.3 Multi-Generator Aggregation

### Starting Point
- **Trigger:** User views MCPD / Generators dashboard with multiple generators
- **Prerequisites:** Multiple generators exist

### Step-by-Step Flow

1. **User:** Navigates to Site → MCPD / Generators → Dashboard
2. **User:** Views MCPD / Generators dashboard

2. **System:** Displays aggregation views:
    - Per-generator cards (individual tracking)
    - Site-level aggregation (total across site)
    - Company-level aggregation (all sites)

3. **System:** Calculates aggregations:
    ```
    Site: Factory A
    ├─ Generator 1: 150 hours (30% of 500h limit)
    ├─ Generator 2: 200 hours (40% of 500h limit)
    └─ Total Site Run-Hours: 350 hours
    ```

4. **User:** Toggles between views (Generator, Site, Company)

5. **User:** Clicks on Generator to view detail

6. **System:** Displays Generator detail:
    - Run-hour history (all records)
    - Utilisation chart (monthly breakdown)
    - Maintenance history
    - Stack test history

7. **User:** Uses date filter to view specific period (current year, previous year, custom)

8. **System:** Recalculates aggregations for selected period

### End States
- **View Active:** User viewing aggregated or individual Generator data
- **Filtered View:** Data filtered to selected period

### Error Paths
- **No Generators:** Display "No generators registered" with prompt to upload registration

---

## 4.4 AER Generation Workflow

### Starting Point
- **Trigger:** User clicks "Prepare AER" OR system reminder at 60 days before deadline
- **Prerequisites:** MCPD Registration exists; RunHourRecords exist for reporting period

### Step-by-Step Flow

1. **System:** Sends reminder at 60 days before AER deadline

2. **User:** Clicks "Prepare AER" on MCPD / Generators dashboard
    - OR clicks link in reminder notification

3. **System:** Displays AER preparation screen:
    - Shows: MCPD Registration reference
    - Shows: Reporting period (anniversary year)
    - Shows: Submission deadline

4. **System:** Auto-populates AER data:
    - Generator details (from generators table)
    - Total run-hours per generator (from run_hour_records aggregation)
    - Fuel consumption (from user-entered data or MaintenanceRecords)
    - Emissions data (from stack_test_results)

5. **System:** Displays data completeness check:
    - ✅ Run-hours: Complete
    - ⚠️ Fuel consumption: Missing for Generator 2
    - ✅ Stack test results: Complete
    - Lists any missing or incomplete data

6. **User:** Reviews auto-populated data
    - Can edit any field
    - Must complete missing fields

7. **User:** Enters any missing data:
    - Fuel consumption (type, quantity, units)
    - Incidents/breakdowns (if any)

8. **System:** Validates AER data:
    - All required fields populated
    - Calculations verified (run-hours match records)
    - **If** validation fails, **then** highlight issues

9. **User:** Completes validation and clicks "Generate AER"

10. **System:** Generates AER document:
    - Applies EA standard format
    - Sections:
      1. Generator Details
      2. Reporting Period
      3. Run-Hours Summary
      4. Fuel Consumption
      5. Emissions Data
      6. Stack Test Results
      7. Incidents/Breakdowns
    - Exports as PDF (EA format) and CSV (data export)

11. **System:** Creates AERDocument record:
    - Sets `status = READY`
    - Stores generated file path
    - Records reporting period, total hours

12. **User:** Downloads AER
    - PDF for official submission
    - CSV for manual data entry to EA portal

13. **User:** Submits to EA portal (manual process outside system)

14. **User:** Returns to system and marks as submitted
    - Enters submission date
    - Optionally uploads confirmation/receipt

15. **System:** Updates AERDocument:
    - Sets `status = SUBMITTED`
    - Records submission date

### End States
- **AER Ready:** Document generated; ready for submission
- **AER Submitted:** Submission recorded; compliance demonstrated

### Error Paths
- **Incomplete Data:** Block generation until all required fields populated
- **Calculation Mismatch:** Display warning; require user confirmation to proceed

---

## 4.5 Stack Test Scheduling

### Starting Point
- **Trigger:** Auto-generated from registration OR user manual setup
- **Prerequisites:** Generators exist

### Step-by-Step Flow

1. **System:** Auto-generates stack test schedules after registration upload:
    - Default frequency: ANNUAL (if not specified in registration)
    - Sets reminders: 60 days, 30 days, 7 days before due

2. **User:** Views stack test schedule on Generators dashboard
    - Shows each Generator with next test due
    - Shows days until due

3. **System:** Sends reminders per configured schedule

4. **User:** Arranges stack test with testing company (outside system)

5. **User:** After test completion, clicks "Record Stack Test"

6. **System:** Displays stack test entry form:
    - Generator selection
    - Test date
    - Results upload (PDF report)
    - Emissions values (NOx, SO2, CO, particulates)
    - Compliance status (Pass/Fail)

7. **User:** Completes form and uploads test report

8. **System:** Creates StackTest record:
    - Links to Generator
    - Stores results
    - Compares emissions against registration ELVs
    - **If** emissions exceed ELV:
      - Flags as non-compliant
      - Sends alert

9. **System:** Updates Generator:
    - Sets next test due date (current date + frequency interval)

10. **System:** Links StackTest evidence to relevant Module 1 Obligations (if applicable)

### End States
- **Test Recorded:** StackTest record created; next due date set
- **Non-Compliant Result:** Alert sent; follow-up required

### Error Paths
- **Missing Results:** Prompt user to complete all required emission values
- **Past Due Test:** Display overdue warning; allow backdated entry

---

## 4.6 Maintenance Record Linking

### Starting Point
- **Trigger:** User clicks "Add Maintenance Record" on Generator
- **Prerequisites:** Generator exists

### Step-by-Step Flow

1. **User:** Clicks "Add Maintenance Record" on Generator detail page

2. **System:** Displays maintenance entry form:
    - Maintenance date
    - Maintenance type (Routine, Repair, Emergency, Calibration)
    - Description
    - Run hours at service (optional - for tracking)
    - Next service due date
    - Evidence upload (service record, certificate)

3. **User:** Completes form and uploads evidence

4. **System:** Creates MaintenanceRecord:
    - Links to Generator
    - Links evidence to record
    - **If** run hours at service provided:
      - Offers to create RunHourRecord from this data

5. **User:** (If offered) Confirms run-hour extraction

6. **System:** Creates RunHourRecord linked to MaintenanceRecord

7. **System:** Updates Generator:
    - Sets next service due date
    - Adds to maintenance history

8. **System:** Monitors for overdue maintenance:
    - **If** next service due date passed:
      - Displays "Service Overdue" flag
      - Sends alert

9. **System:** Links MaintenanceRecord evidence to relevant Module 1 Obligations (if applicable)

### End States
- **Maintenance Recorded:** MaintenanceRecord created; history updated
- **Run Hours Extracted:** RunHourRecord created from maintenance data

### Error Paths
- **Missing Required Fields:** Highlight missing fields; block save
- **Invalid Date:** Reject future dates for maintenance already performed

---

# 5. CROSS-MODULE WORKFLOWS

**Note:** Cross-module workflows query `modules.requires_module_id` to determine prerequisites and activation flow. Module activation logic is data-driven (stored in `modules` table), not hardcoded. New modules automatically participate in cross-module workflows once registered. See Canonical Dictionary Section B.31 (Module Extension Pattern) and Product Logic Specification Section C.4 (Module Extension Pattern - business logic) for guidance. For the `modules` table structure, see Canonical Dictionary Section C.4 (Module Registry Table).

## 5.1 Module 2 Activation (from Module 1)

### Starting Point
- **Trigger:** Cross-sell trigger detected OR user manual activation
- **Prerequisites:** Prerequisite modules (defined in modules.requires_module_id) are active; user has Owner or Admin role

### Step-by-Step Flow

### Automatic Trigger Path:

1. **System:** During Module 1 document extraction, detects cross-sell keywords:
    - "trade effluent", "discharge consent", "water company", "sewer", "effluent", "discharge to drain"

2. **System:** Creates CrossSellTrigger record:
    - Queries `modules` table to find module that handles trade effluent: `SELECT id FROM modules WHERE cross_sell_keywords && ARRAY['trade effluent']::TEXT[] OR document_types @> '["TRADE_EFFLUENT_CONSENT"]'::JSONB`
    - Sets `target_module_id` to the returned UUID (not hardcoded MODULE_2)
    - Sets `trigger_type = KEYWORD`
    - Stores detected keywords
    - Sets `status = PENDING`

3. **System:** Displays banner on dashboard:
    - "We detected references to trade effluent in your permit. Would you like to activate Module 2?"
    - Buttons: "Activate" / "Dismiss"

4. **User:** Clicks "Activate"
    - OR clicks "Dismiss" (banner removed; trigger marked dismissed)

### Manual Activation Path:

1. **User:** Navigates to Company Settings > Modules

2. **User:** Clicks "Activate Module 2"

### Both Paths Continue:

5. **System:** Displays Module 2 activation confirmation:
    - Shows pricing: £59/month per site
    - Shows feature summary
    - Confirms billing update

6. **User:** Confirms activation

7. **System:** Creates ModuleActivation record:
    - Uses `module_id` from user's selection (UI displays modules from `modules` table, each with its UUID; user clicks "Activate" on specific module, system uses that module's UUID directly)
    - Sets `module_id` to the selected module's UUID (no query needed - module_id comes from UI)
    - Sets `status = ACTIVE`
    - Sets `activated_at` timestamp
    - Triggers billing update

8. **System:** Updates CrossSellTrigger (if from trigger):
    - Sets `status = CONVERTED`
    - Sets `response_action = activated`

9. **System:** Displays Module 2 dashboard
    - Shows "Upload Consent" prompt
    - Shows Module 2 widgets (initially empty)

10. **System:** Updates navigation:
    - Adds Module 2 to main navigation
    - Shows Module 2 widgets on main dashboard

### End States
- **Module Activated:** Module 2 features available; billing updated
- **Trigger Dismissed:** Banner removed; user can activate later from settings

### Error Paths
- **Prerequisites Not Met:** Display error "[Prerequisite Module Name] required"; block activation (system queries modules.requires_module_id to determine prerequisites)
- **Billing Failure:** Display payment error; activation rolls back

---

## 5.2 Module 3 Activation (from Module 1)

### Starting Point
- **Trigger:** Cross-sell trigger detected OR user manual activation
- **Prerequisites:** Prerequisite modules (defined in modules.requires_module_id) are active; user has Owner or Admin role

### Step-by-Step Flow

(Follows same pattern as Section 5.1 with Module 3 specifics)

### Automatic Trigger Path:

1. **System:** Detects keywords: "generator", "MCPD", "standby power", "CHP", "combustion plant", "back-up generator"

2. **System:** Creates CrossSellTrigger record:
    - Queries `modules` table to find module that handles generators/MCPD: `SELECT id FROM modules WHERE cross_sell_keywords && ARRAY['generator', 'MCPD']::TEXT[] OR document_types @> '["MCPD_REGISTRATION"]'::JSONB`
    - Sets `target_module_id` to the returned UUID (not hardcoded MODULE_3)
    - Sets `trigger_type = KEYWORD`
    - Stores detected keywords
    - Sets `status = PENDING`

3. **System:** Displays banner:
    - "We detected references to generators in your permit. Would you like to activate Module 3?"

### Activation:

4. **System:** Displays Module 3 activation confirmation:
    - Shows pricing: £79/month per company (not per site)
    - Shows feature summary

5. **User:** Confirms activation

6. **System:** Creates ModuleActivation record:
    - Uses `module_id` from user's selection (UI displays modules from `modules` table, each with its UUID; user clicks "Activate" on specific module, system uses that module's UUID directly)
    - Sets `module_id` to the selected module's UUID (no query needed - module_id comes from UI)
    - Sets `status = ACTIVE`
    - Sets `activated_at` timestamp
    - Triggers billing update

7. **System:** Updates navigation and dashboard

### End States
- **Module Activated:** Module 3 features available
- **Trigger Dismissed:** User can activate later

### Error Paths
- Same as Module 2 activation

---

## 5.3 Cross-Sell Trigger Detection & Response

### Starting Point
- **Trigger:** Automatic during any document processing
- **Prerequisites:** Prerequisite modules (defined in modules.requires_module_id) are active; dependent modules (via requires_module_id) not yet active

### Step-by-Step Flow

1. **System:** During document extraction, scans for cross-sell keywords:

    **Module 2 Keywords:**
    - "trade effluent"
    - "discharge consent"
    - "water company"
    - "sewer"
    - "effluent"
    - "discharge to drain"

    **Module 3 Keywords:**
    - "generator"
    - "MCPD"
    - "standby power"
    - "CHP"
    - "combustion plant"
    - "back-up generator"

2. **System:** On keyword detection:
    - **If** target module already active, **then** no action
    - **If** target module not active, **then** create CrossSellTrigger

3. **System:** Creates CrossSellTrigger record:
    ```json
    {
      "trigger_id": "uuid",
      "company_id": "uuid",
      "target_module_id": "uuid (from modules table, queried dynamically based on keywords)",
      "trigger_type": "KEYWORD",
      "trigger_source": "document_id",
      "detected_keywords": ["trade effluent", "sewer"],
      "status": "PENDING",
      "created_at": "timestamp"
    }
    ```

4. **System:** Displays non-intrusive banner:
    - Positioned below main navigation
    - Dismissible
    - Contains activation CTA

5. **User:** Responds to trigger:
    - **Option A:** Clicks "Activate" → Module activation workflow
    - **Option B:** Clicks "Dismiss" → Banner removed; trigger marked dismissed
    - **Option C:** Ignores → Banner persists until dismissed or session ends

6. **System:** Updates CrossSellTrigger based on response:
    - `status = CONVERTED` if activated
    - `status = DISMISSED` if dismissed
    - Records `responded_at` and `response_action`

7. **System:** Tracks trigger metrics for analytics:
    - Trigger-to-conversion rate
    - Time from trigger to conversion
    - Most effective keyword patterns

### External Trigger Sources:

8. **User:** Manually indicates interest:
    - Clicks "Add Module" in settings
    - System creates trigger with `trigger_type = USER_REQUEST`

9. **System:** Detects external events:
    - Water company enforcement notice uploaded (Module 2 trigger)
    - Run-hour breach (Module 3 re-activation trigger)

### End States
- **Trigger Pending:** Banner displayed; awaiting user response
- **Trigger Converted:** Module activated; cross-sell complete
- **Trigger Dismissed:** User declined; can revisit in settings

### Error Paths
- **Duplicate Triggers:** Only one pending trigger per module per company; new detection updates existing

---

# 6. COMMON ERROR HANDLING PATTERNS

## 6.1 Network/Connection Errors

**Pattern:** Retry with exponential backoff

**Flow:**
1. Operation fails
2. **System:** Displays "Connection error. Retrying..."
3. **System:** Retries after 1 second
4. **If** retry 1 fails, **then** retry after 2 seconds
5. **If** retry 2 fails, **then** retry after 4 seconds
6. **If** retry 3 fails:
   - Display error "Unable to connect. Please check your internet connection."
   - Offer "Retry" button
   - Log error for support

## 6.2 Validation Errors

**Pattern:** Inline field validation with summary

**Flow:**
1. User submits form
2. **System:** Validates all fields
3. **If** errors found:
   - Highlight invalid fields with red border
   - Display error message below each field
   - Display summary at top: "Please correct 3 errors below"
   - Scroll to first error
4. User corrects errors
5. **System:** Validates on field change (real-time feedback)

## 6.3 Permission Errors

**Pattern:** Graceful denial with guidance

**Flow:**
1. User attempts action requiring higher permission
2. **System:** Displays message: "You don't have permission to [action]. Please contact your administrator."
3. **System:** Does not reveal what action would require
4. **System:** Logs access attempt (for security)

## 6.4 Data Conflict Errors

**Pattern:** User resolution with options

**Flow:**
1. Conflict detected (e.g., concurrent edit)
2. **System:** Displays conflict details
3. **System:** Offers options:
   - Keep your changes
   - Keep other user's changes
   - Merge (where applicable)
4. User selects option
5. **System:** Resolves conflict per selection

---

# 7. TEAM COLLABORATION WORKFLOWS

## 7.1 Inviting Team Members

**Workflow:** Owner/Admin invites new team member

**Steps:**
1. **User (Owner/Admin):** Navigates to Users page (`/users`)
2. **User:** Clicks "Invite Team Member" button
3. **System:** Opens invitation modal
4. **User:** Enters:
   - Email address
   - First name, Last name
   - Role (Owner, Admin, Staff, Viewer, Consultant)
   - Site assignments (multi-select, optional)
5. **System:** Validates:
   - Email format
   - Email not already invited
   - At least one role selected
6. **User:** Clicks "Send Invitation"
7. **System:**
   - Creates pending user record
   - Generates unique invitation token (expires in 7 days)
   - Sends invitation email to user
   - Displays success: "Invitation sent to {email}"
8. **Invited User:** Receives email with invitation link
9. **Invited User:** Clicks invitation link
10. **System:** Redirects to signup page with pre-filled email
11. **Invited User:** Sets password, accepts terms
12. **System:**
    - Activates user account
    - Assigns role and site access
    - Sends welcome email
    - Notifies inviter: "User {name} has accepted your invitation"

**Edge Cases:**
- **Email already exists:** Show error "This email is already registered"
- **Token expired:** Show message "Invitation expired. Please request a new invitation."
- **Invitation already accepted:** Redirect to login page

---

## 7.2 Assigning Obligations to Team Members

**Workflow:** Admin assigns obligation to team member

**Steps:**
1. **User (Admin):** Views obligation detail page
2. **User:** Clicks "Assign To" dropdown
3. **System:** Displays list of team members with site access
4. **User:** Selects team member
5. **System:**
   - Updates `obligation.assigned_to` field
   - Creates notification for assigned user: "You've been assigned: {obligation title}"
   - Logs assignment in activity feed
   - Displays success toast: "{Obligation} assigned to {user}"
6. **Assigned User:** Receives notification (email, in-app, push based on preferences)
7. **Assigned User:** Clicks notification
8. **System:** Navigates to obligation detail page

**Bulk Assignment:**
1. **User (Admin):** Selects multiple obligations (checkboxes)
2. **User:** Clicks "Bulk Assign" button
3. **System:** Opens bulk assignment modal
4. **User:** Selects team member
5. **System:**
   - Assigns all selected obligations to user
   - Creates single notification: "You've been assigned {count} obligations"
   - Displays success: "{count} obligations assigned to {user}"

---

## 7.3 Commenting on Obligations

**Workflow:** User adds comment/note to obligation

**Steps:**
1. **User:** Views obligation detail page
2. **User:** Scrolls to "Comments" section
3. **User:** Clicks in comment text area
4. **User:** Types comment (supports markdown, @mentions)
5. **User:** Optionally @mentions team member (e.g., "@John Smith")
6. **User:** Clicks "Post Comment" button
7. **System:**
   - Creates comment record
   - Parses @mentions
   - Sends notification to mentioned users: "{User} mentioned you in {obligation}"
   - Updates comment list in real-time (WebSocket)
   - Displays comment with user avatar, name, timestamp
8. **Mentioned User:** Receives notification
9. **Mentioned User:** Clicks notification
10. **System:** Navigates to obligation detail, scrolls to comment

**Comment Features:**
- **Edit Comment:** User clicks "Edit", updates text, clicks "Save"
- **Delete Comment:** User clicks "Delete", confirms, system removes comment
- **Markdown Support:** Bold, italic, lists, links
- **@Mention Autocomplete:** Type "@" → shows dropdown of team members

---

## 7.4 Team Activity Feed

**Workflow:** User views team activity across sites

**Steps:**
1. **User:** Navigates to Dashboard
2. **System:** Displays "Recent Activity" card showing:
   - Document uploads (who, when, which document)
   - Evidence uploads (who, when, which obligation)
   - Obligation status changes (who, what changed, when)
   - Pack generations (who, pack type, when)
   - Team member assignments (who assigned what to whom)
3. **User:** Clicks activity item
4. **System:** Navigates to relevant detail page

**Activity Filtering:**
- **By User:** Filter to show only specific team member's actions
- **By Type:** Filter to show only uploads, assignments, etc.
- **By Date:** Last 7 days, last 30 days, custom range
- **By Site:** Show activities for specific site only

---

# 8. BULK OPERATION WORKFLOWS

## 8.1 Bulk Obligation Editing

**Workflow:** Admin updates multiple obligations at once

**Steps:**
1. **User (Admin):** Views obligations list page
2. **User:** Selects multiple obligations using checkboxes
3. **System:** Displays bulk actions toolbar: "{count} selected"
4. **User:** Clicks "Bulk Edit" button
5. **System:** Opens bulk edit modal showing:
   - Field to update (dropdown: Status, Assigned To, Category, etc.)
   - New value input
   - Preview of changes
6. **User:** Selects field to update (e.g., "Assigned To")
7. **User:** Selects new value (e.g., "John Smith")
8. **System:** Shows preview: "{count} obligations will be assigned to John Smith"
9. **User:** Clicks "Apply Changes"
10. **System:**
    - Updates all selected obligations
    - Creates activity log entries
    - Sends notifications to affected users
    - Displays success: "{count} obligations updated successfully"
11. **System:** Refreshes obligations list with updated values

**Supported Bulk Edit Fields:**
- Assigned To (reassign to different user)
- Status (mark as N/A, mark as pending review, etc.)
- Category (change category)
- Tags (add/remove tags)

**Edge Cases:**
- **Insufficient permissions:** Show error "You don't have permission to edit some obligations"
- **Mixed obligation types:** Warn "Selected obligations have different types. Continue?"

---

## 8.2 Bulk Evidence Linking

**Workflow:** User links one evidence item to multiple obligations

**Steps:**
1. **User:** Views evidence detail page (evidence already uploaded)
2. **User:** Clicks "Link to Obligations" button
3. **System:** Opens obligations selector modal
4. **User:** Searches and selects multiple obligations (checkboxes)
5. **User:** Clicks "Link to Selected ({count})"
6. **System:**
   - Creates `evidence_obligation_links` records for each obligation
   - Updates obligation evidence counts
   - Logs linkage in activity feed
   - Displays success: "Evidence linked to {count} obligations"
7. **System:** Refreshes evidence detail page showing all linked obligations

**Alternative Flow: From Obligations List**
1. **User:** Selects multiple obligations using checkboxes
2. **User:** Clicks "Link Evidence" button
3. **System:** Opens evidence selector modal
4. **User:** Selects existing evidence or uploads new evidence
5. **User:** Clicks "Link"
6. **System:** Creates links, displays success

---

## 8.3 Bulk Status Updates

**Workflow:** User marks multiple obligations as complete/N/A

**Steps:**
1. **User:** Selects multiple obligations
2. **User:** Clicks "Bulk Actions" → "Mark as..."
3. **System:** Shows options:
   - Mark as Complete
   - Mark as N/A
   - Mark for Review
4. **User:** Selects "Mark as N/A"
5. **System:** Opens confirmation modal: "Mark {count} obligations as N/A?"
6. **User:** Optionally adds reason (text area)
7. **User:** Clicks "Confirm"
8. **System:**
   - Updates obligation statuses
   - Logs status changes
   - Sends notifications to assigned users
   - Displays success: "{count} obligations marked as N/A"

---

## 8.4 Bulk Export

**Workflow:** User exports multiple obligations/evidence to Excel/CSV

**Steps:**
1. **User:** Selects items to export (or "Select All")
2. **User:** Clicks "Export" button
3. **System:** Opens export options modal:
   - Format: Excel, CSV, PDF
   - Fields to include: All fields, Selected fields only
   - Date range filter (optional)
4. **User:** Configures export options
5. **User:** Clicks "Export"
6. **System:**
   - Generates export file (background job if large)
   - Downloads file directly (if small) or sends notification when ready
   - Displays success: "Exported {count} items"

---

# 9. ERROR RECOVERY WORKFLOWS

## 9.1 Upload Failed Recovery

**Workflow:** User recovers from failed document/evidence upload

**Steps:**
1. **User:** Uploads document
2. **System:** Upload fails (network error, timeout, server error)
3. **System:** Displays error message:
   - "Upload failed: {reason}"
   - Error icon (red X)
   - "Retry" button
   - "Cancel" button
4. **User:** Clicks "Retry"
5. **System:** Retries upload with same file (stored in memory)
6. **If** retry succeeds:
   - Display success message
   - Navigate to document detail page
7. **If** retry fails again:
   - Offer option to save file reference for later retry
   - Show "Contact Support" link if repeated failures

**Auto-Retry Logic:**
- Retry 1: After 2 seconds
- Retry 2: After 4 seconds (if retry 1 fails)
- Retry 3: After 8 seconds (if retry 2 fails)
- After 3 auto-retries: Show manual retry button

---

## 9.2 Session Expiration Recovery

**Workflow:** User session expires during work, auto-recovers data

**Steps:**
1. **User:** Filling out obligation form (or any form with unsaved changes)
2. **System:** Detects session expired (token invalid)
3. **System:**
   - Saves form data to localStorage
   - Displays modal: "Your session has expired. Please log in again."
   - Shows "Log In" button
4. **User:** Clicks "Log In"
5. **System:** Redirects to login page
6. **User:** Logs in
7. **System:**
   - Authenticates user
   - Checks localStorage for saved data
   - Redirects to original page
   - Restores form data from localStorage
   - Displays toast: "Your changes have been restored"
8. **User:** Reviews restored data, clicks "Save"
9. **System:** Saves data, clears localStorage

---

## 9.3 Concurrent Edit Conflict Resolution

**Workflow:** Two users edit the same obligation simultaneously

**Steps:**
1. **User A:** Opens obligation for editing
2. **User B:** Opens same obligation for editing
3. **User A:** Makes changes, clicks "Save"
4. **System:** Saves User A's changes, updates `updated_at` timestamp
5. **User B:** Makes different changes, clicks "Save"
6. **System:** Detects conflict:
   - User B's `last_seen_version` doesn't match current version
   - Displays conflict resolution modal
7. **System:** Shows conflict details:
   - "This obligation was updated by {User A} while you were editing"
   - Side-by-side comparison of User A's changes vs User B's changes
   - Options:
     - "Keep My Changes" (overwrite User A's changes)
     - "Discard My Changes" (keep User A's changes)
     - "Merge Changes" (if possible)
8. **User B:** Selects option
9. **System:** Applies selection, displays success

---

## 9.4 Network Disconnection Recovery

**Workflow:** User loses network connection during work

**Steps:**
1. **User:** Working in app (viewing obligations, uploading evidence, etc.)
2. **System:** Detects network disconnection (WebSocket closed, API calls failing)
3. **System:**
   - Displays offline indicator in header: "You're offline"
   - Disables actions requiring network (upload, save, etc.)
   - Enables offline-capable actions (view cached data)
4. **User:** Continues viewing cached data
5. **System:** Periodically checks for network reconnection (every 5 seconds)
6. **System:** Network reconnects
7. **System:**
   - Displays toast: "You're back online"
   - Re-enables all actions
   - Syncs any pending changes (if offline mode supported)

---

## 9.5 Payment Failure Recovery

**Workflow:** User's subscription payment fails, guided recovery

**Steps:**
1. **System:** Payment fails (card declined, insufficient funds, etc.)
2. **System:**
   - Marks account as `payment_failed`
   - Sends email notification: "Payment failed, please update payment method"
   - Displays banner in app: "Payment failed. Update payment method to continue."
3. **User:** Clicks "Update Payment Method" button
4. **System:** Redirects to billing page
5. **User:** Updates credit card details
6. **User:** Clicks "Retry Payment"
7. **System:**
   - Processes payment with new card
   - If successful: Removes banner, sends confirmation email
   - If fails again: Shows error, offers contact support option

---

# 5. MODULE 4: HAZARDOUS WASTE CHAIN OF CUSTODY

> [v1.1 UPDATE – Module 4 Workflows – 2025-01-01]

## 5.1 Waste Stream Classification Workflow

### Starting Point
- **Trigger:** User activates Module 4 and navigates to Waste Streams page
- **Prerequisites:** Module 4 active; Site exists

### Step-by-Step Flow

1. **User:** Navigates to `/sites/[siteId]/module-4/waste-streams`
2. **System:** Displays waste streams list (empty if first time)
3. **User:** Clicks "Create Waste Stream"
4. **System:** Displays waste stream creation form
5. **User:** Enters waste stream details:
   - EWC code (European Waste Catalogue code)
   - Description
   - Classification (Hazardous/Non-Hazardous)
   - Initial volume (optional)
6. **User:** Clicks "Save"
7. **System:**
   - Validates EWC code format
   - Creates waste stream record
   - Links to site
   - Displays success message
8. **System:** Updates waste streams list

### End States
- **Success:** Waste stream created and visible in list
- **Validation Error:** Form displays errors, user corrects and resubmits

---

## 5.2 Consignment Note Creation & Validation Workflow

### Starting Point
- **Trigger:** User creates consignment note for waste removal
- **Prerequisites:** Module 4 active; Waste stream exists; Site exists

### Step-by-Step Flow

1. **User:** Navigates to Site → Hazardous Waste → Consignment Notes (`/sites/[siteId]/hazardous-waste/consignment-notes`)
2. **User:** Clicks "Create Consignment Note"
3. **System:** Displays consignment note creation form
4. **User:** Enters consignment note details:
   - Waste stream selector
   - Carrier selector (with licence validation)
   - Volume
   - Date
   - Operator photo upload (optional)
   - QR code scan (optional)
5. **User:** Clicks "Save"
6. **System:** Runs pre-submission validation:
   - Validates waste code
   - Checks carrier licence validity
   - Validates volume vs permit limits
   - Checks storage duration vs regulations
7. **System:** Displays validation results:
   - **If** validation passes: Creates consignment note, displays success
   - **If** validation fails: Displays validation errors, user fixes and resubmits
8. **System:** Creates chain of custody record
9. **System:** Updates compliance clock for carrier licence expiry

### End States
- **Success:** Consignment note created, validation passed
- **Validation Error:** Validation errors displayed, user corrects
- **Chain Break Detected:** Alert displayed, corrective action workflow triggered

---

## 5.3 Chain of Custody Tracking Workflow

### Starting Point
- **Trigger:** User views chain of custody for consignment note
- **Prerequisites:** Module 4 active; Consignment note exists

### Step-by-Step Flow

1. **User:** Navigates to Site → Hazardous Waste → Chain of Custody (`/sites/[siteId]/hazardous-waste/chain-of-custody`)
2. **System:** Displays chain of custody list
3. **User:** Clicks on chain to view details
4. **System:** Displays chain of custody timeline:
   - Consignment note creation
   - Carrier pickup
   - Transit tracking (if available)
   - End-point receipt
   - End-point proof (if uploaded)
5. **System:** Checks for chain breaks:
   - Missing evidence alerts
   - Contractor non-compliance detection
   - Gap identification
6. **If** chain break detected:
   - **System:** Displays chain break alert
   - **System:** Triggers corrective action workflow
   - **User:** Views corrective action details
   - **User:** Resolves chain break (uploads missing evidence, etc.)

### End States
- **Complete Chain:** All evidence present, chain closed
- **Chain Break:** Alert displayed, corrective action in progress

---

## 5.4 End-Point Proof Workflow

### Starting Point
- **Trigger:** User uploads end-point proof (destruction/recycling certificate)
- **Prerequisites:** Module 4 active; Consignment note exists

### Step-by-Step Flow

1. **User:** Navigates to `/sites/[siteId]/module-4/end-point-proof`
2. **User:** Clicks "Upload End-Point Proof"
3. **System:** Displays upload form
4. **User:** Selects consignment note
5. **User:** Selects proof type (Destruction/Recycling)
6. **User:** Uploads certificate document
7. **User:** Enters date
8. **User:** Clicks "Save"
9. **System:**
   - Validates certificate format
   - Links to consignment note
   - Updates chain of custody status
   - Closes chain of custody if complete
10. **System:** Updates compliance score

### End States
- **Success:** End-point proof uploaded, chain closed
- **Validation Error:** Certificate validation fails, user corrects

---

## 5.5 Corrective Action Lifecycle Workflow (Hazardous Waste)

### Starting Point
- **Trigger:** Chain-break event detected (missing evidence, contractor non-compliance, validation failure)
- **Prerequisites:** Module 4 active; Chain break or validation failure

### Step-by-Step Flow

1. **System:** Detects chain-break event
2. **System:** Creates corrective action record
3. **System:** Displays alert to user
4. **User:** Views corrective action details
5. **Investigation Phase:**
   - **User:** Reviews gap analysis
   - **User:** Identifies root cause
   - **User:** Documents investigation findings
6. **Action Assignment Phase:**
   - **User:** Creates action items
   - **User:** Assigns owners
   - **User:** Sets due dates
7. **Resolution Phase:**
   - **User:** Uploads evidence of resolution
   - **User:** Documents corrective measures
8. **Closure Phase:**
   - **User:** Reviews all evidence
   - **User:** Closes corrective action
   - **User:** Provides regulator justification
9. **System:** Updates chain of custody status
10. **System:** Updates compliance score

### End States
- **Resolved:** Corrective action closed, chain restored
- **In Progress:** Action items assigned, resolution in progress

---

# 6. CROSS-CUTTING WORKFLOWS

> [v1.1 UPDATE – Cross-Cutting Workflows – 2025-01-01]

## 6.1 Compliance Clock Workflow

### Starting Point
- **Trigger:** User views compliance clocks dashboard
- **Prerequisites:** Authenticated user

### Step-by-Step Flow

1. **User:** Navigates to `/compliance-clocks`
2. **System:** Displays compliance clocks dashboard:
   - Summary cards (Red/Amber/Green counts)
   - Critical clocks list
   - Filter options
3. **User:** Filters by status, module, or site
4. **System:** Updates displayed clocks
5. **User:** Clicks on clock to view details
6. **System:** Displays clock details:
   - Days remaining
   - Deadline date
   - Status indicator
   - Related entity link
7. **User:** Clicks "View Related Entity"
8. **System:** Navigates to related entity (obligation, consent, etc.)

### End States
- **View Details:** Clock details displayed
- **Navigate to Entity:** Related entity page displayed

---

## 6.2 Condition-Level Evidence Mapping Workflow (Module 1)

### Starting Point
- **Trigger:** Admin/Staff configures evidence rules for obligation
- **Prerequisites:** Module 1 active; Obligation exists; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to `/sites/[siteId]/obligations/[obligationId]/evidence-rules`
2. **System:** Displays current evidence rules (if any)
3. **User:** Clicks "Configure Rules"
4. **System:** Displays evidence rules configuration form
5. **User:** Configures allowed evidence types:
   - Selects evidence types (Document, Photo, Measurement, etc.)
   - Sets completeness scoring thresholds
   - Configures versioning rules
6. **User:** Clicks "Save"
7. **System:**
   - Saves evidence rules
   - Applies to obligation
   - Updates completeness scoring
8. **System:** Displays updated evidence rules

### End States
- **Success:** Evidence rules configured, completeness scoring updated
- **Error:** Validation error, user corrects

---

## 6.3 Recurrence Trigger Configuration Workflow (Module 1)

### Starting Point
- **Trigger:** Admin/Staff configures recurrence trigger for obligation
- **Prerequisites:** Module 1 active; Obligation exists; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to `/sites/[siteId]/obligations/[obligationId]/recurrence-triggers`
2. **System:** Displays current recurrence triggers (if any)
3. **User:** Clicks "Create Trigger"
4. **System:** Displays trigger configuration form
5. **User:** Configures trigger:
   - Selects trigger type (Dynamic/Event-based/Conditional)
   - Configures schedule (if dynamic)
   - Configures event conditions (if event-based)
   - Configures conditional logic (if conditional)
6. **User:** Clicks "Save"
7. **System:**
   - Creates recurrence trigger
   - Links to obligation
   - Schedules first execution
8. **System:** Displays trigger execution history

### End States
- **Success:** Recurrence trigger created, scheduled
- **Error:** Validation error, user corrects

---

## 6.4 Permit Change Tracking Workflow (Module 1)

### Starting Point
- **Trigger:** User uploads new permit version
- **Prerequisites:** Module 1 active; Existing permit document exists

### Step-by-Step Flow

1. **User:** Navigates to `/sites/[siteId]/documents/[documentId]/versions`
2. **User:** Clicks "Upload New Version"
3. **System:** Displays version upload form
4. **User:** Uploads new permit version
5. **User:** Selects change type (Variation/Renewal/Surrender)
6. **User:** Clicks "Save"
7. **System:**
   - Processes new version
   - Performs redline comparison
   - Identifies changes
   - Analyzes impact on obligations
8. **System:** Displays version comparison:
   - Added sections
   - Removed sections
   - Modified sections
   - Obligation changes
9. **User:** Reviews impact analysis
10. **User:** Clicks "View Impact"
11. **System:** Displays detailed impact analysis:
    - New obligations
    - Removed obligations
    - Modified obligations
    - Impact score

### End States
- **Success:** Version uploaded, comparison displayed
- **Error:** Processing error, user retries

---

## 6.5 Condition Permissions Management Workflow (Module 1)

> [v1.4 UPDATE – Condition Permissions – 2025-02-01]

### Starting Point
- **Trigger:** Admin/Staff grants condition-level permission to user
- **Prerequisites:** Module 1 active; Document exists; User exists; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to `/module-1/condition-permissions`
2. **System:** Displays list of existing condition permissions
3. **User:** Clicks "Create Permission"
4. **System:** Displays permission creation form
5. **User:** Configures permission:
   - Selects user
   - Selects document
   - Enters condition reference
   - Selects permission type (VIEW/EDIT/MANAGE/FULL)
6. **User:** Clicks "Save"
7. **System:**
   - Creates condition permission
   - Grants access to user
   - Updates RLS policies
8. **System:** Displays updated permissions list

### End States
- **Success:** Permission granted, user has access to condition
- **Error:** Validation error, user corrects

---

## 6.6 Consent State Transition Workflow (Module 2)

> [v1.4 UPDATE – Consent State Machine – 2025-02-01]

### Starting Point
- **Trigger:** Admin/Staff transitions consent to new state
- **Prerequisites:** Module 2 active; Consent document exists; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to `/module-2/consent-states`
2. **System:** Displays list of consent states for documents
3. **User:** Clicks "Create State" or selects existing state
4. **System:** Displays state transition form
5. **User:** Configures state transition:
   - Selects document
   - Selects new state (DRAFT/IN_FORCE/SUPERSEDED/EXPIRED)
   - Sets effective date
   - Sets expiry date (if applicable)
   - Enters transition reason
6. **User:** Clicks "Save"
7. **System:**
   - Creates new consent state
   - Links to previous state (if exists)
   - Updates document status
   - Records transition history
8. **System:** Displays updated state with transition history

### End States
- **Success:** State transitioned, history recorded
- **Error:** Invalid transition, user corrects

---

## 6.7 Regulation Threshold Configuration Workflow (Module 3)

> [v1.4 UPDATE – Regulation Thresholds – 2025-02-01]

### Starting Point
- **Trigger:** Admin/Staff configures regulation threshold
- **Prerequisites:** Module 3 active; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to `/module-3/regulation-thresholds`
2. **System:** Displays list of regulation thresholds
3. **User:** Clicks "Create Threshold"
4. **System:** Displays threshold configuration form
5. **User:** Configures threshold:
   - Selects threshold type (MCPD_1_5MW/MCPD_5_50MW/SPECIFIED_GENERATOR/CUSTOM)
   - Sets capacity range (min/max MW)
   - Sets monitoring frequency
   - Sets stack test frequency
   - Sets reporting frequency
   - Enters regulation reference (optional)
6. **User:** Clicks "Save"
7. **System:**
   - Creates regulation threshold
   - Makes available for frequency calculations
8. **System:** Displays updated thresholds list

### End States
- **Success:** Threshold created, available for calculations
- **Error:** Validation error, user corrects

---

## 6.8 Automatic Frequency Calculation Workflow (Module 3)

> [v1.4 UPDATE – Regulation Thresholds – 2025-02-01]

### Starting Point
- **Trigger:** Admin/Staff calculates frequencies for generator
- **Prerequisites:** Module 3 active; Generator exists; Regulation threshold exists; Admin/Staff role

### Step-by-Step Flow

1. **User:** Navigates to generator detail page or `/module-3/generators/[generatorId]/calculate-frequency`
2. **System:** Displays generator details with capacity
3. **User:** Clicks "Calculate Frequency"
4. **System:**
   - Finds matching regulation threshold based on generator capacity
   - Calculates monitoring frequency
   - Calculates stack test frequency
   - Calculates reporting frequency
5. **System:** Displays calculation results:
   - Matching threshold
   - Calculated frequencies
   - Calculation details
6. **User:** Reviews calculation results
7. **User:** Clicks "Apply" (optional)
8. **System:**
   - Saves frequency calculation record
   - Marks as applied (if user clicked Apply)
   - Updates generator monitoring schedule (if applied)
9. **System:** Displays calculation history

### End States
- **Success:** Frequencies calculated, optionally applied
- **Error:** No matching threshold found, user creates threshold

---

## 6.9 Regulator Challenge State Machine Workflow

> [v1.7 UPDATE – Regulator Challenge State Machine – 2025-01-XX]

### Starting Point
- **Trigger:** User needs to handle regulator question/challenge
- **Prerequisites:** Authenticated user with site access; Regulator question exists or needs to be created
- **Entry Path:** Site Context → Regulator Questions → Create/View Question

### Step-by-Step Flow

**Question Creation:**
1. **User:** Navigates to `/sites/[siteId]/regulator-questions`
2. **User:** Clicks "Create Question" button
3. **System:** Displays question creation form
4. **User:** Enters question details:
   - Question type (OBLIGATION_CLARIFICATION/EVIDENCE_REQUEST/COMPLIANCE_QUERY)
   - Urgency level (URGENT/INFORMAL/NORMAL)
   - Question text
   - Related obligation/document (optional)
   - Response deadline (auto-calculated based on type)
5. **User:** Clicks "Submit"
6. **System:**
   - Creates `regulator_questions` record
   - Sets `status = 'OPEN'`
   - Sets `raised_date = CURRENT_DATE`
   - Calculates `response_deadline`:
     - URGENT: 7 days from `raised_date`
     - INFORMAL: 60 days from `raised_date`
     - Default: 28 days from `raised_date`
   - Creates audit log entry: `action_type = 'REGULATOR_QUESTION_RAISED'`
7. **System:** Displays question detail page with state machine visualization

**State Machine Visualization:**
8. **System:** Displays state machine diagram:
   - Shows all possible states (OPEN, RESPONSE_SUBMITTED, RESPONSE_ACKNOWLEDGED, FOLLOW_UP_REQUIRED, CLOSED, RESPONSE_OVERDUE)
   - Highlights current state (OPEN)
   - Shows available transitions (arrows to RESPONSE_SUBMITTED)
   - Displays state descriptions in tooltips
9. **System:** Displays response deadline countdown:
   - Days remaining
   - Deadline status badge (On Time/Approaching/Overdue)
   - Visual progress bar

**Response Preparation:**
10. **User:** Reviews related document/obligation (if linked)
11. **User:** Gathers supporting evidence
12. **User:** Navigates to question detail page
13. **User:** Clicks "Prepare Response" button

**Response Submission:**
14. **User:** Enters response text in rich text editor
15. **User:** Attaches evidence (if applicable):
    - Selects evidence items
    - Uploads new evidence files
16. **User:** Reviews response
17. **User:** Clicks "Submit Response"
18. **System:**
    - Sets `response_text`
    - Links `response_evidence_ids` (if provided)
    - Sets `response_submitted_date = CURRENT_DATE`
    - Transitions state: `status = 'RESPONSE_SUBMITTED'`
    - Creates audit log entry: `action_type = 'REGULATOR_RESPONSE_SUBMITTED'`
19. **System:** Updates state machine visualization:
    - Highlights new state (RESPONSE_SUBMITTED)
    - Shows available transitions (to RESPONSE_ACKNOWLEDGED, FOLLOW_UP_REQUIRED)
    - Displays state history timeline

**Regulator Acknowledgment (Admin/Owner only):**
20. **User (Admin/Owner):** Reviews submitted response
21. **User:** Clicks "Mark as Acknowledged" button
22. **System:**
    - Sets `regulator_acknowledged = true`
    - Transitions state: `status = 'RESPONSE_ACKNOWLEDGED'`
    - Creates audit log entry: `action_type = 'REGULATOR_QUESTION_STATUS_CHANGED'`
23. **System:** Updates state machine visualization

**Follow-Up Required:**
24. **User (Admin/Owner):** Clicks "Request Follow-Up" button
25. **System:** Displays follow-up form
26. **User:** Enters follow-up details
27. **User:** Clicks "Submit"
28. **System:**
    - Sets `follow_up_required = true`
    - Transitions state: `status = 'FOLLOW_UP_REQUIRED'`
    - Creates new question record linked to original
    - Creates audit log entry
29. **System:** Updates state machine visualization

**Closure:**
30. **User:** Reviews question and response
31. **User:** Clicks "Close Question" button
32. **System:** Displays closure confirmation
33. **User:** Confirms closure
34. **System:**
    - Sets `closed_date = CURRENT_DATE`
    - Transitions state: `status = 'CLOSED'`
    - Creates audit log entry: `action_type = 'REGULATOR_QUESTION_STATUS_CHANGED'`
35. **System:** Updates state machine visualization

**Overdue Escalation (Automatic):**
36. **System (Background Job):** Checks response deadlines daily
37. **If** `response_deadline` within 7 days AND `status = 'OPEN'`:
    - **System:** Sends reminder notification
    - **System:** Updates deadline status badge to "Approaching"
38. **If** `response_deadline` passed AND `status = 'OPEN'`:
    - **System:** Transitions state: `status = 'RESPONSE_OVERDUE'`
    - **System:** Escalates to Admin/Owner
    - **System:** Sends critical alert
    - **System:** Creates audit log entry
39. **If** `response_deadline` passed > 14 days:
    - **System:** Sends critical alert to Owner
    - **System:** Updates state machine visualization

### End States
- **Question Closed:** Question resolved, state = CLOSED
- **Response Submitted:** Response submitted, awaiting acknowledgment, state = RESPONSE_SUBMITTED
- **Response Acknowledged:** Regulator acknowledged response, state = RESPONSE_ACKNOWLEDGED
- **Follow-Up Required:** Additional information needed, state = FOLLOW_UP_REQUIRED
- **Overdue:** Response deadline passed, state = RESPONSE_OVERDUE

### Error Paths
1. **Invalid State Transition:**
   - **System:** Displays error "Invalid state transition"
   - **User:** Reviews state machine diagram
   - **User:** Corrects action

2. **Response Deadline Passed:**
   - **System:** Displays warning "Response deadline has passed"
   - **System:** Requires Admin/Owner approval to submit response
   - **User:** Provides justification for late response

---

## 6.10 Manual Override Workflow

> [v1.7 UPDATE – Manual Override Workflow – 2025-01-XX]

### Starting Point
- **Trigger:** Admin/Owner needs to override system-determined value
- **Prerequisites:** Admin or Owner role; Entity exists (obligation, evidence, deadline, etc.)
- **Entry Path:** Context-dependent (obligation edit, evidence exemption, deadline adjustment, etc.)

### Step-by-Step Flow

**Override Initiation:**
1. **User (Admin/Owner):** Navigates to entity detail page (obligation, evidence, deadline, etc.)
2. **User:** Clicks "Edit" or override-specific button
3. **System:** Checks user role
   - **If** Staff/Consultant, **then** display error "Manual overrides require Admin or Owner role"
   - **If** Admin/Owner, **then** proceed to Step 4
4. **System:** Displays manual override modal

**Override Context Display:**
5. **System:** Displays override context:
   - Entity type (Obligation, Evidence, Deadline, Compliance Status, Schedule)
   - Entity name/title
   - Current system-determined value
   - Previous values (if any overrides exist)

**Override Reason Entry (Required):**
6. **User:** Enters override reason in textarea:
   - Minimum 10 characters required
   - Maximum 500 characters
   - Placeholder: "e.g., Document interpretation requires manual adjustment"
7. **System:** Validates reason length in real-time
   - **If** < 10 characters, **then** disable "Confirm Override" button
   - **If** ≥ 10 characters, **then** enable "Confirm Override" button

**Override Form (Context-Dependent):**

**Obligation Override:**
8. **User:** Edits editable fields:
   - Obligation text (editable)
   - Category (editable)
   - Frequency (editable)
   - Deadline date (editable)
9. **System:** Displays non-editable fields (read-only):
   - Subjective flag (system-determined)
   - Confidence score (system-determined)
   - Compliance status (partial - can mark complete/N/A, cannot mark overdue as complete without evidence)
10. **System:** Displays previous value card (shows original system value)

**Evidence Exemption Override:**
11. **User:** Selects exemption type:
    - "Temporary Evidence" (sets `is_temporary = true`)
    - "Enforcement Exempt" (sets `enforcement_exempt = true`)
12. **System:** Displays evidence info (filename, upload date, etc.)

**Deadline Adjustment Override:**
13. **User:** Views current deadline
14. **User:** Enters new deadline date
15. **System:** Validates new deadline is valid date

**Compliance Status Override:**
16. **User:** Views current compliance status
17. **User:** Selects new status from allowed options:
    - Can mark complete (if evidence present)
    - Can mark N/A
    - Cannot mark overdue as complete without evidence
18. **System:** Validates status change is allowed

**Audit Trail Notice:**
19. **System:** Displays audit trail notice:
    - Warning icon
    - Text: "This override will be logged in the audit trail with your name and timestamp."
    - Preview: "Audit entry: [Override Type] by [Your Name] at [Timestamp]"

**Override Confirmation:**
20. **User:** Reviews override details
21. **User:** Confirms override reason is accurate
22. **User:** Clicks "Confirm Override" button
23. **System:**
    - Validates all override data
    - Saves override:
      - Updates entity with new values
      - Records `edited_by = user_id`
      - Records `edited_at = CURRENT_TIMESTAMP`
      - Records `edit_reason = override_reason`
      - Records `previous_values = JSONB(old_values)`
    - Creates audit log entry:
      - `action_type = 'MANUAL_OVERRIDE'`
      - `entity_type = [entity_type]`
      - `entity_id = [entity_id]`
      - `previous_values = [old_values]`
      - `new_values = [new_values]`
      - `override_reason = [reason]`
      - `user_id = [user_id]`
24. **System:** Displays success message: "Override applied successfully. This change has been logged in the audit trail."

**Override History Viewing:**
25. **User:** Navigates to entity detail page
26. **User:** Clicks "View Override History" button
27. **System:** Displays override history:
    - Chronological list of all overrides
    - Each entry shows:
      - Override timestamp
      - Override reason
      - Previous value
      - New value
      - Overridden by (user name)
    - Export option (PDF/CSV)

### End States
- **Override Applied:** Entity updated, audit trail logged
- **Override Cancelled:** No changes made, modal closed
- **Validation Error:** Override reason too short or invalid data, user corrects

### Error Paths
1. **Insufficient Permissions:**
   - **System:** Displays error "Manual overrides require Admin or Owner role"
   - **User:** Contacts Admin/Owner for override

2. **Invalid Override Reason:**
   - **System:** Displays error "Override reason must be at least 10 characters"
   - **User:** Enters longer reason

3. **Invalid Override Value:**
   - **System:** Displays validation error (context-dependent)
   - **User:** Corrects override value

---

## 6.11 Unlinked Evidence Management Workflow

> [v1.7 UPDATE – Unlinked Evidence Management – 2025-01-XX]

### Starting Point
- **Trigger:** User needs to manage evidence without obligation links
- **Prerequisites:** Authenticated user with site access; Evidence items exist
- **Entry Path:** Site Context → Evidence → Unlinked Evidence

### Step-by-Step Flow

**Accessing Unlinked Evidence:**
1. **User:** Navigates to `/sites/[siteId]/evidence/unlinked`
2. **System:** Displays unlinked evidence page:
   - Header with unlinked count badge
   - Enforcement status filters
   - Unlinked evidence list

**Enforcement Status Filtering:**
3. **User:** Applies filters:
   - Status filter (UNLINKED_WARNING/UNLINKED_CRITICAL/UNLINKED_ARCHIVED)
   - Grace period filter (Within Grace/Warning Period/Critical Period)
   - Date range filter
4. **System:** Updates displayed evidence list based on filters

**Viewing Unlinked Evidence:**
5. **System:** Displays unlinked evidence cards:
   - Evidence preview
   - Evidence metadata (filename, upload date, uploader, file size)
   - Enforcement status badge:
     - UNLINKED_WARNING (7-13 days): Amber badge, "Warning: Link required"
     - UNLINKED_CRITICAL (14-29 days): Red badge, "Critical: Link required"
     - UNLINKED_ARCHIVED (30+ days): Gray badge, "Archived: Requires restoration"
   - Grace period countdown:
     - Visual progress bar
     - Days remaining (if within grace period)
     - Days overdue (if past grace period)
     - Color-coded: Green (within grace), Amber (warning), Red (critical)
   - Suggested obligations (if available)

**Linking Evidence to Obligation:**
6. **User:** Clicks "Link to Obligation" button on evidence card
7. **System:** Displays obligation selector modal
8. **User:** Searches/selects obligation
9. **User:** Clicks "Link"
10. **System:**
    - Creates `evidence_obligation_links` record
    - Sets `evidence.enforcement_status = 'LINKED'`
    - Removes from unlinked evidence list
    - Creates audit log entry
11. **System:** Displays success message: "Evidence linked to obligation successfully"

**Bulk Linking:**
12. **User:** Selects multiple evidence items (checkboxes)
13. **User:** Clicks "Bulk Link" button
14. **System:** Displays bulk link modal
15. **User:** Selects target obligation
16. **User:** Clicks "Link All"
17. **System:**
    - Links all selected evidence to obligation
    - Updates enforcement status for all
    - Creates audit log entries
18. **System:** Displays success message: "X evidence items linked successfully"

**Evidence Exemption Request (Admin/Owner only):**
19. **User (Admin/Owner):** Clicks "Request Exemption" button
20. **System:** Displays exemption modal
21. **User:** Enters exemption reason (required, min 10 characters)
22. **User:** Selects exemption type:
    - "Temporary Evidence" (sets `is_temporary = true`)
    - "Enforcement Exempt" (sets `enforcement_exempt = true`)
23. **User:** Clicks "Submit"
24. **System:**
    - Updates evidence record
    - Creates audit log entry: `action_type = 'EVIDENCE_EXEMPTION_REQUESTED'`
    - Removes from unlinked evidence list (if enforcement exempt)
25. **System:** Displays success message: "Exemption request logged in audit trail"

**Grace Period Countdown Monitoring:**
26. **System (Background Job):** Monitors grace period daily
27. **If** evidence within grace period (0-7 days):
    - **System:** Displays green progress bar
    - **System:** Shows days remaining
28. **If** evidence in warning period (7-13 days):
    - **System:** Transitions `enforcement_status = 'UNLINKED_WARNING'`
    - **System:** Displays amber badge and progress bar
    - **System:** Sends reminder notification
29. **If** evidence in critical period (14-29 days):
    - **System:** Transitions `enforcement_status = 'UNLINKED_CRITICAL'`
    - **System:** Displays red badge and progress bar
    - **System:** Sends critical alert
30. **If** evidence past 30 days:
    - **System:** Transitions `enforcement_status = 'UNLINKED_ARCHIVED'`
    - **System:** Displays gray badge
    - **System:** Requires restoration to link

**Viewing Suggested Obligations:**
31. **System:** Displays suggested obligations for each evidence item:
    - Obligation title
    - Match reason (e.g., "Filename match", "Date match")
    - "Link" button
32. **User:** Clicks "Link" on suggested obligation
33. **System:** Links evidence to suggested obligation (same as Step 10)

### End States
- **Evidence Linked:** Evidence linked to obligation, removed from unlinked list
- **Evidence Exempted:** Evidence marked as exempt, removed from unlinked list
- **Evidence Archived:** Evidence archived after 30 days, requires restoration

### Error Paths
1. **No Obligation Selected:**
   - **System:** Displays error "Please select an obligation"
   - **User:** Selects obligation

2. **Exemption Reason Too Short:**
   - **System:** Displays error "Exemption reason must be at least 10 characters"
   - **User:** Enters longer reason

---

## 6.12 Module Cascading Deactivation Workflow

> [v1.7 UPDATE – Module Cascading Deactivation – 2025-01-XX]

### Starting Point
- **Trigger:** Admin/Owner wants to deactivate a module
- **Prerequisites:** Admin or Owner role; Module is active; Module exists
- **Entry Path:** Site/Company Settings → Modules → Deactivate Module

### Step-by-Step Flow

**Deactivation Initiation:**
1. **User (Admin/Owner):** Navigates to module selection/management page
2. **User:** Clicks "Deactivate" button on active module
3. **System:** Checks module dependencies:
   - Queries `modules` table: `SELECT * FROM modules WHERE requires_module_id = [module_id]`
   - Identifies dependent modules

**Dependency Detection:**
4. **If** no dependent modules found:
   - **System:** Displays standard deactivation confirmation modal
   - Proceed to Step 12 (Standard Deactivation)
5. **If** dependent modules found:
   - **System:** Displays cascading deactivation warning modal

**Cascading Warning Display:**
6. **System:** Displays warning modal:
   - Warning icon (amber)
   - Title: "Cascading Deactivation"
   - Message: "Deactivating [Module Name] will also deactivate the following dependent modules:"
   - Dependent modules list:
     - Module name (e.g., "Module 2: Trade Effluent")
     - Module status: "Active"
     - Dependency indicator: "Requires [Module Name]"
   - Dependency visualization:
     - Visual flow diagram: [Module 1] → [Module 2], [Module 1] → [Module 3]
     - Flow description: "[Module Name] is required for [Dependent Module Names]"
   - Data preservation notice:
     - Text: "Data for [Dependent Modules] will be preserved. Reactivating [Module Name] will restore access to these modules."

**Cascading Confirmation:**
7. **System:** Displays confirmation checkbox:
   - Label: "I understand that [Dependent Module Names] will be deactivated"
   - Required: true (must check to proceed)
8. **User:** Reviews dependent modules
9. **User:** Checks confirmation checkbox
10. **System:** Enables "Deactivate" button (disabled until checkbox checked)

**Deactivation Execution:**
11. **User:** Clicks "Deactivate" button
12. **System:**
    - Deactivates primary module:
      - Sets `module_activations.is_active = false`
      - Sets `module_activations.deactivated_at = CURRENT_TIMESTAMP`
    - Deactivates all dependent modules:
      - For each dependent module:
        - Sets `module_activations.is_active = false`
        - Sets `module_activations.deactivated_at = CURRENT_TIMESTAMP`
    - Preserves all data (no deletion)
    - Creates audit log entries:
      - Primary module: `action_type = 'MODULE_DEACTIVATED'`
      - Each dependent module: `action_type = 'MODULE_CASCADING_DEACTIVATED'`
13. **System:** Displays success notification:
    - Message: "[Module Name] has been deactivated. [Dependent Module Names] have also been deactivated as they require [Module Name]."
    - Data preservation reminder: "All data has been preserved. Reactivating [Module Name] will restore access to these modules."

**Post-Deactivation:**
14. **System:** Updates UI:
    - Removes module routes from navigation
    - Hides module-specific features
    - Displays module deactivation status
15. **User:** Navigates to module selection page
16. **System:** Displays deactivated modules with "Reactivate" button

**Reactivation:**
17. **User:** Clicks "Reactivate" on deactivated module
18. **System:** Checks if prerequisite module is active
19. **If** prerequisite active:
    - **System:** Reactivates module
    - **System:** Restores access to module features
20. **If** prerequisite inactive:
    - **System:** Displays error: "Cannot reactivate [Module Name]. [Prerequisite Module Name] must be activated first."
    - **System:** Offers to activate prerequisite module

### End States
- **Module Deactivated:** Module and dependent modules deactivated, data preserved
- **Deactivation Cancelled:** No changes made, modal closed
- **Reactivation Successful:** Module reactivated, access restored

### Error Paths
1. **Confirmation Not Checked:**
   - **System:** Disables "Deactivate" button
   - **User:** Checks confirmation checkbox

2. **Prerequisite Not Active (Reactivation):**
   - **System:** Displays error "Prerequisite module must be activated first"
   - **User:** Activates prerequisite module first

---

## 6.13 Pack Access Logs Viewing Workflow

> [v1.7 UPDATE – Pack Access Logs – 2025-01-XX]

### Starting Point
- **Trigger:** User wants to view pack access logs
- **Prerequisites:** Authenticated user with pack access; Pack exists; Secure link generated (for access logs)
- **Entry Path:** Pack Detail Page → Access Logs Tab

### Step-by-Step Flow

**Accessing Pack Access Logs:**
1. **User:** Navigates to pack detail page: `/sites/[siteId]/packs/[packId]`
2. **System:** Displays pack detail page with tabs
3. **User:** Clicks "Access Logs" tab
4. **System:** Checks if secure link generated:
   - **If** no secure link, **then** display message "Access logs available only for packs with secure links"
   - **If** secure link exists, **then** proceed to Step 5

**Access Logs Display:**
5. **System:** Displays access logs tab:
   - Header with total access count and unique accessors count
   - Filter bar
   - Access logs table
   - Access logs summary

**Filtering Access Logs:**
6. **User:** Applies filters:
   - Date range filter
   - Accessor email filter (if provided)
   - IP address filter
7. **System:** Updates displayed access logs based on filters

**Viewing Access Logs:**
8. **System:** Displays access logs table:
   - Accessor email (if provided)
   - IP address
   - User agent
   - First accessed at (timestamp)
   - Last accessed at (timestamp)
   - View count
   - Download count
   - Pages viewed (array of page numbers)
9. **User:** Scrolls through access logs
10. **System:** Loads more logs (pagination/infinite scroll)

**Access Log Details:**
11. **User:** Clicks on access log row
12. **System:** Displays access log detail modal:
    - Full accessor information
    - Complete access timeline
    - All pages viewed
    - Download history
    - Geolocation (if IP geolocation available)

**Access Timeline Visualization:**
13. **System:** Displays access timeline chart:
    - Timeline showing access frequency over time
    - Peak access times
    - Access patterns visualization

**Exporting Access Logs:**
14. **User:** Clicks "Export Logs" button
15. **System:** Displays export format selector:
    - PDF
    - CSV
    - JSON
16. **User:** Selects export format
17. **User:** Clicks "Export"
18. **System:**
    - Generates export file
    - Includes all filtered logs
    - Includes summary statistics
    - Downloads file to user's device

**Access Logs Summary:**
19. **System:** Displays summary statistics:
    - Total access count
    - Unique accessors count
    - Average views per accessor
    - Most accessed pages
    - Access timeline chart
    - Accessor geolocation map (if available)

### End States
- **Access Logs Viewed:** Access logs displayed, filters applied
- **Access Logs Exported:** Export file downloaded
- **No Access Logs:** Message displayed if no secure link generated

### Error Paths
1. **No Secure Link:**
   - **System:** Displays message "Access logs available only for packs with secure links"
   - **User:** Generates secure link first

2. **Export Failed:**
   - **System:** Displays error "Export failed. Please try again."
   - **User:** Retries export

---

## 6.14 Pack Contents Viewing Workflow

> [v1.7 UPDATE – Pack Contents – 2025-01-XX]

### Starting Point
- **Trigger:** User wants to view pack contents
- **Prerequisites:** Authenticated user with pack access; Pack exists; Pack generated
- **Entry Path:** Pack Detail Page → Contents Tab

### Step-by-Step Flow

**Accessing Pack Contents:**
1. **User:** Navigates to pack detail page: `/sites/[siteId]/packs/[packId]`
2. **System:** Displays pack detail page with tabs
3. **User:** Clicks "Contents" tab
4. **System:** Displays pack contents tab

**Pack Contents Display:**
5. **System:** Displays pack contents:
   - Header with total evidence count and total obligations count
   - Evidence contents list
   - Contents summary

**Viewing Evidence Contents:**
6. **System:** Displays evidence contents list:
   - Evidence snapshot card for each evidence item:
     - File name (from snapshot)
     - File type (from snapshot)
     - File size (from snapshot)
     - Uploaded at (from snapshot)
     - Uploaded by (from snapshot)
     - File hash (from snapshot, for integrity verification)
     - Version locked badge (indicates immutable snapshot)
     - Included at (timestamp when added to pack)
   - Obligation snapshot (if evidence linked to obligation):
     - Obligation title (from snapshot)
     - Obligation status (from snapshot)
     - Deadline date (from snapshot)
7. **User:** Scrolls through evidence contents
8. **System:** Loads more contents (pagination/infinite scroll)

**Viewing Obligation Contents:**
9. **System:** Displays obligation contents (if pack includes obligations):
   - Obligation snapshot card for each obligation:
     - Obligation title (from snapshot)
     - Obligation category (from snapshot)
     - Obligation frequency (from snapshot)
     - Deadline date (from snapshot)
     - Compliance status (from snapshot)
     - Version locked badge
     - Included at (timestamp when added to pack)

**Contents Summary:**
10. **System:** Displays contents summary:
    - Evidence breakdown:
      - By type (Document, Photo, Measurement, etc.)
      - By module (Module 1, Module 2, etc.)
      - Total count
    - Obligation breakdown:
      - By status (Active, Completed, Overdue, etc.)
      - By module
      - Total count

**Exporting Pack Contents:**
11. **User:** Clicks "Export Contents" button
12. **System:** Displays export format selector:
    - PDF
    - CSV
    - JSON
13. **User:** Selects export format
14. **User:** Clicks "Export"
15. **System:**
    - Generates export file
    - Includes all contents with snapshots
    - Includes summary statistics
    - Downloads file to user's device

**Integrity Verification:**
16. **User:** Views file hash for evidence item
17. **System:** Displays file hash (SHA-256)
18. **User:** Verifies file integrity (if needed)
19. **System:** Provides hash verification tool (optional)

### End States
- **Contents Viewed:** Pack contents displayed, breakdowns shown
- **Contents Exported:** Export file downloaded
- **No Contents:** Message displayed if pack has no contents

### Error Paths
1. **Pack Not Generated:**
   - **System:** Displays message "Pack contents available after pack generation"
   - **User:** Generates pack first

2. **Export Failed:**
   - **System:** Displays error "Export failed. Please try again."
   - **User:** Retries export

---

# 10. GLOSSARY OF UI ACTIONS

| Action | Description |
|--------|-------------|
| **User: Clicks** | User activates a button, link, or interactive element |
| **User: Drags** | User drags item to target (file upload, reorder) |
| **User: Enters** | User types into text field |
| **User: Selects** | User chooses from dropdown, checkbox, radio |
| **User: Toggles** | User switches boolean setting on/off |
| **User: Navigates** | User moves to different screen/section |
| **System: Displays** | System shows UI element or message |
| **System: Validates** | System checks data against rules |
| **System: Creates** | System creates database record |
| **System: Updates** | System modifies existing record |
| **System: Sends** | System transmits notification |
| **System: Calculates** | System performs computation |

---

**END OF USER WORKFLOW MAPS**

*Document Version: 1.0*  
*Generated for: EcoComply Platform*  
*Source Documents: Master Commercial Plan (MCP), Product Logic Specification (PLS), Canonical Dictionary*
