# High Level Product Plan
## EcoComply Platform — Modules 1–4

**EcoComply v1.0 — Launch-Ready / Last updated: 2025-01-01**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Commercial Master Plan (00) - Complete

**Purpose:** Defines the complete high-level product plan for all 4 modules (Environmental Permits, Trade Effluent, MCPD/Generators, Hazardous Waste), including features, value propositions, data capture strategies, integration fallback approaches, compliance clock platform capability, audit pack generation specifications, and cross-cutting requirements.

> [v1 UPDATE – Complete Product Plan – 2025-01-01]

---

## 1. Environmental Permits

**Purpose:** Anchor the regulatory scope and define obligations

**ICP:** Any site with a permit under EPR, industrial operations, mid-size manufacturing, depots

### Features

- Permit ingestion (automated parsing via manual upload, email parsing, or optional enhancement API integration)
- Obligation register with evidence rules
- **Condition-level evidence mapping:**
  - Allowed evidence types per condition
  - Automated completeness scoring
  - Versioned evidence history
- **Triggering rules for recurrence:**
  - Dynamic schedules (e.g., "6 months from commissioning")
  - Event-based triggers (not just fixed schedules)
  - Conditional recurrence logic
- **Permit change tracking:**
  - Full redline comparison between permit versions
  - Version impact analysis on obligations
  - Obligation change history
- **Deadline/breach automation:**
  - Escalation workflows
  - Overdue logic and alerts
  - SLA timers and notifications
- Variations, renewals, surrender workflow
- Compliance calendar with recurrence logic
- Enforcement notice tracking
- Documented justification for compliance decisions
- Roles/RLS tied to specific conditions
- Compliance pack generation (regulator inspection packs, audit packs)

### Main value add

- You define the regulated scope
- Evidence burden becomes visible
- You create operational accountability
- This is the wedge: without this, the rest is admin
- One-click compliance proof for inspections and audits
- **Audit-ready compliance** (automated completeness scoring ensures nothing is missed)
- **Reliable audit packs** (versioned evidence history provides defensible audit trail)

### Data Capture & Integration Strategy

- **Manual-first data capture approach:** All permit documents and evidence can be uploaded manually with structured tagging and metadata
- **Integration fallback sequence:** Manual upload → Email parsing with OCR → CSV import → (Optional enhancement) API integration
- **Compliance Clock impact:** Drives deadline alerts, escalation workflows, and pack readiness indicators for all permit obligations and inspection deadlines
- **Pack generation without integrations:** Pack generation remains fully functional using manually captured data; completeness scoring and operational defensibility maintained regardless of integration availability

### Commercial notes

This is always module 1 because it defines what else they need.
Without permits, there is no compliance system.
Pack generation saves 10-20 hours per inspection/audit - high value add.
**Critical:** Without condition-level evidence mapping and deadline automation, this module cannot produce reliable audit packs. These features are essential for auditor confidence. **Operational defensibility is ensured through automated completeness scoring** which validates evidence coverage even with manual data entry.

---

## 2. Trade Effluent

**Purpose:** Track discharges to public sewers and evidence compliance with consent limits

**ICP:** Food & drink manufacturers, industrial laundries, metal finishing, automotive, chemical

### Features

- Consent ingestion and limit extraction (manual upload, email parsing, or optional enhancement API integration)
- **Consent validity state machine:**
  - Draft → In force → Superseded → Expired
  - State transition tracking
  - Active consent management
- **Automated reconciliation rules:**
  - Concentration × volume exposure calculations
  - Breach likelihood scoring
  - Predictive breach alerts
  - Risk-based monitoring prioritization
- **Corrective action workflows:**
  - **Corrective Action Lifecycle:**
    - **Trigger:** Breach or exceedance event detected
    - **Investigation:** Root cause analysis and impact assessment
    - **Assigned corrective actions:** Action items with owners and due dates
    - **Evidence of resolution:** Documentation of corrective measures taken
    - **Closure and regulator justification:** Formal closure with justification for regulator reporting
  - Breach response procedures
  - Documentary evidence trail
  - Action item tracking
  - Resolution verification
- **Sampling logistics automation:**
  - Sampling reminders and scheduling
  - Sample collection tracking
  - Courier coordination
  - Lab submission tracking
  - Certificate receipt and ingestion
  - Automatic evidence linking
- Sampling/monitoring plan + chain of custody
- **Lab Certificate Handling — Integration Fallback Strategy:**
  - **V1 MUST:** Certificates can be captured via email ingestion or manual upload with mandatory field extraction (concentration + volume + sampling date)
  - Any integration with lab portals is a future enhancement and must not delay V1 release or reduce automation value
- Lab certificates ingestion + limit breach alerts
- Monthly statement reconciliation vs volume limits
- Evidence trail for water company audits
- Water company audit packs (automated evidence compilation)

### Main value add

- Converts variable, high-consequence operational activity into provable compliance
- Reduces consultant costs and avoids surcharges/fines
- Clear ROI when breaches avoided
- Instant audit readiness for water company inspections
- **Automated workflow** (sampling → lab → evidence linking eliminates manual coordination)
- **Proactive breach prevention** (breach likelihood scoring enables early intervention)

### Data Capture & Integration Strategy

- **Manual-first data capture approach:** Lab certificates, sampling records, and discharge volumes can be entered manually with validation rules
- **Integration fallback sequence:** Manual upload → Email parsing with OCR → CSV import → (Optional enhancement) Lab portal API integration
- **Compliance Clock impact:** Tracks sampling due dates, lab result deadlines, and consent expiry; drives pack readiness for water company audits
- **Pack generation without integrations:** Pack generation remains fully functional using manually captured data; completeness scoring ensures operational defensibility regardless of integration availability

### Commercial notes

High willingness to pay because effluent breaches create immediate financial consequences.
Audit pack generation eliminates manual compilation for water company audits.
**Critical:** Without automated reconciliation rules and sampling logistics, this module requires manual work that defeats the automation value. The "how" (workflows) is as important as the "what" (data capture). **Operational defensibility is ensured through automated completeness scoring** which validates evidence coverage even with manual data entry.

---

## 3. MCPD / Generators

**Purpose:** Manage onsite combustion plant compliance

**ICP:** Sites with >1MW generators, backup gensets, hospitals, logistics hubs, some manufacturing

### Features

- MCPD permit parsing (manual upload, email parsing, or optional enhancement API integration)
- **Runtime monitoring integration (Optional enhancement):**
  - Automated runtime data capture via direct integration (v2 enhancement)
  - Integration with generator monitoring systems (customer-justified, post-sale)
  - Real-time runtime tracking (optional enhancement)
  - Scalable data collection (optional enhancement)
- **Runtime Monitoring — Zero-Dependency Capture Approach:**
  - **V1 REQUIREMENT:** Runtime logging must support manual entry with validation rules to maintain compliance defensibility
  - Data can be captured through one or more of the following mechanisms:
    1. **Manual runtime entry with reason codes** (Test / Emergency / Maintenance)
    2. **Operator log extraction via CSV upload**
    3. **Email-parsed reports as evidence**
    4. **(Optional v2) Direct integration with generator controllers or telemetry systems**
  - Completeness scoring, compliance clock updates, and pack generation must function regardless of integration availability
- **Emission exemption logic:**
  - Testing vs emergency operation classification
  - Exemption evidence requirements
  - Exemption duration tracking
  - Compliance verification for exemptions
- **Regulation thresholds logic:**
  - MW thresholds → monitoring frequency requirements
  - Automatic frequency calculation based on capacity
  - Threshold-based compliance rules
  - Dynamic monitoring schedules
- Emissions monitoring schedule
- Fuel usage logs + sulphur content reporting
- Generator runtime tracking
- Evidence for exemptions (testing vs operation)
- Enforcement-ready documentation
- MCPD audit packs (automated evidence compilation for regulator inspections)

### Main value add

- Avoids operational shutdown risk
- Removes complexity of reporting
- Captures a large portion of industrial audit scope
- Instant audit readiness with automated pack generation
- **Runtime monitoring** (manual entry with validation rules; optional enhancement for direct integration)
- **Proactive compliance management** (compliance clock prevents missed testing deadlines)

### Data Capture & Integration Strategy

- **Manual-first data capture approach:** Runtime logs, stack test results, and exemption evidence can be entered manually with reason codes and validation rules
- **Integration fallback sequence:** Manual entry with reason codes → CSV upload → Email-parsed reports → (Optional enhancement) Direct integration with generator controllers or telemetry systems
- **Compliance Clock impact:** Tracks stack test deadlines, certification expiry, and runtime caps; drives pack readiness and alerts for MCPD enforcement inspections
- **Pack generation without integrations:** Pack generation remains fully functional using manually captured data; completeness scoring, compliance clock updates, and operational defensibility maintained regardless of integration availability

### Commercial notes

Strong audit forcing function. Good bundled with trade effluent.
Pack generation saves hours of manual compilation for MCPD audits.
**Critical:** Runtime monitoring can be captured manually with validation rules; direct integration is an optional enhancement. **Operational defensibility is ensured through automated completeness scoring** which validates evidence coverage even with manual data entry.

---

## 4. Hazardous Waste Chain of Custody

**Purpose:** Trace high-liability waste streams and prevent enforcement exposure

**ICP:** Same industrial footprint as TE/MCPD + chemical, coatings, plating, aerospace

### Features

- Waste stream classification (EWC codes)
- **Validation rules engine:**
  - Carrier licence validity vs waste type (automatic validation)
  - Volume vs permit limits (real-time checking)
  - Storage duration vs regulations (compliance verification)
  - Pre-submission validation prevents errors
- **Return evidence / end-point proof:**
  - Destruction/recycling outcome documentation
  - End-point verification tracking
  - Certificate of destruction/recycling
  - Complete chain of custody closure
- **Chain-break detection:**
  - Alerts if evidence missing
  - Contractor non-compliance detection
  - Gap identification in chain of custody
  - Automatic breach notifications
- **Corrective action workflows:**
  - **Corrective Action Lifecycle:**
    - **Trigger:** Chain-break event detected (missing evidence, contractor non-compliance, validation failure)
    - **Investigation:** Gap analysis and root cause identification
    - **Assigned corrective actions:** Remediation steps with assigned owners and deadlines
    - **Evidence of resolution:** Documentation of chain closure and corrective measures
    - **Closure and regulator justification:** Formal closure with justification for enforcement defensibility
  - Breach response procedures
  - Documentary evidence trail
  - Action item tracking
  - Resolution verification
- Consignment notes (digital capture + validation)
- **Offline Chain-of-Custody Evidence:**
  - **Minimum viable evidence for each consignment MUST support:**
    - Operator photo upload of consignment documentation
    - QR/Barcode scan where available
    - Timestamped manual entries
  - Automated validation must still apply to manually-captured evidence
- Contractor licence checks + expiry monitoring
- Volume limits vs permit
- Chain of custody reporting
- Evidence pack for audits (automated compilation)
- Waste compliance packs (regulator inspection ready)

### Main value add

- Establishes legal defensibility when waste leaves site
- Material enforcement risk reduction
- Huge pain for consultants manually reconciling this today
- Automated audit pack generation eliminates manual reconciliation
- **Proactive compliance** (validation rules prevent violations before they occur)
- **Complete chain closure** (end-point proof provides full defensibility)

### Data Capture & Integration Strategy

- **Manual-first data capture approach:** Consignment notes, end-point proofs, and chain of custody evidence can be captured via operator photo upload, QR/Barcode scan, or timestamped manual entries
- **Integration fallback sequence:** Manual photo/scan/entry → Email parsing with OCR → CSV import → (Optional enhancement) Haulier portal API integration
- **Compliance Clock impact:** Tracks carrier licence expiry and storage time limits; drives pack readiness for waste compliance audits and enforcement defensibility
- **Pack generation without integrations:** Pack generation remains fully functional using manually captured evidence; automated validation and completeness scoring ensure operational defensibility regardless of integration availability

### Commercial notes

Don't sell waste admin. Sell enforcement risk reduction.
Pack generation is critical - waste audits are evidence-intensive and time-consuming.
**Critical:** Without validation rules engine and chain-break detection, this module cannot provide enforcement defensibility. These control checkpoints are essential for legal protection. **Operational defensibility is ensured through automated completeness scoring** which validates evidence coverage even with manual data entry.

---

## Cross-Cutting Requirements (All Modules)

**Purpose:** Essential features required in every module for audit-ready compliance

**Scope:** Must be implemented consistently across all modules

### Required Features (Every Module Must Have):

- **RLS scoping to site, unit, permit condition:**
  - Row-level security at site level
  - Unit-level access control
  - Condition-level permissions
  - Granular access management

- **Zero-Integration Dependency Principle:**
  - **No compliance function or pack generation should depend on third-party API connections in V1**
  - **Data capture hierarchy (in descending order):**
    1. **Manual structured entry:** User-friendly forms with validation rules
    2. **Email ingestion + OCR:** Automated parsing of email attachments with OCR text extraction
    3. **CSV import:** Standard CSV format templates with validation and error reporting
    4. **Optional API ingestion (v2):** Implement only when customer explicitly requests, not required for v1 launch
    5. **Native telemetry integrations (customer-justified):** Only when customer-driven, post-sale implementation
  - **Critical Rule:** Automation value must remain intact until step 5 becomes beneficial
  - This protects time-to-market and reduces dependency risk

- **Automated recurring task generation:**
  - Dynamic task creation from schedules
  - Event-based task triggers
  - Recurrence logic automation
  - Task assignment and tracking

- **Overdue escalation + audit trail of decisions:**
  - Automatic escalation workflows
  - Decision logging and justification
  - Complete audit trail
  - Escalation history tracking

- **Evidence ageing + expiry rules:**
  - Evidence expiry tracking
  - Ageing alerts and notifications
  - Automatic expiry detection
  - Renewal reminders

- **Compliance Clock (Platform Capability):**
  - **Universal countdown mechanism** driving alerts, escalation, and pack readiness
  - Applies to all obligations, permits, consents, runtime limits, licence expiries
  - **Top-level dashboard** with criticality colours (Red/Amber/Green)
  - Drives operational heartbeat for users and executives
  - Real-time countdown to compliance risks
  - Live status indicators across all modules:
    - **Environmental Permits:** Recurrence deadlines, inspection readiness
    - **Trade Effluent:** Sampling cycles, lab result due dates
    - **MCPD:** Stack tests, runtime caps, certification expiry
    - **Hazardous Waste:** Carrier licence expiry, storage time limits
  - Platform selling point: "Real-time countdown to every compliance risk"
  - Operational heartbeat visible to buyers every day

- **Full inspector/auditor sharing flows:**
  - Secure pack sharing
  - Access control for external users
  - Time-limited access
  - Audit trail of sharing

- **Audit pack integration from day 1:**
  - Module-specific pack templates
  - Automated evidence compilation
  - Standalone pack generation capability
  - Cross-module pack integration

### Critical Requirement:

**If any module cannot produce a pack alone, it is not sellable stand-alone.**

Every module must be able to generate its own audit pack independently, even if cross-module packs provide additional value.

### Implementation Notes:

- These features are not optional - they are foundational
- Must be built into module architecture from the start
- Cannot be retrofitted later without significant rework
- Consistency across modules is critical for user experience

### Access Control & Commercial Enablers:

- **Consultant Mode:**
  - **Consultant role** with multi-tenant access via assignments
  - Read/write based on client permissions
  - Secure external pack sharing
  - Consultant-branded pack option for white-labeling
  - **Critical:** Consultants are a primary partner channel and must have frictionless onboarding and multi-client management.

---

## Audit Pack Generation & Sharing

**Purpose:** Define the complete audit pack system - the North Star USP (fast operational audit)

**Critical Commercial Value:** This is your primary differentiator. Audit packs convert your narrative from theory → operational reliability.

**Audit Packs are a core platform capability and must be real-time, defensible, and regulator-grade.**

**Universal Pack Specification (Applies to ALL Modules):**

**Pack SLA:** < 2 minutes (< 120 seconds) generation time for packs with 100+ evidence items

**Required Contents (Universal - All Modules Must Include):**

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
   - Overdue items: `[{clock_id, title, days_overdue, criticality, module_id, ...}]`
   - Upcoming items (within 30 days): `[{clock_id, title, days_remaining, criticality, target_date, ...}]`
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

**Module-Specific Additions:**
- Modules may add module-specific sections AFTER the 6 universal sections
- Module-specific sections must not replace or modify universal sections
- Examples:
  - Module 1: Permit versions, redline comparisons, enforcement notices
  - Module 2: Lab results, exceedance history, monthly reconciliations
  - Module 3: Stack test results, runtime monitoring, AER documents
  - Module 4: Consignment notes, chain of custody, validation results

**Enforcement:**
- Pack generation MUST fail if any of the 6 universal sections cannot be generated
- Pack generation MUST include all 6 sections (no optional sections)
- Pack generation MUST meet SLA (< 120 seconds) or log warning
- Secure access token MUST be generated for regulator packs
- Access logging MUST be enabled for all secure links
- No module can define pack differently - all use the same universal structure

### Pack Contents Per Module

**Compliance Score Summary (All Pack Types):**
- **Site-Level Compliance Score:** Integer (0-100) displayed prominently in pack header
- **Module-Level Compliance Scores:** Per-module breakdown showing compliance status
- **Score Calculation Details:**
  - Total obligations due
  - Completed and evidenced obligations
  - Overdue obligations count
  - Score trend (improving/declining/stable) over selected period
- **Score Timestamp:** Last calculation date/time
- **Color Coding:** Green (90-100), Amber (70-89), Red (0-69)
- **Score Context:** Explanation of what the score represents and how it's calculated

**Compliance Score Placement:**
- **Pack Header:** Site-level compliance score badge (large, prominent)
- **Executive Summary:** Compliance score with trend analysis
- **Module Sections:** Module-specific compliance scores
- **Compliance Overview Section:** Detailed score breakdown with obligation counts

**Module 1 (Environmental Permits):**
- Obligations register with evidence mapping
- **Evidence completeness score** per condition and overall
- **Version-locked obligations and evidence history** (snapshot at generation time)
- **Document change history** (permit versions, redline comparisons, version impact analysis)
- **Countdown state from Compliance Clock** (deadline status, days remaining, criticality)
- Permit versions with change tracking
- Enforcement notices and responses
- Compliance decisions with justification
- Compliance calendar with deadlines

**Module 2 (Trade Effluent):**
- Consent limits and parameters
- Lab results with exceedance history
- **Evidence completeness score** for sampling and monitoring
- **Version-locked evidence history** (lab certificates, sampling records)
- **Document change history** (consent state transitions, version tracking)
- **Countdown state from Compliance Clock** (sampling due dates, lab result deadlines)
- Sampling logistics and chain of custody
- Monthly statement reconciliations
- Corrective action workflows with lifecycle
- Breach likelihood scores and predictive alerts
- Evidence trail for water company audits

**Module 3 (MCPD/Generators):**
- Generator registrations and permits
- Runtime monitoring data
- Stack test results
- **Evidence completeness score** for testing and monitoring
- **Version-locked evidence history** (test certificates, runtime records)
- **Document change history** (permit variations, generator updates)
- **Countdown state from Compliance Clock** (stack test deadlines, certification expiry, runtime caps)
- Exemption evidence and tracking
- Regulation threshold compliance
- Annual emissions reports

**Module 4 (Hazardous Waste):**
- Waste stream classifications
- Consignment notes with validation
- Chain of custody documentation
- **Evidence completeness score** for chain closure
- **Version-locked evidence history** (consignment notes, end-point proofs)
- **Document change history** (waste stream updates, permit changes)
- **Countdown state from Compliance Clock** (carrier licence expiry, storage time limits)
- End-point proof (destruction/recycling certificates)
- Contractor licence validity
- Chain-break alerts and resolutions
- Volume limits vs permit compliance

### Module-Specific Requirements

**EA Inspection Packs (Module 1):**
- Full permit compliance evidence
- Condition-by-condition evidence mapping
- Enforcement notice history
- Compliance decision audit trail

**Water Company Audit Packs (Module 2):**
- Complete sampling and lab result history
- Monthly statement reconciliation records
- Exceedance history with corrective actions
- Consent compliance evidence

**MCPD Enforcement Packs (Module 3):**
- Generator compliance evidence
- Stack test results and certification
- Runtime monitoring compliance
- Exemption documentation

**Waste Compliance Packs (Module 4):**
- Complete chain of custody
- Consignment note validation
- End-point proof documentation
- Contractor licence compliance

### Where Packs Are Used

- **Environment Agency (EA):** Permit inspections, enforcement actions, compliance audits
- **Water Companies:** Trade effluent consent audits, exceedance investigations
- **External Auditors:** Third-party compliance audits, certification reviews
- **Internal Audits:** Company-wide compliance reviews, risk assessments
- **Regulatory Inspections:** On-site inspections, document reviews

### Format Requirements

- **Secure Web-Based Regulator Portal:**
  - Read-only access for regulators/auditors
  - No login required for regulators (access via secure link)
  - Identity tracking mandatory (email, IP, access timestamp)
  - Responsive design for mobile/tablet access
  - Download capability for all documents
  - View tracking and audit trail

- **Downloadable PDF:**
  - Professional formatting
  - Print-ready layout
  - Table of contents with page numbers
  - Evidence index with links
  - Version signature and timestamp
  - Approval metadata

### Audit Pack Operational Definition

**Pack SLA:** < 2 minutes (< 120 seconds) for 100+ evidence artifacts

**Standardized Structure:**
- All packs (all modules, all pack types) MUST include the 6 universal sections
- Module-specific sections are ADDITIONAL (added after universal sections)
- No module can omit or modify the universal sections

**Regulator-access friendly:**
- Secure link access via `secure_access_token`
- No login required (authentication bypass for regulators)
- Identity audit logged (IP address required, email optional, timestamp)
- Full access audit trail with view/download tracking in `pack_access_logs`
- Optional link expiry via `secure_access_expires_at`

**Regulator access permissions and audit-trail:**
- Read-only access for regulators/auditors
- No login required (access via secure link)
- Identity tracking mandatory (email, IP, access timestamp)
- Complete audit trail of all access events (who, when, what viewed, downloads)

**Version-locking with timestamp and justification history:**
- All evidence items snapshotted at generation time (stored in `pack_contents` table)
- Complete justification history included (from `audit_logs` filtered by entity_type)
- Immutable record once generated (evidence snapshots cannot be modified)
- Generation timestamp included in `pack_provenance_signature`
- Version signature with timestamp, signer, and content hash (SHA-256)

**Compliance Clock embedded for upcoming risks:**
- Countdown state included in pack
- Criticality indicators (Red/Amber/Green)
- Upcoming deadline summary

**Pack types:**
- EA Inspection Pack (Module 1)
- Water Audit Pack (Module 2)
- MCPD Pack (Module 3)
- Haz Waste Defensibility Pack (Module 4)

**Pack provenance signature:**
- Timestamp of generation
- Evidence signer identity (who approved evidence)
- Condition mapping included
- Digital signature for integrity verification
- Hash verification for tamper detection

### Pack Generation SLA

**Critical Performance Requirement:** Pack generation must complete in <2 minutes for 100+ evidence items

- **Target Performance:**
  - Small packs (<50 evidence items): <30 seconds
  - Medium packs (50-100 evidence items): <60 seconds
  - Large packs (100+ evidence items): <120 seconds

- **Technical Requirements:**
  - Background job processing (non-blocking)
  - Progress tracking for user
  - Async PDF generation
  - Efficient evidence compilation
  - Caching of frequently accessed data

- **User Experience:**
  - Immediate feedback (job queued)
  - Progress indicator
  - Notification when ready
  - No page blocking during generation

### Sharing Workflows

- **Time-Limited Secure Link:**
  - Unique access token per pack
  - Configurable expiry (1 day, 7 days, 30 days, custom)
  - One-time or multi-use access
  - Password protection (optional)
  - Role-based access control

- **Full Access Audit History:**
  - Who accessed the pack (email, name if provided)
  - When accessed (timestamp)
  - What was viewed (document sections)
  - Download events tracked
  - IP address logging
  - Identity tracking mandatory even without login

- **No Login Required for Regulators:**
  - Access via secure link only
  - Identity tracking via email capture or IP logging
  - Optional email verification for additional security
  - Audit trail of all access events

### Locked Pack Governance

- **Immutable Record on Generate:**
  - Pack is version-locked at generation time
  - All evidence items are snapshotted at generation
  - Obligations are frozen at generation time
  - Cannot be modified after generation
  - New pack must be generated for updates

- **Version Signature with Timestamp:**
  - Pack version number
  - Generation timestamp
  - Generator user identity
  - Digital signature for integrity verification
  - Hash verification for tamper detection

- **Who Approved Evidence and When:**
  - Evidence approval metadata included in pack
  - Approval user identity
  - Approval timestamp
  - Approval status per evidence item
  - Evidence review history

### Commercial Value

**Why This Matters:**

- **Demo WOW Factor:** Instant pack generation in demos
- **Regulator Trust:** Professional, complete, defensible packs
- **Time Savings:** 10-20 hours saved per inspection/audit
- **Operational Reliability:** Fast, consistent, error-free
- **Competitive Advantage:** No competitor offers this speed/completeness

**Selling Points:**

- "Generate a complete audit pack in under 2 minutes"
- "Never miss evidence in an audit again"
- "Professional, regulator-ready packs every time"
- "Version-locked for defensibility"

---

## Module Features Matrix

### Feature Cross-Module Analysis

This table shows which features are shared across modules vs module-specific.

| Feature | Module 1 (Permits) | Module 2 (Trade Effluent) | Module 3 (MCPD) | Module 4 (Waste) |
|---------|-------------------|-------------------------|----------------|-----------------|
| **Document Ingestion & Parsing** |
| Document ingestion (automated parsing) | ✅ | ✅ | ✅ | ❌ |
| PDF parsing | ✅ | ✅ | ✅ | ❌ |
| OCR/text extraction | ✅ | ✅ | ✅ | ❌ |
| AI extraction | ✅ | ✅ | ✅ | ❌ |
| **Obligations & Requirements** |
| Obligation register | ✅ | ❌ | ✅ | ❌ |
| Parameter extraction | ❌ | ✅ | ❌ | ❌ |
| Limit extraction | ✅ | ✅ | ✅ | ❌ |
| Evidence rules | ✅ | ✅ | ✅ | ✅ |
| **Evidence Management** |
| Evidence upload | ✅ | ✅ | ✅ | ✅ |
| Evidence linking | ✅ | ✅ | ✅ | ✅ |
| Evidence versioning | ✅ | ✅ | ✅ | ✅ |
| Evidence expiry tracking | ✅ | ✅ | ✅ | ✅ |
| Evidence completeness scoring | ✅ | ✅ | ✅ | ✅ |
| **Scheduling & Deadlines** |
| Compliance calendar | ✅ | ✅ | ✅ | ✅ |
| Recurrence logic | ✅ | ✅ | ✅ | ✅ |
| Dynamic schedules | ✅ | ✅ | ✅ | ✅ |
| Event-based triggers | ✅ | ✅ | ✅ | ✅ |
| Deadline tracking | ✅ | ✅ | ✅ | ✅ |
| Deadline automation | ✅ | ✅ | ✅ | ✅ |
| **Workflows & Automation** |
| Automated task generation | ✅ | ✅ | ✅ | ✅ |
| Escalation workflows | ✅ | ✅ | ✅ | ✅ |
| Corrective action workflows | ❌ | ✅ | ❌ | ✅ |
| State machine (validity tracking) | ✅ | ✅ | ❌ | ✅ |
| **Monitoring & Tracking** |
| Monitoring schedules | ✅ | ✅ | ✅ | ❌ |
| Runtime tracking | ❌ | ❌ | ✅ | ❌ |
| Sampling logistics | ❌ | ✅ | ❌ | ❌ |
| Lab certificate ingestion | ❌ | ✅ | ❌ | ❌ |
| **Validation & Rules** |
| Validation rules engine | ✅ | ✅ | ✅ | ✅ |
| Breach detection | ✅ | ✅ | ✅ | ✅ |
| Breach likelihood scoring | ❌ | ✅ | ❌ | ❌ |
| Limit compliance checking | ✅ | ✅ | ✅ | ✅ |
| **Reporting & Reconciliation** |
| Monthly reconciliation | ❌ | ✅ | ❌ | ❌ |
| Volume tracking | ❌ | ✅ | ❌ | ✅ |
| Exposure calculations | ❌ | ✅ | ❌ | ❌ |
| **Change Tracking** |
| Document versioning | ✅ | ✅ | ✅ | ❌ |
| Redline comparison | ✅ | ❌ | ❌ | ❌ |
| Version impact analysis | ✅ | ❌ | ❌ | ❌ |
| **Permit/License Management** |
| Variations workflow | ✅ | ❌ | ❌ | ❌ |
| Renewals workflow | ✅ | ❌ | ❌ | ❌ |
| Surrender workflow | ✅ | ❌ | ❌ | ❌ |
| **Module-Specific Features** |
| Condition-level evidence mapping | ✅ | ❌ | ❌ | ❌ |
| Enforcement notice tracking | ✅ | ❌ | ❌ | ❌ |
| Decision justification | ✅ | ❌ | ❌ | ❌ |
| Consent state machine | ❌ | ✅ | ❌ | ❌ |
| Chain of custody | ❌ | ❌ | ❌ | ✅ |
| Consignment notes | ❌ | ❌ | ❌ | ✅ |
| End-point proof | ❌ | ❌ | ❌ | ✅ |
| Chain-break detection | ❌ | ❌ | ❌ | ✅ |
| Generator runtime integration | ❌ | ❌ | ✅ | ❌ |
| Exemption logic | ❌ | ❌ | ✅ | ❌ |
| Regulation thresholds | ❌ | ❌ | ✅ | ❌ |
| Compliance clock | ✅ | ✅ | ✅ | ✅ |
| **Access Control** |
| RLS (Row Level Security) | ✅ | ✅ | ✅ | ✅ |
| Site-level permissions | ✅ | ✅ | ✅ | ✅ |
| Condition-level permissions | ✅ | ❌ | ❌ | ❌ |
| **Pack Generation** |
| Audit pack generation | ✅ | ✅ | ✅ | ✅ |
| Regulator pack generation | ✅ | ✅ | ✅ | ✅ |
| Module-specific packs | ✅ | ✅ | ✅ | ✅ |
| Standalone pack capability | ✅ | ✅ | ✅ | ✅ |
| **Sharing & Distribution** |
| Inspector/auditor sharing | ✅ | ✅ | ✅ | ✅ |
| Secure pack distribution | ✅ | ✅ | ✅ | ✅ |
| **Audit Trail** |
| Decision audit trail | ✅ | ✅ | ✅ | ✅ |
| Complete history | ✅ | ✅ | ✅ | ✅ |
| Action logging | ✅ | ✅ | ✅ | ✅ |

### Key Insights

**Features Used Across ALL 4 Modules (Universal - Build Once):**
- Evidence management (upload, linking, versioning, expiry, completeness)
- Scheduling & deadlines (calendar, recurrence, dynamic schedules, automation)
- Compliance clock (platform-level countdown mechanism)
- Workflows (task generation, escalation)
- Validation & rules engine
- Breach detection & limit compliance
- RLS & permissions
- Pack generation (all types)
- Sharing & distribution
- Audit trail

**Features Used in 3 Modules:**
- Document ingestion & parsing (Modules 1, 2, 3 only - not Module 4)
- Monitoring schedules (Modules 1, 2, 3)
- Document versioning (Modules 1, 2, 3)

**Features Used in 2 Modules:**
- Obligation register (Modules 1, 3)
- Corrective action workflows (Modules 2, 4)
- Volume tracking (Modules 2, 4)

**Module-Specific Features (Build Per Module):**
- Module 1: Condition-level mapping, enforcement notices, decision justification, redline comparison, variations/renewals/surrender
- Module 2: Consent state machine, breach likelihood scoring, sampling logistics, lab certificates, monthly reconciliation
- Module 3: Runtime tracking, generator integration, exemption logic, regulation thresholds
- Module 4: Chain of custody, consignment notes, end-point proof, chain-break detection

### Platform Architecture Implications

**Core Platform (Build Once):**
- Evidence management system
- Scheduling & recurrence engine
- Compliance clock (platform-level)
- Deadline & escalation system
- Validation rules engine
- RLS & permissions system
- Pack generation framework
- Audit trail system
- Integration fallback system (email parsing, CSV upload, QR scanning)

**Module-Specific Components:**
- Document parsing (Modules 1, 2, 3)
- Module-specific workflows
- Module-specific data models
- Module-specific integrations

