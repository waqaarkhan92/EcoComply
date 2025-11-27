CANONICAL DICTIONARY

Oblicore Platform — Modules 1–3

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Depends On:** Master Commercial Plan (MCP), Product Logic Specification (PLS)  
**Purpose:** Single source of truth for all entities, tables, fields, enums, statuses, and naming conventions

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

- [A. Naming Conventions](#a-naming-conventions)
- [B. Core Entities](#b-core-entities)
- [C. Module-Specific Entities](#c-module-specific-entities)
- [D. Enums and Status Values](#d-enums-and-status-values)
  - [D.10 Pack Type Enum (v1.0)](#d10-pack-type-enum-v10)
- [E. Tables](#e-tables)
- [F. Relationships](#f-relationships)
- [G. Indexes](#g-indexes)
- [H. Constraints](#h-constraints)
- [I. Views](#i-views)
- [J. Functions](#j-functions)
- [K. v1.0 Entities](#k-v10-entities)
  - [K.8 Consultant Client Assignment](#k8-consultant-client-assignment)

---

A. NAMING CONVENTIONS

A.1 Table Naming

* Convention: snake_case, plural form

* Examples: companies, sites, obligations, evidence_items, audit_packs

* No prefixes: Do not use tbl_, t_, or similar prefixes

* No abbreviations: Use full words (environmental_permits not env_permits)

A.2 Field Naming

* Convention: snake_case

* Examples: obligation_id, created_at, is_subjective, confidence_score

* Boolean fields: Prefix with is_ or has_ (e.g., is_subjective, is_active, has_evidence)

* Timestamp fields: Suffix with _at (e.g., created_at, updated_at, deleted_at)

* Date fields: Suffix with _date (e.g., deadline_date, start_date, expiry_date)

* Foreign keys: {referenced_table_singular}_id (e.g., company_id, site_id, obligation_id)

A.3 Entity Naming

* Convention: PascalCase, singular form

* Examples: Company, Site, Obligation, EvidenceItem, Pack (stored in audit_packs table — supports all 5 pack types: Regulator, Tender, Board, Insurer, Audit)

A.4 Enum Naming

* Type names: snake_case (e.g., obligation_category, document_status)

* Enum values: UPPER_SNAKE_CASE (e.g., PENDING, IN_PROGRESS, COMPLETED)

A.5 Foreign Key Naming

* Convention: {referenced_table_singular}_id

* Examples:

    * Reference to companies table: company_id

    * Reference to sites table: site_id

    * Reference to obligations table: obligation_id

A.6 Join Table Naming

* Convention: {table1_singular}_{table2_plural} or descriptive name

* Examples:

    * obligation_evidence_links (linking obligations to evidence)

    * user_site_assignments (linking users to sites)

    * user_roles (linking users to roles)

A.7 Index Naming

* Convention: idx_{table}_{column(s)}

* Examples:

    * idx_obligations_document_id

    * idx_evidence_items_site_id

    * idx_deadlines_due_date

A.8 Constraint Naming

* Primary key: {table}_pkey

* Foreign key: fk_{table}_{referenced_table}

* Unique: uq_{table}_{column(s)}

* Check: chk_{table}_{column}



B. CORE ENTITIES

B.1 Company

Entity Name: Company

Purpose: Represents a customer organisation using the Oblicore platform. Top-level entity in the data hierarchy.

Key Attributes:

* Unique identifier

* Company name

* Billing information

* Contact details

* Module activation status

* Subscription tier

Relationships:

* One Company has Many Sites

* One Company has Many Users

* One Company has Many ModuleActivations

* One Company has Many CrossSellTriggers

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section B.9.4 (Multi-Site Billing)



B.2 Site

Entity Name: Site

Purpose: Represents a physical location owned/operated by a Company where environmental compliance activities occur.

Key Attributes:

* Unique identifier

* Site name

* Address

* Company reference

* Active status

* Module-specific settings

Relationships:

* Many Sites belong to One Company

* One Site has Many Documents

* One Site has Many EvidenceItems

* One Site has Many Schedules

* Many Users can be assigned to Many Sites

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section B.9 (Cross-Site Logic)



B.3 User

Entity Name: User

Purpose: Represents a person who accesses the platform. Users have roles and site assignments.

Key Attributes:

* Unique identifier

* Email (unique)

* Name

* Company reference

* Authentication details

* Notification preferences

Relationships:

* Many Users belong to One Company

* Many Users can have Many Roles (via join table)

* Many Users can be assigned to Many Sites (via join table)

* One User can create Many EvidenceItems

* One User can perform Many AuditLogEntries

PLS Reference: Section B.10 (User Roles Logic)



B.4 Role

Entity Name: Role

Purpose: Defines permission sets that can be assigned to users. Controls access to features and data.

Key Attributes:

* Role type (Owner, Admin, Staff, Viewer, Consultant)

* Permission flags

* Description

Relationships:

* Many Roles can be assigned to Many Users (via join table)

PLS Reference: Section B.10.1 (Role Definitions), Section B.10.2 (Permission Matrix)



B.5 Document

Entity Name: Document

Purpose: Represents a regulatory document uploaded to the system (Environmental Permit, Trade Effluent Consent, or MCPD Registration). Source of truth for obligations.

Key Attributes:

* Unique identifier

* Document type (permit, consent, registration)

* Document reference number

* Site reference

* Module type

* Version information

* Status (draft, active, superseded, expired)

* Upload metadata

* Expiry/renewal dates

Relationships:

* Many Documents belong to One Site (primary site via site_id)

* One Document can be linked to Many Sites (via document_site_assignments for multi-site shared permits)

* One Document has Many Obligations

* One Document has Many DocumentVersions

* One Document has Many AuditPacks

PLS Reference: Section A.1.1 (Document-Centric Architecture), Section A.8 (Versioning Logic), Section B.1 (Document Ingestion Pipeline)



B.6 DocumentVersion

Entity Name: DocumentVersion

Purpose: Tracks versions of documents including variations, renewals, and corrections.

Key Attributes:

* Version number (major.minor.patch)

* Version state (active, superseded, expired, draft)

* Parent version reference

* Change description

* Effective date

Relationships:

* Many DocumentVersions belong to One Document

* One DocumentVersion can supersede another DocumentVersion

PLS Reference: Section A.8.1 (Document Versioning), Section A.8.2 (Version States)



B.7 Obligation

Entity Name: Obligation

Purpose: A discrete compliance requirement extracted from a document. Core entity for tracking compliance.

Key Attributes:

* Unique identifier

* Original text from document

* Plain English summary

* Category (monitoring, reporting, record-keeping, operational, maintenance)

* Frequency

* Deadline information

* Subjective flag and phrases

* Confidence score

* Review status

* Condition reference

* Page reference

Relationships:

* Many Obligations belong to One Document

* One Obligation has One or Many Schedules

* Many Obligations can link to Many EvidenceItems (via join table)

* One Obligation can have Many Deadlines

PLS Reference: Section A.2 (Obligation Categories), Section A.6 (Subjective Obligation Flags), Section B.2 (Obligation Extraction Logic)



B.8 Schedule

Entity Name: Schedule

Purpose: Defines the timing pattern for recurring obligations. Generates deadlines.

Key Attributes:

* Frequency

* Base date

* Next due date

* Last completed date

* Rolling vs fixed flag

* Business day adjustment flag

* Reminder days configuration

* Active status

Relationships:

* One or Many Schedules belong to One Obligation

* One Schedule generates Many Deadlines

PLS Reference: Section A.4.3 (Obligation → Schedule Relationship), Section B.7 (Monitoring Schedule Generation), Section F.2 (Deadline Calculation Rules)



B.9 Deadline

Entity Name: Deadline

Purpose: A specific instance of when an obligation is due. Tracks completion status.

Key Attributes:

* Due date

* Compliance period

* Status (pending, due_soon, completed, overdue, late_complete, not_applicable)

* Completion date

* Completed by user reference

Relationships:

* Many Deadlines belong to One Schedule

* Many Deadlines belong to One Obligation

PLS Reference: Section A.4.4 (Schedule → Deadline Relationship), Section B.3 (Deadline Calculation Rules), Section F.1 (Frequency Types)



B.10 EvidenceItem

Entity Name: EvidenceItem

Purpose: A file uploaded as proof of compliance. Can satisfy multiple obligations.

Key Attributes:

* Unique identifier

* File name

* File type

* File size

* Storage path

* Upload metadata (user, timestamp)

* Description

* Compliance period

* Verification status

Relationships:

* Many EvidenceItems belong to One Site

* Many EvidenceItems can link to Many Obligations (via join table)

* One EvidenceItem uploaded by One User

PLS Reference: Section A.4.2 (Obligation → Evidence Relationship), Section H (Evidence Logic)



B.11 ObligationEvidenceLink

Entity Name: ObligationEvidenceLink

Purpose: Join table linking evidence items to obligations they satisfy.

Key Attributes:

* Obligation reference

* Evidence reference

* Linked by user

* Linked timestamp

* Compliance period

* Notes

Relationships:

* Links One EvidenceItem to One Obligation (many-to-many resolution)

PLS Reference: Section B.4 (Evidence Linking Logic), Section H.2 (Evidence → Obligation Mapping)



B.12 Pack (v1.0 — All Pack Types)

Entity Name: Pack (stored in `audit_packs` table — backward compatibility)

Purpose: A compiled PDF document containing compliance evidence. Supports 5 pack types: Regulator, Tender, Board, Insurer, Audit.

Key Attributes:

* Unique identifier

* Document reference (nullable for Board Pack — multi-site)

* Site reference (nullable for Board Pack — multi-site)

* Company reference (required for all pack types)

* Pack type (v1.0: REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, INSURER_BROKER, AUDIT_PACK)

* Generation timestamp

* Generated by user

* Date range covered

* Filters applied

* File storage path

* Recipient type, recipient name, purpose (v1.0 fields)

* Distribution method, shared link token (v1.0 fields)

Relationships:

* Many Packs belong to One Document (nullable for Board Pack)

* Many Packs belong to One Company (required)

* Many Packs belong to One Site (nullable for Board Pack)

* One Pack generated by One User

**v1.0 Pack Types:**
- Regulator/Inspection Pack: Inspector-ready compliance evidence (Core plan)
- Tender/Client Assurance Pack: Client-facing compliance summary (Growth plan)
- Board/Multi-Site Risk Pack: Multi-site risk summary (Growth plan, company-level)
- Insurer/Broker Pack: Risk narrative for insurance (Growth plan)
- Audit Pack: Full evidence compilation (all plans)

PLS Reference: Section B.8 (Pack Logic — Legacy), Section I.8 (v1.0 Pack Types — Generation Logic), Section C.5.4 (Consultant Pack Generation)



B.13 Consent (Module 2)

Entity Name: Consent

Purpose: A Trade Effluent Consent document specific to Module 2. Extends base Document.

Key Attributes:

* Water company name

* Consent reference number

* Discharge location

* Volume limits

Relationships:

* Inherits from Document

* One Consent has Many Parameters

PLS Reference: Section C.2.1 (Supported Document Types - Module 2)



B.14 Parameter (Module 2)

Entity Name: Parameter

Purpose: A discharge parameter with limits defined in a consent (e.g., BOD, COD, pH).

Key Attributes:

* Parameter type (BOD, COD, SS, pH, Temperature, FOG, Ammonia, Phosphorus)

* Limit value

* Unit

* Limit type (maximum, average, range)

* Sampling frequency

* Confidence score

Relationships:

* Many Parameters belong to One Consent/Document

* One Parameter has Many LabResults

* One Parameter has Many Exceedances

PLS Reference: Section C.2.2 (Parameter Extraction Rules), Section C.2.3 (Parameter Limit Logic)



B.15 LabResult (Module 2)

Entity Name: LabResult

Purpose: A sample result for a parameter from laboratory testing.

Key Attributes:

* Sample date

* Sample ID

* Parameter reference

* Recorded value

* Unit

* Lab reference

* Entry method (manual, CSV, PDF extraction)

* Percentage of limit

Relationships:

* Many LabResults belong to One Parameter

* Many LabResults may trigger One Exceedance

PLS Reference: Section C.2.7 (Lab Result Ingestion Logic)



B.16 Exceedance (Module 2)

Entity Name: Exceedance

Purpose: Records when a parameter value exceeds its consent limit.

Key Attributes:

* Parameter reference

* Recorded value

* Limit value

* Percentage of limit

* Recorded date

* Sample reference

* Status (open, resolved, closed)

* Resolution notes

Relationships:

* Many Exceedances belong to One Parameter

* One Exceedance linked to One LabResult

PLS Reference: Section C.2.4 (Exceedance Detection Logic)



B.17 MCPDRegistration (Module 3)

Entity Name: MCPDRegistration

Purpose: An MCPD Registration document specific to Module 3. Extends base Document.

Key Attributes:

* Registration reference

* Anniversary date

* Submission deadline

Relationships:

* Inherits from Document

* One MCPDRegistration has Many Generators

PLS Reference: Section C.3.1 (Supported Document Types - Module 3)



B.18 Generator (Module 3)

Entity Name: Generator

Purpose: A combustion plant or generator tracked under MCPD regulations.

Key Attributes:

* Generator identifier

* Generator type (MCPD_1_5MW, MCPD_5_50MW, Specified_Generator, Emergency_Generator)

* Capacity (MW)

* Annual run-hour limit

* Monthly run-hour limit (if applicable)

* Fuel type

* Location description

Relationships:

* Many Generators belong to One MCPDRegistration/Document

* One Generator has Many RunHourRecords

* One Generator has Many StackTests

* One Generator has Many MaintenanceRecords

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.4 (Aggregation Rules)



B.19 RunHourRecord (Module 3)

Entity Name: RunHourRecord

Purpose: A log entry recording generator operating hours.

Key Attributes:

* Generator reference

* Recording period (date range)

* Hours recorded

* Entry method (manual, CSV, maintenance record)

* Running total

* Percentage of limit

* Notes

Relationships:

* Many RunHourRecords belong to One Generator

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.3 (Limit Logic)



B.20 StackTest (Module 3)

Entity Name: StackTest

Purpose: Records stack emission testing results for a generator.

Key Attributes:

* Generator reference

* Test date

* Test results (emissions data)

* Compliance status

* Next test due date

* Evidence file reference

Relationships:

* Many StackTests belong to One Generator

PLS Reference: Section C.3.6 (Stack Test Scheduling)



B.21 MaintenanceRecord (Module 3)

Entity Name: MaintenanceRecord

Purpose: Service and maintenance records for generators.

Key Attributes:

* Generator reference

* Maintenance date

* Maintenance type

* Description

* Next service due

* Run hours at service

* Evidence file reference

Relationships:

* Many MaintenanceRecords belong to One Generator

PLS Reference: Section C.3.5 (Maintenance Logic)



B.22 AERDocument (Module 3)

Entity Name: AERDocument

Purpose: Annual Emissions Report document for MCPD compliance.

Key Attributes:

* MCPD Registration reference

* Reporting period (start/end dates)

* Status (draft, in_progress, ready, submitted)

* Total run hours (aggregated)

* Fuel consumption data

* Emissions data

* Submission date

* Generated file path

Relationships:

* Many AERDocuments belong to One MCPDRegistration

PLS Reference: Section C.3.8 (Annual Return Logic)



B.23 ModuleActivation

Entity Name: ModuleActivation

Purpose: Tracks which modules are active for a company/site.

Key Attributes:

* Company reference

* Site reference (nullable for company-wide modules)

* Module reference (module_id UUID → modules.id)

* Status (active, inactive, pending)

* Activated date

* Deactivated date

Relationships:

* Many ModuleActivations belong to One Company

* Many ModuleActivations may belong to One Site

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites)



B.24 CrossSellTrigger

Entity Name: CrossSellTrigger

Purpose: Records detected opportunities to cross-sell additional modules.

Key Attributes:

* Company reference

* Target module

* Trigger type (keyword, external, user_request)

* Trigger source (document ID or external)

* Detected keywords

* Status (pending, dismissed, converted)

* Response action

Relationships:

* Many CrossSellTriggers belong to One Company

* One CrossSellTrigger may reference One Document

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)



B.25 Notification

Entity Name: Notification

Purpose: An alert or notification sent to users.

Key Attributes:

* User reference

* Alert type (deadline, threshold, breach, escalation)

* Severity (info, warning, urgent, critical)

* Channel (email, SMS, in_app)

* Related obligation/entity reference

* Message content

* Sent timestamp

* Delivered timestamp

* Read timestamp

* Actioned timestamp

Relationships:

* Many Notifications sent to One User

* One Notification may reference One Obligation

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic)



B.26 Escalation

Entity Name: Escalation

Purpose: Tracks escalation chains for overdue items.

Key Attributes:

* Obligation reference

* Current escalation level

* Escalated timestamp

* Escalated to user

* Reason

* Resolved timestamp

* Resolution notes

Relationships:

* One Escalation belongs to One Obligation

* One Escalation escalated to One User

PLS Reference: Section F.4 (Escalation Logic)



B.27 ReviewQueueItem

Entity Name: ReviewQueueItem

Purpose: Items flagged for human review during extraction or processing.

Key Attributes:

* Obligation reference (or document reference)

* Review type (low_confidence, subjective, no_match, date_failure, duplicate, ocr_quality)

* Is blocking flag

* Original extraction data (JSON)

* Review status (pending, confirmed, edited, rejected)

* Reviewed by user

* Reviewed timestamp

* Review notes

Relationships:

* One ReviewQueueItem belongs to One Obligation or Document

* One ReviewQueueItem reviewed by One User

PLS Reference: Section A.7 (Human Review Triggers)



B.28 ExtractionLog

Entity Name: ExtractionLog

Purpose: Logs AI extraction processing for debugging and improvement.

Key Attributes:

* Document reference

* Extraction timestamp

* Model identifier

* Rule library version

* Segments processed count

* Obligations extracted count

* Flagged for review count

* Processing time (ms)

* Errors (JSON array)

Relationships:

* Many ExtractionLogs belong to One Document

PLS Reference: Section E.7 (Logging and Validation)



B.29 AuditLog

Entity Name: AuditLog

Purpose: Immutable log of all user actions and system changes for audit trail.

Key Attributes:

* Action type

* Entity type

* Entity ID

* User reference

* Timestamp

* Previous values (JSON)

* New values (JSON)

* IP address

* User agent

Relationships:

* Many AuditLogs performed by One User

PLS Reference: Section A.1.1 (Audit Trail Completeness)



B.30 BackgroundJob

Entity Name: BackgroundJob

Purpose: Tracks scheduled and queued background tasks.

Key Attributes:

* Job type

* Status (pending, running, completed, failed)

* Payload (JSON)

* Scheduled time

* Started time

* Completed time

* Error message

* Retry count

* Max retries

Relationships:

* Standalone system entity

PLS Reference: Section B.1 (Document Ingestion Pipeline - processing), Section I.7 (Audit Pack Generation Triggers)



B.31 Module Extension Pattern

Entity Name: Module Extension Pattern

Purpose: Defines the pattern for adding new modules to the platform. This section documents how to extend the system with additional modules (e.g., Module 4 - Packaging Regulations, Module 5 - Asbestos Management, Module 6 - Fire Safety).

Key Principles:

1. **Module Registration:**
   - Add new module to `modules` table (see Section C.4 - Module Registry Table)
   - Set `module_code` (e.g., 'MODULE_4', 'MODULE_PACKAGING')
   - Set `module_name` (e.g., 'Packaging Regulations')
   - Configure `requires_module_id` if module has prerequisites
   - Set `pricing_model` and `base_price`
   - Define `document_types` JSONB array (which document types this module handles)

2. **Module-Specific Entities:**
   - Each module can define its own entities following the same pattern as Module 2/3
   - Example: Module 2 has Consent, Parameter, LabResult, Exceedance entities
   - Example: Module 3 has Generator, RunHourRecord, StackTest, MaintenanceRecord, AERDocument entities
   - New modules should follow the same entity definition pattern (see Sections B.13-B.22)

3. **Module-Specific Tables:**
   - Each module can define its own database tables
   - Tables should follow naming conventions (snake_case)
   - Tables should include standard fields: id, created_at, updated_at
   - Tables should reference `documents` table via `document_id` foreign key
   - See Sections C.2 (Module 2 Tables) and C.3 (Module 3 Tables) for examples

4. **Module-Specific Enums:**
   - Each module can define its own enums for module-specific statuses/types
   - Enums should follow naming conventions (UPPER_SNAKE_CASE)
   - See Sections D.2 (Module 2 Enums) and D.3 (Module 3 Enums) for examples

5. **Module-Specific Terms:**
   - Each module defines its own LLM vocabulary
   - Terms should be documented in module-specific terms section
   - See Sections J.1 (Module 1 Terms), J.2 (Module 2 Terms), J.3 (Module 3 Terms) for examples

6. **Module Routing:**
   - Module routing is determined by `modules.document_types` JSONB field
   - When a document is uploaded, system queries `modules` table to find which module handles that `document_type`
   - Module routing logic is dynamic (no code changes needed)

7. **Module Activation:**
   - Module activation is handled via `module_activations` table
   - Prerequisites are enforced via `modules.requires_module_id` foreign key
   - Activation logic queries `modules` table to determine prerequisites

8. **Module Pricing:**
   - Pricing is stored in `modules.base_price` and `modules.pricing_model`
   - Billing logic queries `modules` table to calculate charges
   - No code changes needed for new pricing models

Example: Adding Module 4 (Packaging Regulations)

1. **Register Module:**
   ```sql
   INSERT INTO modules (module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, document_types)
   VALUES (
     'MODULE_4',
     'Packaging Regulations',
     'Packaging waste compliance and PRN (Packaging Recovery Note) management',
     NULL,  -- No prerequisite
     'per_site',
     49.00,
     true,
     false,
     '["PACKAGING_REGISTRATION", "PRN_CERTIFICATE"]'::JSONB
   );
   ```

2. **Define Entities:**
   - Create Section B.32: PackagingRegistration
   - Create Section B.33: PRNCertificate
   - Follow same pattern as B.13-B.22

3. **Define Tables:**
   - Create Section C.5: Module 4 Tables (Packaging) - Note: C.4 is reserved for Module Registry Table
   - Define `packaging_registrations` table
   - Define `prn_certificates` table
   - Follow same pattern as C.2 and C.3

4. **Define Enums:**
   - Create Section D.4: Module 4 Enums (Packaging)
   - Define packaging-specific enums
   - Follow same pattern as D.2 and D.3

5. **Define Terms:**
   - Create Section J.4: Module 4 Terms (Packaging)
   - Document packaging-specific LLM vocabulary
   - Follow same pattern as J.1, J.2, J.3

6. **Add Extraction Rules:**
   - Add Module 4 patterns to AI Extraction Rules Library
   - Patterns reference module via `module_id` (UUID) or `module_code` in JSON
   - See AI Extraction Rules Library Section 3 for pattern examples

7. **Add Workflows:**
   - Document Module 4 workflows in User Workflow Maps
   - Follow same pattern as Module 2/3 workflows

**Benefits of This Pattern:**
- ✅ New modules can be added without database schema migrations (except for module-specific tables)
- ✅ Module configuration is data-driven (stored in `modules` table)
- ✅ Prerequisites are enforced via foreign keys (no hardcoded logic)
- ✅ Pricing is configurable per module (no code changes)
- ✅ Module routing is dynamic (based on `document_types` in `modules` table)
- ✅ Consistent pattern across all modules (easier to maintain)

**See Also:**
- Section C.4: Module Registry Table (`modules` table definition)
- Section C.2: Module 2 Tables (example of module-specific tables)
- Section C.3: Module 3 Tables (example of module-specific tables)
- Section D.2: Module 2 Enums (example of module-specific enums)
- Section D.3: Module 3 Enums (example of module-specific enums)
- Section J.2: Module 2 Terms (example of module-specific terms)
- Section J.3: Module 3 Terms (example of module-specific terms)
- Product Logic Specification Section C.4: Module Extension Pattern (business logic perspective)



C. DATABASE TABLES

C.1 Core Tables

Table: companies

Purpose: Stores customer organisation information

Entity: Company

PLS Reference: Section A.1.2 (Data Flow Hierarchy)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

name	TEXT	NOT NULL	NO	-	Company name

billing_email	TEXT	NOT NULL	NO	-	Email for billing communications

billing_address	JSONB	-	YES	NULL	Structured billing address

phone	TEXT	-	YES	NULL	Primary contact phone

subscription_tier	TEXT	CHECK (subscription_tier IN ('starter', 'professional', 'enterprise'))	NO	'starter'	Subscription level

stripe_customer_id	TEXT	UNIQUE	YES	NULL	Stripe customer reference

is_active	BOOLEAN	NOT NULL	NO	true	Whether company account is active

settings	JSONB	-	NO	'{}'	Company-wide settings

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_companies_stripe_customer_id: stripe_customer_id (for billing lookups)

* idx_companies_is_active: is_active (for filtering active companies)

* idx_companies_created_at: created_at (for sorting)

Foreign Keys:

* None

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)



Table: sites

Purpose: Stores physical location information for each company

Entity: Site

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section B.9 (Cross-Site Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to parent company

name	TEXT	NOT NULL	NO	-	Site name

address_line_1	TEXT	-	YES	NULL	Street address

address_line_2	TEXT	-	YES	NULL	Additional address info

city	TEXT	-	YES	NULL	City

postcode	TEXT	-	YES	NULL	Postal code

country	TEXT	NOT NULL	NO	'United Kingdom'	Country

latitude	DECIMAL(10, 8)	-	YES	NULL	GPS latitude

longitude	DECIMAL(11, 8)	-	YES	NULL	GPS longitude

site_reference	TEXT	-	YES	NULL	Customer's internal site reference

regulator	TEXT	CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA'))	YES	NULL	Primary regulatory body

adjust_for_business_days	BOOLEAN	NOT NULL	NO	false	Adjust deadlines to business days

grace_period_days	INTEGER	CHECK (grace_period_days >= 0)	NO	0	Grace period for deadlines

settings	JSONB	-	NO	'{}'	Site-specific settings

is_active	BOOLEAN	NOT NULL	NO	true	Whether site is active

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_sites_company_id: company_id (for company filtering)

* idx_sites_is_active: is_active (for filtering active sites)

* idx_sites_regulator: regulator (for regulatory filtering)

Foreign Keys:

* company_id → companies.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)



Table: users

Purpose: Stores user account information

Entity: User

PLS Reference: Section B.10 (User Roles Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to company

email	TEXT	NOT NULL, UNIQUE	NO	-	User email (login identifier)

full_name	TEXT	NOT NULL	NO	-	User's full name

phone	TEXT	-	YES	NULL	Mobile phone for SMS alerts

avatar_url	TEXT	-	YES	NULL	Profile image URL

auth_provider	TEXT	NOT NULL	NO	'email'	Authentication provider

auth_provider_id	TEXT	-	YES	NULL	External auth provider ID

email_verified	BOOLEAN	NOT NULL	NO	false	Email verification status

last_login_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Last successful login

notification_preferences	JSONB	-	NO	'{"email": true, "sms": false, "in_app": true}'	Alert preferences

quiet_hours_start	TIME	-	YES	NULL	Start of quiet hours (no SMS)

quiet_hours_end	TIME	-	YES	NULL	End of quiet hours

is_active	BOOLEAN	NOT NULL	NO	true	Whether user account is active

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_users_company_id: company_id (for company filtering)

* idx_users_email: email (for login lookups)

* idx_users_is_active: is_active (for filtering active users)

Foreign Keys:

* company_id → companies.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)



Table: user_roles

Purpose: Join table assigning roles to users

Entity: UserRole (join entity)

PLS Reference: Section B.10.3 (Role Assignment)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

user_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to user

role	TEXT	NOT NULL, CHECK	NO	-	Role type (see enum)

assigned_by	UUID	FOREIGN KEY	YES	NULL	User who assigned this role

assigned_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	When role was assigned

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_user_roles_user_id: user_id (for user role lookups)

* uq_user_roles_user_role: UNIQUE(user_id, role) (prevent duplicate role assignments)

Foreign Keys:

* user_id → users.id ON DELETE CASCADE

* assigned_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: user_site_assignments

Purpose: Join table assigning users to sites they can access

Entity: UserSiteAssignment (join entity)

PLS Reference: Section B.10 (User Roles Logic), Section B.9 (Cross-Site Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

user_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to user

site_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to site

assigned_by	UUID	FOREIGN KEY	YES	NULL	User who created assignment

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_user_site_assignments_user_id: user_id (for user site lookups)

* idx_user_site_assignments_site_id: site_id (for site user lookups)

* uq_user_site_assignments: UNIQUE(user_id, site_id) (prevent duplicates)

Foreign Keys:

* user_id → users.id ON DELETE CASCADE

* site_id → sites.id ON DELETE CASCADE

* assigned_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: documents

Purpose: Stores all regulatory documents (permits, consents, registrations)

Entity: Document

PLS Reference: Section A.1.1 (Document-Centric Architecture), Section A.8 (Versioning Logic), Section B.1 (Document Ingestion Pipeline)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

site_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to primary site (for multi-site documents, this is the primary site; additional sites in document_site_assignments)

document_type	TEXT	NOT NULL, CHECK	NO	-	Type of document (see enum)

module_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Associated module (references modules.id)

reference_number	TEXT	-	YES	NULL	Official permit/consent/registration number

title	TEXT	NOT NULL	NO	-	Document title

description	TEXT	-	YES	NULL	Optional description

regulator	TEXT	CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA', 'WATER_COMPANY'))	YES	NULL	Issuing regulatory body

water_company	TEXT	-	YES	NULL	Water company name (Module 2 only)

issue_date	DATE	-	YES	NULL	Date document was issued

effective_date	DATE	-	YES	NULL	Date document becomes effective

expiry_date	DATE	-	YES	NULL	Document expiry date

renewal_reminder_days	INTEGER[]	-	NO	'{90, 30, 7}'	Days before expiry to send reminders

status	TEXT	NOT NULL, CHECK	NO	'DRAFT'	Document status (see enum)

version_number	TEXT	NOT NULL	NO	'1.0'	Current version number

version_state	TEXT	NOT NULL, CHECK	NO	'ACTIVE'	Version state (see enum)

parent_document_id	UUID	FOREIGN KEY	YES	NULL	Reference to parent document (for variations)

original_filename	TEXT	NOT NULL	NO	-	Original uploaded filename

storage_path	TEXT	NOT NULL	NO	-	Path in file storage

file_size_bytes	BIGINT	NOT NULL	NO	-	File size in bytes

mime_type	TEXT	NOT NULL	NO	-	MIME type of file

is_native_pdf	BOOLEAN	NOT NULL	NO	true	Whether PDF is native (vs scanned)

ocr_confidence	DECIMAL(5, 4)	-	YES	NULL	OCR confidence score (0-1)

extraction_status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Extraction processing status

extracted_text	TEXT	-	YES	NULL	Full extracted text content

metadata	JSONB	-	NO	'{}'	Additional document metadata

uploaded_by	UUID	FOREIGN KEY	NO	-	User who uploaded document

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_documents_site_id: site_id (for site filtering)

* idx_documents_document_type: document_type (for type filtering)

* idx_documents_module_id: module_id (for module filtering)

* idx_documents_status: status (for status filtering)

* idx_documents_expiry_date: expiry_date (for renewal alerts)

* idx_documents_reference_number: reference_number (for lookups)

* idx_documents_parent_document_id: parent_document_id (for version chains)

Foreign Keys:

* site_id → sites.id ON DELETE CASCADE

* module_id → modules.id ON DELETE RESTRICT (prevent deletion of active module)

* parent_document_id → documents.id ON DELETE SET NULL

* uploaded_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)

Table: document_site_assignments

Purpose: Join table for multi-site shared permits (allows one document to be linked to multiple sites)

Entity: DocumentSiteAssignment (join entity)

PLS Reference: Section J.5 (Multi-Site Shared Permits)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to document

site_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to site

is_primary	BOOLEAN	NOT NULL	NO	false	Whether this is the primary site (should match documents.site_id)

obligations_shared	BOOLEAN	NOT NULL	NO	false	Whether obligations are shared across sites (true) or replicated per site (false)

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_document_site_assignments_document_id: document_id (for document lookups)

* idx_document_site_assignments_site_id: site_id (for site lookups)

* uq_document_site_assignments: UNIQUE(document_id, site_id) (prevent duplicate assignments)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* site_id → sites.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: No

Table: obligations

Purpose: Stores compliance obligations extracted from documents

Entity: Obligation

PLS Reference: Section A.2 (Obligation Categories), Section A.6 (Subjective Obligation Flags), Section B.2 (Obligation Extraction Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to source document

condition_reference	TEXT	-	YES	NULL	Condition number/reference (e.g., "2.3.1")

original_text	TEXT	NOT NULL	NO	-	Original obligation text from document

obligation_title	TEXT	NOT NULL	NO	-	Title/name of obligation (required)

obligation_description	TEXT	-	YES	NULL	Description of obligation (optional, plain English <200 words)

category	TEXT	NOT NULL, CHECK	NO	'RECORD_KEEPING'	Obligation category (see enum)

frequency	TEXT	CHECK	YES	NULL	Obligation frequency (see enum)

deadline_date	DATE	-	YES	NULL	Explicit deadline date (for one-time)

deadline_relative	TEXT	-	YES	NULL	Relative deadline description

is_subjective	BOOLEAN	NOT NULL	NO	false	Whether obligation requires interpretation

subjective_phrases	TEXT[]	-	NO	'{}'	Detected subjective phrases

interpretation_notes	TEXT	-	YES	NULL	User's interpretation of subjective obligation

confidence_score	DECIMAL(5, 4)	CHECK (confidence_score >= 0 AND confidence_score <= 1)	NO	0	Extraction confidence (0-1)

confidence_components	JSONB	-	NO	'{}'	Breakdown of confidence components

review_status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Human review status (see enum)

reviewed_by	UUID	FOREIGN KEY	YES	NULL	User who reviewed

reviewed_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Review timestamp

review_notes	TEXT	-	YES	NULL	Reviewer notes

original_extraction	JSONB	-	YES	NULL	Snapshot of pre-review extraction

version_number	INTEGER	NOT NULL	NO	1	Obligation version number (increments on each edit)

version_history	JSONB	-	NO	'[]'	Array of previous obligation versions (immutable history). Each entry contains: version_number, edited_by, edited_at, previous_values, edit_reason.

status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Compliance status (see enum)

is_high_priority	BOOLEAN	NOT NULL	NO	false	High priority flag (improvement conditions)

page_reference	INTEGER	-	YES	NULL	Page number in source document

evidence_suggestions	TEXT[]	-	NO	'{}'	Suggested evidence types

assigned_to	UUID	FOREIGN KEY	YES	NULL	User assigned to this obligation

archived_reason	TEXT	-	YES	NULL	Reason for archiving

source_pattern_id	TEXT	-	YES	NULL	Pattern ID from rule library that was used for extraction (if any)

metadata	JSONB	-	NO	'{}'	Additional obligation metadata

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_obligations_document_id: document_id (for document filtering)

* idx_obligations_category: category (for category filtering)

* idx_obligations_status: status (for status filtering)

* idx_obligations_review_status: review_status (for review queue)

* idx_obligations_is_subjective: is_subjective (for subjective filtering)

* idx_obligations_deadline_date: deadline_date (for deadline queries)

* idx_obligations_assigned_to: assigned_to (for user workload)

* idx_obligations_confidence_score: confidence_score (for low confidence filtering)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* reviewed_by → users.id ON DELETE SET NULL

* assigned_to → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)



Table: schedules

Purpose: Stores monitoring schedules for obligations

Entity: Schedule

PLS Reference: Section A.4.3 (Obligation → Schedule Relationship), Section B.7 (Monitoring Schedule Generation)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

obligation_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to obligation

frequency	TEXT	NOT NULL, CHECK	NO	-	Schedule frequency (see enum)

base_date	DATE	NOT NULL	NO	-	Base date for calculations

next_due_date	DATE	-	YES	NULL	Next calculated due date

last_completed_date	DATE	-	YES	NULL	Last completion date

is_rolling	BOOLEAN	NOT NULL	NO	false	Rolling vs fixed schedule

adjust_for_business_days	BOOLEAN	NOT NULL	NO	false	Adjust to business days

reminder_days	INTEGER[]	NOT NULL	NO	'{7, 3, 1}'	Days before to send reminders

status	TEXT	NOT NULL, CHECK	NO	'ACTIVE'	Schedule status

modified_by	UUID	FOREIGN KEY	YES	NULL	User who last modified

modified_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Last modification timestamp

previous_values	JSONB	-	YES	NULL	Previous settings before modification

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_schedules_obligation_id: obligation_id (for obligation lookups)

* idx_schedules_next_due_date: next_due_date (for deadline queries)

* idx_schedules_status: status (for active schedules)

Foreign Keys:

* obligation_id → obligations.id ON DELETE CASCADE

* modified_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: deadlines

Purpose: Stores individual deadline instances generated from schedules

Entity: Deadline

PLS Reference: Section A.4.4 (Schedule → Deadline Relationship), Section B.3 (Deadline Calculation Rules)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

schedule_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to schedule

obligation_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to obligation

due_date	DATE	NOT NULL	NO	-	Deadline date

compliance_period	TEXT	NOT NULL	NO	-	Compliance period identifier

status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Deadline status (see enum)

completed_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Completion timestamp

completed_by	UUID	FOREIGN KEY	YES	NULL	User who marked complete

completion_notes	TEXT	-	YES	NULL	Notes on completion

is_late	BOOLEAN	NOT NULL	NO	false	Whether completed after due date

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_deadlines_schedule_id: schedule_id (for schedule lookups)

* idx_deadlines_obligation_id: obligation_id (for obligation lookups)

* idx_deadlines_due_date: due_date (for deadline queries)

* idx_deadlines_status: status (for status filtering)

* idx_deadlines_compliance_period: compliance_period (for period filtering)

Foreign Keys:

* schedule_id → schedules.id ON DELETE CASCADE

* obligation_id → obligations.id ON DELETE CASCADE

* completed_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: evidence_items

Purpose: Stores uploaded evidence files

Entity: EvidenceItem

PLS Reference: Section H (Evidence Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

site_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to site

file_name	TEXT	NOT NULL	NO	-	Original filename

file_type	TEXT	NOT NULL, CHECK	NO	-	File type (see enum)

file_size_bytes	BIGINT	NOT NULL	NO	-	File size in bytes

mime_type	TEXT	NOT NULL	NO	-	MIME type

storage_path	TEXT	NOT NULL	NO	-	Path in file storage

thumbnail_path	TEXT	-	YES	NULL	Thumbnail path (for images)

description	TEXT	-	YES	NULL	User-provided description

compliance_period	TEXT	-	YES	NULL	Default compliance period

gps_latitude	DECIMAL(10, 8)	-	YES	NULL	GPS latitude (mobile capture)

gps_longitude	DECIMAL(11, 8)	-	YES	NULL	GPS longitude (mobile capture)

capture_timestamp	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When photo was taken

is_verified	BOOLEAN	NOT NULL	NO	false	Admin verification status

verified_by	UUID	FOREIGN KEY	YES	NULL	User who verified

verified_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Verification timestamp

file_hash	TEXT	NOT NULL	NO	-	SHA-256 hash for integrity

is_immutable	BOOLEAN	NOT NULL	NO	true	Whether evidence is immutable (locked from modification). Once set to true, evidence cannot be modified or deleted.

immutable_locked_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Timestamp when evidence was locked (immutable). NULL = not yet locked.

immutable_locked_by	UUID	FOREIGN KEY	YES	NULL	User who locked evidence (system or admin). NULL = auto-locked by system.

is_archived	BOOLEAN	NOT NULL	NO	false	Whether archived (retention)

archived_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Archive timestamp

uploaded_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who uploaded

metadata	JSONB	-	NO	'{}'	Additional file metadata

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_evidence_items_site_id: site_id (for site filtering)

* idx_evidence_items_file_type: file_type (for type filtering)

* idx_evidence_items_uploaded_by: uploaded_by (for user filtering)

* idx_evidence_items_created_at: created_at (for date sorting)

* idx_evidence_items_compliance_period: compliance_period (for period filtering)

* idx_evidence_items_file_hash: file_hash (for duplicate detection)

Foreign Keys:

* site_id → sites.id ON DELETE CASCADE

* uploaded_by → users.id ON DELETE SET NULL

* verified_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No (uses is_archived instead)



Table: obligation_evidence_links

Purpose: Join table linking evidence to obligations

Entity: ObligationEvidenceLink

PLS Reference: Section B.4 (Evidence Linking Logic), Section H.2 (Evidence → Obligation Mapping)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

obligation_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to obligation

evidence_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to evidence item

compliance_period	TEXT	NOT NULL	NO	-	Compliance period this satisfies

notes	TEXT	-	YES	NULL	Linking notes

linked_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who created link

linked_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Link creation timestamp

unlinked_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Unlink timestamp (soft delete)

unlinked_by	UUID	FOREIGN KEY	YES	NULL	User who unlinked

unlink_reason	TEXT	-	YES	NULL	Reason for unlinking

Indexes:

* idx_obligation_evidence_links_obligation_id: obligation_id (for obligation lookups)

* idx_obligation_evidence_links_evidence_id: evidence_id (for evidence lookups)

* idx_obligation_evidence_links_compliance_period: compliance_period (for period filtering)

* uq_obligation_evidence_links: UNIQUE(obligation_id, evidence_id, compliance_period) WHERE unlinked_at IS NULL (prevent duplicate active links)

Foreign Keys:

* obligation_id → obligations.id ON DELETE CASCADE

* evidence_id → evidence_items.id ON DELETE CASCADE

* linked_by → users.id ON DELETE SET NULL

* unlinked_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: Yes (unlinked_at field)



Table: audit_packs

Purpose: Stores generated pack documents (all 5 pack types: Regulator, Tender, Board, Insurer, Audit)

Entity: Pack (stored in audit_packs table — backward compatibility)

**v1.0 Note:** Table name `audit_packs` maintained for backward compatibility. Table stores all pack types.

PLS Reference: Section B.8 (Pack Logic — Legacy), Section I.8 (v1.0 Pack Types — Generation Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	FOREIGN KEY	YES	-	Reference to source document (NULL for Board Pack — multi-site)

site_id	UUID	FOREIGN KEY	YES	-	Reference to site (NULL for Board Pack — multi-site)

pack_type	TEXT	NOT NULL, CHECK	NO	'AUDIT_PACK'	Pack type (v1.0: REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, INSURER_BROKER, AUDIT_PACK, COMBINED)

title	TEXT	NOT NULL	NO	-	Pack title

date_range_start	DATE	NOT NULL	NO	-	Start of covered period

date_range_end	DATE	NOT NULL	NO	-	End of covered period

filters_applied	JSONB	-	NO	'{}'	Filters used in generation

total_obligations	INTEGER	NOT NULL	NO	0	Total obligations included

complete_count	INTEGER	NOT NULL	NO	0	Complete obligations count

pending_count	INTEGER	NOT NULL	NO	0	Pending obligations count

overdue_count	INTEGER	NOT NULL	NO	0	Overdue obligations count

evidence_count	INTEGER	NOT NULL	NO	0	Total evidence items included

storage_path	TEXT	NOT NULL	NO	-	Path to generated PDF

file_size_bytes	BIGINT	NOT NULL	NO	-	File size

generation_time_ms	INTEGER	-	YES	NULL	Time to generate (ms)

generated_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who generated

generation_trigger	TEXT	NOT NULL, CHECK	NO	'MANUAL'	How generation was triggered

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_audit_packs_document_id: document_id (for document lookups)

* idx_audit_packs_site_id: site_id (for site lookups)

* idx_audit_packs_created_at: created_at (for date sorting)

* idx_audit_packs_generated_by: generated_by (for user filtering)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* site_id → sites.id ON DELETE CASCADE

* generated_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



C.2 Module 2 Tables (Trade Effluent)

Table: parameters

Purpose: Stores discharge parameters from trade effluent consents

Entity: Parameter

PLS Reference: Section C.2.2 (Parameter Extraction Rules), Section C.2.3 (Parameter Limit Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to consent document

parameter_type	TEXT	NOT NULL, CHECK	NO	-	Parameter type (see enum)

limit_value	DECIMAL(12, 4)	NOT NULL	NO	-	Limit value

unit	TEXT	NOT NULL	NO	-	Unit of measurement

limit_type	TEXT	NOT NULL, CHECK	NO	'MAXIMUM'	Limit type (see enum)

range_min	DECIMAL(12, 4)	-	YES	NULL	Range minimum (for range type)

range_max	DECIMAL(12, 4)	-	YES	NULL	Range maximum (for range type)

sampling_frequency	TEXT	NOT NULL, CHECK	NO	'WEEKLY'	Required sampling frequency

confidence_score	DECIMAL(5, 4)	CHECK (confidence_score >= 0 AND confidence_score <= 1)	NO	0	Extraction confidence

warning_threshold_percent	INTEGER	NOT NULL	NO	80	Percentage to trigger warning

is_active	BOOLEAN	NOT NULL	NO	true	Whether parameter is active

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_parameters_document_id: document_id (for document lookups)

* idx_parameters_parameter_type: parameter_type (for type filtering)

* idx_parameters_is_active: is_active (for active filtering)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: No



Table: lab_results

Purpose: Stores laboratory sample results for parameters

Entity: LabResult

PLS Reference: Section C.2.7 (Lab Result Ingestion Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

parameter_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to parameter

sample_date	DATE	NOT NULL	NO	-	Date sample was taken

sample_id	TEXT	-	YES	NULL	Lab sample identifier

recorded_value	DECIMAL(12, 4)	NOT NULL	NO	-	Measured value

unit	TEXT	NOT NULL	NO	-	Unit of measurement

percentage_of_limit	DECIMAL(8, 4)	NOT NULL	NO	-	Calculated percentage of limit

lab_reference	TEXT	-	YES	NULL	Lab report reference

entry_method	TEXT	NOT NULL, CHECK	NO	'MANUAL'	How data was entered

source_file_path	TEXT	-	YES	NULL	Source file if uploaded

is_exceedance	BOOLEAN	NOT NULL	NO	false	Whether exceeds limit

entered_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who entered data

verified_by	UUID	FOREIGN KEY	YES	NULL	User who verified

verified_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Verification timestamp

notes	TEXT	-	YES	NULL	Additional notes

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_lab_results_parameter_id: parameter_id (for parameter lookups)

* idx_lab_results_sample_date: sample_date (for date queries)

* idx_lab_results_is_exceedance: is_exceedance (for exceedance filtering)

* uq_lab_results_parameter_date: UNIQUE(parameter_id, sample_date, sample_id) (prevent duplicate entries)

Foreign Keys:

* parameter_id → parameters.id ON DELETE CASCADE

* entered_by → users.id ON DELETE SET NULL

* verified_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: exceedances

Purpose: Records parameter limit exceedances

Entity: Exceedance

PLS Reference: Section C.2.4 (Exceedance Detection Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

parameter_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to parameter

lab_result_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to lab result

recorded_value	DECIMAL(12, 4)	NOT NULL	NO	-	Value that exceeded

limit_value	DECIMAL(12, 4)	NOT NULL	NO	-	Limit that was exceeded

percentage_of_limit	DECIMAL(8, 4)	NOT NULL	NO	-	Percentage of limit

recorded_date	DATE	NOT NULL	NO	-	Date of exceedance

status	TEXT	NOT NULL, CHECK	NO	'OPEN'	Exceedance status (see enum)

resolution_notes	TEXT	-	YES	NULL	How exceedance was resolved

resolved_by	UUID	FOREIGN KEY	YES	NULL	User who resolved

resolved_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Resolution timestamp

corrective_action	TEXT	-	YES	NULL	Corrective action taken

notified_water_company	BOOLEAN	NOT NULL	NO	false	Whether water company notified

notification_date	DATE	-	YES	NULL	Date of notification

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_exceedances_parameter_id: parameter_id (for parameter lookups)

* idx_exceedances_lab_result_id: lab_result_id (for result lookups)

* idx_exceedances_status: status (for status filtering)

* idx_exceedances_recorded_date: recorded_date (for date queries)

Foreign Keys:

* parameter_id → parameters.id ON DELETE CASCADE

* lab_result_id → lab_results.id ON DELETE CASCADE

* resolved_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: discharge_volumes

Purpose: Tracks discharge volumes for surcharge calculations

Entity: DischargeVolume

PLS Reference: Section C.2.3 (Parameter Limit Logic - Discharge Volume Calculations)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to consent document

recording_date	DATE	NOT NULL	NO	-	Date of volume recording

volume_m3	DECIMAL(12, 4)	NOT NULL	NO	-	Volume in cubic metres

measurement_method	TEXT	-	YES	NULL	How volume was measured

notes	TEXT	-	YES	NULL	Additional notes

entered_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who entered data

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_discharge_volumes_document_id: document_id (for document lookups)

* idx_discharge_volumes_recording_date: recording_date (for date queries)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* entered_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



C.3 Module 3 Tables (MCPD/Generators)

Table: generators

Purpose: Stores generator/combustion plant information

Entity: Generator

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.4 (Aggregation Rules)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to MCPD registration

generator_identifier	TEXT	NOT NULL	NO	-	Generator ID/name

generator_type	TEXT	NOT NULL, CHECK	NO	-	Generator type (see enum)

capacity_mw	DECIMAL(8, 4)	NOT NULL	NO	-	Capacity in megawatts

fuel_type	TEXT	NOT NULL	NO	-	Fuel type

location_description	TEXT	-	YES	NULL	Physical location

annual_run_hour_limit	INTEGER	NOT NULL	NO	500	Annual run-hour limit

monthly_run_hour_limit	INTEGER	-	YES	NULL	Monthly limit (if applicable)

anniversary_date	DATE	NOT NULL	NO	-	Registration anniversary

emissions_nox	DECIMAL(12, 4)	-	YES	NULL	NOx emission limit (mg/Nm³)

emissions_so2	DECIMAL(12, 4)	-	YES	NULL	SO2 emission limit

emissions_co	DECIMAL(12, 4)	-	YES	NULL	CO emission limit

emissions_particulates	DECIMAL(12, 4)	-	YES	NULL	Particulate emission limit

current_year_hours	DECIMAL(10, 2)	NOT NULL	NO	0	Running total for current year

current_month_hours	DECIMAL(10, 2)	NOT NULL	NO	0	Running total for current month

next_stack_test_due	DATE	-	YES	NULL	Next stack test due date

next_service_due	DATE	-	YES	NULL	Next maintenance due date

is_active	BOOLEAN	NOT NULL	NO	true	Whether generator is active

metadata	JSONB	-	NO	'{}'	Additional metadata

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

deleted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Soft delete timestamp

Indexes:

* idx_generators_document_id: document_id (for document lookups)

* idx_generators_generator_type: generator_type (for type filtering)

* idx_generators_anniversary_date: anniversary_date (for anniversary queries)

* idx_generators_is_active: is_active (for active filtering)

* idx_generators_next_stack_test_due: next_stack_test_due (for scheduling)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: Yes (deleted_at field)



Table: run_hour_records

Purpose: Logs generator operating hours

Entity: RunHourRecord

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.3 (Limit Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

generator_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to generator

recording_date	DATE	NOT NULL	NO	-	Date of recording

hours_recorded	DECIMAL(8, 2)	NOT NULL, CHECK (hours_recorded >= 0)	NO	-	Hours operated

running_total_year	DECIMAL(10, 2)	NOT NULL	NO	-	Year-to-date total

running_total_month	DECIMAL(10, 2)	NOT NULL	NO	-	Month-to-date total

percentage_of_annual_limit	DECIMAL(6, 2)	NOT NULL	NO	-	Percentage of annual limit

percentage_of_monthly_limit	DECIMAL(6, 2)	-	YES	NULL	Percentage of monthly limit

entry_method	TEXT	NOT NULL, CHECK	NO	'MANUAL'	How data was entered

source_maintenance_record_id	UUID	FOREIGN KEY	YES	NULL	Linked maintenance record

notes	TEXT	-	YES	NULL	Additional notes

entered_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who entered data

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_run_hour_records_generator_id: generator_id (for generator lookups)

* idx_run_hour_records_recording_date: recording_date (for date queries)

* idx_run_hour_records_percentage_of_annual_limit: percentage_of_annual_limit (for threshold queries)

Foreign Keys:

* generator_id → generators.id ON DELETE CASCADE

* source_maintenance_record_id → maintenance_records.id ON DELETE SET NULL

* entered_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: stack_tests

Purpose: Records stack emission test results

Entity: StackTest

PLS Reference: Section C.3.6 (Stack Test Scheduling)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

generator_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to generator

test_date	DATE	NOT NULL	NO	-	Date of test

test_company	TEXT	-	YES	NULL	Testing company

test_reference	TEXT	-	YES	NULL	Test report reference

nox_result	DECIMAL(12, 4)	-	YES	NULL	NOx result (mg/Nm³)

so2_result	DECIMAL(12, 4)	-	YES	NULL	SO2 result

co_result	DECIMAL(12, 4)	-	YES	NULL	CO result

particulates_result	DECIMAL(12, 4)	-	YES	NULL	Particulates result

compliance_status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Compliance assessment

exceedances_found	BOOLEAN	NOT NULL	NO	false	Whether any exceedances

exceedance_details	TEXT	-	YES	NULL	Details of exceedances

next_test_due	DATE	-	YES	NULL	Next test due date

evidence_id	UUID	FOREIGN KEY	YES	NULL	Link to evidence file

notes	TEXT	-	YES	NULL	Additional notes

entered_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who entered data

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_stack_tests_generator_id: generator_id (for generator lookups)

* idx_stack_tests_test_date: test_date (for date queries)

* idx_stack_tests_compliance_status: compliance_status (for status filtering)

* idx_stack_tests_next_test_due: next_test_due (for scheduling)

Foreign Keys:

* generator_id → generators.id ON DELETE CASCADE

* evidence_id → evidence_items.id ON DELETE SET NULL

* entered_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: maintenance_records

Purpose: Stores generator maintenance/service records

Entity: MaintenanceRecord

PLS Reference: Section C.3.5 (Maintenance Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

generator_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to generator

maintenance_date	DATE	NOT NULL	NO	-	Date of maintenance

maintenance_type	TEXT	NOT NULL	NO	-	Type of maintenance

description	TEXT	-	YES	NULL	Maintenance description

run_hours_at_service	DECIMAL(10, 2)	-	YES	NULL	Run hours at time of service

service_provider	TEXT	-	YES	NULL	Service company/technician

service_reference	TEXT	-	YES	NULL	Service report reference

next_service_due	DATE	-	YES	NULL	Next service due date

evidence_id	UUID	FOREIGN KEY	YES	NULL	Link to evidence file

notes	TEXT	-	YES	NULL	Additional notes

entered_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who entered data

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_maintenance_records_generator_id: generator_id (for generator lookups)

* idx_maintenance_records_maintenance_date: maintenance_date (for date queries)

* idx_maintenance_records_next_service_due: next_service_due (for scheduling)

Foreign Keys:

* generator_id → generators.id ON DELETE CASCADE

* evidence_id → evidence_items.id ON DELETE SET NULL

* entered_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: aer_documents

Purpose: Stores Annual Emissions Report data and documents

Entity: AERDocument

PLS Reference: Section C.3.8 (Annual Return Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to MCPD registration

reporting_period_start	DATE	NOT NULL	NO	-	Start of reporting period

reporting_period_end	DATE	NOT NULL	NO	-	End of reporting period

submission_deadline	DATE	NOT NULL	NO	-	Submission deadline

status	TEXT	NOT NULL, CHECK	NO	'DRAFT'	AER status (see enum)

generator_data	JSONB	NOT NULL	NO	'[]'	Generator run-hour data

fuel_consumption_data	JSONB	NOT NULL	NO	'[]'	Fuel consumption data

emissions_data	JSONB	NOT NULL	NO	'[]'	Emissions data

incidents_data	JSONB	NOT NULL	NO	'[]'	Incidents/breakdowns

total_run_hours	DECIMAL(10, 2)	-	YES	NULL	Total aggregated run hours

is_validated	BOOLEAN	NOT NULL	NO	false	Pre-submission validation passed

validation_errors	JSONB	-	NO	'[]'	Validation error messages

generated_file_path	TEXT	-	YES	NULL	Path to generated PDF/CSV

generated_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When file was generated

submitted_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When submitted to EA

submission_reference	TEXT	-	YES	NULL	EA submission reference

submitted_by	UUID	FOREIGN KEY	YES	NULL	User who submitted

notes	TEXT	-	YES	NULL	Additional notes

created_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who created

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_aer_documents_document_id: document_id (for document lookups)

* idx_aer_documents_reporting_period_end: reporting_period_end (for period queries)

* idx_aer_documents_status: status (for status filtering)

* idx_aer_documents_submission_deadline: submission_deadline (for deadline queries)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* submitted_by → users.id ON DELETE SET NULL

* created_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No

**Note:** Module-specific tables (Module 2 and Module 3) follow a consistent pattern. To add Module 4 (Packaging) or any future module, create new tables following the same pattern. See Section B.31 (Module Extension Pattern) for detailed guidance on adding new modules. Module-specific tables are registered via the `modules` table (see Section C.4 - Module Registry Table), and module routing is determined dynamically based on `modules.document_types`.



C.4 Module Registry Table

Table: modules

Purpose: Registry of all available modules (replaces hardcoded module_type enum). This table enables dynamic module addition without database schema changes.

Entity: Module

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

module_code	TEXT	NOT NULL, UNIQUE	NO	-	Module code (e.g., 'MODULE_1', 'MODULE_4', 'MODULE_PACKAGING')

module_name	TEXT	NOT NULL	NO	-	Human-readable module name (e.g., 'Environmental Permits', 'Packaging Regulations')

module_description	TEXT	-	YES	NULL	Module description and purpose

requires_module_id	UUID	FOREIGN KEY	YES	NULL	Prerequisite module (references modules.id). NULL = no prerequisite.

pricing_model	TEXT	NOT NULL, CHECK	NO	-	Pricing model: 'per_site', 'per_company', 'per_document'

base_price	DECIMAL(10, 2)	NOT NULL	NO	0.00	Base price in GBP per billing period

is_active	BOOLEAN	NOT NULL	NO	true	Whether module is available for activation

is_default	BOOLEAN	NOT NULL	NO	false	Whether module is activated by default on signup (typically Module 1 only)

document_types	JSONB	-	YES	NULL	Array of document types this module handles (e.g., ["ENVIRONMENTAL_PERMIT"])

cross_sell_keywords	TEXT[]	-	NO	'{}'	Keywords that trigger cross-sell prompts for this module

workflow_config	JSONB	-	YES	NULL	Module-specific workflow configuration (optional)

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_modules_module_code: module_code (for lookups by code)

* idx_modules_is_active: is_active (for filtering active modules)

* idx_modules_requires_module_id: requires_module_id (for prerequisite queries)

* idx_modules_is_default: is_default (for finding default module)

Foreign Keys:

* requires_module_id → modules.id ON DELETE RESTRICT (prevent deletion of prerequisite)

RLS Enabled: Yes

Soft Delete: No

Notes:

* This table replaces the hardcoded `module_type` enum. All modules (current and future) are registered here.

* To add a new module (e.g., Module 4 - Packaging), insert a new row with appropriate module_code, module_name, and configuration.

* Prerequisites are enforced via `requires_module_id` foreign key. Activation logic queries this table to determine prerequisites.

* Pricing is stored in `base_price` and `pricing_model`. Billing logic queries this table to calculate charges.

* Document types are stored in `document_types` JSONB array. Module routing logic uses this to determine which module handles which document type.

Example Data:

```sql
-- Module 1 (Environmental Permits) - Default module
INSERT INTO modules (module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, document_types)
VALUES (
  'MODULE_1',
  'Environmental Permits',
  'Environmental permit compliance management for EA, SEPA, and NRW permits',
  NULL,
  'per_site',
  149.00,
  true,
  true,
  '["ENVIRONMENTAL_PERMIT"]'::JSONB
);

-- Module 2 (Trade Effluent) - Requires Module 1
INSERT INTO modules (module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, document_types)
VALUES (
  'MODULE_2',
  'Trade Effluent',
  'Trade effluent consent compliance and parameter tracking',
  (SELECT id FROM modules WHERE module_code = 'MODULE_1'),
  'per_site',
  59.00,
  true,
  false,
  '["TRADE_EFFLUENT_CONSENT"]'::JSONB
);

-- Module 3 (MCPD/Generators) - Requires Module 1
INSERT INTO modules (module_code, module_name, module_description, requires_module_id, pricing_model, base_price, is_active, is_default, document_types)
VALUES (
  'MODULE_3',
  'MCPD/Generators',
  'Medium Combustion Plant Directive compliance and generator run-hour tracking',
  (SELECT id FROM modules WHERE module_code = 'MODULE_1'),
  'per_company',
  79.00,
  true,
  false,
  '["MCPD_REGISTRATION"]'::JSONB
);
```



C.5 System Tables

Table: module_activations

Purpose: Tracks module activation status per company/site

Entity: ModuleActivation

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to company

site_id	UUID	FOREIGN KEY	YES	NULL	Reference to site (NULL for company-wide)

module_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to module (references modules.id)

status	TEXT	NOT NULL, CHECK	NO	'ACTIVE'	Activation status (see enum)

activated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Activation timestamp

activated_by	UUID	FOREIGN KEY	YES	NULL	User who activated

deactivated_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Deactivation timestamp

deactivated_by	UUID	FOREIGN KEY	YES	NULL	User who deactivated

deactivation_reason	TEXT	-	YES	NULL	Reason for deactivation

billing_start_date	DATE	NOT NULL	NO	CURRENT_DATE	When billing starts

billing_end_date	DATE	-	YES	NULL	When billing ends

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_module_activations_company_id: company_id (for company lookups)

* idx_module_activations_site_id: site_id (for site lookups)

* idx_module_activations_module_id: module_id (for module filtering)

* idx_module_activations_status: status (for status filtering)

* uq_module_activations: UNIQUE(company_id, site_id, module_id) WHERE status = 'ACTIVE' (one active per module per scope)

Foreign Keys:

* company_id → companies.id ON DELETE CASCADE

* site_id → sites.id ON DELETE CASCADE

* module_id → modules.id ON DELETE RESTRICT (prevent deletion of active module)

* activated_by → users.id ON DELETE SET NULL

* deactivated_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: cross_sell_triggers

Purpose: Records cross-sell opportunities detected in documents

Entity: CrossSellTrigger

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to company

document_id	UUID	FOREIGN KEY	YES	NULL	Source document (if keyword trigger)

target_module_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Target module (references modules.id)

trigger_type	TEXT	NOT NULL, CHECK	NO	-	Trigger type (see enum)

trigger_source	TEXT	NOT NULL	NO	-	Where trigger originated

detected_keywords	TEXT[]	-	NO	'{}'	Keywords that triggered

status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Trigger status (see enum)

responded_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When user responded

response_action	TEXT	-	YES	NULL	User's response action

dismissed_reason	TEXT	-	YES	NULL	Why dismissed (if applicable)

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_cross_sell_triggers_company_id: company_id (for company lookups)

* idx_cross_sell_triggers_document_id: document_id (for document lookups)

* idx_cross_sell_triggers_target_module_id: target_module_id (for module filtering)

* idx_cross_sell_triggers_status: status (for status filtering)

Foreign Keys:

* company_id → companies.id ON DELETE CASCADE

* document_id → documents.id ON DELETE SET NULL

* target_module_id → modules.id ON DELETE RESTRICT (prevent deletion of target module)

RLS Enabled: Yes

Soft Delete: No



Table: notifications

Purpose: Stores all notifications/alerts sent to users

Entity: Notification

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

user_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Recipient user

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Company context

site_id	UUID	FOREIGN KEY	YES	NULL	Site context

alert_type	TEXT	NOT NULL, CHECK	NO	-	Alert type (see enum)

severity	TEXT	NOT NULL, CHECK	NO	'INFO'	Severity level (see enum)

channel	TEXT	NOT NULL, CHECK	NO	-	Delivery channel (see enum)

title	TEXT	NOT NULL	NO	-	Notification title

message	TEXT	NOT NULL	NO	-	Notification message

entity_type	TEXT	-	YES	NULL	Related entity type

entity_id	UUID	-	YES	NULL	Related entity ID

action_url	TEXT	-	YES	NULL	Link to relevant page

sent_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When sent

delivered_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When delivered

read_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When read

actioned_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When action taken

is_escalation	BOOLEAN	NOT NULL	NO	false	Whether this is an escalation

escalation_level	INTEGER	-	YES	NULL	Escalation level (1-4)

metadata	JSONB	-	NO	'{}'	Additional metadata

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_notifications_user_id: user_id (for user lookups)

* idx_notifications_company_id: company_id (for company lookups)

* idx_notifications_alert_type: alert_type (for type filtering)

* idx_notifications_severity: severity (for severity filtering)

* idx_notifications_read_at: read_at (for unread filtering)

* idx_notifications_created_at: created_at (for date sorting)

Foreign Keys:

* user_id → users.id ON DELETE CASCADE

* company_id → companies.id ON DELETE CASCADE

* site_id → sites.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: escalations

Purpose: Tracks escalation chains for overdue items

Entity: Escalation

PLS Reference: Section F.4 (Escalation Logic)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

obligation_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to obligation

current_level	INTEGER	NOT NULL, CHECK (current_level >= 1 AND current_level <= 4)	NO	1	Current escalation level

escalation_reason	TEXT	NOT NULL	NO	-	Reason for escalation

escalated_to	UUID	NOT NULL, FOREIGN KEY	NO	-	User escalated to

escalated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Escalation timestamp

previous_escalation_id	UUID	FOREIGN KEY	YES	NULL	Link to previous escalation

resolved_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Resolution timestamp

resolved_by	UUID	FOREIGN KEY	YES	NULL	User who resolved

resolution_notes	TEXT	-	YES	NULL	Resolution notes

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_escalations_obligation_id: obligation_id (for obligation lookups)

* idx_escalations_escalated_to: escalated_to (for user lookups)

* idx_escalations_current_level: current_level (for level filtering)

* idx_escalations_resolved_at: resolved_at (for unresolved filtering)

Foreign Keys:

* obligation_id → obligations.id ON DELETE CASCADE

* escalated_to → users.id ON DELETE CASCADE

* previous_escalation_id → escalations.id ON DELETE SET NULL

* resolved_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: regulator_questions

Purpose: Tracks regulator questions, queries, and challenges

Entity: RegulatorQuestion

PLS Reference: Section B.13 (Regulator Challenge State Machine), User Workflow Maps Section 4.7

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Company context

site_id	UUID	FOREIGN KEY	YES	NULL	Site context (if site-specific)

document_id	UUID	FOREIGN KEY	YES	NULL	Document context (if document-specific)

obligation_id	UUID	FOREIGN KEY	YES	NULL	Obligation context (if obligation-specific)

question_type	TEXT	NOT NULL, CHECK	NO	-	Type of question: 'OBLIGATION_CLARIFICATION', 'EVIDENCE_REQUEST', 'COMPLIANCE_QUERY', 'URGENT', 'INFORMAL'

question_text	TEXT	NOT NULL	NO	-	Question text from regulator

question_document_id	UUID	FOREIGN KEY	YES	NULL	Uploaded regulator query document (if applicable)

raised_date	DATE	NOT NULL	NO	CURRENT_DATE	Date question was raised

response_deadline	DATE	NOT NULL	NO	-	Response deadline (calculated from raised_date + deadline_days)

status	TEXT	NOT NULL, CHECK	NO	'OPEN'	Question status: 'OPEN', 'RESPONSE_SUBMITTED', 'RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED', 'CLOSED', 'RESPONSE_OVERDUE'

response_text	TEXT	-	YES	NULL	Response text submitted by user

response_submitted_date	DATE	-	YES	NULL	Date response was submitted

response_evidence_ids	UUID[]	-	NO	'{}'	Array of evidence IDs submitted with response

regulator_acknowledged	BOOLEAN	NOT NULL	NO	false	Whether regulator acknowledged response

follow_up_required	BOOLEAN	NOT NULL	NO	false	Whether regulator requires follow-up

closed_date	DATE	-	YES	NULL	Date question was closed

assigned_to	UUID	FOREIGN KEY	YES	NULL	User assigned to handle question

created_by	UUID	NOT NULL, FOREIGN KEY	NO	-	User who created question record

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_regulator_questions_company_id: company_id (for company filtering)

* idx_regulator_questions_status: status (for status filtering)

* idx_regulator_questions_response_deadline: response_deadline (for deadline queries)

* idx_regulator_questions_assigned_to: assigned_to (for user workload)

Foreign Keys:

* company_id → companies.id ON DELETE CASCADE

* site_id → sites.id ON DELETE SET NULL

* document_id → documents.id ON DELETE SET NULL

* obligation_id → obligations.id ON DELETE SET NULL

* question_document_id → documents.id ON DELETE SET NULL

* assigned_to → users.id ON DELETE SET NULL

* created_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: review_queue_items

Purpose: Items flagged for human review

Entity: ReviewQueueItem

PLS Reference: Section A.7 (Human Review Triggers), Section E.6.2 (Hallucination Detection)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to document

obligation_id	UUID	FOREIGN KEY	YES	NULL	Reference to obligation (if applicable)

review_type	TEXT	NOT NULL, CHECK	NO	-	Type of review required

is_blocking	BOOLEAN	NOT NULL	NO	false	Whether review blocks progress

priority	INTEGER	NOT NULL	NO	0	Priority (higher = more urgent)

hallucination_risk	BOOLEAN	NOT NULL	NO	false	Flagged by hallucination detection (extracted text not found, numeric mismatches, absurd dates, etc.)

original_data	JSONB	NOT NULL	NO	'{}'	Original extraction data

review_status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Review status (see enum)

review_action	TEXT	-	YES	NULL	Action taken (confirmed, edited, rejected)

reviewed_by	UUID	FOREIGN KEY	YES	NULL	User who reviewed

reviewed_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Review timestamp

review_notes	TEXT	-	YES	NULL	Reviewer notes

edited_data	JSONB	-	YES	NULL	Edited data (if changed)

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_review_queue_items_document_id: document_id (for document lookups)

* idx_review_queue_items_obligation_id: obligation_id (for obligation lookups)

* idx_review_queue_items_review_status: review_status (for status filtering)

* idx_review_queue_items_is_blocking: is_blocking (for blocking filtering)

* idx_review_queue_items_priority: priority DESC (for priority sorting)

**Blocking State Naming Convention:**
- **`is_blocking` (review_queue_items table):** Boolean flag indicating whether a review queue item blocks document activation/progress. When `is_blocking = true`, the document cannot be activated until the review item is resolved.
- **"Block Activation" (module activation logic):** Separate concept referring to module activation being blocked due to missing prerequisites (via `modules.requires_module_id`). This is not stored as a boolean field but enforced via business logic in activation workflows.
- **Relationship:** Both concepts prevent progress, but operate at different levels:
  - `is_blocking` = Review-level blocking (blocks document activation)
  - "Block Activation" = Module-level blocking (blocks module activation)
- **See Also:** PLS Section D.1.1 (Module Activation Rules), PLS Section B.1.3 (Review Queue Logic)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

* obligation_id → obligations.id ON DELETE SET NULL

* reviewed_by → users.id ON DELETE SET NULL

RLS Enabled: Yes

Soft Delete: No



Table: extraction_logs

Purpose: Logs AI extraction processing

Entity: ExtractionLog

PLS Reference: Section E.7 (Logging and Validation)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

document_id	UUID	NOT NULL, FOREIGN KEY	NO	-	Reference to document

extraction_timestamp	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	When extraction occurred

model_identifier	TEXT	NOT NULL	NO	-	LLM model used

rule_library_version	TEXT	NOT NULL	NO	-	Rule library version

segments_processed	INTEGER	NOT NULL	NO	0	Number of segments processed

obligations_extracted	INTEGER	NOT NULL	NO	0	Number of obligations extracted

flagged_for_review	INTEGER	NOT NULL	NO	0	Number flagged for review

processing_time_ms	INTEGER	NOT NULL	NO	0	Processing time in milliseconds

ocr_required	BOOLEAN	NOT NULL	NO	false	Whether OCR was used

ocr_confidence	DECIMAL(5, 4)	-	YES	NULL	OCR confidence (if used)

errors	JSONB	NOT NULL	NO	'[]'	Errors encountered

warnings	JSONB	NOT NULL	NO	'[]'	Warnings generated

metadata	JSONB	-	NO	'{}'	Additional metadata

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_extraction_logs_document_id: document_id (for document lookups)

* idx_extraction_logs_extraction_timestamp: extraction_timestamp (for date queries)

* idx_extraction_logs_model_identifier: model_identifier (for model filtering)

Foreign Keys:

* document_id → documents.id ON DELETE CASCADE

RLS Enabled: Yes

Soft Delete: No



Table: audit_logs

Purpose: Immutable audit trail of all actions

Entity: AuditLog

PLS Reference: Section A.1.1 (Audit Trail Completeness)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

company_id	UUID	FOREIGN KEY	YES	NULL	Company context

user_id	UUID	FOREIGN KEY	YES	NULL	User who performed action

action_type	TEXT	NOT NULL	NO	-	Type of action performed

entity_type	TEXT	NOT NULL	NO	-	Entity type affected

entity_id	UUID	-	YES	NULL	Entity ID affected

previous_values	JSONB	-	YES	NULL	Values before change

new_values	JSONB	-	YES	NULL	Values after change

ip_address	INET	-	YES	NULL	User's IP address

user_agent	TEXT	-	YES	NULL	User's browser agent

session_id	TEXT	-	YES	NULL	Session identifier

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

Indexes:

* idx_audit_logs_company_id: company_id (for company filtering)

* idx_audit_logs_user_id: user_id (for user filtering)

* idx_audit_logs_entity_type_id: (entity_type, entity_id) (for entity lookups)

* idx_audit_logs_action_type: action_type (for action filtering)

* idx_audit_logs_created_at: created_at (for date queries)

Foreign Keys:

* company_id → companies.id ON DELETE SET NULL

* user_id → users.id ON DELETE SET NULL

RLS Enabled: Yes (read-only for company)

Soft Delete: No (immutable)



Table: background_jobs

Purpose: Tracks scheduled and queued background tasks

Entity: BackgroundJob

PLS Reference: Section B.1 (Document Ingestion Pipeline), Section I.7 (Audit Pack Generation)

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

job_type	TEXT	NOT NULL	NO	-	Type of job

status	TEXT	NOT NULL, CHECK	NO	'PENDING'	Job status

priority	INTEGER	NOT NULL	NO	0	Job priority (higher = sooner)

payload	JSONB	NOT NULL	NO	'{}'	Job parameters

result	JSONB	-	YES	NULL	Job result data

error_message	TEXT	-	YES	NULL	Error if failed

error_stack	TEXT	-	YES	NULL	Error stack trace

scheduled_for	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	When to run

started_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When started

completed_at	TIMESTAMP WITH TIME ZONE	-	YES	NULL	When completed

retry_count	INTEGER	NOT NULL	NO	0	Number of retries

max_retries	INTEGER	NOT NULL	NO	3	Maximum retries allowed

timeout_seconds	INTEGER	NOT NULL	NO	300	Timeout in seconds

retry_backoff_seconds	INTEGER	NOT NULL	NO	2	Exponential backoff delay in seconds (calculated as: 2^retry_count, e.g., retry 1 = 2s, retry 2 = 4s, retry 3 = 8s)

last_heartbeat	TIMESTAMP WITH TIME ZONE	-	YES	NULL	Last heartbeat timestamp (for health checks)

health_status	TEXT	NOT NULL, CHECK	NO	'HEALTHY'	Health status: 'HEALTHY', 'STALE', 'FAILED'

heartbeat_interval_seconds	INTEGER	NOT NULL	NO	60	Expected heartbeat interval (job must update last_heartbeat within this interval)

dead_letter_queue_id	UUID	FOREIGN KEY	YES	NULL	Reference to dead-letter queue record (if job failed permanently)

created_by	UUID	FOREIGN KEY	YES	NULL	User who created job

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_background_jobs_status: status (for status filtering)

* idx_background_jobs_job_type: job_type (for type filtering)

* idx_background_jobs_scheduled_for: scheduled_for (for scheduling)

* idx_background_jobs_priority_scheduled: (priority DESC, scheduled_for ASC) (for job pickup)

Foreign Keys:

* created_by → users.id ON DELETE SET NULL

RLS Enabled: No (system table)

Soft Delete: No



Table: system_settings

Purpose: Stores system-wide configuration

Entity: SystemSetting

PLS Reference: General system configuration needs

Fields:

Field Name	Type	Constraints	Nullable	Default	Description

id	UUID	PRIMARY KEY	NO	gen_random_uuid()	Unique identifier

setting_key	TEXT	NOT NULL, UNIQUE	NO	-	Setting key

setting_value	JSONB	NOT NULL	NO	'{}'	Setting value

description	TEXT	-	YES	NULL	Setting description

is_public	BOOLEAN	NOT NULL	NO	false	Whether visible to users

updated_by	UUID	FOREIGN KEY	YES	NULL	User who last updated

created_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Record creation timestamp

updated_at	TIMESTAMP WITH TIME ZONE	NOT NULL	NO	NOW()	Last update timestamp

Indexes:

* idx_system_settings_setting_key: setting_key (for key lookups)

Foreign Keys:

* updated_by → users.id ON DELETE SET NULL

RLS Enabled: No (system table)

Soft Delete: No


D. ENUMS AND STATUS VALUES

D.1 Core System Enums

Enum: obligation_category

Type: TEXT with CHECK constraint

Used In: obligations.category

Values:

* `MONITORING`: Measuring, sampling, testing activities (e.g., pH testing, emissions monitoring, noise surveys). Default frequency: Daily/Weekly/Monthly

* `REPORTING`: Submitting data/reports to regulators (e.g., annual returns, exceedance notifications, AERs). Default frequency: Annual/Quarterly/Event-triggered

* `RECORD_KEEPING`: Maintaining logs and documentation (e.g., waste transfer notes, maintenance logs, training records). Default frequency: Ongoing/As-generated

* `OPERATIONAL`: Day-to-day operational requirements (e.g., operating hours, material handling, containment). Default frequency: Continuous/Ongoing

* `MAINTENANCE`: Equipment servicing and upkeep (e.g., stack testing, equipment calibration, repair records). Default frequency: Annual/6-monthly/Scheduled

State Transitions:

* All values are valid initial states

* User can change category at any time (override logged)

* Default if uncertain: RECORD_KEEPING (lowest consequence for miscategorisation)

PLS Reference: Section A.2 (Obligation Categories)



Enum: obligation_status

Type: TEXT with CHECK constraint

Used In: obligations.status

Values:

* `PENDING`: Obligation created but not yet due; no action required

* `IN_PROGRESS`: User has started working on this obligation (evidence upload in progress)

* `COMPLETED`: Obligation satisfied with evidence linked within compliance period

* `OVERDUE`: Deadline has passed without evidence or completion

* `INCOMPLETE`: Compliance period ended but no evidence linked for that period (evidence expected but not found)

* `LATE_COMPLETE`: Evidence linked after deadline date (compliance achieved but late)

* `NOT_APPLICABLE`: Obligation marked as N/A by user with reason provided

* `REJECTED`: Obligation rejected during review (extraction error or invalid)

State Transitions:

* Initial state: PENDING

* PENDING → IN_PROGRESS (user action)

* PENDING → OVERDUE (deadline passed)

* IN_PROGRESS → COMPLETED (evidence linked)

* IN_PROGRESS → OVERDUE (deadline passed)

* OVERDUE → INCOMPLETE (compliance period ended, no evidence)

* OVERDUE → LATE_COMPLETE (evidence linked post-deadline)

* OVERDUE → NOT_APPLICABLE (user marks N/A)

* INCOMPLETE → LATE_COMPLETE (evidence linked retroactively)

* Any state → REJECTED (review rejection)

* REJECTED → PENDING (if re-activated)

**Relationship to deadline_status:**
- When `obligation_status = IN_PROGRESS`, the associated `deadline.status` remains `PENDING` or `DUE_SOON` (deadline status does not have an `IN_PROGRESS` value)
- When `obligation_status = COMPLETED`, the associated `deadline.status` should be `COMPLETED`
- When `obligation_status = OVERDUE`, the associated `deadline.status` should be `OVERDUE`
- When `obligation_status = REJECTED`, the associated `deadline.status` remains unchanged (deadline status does not have a `REJECTED` value)

PLS Reference: Section B.5.3 (Compliance Status Calculation), Section J.8 (Deadline Miss Handling)



Enum: obligation_frequency

Type: TEXT with CHECK constraint

Used In: obligations.frequency, schedules.frequency

Values:

* `DAILY`: Every day (365 deadlines/year)

* `WEEKLY`: Every 7 days (52 deadlines/year)

* `MONTHLY`: Same day each month (12 deadlines/year)

* `QUARTERLY`: Every 3 months (4 deadlines/year)

* `ANNUAL`: Once per year (1 deadline/year)

* `ONE_TIME`: Single occurrence (1 deadline total)

* `CONTINUOUS`: Ongoing/constant requirement (no scheduled deadlines; status-based)

* `EVENT_TRIGGERED`: On specific event (deadline created when event occurs)

State Transitions:

* All values are valid initial states

* User can modify frequency (changes future deadlines)

* ONE_TIME cannot transition to recurring frequencies

* CONTINUOUS cannot have scheduled deadlines

PLS Reference: Section F.1 (Frequency Types), Section C.1.5 (Monitoring Frequency Logic)



Enum: document_type

Type: TEXT with CHECK constraint

Used In: documents.document_type

Values:

* `ENVIRONMENTAL_PERMIT`: Environmental Permit (Part A, Part B, PPC Permit, WML)

* `TRADE_EFFLUENT_CONSENT`: Trade Effluent Consent or Discharge Permit

* `MCPD_REGISTRATION`: MCPD Registration or Specified Generator Registration

**Note:** New modules can add new document types. For example, Module 4 (Packaging) might add `PACKAGING_REGISTRATION` and `PRN_CERTIFICATE`. Document types are associated with modules via the `modules.document_types` JSONB field. Module routing logic queries the `modules` table to determine which module handles which document type. See Section B.31 (Module Extension Pattern) for guidance on adding new modules and their document types.

State Transitions:

* Set at document upload (cannot change after extraction)

* Determines module routing and extraction rules

* Module routing is dynamic (based on `modules.document_types` JSONB field)

PLS Reference: Section B.1.3 (Module Routing), Section C.1.1 (Supported Document Types - Module 1), Section C.2.1 (Supported Document Types - Module 2), Section C.3.1 (Supported Document Types - Module 3)



Enum: document_status

Type: TEXT with CHECK constraint

Used In: documents.status

Values:

* `DRAFT`: Document uploaded but not yet processed

* `ACTIVE`: Document is current and in force; obligations active

* `SUPERSEDED`: Document replaced by newer version; obligations migrated or archived

* `EXPIRED`: Document past validity date; no active obligations

State Transitions:

* Initial state: DRAFT

* DRAFT → ACTIVE (after successful extraction and user confirmation)

* ACTIVE → SUPERSEDED (new version uploaded)

* ACTIVE → EXPIRED (expiry date passed)

* SUPERSEDED → ACTIVE (if restored)

* EXPIRED → ACTIVE (if renewed)

PLS Reference: Section A.8.2 (Version States), Section C.1.8 (Renewal Logic)



Enum: document_version_state

Type: TEXT with CHECK constraint

Used In: documents.version_state

Values:

* `ACTIVE`: Current version in force

* `SUPERSEDED`: Replaced by newer version; obligations migrated or archived

* `EXPIRED`: Past validity date; no active obligations

* `DRAFT`: Uploaded but not yet processed

State Transitions:

* Initial state: DRAFT

* DRAFT → ACTIVE (after processing)

* ACTIVE → SUPERSEDED (new version uploaded)

* ACTIVE → EXPIRED (expiry date passed)

PLS Reference: Section A.8.2 (Version States)



Enum: extraction_status

Type: TEXT with CHECK constraint

Used In: documents.extraction_status

Values:

* `PENDING`: Document uploaded, extraction not yet started

* `PROCESSING`: Extraction in progress (OCR, segmentation, LLM extraction)

* `COMPLETED`: Extraction finished successfully

* `FAILED`: Extraction failed (timeout, error, invalid response)

* `REVIEW_REQUIRED`: Extraction completed but items flagged for human review

State Transitions:

* Initial state: PENDING

* PENDING → PROCESSING (extraction started)

* PROCESSING → COMPLETED (success)

* PROCESSING → FAILED (error)

* PROCESSING → REVIEW_REQUIRED (completed with flagged items)

* FAILED → PENDING (retry)

* REVIEW_REQUIRED → COMPLETED (all reviews resolved)

PLS Reference: Section B.1 (Document Ingestion Pipeline), Section B.2 (Obligation Extraction Logic)



Enum: review_status

Type: TEXT with CHECK constraint

Used In: obligations.review_status, review_queue_items.review_status

Values:

* `PENDING`: Item awaiting human review

* `CONFIRMED`: Review completed; extraction confirmed as correct

* `EDITED`: Review completed; extraction edited by reviewer

* `REJECTED`: Review completed; extraction rejected (obligation invalid)

* `PENDING_INTERPRETATION`: Obligation flagged as subjective, awaiting interpretation

* `INTERPRETED`: Subjective obligation has been interpreted and locked

* `NOT_APPLICABLE`: Obligation marked as not applicable by user

State Transitions:

* Initial state: PENDING

* PENDING → CONFIRMED (user confirms)

* PENDING → EDITED (user edits)

* PENDING → REJECTED (user rejects)

* PENDING → PENDING_INTERPRETATION (subjective obligation flagged)

* PENDING_INTERPRETATION → INTERPRETED (interpretation completed and locked)

* PENDING_INTERPRETATION → NOT_APPLICABLE (user marks as N/A)

* REJECTED → PENDING (if re-activated)

PLS Reference: Section A.7 (Human Review Triggers), Section B.11 (Manual Override Rules), Section A.6 (Subjective Obligation Flags)



Enum: deadline_status

Type: TEXT with CHECK constraint

Used In: deadlines.status

Values:

* `PENDING`: Deadline not yet due

* `DUE_SOON`: Deadline within 7 days

* `COMPLETED`: Deadline satisfied with evidence

* `OVERDUE`: Deadline passed without completion

* `INCOMPLETE`: Compliance period ended but no evidence linked for that period (evidence expected but not found)

* `LATE_COMPLETE`: Completed after deadline date

* `NOT_APPLICABLE`: Marked as N/A by user

State Transitions:

* Initial state: PENDING

* PENDING → DUE_SOON (7 days before)

* PENDING → OVERDUE (deadline passed)

* DUE_SOON → OVERDUE (deadline passed)

* DUE_SOON → COMPLETED (evidence linked)

* OVERDUE → INCOMPLETE (compliance period ended, no evidence)

* OVERDUE → LATE_COMPLETE (evidence linked post-deadline)

* INCOMPLETE → LATE_COMPLETE (evidence linked retroactively)

* OVERDUE → NOT_APPLICABLE (user marks N/A)

* Any state → COMPLETED (evidence linked on time)

**Relationship to obligation_status:**
- `deadline_status` does NOT include `IN_PROGRESS` (unlike `obligation_status`)
- When `obligation.status = IN_PROGRESS`, the associated `deadline.status` remains `PENDING` or `DUE_SOON`
- When `obligation.status = REJECTED`, the associated `deadline.status` remains unchanged (deadline status does not have a `REJECTED` value)
- `deadline_status` focuses on deadline proximity and completion, while `obligation_status` tracks user work progress

PLS Reference: Section B.3 (Deadline Calculation Rules), Section B.5.3 (Compliance Status Calculation)



Enum: schedule_status

Type: TEXT with CHECK constraint

Used In: schedules.status

Values:

* `ACTIVE`: Schedule is active and generating deadlines

* `PAUSED`: Schedule temporarily paused (deadlines not generated)

* `ARCHIVED`: Schedule no longer active (obligation archived or superseded)

State Transitions:

* Initial state: ACTIVE

* ACTIVE → PAUSED (user pause)

* ACTIVE → ARCHIVED (obligation archived)

* PAUSED → ACTIVE (user resume)

* ARCHIVED → ACTIVE (if restored)

PLS Reference: Section B.7 (Monitoring Schedule Generation)



Enum: evidence_type

Type: TEXT with CHECK constraint

Used In: evidence_items.file_type

Values:

* `PDF`: PDF documents (reports, certificates, documents)

* `IMAGE`: Image files (JPEG, PNG, GIF, WEBP)

* `CSV`: CSV data files (lab results, monitoring data)

* `XLSX`: Excel spreadsheets

* `ZIP`: Archive files (bulk uploads)

State Transitions:

* Set at upload (cannot change)

* Determined by file extension and MIME type

PLS Reference: Section H.6 (Evidence Types)



Enum: compliance_status

Type: TEXT with CHECK constraint

Used In: General compliance tracking (calculated field, not stored)

Values:

* `COMPLETE`: Evidence linked within current compliance period

* `PENDING`: No evidence, deadline is future

* `DUE_SOON`: No evidence, deadline within 7 days

* `OVERDUE`: No evidence, deadline passed

* `NOT_APPLICABLE`: Obligation marked N/A

State Transitions:

* Calculated dynamically based on evidence and deadline status

* Not stored as enum (computed field)

PLS Reference: Section B.5.3 (Compliance Status Calculation)

**Note:** Module-specific enums (Module 2 and Module 3) are defined per module. To add enums for a new module (e.g., Module 4 - Packaging), create a new section following the same pattern. See Section B.31 (Module Extension Pattern) for detailed guidance on adding new modules.



D.2 Module 2 Enums (Trade Effluent)

Enum: parameter_type

Type: TEXT with CHECK constraint

Used In: parameters.parameter_type

Values:

* `BOD`: Biochemical Oxygen Demand (mg/l)

* `COD`: Chemical Oxygen Demand (mg/l)

* `SS`: Suspended Solids (mg/l)

* `PH`: pH (pH units)

* `TEMPERATURE`: Temperature (°C)

* `FOG`: Fats, Oils, Grease (mg/l)

* `AMMONIA`: Ammonia (mg/l)

* `PHOSPHORUS`: Phosphorus (mg/l)

State Transitions:

* Set at extraction (cannot change)

* Determined by consent document content

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Enum: limit_type

Type: TEXT with CHECK constraint

Used In: parameters.limit_type

Values:

* `MAXIMUM`: "shall not exceed", "maximum", "≤" (single upper limit)

* `AVERAGE`: "average", "mean" (average value limit)

* `RANGE`: "between X and Y", "X-Y" (min and max range)

State Transitions:

* Set at extraction (cannot change)

* Determines exceedance detection logic

PLS Reference: Section C.2.3 (Parameter Limit Logic)



Enum: sampling_frequency

Type: TEXT with CHECK constraint

Used In: parameters.sampling_frequency

Values:

* `DAILY`: Daily sampling required

* `WEEKLY`: Weekly sampling required

* `MONTHLY`: Monthly sampling required

* `QUARTERLY`: Quarterly sampling required

* `ANNUAL`: Annual sampling required

State Transitions:

* Set at extraction (can be modified by user)

* User can increase frequency only (decrease requires consent variation)

PLS Reference: Section C.2.6 (Sampling Schedule Logic)



Enum: entry_method

Type: TEXT with CHECK constraint

Used In: lab_results.entry_method

Values:

* `MANUAL`: Manually entered via form

* `CSV_UPLOAD`: Imported from CSV file

* `PDF_EXTRACTION`: Extracted from lab report PDF (LLM extraction)

State Transitions:

* Set at entry (cannot change)

* Determines data source and validation rules

PLS Reference: Section C.2.7 (Lab Result Ingestion Logic)



Enum: exceedance_status

Type: TEXT with CHECK constraint

Used In: exceedances.status

Values:

* `OPEN`: Exceedance detected, not yet resolved

* `RESOLVED`: Exceedance addressed with corrective action

* `CLOSED`: Exceedance closed (resolved and verified)

State Transitions:

* Initial state: OPEN

* OPEN → RESOLVED (user adds resolution notes and corrective action)

* RESOLVED → CLOSED (verified by admin or user confirmation)

* CLOSED → OPEN (if re-opened for review)

PLS Reference: Section C.2.4 (Exceedance Detection Logic)



D.3 Module 3 Enums (MCPD/Generators)

Enum: generator_type

Type: TEXT with CHECK constraint

Used In: generators.generator_type

Values:

* `MCPD_1_5MW`: MCPD 1-5MW generator (500 hours/year limit)

* `MCPD_5_50MW`: MCPD 5-50MW generator (500 hours/year limit)

* `SPECIFIED_GENERATOR`: Specified Generator (50 hours/year limit)

* `EMERGENCY_GENERATOR`: Emergency/Standby Generator (varies by permit)

State Transitions:

* Set at registration (cannot change)

* Determines run-hour limits and compliance rules

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules)



Enum: aer_status

Type: TEXT with CHECK constraint

Used In: aer_documents.status

Values:

* `DRAFT`: AER document created but not yet populated

* `IN_PROGRESS`: Data being collected and entered

* `READY`: All required data populated, ready for review

* `SUBMITTED`: Submitted to EA (final state)

State Transitions:

* Initial state: DRAFT

* DRAFT → IN_PROGRESS (data entry started)

* IN_PROGRESS → READY (all required fields populated)

* READY → SUBMITTED (submitted to EA)

* READY → IN_PROGRESS (if edits needed)

* SUBMITTED (terminal state - cannot change)

PLS Reference: Section C.3.8 (Annual Return Logic)

**Note:** Module-specific enums (Module 2 and Module 3) are defined per module. To add enums for a new module (e.g., Module 4 - Packaging), create a new section following the same pattern. See Section B.31 (Module Extension Pattern) for detailed guidance on adding new modules.



Enum: compliance_status

Type: TEXT with CHECK constraint

Used In: stack_tests.compliance_status

Values:

* `PENDING`: Test results not yet assessed

* `COMPLIANT`: Test results within limits

* `NON_COMPLIANT`: Test results exceed limits

* `UNDER_REVIEW`: Results being reviewed

State Transitions:

* Initial state: PENDING

* PENDING → COMPLIANT (results within limits)

* PENDING → NON_COMPLIANT (results exceed limits)

* PENDING → UNDER_REVIEW (manual review required)

* UNDER_REVIEW → COMPLIANT (confirmed compliant)

* UNDER_REVIEW → NON_COMPLIANT (confirmed non-compliant)

PLS Reference: Section C.3.6 (Stack Test Scheduling)



D.4 System Configuration Enums

Enum: subscription_tier

Type: TEXT with CHECK constraint

Used In: companies.subscription_tier

Values:

* `STARTER`: Starter tier (base features)

* `PROFESSIONAL`: Professional tier (enhanced features)

* `ENTERPRISE`: Enterprise tier (full features, custom support)

State Transitions:

* Initial state: STARTER

* User can upgrade/downgrade (billing adjusted)

* Changes logged for audit

PLS Reference: Section 7 (Commercial Model - MCP)



Enum: regulator

Type: TEXT with CHECK constraint

Used In: sites.regulator, documents.regulator

Values:

* `EA`: Environment Agency (England)

* `SEPA`: Scottish Environment Protection Agency (Scotland)

* `NRW`: Natural Resources Wales (Wales)

* `NIEA`: Northern Ireland Environment Agency (Northern Ireland)

* `WATER_COMPANY`: Water Company (for Module 2 consents)

State Transitions:

* Set at site/document creation (can be modified)

* Determines document format expectations and reporting requirements

PLS Reference: Section C.1.1 (Supported Document Types - Module 1), Section C.2.1 (Supported Document Types - Module 2)



**Note:** The `module_type` enum has been replaced with the `modules` table (see Section C.4 - Module Registry Table). All module references now use `module_id` (UUID foreign key) instead of `module_type` (TEXT enum).

**Migration Path:**
- Old: `module_type TEXT CHECK (module_type IN ('MODULE_1', 'MODULE_2', 'MODULE_3'))`
- New: `module_id UUID FOREIGN KEY → modules.id`

**Benefits:**
- New modules can be added without database schema changes
- Prerequisites are enforced via `modules.requires_module_id` foreign key
- Pricing is stored in `modules.base_price` and `modules.pricing_model`
- Module configuration is stored in `modules` table (document types, cross-sell keywords, etc.)

**See:** Section C.4 (Module Registry Table) for the `modules` table definition. For business logic on module extension, see Product Logic Specification Section C.4 (Module Extension Pattern).

**PLS Reference:** Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites)



Enum: module_status

Type: TEXT with CHECK constraint

Used In: module_activations.status

Values:

* `ACTIVE`: Module is active and available

* `INACTIVE`: Module is deactivated (data archived)

* `PENDING_ACTIVATION`: Module activation requested but not yet processed

State Transitions:

* Initial state: PENDING_ACTIVATION

* PENDING_ACTIVATION → ACTIVE (activation confirmed)

* ACTIVE → INACTIVE (deactivation)

* INACTIVE → ACTIVE (reactivation)

* Modules cannot be deactivated if dependent modules (via requires_module_id) are active (queried dynamically from modules table)

PLS Reference: Section D.1 (Module Prerequisites)



Enum: user_role

Type: TEXT with CHECK constraint

Used In: user_roles.role

Values:

* `OWNER`: Full access; billing; user management; company settings

* `ADMIN`: Full access except billing; user management for assigned sites

* `STAFF`: View/edit obligations; upload evidence; generate packs (all pack types per plan); assigned sites only

* `VIEWER`: Read-only access; can view but not edit; assigned sites only

* `CONSULTANT`: Multi-company access; Staff permissions across client companies; Generate all pack types for assigned clients

State Transitions:

* Set at role assignment (can be changed by Owner/Admin)

* Owner role: Automatically assigned to account creator

* Role changes logged with previous_role

PLS Reference: Section B.10 (User Roles Logic)



D.5 Alert and Notification Enums

Enum: alert_type

Type: TEXT with CHECK constraint

Used In: notifications.alert_type

Values:

* `DEADLINE`: Deadline approaching or due

* `THRESHOLD`: Limit threshold reached (80%, 90%)

* `BREACH`: Limit breach detected (100%+)

* `ESCALATION`: Escalation to next level

* `DOCUMENT_EXPIRY`: Document renewal reminder

* `REVIEW_REQUIRED`: Item requires human review

State Transitions:

* Generated by system based on events

* Cannot be manually set

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic)



Enum: alert_severity

Type: TEXT with CHECK constraint

Used In: notifications.severity

Values:

* `INFO`: Informational message (no action required)

* `WARNING`: Warning requiring attention

* `URGENT`: Urgent action required

* `CRITICAL`: Critical issue requiring immediate action

State Transitions:

* Determined by alert type and timing

* INFO → WARNING (threshold approaching)

* WARNING → URGENT (threshold reached)

* URGENT → CRITICAL (breach or overdue)

PLS Reference: Section F.3 (Alert Generation Logic)



Enum: alert_channel

Type: TEXT with CHECK constraint

Used In: notifications.channel

Values:

* `EMAIL`: Email notification

* `SMS`: SMS text message

* `IN_APP`: In-app notification (notification bell)

State Transitions:

* Can be multiple channels per notification

* User preferences control which channels are used

PLS Reference: Section B.6.3 (Alert Delivery), Section F.6.2 (Notification Preferences)



D.6 Cross-Sell and Trigger Enums

Enum: cross_sell_trigger_type

Type: TEXT with CHECK constraint

Used In: cross_sell_triggers.trigger_type

Values:

* `KEYWORD`: Keyword detected in Module 1 document

* `EXTERNAL`: External trigger (enforcement notice, user request)

* `USER_REQUEST`: User manually requests module activation

State Transitions:

* Set at trigger creation (cannot change)

* Determines trigger source and handling

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)



Enum: cross_sell_trigger_status

Type: TEXT with CHECK constraint

Used In: cross_sell_triggers.status

Values:

* `PENDING`: Trigger detected, awaiting user response

* `DISMISSED`: User dismissed trigger

* `CONVERTED`: User activated module (trigger converted)

State Transitions:

* Initial state: PENDING

* PENDING → CONVERTED (user activates)

* PENDING → DISMISSED (user dismisses)

* DISMISSED → PENDING (if re-triggered)

* CONVERTED (terminal state)

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)



D.7 Background Job Enums

Enum: job_type

Type: TEXT (not constrained, extensible)

Used In: background_jobs.job_type

Common Values:

* `DOCUMENT_EXTRACTION`: Document processing and obligation extraction

* `DEADLINE_GENERATION`: Generate deadlines from schedules

* `AUDIT_PACK_GENERATION`: Generate pack PDF (all pack types: Regulator, Tender, Board, Insurer, Audit)
* `PACK_DISTRIBUTION`: Distribute pack via email/shared link (v1.0)
* `CONSULTANT_CLIENT_SYNC`: Sync consultant client assignments and dashboard (v1.0)

* `NOTIFICATION_SEND`: Send notification (email/SMS)

* `DATA_EXPORT`: Export data for reporting

* `SCHEDULED_REPORT`: Scheduled report generation

State Transitions:

* Job types are extensible (not enum-constrained)

* Each job type has specific status transitions

PLS Reference: Section B.1 (Document Ingestion Pipeline), Section I.7 (Audit Pack Generation Triggers)



Enum: job_status

Type: TEXT with CHECK constraint

Used In: background_jobs.status

Values:

* `PENDING`: Job queued, not yet started

* `RUNNING`: Job currently executing

* `COMPLETED`: Job finished successfully

* `FAILED`: Job failed (error occurred)

* `CANCELLED`: Job cancelled before completion

State Transitions:

* Initial state: PENDING

* PENDING → RUNNING (job started)

* RUNNING → COMPLETED (success)

* RUNNING → FAILED (error)

* RUNNING → CANCELLED (user/system cancellation)

* FAILED → PENDING (retry)

* CANCELLED (terminal state)

PLS Reference: Section B.1 (Document Ingestion Pipeline)



D.8 Confidence Score Thresholds

Enum: confidence_level

Type: Calculated field (not stored enum)

Used In: obligations.confidence_score (calculated from score)

Thresholds:

* `HIGH`: ≥85% (0.85-1.00) - Auto-accept; shown as "Confirmed"

* `MEDIUM`: 70-84% (0.70-0.84) - Flag for review; "Review recommended"

* `LOW`: <70% (0.00-0.69) - Require review; blocking until human confirms

State Transitions:

* Calculated from confidence_score field

* Not stored as enum (computed classification)

* Determines review requirements and UI treatment

PLS Reference: Section A.5 (Confidence Scoring Rules), Section E.2 (Confidence Scoring Methodology)



D.9 Review Queue Enums

Enum: review_type

Type: TEXT with CHECK constraint

Used In: review_queue_items.review_type

Values:

* `LOW_CONFIDENCE`: Confidence score <70%

* `SUBJECTIVE`: Subjective language detected

* `NO_MATCH`: No rule library pattern match found

* `DATE_FAILURE`: Date parsing uncertainty

* `DUPLICATE`: Potential duplicate obligation detected

* `OCR_QUALITY`: OCR confidence <80%

* `CONFLICT`: Conflicting obligations detected

State Transitions:

* Set at extraction (cannot change)

* Determines review priority and blocking status

PLS Reference: Section A.7 (Human Review Triggers), Section E.4 (Mandatory Human Review Nodes)



Enum: review_action

Type: TEXT with CHECK constraint

Used In: review_queue_items.review_action

Values:

* `CONFIRMED`: Extraction confirmed as correct

* `EDITED`: Extraction edited by reviewer

* `REJECTED`: Extraction rejected (obligation invalid)

State Transitions:

* Set during review (cannot change)

* Maps to review_status transitions

PLS Reference: Section A.7.2 (Review Workflow)



D.10 Pack Enums (v1.0 — All Pack Types)

> [v1 UPDATE – Pack Type Enum – 2024-12-27]

Enum: pack_type

Type: TEXT with CHECK constraint

Used In: audit_packs.pack_type

Values:

**v1.0 Commercial Pack Types:**
* `AUDIT_PACK`: Full evidence compilation for internal audits (all plans)
* `REGULATOR_INSPECTION`: Inspector-ready compliance pack (Core plan, included)
* `TENDER_CLIENT_ASSURANCE`: Compliance summary for tenders (Growth plan)
* `BOARD_MULTI_SITE_RISK`: Multi-site risk summary (Growth plan)
* `INSURER_BROKER`: Risk narrative for insurance (requires Growth Plan, same as Tender Pack — independent pack type)

**Legacy Module-Specific Pack Types (deprecated in v1.0):**
* `COMBINED`: All active modules combined (deprecated - use AUDIT_PACK)
* `MODULE_1`: Module 1 specific pack (deprecated - use AUDIT_PACK or REGULATOR_INSPECTION)
* `MODULE_2`: Module 2 specific pack (deprecated - use AUDIT_PACK)
* `MODULE_3`: Module 3 specific pack (deprecated - use AUDIT_PACK)

**v1.0 Pack Type Migration Strategy:**

**Backward Compatibility Rules:**
1. **Reading Legacy Packs:**
   - ✅ System CAN read legacy packs (COMBINED, MODULE_1, MODULE_2, MODULE_3)
   - Legacy packs display with "(Legacy)" badge in UI
   - All pack viewing/download features work normally for legacy packs
   - Legacy packs remain queryable in database

2. **Creating New Packs:**
   - ❌ System CANNOT create new packs with legacy types
   - API rejects legacy pack types with 400 error: "Pack type {type} is deprecated. Please use: AUDIT_PACK, REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, or INSURER_BROKER"
   - Frontend UI only shows v1.0 pack types in dropdown
   - Validation enforced at application layer (API + frontend)

3. **Migration Behavior:**
   - NO automatic migration of legacy packs
   - Legacy packs preserved as-is (historical record, audit trail)
   - Users can regenerate pack with v1.0 type if needed
   - Old packs remain immutable (read-only)

4. **Database Constraints:**
   - CHECK constraint allows legacy types for backward compatibility: `pack_type IN ('REGULATOR_INSPECTION', 'TENDER_CLIENT_ASSURANCE', 'BOARD_MULTI_SITE_RISK', 'INSURER_BROKER', 'AUDIT_PACK', 'COMBINED', 'MODULE_1', 'MODULE_2', 'MODULE_3')`
   - Application layer validates: new packs must use v1.0 types only
   - No CASCADE updates to legacy packs

5. **Module Code vs Pack Type Clarification:**
   - `module_code` (MODULE_1, MODULE_2, MODULE_3) in `modules` table - STILL VALID (refers to active modules)
   - `pack_type` (MODULE_1, MODULE_2, MODULE_3) in `audit_packs` table - DEPRECATED (refers to legacy pack format)
   - These are DIFFERENT enums despite same names (historical artifact)
   - Going forward: modules use module_code, packs use v1.0 pack_type

**Migration Recommendations:**
- For customers with legacy packs: Leave as-is for historical reference
- For new pack generation: Always use v1.0 pack types
- For reporting: Query includes legacy packs but flags them appropriately
- For API clients: Update to use v1.0 pack types before January 2025

**Implementation Note:**
- v1.0 pack types are fixed enum values (not dynamic)
- Pack type determines content structure and access control
- Plan-based access: Core Plan can generate `REGULATOR_INSPECTION` and `AUDIT_PACK` only
- Growth Plan can generate all pack types
- Consultant Edition can generate all pack types for assigned clients
- Legacy module-specific pack types supported for READ ONLY (not creation)

**Pack Type Access Control:**
- Core Plan: `REGULATOR_INSPECTION`, `AUDIT_PACK`
- Growth Plan: All pack types
- Consultant Edition: All pack types (for assigned clients)

State Transitions:

* Set at generation (cannot change)

* Determines pack content and structure

* Plan-based access enforced at generation time

PLS Reference: Section I.8 (v1.0 Pack Types — Generation Logic), Section I.1 (Module-Specific Pack Structures), Section D.5 (Cross-Module Audit Pack)



Enum: generation_trigger

Type: TEXT with CHECK constraint

Used In: audit_packs.generation_trigger

Values:

* `MANUAL`: User-initiated generation

* `SCHEDULED`: Scheduled generation (weekly/monthly)

* `PRE_INSPECTION`: Pre-inspection trigger

* `DEADLINE_BASED`: Auto-generate before permit renewal

State Transitions:

* Set at generation (cannot change)

* Determines generation timing

PLS Reference: Section I.7 (Pack Generation Triggers — Applies to All Pack Types), Section I.8 (v1.0 Pack Types — Generation Logic)


E. LLM VOCABULARY

This section defines ALL terms that the LLM must recognize during document extraction, obligation parsing, and system interactions. Each term maps to specific entities, tables, and fields in the system.

E.1 Module 1 Terms (Environmental Permits)

Term: Environmental Permit

Definition: A regulatory document issued by EA, SEPA, NRW, or NIEA that authorises specific activities and sets compliance obligations. The primary document type for Module 1.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'ENVIRONMENTAL_PERMIT', module_id (set by routing query: SELECT id FROM modules WHERE document_types @> '["ENVIRONMENTAL_PERMIT"]'::JSONB)

Context: Used during document upload and module routing. LLM must identify this term to route document to appropriate module. Routing is dynamic: system queries modules table WHERE document_types @> '["ENVIRONMENTAL_PERMIT"]'::JSONB to find matching module, then sets documents.module_id to the returned UUID. No hardcoded module_code checks.

Examples:
- "Environmental Permit EP123456"
- "This Environmental Permit authorises..."
- "Permit reference: EP/12345/AB"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: Part A Permit

Definition: A type of Environmental Permit for larger, more complex installations (Part A activities). Regulated by EA in England.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'ENVIRONMENTAL_PERMIT', metadata.permitsubtype = 'PART_A'

Context: Used to identify permit complexity and determine extraction patterns. Part A permits typically have more obligations than Part B.

Examples:
- "Part A Environmental Permit"
- "Part A(1) Installation"
- "Part A Permit EP123456"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: Part B Permit

Definition: A type of Environmental Permit for smaller installations (Part B activities). Regulated by EA or Local Authorities in England.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'ENVIRONMENTAL_PERMIT', metadata.permitsubtype = 'PART_B'

Context: Used to identify permit type. Part B permits typically have fewer obligations than Part A.

Examples:
- "Part B Environmental Permit"
- "Part B(2) Installation"
- "Local Authority Part B Permit"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: Waste Management Licence (WML)

Definition: A type of Environmental Permit for waste management activities. Also known as WML.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'ENVIRONMENTAL_PERMIT', metadata.permitsubtype = 'WML'

Context: Used to identify waste-specific permits. May have different obligation patterns than standard permits.

Examples:
- "Waste Management Licence"
- "WML EP123456"
- "Waste Management Licence Number: EP/12345/WM"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: PPC Permit

Definition: Pollution Prevention and Control Permit issued by SEPA in Scotland. Equivalent to Environmental Permit in England.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'ENVIRONMENTAL_PERMIT', regulator = 'SEPA'

Context: Used to identify Scottish permits. May use different terminology than EA permits.

Examples:
- "PPC Permit"
- "PPC Permit Number: PPC/12345"
- "Pollution Prevention and Control Permit"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: Standard Condition

Definition: Boilerplate conditions present on most permits. These are pre-defined in the rule library for pattern matching.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): category, frequency (from rule library match)

Context: LLM should first check rule library for standard conditions before extracting. If match found (≥90% confidence), use library template.

Examples:
- "Condition 2.1: The operator shall operate in accordance with a management system"
- "Standard Condition Schedule 1"
- "Standard conditions apply as set out in..."

PLS Reference: Section A.3.1 (Condition Type Definitions), Section B.2.2 (Rule Library Lookup)



Term: Site-Specific Condition

Definition: Custom conditions unique to the permitted activity. Not found in standard conditions library.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): All fields extracted via LLM, review_status = 'PENDING' (always flagged)

Context: LLM must perform full extraction for site-specific conditions. Always flagged for human review.

Examples:
- "Condition 3.5: The operator shall maintain noise levels below 45dB at boundary"
- "Site-specific condition 4.2"
- "Additional condition: [custom text]"

PLS Reference: Section A.3.1 (Condition Type Definitions), Section A.3.2 (Condition Extraction Rules)



Term: Improvement Condition

Definition: Time-bound requirements with hard deadlines. High priority obligations with specific completion dates.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): category = 'OPERATIONAL', is_high_priority = true, deadline_date, frequency = 'ONE_TIME'

Context: LLM must extract explicit deadline dates. Creates one-time schedule with high priority flag.

Examples:
- "Improvement Condition 5.1: Complete by 31 December 2024"
- "Improvement programme: Implement within 6 months"
- "Condition 2.3: No later than [date], the operator shall..."

PLS Reference: Section C.1.3 (Improvement Condition Logic)



Term: ELV (Emission Limit Value)

Definition: Quantitative emission limits specified in permits. Numeric values with units (mg/m³, μg/m³, dB, etc.).

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): category = 'MONITORING', metadata.elv_value, metadata.elv_unit, metadata.averaging_period

Context: LLM must extract limit value, unit, and averaging period. Generates monitoring schedule.

Examples:
- "ELV: 50 mg/m³ (daily average)"
- "Emission Limit Value: 100 μg/m³"
- "Shall not exceed 45 dB at boundary"

PLS Reference: Section C.1.4 (ELV Logic)



Term: Monitoring Frequency

Definition: How often monitoring/sampling/testing must occur (daily, weekly, monthly, etc.).

Maps To:
- Entity: Obligation, Schedule
- Table: obligations.frequency, schedules.frequency

Context: LLM extracts frequency from obligation text. Used to generate monitoring schedules.

Examples:
- "Monitor daily"
- "Weekly sampling required"
- "Monthly testing"
- "Quarterly surveys"

PLS Reference: Section C.1.5 (Monitoring Frequency Logic), Section F.1 (Frequency Types)



Term: Reporting Requirement

Definition: Obligations to submit data/reports to regulators periodically.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): category = 'REPORTING', frequency

Context: LLM identifies reporting obligations and extracts submission deadlines.

Examples:
- "Submit annual return by 31 January"
- "Report exceedances within 14 days"
- "Quarterly reporting required"

PLS Reference: Section A.2.1 (Category Definitions)



Term: Permit Variation

Definition: A change to an existing permit. Creates a new document version.

Maps To:
- Entity: Document
- Table: documents
- Field(s): version_number (incremented minor version), parent_document_id, version_state

Context: LLM/system identifies variation keywords. Creates version 1.1, 1.2, etc.

Examples:
- "Permit Variation"
- "Variation Notice"
- "Variation to Permit EP123456"

PLS Reference: Section A.8.1 (Document Versioning)



Term: Permit Renewal

Definition: A new permit replacing an expired one. Creates major version increment.

Maps To:
- Entity: Document
- Table: documents
- Field(s): version_number (major version increment), parent_document_id, version_state = 'SUPERSEDED' for old version

Context: System identifies renewal keywords. Creates version 2.0, marks previous as superseded.

Examples:
- "Permit Renewal"
- "Renewed Permit"
- "Renewal of Permit EP123456"

PLS Reference: Section A.8.1 (Document Versioning), Section C.1.8 (Renewal Logic)



Term: EA (Environment Agency)

Definition: Environment Agency - regulatory body for England.

Maps To:
- Entity: Site, Document
- Table: sites.regulator, documents.regulator
- Field(s): regulator = 'EA'

Context: Used to identify regulator and determine document format expectations.

Examples:
- "Environment Agency"
- "EA Permit"
- "Issued by the Environment Agency"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: SEPA (Scottish Environment Protection Agency)

Definition: Scottish Environment Protection Agency - regulatory body for Scotland.

Maps To:
- Entity: Site, Document
- Table: sites.regulator, documents.regulator
- Field(s): regulator = 'SEPA'

Context: Used to identify regulator. Scottish permits may use different terminology.

Examples:
- "Scottish Environment Protection Agency"
- "SEPA Permit"
- "PPC Permit issued by SEPA"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: NRW (Natural Resources Wales)

Definition: Natural Resources Wales - regulatory body for Wales.

Maps To:
- Entity: Site, Document
- Table: sites.regulator, documents.regulator
- Field(s): regulator = 'NRW'

Context: Used to identify regulator. Welsh permits may have bilingual content.

Examples:
- "Natural Resources Wales"
- "NRW Permit"
- "Issued by Natural Resources Wales"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



Term: NIEA (Northern Ireland Environment Agency)

Definition: Northern Ireland Environment Agency - regulatory body for Northern Ireland.

Maps To:
- Entity: Site, Document
- Table: sites.regulator, documents.regulator
- Field(s): regulator = 'NIEA'

Context: Used to identify regulator.

Examples:
- "Northern Ireland Environment Agency"
- "NIEA Permit"
- "Issued by NIEA"

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)



E.2 Module 2 Terms (Trade Effluent)

Term: Trade Effluent Consent

Definition: A regulatory document issued by a water company authorising discharge of trade effluent to sewer. Primary document type for Module 2.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'TRADE_EFFLUENT_CONSENT', module_id (set by routing query: SELECT id FROM modules WHERE document_types @> '["TRADE_EFFLUENT_CONSENT"]'::JSONB), water_company

Context: Used during document upload and module routing. LLM must identify this term to route document to appropriate module. Routing is dynamic: system queries modules table WHERE document_types @> '["TRADE_EFFLUENT_CONSENT"]'::JSONB to find matching module, then sets documents.module_id to the returned UUID. No hardcoded module_code checks.

Examples:
- "Trade Effluent Consent"
- "Consent to Discharge Trade Effluent"
- "Trade Effluent Consent Number: TEC/12345"

PLS Reference: Section C.2.1 (Supported Document Types - Module 2)



Term: Consent

Definition: Shorthand for Trade Effluent Consent. Used interchangeably in documents.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'TRADE_EFFLUENT_CONSENT'

Context: LLM must distinguish from other types of consents (e.g., planning consent).

Examples:
- "This Consent authorises..."
- "Consent Number: TEC/12345"
- "Conditions of this Consent"

PLS Reference: Section C.2.1 (Supported Document Types - Module 2)



Term: Parameter

Definition: A discharge parameter with limits defined in a consent (e.g., BOD, COD, pH, Temperature).

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type, limit_value, unit, limit_type

Context: LLM extracts parameter name, limit value, unit, and limit type from consent document.

Examples:
- "Parameter: BOD"
- "BOD limit: 300 mg/l"
- "pH parameter"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: BOD (Biochemical Oxygen Demand)

Definition: A trade effluent parameter measuring organic matter. Expressed in mg/l.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'BOD', unit = 'mg/l'

Context: LLM must recognize BOD in various forms (BOD, biochemical oxygen demand, BOD5).

Examples:
- "BOD: 300 mg/l"
- "Biochemical Oxygen Demand (BOD)"
- "BOD5 limit"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: COD (Chemical Oxygen Demand)

Definition: A trade effluent parameter measuring organic and inorganic matter. Expressed in mg/l.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'COD', unit = 'mg/l'

Context: LLM must recognize COD in various forms.

Examples:
- "COD: 500 mg/l"
- "Chemical Oxygen Demand (COD)"
- "COD limit"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: SS (Suspended Solids)

Definition: A trade effluent parameter measuring suspended solids. Expressed in mg/l. Also known as TSS.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'SS', unit = 'mg/l'

Context: LLM must recognize SS, TSS, suspended solids.

Examples:
- "SS: 400 mg/l"
- "Suspended Solids (SS)"
- "TSS limit"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: pH

Definition: A trade effluent parameter measuring acidity/alkalinity. Expressed in pH units.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'PH', unit = 'pH units'

Context: LLM must extract pH limits (typically ranges, e.g., 6.0-9.0).

Examples:
- "pH: 6.0-9.0"
- "pH range"
- "pH limit"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: Temperature

Definition: A trade effluent parameter measuring discharge temperature. Expressed in °C.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'TEMPERATURE', unit = '°C'

Context: LLM must extract temperature limits (typically maximum values).

Examples:
- "Temperature: 25°C maximum"
- "Discharge temperature limit"
- "Temp: 25°C"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: FOG (Fats, Oils, Grease)

Definition: A trade effluent parameter measuring fats, oils, and grease. Expressed in mg/l.

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): parameter_type = 'FOG', unit = 'mg/l'

Context: LLM must recognize FOG, fats oils grease, oil and grease.

Examples:
- "FOG: 100 mg/l"
- "Fats, Oils, Grease (FOG)"
- "Oil and Grease limit"

PLS Reference: Section C.2.2 (Parameter Extraction Rules)



Term: Exceedance

Definition: When a parameter value exceeds its consent limit. Triggers alerts and requires resolution.

Maps To:
- Entity: Exceedance
- Table: exceedances
- Field(s): status = 'OPEN', recorded_value, limit_value, percentage_of_limit

Context: System detects exceedances when lab results exceed limits. LLM may extract exceedance information from reports.

Examples:
- "BOD exceedance detected"
- "Parameter exceeded limit"
- "Exceedance of 350 mg/l (limit: 300 mg/l)"

PLS Reference: Section C.2.4 (Exceedance Detection Logic)



Term: Surcharge

Definition: Additional charges imposed by water company when discharge exceeds limits or volumes.

Maps To:
- Entity: DischargeVolume (indirect)
- Table: discharge_volumes
- Field(s): volume_m3 (used in surcharge calculations)

Context: System tracks discharge volumes for surcharge prevention. LLM may extract surcharge information from bills.

Examples:
- "Surcharge applied"
- "Trade effluent surcharge"
- "Volume-based surcharge"

PLS Reference: Section C.2.3 (Parameter Limit Logic - Discharge Volume Calculations)



Term: Sampling Frequency

Definition: How often samples must be taken for parameters (daily, weekly, monthly).

Maps To:
- Entity: Parameter
- Table: parameters
- Field(s): sampling_frequency

Context: LLM extracts sampling frequency from consent. Used to generate sampling schedules.

Examples:
- "Weekly sampling required"
- "Sample daily"
- "Monthly sampling frequency"

PLS Reference: Section C.2.6 (Sampling Schedule Logic)



Term: Lab Result

Definition: A sample result from laboratory testing for a parameter.

Maps To:
- Entity: LabResult
- Table: lab_results
- Field(s): sample_date, recorded_value, unit, percentage_of_limit

Context: Users enter lab results manually, via CSV, or LLM extracts from PDF lab reports.

Examples:
- "Lab result: BOD 250 mg/l"
- "Sample ID: LAB-2024-001"
- "Laboratory test result"

PLS Reference: Section C.2.7 (Lab Result Ingestion Logic)



Term: Water Company Report

Definition: Reports submitted to water company (monthly summary, quarterly compliance, annual return).

Maps To:
- Entity: Document (generated)
- Table: documents (if stored), or export functionality

Context: System can format and export water company reports from tracked data.

Examples:
- "Monthly compliance report"
- "Quarterly return to water company"
- "Annual trade effluent return"

PLS Reference: Section C.2.8 (Water Company Report Formatting)



E.3 Module 3 Terms (MCPD/Generators)

Term: MCPD Registration

Definition: A registration document for Medium Combustion Plant Directive compliance. Primary document type for Module 3.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'MCPD_REGISTRATION', module_id (set by routing query: SELECT id FROM modules WHERE document_types @> '["MCPD_REGISTRATION"]'::JSONB)

Context: Used during document upload and module routing. LLM must identify this term to route document to appropriate module. Routing is dynamic: system queries modules table WHERE document_types @> '["MCPD_REGISTRATION"]'::JSONB to find matching module, then sets documents.module_id to the returned UUID. No hardcoded module_code checks.

Examples:
- "MCPD Registration"
- "Medium Combustion Plant Directive Registration"
- "MCPD Registration Number: MCPD/12345"

PLS Reference: Section C.3.1 (Supported Document Types - Module 3)



Term: Medium Combustion Plant Directive

Definition: EU/UK directive regulating emissions from medium combustion plants. Abbreviated as MCPD.

Maps To:
- Entity: Document
- Table: documents
- Field(s): document_type = 'MCPD_REGISTRATION', metadata.mcpd_type

Context: Used to identify MCPD-related documents and obligations.

Examples:
- "Medium Combustion Plant Directive"
- "MCPD Regulations"
- "MCP Directive compliance"

PLS Reference: Section C.3.1 (Supported Document Types - Module 3)



Term: Generator

Definition: A combustion plant or generator tracked under MCPD regulations.

Maps To:
- Entity: Generator
- Table: generators
- Field(s): generator_identifier, generator_type, capacity_mw, annual_run_hour_limit

Context: LLM extracts generator details from registration documents.

Examples:
- "Generator ID: GEN-001"
- "Standby generator"
- "Combustion plant"

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules)



Term: Run-Hour

Definition: Operating hours for a generator. Tracked against annual/monthly limits.

Maps To:
- Entity: RunHourRecord
- Table: run_hour_records
- Field(s): hours_recorded, running_total_year, running_total_month

Context: Users log run-hours manually, via CSV, or extracted from maintenance records.

Examples:
- "Run hours: 150"
- "Operating hours"
- "Generator run time"

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules)



Term: Annual Limit

Definition: Maximum run-hours allowed per year for a generator (typically 500 hours for MCPD).

Maps To:
- Entity: Generator
- Table: generators
- Field(s): annual_run_hour_limit

Context: LLM extracts annual limits from registration documents.

Examples:
- "Annual limit: 500 hours"
- "500 hours per year"
- "Annual operating hour limit"

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.3 (Limit Logic)



Term: Monthly Limit

Definition: Maximum run-hours allowed per month for a generator (if applicable).

Maps To:
- Entity: Generator
- Table: generators
- Field(s): monthly_run_hour_limit

Context: LLM extracts monthly limits if specified in registration.

Examples:
- "Monthly limit: 50 hours"
- "50 hours per month"
- "Monthly operating hour limit"

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.3 (Limit Logic)



Term: CHP (Combined Heat and Power)

Definition: Combined Heat and Power unit. A type of generator that may be subject to MCPD.

Maps To:
- Entity: Generator
- Table: generators
- Field(s): generator_type, metadata.chp_flag = true

Context: LLM identifies CHP units from registration documents.

Examples:
- "CHP unit"
- "Combined Heat and Power"
- "CHP generator"

PLS Reference: Section C.3.1 (Supported Document Types - Module 3)



Term: Stack Test

Definition: Stack emission testing for generators. Required periodically to verify compliance.

Maps To:
- Entity: StackTest
- Table: stack_tests
- Field(s): test_date, nox_result, so2_result, co_result, compliance_status

Context: Users enter stack test results. System schedules next test based on frequency.

Examples:
- "Stack test results"
- "Emission test"
- "Stack emission testing"

PLS Reference: Section C.3.6 (Stack Test Scheduling)



Term: AER (Annual Emissions Report)

Definition: Annual Emissions Report required for MCPD registrations. Submitted to EA.

Maps To:
- Entity: AERDocument
- Table: aer_documents
- Field(s): reporting_period_start, reporting_period_end, status, total_run_hours

Context: System auto-populates AER from tracked data. User reviews and exports for submission.

Examples:
- "Annual Emissions Report"
- "AER submission"
- "Annual return to EA"

PLS Reference: Section C.3.8 (Annual Return Logic)



Term: Fuel Consumption

Definition: Fuel consumption data for generators. Required for AER calculations.

Maps To:
- Entity: AERDocument
- Table: aer_documents
- Field(s): fuel_consumption_data (JSONB)

Context: Users enter fuel consumption data. Used in AER generation.

Examples:
- "Fuel consumption: 5000 litres"
- "Annual fuel usage"
- "Fuel consumption data"

PLS Reference: Section C.3.8 (Annual Return Logic)



Term: Emissions Calculation

Definition: Calculation of emissions from run-hours and emission rates. Used in AER.

Maps To:
- Entity: AERDocument
- Table: aer_documents
- Field(s): emissions_data (JSONB), total_run_hours

Context: System calculates emissions if run-hours and emission rates provided.

Examples:
- "Annual emissions calculation"
- "Emissions = Run Hours × Emission Rate"
- "Total annual emissions"

PLS Reference: Section C.3.7 (Emissions Logic), Section C.3.8 (Annual Return Logic)



E.4 General Terms

Term: Obligation

Definition: A discrete compliance requirement extracted from a document. Core entity for tracking compliance.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): All obligation fields

Context: LLM extracts obligations from documents. Each obligation represents one compliance requirement.

Examples:
- "Obligation to monitor pH weekly"
- "Compliance obligation"
- "Regulatory requirement"

PLS Reference: Section B.2 (Obligation Extraction Logic), Section B.7 (Core Entities - Obligation)



Term: Evidence

Definition: A file uploaded as proof of compliance. Can satisfy multiple obligations.

Maps To:
- Entity: EvidenceItem
- Table: evidence_items
- Field(s): file_name, file_type, storage_path, uploaded_by

Context: Users upload evidence files. Evidence is linked to obligations via join table.

Examples:
- "Upload evidence"
- "Compliance evidence"
- "Evidence file"

PLS Reference: Section H (Evidence Logic), Section B.10 (Core Entities - EvidenceItem)



Term: Schedule

Definition: Defines the timing pattern for recurring obligations. Generates deadlines.

Maps To:
- Entity: Schedule
- Table: schedules
- Field(s): frequency, base_date, next_due_date, is_rolling

Context: System auto-generates schedules from obligation frequencies. Users can modify.

Examples:
- "Monitoring schedule"
- "Weekly schedule"
- "Recurring schedule"

PLS Reference: Section B.7 (Monitoring Schedule Generation), Section B.8 (Core Entities - Schedule)



Term: Deadline

Definition: A specific instance of when an obligation is due. Tracks completion status.

Maps To:
- Entity: Deadline
- Table: deadlines
- Field(s): due_date, status, completed_at, completed_by

Context: System generates deadlines from schedules. Users mark deadlines complete.

Examples:
- "Deadline: 31 December 2024"
- "Due date"
- "Compliance deadline"

PLS Reference: Section B.3 (Deadline Calculation Rules), Section B.9 (Core Entities - Deadline)



Term: Audit Pack

Definition: A compiled PDF document containing compliance evidence for regulator inspection.

Maps To:
- Entity: AuditPack
- Table: audit_packs
- Field(s): pack_type, date_range_start, date_range_end, storage_path

Context: Users generate packs on-demand or scheduled (all 5 pack types). Contains obligations, evidence, and compliance status.

Examples:
- "Generate pack" (select pack type)
- "Generate Regulator Pack"
- "Generate Tender Pack"
- "Generate Board Pack"
- "Generate Insurer Pack"
- "Generate Audit Pack"
- "Compliance pack"
- "Inspector-ready pack"

PLS Reference: Section B.8 (Audit Pack Logic), Section H (Audit Pack Logic), Section B.12 (Core Entities - AuditPack)



Term: Compliance Status

Definition: The current status of an obligation (Complete, Pending, Due Soon, Overdue, Incomplete, Late Complete, Not Applicable).

Maps To:
- Entity: Obligation, Deadline (calculated)
- Table: obligations.status, deadlines.status
- Field(s): status (enum)

Context: System calculates compliance status from evidence and deadlines. Displayed in dashboards.

Examples:
- "Compliance status: Complete"
- "Status: Overdue"
- "Compliance: Pending"

PLS Reference: Section B.5.3 (Compliance Status Calculation)



Term: Subjective Obligation

Definition: An obligation containing language that requires human interpretation. System cannot determine compliance automatically.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): is_subjective = true, subjective_phrases

Context: LLM detects subjective phrases and flags obligation. User must provide interpretation notes.

Examples:
- "As appropriate measures"
- "Where necessary"
- "Reasonable steps"

PLS Reference: Section A.6 (Subjective Obligation Flags), Section E.3 (Subjective Language Detection)



Term: Objective Obligation

Definition: An obligation with clear, measurable requirements. System can track compliance automatically.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): is_subjective = false

Context: LLM classifies obligations as objective if no subjective phrases detected.

Examples:
- "Monitor pH weekly"
- "Submit report by 31 January"
- "Maintain records for 6 years"

PLS Reference: Section A.6 (Subjective Obligation Flags)



Term: Confidence Score

Definition: LLM's certainty in extraction accuracy (0-100%). Determines review requirements.

Maps To:
- Entity: Obligation
- Table: obligations
- Field(s): confidence_score (0.00-1.00), confidence_components (JSONB)

Context: LLM calculates confidence from pattern match, structure, semantic coherence, OCR quality.

Examples:
- "Confidence: 85%"
- "High confidence extraction"
- "Low confidence - review required"

PLS Reference: Section A.5 (Confidence Scoring Rules), Section E.2 (Confidence Scoring Methodology)



Term: Human Review

Definition: Items flagged for human verification during extraction or processing.

Maps To:
- Entity: ReviewQueueItem
- Table: review_queue_items
- Field(s): review_type, review_status, is_blocking

Context: System flags items for review based on confidence, subjective language, conflicts, etc.

Examples:
- "Requires human review"
- "Review queue"
- "Pending review"

PLS Reference: Section A.7 (Human Review Triggers), Section E.4 (Mandatory Human Review Nodes)


F. AI INTERPRETATION RULES

This section defines exact meanings for AI-related concepts used in document extraction, obligation parsing, and compliance tracking. These definitions ensure consistent interpretation across the system.

F.1 Subjective Obligation

Definition: An obligation containing language that requires human interpretation. The system cannot determine compliance automatically because the language lacks objective, measurable criteria.

Criteria: An obligation is classified as subjective if it contains one or more subjective phrases from the detection list, OR if it contains context-dependent phrases without qualifying criteria.

Detection Method:
1. Text normalised (lowercase, whitespace normalised)
2. Exact match check against subjective phrase list
3. Fuzzy match check against context-dependent patterns
4. If match found: `is_subjective = true`
5. Store matched phrases in `subjective_phrases` array

Always Flag Phrases (100% confidence):
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
- "reasonably practicable"

Context-Dependent Phrases (LLM evaluates context):
- "regularly" (flag if no frequency specified)
- "maintained" (flag if no criteria specified)
- "adequate" (flag if no standard referenced)
- "prevent" (flag if success criteria unclear)

Examples:
- Example 1: "The operator shall take appropriate measures to prevent odour" → Subjective (contains "appropriate measures" and "prevent" without success criteria)
- Example 2: "Monitor pH weekly" → Objective (clear frequency and parameter)
- Example 3: "Maintain records as appropriate" → Subjective (contains "as appropriate")

Maps To:
- Field: obligations.is_subjective (BOOLEAN)
- Field: obligations.subjective_phrases (TEXT[])
- Field: obligations.interpretation_notes (TEXT)
- Enum: N/A (boolean flag)

System Behavior:
- Obligation displayed with "Requires Interpretation" badge
- User MUST add interpretation notes before marking complete
- Interpretation notes stored and included in audit pack
- Flag cannot be removed by user (system-determined)
- System prompts: "How will you demonstrate compliance with this obligation?"

PLS Reference: Section A.6 (Subjective Obligation Flags), Section E.3 (Subjective Language Detection)



F.2 Objective Obligation

Definition: An obligation with clear, measurable requirements that the system can track automatically. Contains specific parameters, frequencies, deadlines, or quantifiable criteria.

Criteria: An obligation is classified as objective if:
1. No subjective phrases detected in text
2. Contains measurable parameters (dates, frequencies, quantities, limits)
3. Success criteria are clear and verifiable
4. Compliance can be determined by evidence presence and deadline status

Examples:
- Example 1: "Monitor pH weekly and record results" → Objective (clear frequency: weekly, clear parameter: pH, clear action: record)
- Example 2: "Submit annual return by 31 January each year" → Objective (clear deadline: 31 January, clear frequency: annual)
- Example 3: "Maintain noise levels below 45dB at boundary" → Objective (clear limit: 45dB, clear location: boundary)
- Example 4: "Keep records for 6 years" → Objective (clear duration: 6 years, clear action: keep records)

Maps To:
- Field: obligations.is_subjective = false (BOOLEAN)
- Field: obligations.frequency (TEXT enum)
- Field: obligations.deadline_date (DATE)
- Field: obligations.category (TEXT enum)

System Behavior:
- System can auto-generate schedules from frequency
- System can calculate deadlines automatically
- Compliance status determined by evidence and deadline
- No interpretation notes required

PLS Reference: Section A.6 (Subjective Obligation Flags)



F.3 Confidence Score

Definition: A numeric value (0.00-1.00) representing the LLM's certainty in extraction accuracy. Higher scores indicate higher confidence that the extracted data is correct.

Calculation Formula:
```
Confidence Score = (Pattern Match × 0.4) + (Structure × 0.3) + (Semantic × 0.2) + (OCR × 0.1)
```

Component Breakdown:
1. **Pattern Match Score (40% weight):** How closely text matches known patterns in rule library
   - Range: 0-100%
   - Calculation: % match against rule library patterns
   - Rule library matches have higher baseline (≥90% = 0.95 baseline)

2. **Structural Clarity (30% weight):** Document formatting quality assessment
   - Range: 0-100%
   - Factors: Headers, numbering, section structure, table formatting
   - Well-structured documents score higher

3. **Semantic Coherence (20% weight):** Internal consistency of extracted data
   - Range: 0-100%
   - Factors: Field values are consistent with each other, dates are logical, frequencies match patterns

4. **OCR Quality (10% weight):** OCR confidence if scanned PDF, or 100% for native PDF
   - Range: 0-100%
   - Native PDF: 100%
   - Scanned PDF: OCR confidence score (if <80%, flags document for review)

Examples:
- Example 1: Pattern match 95%, Structure 90%, Semantic 85%, OCR 100% → Confidence = (0.95×0.4) + (0.90×0.3) + (0.85×0.2) + (1.00×0.1) = 0.92 (92%)
- Example 2: Pattern match 60%, Structure 70%, Semantic 65%, OCR 75% → Confidence = (0.60×0.4) + (0.70×0.3) + (0.65×0.2) + (0.75×0.1) = 0.66 (66%)
- Example 3: Pattern match 50%, Structure 40%, Semantic 45%, OCR 60% → Confidence = (0.50×0.4) + (0.40×0.3) + (0.45×0.2) + (0.60×0.1) = 0.47 (47%)

Maps To:
- Field: obligations.confidence_score (DECIMAL(5,4), range 0.0000-1.0000)
- Field: obligations.confidence_components (JSONB) - stores component breakdown
- Field: extraction_logs.model_identifier (TEXT) - LLM model used
- Field: extraction_logs.rule_library_version (TEXT) - rule library version

Storage:
- Every extraction records confidence_score and confidence_components
- Components stored as JSON: {"pattern_match": 0.95, "structure": 0.90, "semantic": 0.85, "ocr": 1.00}

PLS Reference: Section A.5 (Confidence Scoring Rules), Section E.2 (Confidence Scoring Methodology)



F.4 High Confidence (≥85%)

Definition: Confidence score of 0.85 (85%) or higher. Indicates high certainty that extraction is accurate.

Threshold: confidence_score ≥ 0.85 (≥85%)

What It Means:
- LLM is highly certain extraction is correct
- Pattern matches are strong
- Document structure is clear
- Extracted data is internally consistent

What Happens:
- **Auto-accept:** Extraction automatically accepted
- **UI Treatment:** Extraction shown as "Confirmed" with green indicator
- **User Experience:** User can still edit if needed, but no blocking review required
- **Review Status:** review_status = 'CONFIRMED' (auto-confirmed)
- **Workflow:** Obligation moves directly to active obligations list
- **Review Queue:** Not added to review queue (unless other flags present)

Examples:
- Example 1: Confidence 0.92 (92%) → Auto-accepted, shown as "Confirmed", no review required
- Example 2: Confidence 0.87 (87%) → Auto-accepted, user can edit if desired
- Example 3: Confidence 0.85 (85%) → Auto-accepted (threshold boundary)

Edge Cases:
- If confidence ≥85% BUT subjective phrases detected → Still flagged for interpretation (non-blocking)
- If confidence ≥85% BUT date parsing failed → Still flagged for review (blocking)

Maps To:
- Field: obligations.confidence_score ≥ 0.85
- Field: obligations.review_status = 'CONFIRMED' (auto-set)
- Enum: confidence_level = 'HIGH' (calculated)

PLS Reference: Section A.5.2 (Confidence Thresholds), Section E.2.2 (Confidence Thresholds Application)



F.5 Medium Confidence (70-84%)

Definition: Confidence score between 0.70 (70%) and 0.84 (84%). Indicates moderate certainty with some uncertainty.

Threshold: 0.70 ≤ confidence_score < 0.85 (70-84%)

What It Means:
- LLM has moderate certainty but some uncertainty exists
- Pattern matches may be partial
- Document structure may have some issues
- Some extracted data may need verification

What Happens:
- **Flag for Review:** Extraction flagged for human review (non-blocking)
- **UI Treatment:** Yellow highlight with "Review recommended" label
- **User Experience:** User can proceed but review is recommended
- **Review Status:** review_status = 'PENDING' (flagged)
- **Workflow:** Obligation added to review queue with priority based on other factors
- **Review Queue:** Added to review queue, sorted by priority

Examples:
- Example 1: Confidence 0.78 (78%) → Flagged for review, yellow highlight, review recommended
- Example 2: Confidence 0.72 (72%) → Flagged for review, user can proceed but should verify
- Example 3: Confidence 0.84 (84%) → Flagged for review (threshold boundary)

User Actions:
- User can confirm extraction (review_status → 'CONFIRMED')
- User can edit extraction (review_status → 'EDITED')
- User can reject extraction (review_status → 'REJECTED')
- User can proceed without review (not recommended)

Maps To:
- Field: obligations.confidence_score (0.70-0.84)
- Field: obligations.review_status = 'PENDING'
- Field: review_queue_items.review_type = 'LOW_CONFIDENCE' (if <70% threshold)
- Enum: confidence_level = 'MEDIUM' (calculated)

PLS Reference: Section A.5.2 (Confidence Thresholds), Section E.2.2 (Confidence Thresholds Application)



F.6 Low Confidence (<70%)

Definition: Confidence score below 0.70 (70%). Indicates low certainty and high risk of extraction errors.

Threshold: confidence_score < 0.70 (<70%)

What It Means:
- LLM has low certainty in extraction accuracy
- Pattern matches are weak or non-existent
- Document structure may be poor
- Extracted data may be unreliable
- High risk of extraction errors

What Happens:
- **Require Review:** Extraction requires mandatory human review (blocking)
- **UI Treatment:** Red highlight with blocking indicator, cannot proceed without review
- **User Experience:** User MUST review before obligation can be activated
- **Review Status:** review_status = 'PENDING' (blocking)
- **Workflow:** Obligation blocked until human review completed
- **Review Queue:** Added to review queue with HIGH priority, is_blocking = true

Examples:
- Example 1: Confidence 0.65 (65%) → Blocking review required, red flag, cannot proceed
- Example 2: Confidence 0.45 (45%) → Blocking review required, high error risk
- Example 3: Confidence 0.69 (69%) → Blocking review required (threshold boundary)

User Actions:
- User MUST review before proceeding
- User can confirm extraction (review_status → 'CONFIRMED')
- User can edit extraction (review_status → 'EDITED')
- User can reject extraction (review_status → 'REJECTED')
- User cannot proceed without review action

Error Handling:
- If confidence all <50%: Flag document quality issue, prompt user to verify scan quality
- If confidence <70%: Default to requiring review, cannot auto-accept

Maps To:
- Field: obligations.confidence_score < 0.70
- Field: obligations.review_status = 'PENDING' (blocking)
- Field: review_queue_items.review_type = 'LOW_CONFIDENCE'
- Field: review_queue_items.is_blocking = true
- Enum: confidence_level = 'LOW' (calculated)

PLS Reference: Section A.5.2 (Confidence Thresholds), Section A.7.1 (Mandatory Human Review Scenarios), Section E.2.2 (Confidence Thresholds Application), Section E.4.1 (Review-Required Scenarios)



F.7 Human Review Required

Definition: Scenarios where human review is mandatory or recommended before an obligation can be activated or marked complete.

When Review is Required:

1. **Confidence Score <70%** (Blocking)
   - Reason: Uncertain extraction
   - UI Treatment: Red flag, blocking
   - Action: Cannot proceed without human confirmation

2. **Subjective Phrase Detected** (Non-blocking)
   - Reason: Requires interpretation
   - UI Treatment: Yellow badge, non-blocking
   - Action: User must add interpretation notes before marking complete

3. **No Rule Library Match** (Non-blocking)
   - Reason: Novel condition type
   - UI Treatment: Orange flag, review recommended
   - Action: Verify extraction accuracy for unknown patterns

4. **Date Parsing Failure** (Blocking)
   - Reason: Deadline uncertainty
   - UI Treatment: Red flag, blocking
   - Action: User must confirm or enter deadline date

5. **Conflicting Obligations Detected** (Non-blocking)
   - Reason: Logical inconsistency
   - UI Treatment: Orange flag, review recommended
   - Action: User must resolve conflict (choose one, keep both, or merge)

6. **OCR Quality <80%** (Blocking)
   - Reason: Document quality check
   - UI Treatment: Red flag, blocking
   - Action: Verify document scan quality, may need re-upload

7. **Potential Duplicate Detected** (Non-blocking)
   - Reason: Deduplication review
   - UI Treatment: Orange flag, review recommended
   - Action: User confirms if duplicate or keeps both

8. **Multi-Permit Same Site** (Information)
   - Reason: Potential overlap
   - UI Treatment: Information banner
   - Action: User reviews for overlapping obligations

Why Review is Required:
- Ensure extraction accuracy
- Verify subjective interpretations
- Confirm deadline dates
- Resolve conflicts and duplicates
- Validate document quality
- Maintain compliance integrity

What Triggers Review:
- System automatically flags items based on confidence, patterns, and validation rules
- Items added to Review Queue automatically
- Review Queue sorted by: Blocking status (blocking first), then document upload date

Review Workflow:
1. Items requiring review appear in "Review Queue" dashboard widget
2. User opens item, sees original text + extracted data side-by-side
3. User can: Confirm, Edit, or Reject extraction
4. Confirm/Edit: Item moves to active obligations
5. Reject: Item archived with status = 'REJECTED', rejection_reason required

Review Completion Tracking:
- reviewed_by: User ID
- reviewed_at: Timestamp
- review_action: enum (confirmed, edited, rejected)
- original_extraction: JSON snapshot of pre-review data
- review_notes: Optional text field

Maps To:
- Table: review_queue_items
- Field: review_queue_items.review_type (enum)
- Field: review_queue_items.is_blocking (BOOLEAN)
- Field: review_queue_items.review_status = 'PENDING'
- Field: obligations.review_status = 'PENDING'
- Enum: review_type (LOW_CONFIDENCE, SUBJECTIVE, NO_MATCH, DATE_FAILURE, DUPLICATE, OCR_QUALITY, CONFLICT)

PLS Reference: Section A.7 (Human Review Triggers), Section E.4 (Mandatory Human Review Nodes)


G. SUBJECTIVE WORDING PATTERNS

This section defines ALL phrases that trigger subjective obligation flagging. These patterns are used by the LLM to identify obligations requiring human interpretation.

G.1 Always Flag Phrases (100% Confidence)

These phrases ALWAYS trigger subjective flagging when detected in obligation text. No context evaluation is required.

Complete List:
1. "as appropriate"
2. "where necessary"
3. "where practicable"
4. "reasonable measures"
5. "adequate steps"
6. "as soon as practicable"
7. "to the satisfaction of"
8. "unless otherwise agreed"
9. "appropriate measures"
10. "suitable provision"
11. "best endeavours"
12. "reasonably practicable"

Detection Method:
- Exact match (case-insensitive, after text normalisation)
- Text normalised: lowercase, whitespace normalised
- Phrase must appear as complete phrase (not substring within larger word)

Examples:
- "Take appropriate measures" → Flags (contains "appropriate measures")
- "Where necessary, the operator shall..." → Flags (contains "where necessary")
- "As soon as practicable after the incident" → Flags (contains "as soon as practicable")
- "To the satisfaction of the regulator" → Flags (contains "to the satisfaction of")

Maps To:
- Field: obligations.is_subjective = true (BOOLEAN)
- Field: obligations.subjective_phrases (TEXT[]) - stores matched phrases
- Detection: Automatic during LLM extraction

PLS Reference: Section A.6.2 (Subjective Phrase Patterns), Section E.3.1 (Detection Methodology)



G.2 Context-Dependent Flag Phrases

These phrases trigger subjective flagging ONLY when specific qualifying criteria are missing. The LLM evaluates context to determine if flagging is required.

Complete List:
1. "regularly" (flag if no frequency specified)
2. "maintained" (flag if no criteria specified)
3. "adequate" (flag if no standard referenced)
4. "prevent" (flag if success criteria unclear)

Detection Method:
- Fuzzy match patterns (case-insensitive, after text normalisation)
- LLM evaluates context to determine if qualifying criteria present
- Flag only if qualifying criteria missing

Context Evaluation Rules:

1. "regularly" / "regular*"
   - Flag if: No specific frequency mentioned (daily, weekly, monthly, etc.)
   - Do NOT flag if: Frequency is specified ("regularly, at least weekly")
   - Example: "Monitor regularly" → Flags (no frequency)
   - Example: "Monitor regularly, at least monthly" → Does NOT flag (frequency specified)

2. "maintained" / "maintain*"
   - Flag if: No maintenance criteria specified (temperature, pressure, condition)
   - Do NOT flag if: Criteria specified ("maintained at 20°C", "maintained in good condition")
   - Example: "Equipment shall be maintained" → Flags (no criteria)
   - Example: "Equipment shall be maintained at operating temperature" → Does NOT flag (criteria specified)

3. "adequate" / "adequate*"
   - Flag if: No standard or reference specified
   - Do NOT flag if: Standard referenced ("adequate as per BS EN standard", "adequate for purpose")
   - Example: "Provide adequate ventilation" → Flags (no standard)
   - Example: "Provide adequate ventilation as per Building Regulations" → Does NOT flag (standard referenced)

4. "prevent" / "prevent*"
   - Flag if: Success criteria unclear (how to verify prevention)
   - Do NOT flag if: Success criteria specified ("prevent odour complaints", "prevent emissions exceeding limits")
   - Example: "Prevent pollution" → Flags (unclear success criteria)
   - Example: "Prevent odour complaints at boundary" → Does NOT flag (success criteria: no complaints)

Examples:
- "Monitor regularly" → Flags (no frequency specified)
- "Monitor regularly, at least weekly" → Does NOT flag (frequency specified)
- "Maintain equipment" → Flags (no criteria specified)
- "Maintain temperature at 20°C" → Does NOT flag (criteria: 20°C)
- "Provide adequate containment" → Flags (no standard referenced)
- "Provide adequate containment as per EA guidance" → Does NOT flag (standard referenced)
- "Prevent emissions" → Flags (success criteria unclear)
- "Prevent emissions exceeding 50 mg/m³" → Does NOT flag (success criteria: <50 mg/m³)

Maps To:
- Field: obligations.is_subjective = true (BOOLEAN) - if context evaluation determines flagging required
- Field: obligations.subjective_phrases (TEXT[]) - stores matched phrases with context note
- Detection: LLM context evaluation during extraction

PLS Reference: Section A.6.2 (Subjective Phrase Patterns), Section E.3.1 (Fuzzy Match Patterns)



G.3 Detection Methodology

Detection Workflow:
1. Text normalisation: Convert to lowercase, normalise whitespace
2. Exact match check: Check against Always Flag phrase list
3. Fuzzy match check: Check against Context-Dependent patterns
4. Context evaluation: For fuzzy matches, evaluate if qualifying criteria present
5. Flag setting: If match found (exact or context-dependent), set is_subjective = true
6. Phrase storage: Store matched phrases in subjective_phrases array

Text Normalisation Rules:
- Convert entire text to lowercase
- Normalise whitespace (multiple spaces → single space)
- Remove leading/trailing whitespace
- Preserve punctuation for phrase boundary detection

Phrase Matching Rules:
- Phrases matched as complete phrases (word boundaries respected)
- "as appropriate" matches "as appropriate" but not "appropriate measures" (different phrase)
- Case-insensitive matching
- Handles variations: "where necessary" matches "Where Necessary", "WHERE NECESSARY"

Storage Format:
- subjective_phrases: TEXT[] array
- Each matched phrase stored as separate array element
- Example: ["as appropriate", "where necessary"]
- Context-dependent flags include context note: ["regularly (no frequency)"]

Detection Timing:
- Performed during LLM extraction (Section B.2.3)
- Applied to each obligation text extracted
- Results stored immediately in obligation record

Maps To:
- Field: obligations.is_subjective (BOOLEAN)
- Field: obligations.subjective_phrases (TEXT[])
- Process: Document Ingestion Pipeline → Obligation Extraction → Subjective Detection

PLS Reference: Section E.3.2 (Detection Workflow), Section B.2.3 (LLM Extraction)



G.4 System Behavior for Subjective Obligations

When subjective phrases are detected:

1. Flag Setting:
   - obligations.is_subjective = true (system-determined, cannot be overridden)
   - Matched phrases stored in obligations.subjective_phrases array

2. UI Treatment:
   - Obligation displayed with "Requires Interpretation" badge (yellow/orange)
   - Badge is non-removable (system-determined flag)
   - Obligation text highlighted to draw attention

3. User Requirements:
   - User MUST add interpretation notes before marking obligation complete
   - System prompts: "How will you demonstrate compliance with this obligation?"
   - User must provide:
     * Evidence type that will demonstrate compliance
     * Interpretation rationale explaining how evidence satisfies obligation

4. Evidence Requirements:
   - Evidence can be linked as normal
   - Interpretation notes stored separately in obligations.interpretation_notes
   - Both evidence and interpretation included in audit pack

5. Audit Pack Inclusion:
   - Subjective obligations include:
     * Original obligation text
     * User's interpretation notes
     * Linked evidence
     * Rationale for evidence selection

6. Flag Persistence:
   - Flag cannot be removed by user (system-determined)
   - Flag persists even if user edits obligation text
   - Only system can change is_subjective flag (based on re-extraction)

Maps To:
- Field: obligations.is_subjective (BOOLEAN) - read-only for users
- Field: obligations.subjective_phrases (TEXT[]) - read-only for users
- Field: obligations.interpretation_notes (TEXT) - user-editable, required for completion
- UI: Badge display, interpretation prompt, completion blocking

PLS Reference: Section A.6.3 (Subjective Flag Workflow), Section A.6.4 (Subjective Obligation Evidence), Section B.11.1 (Manual Override Rules)



G.5 Examples of Subjective vs Objective Obligations

Subjective Obligations (Flagged):

Example 1:
- Text: "The operator shall take appropriate measures to prevent odour"
- Detected Phrases: ["appropriate measures", "prevent (no success criteria)"]
- Reason: Contains "appropriate measures" (always flag) and "prevent" without clear success criteria
- Interpretation Required: User must explain what measures will be taken and how odour prevention will be demonstrated

Example 2:
- Text: "Maintain equipment as appropriate"
- Detected Phrases: ["as appropriate"]
- Reason: Contains "as appropriate" (always flag)
- Interpretation Required: User must explain what "appropriate" maintenance means in this context

Example 3:
- Text: "Monitor regularly and record results"
- Detected Phrases: ["regularly (no frequency)"]
- Reason: Contains "regularly" without frequency specification
- Interpretation Required: User must specify monitoring frequency

Example 4:
- Text: "Provide adequate containment to the satisfaction of the regulator"
- Detected Phrases: ["adequate (no standard)", "to the satisfaction of"]
- Reason: Contains "adequate" without standard reference and "to the satisfaction of" (always flag)
- Interpretation Required: User must explain what "adequate" means and how regulator satisfaction will be demonstrated

Objective Obligations (Not Flagged):

Example 1:
- Text: "Monitor pH weekly and record results"
- Detected Phrases: None
- Reason: Clear frequency (weekly), clear parameter (pH), clear action (record)
- No Interpretation Required: System can track compliance automatically

Example 2:
- Text: "Submit annual return by 31 January each year"
- Detected Phrases: None
- Reason: Clear deadline (31 January), clear frequency (annual)
- No Interpretation Required: System can generate schedule and track deadline

Example 3:
- Text: "Maintain noise levels below 45dB at boundary"
- Detected Phrases: None
- Reason: Clear limit (45dB), clear location (boundary), measurable
- No Interpretation Required: System can track compliance with monitoring evidence

Example 4:
- Text: "Keep records for 6 years from date of creation"
- Detected Phrases: None
- Reason: Clear duration (6 years), clear start point (date of creation)
- No Interpretation Required: System can track record retention

Maps To:
- Field: obligations.is_subjective (BOOLEAN) - false for objective, true for subjective
- Field: obligations.interpretation_notes (TEXT) - required for subjective, optional for objective

PLS Reference: Section A.6 (Subjective Obligation Flags), Section F.1 (Subjective Obligation), Section F.2 (Objective Obligation)


H. COMPLIANCE OBLIGATION CATEGORIES

This section defines the five obligation categories used throughout the system. Category determines default evidence types, monitoring frequencies, and escalation logic.

H.1 Category: Monitoring

Definition: Measuring, sampling, testing activities. Obligations that require periodic measurement or testing of parameters, emissions, or environmental conditions.

Examples:
- pH testing
- Emissions monitoring
- Noise surveys
- Water quality sampling
- Air quality monitoring
- Temperature monitoring
- Flow rate measurements
- Stack testing (Module 3)
- Parameter sampling (Module 2)

Default Frequency: Daily/Weekly/Monthly (varies by parameter and permit requirements)

Default Evidence Types:
- Lab reports (PDF)
- Test certificates (PDF)
- Monitoring data (CSV exports)
- Photos (for visual monitoring)
- Calibration certificates (for monitoring equipment)

Category Assignment:
- LLM extracts category based on keywords: "monitor", "test", "sample", "measure", "survey"
- Confidence threshold: ≥85% for auto-assignment
- Default if uncertain: Record-Keeping (lowest consequence)

Maps To:
- Field: obligations.category = 'MONITORING' (enum: obligation_category)
- Used in: Obligation extraction, evidence suggestions, schedule generation

Escalation Logic:
- Monitoring obligations typically have regular deadlines
- Overdue monitoring may indicate compliance risk
- Escalation follows standard deadline escalation chain

PLS Reference: Section A.2.1 (Category Definitions), Section C.1.6 (Evidence Types for Module 1)



H.2 Category: Reporting

Definition: Submitting data/reports to regulators. Obligations that require periodic submission of data, reports, or notifications to regulatory bodies.

Examples:
- Annual returns
- Exceedance notifications
- AERs (Annual Emissions Reports - Module 3)
- Quarterly compliance reports
- Incident notifications
- Permit renewal applications
- Water company reports (Module 2)
- Stack test result submissions

Default Frequency: Annual/Quarterly/Event-triggered (varies by report type)

Default Evidence Types:
- Submission receipts (PDF)
- Report copies (PDF)
- Email confirmations (screenshots/PDFs)
- Portal submission confirmations
- Acknowledgment letters

Category Assignment:
- LLM extracts category based on keywords: "submit", "report", "notify", "return", "annual return"
- Confidence threshold: ≥85% for auto-assignment
- Default if uncertain: Record-Keeping

Maps To:
- Field: obligations.category = 'REPORTING' (enum: obligation_category)
- Used in: Obligation extraction, deadline calculation, submission tracking

Escalation Logic:
- Reporting obligations have fixed deadlines (often statutory)
- Missing reports may trigger regulatory action
- Escalation more urgent as deadline approaches
- Final escalation before submission deadline

PLS Reference: Section A.2.1 (Category Definitions), Section C.1.6 (Evidence Types for Module 1)



H.3 Category: Record-Keeping

Definition: Maintaining logs and documentation. Obligations that require keeping records, logs, or documentation for compliance purposes.

Examples:
- Waste transfer notes
- Maintenance logs
- Training records
- Operating logs
- Inspection records
- Calibration records
- Run-hour logs (Module 3)
- Lab result records (Module 2)

Default Frequency: Ongoing/As-generated (records created as activities occur)

Default Evidence Types:
- Register excerpts (PDF)
- Log sheets (PDF/Image)
- Database exports (CSV)
- Spreadsheet records (XLSX)
- Digital log screenshots

Category Assignment:
- LLM extracts category based on keywords: "keep", "maintain", "record", "log", "register", "document"
- Confidence threshold: ≥85% for auto-assignment
- Default if uncertain: Record-Keeping (safest default category)

Maps To:
- Field: obligations.category = 'RECORD_KEEPING' (enum: obligation_category)
- Used in: Obligation extraction, evidence linking, retention tracking

Escalation Logic:
- Record-keeping obligations typically ongoing (no fixed deadlines)
- Compliance based on evidence presence, not deadline completion
- Lower escalation priority than time-bound obligations
- May escalate if records missing during audit period

PLS Reference: Section A.2.1 (Category Definitions), Section A.2.2 (Category Assignment Rules), Section C.1.6 (Evidence Types for Module 1)



H.4 Category: Operational

Definition: Day-to-day operational requirements. Obligations that require ongoing operational practices, procedures, or activities during normal operations.

Examples:
- Operating hours compliance
- Material handling procedures
- Containment measures
- Waste storage practices
- Odour prevention measures
- Noise control measures
- Emergency procedures
- Training requirements

Default Frequency: Continuous/Ongoing (operational requirements are constant)

Default Evidence Types:
- Photos (operational compliance)
- Inspection checklists (PDF)
- Procedure documents (PDF)
- Training certificates
- Operational logs
- Site inspection reports

Category Assignment:
- LLM extracts category based on keywords: "operate", "operational", "procedure", "practice", "during operations", "containment", "handling"
- Confidence threshold: ≥85% for auto-assignment
- Default if uncertain: Record-Keeping

Maps To:
- Field: obligations.category = 'OPERATIONAL' (enum: obligation_category)
- Used in: Obligation extraction, evidence suggestions, compliance tracking

Escalation Logic:
- Operational obligations are continuous (no fixed deadlines)
- Compliance based on evidence of ongoing practices
- May have improvement conditions with deadlines (high priority)
- Escalation typically lower priority unless improvement condition

Special Cases:
- Improvement conditions are typically Operational category with high priority flag
- Improvement conditions have fixed deadlines (one-time schedule)

PLS Reference: Section A.2.1 (Category Definitions), Section C.1.3 (Improvement Condition Logic), Section C.1.6 (Evidence Types for Module 1)



H.5 Category: Maintenance

Definition: Equipment servicing and upkeep. Obligations that require periodic maintenance, servicing, calibration, or repair of equipment or systems.

Examples:
- Stack testing (Module 3)
- Equipment calibration
- Repair records
- Service records
- Maintenance schedules
- Equipment inspections
- Calibration certificates
- Generator maintenance (Module 3)

Default Frequency: Annual/6-monthly/Scheduled (varies by equipment and permit requirements)

Default Evidence Types:
- Service records (PDF)
- Calibration certificates (PDF)
- Work orders (PDF)
- Maintenance logs (PDF)
- Inspection reports (PDF)
- Repair invoices (PDF)

Category Assignment:
- LLM extracts category based on keywords: "maintain", "maintenance", "service", "calibrate", "repair", "inspect equipment", "stack test"
- Confidence threshold: ≥85% for auto-assignment
- Default if uncertain: Record-Keeping

Maps To:
- Field: obligations.category = 'MAINTENANCE' (enum: obligation_category)
- Used in: Obligation extraction, schedule generation, maintenance tracking

Escalation Logic:
- Maintenance obligations have scheduled deadlines
- Overdue maintenance may impact operations or compliance
- Escalation follows standard deadline escalation chain
- May have higher priority if equipment critical to compliance

Special Cases:
- Stack tests (Module 3) are Maintenance category
- Calibration requirements are Maintenance category
- Maintenance records can link to run-hour records (Module 3)

PLS Reference: Section A.2.1 (Category Definitions), Section C.1.6 (Evidence Types for Module 1), Section C.3.5 (Maintenance Logic), Section C.3.6 (Stack Test Scheduling)



H.6 Category Assignment Rules

General Rules:
1. LLM extracts category based on obligation text during parsing
2. Confidence threshold: ≥85% for auto-assignment; <85% flags for human review
3. Human override: Users can change category at any time; override is logged
4. Default if uncertain: Record-Keeping (lowest consequence for miscategorisation)

Assignment Process:
1. LLM analyzes obligation text for category keywords
2. LLM assigns category with confidence score
3. If confidence ≥85%: Auto-assigned, user can still edit
4. If confidence <85%: Flagged for review, user must confirm or change
5. User can override category at any time (logged in audit trail)

Category Impact:
- Determines default evidence types suggested to user
- Influences default frequency if not specified in text
- Affects escalation logic and priority
- Used in audit pack organization
- Used in dashboard filtering and reporting

Maps To:
- Field: obligations.category (enum: obligation_category)
- Field: obligations.confidence_score (affects auto-assignment)
- Field: obligations.review_status (if confidence <85%, flagged for review)
- Process: Obligation Extraction → Category Assignment → Review (if needed)

PLS Reference: Section A.2.2 (Category Assignment Rules)


I. RELATIONSHIP DEFINITIONS

This section defines ALL relationships between entities in the system. Each relationship specifies type, foreign keys, cardinality, cascade rules, and business logic.

I.1 Core Hierarchy Relationships

Relationship: Company → Site

Type: One-to-Many

Foreign Key: sites.company_id → companies.id

Cardinality: One Company has Many Sites (0 to N sites per company)

Cascade Rules: ON DELETE CASCADE (if company deleted, all sites deleted)

Business Logic:
- Sites belong to exactly one company
- Sites cannot exist without a company
- Multi-site companies are supported
- Site deletion cascades to all related data (documents, obligations, evidence)

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section B.9 (Cross-Site Logic)

Maps To:
- Table: sites.company_id (FOREIGN KEY)
- Table: companies.id (PRIMARY KEY)



Relationship: Site → Document (Primary)

Type: One-to-Many

Foreign Key: documents.site_id → sites.id

Cardinality: One Site has Many Documents (0 to N documents per site as primary site)

Relationship: Document ↔ Site (Many-to-Many for Multi-Site Shared Permits)

Type: Many-to-Many

Join Table: document_site_assignments

Foreign Keys:
- document_site_assignments.document_id → documents.id
- document_site_assignments.site_id → sites.id

Cardinality: One Document can be linked to Many Sites; One Site can have Many Documents (via join table)

Cascade Rules: ON DELETE CASCADE (if document or site deleted, assignments deleted)

Business Logic:
- Allows one document (permit/consent/registration) to cover multiple sites
- Primary site stored in documents.site_id; additional sites in document_site_assignments
- User selects "Multiple sites" during upload and chooses which sites
- Obligations can be shared across sites or replicated per site (user choice via obligations_shared flag)
- Evidence can be linked site-specifically or across all linked sites (controlled exception to cross-site prohibition)

PLS Reference: Section J.5 (Multi-Site Shared Permits)

Maps To:
- Table: document_site_assignments (join table)
- Table: document_site_assignments.document_id (FOREIGN KEY)
- Table: document_site_assignments.site_id (FOREIGN KEY)

Cascade Rules: ON DELETE CASCADE (if site deleted, all documents deleted)

Business Logic:
- Documents have a primary site (via site_id, required)
- Documents can be linked to additional sites via document_site_assignments (for multi-site shared permits)
- Documents cannot exist without at least one site
- Multiple documents per site supported (multiple permits, consents, registrations)
- Document deletion cascades to obligations and document_site_assignments

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section A.4.1 (Document → Obligation Relationship), Section J.5 (Multi-Site Shared Permits)

Maps To:
- Table: documents.site_id (FOREIGN KEY) - primary site
- Table: sites.id (PRIMARY KEY)
- Table: document_site_assignments (join table for additional sites)



Relationship: Document → Obligation

Type: One-to-Many

Foreign Key: obligations.document_id → documents.id

Cardinality: One Document has Many Obligations (1 to N obligations per document, typically 50-200)

Cascade Rules: ON DELETE CASCADE (if document deleted, obligations archived with reason "source_document_removed")

Business Logic:
- Every obligation MUST link to exactly one document (no orphan obligations)
- One document generates multiple obligations
- If document deleted, obligations archived (not deleted) with archived_reason = "source_document_removed"
- Obligations cannot exist without a document

PLS Reference: Section A.4.1 (Document → Obligation Relationship)

Maps To:
- Table: obligations.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: Obligation → Schedule

Type: One-to-One or One-to-Many

Foreign Key: schedules.obligation_id → obligations.id

Cardinality: One Obligation has One or Many Schedules (most have one, complex obligations may have multiple)

Cascade Rules: ON DELETE CASCADE (if obligation deleted, schedules deleted)

Business Logic:
- Most obligations have one schedule
- Complex obligations may have multiple schedules (e.g., monthly sampling + annual reporting)
- Schedule auto-generated when obligation frequency is set
- Users can override auto-generated schedules (logged)
- Schedule inheritance: schedule inherits frequency from obligation

PLS Reference: Section A.4.3 (Obligation → Schedule Relationship), Section B.7 (Monitoring Schedule Generation)

Maps To:
- Table: schedules.obligation_id (FOREIGN KEY)
- Table: obligations.id (PRIMARY KEY)



Relationship: Schedule → Deadline

Type: One-to-Many

Foreign Key: deadlines.schedule_id → schedules.id

Cardinality: One Schedule generates Many Deadlines (recurring deadlines over time)

Cascade Rules: ON DELETE CASCADE (if schedule deleted, deadlines deleted)

Business Logic:
- Each schedule instance creates deadline records
- Deadlines calculated from schedule frequency and base date
- Deadlines generated on rolling basis as schedule progresses
- Deadline completion: marked complete when evidence linked OR user marks complete manually

PLS Reference: Section A.4.4 (Schedule → Deadline Relationship), Section B.3 (Deadline Calculation Rules)

Maps To:
- Table: deadlines.schedule_id (FOREIGN KEY)
- Table: schedules.id (PRIMARY KEY)
- Table: deadlines.obligation_id (FOREIGN KEY) - also links to obligation directly



Relationship: Obligation → Deadline

Type: One-to-Many (direct relationship)

Foreign Key: deadlines.obligation_id → obligations.id

Cardinality: One Obligation has Many Deadlines (through schedule or direct)

Cascade Rules: ON DELETE CASCADE (if obligation deleted, deadlines deleted)

Business Logic:
- Deadlines also link directly to obligations (in addition to schedule link)
- Allows querying deadlines by obligation
- One-time obligations may have direct deadline without schedule

PLS Reference: Section A.4.4 (Schedule → Deadline Relationship)

Maps To:
- Table: deadlines.obligation_id (FOREIGN KEY)
- Table: obligations.id (PRIMARY KEY)



I.2 Evidence Relationships

Relationship: Site → EvidenceItem

Type: One-to-Many

Foreign Key: evidence_items.site_id → sites.id

Cardinality: One Site has Many EvidenceItems (0 to N evidence items per site)

Cascade Rules: ON DELETE CASCADE (if site deleted, evidence items deleted)

Business Logic:
- Evidence items belong to exactly one site
- Evidence cannot exist without a site
- Evidence is site-specific (cannot link to obligations on different sites)
- **Exception:** For multi-site shared permits (documents linked to multiple sites via document_site_assignments), evidence can be linked to obligations across all sites linked to the same document
- Evidence files stored centrally but linked per-site

PLS Reference: Section B.9.3 (Cross-Site Prohibitions), Section J.5 (Multi-Site Shared Permits), Section H (Evidence Logic)

Maps To:
- Table: evidence_items.site_id (FOREIGN KEY)
- Table: sites.id (PRIMARY KEY)



Relationship: Obligation ↔ EvidenceItem (Many-to-Many)

Type: Many-to-Many

Join Table: obligation_evidence_links

Foreign Keys:
- obligation_evidence_links.obligation_id → obligations.id
- obligation_evidence_links.evidence_id → evidence_items.id

Cardinality: One Obligation can have Many EvidenceItems; One EvidenceItem can satisfy Many Obligations

Cascade Rules:
- ON DELETE CASCADE for both foreign keys (if obligation or evidence deleted, links deleted)

Business Logic:
- One obligation can have multiple evidence items
- One evidence item can satisfy multiple obligations
- Evidence linking at obligation level (not document level)
- Evidence can be unlinked by user (soft delete via unlinked_at)
- Linking requires: evidence exists, obligation exists and not archived, evidence upload date ≤ current date
- Cross-site linking prohibited (evidence and obligation must be on same site)
- **Exception:** For multi-site shared permits, evidence can be linked to obligations on any site linked to the same document (via document_site_assignments)

PLS Reference: Section A.4.2 (Obligation → Evidence Relationship), Section B.4 (Evidence Linking Logic)

Maps To:
- Table: obligation_evidence_links (join table)
- Table: obligation_evidence_links.obligation_id (FOREIGN KEY)
- Table: obligation_evidence_links.evidence_id (FOREIGN KEY)



Relationship: User → EvidenceItem

Type: One-to-Many

Foreign Key: evidence_items.uploaded_by → users.id

Cardinality: One User can upload Many EvidenceItems

Cascade Rules: ON DELETE SET NULL (if user deleted, uploaded_by set to NULL)

Business Logic:
- Tracks who uploaded each evidence item
- Used for audit trail
- User deletion does not delete evidence (preserves audit trail)

PLS Reference: Section H.1 (Evidence Capture Logic)

Maps To:
- Table: evidence_items.uploaded_by (FOREIGN KEY)
- Table: users.id (PRIMARY KEY)



I.3 User and Role Relationships

Relationship: Company → User

Type: One-to-Many

Foreign Key: users.company_id → companies.id

Cardinality: One Company has Many Users (1 to N users per company)

Cascade Rules: ON DELETE CASCADE (if company deleted, users deleted)

Business Logic:
- Users belong to exactly one company
- Users cannot exist without a company
- Multi-user companies supported
- User deletion cascades to user-specific data

PLS Reference: Section B.10 (User Roles Logic)

Maps To:
- Table: users.company_id (FOREIGN KEY)
- Table: companies.id (PRIMARY KEY)



Relationship: User ↔ Role (Many-to-Many)

Type: Many-to-Many

Join Table: user_roles

Foreign Keys:
- user_roles.user_id → users.id
- user_roles.role (enum, not foreign key)

Cardinality: One User can have Many Roles; One Role can be assigned to Many Users

Cascade Rules:
- ON DELETE CASCADE for user_id (if user deleted, role assignments deleted)

Business Logic:
- Users can have multiple roles
- Roles: Owner, Admin, Staff, Viewer, Consultant
- Unique constraint: (user_id, role) prevents duplicate role assignments
- Owner role automatically assigned to account creator
- Role changes logged

PLS Reference: Section B.10 (User Roles Logic), Section B.10.3 (Role Assignment)

Maps To:
- Table: user_roles (join table)
- Table: user_roles.user_id (FOREIGN KEY)
- Field: user_roles.role (enum: user_role)



Relationship: User ↔ Site (Many-to-Many)

Type: Many-to-Many

Join Table: user_site_assignments

Foreign Keys:
- user_site_assignments.user_id → users.id
- user_site_assignments.site_id → sites.id

Cardinality: One User can be assigned to Many Sites; One Site can have Many Users assigned

Cascade Rules:
- ON DELETE CASCADE for both foreign keys (if user or site deleted, assignments deleted)

Business Logic:
- Users can be assigned to one or multiple sites
- Site access controlled by assignments
- Unique constraint: (user_id, site_id) prevents duplicate assignments
- Users can only access sites they are assigned to (RLS)

PLS Reference: Section B.9 (Cross-Site Logic), Section B.10 (User Roles Logic)

Maps To:
- Table: user_site_assignments (join table)
- Table: user_site_assignments.user_id (FOREIGN KEY)
- Table: user_site_assignments.site_id (FOREIGN KEY)



I.4 Document Version Relationships

Relationship: Document → DocumentVersion

Type: One-to-Many

Foreign Key: documents.parent_document_id → documents.id (self-referential)

Cardinality: One Document has Many DocumentVersions (variations, renewals, corrections)

Cascade Rules: ON DELETE SET NULL (if parent deleted, version link removed but version retained)

Business Logic:
- Documents can have multiple versions (variations, renewals, corrections)
- Version numbering: major.minor.patch (e.g., 1.0, 1.1, 2.0)
- Parent document links to previous version
- Version states: Active, Superseded, Expired, Draft
- Obligation migration when document superseded

PLS Reference: Section A.8 (Versioning Logic), Section A.8.3 (Obligation Version Migration)

Maps To:
- Table: documents.parent_document_id (FOREIGN KEY, self-referential)
- Table: documents.id (PRIMARY KEY)



I.5 Audit Pack Relationships

Relationship: Document → AuditPack

Type: One-to-Many

Foreign Key: audit_packs.document_id → documents.id

Cardinality: One Document has Many AuditPacks (multiple packs can be generated over time)

Cascade Rules: ON DELETE CASCADE (if document deleted, audit packs deleted)

Business Logic:
- Multiple audit packs can be generated for same document
- Packs generated on-demand or scheduled
- Each pack covers specific date range
- Pack content frozen at generation time

PLS Reference: Section B.8 (Audit Pack Logic), Section H (Audit Pack Logic)

Maps To:
- Table: audit_packs.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: Site → AuditPack

Type: One-to-Many

Foreign Key: audit_packs.site_id → sites.id

Cardinality: One Site has Many AuditPacks

Cascade Rules: ON DELETE CASCADE (if site deleted, audit packs deleted)

Business Logic:
- Audit packs are site-specific
- Cross-site audit packs not supported

PLS Reference: Section B.8 (Audit Pack Logic)

Maps To:
- Table: audit_packs.site_id (FOREIGN KEY)
- Table: sites.id (PRIMARY KEY)



Relationship: User → AuditPack

Type: One-to-Many

Foreign Key: audit_packs.generated_by → users.id

Cardinality: One User can generate Many AuditPacks

Cascade Rules: ON DELETE SET NULL (if user deleted, generated_by set to NULL)

Business Logic:
- Tracks who generated each audit pack
- Used for audit trail

PLS Reference: Section B.8 (Audit Pack Logic)

Maps To:
- Table: audit_packs.generated_by (FOREIGN KEY)
- Table: users.id (PRIMARY KEY)



I.6 Module 2 Relationships (Trade Effluent)

Relationship: Document → Parameter

Type: One-to-Many

Foreign Key: parameters.document_id → documents.id

Cardinality: One Consent Document has Many Parameters (typically 5-15 parameters)

Cascade Rules: ON DELETE CASCADE (if document deleted, parameters deleted)

Business Logic:
- Parameters extracted from consent documents
- Each parameter has limits, units, sampling frequency
- Parameters specific to Module 2 (Trade Effluent)

PLS Reference: Section C.2.2 (Parameter Extraction Rules)

Maps To:
- Table: parameters.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: Parameter → LabResult

Type: One-to-Many

Foreign Key: lab_results.parameter_id → parameters.id

Cardinality: One Parameter has Many LabResults (samples over time)

Cascade Rules: ON DELETE CASCADE (if parameter deleted, lab results deleted)

Business Logic:
- Lab results track parameter values over time
- Results entered manually, via CSV, or extracted from PDF
- Used for exceedance detection and trending

PLS Reference: Section C.2.7 (Lab Result Ingestion Logic)

Maps To:
- Table: lab_results.parameter_id (FOREIGN KEY)
- Table: parameters.id (PRIMARY KEY)



Relationship: Parameter → Exceedance

Type: One-to-Many

Foreign Key: exceedances.parameter_id → parameters.id

Cardinality: One Parameter has Many Exceedances (when limits exceeded)

Cascade Rules: ON DELETE CASCADE (if parameter deleted, exceedances deleted)

Business Logic:
- Exceedances created when lab results exceed parameter limits
- Exceedances tracked until resolved/closed
- Status: Open, Resolved, Closed

PLS Reference: Section C.2.4 (Exceedance Detection Logic)

Maps To:
- Table: exceedances.parameter_id (FOREIGN KEY)
- Table: parameters.id (PRIMARY KEY)



Relationship: LabResult → Exceedance

Type: One-to-One

Foreign Key: exceedances.lab_result_id → lab_results.id

Cardinality: One LabResult may trigger One Exceedance (if exceeds limit)

Cascade Rules: ON DELETE CASCADE (if lab result deleted, exceedance deleted)

Business Logic:
- Exceedance linked to specific lab result that triggered it
- Not all lab results trigger exceedances (only those exceeding limits)

PLS Reference: Section C.2.4 (Exceedance Detection Logic)

Maps To:
- Table: exceedances.lab_result_id (FOREIGN KEY)
- Table: lab_results.id (PRIMARY KEY)



I.7 Module 3 Relationships (MCPD/Generators)

Relationship: Document → Generator

Type: One-to-Many

Foreign Key: generators.document_id → documents.id

Cardinality: One MCPD Registration has Many Generators (typically 1-10 generators)

Cascade Rules: ON DELETE CASCADE (if document deleted, generators deleted)

Business Logic:
- Generators extracted from MCPD registration documents
- Each generator has type, capacity, run-hour limits
- Generators specific to Module 3

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules)

Maps To:
- Table: generators.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: Generator → RunHourRecord

Type: One-to-Many

Foreign Key: run_hour_records.generator_id → generators.id

Cardinality: One Generator has Many RunHourRecords (entries over time)

Cascade Rules: ON DELETE CASCADE (if generator deleted, run-hour records deleted)

Business Logic:
- Run-hour records track operating hours over time
- Records entered manually, via CSV, or from maintenance records
- Running totals calculated for annual/monthly limits

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.3 (Limit Logic)

Maps To:
- Table: run_hour_records.generator_id (FOREIGN KEY)
- Table: generators.id (PRIMARY KEY)



Relationship: Generator → StackTest

Type: One-to-Many

Foreign Key: stack_tests.generator_id → generators.id

Cardinality: One Generator has Many StackTests (periodic testing)

Cascade Rules: ON DELETE CASCADE (if generator deleted, stack tests deleted)

Business Logic:
- Stack tests required periodically for generators
- Test results include emissions data (NOx, SO2, CO, particulates)
- Next test due date tracked

PLS Reference: Section C.3.6 (Stack Test Scheduling)

Maps To:
- Table: stack_tests.generator_id (FOREIGN KEY)
- Table: generators.id (PRIMARY KEY)



Relationship: Generator → MaintenanceRecord

Type: One-to-Many

Foreign Key: maintenance_records.generator_id → generators.id

Cardinality: One Generator has Many MaintenanceRecords (service history)

Cascade Rules: ON DELETE CASCADE (if generator deleted, maintenance records deleted)

Business Logic:
- Maintenance records track service and repair history
- Records can include run-hours (links to run_hour_records)
- Next service due date tracked

PLS Reference: Section C.3.5 (Maintenance Logic)

Maps To:
- Table: maintenance_records.generator_id (FOREIGN KEY)
- Table: generators.id (PRIMARY KEY)



Relationship: MaintenanceRecord → RunHourRecord

Type: One-to-One (optional)

Foreign Key: run_hour_records.source_maintenance_record_id → maintenance_records.id

Cardinality: One MaintenanceRecord may generate One RunHourRecord (if run-hours included)

Cascade Rules: ON DELETE SET NULL (if maintenance record deleted, link removed)

Business Logic:
- Run-hours can be extracted from maintenance records
- Optional relationship (not all maintenance records include run-hours)
- Allows linking run-hour entries to maintenance events

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules)

Maps To:
- Table: run_hour_records.source_maintenance_record_id (FOREIGN KEY)
- Table: maintenance_records.id (PRIMARY KEY)



Relationship: Document → AERDocument

Type: One-to-Many

Foreign Key: aer_documents.document_id → documents.id

Cardinality: One MCPD Registration has Many AERDocuments (annual reports over years)

Cascade Rules: ON DELETE CASCADE (if document deleted, AER documents deleted)

Business Logic:
- AER documents generated annually for MCPD registrations
- Each AER covers one reporting period
- Historical AERs retained for 6+ years

PLS Reference: Section C.3.8 (Annual Return Logic)

Maps To:
- Table: aer_documents.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



I.8 System Configuration Relationships

Relationship: Company → ModuleActivation

Type: One-to-Many

Foreign Key: module_activations.company_id → companies.id

Cardinality: One Company has Many ModuleActivations (one per module, potentially per site)

Cascade Rules: ON DELETE CASCADE (if company deleted, module activations deleted)

Business Logic:
- Tracks which modules are active for company/site
- Prerequisites enforced via modules.requires_module_id (queried dynamically)
- Unique constraint: (company_id, site_id, module_id) WHERE status = 'ACTIVE'

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites)

Maps To:
- Table: module_activations.company_id (FOREIGN KEY)
- Table: companies.id (PRIMARY KEY)



Relationship: Site → ModuleActivation

Type: One-to-Many (optional)

Foreign Key: module_activations.site_id → sites.id

Cardinality: One Site may have Many ModuleActivations (one per module)

Cascade Rules: ON DELETE CASCADE (if site deleted, module activations deleted)

Business Logic:
- Module activations can be company-wide (site_id NULL) or site-specific
- Module 2 is site-specific, Module 3 is company-wide

PLS Reference: Section A.1.3 (Module Activation Rules)

Maps To:
- Table: module_activations.site_id (FOREIGN KEY, nullable)
- Table: sites.id (PRIMARY KEY)



Relationship: Company → CrossSellTrigger

Type: One-to-Many

Foreign Key: cross_sell_triggers.company_id → companies.id

Cardinality: One Company has Many CrossSellTriggers (multiple opportunities over time)

Cascade Rules: ON DELETE CASCADE (if company deleted, triggers deleted)

Business Logic:
- Tracks cross-sell opportunities detected
- Triggers can be keyword-based, external, or user-requested
- Status: Pending, Dismissed, Converted

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)

Maps To:
- Table: cross_sell_triggers.company_id (FOREIGN KEY)
- Table: companies.id (PRIMARY KEY)



Relationship: Document → CrossSellTrigger

Type: One-to-Many (optional)

Foreign Key: cross_sell_triggers.document_id → documents.id

Cardinality: One Document may trigger Many CrossSellTriggers (if multiple keywords detected)

Cascade Rules: ON DELETE SET NULL (if document deleted, trigger link removed)

Business Logic:
- Keyword triggers link to source document
- External triggers may not have document link

PLS Reference: Section D.2 (Cross-Sell Trigger Detection)

Maps To:
- Table: cross_sell_triggers.document_id (FOREIGN KEY, nullable)
- Table: documents.id (PRIMARY KEY)



I.9 Notification and Escalation Relationships

Relationship: User → Notification

Type: One-to-Many

Foreign Key: notifications.user_id → users.id

Cardinality: One User receives Many Notifications

Cascade Rules: ON DELETE CASCADE (if user deleted, notifications deleted)

Business Logic:
- Notifications sent to users for alerts, deadlines, escalations
- Multiple channels: Email, SMS, In-app
- Notifications tracked for delivery and read status

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic)

Maps To:
- Table: notifications.user_id (FOREIGN KEY)
- Table: users.id (PRIMARY KEY)



Relationship: Obligation → Escalation

Type: One-to-One

Foreign Key: escalations.obligation_id → obligations.id

Cardinality: One Obligation has One Escalation (at a time)

Cascade Rules: ON DELETE CASCADE (if obligation deleted, escalation deleted)

Business Logic:
- Escalations track overdue items through escalation chain
- Current escalation level tracked (1-4)
- Escalation resolved when obligation completed

PLS Reference: Section F.4 (Escalation Logic)

Maps To:
- Table: escalations.obligation_id (FOREIGN KEY)
- Table: obligations.id (PRIMARY KEY)



Relationship: User → Escalation

Type: One-to-Many

Foreign Key: escalations.escalated_to → users.id

Cardinality: One User can receive Many Escalations

Cascade Rules: ON DELETE CASCADE (if user deleted, escalations deleted)

Business Logic:
- Tracks who escalation is escalated to
- Escalation chain: Assigned User → Site Manager → Company Admin → All Admins

PLS Reference: Section F.4 (Escalation Logic)

Maps To:
- Table: escalations.escalated_to (FOREIGN KEY)
- Table: users.id (PRIMARY KEY)



I.10 Review and Logging Relationships

Relationship: Document → ReviewQueueItem

Type: One-to-Many

Foreign Key: review_queue_items.document_id → documents.id

Cardinality: One Document has Many ReviewQueueItems (multiple items may need review)

Cascade Rules: ON DELETE CASCADE (if document deleted, review items deleted)

Business Logic:
- Review items flagged during extraction
- Multiple review types: low_confidence, subjective, no_match, date_failure, duplicate, ocr_quality, conflict
- Items sorted by blocking status and priority

PLS Reference: Section A.7 (Human Review Triggers), Section E.4 (Mandatory Human Review Nodes)

Maps To:
- Table: review_queue_items.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: Obligation → ReviewQueueItem

Type: One-to-One (optional)

Foreign Key: review_queue_items.obligation_id → obligations.id

Cardinality: One Obligation may have One ReviewQueueItem (if flagged)

Cascade Rules: ON DELETE SET NULL (if obligation deleted, review item link removed)

Business Logic:
- Review items can be document-level or obligation-level
- Obligation-level reviews are more specific

PLS Reference: Section A.7 (Human Review Triggers)

Maps To:
- Table: review_queue_items.obligation_id (FOREIGN KEY, nullable)
- Table: obligations.id (PRIMARY KEY)



Relationship: Document → ExtractionLog

Type: One-to-Many

Foreign Key: extraction_logs.document_id → documents.id

Cardinality: One Document has Many ExtractionLogs (one per extraction run)

Cascade Rules: ON DELETE CASCADE (if document deleted, extraction logs deleted)

Business Logic:
- Logs AI extraction processing for debugging and improvement
- Each extraction run creates one log entry
- Tracks: model used, rule library version, processing time, errors

PLS Reference: Section E.7 (Logging and Validation)

Maps To:
- Table: extraction_logs.document_id (FOREIGN KEY)
- Table: documents.id (PRIMARY KEY)



Relationship: User → AuditLog

Type: One-to-Many

Foreign Key: audit_logs.user_id → users.id

Cardinality: One User performs Many AuditLogEntries

Cascade Rules: ON DELETE SET NULL (if user deleted, user_id set to NULL)

Business Logic:
- Immutable log of all user actions and system changes
- Tracks: action type, entity type, previous/new values, IP address
- User deletion does not delete audit logs (preserves audit trail)

PLS Reference: Section A.1.1 (Audit Trail Completeness)

Maps To:
- Table: audit_logs.user_id (FOREIGN KEY, nullable)
- Table: users.id (PRIMARY KEY)


J. MODULE-SPECIFIC DEFINITIONS

This section defines module-specific entities, tables, fields, enums, and terms for each module. The 80/20 architecture means 80% of logic is shared (core compliance engine), while 20% is module-specific rule libraries.

J.1 Module 1 — Environmental Permits

J.1.1 Module Overview

Purpose: Manage compliance with Environmental Permits issued by EA, SEPA, NRW, or NIEA.

Prerequisites: None (default module, active on signup)

Billing: £149/month per site (base price, includes 1 permit)

Activation: Automatic on signup

J.1.2 Supported Document Types

Document Types:
- Part A Permit (EA, England)
- Part B Permit (EA or Local Authority, England)
- Waste Management Licence / WML (EA, England)
- PPC Permit (SEPA, Scotland)
- Environmental Permit (NRW, Wales)
- NIEA Permit (NIEA, Northern Ireland)

Document Type Enum: document_type = 'ENVIRONMENTAL_PERMIT'

Module Reference: module_id (UUID) - set dynamically by routing query: SELECT id FROM modules WHERE document_types @> '["ENVIRONMENTAL_PERMIT"]'::JSONB. No hardcoded module_code checks.

Regulators: EA, SEPA, NRW, NIEA

PLS Reference: Section C.1.1 (Supported Document Types - Module 1)

J.1.3 Module-Specific Entities

Core Entities (shared with all modules):
- Company, Site, User, Document, Obligation, Evidence, Schedule, Deadline, AuditPack

Module 1 Specific:
- Document (with document_type = 'ENVIRONMENTAL_PERMIT')
- Obligation (with module-specific categories and extraction rules)
- No additional module-specific entities (uses core entities)

J.1.4 Module-Specific Tables

Core Tables Used:
- documents (with document_type = 'ENVIRONMENTAL_PERMIT')
- obligations (extracted from permits)
- schedules, deadlines, evidence_items, audit_packs

No Module 1-Specific Tables: Module 1 uses core compliance engine tables only.

J.1.5 Module-Specific Fields

Document Fields (module-specific usage):
- documents.regulator: EA, SEPA, NRW, NIEA (not WATER_COMPANY)
- documents.document_type: 'ENVIRONMENTAL_PERMIT'
- documents.module_id: Set by dynamic routing query: SELECT id FROM modules WHERE document_types @> '["ENVIRONMENTAL_PERMIT"]'::JSONB. No hardcoded module_code checks.
- documents.metadata.permitsubtype: 'PART_A', 'PART_B', 'WML', 'PPC', etc.

Obligation Fields (module-specific usage):
- obligations.category: All five categories used (Monitoring, Reporting, Record-Keeping, Operational, Maintenance)
- obligations.metadata.elv_value: Emission Limit Values (numeric)
- obligations.metadata.elv_unit: Units (mg/m³, μg/m³, dB, etc.)
- obligations.metadata.averaging_period: Hourly, daily, monthly average
- obligations.is_high_priority: true for improvement conditions

J.1.6 Module-Specific Enums

Document Type: document_type = 'ENVIRONMENTAL_PERMIT'

Regulator: regulator IN ('EA', 'SEPA', 'NRW', 'NIEA')

Obligation Categories: All categories used (MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE)

J.1.7 Module-Specific Terms

Permit Types:
- Environmental Permit, Part A Permit, Part B Permit, WML, PPC Permit

Condition Types:
- Standard Condition, Site-Specific Condition, Improvement Condition, ELV Condition

Regulatory Terms:
- EA, SEPA, NRW, NIEA

Special Concepts:
- ELV (Emission Limit Value)
- Permit Variation, Permit Renewal
- Improvement Condition

PLS Reference: Section C.1 (Module 1 — Environmental Permits), Section E.1 (Module 1 Terms)

J.1.8 Module-Specific Logic

Extraction Rules:
- Standard conditions matched against rule library first
- Site-specific conditions always flagged for review
- Improvement conditions create one-time schedules with high priority
- ELV conditions extract limit values, units, averaging periods

Evidence Types:
- Monitoring: Lab reports, test certificates, monitoring data (CSV), photos
- Reporting: Submission receipts, report copies, email confirmations
- Record-Keeping: Register excerpts, log sheets, database exports
- Operational: Photos, inspection checklists, procedure documents
- Maintenance: Service records, calibration certificates, work orders

PLS Reference: Section C.1.2 (Extraction Rules for Permit Sections), Section C.1.6 (Evidence Types for Module 1)



J.2 Module 2 — Trade Effluent

J.2.1 Module Overview

Purpose: Manage compliance with Trade Effluent Consents issued by water companies.

Prerequisites: Defined in modules.requires_module_id (currently Module 1, but configurable)

Billing: Stored in modules.base_price and modules.pricing_model (currently £59/month per site)

Activation: Manual activation or cross-sell trigger

J.2.2 Supported Document Types

Document Types:
- Trade Effluent Consent (Water Company)
- Discharge Permit (Water Company)

Document Type Enum: document_type = 'TRADE_EFFLUENT_CONSENT'

Module Reference: module_id (UUID) - set dynamically by routing query: SELECT id FROM modules WHERE document_types @> '["TRADE_EFFLUENT_CONSENT"]'::JSONB. No hardcoded module_code checks.

Regulators: WATER_COMPANY (Thames Water, Severn Trent, Anglian Water, United Utilities, Yorkshire Water, etc.)

PLS Reference: Section C.2.1 (Supported Document Types - Module 2)

J.2.3 Module-Specific Entities

Core Entities (shared):
- Company, Site, User, Document, Obligation, Evidence, Schedule, Deadline, AuditPack

Module 2 Specific Entities:
- Parameter: Discharge parameters with limits (BOD, COD, SS, pH, etc.)
- LabResult: Laboratory sample results for parameters
- Exceedance: Records when parameter values exceed limits
- DischargeVolume: Tracks discharge volumes for surcharge calculations

J.2.4 Module-Specific Tables

Module 2 Tables:
- parameters: Stores discharge parameters from consents
- lab_results: Stores laboratory sample results
- exceedances: Records parameter limit exceedances
- discharge_volumes: Tracks discharge volumes

Core Tables Used:
- documents (with document_type = 'TRADE_EFFLUENT_CONSENT')
- obligations (extracted from consents)
- evidence_items (for lab reports, certificates)

J.2.5 Module-Specific Fields

Document Fields:
- documents.regulator: 'WATER_COMPANY'
- documents.water_company: Water company name (Thames Water, etc.)
- documents.document_type: 'TRADE_EFFLUENT_CONSENT'
- documents.module_id: Set by dynamic routing query: SELECT id FROM modules WHERE document_types @> '["TRADE_EFFLUENT_CONSENT"]'::JSONB. No hardcoded module_code checks.

Parameter Fields:
- parameters.parameter_type: BOD, COD, SS, PH, TEMPERATURE, FOG, AMMONIA, PHOSPHORUS
- parameters.limit_value: Numeric limit value
- parameters.unit: Unit of measurement (mg/l, pH units, °C)
- parameters.limit_type: MAXIMUM, AVERAGE, RANGE
- parameters.sampling_frequency: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL
- parameters.warning_threshold_percent: Default 80%

Lab Result Fields:
- lab_results.parameter_id: Links to parameter
- lab_results.sample_date: Date sample taken
- lab_results.recorded_value: Measured value
- lab_results.percentage_of_limit: Calculated percentage
- lab_results.is_exceedance: Boolean flag
- lab_results.entry_method: MANUAL, CSV_UPLOAD, PDF_EXTRACTION

Exceedance Fields:
- exceedances.parameter_id: Links to parameter
- exceedances.lab_result_id: Links to triggering lab result
- exceedances.status: OPEN, RESOLVED, CLOSED
- exceedances.percentage_of_limit: How much over limit
- exceedances.notified_water_company: Boolean flag

J.2.6 Module-Specific Enums

Parameter Type: parameter_type (BOD, COD, SS, PH, TEMPERATURE, FOG, AMMONIA, PHOSPHORUS)

Limit Type: limit_type (MAXIMUM, AVERAGE, RANGE)

Sampling Frequency: sampling_frequency (DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL)

Entry Method: entry_method (MANUAL, CSV_UPLOAD, PDF_EXTRACTION)

Exceedance Status: exceedance_status (OPEN, RESOLVED, CLOSED)

J.2.7 Module-Specific Terms

Document Terms:
- Trade Effluent Consent, Consent, Discharge Permit

Parameter Terms:
- BOD (Biochemical Oxygen Demand), COD (Chemical Oxygen Demand), SS (Suspended Solids)
- pH, Temperature, FOG (Fats, Oils, Grease), Ammonia, Phosphorus

Compliance Terms:
- Exceedance, Surcharge, Sampling Frequency, Lab Result, Water Company Report

PLS Reference: Section C.2 (Module 2 — Trade Effluent Consents), Section E.2 (Module 2 Terms)

J.2.8 Module-Specific Logic

Parameter Extraction:
- LLM extracts parameter name, limit value, unit, limit type from consent
- Parameters stored in parameters table
- Each parameter has sampling frequency requirement

Lab Result Ingestion:
- Manual entry via form
- CSV upload with template mapping
- PDF extraction from lab reports (LLM extraction, flagged for review)

Exceedance Detection:
- System compares lab results to parameter limits
- Threshold alerts at 80% and 90% of limit
- Breach alert at 100% of limit
- Exceedance records created automatically

Trend Analysis:
- 3-month rolling average calculated
- Trend warnings if consecutive results >70% of limit
- Elevated concern if rolling average >75% of limit

Water Company Reports:
- Monthly summaries, quarterly compliance reports, annual returns
- System formats reports from tracked data
- Export as PDF or CSV

PLS Reference: Section C.2.2 (Parameter Extraction Rules), Section C.2.4 (Exceedance Detection Logic), Section C.2.8 (Water Company Report Formatting)



J.3 Module 3 — MCPD/Generators

J.3.1 Module Overview

Purpose: Manage compliance with MCPD (Medium Combustion Plant Directive) registrations and generator run-hour limits.

Prerequisites: Defined in modules.requires_module_id (queried dynamically, currently Module 1)

Billing: £79/month per company (add-on to Module 1, company-wide not per site)

Activation: Manual activation or cross-sell trigger

J.3.2 Supported Document Types

Document Types:
- MCPD Registration
- Specified Generator Registration
- Generator Permit

Document Type Enum: document_type = 'MCPD_REGISTRATION'

Module Reference: module_id (UUID) - set dynamically by routing query: SELECT id FROM modules WHERE document_types @> '["MCPD_REGISTRATION"]'::JSONB. No hardcoded module_code checks.

Regulators: EA (primary), but registrations are UK-wide

PLS Reference: Section C.3.1 (Supported Document Types - Module 3)

J.3.3 Module-Specific Entities

Core Entities (shared):
- Company, Site, User, Document, Obligation, Evidence, Schedule, Deadline, AuditPack

Module 3 Specific Entities:
- Generator: Combustion plant or generator tracked under MCPD
- RunHourRecord: Log entry recording generator operating hours
- StackTest: Stack emission testing results
- MaintenanceRecord: Service and maintenance records
- AERDocument: Annual Emissions Report document

J.3.4 Module-Specific Tables

Module 3 Tables:
- generators: Stores generator/combustion plant information
- run_hour_records: Logs generator operating hours
- stack_tests: Records stack emission test results
- maintenance_records: Stores generator maintenance/service records
- aer_documents: Stores Annual Emissions Report data

Core Tables Used:
- documents (with document_type = 'MCPD_REGISTRATION')
- obligations (extracted from registrations)
- evidence_items (for stack test reports, maintenance records)

J.3.5 Module-Specific Fields

Document Fields:
- documents.document_type: 'MCPD_REGISTRATION'
- documents.module_id: Set by dynamic routing query: SELECT id FROM modules WHERE document_types @> '["MCPD_REGISTRATION"]'::JSONB. No hardcoded module_code checks.
- documents.metadata.registration_type: MCPD, Specified_Generator, etc.

Generator Fields:
- generators.generator_identifier: Generator ID/name
- generators.generator_type: MCPD_1_5MW, MCPD_5_50MW, SPECIFIED_GENERATOR, EMERGENCY_GENERATOR
- generators.capacity_mw: Capacity in megawatts
- generators.annual_run_hour_limit: Annual limit (typically 500 hours)
- generators.monthly_run_hour_limit: Monthly limit (if applicable)
- generators.anniversary_date: Registration anniversary (for limit reset)
- generators.current_year_hours: Running total for current year
- generators.current_month_hours: Running total for current month
- generators.emissions_nox, emissions_so2, emissions_co, emissions_particulates: Emission limits

Run Hour Record Fields:
- run_hour_records.generator_id: Links to generator
- run_hour_records.hours_recorded: Hours operated
- run_hour_records.running_total_year: Year-to-date total
- run_hour_records.running_total_month: Month-to-date total
- run_hour_records.percentage_of_annual_limit: Percentage of limit
- run_hour_records.entry_method: MANUAL, CSV_UPLOAD, MAINTENANCE_RECORD

Stack Test Fields:
- stack_tests.generator_id: Links to generator
- stack_tests.test_date: Date of test
- stack_tests.nox_result, so2_result, co_result, particulates_result: Test results
- stack_tests.compliance_status: PENDING, COMPLIANT, NON_COMPLIANT, UNDER_REVIEW
- stack_tests.next_test_due: Next test due date

AER Document Fields:
- aer_documents.document_id: Links to MCPD registration
- aer_documents.reporting_period_start, reporting_period_end: Reporting period
- aer_documents.status: DRAFT, IN_PROGRESS, READY, SUBMITTED
- aer_documents.generator_data: JSONB array of generator run-hour data
- aer_documents.fuel_consumption_data: JSONB array of fuel data
- aer_documents.emissions_data: JSONB array of emissions data
- aer_documents.total_run_hours: Aggregated total

J.3.6 Module-Specific Enums

Generator Type: generator_type (MCPD_1_5MW, MCPD_5_50MW, SPECIFIED_GENERATOR, EMERGENCY_GENERATOR)

AER Status: aer_status (DRAFT, IN_PROGRESS, READY, SUBMITTED)

Compliance Status: compliance_status (PENDING, COMPLIANT, NON_COMPLIANT, UNDER_REVIEW) - for stack tests

Entry Method: entry_method (MANUAL, CSV_UPLOAD, MAINTENANCE_RECORD) - for run-hour records

J.3.7 Module-Specific Terms

Document Terms:
- MCPD Registration, Medium Combustion Plant Directive, Specified Generator Registration

Generator Terms:
- Generator, Run-Hour, Annual Limit, Monthly Limit, CHP (Combined Heat and Power)

Compliance Terms:
- Stack Test, AER (Annual Emissions Report), Fuel Consumption, Emissions Calculation

PLS Reference: Section C.3 (Module 3 — MCPD/Generator Compliance), Section E.3 (Module 3 Terms)

J.3.8 Module-Specific Logic

Generator Extraction:
- LLM extracts generator details from registration documents
- Generator type determines run-hour limits (500 hours/year for MCPD, 50 hours/year for Specified)
- Capacity, fuel type, location extracted

Run-Hour Tracking:
- Manual entry, CSV import, or extracted from maintenance records
- Running totals calculated for annual and monthly periods
- Percentage of limit calculated automatically
- Threshold alerts at 80%, 90%, 100% of limit

Stack Test Scheduling:
- Based on registration requirements
- Default: Annual (if not specified)
- Reminders: 60 days, 30 days, 7 days before due
- Test results entered manually
- Compliance status assessed against ELVs

AER Generation:
- Auto-populated from tracked data (run-hours, fuel, emissions)
- User reviews and confirms all data
- Export as PDF (EA template) or CSV
- Pre-submission validation checks completeness
- Submission deadline based on registration anniversary

Maintenance Linking:
- Maintenance records can link to generators
- Run-hours can be extracted from maintenance records
- Maintenance evidence satisfies Maintenance category obligations

PLS Reference: Section C.3.2 (Run-Hour Tracking Rules), Section C.3.6 (Stack Test Scheduling), Section C.3.8 (Annual Return Logic)



J.4 Module Activation and Prerequisites

J.4.1 Module Activation Rules

Module 1 (Environmental Permits):
- Prerequisite: None
- Activation: Default on signup
- Billing: £149/month per site (base price)

Module 2 (Trade Effluent):
- Prerequisite: Defined in modules.requires_module_id (queried dynamically, currently Module 1)
- Activation: Manual activation or cross-sell trigger
- Billing: Stored in modules.base_price and modules.pricing_model (currently £59/month per site)
- Enforcement: System queries modules table to check prerequisites before activation

Module 3 (MCPD/Generators):
- Prerequisite: Defined in modules.requires_module_id (queried dynamically, currently Module 1)
- Activation: Manual activation or cross-sell trigger
- Billing: Stored in modules.base_price and modules.pricing_model (currently £79/month per company)
- Enforcement: System queries modules table to check prerequisites before activation

J.4.2 Deactivation Rules

Deactivation Logic (Dynamic):
- System queries modules table to find all modules where requires_module_id = module_being_deactivated
- If any dependent modules are active, block deactivation with warning
- Warning: "Deactivating [Module Name] will also deactivate [List of Dependent Modules]. Are you sure?"
- If confirmed, cascade deactivation to all dependent modules
- No hardcoded module-specific logic - all determined dynamically from modules table

Module 2/3 Deactivation:
- Can deactivate independently
- Data archived (not deleted)
- Can reactivate to restore access

J.4.3 Cross-Module Data Sharing

Shared Across All Modules:
- Company, Site, User, Role, Notification, Audit Log, Module Activation, Cross-Sell Trigger

Module-Isolated:
- Documents (module-specific only)
- Obligations (module-specific only)
- Evidence (module-specific linking, but same file can be uploaded to multiple modules)

Module-Specific:
- Module 2: Parameters, Lab Results, Exceedances
- Module 3: Generators, Run-Hour Records, Stack Tests, AER Documents

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites), Section D.3 (Shared Data Across Modules)


K. CROSS-MODULE SHARED ENTITIES

This section defines entities that are shared across all modules. These entities provide the foundation for the multi-module platform architecture.

K.1 Company (Shared)

Entity: Company

Table: companies

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, name, billing_email, billing_address, phone
- subscription_tier, stripe_customer_id
- is_active, settings, created_at, updated_at, deleted_at

Module-Specific Fields: None (company is module-agnostic)

Usage Across Modules:
- Module 1: Company owns sites with permits
- Module 2: Company owns sites with consents (requires Module 1)
- Module 3: Company owns MCPD registrations (requires Module 1, company-wide billing)

Business Logic:
- Top-level entity in data hierarchy
- One company can have multiple sites
- Module activations tracked at company level (Module 3) or site level (Module 2)
- Billing aggregated at company level

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section D.3.1 (Shared Entities)



K.2 Site (Shared)

Entity: Site

Table: sites

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, company_id, name, address fields
- latitude, longitude, site_reference
- regulator (EA, SEPA, NRW, NIEA, WATER_COMPANY)
- adjust_for_business_days, grace_period_days
- settings, is_active, created_at, updated_at, deleted_at

Module-Specific Fields: None (site is module-agnostic, but regulator can indicate module)

Usage Across Modules:
- Module 1: Site has environmental permits
- Module 2: Site has trade effluent consents (site-specific module)
- Module 3: Generators may be at sites, but module is company-wide

Business Logic:
- Physical location where compliance activities occur
- Each site can have documents from multiple modules
- Site settings apply to all modules (e.g., business day adjustments)
- Users assigned to sites for access control

PLS Reference: Section A.1.2 (Data Flow Hierarchy), Section B.9 (Cross-Site Logic), Section D.3.1 (Shared Entities)



K.3 User (Shared)

Entity: User

Table: users

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, company_id, email, full_name, phone, avatar_url
- auth_provider, auth_provider_id, email_verified
- last_login_at, notification_preferences, quiet_hours_start, quiet_hours_end
- is_active, created_at, updated_at, deleted_at

Module-Specific Fields: None (user is module-agnostic)

Usage Across Modules:
- Module 1: Users manage permits and obligations
- Module 2: Users enter lab results, track parameters
- Module 3: Users log run-hours, enter stack test results
- All modules: Users receive notifications, generate packs (all pack types per plan)

Business Logic:
- Users belong to one company
- Users can be assigned to multiple sites
- Users have roles that apply across all modules
- Notification preferences apply to all module alerts

PLS Reference: Section B.10 (User Roles Logic), Section D.3.1 (Shared Entities)



K.4 Role (Shared)

Entity: Role

Table: user_roles

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, user_id, role (enum: OWNER, ADMIN, STAFF, VIEWER, CONSULTANT)
- assigned_by, assigned_at, created_at

Module-Specific Fields: None (roles are module-agnostic)

Usage Across Modules:
- Roles apply to all modules uniformly
- Owner: Full access to all modules
- Admin: Full access except billing
- Staff: View/edit in assigned sites across all modules
- Viewer: Read-only across all modules
- Consultant: Multi-company access across all modules

Business Logic:
- Roles control permissions across all modules
- Permission matrix applies uniformly
- Role changes affect access to all modules
- Consultant role enables multi-company access

PLS Reference: Section B.10 (User Roles Logic), Section B.10.2 (Permission Matrix)



K.5 Notification (Shared)

Entity: Notification

Table: notifications

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, user_id, company_id, site_id
- alert_type, severity, channel
- title, message, entity_type, entity_id, action_url
- sent_at, delivered_at, read_at, actioned_at
- is_escalation, escalation_level, metadata, created_at

Module-Specific Fields:
- entity_type and entity_id can reference module-specific entities (Parameter, Generator, etc.)
- alert_type can be module-specific (THRESHOLD, BREACH for Module 2/3)

Usage Across Modules:
- Module 1: Deadline alerts, document expiry reminders
- Module 2: Parameter threshold warnings, exceedance alerts
- Module 3: Run-hour limit warnings, stack test reminders
- All modules: Escalation notifications, review queue items

Business Logic:
- Notification preferences apply across all modules
- Users receive consolidated notifications from all active modules
- Alert channels (email, SMS, in-app) configured per user
- Quiet hours apply to all module notifications

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic), Section D.3.1 (Shared Entities)



K.6 Audit Log (Shared)

Entity: AuditLog

Table: audit_logs

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, company_id, user_id
- action_type, entity_type, entity_id
- previous_values, new_values
- ip_address, user_agent, session_id, created_at

Module-Specific Fields:
- entity_type can reference module-specific entities (Parameter, Generator, etc.)
- previous_values and new_values contain module-specific data

Usage Across Modules:
- Module 1: Logs permit uploads, obligation edits, evidence links
- Module 2: Logs parameter changes, lab result entries, exceedance resolutions
- Module 3: Logs run-hour entries, stack test results, AER submissions
- All modules: Logs all user actions and system changes

Business Logic:
- Immutable log of all actions across all modules
- Audit trail required for compliance
- User deletion does not delete audit logs (preserves trail)
- Logs retained indefinitely

PLS Reference: Section A.1.1 (Audit Trail Completeness), Section D.3.1 (Shared Entities)



K.7 Module Activation (Shared)

Entity: ModuleActivation

Table: module_activations

Used By: All modules (tracks activation for Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, company_id, site_id (nullable)
- module_id (UUID → modules.id, references module registry)
- status (enum: ACTIVE, INACTIVE, PENDING_ACTIVATION)
- activated_at, activated_by, deactivated_at, deactivated_by
- deactivation_reason, billing_start_date, billing_end_date
- created_at, updated_at

Module-Specific Fields: None (activation tracking is module-agnostic)

Usage Across Modules:
- Tracks which modules are active for company/site
- Default modules: Identified by modules.is_default = true (queried dynamically)
- Module activation: Site-specific or company-wide based on modules.pricing_model (queried dynamically)
- Prerequisites: Enforced via modules.requires_module_id (queried dynamically)

Business Logic:
- Modules cannot be deactivated if dependent modules (via requires_module_id) are active (queried dynamically)
- Prerequisites are enforced by querying modules.requires_module_id (not hardcoded)
- Activation status controls module visibility and access
- Billing tracked per activation, calculated from modules.base_price and modules.pricing_model

PLS Reference: Section A.1.3 (Module Activation Rules), Section D.1 (Module Prerequisites), Section D.3.1 (Shared Entities)



> [v1 UPDATE – Consultant Entity – 2024-12-27]

K.8 Consultant Client Assignment (Shared)

Entity: ConsultantClientAssignment

Table: consultant_client_assignments

Used By: Consultant Control Centre (v1.0)

Fields:
- id: UUID PRIMARY KEY
- consultant_id: UUID NOT NULL REFERENCES users(id) — Consultant user (must have CONSULTANT role)
- client_company_id: UUID NOT NULL REFERENCES companies(id) — Client company assigned to consultant
- assigned_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- status: TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
- assigned_by: UUID REFERENCES users(id) — User who created assignment
- created_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

Business Logic:
- Consultant can be assigned to multiple client companies
- Assignment grants consultant access to all sites within client company
- Status 'ACTIVE' grants access, 'INACTIVE' revokes access
- Consultant can only access assigned client companies (enforced via RLS)
- Assignment can be created by client company Owner/Admin or system admin
- Historical assignments preserved (status change, not deletion)

RLS Enabled: Yes

Soft Delete: No (uses status field instead)

PLS Reference: Section C.5 (Consultant Control Centre Logic), Section B.10 (User Roles Logic)

---

K.9 Cross-Sell Trigger (Shared)

Entity: CrossSellTrigger

Table: cross_sell_triggers

Used By: All modules (detects opportunities for Module 2 and Module 3)

Module-Agnostic Fields:
- id, company_id, document_id (nullable)
- target_module_id (UUID → modules.id, references target module for cross-sell)
- trigger_type (enum: KEYWORD, EXTERNAL, USER_REQUEST)
- trigger_source, detected_keywords
- status (enum: PENDING, DISMISSED, CONVERTED)
- responded_at, response_action, dismissed_reason
- created_at, updated_at

Module-Specific Fields:
- target_module_id references the module being cross-sold (via modules.id)
- detected_keywords are module-specific (stored in modules.cross_sell_keywords, currently effluent keywords for Module 2, generator keywords for Module 3)

Usage Across Modules:
- Module 1: Source of cross-sell triggers (keywords in permits)
- Module 2: Target of cross-sell from Module 1
- Module 3: Target of cross-sell from Module 1

Business Logic:
- Triggers detected during Module 1 document extraction
- Keywords in permits indicate need for Module 2 or Module 3
- User can dismiss or convert trigger
- Converted triggers result in module activation

PLS Reference: Section D.2 (Cross-Sell Trigger Detection), Section D.3.1 (Shared Entities)



K.9 Evidence (Partially Shared)

Entity: EvidenceItem

Table: evidence_items

Used By: All modules (Module 1, Module 2, Module 3)

Module-Agnostic Fields:
- id, site_id, file_name, file_type, file_size_bytes, mime_type
- storage_path, thumbnail_path, description
- compliance_period, gps_latitude, gps_longitude, capture_timestamp
- is_verified, verified_by, verified_at
- file_hash, is_archived, archived_at
- uploaded_by, metadata, created_at, updated_at

Module-Specific Fields: None (evidence storage is module-agnostic)

Usage Across Modules:
- Module 1: Evidence linked to permit obligations
- Module 2: Evidence linked to parameter compliance (lab reports)
- Module 3: Evidence linked to generator compliance (stack tests, maintenance records)
- Same file can be uploaded once and linked to obligations in different modules

Business Logic:
- Evidence files stored centrally
- Evidence metadata (upload date, uploader) is shared
- Evidence-obligation links are module-specific (via obligation_evidence_links)
- Evidence cannot be linked to obligations on different sites
- Evidence retention rules apply across all modules

PLS Reference: Section D.3.3 (Evidence Sharing), Section H (Evidence Logic)



K.10 Shared Data Summary

Fully Shared Entities (No Module-Specific Fields):
- Company: Used by all modules, no module-specific fields
- Site: Used by all modules, no module-specific fields
- User: Used by all modules, no module-specific fields
- Role: Used by all modules, no module-specific fields
- Notification: Used by all modules, entity references can be module-specific
- Audit Log: Used by all modules, entity references can be module-specific
- Module Activation: Tracks all modules, no module-specific fields
- Cross-Sell Trigger: Detects opportunities for Module 2/3, no module-specific fields

Partially Shared Entities:
- Evidence: Storage is shared, but linking is module-specific via obligations
- Document: Base structure shared, but document_type and module_id are module-specific (module_id references modules table dynamically)
- Obligation: Base structure shared, but extracted content is module-specific

Module-Isolated Entities:
- Module 2: Parameter, LabResult, Exceedance, DischargeVolume
- Module 3: Generator, RunHourRecord, StackTest, MaintenanceRecord, AERDocument

PLS Reference: Section D.3 (Shared Data Across Modules)


L. TECHNICAL SYSTEM TABLES

This section defines system-level tables required for platform operation. These tables support background processing, logging, configuration, and system administration rather than storing core business data.

L.1 Audit Logs

Table: audit_logs

Purpose: Immutable log of all user actions and system changes for audit trail and compliance.

Key Characteristics:
- Immutable: Records cannot be modified or deleted
- Complete: All actions logged with before/after values
- Timestamped: Every action has precise timestamp
- Attributed: Every action linked to user (if applicable)
- Contextual: Includes IP address, user agent, session ID

Technical Details:
- RLS Enabled: Yes (read-only for company)
- Soft Delete: No (immutable records)
- Primary Use: Compliance auditing, security monitoring, change tracking
- Retention: Indefinite (regulatory requirement)

Schema Reference: Section C.5 (System Tables - audit_logs)

PLS Reference: Section A.1.1 (Audit Trail Completeness)



L.2 Background Jobs

Table: background_jobs

Purpose: Tracks scheduled and queued background tasks for asynchronous processing.

Key Characteristics:
- Job Queue: Manages pending, running, completed, failed jobs
- Priority System: Jobs processed by priority and scheduled time
- Retry Logic: Failed jobs can retry up to max_retries
- Timeout Protection: Jobs have timeout_seconds limit
- Result Storage: Job results stored in JSONB

Technical Details:
- RLS Enabled: No (system table)
- Soft Delete: No
- Primary Use: Document extraction, deadline generation, audit pack generation, notifications
- Job Types: Extensible (not enum-constrained)

Schema Reference: Section C.5 (System Tables - background_jobs)

PLS Reference: Section B.1 (Document Ingestion Pipeline), Section I.7 (Audit Pack Generation Triggers)



L.3 Notifications

Table: notifications

Purpose: Stores all notifications/alerts sent to users across all modules.

Key Characteristics:
- Multi-Channel: Email, SMS, In-app notifications
- Multi-Module: Notifications from all active modules
- Delivery Tracking: Tracks sent, delivered, read, actioned timestamps
- Escalation Support: Tracks escalation level and status
- Entity Linking: Can link to any entity type (obligation, parameter, generator, etc.)

Technical Details:
- RLS Enabled: Yes
- Soft Delete: No
- Primary Use: Deadline alerts, threshold warnings, breach notifications, escalations
- Consolidation: Multiple notifications can be consolidated per user per day

Schema Reference: Section C.5 (System Tables - notifications)

PLS Reference: Section B.6 (Escalation and Alerting Logic), Section F.3 (Alert Generation Logic)



L.4 Extraction Logs

Table: extraction_logs

Purpose: Logs AI extraction processing for debugging, improvement, and validation.

Key Characteristics:
- Extraction Tracking: Records every extraction run
- Model Versioning: Tracks LLM model and rule library versions
- Performance Metrics: Processing time, segments processed, obligations extracted
- Error Logging: Errors and warnings stored in JSONB arrays
- Quality Metrics: OCR confidence, flagged items count

Technical Details:
- RLS Enabled: Yes
- Soft Delete: No
- Primary Use: Debugging extraction issues, tracking model performance, rule library improvement
- Retention: Indefinite (for model improvement)

Schema Reference: Section C.5 (System Tables - extraction_logs)

PLS Reference: Section E.7 (Logging and Validation)



L.5 Review Queue Items

Table: review_queue_items

Purpose: Items flagged for human review during extraction or processing.

Key Characteristics:
- Review Types: Low confidence, subjective, no match, date failure, duplicate, OCR quality, conflict
- Priority System: Items sorted by blocking status and priority
- Review Tracking: Tracks review action, reviewer, review notes
- Original Data: Preserves original extraction data for comparison
- Edited Data: Stores edited data if changes made

Technical Details:
- RLS Enabled: Yes
- Soft Delete: No
- Primary Use: Human review workflow, quality assurance
- Blocking: Some items block progress until reviewed

Schema Reference: Section C.5 (System Tables - review_queue_items)

PLS Reference: Section A.7 (Human Review Triggers), Section E.4 (Mandatory Human Review Nodes)



L.6 System Settings

Table: system_settings

Purpose: Stores system-wide configuration and feature flags.

Key Characteristics:
- Key-Value Store: Setting key maps to JSONB value
- Public/Private: Some settings visible to users, others admin-only
- Versioned: Settings can be updated with audit trail
- Flexible: JSONB allows complex configuration structures

Technical Details:
- RLS Enabled: No (system table)
- Soft Delete: No
- Primary Use: Feature flags, system configuration, rule library versions
- Access: Admin-only for modification

Schema Reference: Section C.5 (System Tables - system_settings)

PLS Reference: General system configuration needs



L.7 System Table Summary

All System Tables:
1. audit_logs: Immutable audit trail
2. background_jobs: Job queue management
3. notifications: Alert and notification storage
4. extraction_logs: AI extraction logging
5. review_queue_items: Human review workflow
6. system_settings: System configuration

Common Characteristics:
- Support platform operation rather than core business logic
- Some tables have RLS enabled (notifications, extraction_logs, review_queue_items)
- Some tables are system-only (background_jobs, system_settings)
- Most tables have no soft delete (immutable or system-managed)
- All tables have created_at timestamps
- JSONB fields used for flexible data storage

Technical Requirements:
- High write volume: audit_logs, notifications, extraction_logs
- Query performance: Indexes on foreign keys, status fields, timestamps
- Data retention: Some tables retain indefinitely (audit_logs), others may be archived
- Backup: All system tables included in backups


M. FIELD TYPE STANDARDS

This section defines standard field types used throughout the system. All types are PostgreSQL-native types with appropriate constraints.

M.1 UUID

PostgreSQL Type: UUID

Usage: Primary keys for all tables, foreign key references

Examples:
- id: gen_random_uuid() (primary key)
- company_id: UUID (foreign key)
- document_id: UUID (foreign key)

Constraints:
- PRIMARY KEY: All table primary keys
- FOREIGN KEY: All relationship references
- NOT NULL: Always required (no nullable UUIDs)
- Default: gen_random_uuid() for primary keys

Indexing: All UUID fields used in foreign keys are indexed

Maps To: All table.id fields, all foreign key fields



M.2 TEXT

PostgreSQL Type: TEXT

Usage: Variable-length strings with no length limit

Examples:
- name: TEXT NOT NULL (company name, site name)
- email: TEXT NOT NULL UNIQUE (user email)
- description: TEXT (optional descriptions)
- notes: TEXT (user notes, review notes)

Constraints:
- NOT NULL: For required fields (names, emails)
- UNIQUE: For unique identifiers (email)
- CHECK: For enum-like constraints (status fields)
- No length limit: Use TEXT for variable-length content

When to Use:
- Names, titles, descriptions
- Email addresses
- URLs, file paths
- Free-form text fields
- Status fields (with CHECK constraints)

Maps To: Most string fields in the system



M.3 VARCHAR(n)

PostgreSQL Type: VARCHAR(n)

Usage: Fixed-length or maximum-length strings (rarely used in this system)

Examples:
- Not commonly used (TEXT preferred for flexibility)

Constraints:
- Length limit specified: VARCHAR(255), VARCHAR(100)
- Use only when length limit is critical

When to Use:
- Rarely used in this system
- Prefer TEXT for flexibility unless length limit is business-critical

Note: This system primarily uses TEXT for string fields



M.4 INTEGER

PostgreSQL Type: INTEGER

Usage: Whole numbers for counts, quantities, limits

Examples:
- grace_period_days: INTEGER CHECK (grace_period_days >= 0)
- total_obligations: INTEGER NOT NULL DEFAULT 0
- escalation_level: INTEGER CHECK (current_level >= 1 AND current_level <= 4)
- retry_count: INTEGER NOT NULL DEFAULT 0

Constraints:
- CHECK: For range constraints (>= 0, >= 1, etc.)
- NOT NULL: For required numeric fields
- DEFAULT: Often 0 for counts

When to Use:
- Counts (obligation count, evidence count)
- Quantities (days, hours, levels)
- Limits (run-hour limits, escalation levels)
- Retry counts, priority values

Maps To: Count fields, limit fields, level fields



M.5 DECIMAL

PostgreSQL Type: DECIMAL(precision, scale)

Usage: Exact numeric values for monetary amounts, percentages, measurements

Examples:
- confidence_score: DECIMAL(5, 4) CHECK (confidence_score >= 0 AND confidence_score <= 1)
- limit_value: DECIMAL(12, 4) (parameter limits)
- capacity_mw: DECIMAL(8, 4) (generator capacity)
- percentage_of_limit: DECIMAL(8, 4) (percentage calculations)
- latitude: DECIMAL(10, 8) (GPS coordinates)
- longitude: DECIMAL(11, 8) (GPS coordinates)

Common Precision/Scale:
- DECIMAL(5, 4): 0.0000 to 0.9999 (confidence scores, percentages 0-1)
- DECIMAL(8, 4): Large numbers with 4 decimal places (percentages, measurements)
- DECIMAL(10, 2): Whole numbers with 2 decimals (run hours, totals)
- DECIMAL(12, 4): Very large numbers with 4 decimals (parameter values, limits)

Constraints:
- CHECK: For range constraints (>= 0 AND <= 1 for percentages)
- NOT NULL: For required numeric fields

When to Use:
- Monetary values (if used)
- Percentages (0-100 or 0-1)
- Measurements (capacities, values, limits)
- GPS coordinates
- Confidence scores
- Any value requiring decimal precision

Maps To: Measurement fields, percentage fields, limit fields, coordinate fields



M.6 BOOLEAN

PostgreSQL Type: BOOLEAN

Usage: True/false flags

Examples:
- is_active: BOOLEAN NOT NULL DEFAULT true
- is_subjective: BOOLEAN NOT NULL DEFAULT false
- is_verified: BOOLEAN NOT NULL DEFAULT false
- is_archived: BOOLEAN NOT NULL DEFAULT false
- is_late: BOOLEAN NOT NULL DEFAULT false

Constraints:
- NOT NULL: Always required
- DEFAULT: Usually false, sometimes true (is_active)

Naming Convention:
- Prefix with is_ or has_ (is_active, is_subjective, has_evidence)

When to Use:
- Status flags (active, verified, archived)
- Feature flags (subjective, late, blocking)
- Boolean attributes (verified, completed, exceeded)

Maps To: All boolean flag fields



M.7 DATE

PostgreSQL Type: DATE

Usage: Dates without time component

Examples:
- deadline_date: DATE (obligation deadlines)
- expiry_date: DATE (document expiry)
- sample_date: DATE NOT NULL (lab result date)
- test_date: DATE NOT NULL (stack test date)
- anniversary_date: DATE NOT NULL (registration anniversary)

Constraints:
- NOT NULL: For required dates
- CHECK: For date range validation (if needed)

When to Use:
- Deadlines, expiry dates
- Sample dates, test dates
- Anniversary dates, start dates, end dates
- Any date that doesn't require time precision

Maps To: All date-only fields (deadlines, expiry, sample dates)



M.8 TIMESTAMP WITH TIME ZONE

PostgreSQL Type: TIMESTAMP WITH TIME ZONE

Usage: Timestamps with time and timezone information

Examples:
- created_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- deleted_at: TIMESTAMP WITH TIME ZONE (soft delete)
- completed_at: TIMESTAMP WITH TIME ZONE (completion timestamp)
- reviewed_at: TIMESTAMP WITH TIME ZONE (review timestamp)

Constraints:
- NOT NULL: For required timestamps
- DEFAULT NOW(): For created_at, updated_at
- Nullable: For optional timestamps (deleted_at, completed_at)

Naming Convention:
- Suffix with _at (created_at, updated_at, deleted_at)

When to Use:
- Record creation timestamps
- Record update timestamps
- Soft delete timestamps
- Action timestamps (completed, reviewed, sent)
- Any timestamp requiring time and timezone

Maps To: All timestamp fields (created_at, updated_at, action timestamps)



M.9 JSONB

PostgreSQL Type: JSONB

Usage: Flexible structured data storage

Examples:
- settings: JSONB NOT NULL DEFAULT '{}' (company/site settings)
- metadata: JSONB NOT NULL DEFAULT '{}' (additional metadata)
- confidence_components: JSONB NOT NULL DEFAULT '{}' (confidence breakdown)
- filters_applied: JSONB NOT NULL DEFAULT '{}' (audit pack filters)
- payload: JSONB NOT NULL DEFAULT '{}' (background job parameters)
- previous_values: JSONB (audit log before values)
- new_values: JSONB (audit log after values)

Constraints:
- NOT NULL: Usually required
- DEFAULT '{}': Empty JSON object as default
- DEFAULT '[]': Empty JSON array for list data

When to Use:
- Flexible configuration (settings)
- Additional metadata (document metadata, obligation metadata)
- Structured data (confidence components, filter configurations)
- Audit trail data (previous/new values)
- Job parameters and results
- Any data structure that may vary or evolve

Indexing: GIN indexes can be created on JSONB fields for querying

Maps To: Settings fields, metadata fields, configuration fields, audit data fields



M.10 ENUM (TEXT with CHECK)

PostgreSQL Type: TEXT with CHECK constraint (PostgreSQL ENUM type not used)

Usage: Fixed value sets with validation

Examples:
- status: TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'OVERDUE'))
- document_type: TEXT NOT NULL CHECK (document_type IN ('ENVIRONMENTAL_PERMIT', 'TRADE_EFFLUENT_CONSENT', 'MCPD_REGISTRATION'))
- role: TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'VIEWER', 'CONSULTANT'))

Constraints:
- CHECK: Enum values specified in CHECK constraint
- NOT NULL: Usually required
- Default: Often specified (first enum value)

Why TEXT with CHECK instead of ENUM:
- More flexible (easier to add values)
- Better for migrations
- Consistent with system approach

When to Use:
- Status fields (obligation status, deadline status)
- Type fields (document type, parameter type)
- Category fields (obligation category)
- Role fields (user role)
- Any field with fixed set of valid values

Maps To: All enum fields (see Section D for complete list)

PLS Reference: Section D (Enums and Status Values)



M.11 ARRAY Types

PostgreSQL Type: TEXT[], INTEGER[], etc.

Usage: Arrays of values

Examples:
- subjective_phrases: TEXT[] NOT NULL DEFAULT '{}' (matched phrases)
- reminder_days: INTEGER[] NOT NULL DEFAULT '{7, 3, 1}' (reminder days)
- renewal_reminder_days: INTEGER[] NOT NULL DEFAULT '{90, 30, 7}' (renewal reminders)
- detected_keywords: TEXT[] NOT NULL DEFAULT '{}' (cross-sell keywords)
- evidence_suggestions: TEXT[] NOT NULL DEFAULT '{}' (suggested evidence types)

Constraints:
- NOT NULL: Usually required
- DEFAULT '{}': Empty array as default
- DEFAULT '{value1, value2}': Array with default values

When to Use:
- Lists of strings (phrases, keywords, suggestions)
- Lists of integers (reminder days, IDs)
- Any field requiring multiple values of same type

Operations:
- Array contains: WHERE 'value' = ANY(array_field)
- Array length: array_length(array_field, 1)
- Array append: array_field || ARRAY['new_value']

Maps To: Phrase arrays, reminder arrays, keyword arrays



M.12 Special Types

PostgreSQL Type: INET

Usage: IP addresses

Examples:
- ip_address: INET (audit log IP addresses)

Constraints:
- Nullable: Usually optional

When to Use:
- IP address storage (audit logs, security)

Maps To: audit_logs.ip_address



PostgreSQL Type: TIME

Usage: Time of day (without date)

Examples:
- quiet_hours_start: TIME (notification quiet hours)
- quiet_hours_end: TIME (notification quiet hours)

Constraints:
- Nullable: Usually optional

When to Use:
- Time of day values (quiet hours, scheduled times)

Maps To: users.quiet_hours_start, users.quiet_hours_end



M.13 Type Selection Guidelines

When to Use Each Type:

UUID:
- All primary keys
- All foreign keys
- Unique identifiers

TEXT:
- Names, titles, descriptions
- Email addresses, URLs
- Status fields (with CHECK)
- Free-form text

INTEGER:
- Counts, quantities
- Levels, limits
- Retry counts

DECIMAL:
- Measurements, capacities
- Percentages, confidence scores
- Monetary values (if used)
- GPS coordinates

BOOLEAN:
- All true/false flags
- Status indicators
- Feature flags

DATE:
- Deadlines, expiry dates
- Sample dates, test dates
- Any date without time

TIMESTAMP WITH TIME ZONE:
- Created/updated timestamps
- Action timestamps
- Any timestamp with time

JSONB:
- Settings, configuration
- Metadata, additional data
- Flexible structures

TEXT with CHECK:
- All enum fields
- Fixed value sets

ARRAY:
- Lists of values
- Multiple selections
- Reminder configurations


N. INDEX STRATEGY

This section defines indexing requirements for performance optimization. Indexes are categorized by type and purpose.

N.1 Index Naming Convention

Convention: idx_{table}_{column(s)}

Examples:
- idx_obligations_document_id
- idx_evidence_items_site_id
- idx_deadlines_due_date
- idx_user_roles_user_id

Unique Indexes: uq_{table}_{column(s)}
- uq_user_roles_user_role
- uq_user_site_assignments

Composite Indexes: idx_{table}_{column1}_{column2}
- idx_deadlines_status_due_date
- idx_obligations_category_status

PLS Reference: Section A.7 (Index Naming)



N.2 Foreign Key Indexes

Purpose: Optimize join performance for all foreign key relationships

Index Type: B-tree

Coverage: ALL foreign key columns

Examples:
- idx_sites_company_id: sites.company_id
- idx_documents_site_id: documents.site_id
- idx_obligations_document_id: obligations.document_id
- idx_schedules_obligation_id: schedules.obligation_id
- idx_deadlines_schedule_id: deadlines.schedule_id
- idx_evidence_items_site_id: evidence_items.site_id
- idx_obligation_evidence_links_obligation_id: obligation_evidence_links.obligation_id
- idx_parameters_document_id: parameters.document_id
- idx_lab_results_parameter_id: lab_results.parameter_id
- idx_generators_document_id: generators.document_id
- idx_run_hour_records_generator_id: run_hour_records.generator_id

Rationale:
- Foreign keys are used in JOIN operations
- Without indexes, joins require full table scans
- Critical for query performance

All Tables: Every foreign key column has an index (see Section C for complete list)



N.3 Status Field Indexes

Purpose: Optimize filtering by status values

Index Type: B-tree

Coverage: All status/enum fields used in WHERE clauses

Examples:
- idx_obligations_status: obligations.status
- idx_obligations_review_status: obligations.review_status
- idx_deadlines_status: deadlines.status
- idx_documents_status: documents.status
- idx_documents_extraction_status: documents.extraction_status
- idx_exceedances_status: exceedances.status
- idx_aer_documents_status: aer_documents.status
- idx_module_activations_status: module_activations.status
- idx_cross_sell_triggers_status: cross_sell_triggers.status
- idx_notifications_read_at: notifications.read_at (for unread filtering)

Rationale:
- Status fields frequently used in WHERE clauses
- Dashboard queries filter by status
- Review queue queries filter by review_status
- Performance critical for user-facing queries

All Status Fields: Every status/enum field used in filtering has an index



N.4 Date Field Indexes

Purpose: Optimize date range queries and sorting

Index Type: B-tree

Coverage: All date fields used in queries, sorting, or date ranges

Examples:
- idx_deadlines_due_date: deadlines.due_date (deadline queries)
- idx_documents_expiry_date: documents.expiry_date (renewal alerts)
- idx_schedules_next_due_date: schedules.next_due_date (upcoming deadlines)
- idx_lab_results_sample_date: lab_results.sample_date (date range queries)
- idx_run_hour_records_recording_date: run_hour_records.recording_date (date queries)
- idx_notifications_created_at: notifications.created_at (date sorting)
- idx_audit_logs_created_at: audit_logs.created_at (date queries)
- idx_extraction_logs_extraction_timestamp: extraction_logs.extraction_timestamp (date queries)

Rationale:
- Date fields used in range queries (WHERE date BETWEEN ...)
- Sorting by date (ORDER BY date)
- Dashboard queries show items by date
- Alert queries find items due within date ranges

All Date Fields: Every date field used in queries has an index



N.5 Unique Constraint Indexes

Purpose: Enforce uniqueness and optimize unique lookups

Index Type: B-tree (unique)

Coverage: All UNIQUE constraints

Examples:
- uq_user_roles_user_role: UNIQUE(user_id, role)
- uq_user_site_assignments: UNIQUE(user_id, site_id)
- uq_obligation_evidence_links: UNIQUE(obligation_id, evidence_id, compliance_period) WHERE unlinked_at IS NULL
- uq_lab_results_parameter_date: UNIQUE(parameter_id, sample_date, sample_id)
- uq_module_activations: UNIQUE(company_id, site_id, module_id) WHERE status = 'ACTIVE'
- uq_system_settings_setting_key: UNIQUE(setting_key)

Rationale:
- Enforces data integrity (prevents duplicates)
- Optimizes unique lookups
- Partial unique indexes (WHERE clause) for conditional uniqueness

All Unique Constraints: Every UNIQUE constraint creates an index automatically



N.6 Composite Indexes

Purpose: Optimize queries filtering or sorting by multiple columns

Index Type: B-tree

Coverage: Common query patterns with multiple columns

Examples:
- idx_obligations_document_category: (document_id, category) - filter obligations by document and category
- idx_deadlines_status_due_date: (status, due_date) - filter and sort deadlines
- idx_notifications_user_read: (user_id, read_at) - find unread notifications for user
- idx_background_jobs_priority_scheduled: (priority DESC, scheduled_for ASC) - job queue ordering
- idx_audit_logs_entity_type_id: (entity_type, entity_id) - lookup audit logs by entity

Rationale:
- Queries often filter by multiple columns
- Composite indexes support multi-column WHERE clauses
- Can support ORDER BY on multiple columns
- More efficient than multiple single-column indexes

Query Patterns: Composite indexes created for common multi-column query patterns



N.7 Full-Text Search Indexes

Purpose: Optimize text search operations

Index Type: GIN (Generalized Inverted Index)

Coverage: Text fields used in search

Examples:
- Full-text search on obligations.original_text (if implemented)
- Full-text search on documents.extracted_text (if implemented)
- Full-text search on evidence_items.description (if implemented)

Rationale:
- Full-text search requires specialized indexes
- GIN indexes support text search operators (@@, tsvector)
- Not currently implemented but may be added

Future Enhancement: Full-text search indexes may be added for search functionality



N.8 JSONB Indexes

Purpose: Optimize queries on JSONB fields

Index Type: GIN (Generalized Inverted Index)

Coverage: JSONB fields queried by key or value

Examples:
- GIN index on settings JSONB (if querying by key)
- GIN index on metadata JSONB (if querying by key)
- GIN index on confidence_components JSONB (if querying by component)

Rationale:
- JSONB fields can be queried by key or value
- GIN indexes support JSONB operators (->, ->>, @>, ?)
- Not currently implemented but may be added

Future Enhancement: GIN indexes on JSONB fields if querying is required



N.9 Index Maintenance

Index Creation:
- Indexes created during table creation (migration scripts)
- Indexes named according to convention
- Indexes documented in table definitions (Section C)

Index Monitoring:
- Monitor index usage (pg_stat_user_indexes)
- Identify unused indexes for removal
- Monitor index size and bloat

Index Optimization:
- Regular VACUUM and REINDEX for maintenance
- Analyze tables after bulk inserts
- Monitor query performance and add indexes as needed

Index Trade-offs:
- Indexes improve read performance
- Indexes slow down writes (INSERT, UPDATE, DELETE)
- Balance between read and write performance
- Add indexes based on query patterns

Best Practices:
- Index all foreign keys (required for joins)
- Index frequently filtered columns (status, dates)
- Index columns used in WHERE clauses
- Index columns used in ORDER BY
- Avoid over-indexing (monitor usage)
- Use composite indexes for multi-column queries



N.10 Index Summary by Table

Core Tables:
- companies: stripe_customer_id, is_active, created_at
- sites: company_id, is_active, regulator
- users: company_id, email, is_active
- documents: site_id, document_type, module_id, status, expiry_date, reference_number, parent_document_id
- document_site_assignments: document_id, site_id (unique constraint)
- obligations: document_id, category, status, review_status, is_subjective, deadline_date, assigned_to, confidence_score
- schedules: obligation_id, next_due_date, status
- deadlines: schedule_id, obligation_id, due_date, status, compliance_period
- evidence_items: site_id, file_type, uploaded_by, created_at, compliance_period, file_hash

Module 2 Tables:
- parameters: document_id, parameter_type, is_active
- lab_results: parameter_id, sample_date, is_exceedance
- exceedances: parameter_id, lab_result_id, status, recorded_date

Module 3 Tables:
- generators: document_id, generator_type, anniversary_date, is_active, next_stack_test_due
- run_hour_records: generator_id, recording_date, percentage_of_annual_limit
- stack_tests: generator_id, test_date, compliance_status, next_test_due
- maintenance_records: generator_id, maintenance_date, next_service_due
- aer_documents: document_id, reporting_period_end, status, submission_deadline

System Tables:
- notifications: user_id, company_id, alert_type, severity, read_at, created_at
- escalations: obligation_id, escalated_to, current_level, resolved_at
- review_queue_items: document_id, obligation_id, review_status, is_blocking, priority
- extraction_logs: document_id, extraction_timestamp, model_identifier
- audit_logs: company_id, user_id, entity_type, entity_id, action_type, created_at
- background_jobs: status, job_type, scheduled_for, (priority DESC, scheduled_for ASC)

Complete Index List: See Section C (Database Tables) for complete index definitions per table


O. VALIDATION RULES

This section defines validation rules for fields, ensuring data integrity and business rule compliance. Validation occurs at database constraint level, application logic level, or both.

O.1 Required Field Validation

Enforcement: Database constraint (NOT NULL)

Coverage: All required fields across all tables

Examples:
- companies.name: TEXT NOT NULL
- users.email: TEXT NOT NULL UNIQUE
- documents.title: TEXT NOT NULL
- obligations.original_text: TEXT NOT NULL
- obligations.category: TEXT NOT NULL CHECK
- deadlines.due_date: DATE NOT NULL

Rules:
- Required fields cannot be NULL
- Database enforces NOT NULL constraint
- Application should validate before database insert/update
- User-facing forms should indicate required fields

All Tables: See Section C for complete list of NOT NULL fields



O.2 Unique Constraint Validation

Enforcement: Database constraint (UNIQUE)

Coverage: Fields requiring uniqueness

Examples:
- users.email: UNIQUE (one email per user)
- companies.stripe_customer_id: UNIQUE (one Stripe customer per company)
- user_roles: UNIQUE(user_id, role) (one role assignment per user-role combination)
- user_site_assignments: UNIQUE(user_id, site_id) (one assignment per user-site)
- document_site_assignments: UNIQUE(document_id, site_id) (one assignment per document-site)
- obligation_evidence_links: UNIQUE(obligation_id, evidence_id, compliance_period) WHERE unlinked_at IS NULL
- lab_results: UNIQUE(parameter_id, sample_date, sample_id) (prevent duplicate entries)
- module_activations: UNIQUE(company_id, site_id, module_id) WHERE status = 'ACTIVE'
- system_settings.setting_key: UNIQUE (one setting per key)

Rules:
- Database enforces UNIQUE constraint
- Application should handle unique violation errors gracefully
- Partial unique indexes (WHERE clause) for conditional uniqueness
- User-friendly error messages for unique violations

All Unique Constraints: See Section C for complete list of UNIQUE constraints



O.3 Enum Value Validation

Enforcement: Database constraint (CHECK) and Application logic

Coverage: All enum fields

Examples:
- obligations.category: CHECK (category IN ('MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE'))
- obligations.status: CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'INCOMPLETE', 'LATE_COMPLETE', 'NOT_APPLICABLE', 'REJECTED'))
- documents.document_type: CHECK (document_type IN ('ENVIRONMENTAL_PERMIT', 'TRADE_EFFLUENT_CONSENT', 'MCPD_REGISTRATION'))
- documents.status: CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED'))
- user_roles.role: CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'VIEWER', 'CONSULTANT'))
- parameters.parameter_type: CHECK (parameter_type IN ('BOD', 'COD', 'SS', 'PH', 'TEMPERATURE', 'FOG', 'AMMONIA', 'PHOSPHORUS'))
- generators.generator_type: CHECK (generator_type IN ('MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'EMERGENCY_GENERATOR'))

Rules:
- Database CHECK constraint enforces valid enum values
- Application should validate before database insert/update
- Invalid enum values rejected at database level
- User-facing forms should use dropdowns/selects for enum fields

All Enum Fields: See Section D (Enums and Status Values) for complete enum definitions



O.4 Numeric Range Validation

Enforcement: Database constraint (CHECK) and Application logic

Coverage: Numeric fields with range constraints

Examples:
- obligations.confidence_score: CHECK (confidence_score >= 0 AND confidence_score <= 1)
- parameters.confidence_score: CHECK (confidence_score >= 0 AND confidence_score <= 1)
- sites.grace_period_days: CHECK (grace_period_days >= 0)
- escalations.current_level: CHECK (current_level >= 1 AND current_level <= 4)
- run_hour_records.hours_recorded: CHECK (hours_recorded >= 0)
- parameters.warning_threshold_percent: INTEGER NOT NULL DEFAULT 80 (typically 0-100)

Rules:
- Database CHECK constraint enforces range
- Application should validate before database insert/update
- Negative values prevented where not allowed
- Upper bounds enforced for percentages, scores

Common Ranges:
- Confidence scores: 0.0000 to 1.0000
- Percentages: 0 to 100 (or 0.0000 to 1.0000)
- Days, hours: >= 0
- Escalation levels: 1 to 4 (or 1 to 5)



O.5 Email Format Validation

Enforcement: Application logic (with database UNIQUE constraint)

Coverage: Email address fields

Examples:
- users.email: TEXT NOT NULL UNIQUE
- companies.billing_email: TEXT NOT NULL

Rules:
- Application validates email format (RFC 5322 compliant)
- Database enforces UNIQUE constraint
- Email format validation: regex or library validation
- User-friendly error messages for invalid formats
- Email verification required (email_verified flag)

Validation Pattern:
- Basic format: user@domain.com
- More strict: RFC 5322 compliant validation
- Application-level validation before database insert

PLS Reference: Section B.10 (User Roles Logic)



O.6 Date Range Validation

Enforcement: Application logic

Coverage: Date fields with logical constraints

Examples:
- deadlines.due_date: Must not be in past (for new deadlines)
- documents.expiry_date: Must be after issue_date (if both present)
- aer_documents.reporting_period_end: Must be after reporting_period_start
- schedules.base_date: Used for deadline calculations
- run_hour_records.recording_date: Must not be in future

Rules:
- Application validates date ranges before database insert/update
- Business logic enforces date relationships
- Past dates allowed for historical data
- Future dates allowed for scheduled items
- Date comparisons validated in application layer

Common Validations:
- End date >= start date
- Deadline date >= current date (for new deadlines)
- Sample date <= current date (cannot be future)
- Expiry date >= issue date (if both present)



O.7 Foreign Key Validation

Enforcement: Database constraint (FOREIGN KEY)

Coverage: All foreign key relationships

Examples:
- sites.company_id → companies.id
- documents.site_id → sites.id
- obligations.document_id → documents.id
- schedules.obligation_id → obligations.id

Rules:
- Database enforces referential integrity
- Foreign key must reference existing primary key
- Cascade rules: ON DELETE CASCADE or ON DELETE SET NULL
- Application should handle foreign key violations gracefully
- User-friendly error messages for orphaned references

Cascade Rules:
- ON DELETE CASCADE: Child records deleted when parent deleted
- ON DELETE SET NULL: Foreign key set to NULL when parent deleted
- See Section I (Relationship Definitions) for cascade rules per relationship

All Foreign Keys: See Section C (Database Tables) for complete foreign key definitions



O.8 Business Rule Validation

Enforcement: Application logic

Coverage: Complex business rules that cannot be enforced at database level

Examples:

Module Activation Rules:
- Prerequisites enforced by querying modules.requires_module_id (dynamic, not hardcoded)
- Deactivation blocked if dependent modules (via requires_module_id) are active (queried dynamically)
- Validation: Application queries modules table to check prerequisites before activation

Evidence Linking Rules:
- Evidence cannot be linked to obligations on different sites
- Evidence upload date must be <= current date
- Evidence must exist and obligation must not be archived
- Validation: Application validates before creating link

Obligation Completion Rules:
- Subjective obligations require interpretation notes before completion
- Obligations cannot be marked complete without evidence (unless N/A)
- Validation: Application enforces completion requirements

Deadline Calculation Rules:
- Deadlines calculated from schedules and base dates
- Business day adjustments applied if configured
- Validation: Application validates deadline calculations

Confidence Score Rules:
- Confidence score must be 0.00-1.00
- Low confidence (<70%) requires human review
- Validation: Application enforces review requirements

PLS Reference: Section A.1.3 (Module Activation Rules), Section B.4.2 (Evidence Linking Validation), Section A.6.3 (Subjective Flag Workflow)



O.9 Data Type Validation

Enforcement: Database type system and Application logic

Coverage: All fields

Examples:
- UUID fields: Must be valid UUID format
- DATE fields: Must be valid date format (YYYY-MM-DD)
- TIMESTAMP fields: Must be valid timestamp format
- DECIMAL fields: Must be valid numeric format with correct precision
- JSONB fields: Must be valid JSON
- TEXT[] fields: Must be valid array format

Rules:
- Database type system enforces basic format
- Application validates before database insert/update
- Type conversion handled in application layer
- User-friendly error messages for type mismatches

Type Validation:
- UUID: PostgreSQL UUID type validation
- DATE: PostgreSQL DATE type validation
- TIMESTAMP: PostgreSQL TIMESTAMP WITH TIME ZONE validation
- DECIMAL: Precision and scale validation
- JSONB: JSON syntax validation
- ARRAY: Array format validation



O.10 File Upload Validation

Enforcement: Application logic

Coverage: File uploads (documents, evidence)

Examples:
- documents: PDF files only, max 50MB
- evidence_items: PDF, images, CSV, XLSX, ZIP, max size varies by type

Rules:
- File type validation: Check MIME type and extension
- File size validation: Enforce maximum sizes
- File content validation: Verify file is not corrupted
- Virus scanning: Optional but recommended
- Storage validation: Verify storage path is valid

File Type Limits:
- Documents: PDF only, 50MB max
- Evidence: PDF (50MB), Images (20MB), CSV/XLSX (10MB), ZIP (100MB)

PLS Reference: Section B.1.1 (Upload Flow), Section H.1 (Evidence Capture Logic), Section H.6 (Evidence Types)



O.11 Extraction Validation

Enforcement: Application logic

Coverage: LLM extraction results

Examples:
- obligations: Required fields check, logical consistency, deduplication
- parameters: Limit value validation, unit validation
- generators: Capacity validation, limit validation

Rules:

Required Fields Check:
- obligations.text: Must be non-empty
- obligations.category: Must be valid enum value
- obligations.frequency: Must be valid enum value OR null (flagged for review)
- obligations.confidence_score: Must be 0.00-1.00

Logical Consistency Check:
- If is_subjective = true, subjective_phrases must be non-empty
- If frequency = ONE_TIME, deadline_date or deadline_relative must be present
- page_reference must be <= document page count

Deduplication Check:
- Compare against existing obligations for same document
- If >80% text similarity with existing obligation, flag as potential duplicate

PLS Reference: Section B.2.4 (Extraction Validation Rules)



O.12 Validation Summary

Database-Level Validation:
- NOT NULL constraints (required fields)
- UNIQUE constraints (unique fields)
- CHECK constraints (enum values, ranges)
- FOREIGN KEY constraints (referential integrity)
- Data type validation (PostgreSQL types)

Application-Level Validation:
- Email format validation
- Date range validation
- Business rule validation
- File upload validation
- Extraction validation
- Complex cross-field validation

Validation Enforcement:
- Database constraints: Always enforced, cannot be bypassed
- Application validation: Enforced before database operations
- Both: Database as safety net, application for user experience

Error Handling:
- Database constraint violations: Caught and converted to user-friendly messages
- Application validation errors: Displayed to user before database operation
- Validation errors prevent invalid data entry

Best Practices:
- Validate early (client-side and server-side)
- Provide clear error messages
- Validate at multiple layers (defense in depth)
- Use database constraints as final safety net
- Log validation failures for monitoring
