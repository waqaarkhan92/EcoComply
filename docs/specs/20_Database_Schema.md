# Database Schema
## EcoComply Platform — Document 2.2

**EcoComply v1.0 — Launch-Ready / Last updated: 2025-12-01**

**Document Version:** 1.6
**Status:** Complete - Updated to Match Production Implementation
**Created by:** Cursor
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Canonical Dictionary (1.2) - Complete
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Technical Architecture (2.1) - Complete

**Purpose:** Defines the complete database structure, including all tables, fields, indexes, constraints, and relationships for the EcoComply platform.

> **📋 IMPLEMENTATION STATUS NOTE (2025-02-01):**
> This schema document defines the complete database structure. For implementation status of business logic that uses these tables, see:
> - `docs/BUSINESS_LOGIC_COMPARISON.md` - Two-way comparison between codebase and Product Business Logic specification
> - `docs/specs/30_Product_Business_Logic.md` - Contains implementation status notes for each section

> [v1.6 UPDATE - Added 20+ Missing Production Tables - 2025-02-03]
> - Added Module 1 advanced tables (enforcement notices, compliance decisions, condition rules/permissions)
> - Added Module 2 advanced tables (sampling logistics, reconciliation, consent states, predictive analytics)
> - Added Module 3 advanced tables (fuel usage logs, sulphur content reports)
> - Added Pack system enhancements (pack contents, pack access logs)
> - Added System tables (worker health, initialization)
> [v1 UPDATE – Version Header – 2024-12-27]

---

## Version History

### Version 1.6 (2025-02-03)
**Major Update: Production Implementation Alignment**

This version documents all tables actually implemented in production that were missing from previous spec versions:

**Module 1 Advanced Tables (5 tables added):**
- `enforcement_notices` - Regulatory enforcement action tracking with full lifecycle (ISSUED → IN_RESPONSE → CLOSED → APPEALED)
- `compliance_decisions` - Compliance decision records with evidence links and reasoning
- `condition_evidence_rules` - Evidence mapping rules at condition level (required types, frequency, mandatory flag)
- `condition_permissions` - Permission tracking per condition (discharge permits, operational hours, material storage)
- `evidence_completeness_scores` - Automated evidence completeness calculation per obligation

**Module 2 Advanced Tables (8 tables added):**
- `sampling_logistics` - Laboratory sample workflow tracking (SCHEDULED → SAMPLED → SUBMITTED → RECEIVED → COMPLETED)
- `monthly_statements` - Water company billing statement records for reconciliation
- `statement_reconciliations` - Reconciliation of billed vs actual volumes with discrepancy tracking
- `reconciliation_discrepancies` - Individual discrepancy records with reason codes
- `reconciliation_rules` - Calculation rules for concentration × volume reconciliation
- `consent_states` - Consent lifecycle state machine (DRAFT → IN_FORCE → SUPERSEDED → EXPIRED)
- `breach_likelihood_scores` - Predictive analytics: breach likelihood scoring with risk levels
- `predictive_breach_alerts` - Early warning alerts for imminent breaches with recommended actions

**Module 3 Advanced Tables (2 tables added):**
- `fuel_usage_logs` - Daily/monthly fuel consumption tracking with sulphur content verification
- `sulphur_content_reports` - Sulphur content test results from labs with validity periods

**Pack System Enhancements (2 tables added):**
- `pack_contents` - Version-locked evidence items included in generated packs
- `pack_access_logs` - Regulator access tracking (email, IP address, timestamp, view/download counts)

**System Tables (2 tables added):**
- `worker_health_logs` - Background worker health monitoring and heartbeat tracking
- `initialization_logs` - System initialization and setup audit trail

**Total Tables Added:** 19 tables
**Total Tables in Schema:** 100+ tables

### Version 1.5 (2025-01-01)
**Major Update: Standardized Audit Pack Specification**

This version standardizes audit pack generation across all modules:

**Audit Pack Standardization:**
- Enhanced `audit_packs` table with standardized fields:
  - `compliance_score` (INTEGER 0-100) - Site-level compliance score at generation time
  - `compliance_score_breakdown` (JSONB) - Detailed score calculation breakdown
  - `obligation_summary` (JSONB) - Obligation list with statuses
  - `evidence_summary` (JSONB) - Evidence attachments summary (version-locked)
  - `change_justification_history` (JSONB) - Change justification & signoff history
  - `compliance_clock_summary` (JSONB) - Compliance Clock summary (overdue + upcoming)
  - `pack_provenance_signature` (JSONB) - Pack provenance: timestamp + signer + hash
  - `generation_sla_seconds` (INTEGER) - Actual generation time (must be < 120 seconds)
  - `secure_access_token` (TEXT) - Secure link token for regulator access (no login required)
  - `secure_access_expires_at` (TIMESTAMP) - Optional expiry for secure link
- Added `pack_contents` table - Stores version-locked evidence items included in pack
- Added `pack_access_logs` table - Tracks regulator access (email, IP, timestamp, views, downloads)
- Standardized pack generation SLA: < 2 minutes (< 120 seconds)
- All packs must include: Compliance Score, Obligation list, Evidence (version-locked), Change justification, Compliance Clock summary, Pack provenance signature

### Version 1.4 (2025-01-01)
**Major Update: Compliance Score System**

This version adds the Compliance Score system across all modules:

**Compliance Score Fields:**
- Added `compliance_score` (INTEGER 0-100) to `sites` table - Site-level compliance score
- Added `compliance_score_updated_at` to `sites` table - Tracks last score calculation
- Added `compliance_score` (INTEGER 0-100) to `module_activations` table - Module-level compliance score per site
- Added `compliance_score_updated_at` to `module_activations` table - Tracks last module score calculation
- Added indexes on compliance_score fields for efficient querying

**Score Calculation:**
- Scores calculated automatically based on obligations due vs completed and evidenced
- Scores update in real-time when obligations are completed, evidenced, or become overdue
- Site-level score is aggregate of all active module scores
- Module-level scores calculated independently per module

### Version 1.3 (2025-12-01)
**Major Update: Missing Features from Gap Analysis**

This version adds critical database structures identified in the gap analysis between the High Level Product Plan and existing schema:

**Cross-Cutting Features:**
- Added `compliance_clocks_universal` table - Universal compliance clock supporting all modules with Red/Amber/Green criticality
- Added `compliance_clock_dashboard` materialized view - Aggregated compliance metrics by company/site/module
- Added `escalation_workflows` table - Configurable escalation rules per company/obligation type

**Module 1 Enhancements (Environmental Permits):**
- Added `permit_workflows` table - Track variation/renewal/surrender workflows
- Added `permit_variations` table - Track permit variation details and impact
- Added `permit_surrenders` table - Track permit surrender process and final closure
- Enhanced `deadlines` table with SLA tracking fields (sla_target_date, sla_breached_at, sla_breach_duration_hours)
- Enhanced `recurrence_trigger_rules` table with event linkage and execution tracking
- Added `recurrence_trigger_executions` table - Audit trail for trigger executions

**Module 2 & 4 Enhancements (Trade Effluent & Hazardous Waste):**
- Enhanced `corrective_actions` table with full lifecycle support (lifecycle_phase, root_cause_analysis, impact_assessment, regulator_notification_required, closure_approved_by)
- Added `corrective_action_items` table - Track individual action items within corrective actions

**Module 3 Enhancements (MCPD/Generators):**
- Enhanced `runtime_monitoring` table with reason codes (entry_reason_code, entry_reason_notes, validation_status, csv_import_id)
- Added `fuel_usage_logs` table - Track daily/monthly fuel consumption with sulphur content
- Added `sulphur_content_reports` table - Store sulphur content test results and compliance verification

**Module 4 Enhancements (Hazardous Waste):**
- Added `validation_rules` table - Configurable validation rules for consignment notes
- Added `validation_executions` table - Track validation rule execution results
- Enhanced `consignment_notes` table with pre-validation fields (pre_validation_status, pre_validation_errors, pre_validated_at)

---

# Table of Contents

1. [Schema Overview](#1-schema-overview)
   - [1.6 Table Creation Order](#16-table-creation-order)
2. [Core Entity Tables](#2-core-entity-tables)
3. [Module Registry Table](#3-module-registry-table)
4. [Module 1 Tables (Environmental Permits)](#4-module-1-tables-environmental-permits)
5. [Module 2 Tables (Trade Effluent)](#5-module-2-tables-trade-effluent)
6. [Module 3 Tables (MCPD/Generators)](#6-module-3-tables-mcpdgenerators)
7. [System Tables](#7-system-tables)
8. [Cross-Module Tables](#8-cross-module-tables)
9. [AI/Extraction Tables](#9-aiextraction-tables)
10. [Indexes](#10-indexes)
11. [Constraints](#11-constraints)
12. [Enums](#12-enums)
13. [Database Extensions](#13-database-extensions)
14. [RLS Enablement](#14-rls-enablement)
15. [Validation Rules](#15-validation-rules)

---

# 1. Schema Overview

## 1.1 Database Platform

**Platform:** PostgreSQL 15+ (Supabase)

**Reference:** Technical Architecture Section 1.1

**Key Features:**
- Native Row Level Security (RLS) for multi-tenant isolation
- JSONB support for flexible metadata storage
- Full-text search capabilities
- UUID primary keys for distributed systems
- Connection pooling via PgBouncer

**Region:** EU (London) - for UK data residency compliance

**Connection Pooling:**
- Development: 60 connections per pool
- Production: 200 connections per pool
- Use connection pooler URL for all application connections

## 1.2 Naming Conventions

**Reference:** Canonical Dictionary Section A

**Table Names:**
- Plural, snake_case (e.g., `companies`, `obligations`, `evidence_items`)
- No prefixes (no `tbl_`, `t_`, etc.)
- Full words (no abbreviations)

**Field Names:**
- snake_case (e.g., `company_id`, `created_at`, `is_subjective`)
- Boolean fields: prefix with `is_` or `has_` (e.g., `is_active`, `has_evidence`)
- Timestamp fields: suffix with `_at` (e.g., `created_at`, `updated_at`)
- Date fields: suffix with `_date` (e.g., `deadline_date`, `expiry_date`)
- Foreign keys: `{referenced_table_singular}_id` (e.g., `company_id`, `site_id`)

**Index Names:**
- Format: `idx_{table}_{column(s)}`
- Examples: `idx_obligations_document_id`, `idx_deadlines_status_due_date`

**Constraint Names:**
- Primary key: `{table}_pkey`
- Foreign key: `fk_{table}_{referenced_table}`
- Unique: `uq_{table}_{column(s)}`
- Check: `chk_{table}_{column}`

## 1.3 Primary Key Strategy

**All tables use UUID primary keys:**
- Column name: `id`
- Type: `UUID`
- Default: `gen_random_uuid()`
- Index: Auto-created as `{table}_pkey`

**Benefits:**
- Globally unique identifiers
- No sequential ID conflicts in distributed systems
- Better security (non-guessable IDs)

## 1.4 Audit Fields (Standard on All Tables)

All tenant-scoped tables include standard audit fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
deleted_at TIMESTAMP WITH TIME ZONE
```

**Field Descriptions:**
- `id`: Unique identifier (UUID)
- `created_at`: Record creation timestamp (UTC)
- `updated_at`: Last update timestamp (UTC, auto-updated via trigger)
- `created_by`: User who created record (nullable, FK to users)
- `updated_by`: User who last updated record (nullable, FK to users)
- `deleted_at`: Soft delete timestamp (nullable, NULL = not deleted)

**Note:** Some tables may omit `created_by`/`updated_by` if not applicable (e.g., system tables).

## 1.5 RLS Enablement

**Strategy:** Row Level Security enabled on all tenant-scoped tables

**Reference:** Technical Architecture Section 1.3

**RLS Policy Structure:**
- SELECT policies: Based on user role and company/site membership
- INSERT policies: Based on user role and company/site assignment
- UPDATE policies: Based on user role and ownership
- DELETE policies: Based on user role (typically restricted to Owners/Admins)

**Note:** Detailed RLS policies will be defined in Document 2.8 (RLS & Permissions Rules).

**Tables with RLS Disabled:**
- `system_settings` (global settings)
- `background_jobs` (system table, may be tenant-scoped in future)
- `dead_letter_queue` (system table)

## 1.6 Table Creation Order

**IMPORTANT:** Database tables must be created in the correct order to resolve foreign key dependencies.

**Phase 1: Core Tables (No Dependencies)**
1. `companies`
2. `users`
3. `sites`
4. `modules`

**Phase 2: User Management Tables**
5. `user_roles`
6. `user_site_assignments`

**Phase 3: Import Support Tables**
7. `excel_imports` ← **MUST be created before obligations**

**Phase 4: Module 1 Document Tables**
8. `documents`
9. `document_site_assignments`

**Phase 5: Module 1 Core Tables**
10. `obligations` (references excel_imports, documents)
11. `schedules`
12. `deadlines`
13. `evidence_items`
14. `obligation_evidence_links`
15. `permit_versions` (references documents)
16. `enforcement_notices` (references documents, obligations)
18. `compliance_decisions` (references obligations, deadlines, regulator_questions)
19. `condition_evidence_rules` (references documents, obligations)
20. `evidence_completeness_scores` (references obligations)
21. `recurrence_trigger_rules` (references schedules, obligations)
23. `recurrence_events` (references companies, sites)
24. `recurrence_conditions` (references schedules, recurrence_trigger_rules)
25. `regulator_questions`
26. `audit_packs`

**Phase 6: Module 2 Tables**
27. `parameters`
28. `lab_results`
29. `exceedances`
30. `consent_states` (references documents)
31. `corrective_actions` (references exceedances, parameters)
32. `sampling_logistics` (references parameters, documents, evidence_items, lab_results)
33. `reconciliation_rules` (references parameters, documents)
34. `breach_likelihood_scores` (references parameters)
35. `predictive_breach_alerts` (references parameters, breach_likelihood_scores)
36. `exposure_calculations` (references parameters, lab_results, discharge_volumes)
37. `monthly_statements` (references documents)
38. `statement_reconciliations` (references monthly_statements)
39. `reconciliation_discrepancies` (references statement_reconciliations)
40. `discharge_volumes`

**Phase 7: Module 3 Tables**
41. `generators`
42. `run_hour_records`
43. `stack_tests`
44. `maintenance_records`
45. `runtime_monitoring` (references generators)
46. `exemptions` (references generators)
47. `regulation_thresholds` (references companies)
49. `threshold_compliance_rules` (references regulation_thresholds, generators)
50. `frequency_calculations` (references generators, regulation_thresholds)
51. `aer_documents`

**Phase 8: Module 4 Tables**
52. `waste_streams` (references modules)
53. `contractor_licences`
54. `consignment_notes` (references waste_streams, contractor_licences, documents, evidence_items)
55. `chain_of_custody` (references consignment_notes, evidence_items)
56. `end_point_proofs` (references consignment_notes, documents, evidence_items)
57. `chain_break_alerts` (references consignment_notes, chain_of_custody)
58. `validation_rules` (references companies)
59. `validation_rule_configs` (references validation_rules, waste_streams, consignment_notes)
60. `validation_results` (references validation_rules, consignment_notes, waste_streams)

**Phase 9: System Tables**
42. `notifications`
43. `background_jobs`
44. `dead_letter_queue`
45. `audit_logs`
46. `review_queue_items`
47. `escalations`
48. `system_settings`

**Phase 10: Cross-Module Tables**
61. `recurring_tasks` (references schedules, obligations)
62. `evidence_expiry_tracking` (references evidence_items)
63. `condition_permissions` (references users, documents)
64. `pack_sharing` (references audit_packs)
65. `module_activations`
66. `cross_sell_triggers`
67. `extraction_logs`
68. `consultant_client_assignments`

**Phase 11: Rule Library & Learning Mechanism**
69. `rule_library_patterns`
70. `pattern_candidates`
71. `pattern_events`
72. `correction_records`

**Critical Foreign Key Dependencies:**
- `obligations.excel_import_id` → `excel_imports.id` (excel_imports MUST exist first)
- `obligations.document_id` → `documents.id`
- `deadlines.obligation_id` → `obligations.id`
- `obligation_evidence_links.obligation_id` → `obligations.id`
- `obligation_evidence_links.evidence_id` → `evidence_items.id`
- `permit_versions.document_id` → `documents.id`
- `consent_states.document_id` → `documents.id`
- `corrective_actions.exceedance_id` → `exceedances.id`
- `sampling_logistics.parameter_id` → `parameters.id`
- `runtime_monitoring.generator_id` → `generators.id`
- `exemptions.generator_id` → `generators.id`
- `consignment_notes.waste_stream_id` → `waste_streams.id`
- `consignment_notes.carrier_id` → `contractor_licences.id`
- `chain_of_custody.consignment_note_id` → `consignment_notes.id`
- `end_point_proofs.consignment_note_id` → `consignment_notes.id`
- `chain_break_alerts.consignment_note_id` → `consignment_notes.id`
- `recurring_tasks.schedule_id` → `schedules.id`
- `evidence_expiry_tracking.evidence_id` → `evidence_items.id`
- `pack_sharing.pack_id` → `audit_packs.id`

**Note:** The table definitions below are organized by functional area, not creation order. Use this section for actual database creation sequence.

---

# 2. Core Entity Tables

## 2.1 companies

**Purpose:** Stores customer organisation information

**Entity:** Company

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    billing_email TEXT NOT NULL,
    billing_address JSONB,
    phone TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'core' 
        CHECK (subscription_tier IN ('core', 'growth', 'consultant')),
    stripe_customer_id TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_created_at ON companies(created_at);
```

## 2.2 sites

**Purpose:** Stores physical location information for each company

**Entity:** Site

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

```sql
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT NOT NULL DEFAULT 'United Kingdom',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    site_reference TEXT,
    regulator TEXT CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA')),
    water_company TEXT,  -- Optional: Water company for Trade Effluent sites (e.g., 'Thames Water', 'Severn Trent')
    adjust_for_business_days BOOLEAN NOT NULL DEFAULT false,
    grace_period_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
    compliance_score INTEGER NOT NULL DEFAULT 100 CHECK (compliance_score >= 0 AND compliance_score <= 100),
    compliance_score_updated_at TIMESTAMP WITH TIME ZONE,
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sites_company_id ON sites(company_id);
CREATE INDEX idx_sites_is_active ON sites(is_active);
CREATE INDEX idx_sites_regulator ON sites(regulator);
CREATE INDEX idx_sites_compliance_score ON sites(compliance_score);
```

## 2.3 users

**Purpose:** Stores user account information

**Entity:** User

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    auth_provider_id TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "in_app": true}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

## 2.4 user_roles

**Purpose:** Join table assigning roles to users

**Entity:** UserRole (join entity)

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT', 'VIEWER')),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles(user_id, role);
```

## 2.5 user_site_assignments

**Purpose:** Join table assigning users to sites they can access

**Entity:** UserSiteAssignment (join entity)

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE user_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_site_assignments_user_id ON user_site_assignments(user_id);
CREATE INDEX idx_user_site_assignments_site_id ON user_site_assignments(site_id);
CREATE UNIQUE INDEX uq_user_site_assignments ON user_site_assignments(user_id, site_id);
```

---

# 3. Module Registry Table

## 3.1 modules

**Purpose:** Registry of all available modules (replaces hardcoded module_type enum). This table enables dynamic module addition without database schema changes.

**Entity:** Module

**RLS Enabled:** Yes

**Soft Delete:** No

**Critical:** This table replaces hardcoded module enums - all module references use `module_id` (UUID)

```sql
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code TEXT NOT NULL UNIQUE,
    module_name TEXT NOT NULL,
    module_description TEXT,
    requires_module_id UUID REFERENCES modules(id) ON DELETE RESTRICT,
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_site', 'per_company', 'per_document')),
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    document_types JSONB,
    cross_sell_keywords TEXT[] NOT NULL DEFAULT '{}',
    workflow_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_module_code ON modules(module_code);
CREATE INDEX idx_modules_is_active ON modules(is_active);
CREATE INDEX idx_modules_requires_module_id ON modules(requires_module_id);
CREATE INDEX idx_modules_is_default ON modules(is_default);
```

---

# 4. Module 1 Tables (Environmental Permits)

## 4.1 documents

**Purpose:** Stores all regulatory documents (permits, consents, registrations)

**Entity:** Document

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

**Special Fields:**
- `version_number`: TEXT, tracks document version (e.g., '1.0', '1.1')
- `version_history`: Not stored in documents table (handled via parent_document_id relationship)

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('ENVIRONMENTAL_PERMIT', 'TRADE_EFFLUENT_CONSENT', 'MCPD_REGISTRATION')),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    reference_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    regulator TEXT CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA', 'WATER_COMPANY')),
    water_company TEXT,
    issue_date DATE,
    effective_date DATE,
    expiry_date DATE,
    renewal_reminder_days INTEGER[] NOT NULL DEFAULT '{90, 30, 7}',
    status TEXT NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED')),
    version_number TEXT NOT NULL DEFAULT '1.0',
    version_state TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (version_state IN ('ACTIVE', 'SUPERSEDED', 'EXPIRED', 'DRAFT')),
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    is_native_pdf BOOLEAN NOT NULL DEFAULT true,
    ocr_confidence DECIMAL(5, 4),
    extraction_status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (extraction_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED', 'OCR_FAILED', 'PROCESSING_FAILED', 'ZERO_OBLIGATIONS', 'EXTRACTION_FAILED', 'MANUAL_MODE')),
    extracted_text TEXT,
    import_source TEXT CHECK (import_source IN ('PDF_EXTRACTION', 'EXCEL_IMPORT', 'MANUAL')),
    metadata JSONB NOT NULL DEFAULT '{}',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_site_id ON documents(site_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_module_id ON documents(module_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_documents_reference_number ON documents(reference_number);
CREATE INDEX idx_documents_parent_document_id ON documents(parent_document_id);
```

## 4.2 document_site_assignments

**Purpose:** Join table for multi-site shared permits (allows one document to be linked to multiple sites)

**Entity:** DocumentSiteAssignment (join entity)

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE document_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    obligations_shared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_site_assignments_document_id ON document_site_assignments(document_id);
CREATE INDEX idx_document_site_assignments_site_id ON document_site_assignments(site_id);
CREATE UNIQUE INDEX uq_document_site_assignments ON document_site_assignments(document_id, site_id);
```

## 4.3 obligations

**Purpose:** Stores compliance obligations extracted from documents

**Entity:** Obligation

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

**Special Fields:**
- `version_number`: INTEGER, increments on each edit (see PLS Section B.11)
- `version_history`: JSONB, array of previous obligation versions (immutable history)

```sql
CREATE TABLE obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    condition_reference TEXT,
    original_text TEXT NOT NULL,
    obligation_title TEXT NOT NULL,
    obligation_description TEXT,
    category TEXT NOT NULL DEFAULT 'RECORD_KEEPING' 
        CHECK (category IN ('MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE')),
    frequency TEXT CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED')),
    deadline_date DATE,
    deadline_relative TEXT,
    is_subjective BOOLEAN NOT NULL DEFAULT false,
    subjective_phrases TEXT[] NOT NULL DEFAULT '{}',
    interpretation_notes TEXT,
    interpreted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    interpreted_at TIMESTAMP WITH TIME ZONE,
    confidence_score DECIMAL(5, 4) NOT NULL DEFAULT 0 
        CHECK (confidence_score >= 0 AND confidence_score <= 1),
    confidence_components JSONB NOT NULL DEFAULT '{}',
    review_status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (review_status IN ('PENDING', 'CONFIRMED', 'EDITED', 'REJECTED', 'PENDING_INTERPRETATION', 'INTERPRETED', 'NOT_APPLICABLE')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    original_extraction JSONB,
    version_number INTEGER NOT NULL DEFAULT 1,
    version_history JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DUE_SOON', 'COMPLETED', 'OVERDUE', 'INCOMPLETE', 'LATE_COMPLETE', 'NOT_APPLICABLE', 'REJECTED')),
    is_high_priority BOOLEAN NOT NULL DEFAULT false,
    page_reference INTEGER,
    evidence_suggestions TEXT[] NOT NULL DEFAULT '{}',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_reason TEXT,
    source_pattern_id TEXT,
    import_source TEXT CHECK (import_source IN ('PDF_EXTRACTION', 'EXCEL_IMPORT', 'MANUAL')),
    excel_import_id UUID REFERENCES excel_imports(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_obligations_document_id ON obligations(document_id);
CREATE INDEX idx_obligations_company_id ON obligations(company_id);
CREATE INDEX idx_obligations_site_id ON obligations(site_id);
CREATE INDEX idx_obligations_module_id ON obligations(module_id);
CREATE INDEX idx_obligations_category ON obligations(category);
CREATE INDEX idx_obligations_status ON obligations(status);
CREATE INDEX idx_obligations_review_status ON obligations(review_status);
CREATE INDEX idx_obligations_is_subjective ON obligations(is_subjective);
CREATE INDEX idx_obligations_deadline_date ON obligations(deadline_date);
CREATE INDEX idx_obligations_assigned_to ON obligations(assigned_to);
CREATE INDEX idx_obligations_confidence_score ON obligations(confidence_score);
CREATE INDEX idx_obligations_document_status ON obligations(document_id, status) WHERE deleted_at IS NULL;

-- Business Logic Constraints
-- NOTE: Site/Document matching is enforced at application layer via triggers or validation
-- PostgreSQL CHECK constraints cannot contain subqueries, so this constraint is removed
-- Application must ensure obligation.site_id matches document.site_id before insert/update

-- Prevent duplicate obligations from same condition
CREATE UNIQUE INDEX uq_obligations_document_condition 
  ON obligations(document_id, condition_reference) 
  WHERE deleted_at IS NULL AND condition_reference IS NOT NULL;
```

## 4.4 schedules

**Purpose:** Stores monitoring schedules for obligations

**Entity:** Schedule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL 
        CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED')),
    base_date DATE NOT NULL,
    next_due_date DATE,
    last_completed_date DATE,
    is_rolling BOOLEAN NOT NULL DEFAULT false,
    adjust_for_business_days BOOLEAN NOT NULL DEFAULT false,
    reminder_days INTEGER[] NOT NULL DEFAULT '{7, 3, 1}',
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')),
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_at TIMESTAMP WITH TIME ZONE,
    previous_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_obligation_id ON schedules(obligation_id);
CREATE INDEX idx_schedules_next_due_date ON schedules(next_due_date);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Business Logic Constraints
-- Ensure schedules next_due_date is after base_date
ALTER TABLE schedules ADD CONSTRAINT chk_schedules_next_due_after_base
  CHECK (next_due_date IS NULL OR next_due_date >= base_date);
```

## 4.5 deadlines

**Purpose:** Stores individual deadline instances generated from schedules

**Entity:** Deadline

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    compliance_period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'DUE_SOON', 'COMPLETED', 'OVERDUE', 'INCOMPLETE', 'LATE_COMPLETE', 'NOT_APPLICABLE')),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completion_notes TEXT,
    is_late BOOLEAN NOT NULL DEFAULT false,
    sla_target_date DATE,
    sla_breached_at TIMESTAMP WITH TIME ZONE,
    sla_breach_duration_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deadlines_schedule_id ON deadlines(schedule_id);
CREATE INDEX idx_deadlines_obligation_id ON deadlines(obligation_id);
CREATE INDEX idx_deadlines_company_id ON deadlines(company_id);
CREATE INDEX idx_deadlines_site_id ON deadlines(site_id);
CREATE INDEX idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX idx_deadlines_status ON deadlines(status);
CREATE INDEX idx_deadlines_compliance_period ON deadlines(compliance_period);
CREATE INDEX idx_deadlines_company_status_due ON deadlines(company_id, status, due_date) 
  WHERE status IN ('PENDING', 'DUE_SOON', 'OVERDUE');

-- Business Logic Constraints
-- Ensure deadlines due_date is after created_at
ALTER TABLE deadlines ADD CONSTRAINT chk_deadlines_due_after_created
  CHECK (due_date >= created_at::date);

-- Ensure deadline company/site matches obligation
-- NOTE: Company/Site matching is enforced at application layer via triggers or validation
-- PostgreSQL CHECK constraints cannot contain subqueries, so this constraint is removed
-- Application must ensure deadline.company_id and deadline.site_id match obligation before insert/update
```

## 4.6 evidence_items

**Purpose:** Stores uploaded evidence files

**Entity:** EvidenceItem

**RLS Enabled:** Yes

**Soft Delete:** No (uses is_archived instead)

```sql
CREATE TABLE evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL 
        CHECK (file_type IN ('PDF', 'IMAGE', 'CSV', 'XLSX', 'ZIP')),
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    description TEXT,
    compliance_period TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    capture_timestamp TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    version_history JSONB NOT NULL DEFAULT '[]',
    file_hash TEXT NOT NULL,
    is_immutable BOOLEAN NOT NULL DEFAULT true,
    immutable_locked_at TIMESTAMP WITH TIME ZONE,
    immutable_locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    retention_policy TEXT DEFAULT 'STANDARD' 
        CHECK (retention_policy IN ('STANDARD', 'INCIDENT', 'IMPROVEMENT_CONDITION')),
    retention_period_years INTEGER NOT NULL DEFAULT 7 
        CHECK (retention_period_years >= 0),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_evidence_approved_at CHECK (
        (is_approved = true AND approved_at IS NOT NULL AND reviewer_id IS NOT NULL)
        OR
        (is_approved = false AND approved_at IS NULL)
    )
);

CREATE INDEX idx_evidence_items_company_id ON evidence_items(company_id);
CREATE INDEX idx_evidence_items_site_id ON evidence_items(site_id);
CREATE INDEX idx_evidence_items_file_type ON evidence_items(file_type);
CREATE INDEX idx_evidence_items_uploaded_by ON evidence_items(uploaded_by);
CREATE INDEX idx_evidence_items_reviewer_id ON evidence_items(reviewer_id);
CREATE INDEX idx_evidence_items_is_approved ON evidence_items(is_approved) WHERE is_approved = false;
CREATE INDEX idx_evidence_items_created_at ON evidence_items(created_at);
CREATE INDEX idx_evidence_items_compliance_period ON evidence_items(compliance_period);
CREATE INDEX idx_evidence_items_file_hash ON evidence_items(file_hash);
CREATE INDEX idx_evidence_items_site_period ON evidence_items(site_id, compliance_period) 
  WHERE is_archived = false;
```

## 4.7 obligation_evidence_links

**Purpose:** Join table linking evidence to obligations

**Entity:** ObligationEvidenceLink

**RLS Enabled:** Yes

**Soft Delete:** Yes (unlinked_at field)

```sql
CREATE TABLE obligation_evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
    compliance_period TEXT NOT NULL,
    notes TEXT,
    linked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unlinked_at TIMESTAMP WITH TIME ZONE,
    unlinked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unlink_reason TEXT
);

CREATE INDEX idx_obligation_evidence_links_obligation_id ON obligation_evidence_links(obligation_id);
CREATE INDEX idx_obligation_evidence_links_evidence_id ON obligation_evidence_links(evidence_id);
CREATE INDEX idx_obligation_evidence_links_compliance_period ON obligation_evidence_links(compliance_period);
CREATE UNIQUE INDEX uq_obligation_evidence_links ON obligation_evidence_links(obligation_id, evidence_id, compliance_period) 
    WHERE unlinked_at IS NULL;
```

## 4.8 permit_versions

**Purpose:** Tracks permit version history for change tracking and redline comparison

**Entity:** PermitVersion

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE permit_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    version_state TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (version_state IN ('ACTIVE', 'SUPERSEDED', 'EXPIRED', 'DRAFT')),
    parent_version_id UUID REFERENCES permit_versions(id) ON DELETE SET NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    redline_comparison JSONB,
    version_impact_analysis JSONB,
    change_summary TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_versions_document_id ON permit_versions(document_id);
CREATE INDEX idx_permit_versions_company_id ON permit_versions(company_id);
CREATE INDEX idx_permit_versions_site_id ON permit_versions(site_id);
CREATE INDEX idx_permit_versions_version_state ON permit_versions(version_state);
CREATE INDEX idx_permit_versions_parent_version_id ON permit_versions(parent_version_id);
```

## 4.9 enforcement_notices

**Purpose:** Tracks enforcement notices from regulators

**Entity:** EnforcementNotice

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE enforcement_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    notice_reference TEXT NOT NULL,
    regulator TEXT NOT NULL CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA')),
    notice_type TEXT NOT NULL 
        CHECK (notice_type IN ('WARNING', 'NOTICE', 'ENFORCEMENT_NOTICE', 'PROSECUTION')),
    issued_date DATE NOT NULL,
    response_deadline DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'RESPONSE_SUBMITTED', 'RESPONSE_ACKNOWLEDGED', 'RESOLVED', 'CLOSED', 'OVERDUE')),
    notice_text TEXT NOT NULL,
    response_text TEXT,
    response_submitted_date DATE,
    response_evidence_ids UUID[] NOT NULL DEFAULT '{}',
    regulator_acknowledged BOOLEAN NOT NULL DEFAULT false,
    resolved_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enforcement_notices_company_id ON enforcement_notices(company_id);
CREATE INDEX idx_enforcement_notices_site_id ON enforcement_notices(site_id);
CREATE INDEX idx_enforcement_notices_document_id ON enforcement_notices(document_id);
CREATE INDEX idx_enforcement_notices_obligation_id ON enforcement_notices(obligation_id);
CREATE INDEX idx_enforcement_notices_status ON enforcement_notices(status);
CREATE INDEX idx_enforcement_notices_response_deadline ON enforcement_notices(response_deadline);
```

## 4.11 compliance_decisions

**Purpose:** Documents justification for compliance decisions and creates audit trail

**Entity:** ComplianceDecision

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE compliance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    deadline_id UUID REFERENCES deadlines(id) ON DELETE SET NULL,
    decision_type TEXT NOT NULL 
        CHECK (decision_type IN ('NOT_APPLICABLE', 'FREQUENCY_OVERRIDE', 'DEADLINE_OVERRIDE', 'EVIDENCE_ACCEPTED', 'EVIDENCE_REJECTED', 'COMPLIANCE_APPROVED', 'COMPLIANCE_DISPUTED')),
    decision_text TEXT NOT NULL,
    justification TEXT NOT NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    regulator_question_id UUID REFERENCES regulator_questions(id) ON DELETE SET NULL,
    decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_decisions_company_id ON compliance_decisions(company_id);
CREATE INDEX idx_compliance_decisions_site_id ON compliance_decisions(site_id);
CREATE INDEX idx_compliance_decisions_obligation_id ON compliance_decisions(obligation_id);
CREATE INDEX idx_compliance_decisions_deadline_id ON compliance_decisions(deadline_id);
CREATE INDEX idx_compliance_decisions_decision_type ON compliance_decisions(decision_type);
CREATE INDEX idx_compliance_decisions_decision_date ON compliance_decisions(decision_date);
```

## 4.12 condition_evidence_rules

**Purpose:** Stores allowed evidence types per permit condition for condition-level evidence mapping

**Entity:** ConditionEvidenceRule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE condition_evidence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    condition_reference TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    allowed_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    required_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    evidence_requirements JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_condition_evidence_rules_document_id ON condition_evidence_rules(document_id);
CREATE INDEX idx_condition_evidence_rules_obligation_id ON condition_evidence_rules(obligation_id);
CREATE INDEX idx_condition_evidence_rules_condition_reference ON condition_evidence_rules(condition_reference);
CREATE INDEX idx_condition_evidence_rules_company_id ON condition_evidence_rules(company_id);
CREATE INDEX idx_condition_evidence_rules_site_id ON condition_evidence_rules(site_id);
CREATE INDEX idx_condition_evidence_rules_is_active ON condition_evidence_rules(is_active);
```

## 4.13 evidence_completeness_scores

**Purpose:** Tracks automated completeness scoring per condition/obligation

**Entity:** EvidenceCompletenessScore

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE evidence_completeness_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    condition_reference TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    compliance_period TEXT NOT NULL,
    completeness_score DECIMAL(5, 2) NOT NULL DEFAULT 0 
        CHECK (completeness_score >= 0 AND completeness_score <= 100),
    required_evidence_count INTEGER NOT NULL DEFAULT 0,
    provided_evidence_count INTEGER NOT NULL DEFAULT 0,
    missing_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    scoring_details JSONB NOT NULL DEFAULT '{}',
    last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_completeness_scores_obligation_id ON evidence_completeness_scores(obligation_id);
CREATE INDEX idx_evidence_completeness_scores_company_id ON evidence_completeness_scores(company_id);
CREATE INDEX idx_evidence_completeness_scores_site_id ON evidence_completeness_scores(site_id);
CREATE INDEX idx_evidence_completeness_scores_compliance_period ON evidence_completeness_scores(compliance_period);
CREATE INDEX idx_evidence_completeness_scores_completeness_score ON evidence_completeness_scores(completeness_score);
CREATE UNIQUE INDEX uq_evidence_completeness_scores ON evidence_completeness_scores(obligation_id, compliance_period) 
    WHERE condition_reference IS NULL;
CREATE UNIQUE INDEX uq_evidence_completeness_scores_condition ON evidence_completeness_scores(obligation_id, condition_reference, compliance_period) 
    WHERE condition_reference IS NOT NULL;
```

---

## 4.15 recurrence_trigger_rules

**Purpose:** Stores dynamic schedule rules (e.g., "6 months from commissioning")

**Entity:** RecurrenceTriggerRule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE recurrence_trigger_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL
        CHECK (rule_type IN ('DYNAMIC_OFFSET', 'EVENT_BASED', 'CONDITIONAL', 'FIXED')),
    rule_config JSONB NOT NULL DEFAULT '{}',
    trigger_expression TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    event_id UUID REFERENCES recurrence_events(id) ON DELETE SET NULL,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_date DATE,
    execution_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurrence_trigger_rules_schedule_id ON recurrence_trigger_rules(schedule_id);
CREATE INDEX idx_recurrence_trigger_rules_obligation_id ON recurrence_trigger_rules(obligation_id);
CREATE INDEX idx_recurrence_trigger_rules_company_id ON recurrence_trigger_rules(company_id);
CREATE INDEX idx_recurrence_trigger_rules_site_id ON recurrence_trigger_rules(site_id);
CREATE INDEX idx_recurrence_trigger_rules_rule_type ON recurrence_trigger_rules(rule_type);
CREATE INDEX idx_recurrence_trigger_rules_is_active ON recurrence_trigger_rules(is_active);
```

## 4.16 recurrence_events

**Purpose:** Defines events that can trigger recurrence

**Entity:** RecurrenceEvent

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE recurrence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL 
        CHECK (event_type IN ('COMMISSIONING', 'PERMIT_ISSUED', 'RENEWAL', 'VARIATION', 'ENFORCEMENT', 'CUSTOM')),
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurrence_events_company_id ON recurrence_events(company_id);
CREATE INDEX idx_recurrence_events_site_id ON recurrence_events(site_id);
CREATE INDEX idx_recurrence_events_event_type ON recurrence_events(event_type);
CREATE INDEX idx_recurrence_events_event_date ON recurrence_events(event_date);
CREATE INDEX idx_recurrence_events_is_active ON recurrence_events(is_active);
```

## 4.17 recurrence_conditions

**Purpose:** Stores conditional recurrence logic rules

**Entity:** RecurrenceCondition

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE recurrence_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    recurrence_trigger_rule_id UUID REFERENCES recurrence_trigger_rules(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL 
        CHECK (condition_type IN ('EVIDENCE_PRESENT', 'DEADLINE_MET', 'STATUS_CHANGE', 'CUSTOM')),
    condition_expression TEXT NOT NULL,
    condition_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurrence_conditions_schedule_id ON recurrence_conditions(schedule_id);
CREATE INDEX idx_recurrence_conditions_recurrence_trigger_rule_id ON recurrence_conditions(recurrence_trigger_rule_id);
CREATE INDEX idx_recurrence_conditions_company_id ON recurrence_conditions(company_id);
CREATE INDEX idx_recurrence_conditions_site_id ON recurrence_conditions(site_id);
CREATE INDEX idx_recurrence_conditions_condition_type ON recurrence_conditions(condition_type);
CREATE INDEX idx_recurrence_conditions_is_active ON recurrence_conditions(is_active);
```

## 4.18 audit_packs

> [v1 UPDATE – Pack Type Fields – 2024-12-27]

**Purpose:** Stores generated audit pack documents (all pack types: Audit, Regulator, Tender, Board, Insurer)

**Entity:** Pack (stored in `audit_packs` table — supports all 5 pack types)

**RLS Enabled:** Yes

**Soft Delete:** No

**v1.0 Note:** This table stores all pack types (Audit, Regulator, Tender, Board, Insurer). The table name `audit_packs` is maintained for backward compatibility.

```sql
CREATE TABLE audit_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- NULL for Board Pack (multi-site)
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL for Board Pack (multi-site), REQUIRED for all other pack types
    -- Validation: Board Pack MUST have site_id = NULL, all other pack types MUST have site_id NOT NULL
    CHECK ((pack_type = 'BOARD_MULTI_SITE_RISK' AND site_id IS NULL) OR (pack_type != 'BOARD_MULTI_SITE_RISK' AND site_id IS NOT NULL)),
    pack_type TEXT NOT NULL DEFAULT 'AUDIT_PACK'
        CHECK (pack_type IN (
            -- v1.0 Pack Types (primary)
            'AUDIT_PACK',
            'REGULATOR_INSPECTION',
            'TENDER_CLIENT_ASSURANCE',
            'BOARD_MULTI_SITE_RISK',
            'INSURER_BROKER',
            -- Legacy (deprecated, maintained for backward compatibility only)
            'COMBINED'
            -- Note: MODULE_1, MODULE_2, MODULE_3 pack types removed in v1.0
            -- Legacy packs with these types should be migrated to AUDIT_PACK
        )),
    title TEXT NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    filters_applied JSONB NOT NULL DEFAULT '{}',
    total_obligations INTEGER NOT NULL DEFAULT 0,
    complete_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    generation_time_ms INTEGER,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    generation_trigger TEXT NOT NULL DEFAULT 'MANUAL' 
        CHECK (generation_trigger IN ('MANUAL', 'SCHEDULED', 'PRE_INSPECTION', 'DEADLINE_BASED')),
    -- v1.0 Pack-specific fields
    recipient_type TEXT 
        CHECK (recipient_type IN ('REGULATOR', 'CLIENT', 'BOARD', 'INSURER', 'INTERNAL')),
    recipient_name TEXT,
    purpose TEXT,
    distribution_method TEXT 
        CHECK (distribution_method IN ('DOWNLOAD', 'EMAIL', 'SHARED_LINK')),
    shared_link_token TEXT UNIQUE,
    shared_link_expires_at TIMESTAMP WITH TIME ZONE,
    -- Standardized Pack Contents (Universal across all modules)
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100), -- Site-level score at generation time
    compliance_score_breakdown JSONB NOT NULL DEFAULT '{}', -- Detailed score calculation: {total_obligations, completed, overdue, module_scores: [...]}
    obligation_summary JSONB NOT NULL DEFAULT '[]', -- Obligation list with statuses: [{id, title, status, deadline_date, evidence_count, ...}]
    evidence_summary JSONB NOT NULL DEFAULT '[]', -- Evidence attachments summary (version-locked): [{id, title, file_type, uploaded_at, linked_to_obligations: [...], ...}]
    change_justification_history JSONB NOT NULL DEFAULT '[]', -- Change justification & signoff history: [{change_type, justification, signed_by, signed_at, ...}]
    compliance_clock_summary JSONB NOT NULL DEFAULT '{}', -- Compliance Clock summary: {overdue: [...], upcoming: [...], total_active: N}
    pack_provenance_signature JSONB NOT NULL DEFAULT '{}', -- Pack provenance: {timestamp, signer_id, signer_name, content_hash, version}
    generation_sla_seconds INTEGER, -- Actual generation time in seconds (must be < 120 for SLA compliance)
    -- Regulator Access (No Login Required)
    secure_access_token TEXT UNIQUE, -- Secure link token for regulator access (no login required)
    secure_access_expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry for secure access link
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_packs_document_id ON audit_packs(document_id) WHERE document_id IS NOT NULL; -- NULL for Board Pack
CREATE INDEX idx_audit_packs_company_id ON audit_packs(company_id);
CREATE INDEX idx_audit_packs_site_id ON audit_packs(site_id) WHERE site_id IS NOT NULL; -- NULL for Board Pack
CREATE INDEX idx_audit_packs_created_at ON audit_packs(created_at);
CREATE INDEX idx_audit_packs_generated_by ON audit_packs(generated_by);
CREATE INDEX idx_audit_packs_pack_type ON audit_packs(pack_type);
CREATE INDEX idx_audit_packs_shared_link_token ON audit_packs(shared_link_token) WHERE shared_link_token IS NOT NULL;
CREATE INDEX idx_audit_packs_secure_access_token ON audit_packs(secure_access_token) WHERE secure_access_token IS NOT NULL;
CREATE INDEX idx_audit_packs_compliance_score ON audit_packs(compliance_score) WHERE compliance_score IS NOT NULL;
CREATE INDEX idx_audit_packs_generation_sla ON audit_packs(generation_sla_seconds) WHERE generation_sla_seconds IS NOT NULL;
```

**v1.0 Pack Type Fields:**
- `pack_type`: Enum of 5 commercial pack types + legacy types
- `recipient_type`: Who the pack is for (REGULATOR, CLIENT, BOARD, INSURER, INTERNAL)
- `recipient_name`: Name of recipient (optional)
- `purpose`: Purpose of pack generation (optional)
- `distribution_method`: How pack was distributed (DOWNLOAD, EMAIL, SHARED_LINK)
- `shared_link_token`: Unique token for shareable links (nullable)
- `shared_link_expires_at`: Expiration timestamp for shared links (nullable)

**Migration Note:** Existing `audit_packs` records will have `pack_type = 'AUDIT_PACK'` by default. New v1.0 pack types can be added without migration.

---

## 4.13 consultant_client_assignments

> [v1 UPDATE – Consultant Control Centre – 2024-12-27]

**Purpose:** Tracks consultant assignments to client companies for Consultant Control Centre

**Entity:** ConsultantClientAssignment

**RLS Enabled:** Yes

**Soft Delete:** No (uses status field)

```sql
CREATE TABLE consultant_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(consultant_id, client_company_id)
);

CREATE INDEX idx_consultant_client_assignments_consultant_id ON consultant_client_assignments(consultant_id);
CREATE INDEX idx_consultant_client_assignments_client_company_id ON consultant_client_assignments(client_company_id);
CREATE INDEX idx_consultant_client_assignments_status ON consultant_client_assignments(status) WHERE status = 'ACTIVE';
```

**Business Logic:**
- Consultant must have `role = 'CONSULTANT'` in `user_roles` table
- Assignment grants consultant access to all sites within client company
- Status 'ACTIVE' grants access, 'INACTIVE' revokes access
- Unique constraint prevents duplicate assignments
- Historical assignments preserved (status change, not deletion)

**Reference:** Product Logic Specification Section C.5 (Consultant Control Centre Logic)

---

## 4.14 pack_contents

**Purpose:** Stores version-locked evidence items included in audit packs (snapshot at generation time)

**Entity:** PackContent

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE pack_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE RESTRICT,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    -- Version-locked snapshot data (immutable after pack generation)
    evidence_snapshot JSONB NOT NULL, -- {file_name, file_type, uploaded_at, uploaded_by, file_hash, ...}
    obligation_snapshot JSONB, -- {title, status, deadline_date, ...} if linked to obligation
    included_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pack_contents_pack_id ON pack_contents(pack_id);
CREATE INDEX idx_pack_contents_evidence_id ON pack_contents(evidence_id);
CREATE INDEX idx_pack_contents_obligation_id ON pack_contents(obligation_id) WHERE obligation_id IS NOT NULL;
CREATE UNIQUE INDEX uq_pack_contents_pack_evidence ON pack_contents(pack_id, evidence_id);
```

**Business Logic:**
- Evidence items are snapshotted at pack generation time (immutable)
- If evidence is deleted after pack generation, pack_contents record remains (evidence_id may become invalid)
- Pack contents provide audit trail of what was included in pack
- Version-locked data ensures pack integrity over time

---

## 4.15 pack_access_logs

**Purpose:** Tracks regulator/auditor access to audit packs via secure links (no login required)

**Entity:** PackAccessLog

**RLS Enabled:** No (system table, tracks external access)

**Soft Delete:** No

```sql
CREATE TABLE pack_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL, -- secure_access_token from audit_packs
    -- Identity tracking (mandatory for regulator access)
    accessor_email TEXT, -- Email provided by regulator (optional but recommended)
    accessor_ip_address INET NOT NULL, -- IP address of accessor
    accessor_user_agent TEXT, -- Browser/user agent string
    -- Access tracking
    first_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    view_count INTEGER NOT NULL DEFAULT 1, -- Number of times pack was viewed
    download_count INTEGER NOT NULL DEFAULT 0, -- Number of times pack was downloaded
    pages_viewed INTEGER[], -- Array of page numbers viewed (for PDF packs)
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pack_access_logs_pack_id ON pack_access_logs(pack_id);
CREATE INDEX idx_pack_access_logs_access_token ON pack_access_logs(access_token);
CREATE INDEX idx_pack_access_logs_accessor_ip ON pack_access_logs(accessor_ip_address);
CREATE INDEX idx_pack_access_logs_first_accessed ON pack_access_logs(first_accessed_at);
```

**Business Logic:**
- One log entry per unique accessor (identified by IP + user agent)
- Tracks all access events (views, downloads, page views)
- Identity tracking is mandatory (IP address required, email optional)
- Full audit trail for regulator access compliance

---

---

## 4.19 permit_workflows

**Purpose:** Tracks permit lifecycle workflows (variations, renewals, surrenders) as specified in Module 1 features

**Entity:** PermitWorkflow

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE permit_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL
        CHECK (workflow_type IN ('VARIATION', 'RENEWAL', 'SURRENDER')),
    status TEXT NOT NULL
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
    submitted_date DATE,
    regulator_response_deadline DATE,
    regulator_response_date DATE,
    regulator_comments TEXT,
    approval_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    workflow_notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_workflows_document_id ON permit_workflows(document_id);
CREATE INDEX idx_permit_workflows_status ON permit_workflows(status);
CREATE INDEX idx_permit_workflows_workflow_type ON permit_workflows(workflow_type);
CREATE INDEX idx_permit_workflows_submitted_date ON permit_workflows(submitted_date);
```

**Business Logic:**
- Tracks complete workflow lifecycle for permit changes
- `workflow_type`: Type of workflow (variation, renewal, or surrender)
- `status`: Current workflow status
- `regulator_response_deadline`: Expected date for regulator response
- `evidence_ids`: Array of evidence_items.id supporting the workflow
- Used to manage permit lifecycle changes and regulatory interactions

**Reference:** High Level Product Plan Module 1 - Permit Lifecycle Management

---

## 4.20 permit_variations

**Purpose:** Stores variation request details and impact assessment

**Entity:** PermitVariation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE permit_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES permit_workflows(id) ON DELETE CASCADE,
    variation_type TEXT NOT NULL,
    variation_description TEXT NOT NULL,
    requested_changes JSONB,
    impact_assessment JSONB,
    obligations_affected UUID[] NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_variations_document_id ON permit_variations(document_id);
CREATE INDEX idx_permit_variations_workflow_id ON permit_variations(workflow_id);
CREATE INDEX idx_permit_variations_variation_type ON permit_variations(variation_type);
```

**Business Logic:**
- Captures details of permit variation requests
- `requested_changes`: JSONB structure of specific changes requested
- `impact_assessment`: JSONB structure assessing impact on operations and compliance
- `obligations_affected`: Array of obligation IDs that will be impacted by variation
- Links to parent workflow for status tracking

**Reference:** High Level Product Plan Module 1 - Permit Variations

---

## 4.21 permit_surrenders

**Purpose:** Tracks permit surrender process including final inspections and site decommissioning

**Entity:** PermitSurrender

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE permit_surrenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES permit_workflows(id) ON DELETE CASCADE,
    surrender_reason TEXT NOT NULL,
    surrender_date DATE,
    final_inspection_date DATE,
    final_report_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    obligations_closed UUID[] NOT NULL DEFAULT '{}',
    site_decommission_complete BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_surrenders_document_id ON permit_surrenders(document_id);
CREATE INDEX idx_permit_surrenders_workflow_id ON permit_surrenders(workflow_id);
CREATE INDEX idx_permit_surrenders_surrender_date ON permit_surrenders(surrender_date);
CREATE INDEX idx_permit_surrenders_site_decommission_complete ON permit_surrenders(site_decommission_complete);
```

**Business Logic:**
- Manages permit surrender lifecycle
- `final_report_evidence_id`: Links to final surrender report evidence
- `obligations_closed`: Array of obligation IDs closed during surrender
- `site_decommission_complete`: Flag indicating all decommissioning activities complete
- Ensures proper closure and audit trail for permit termination

**Reference:** High Level Product Plan Module 1 - Permit Surrenders

---

## 4.22 recurrence_trigger_executions

**Purpose:** Audit trail of trigger execution history for debugging "why did this deadline get created?"

**Entity:** RecurrenceTriggerExecution

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE recurrence_trigger_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_rule_id UUID NOT NULL REFERENCES recurrence_trigger_rules(id) ON DELETE CASCADE,
    event_id UUID REFERENCES recurrence_events(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_due_date DATE,
    execution_result TEXT NOT NULL,
    execution_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurrence_trigger_executions_trigger_rule_id ON recurrence_trigger_executions(trigger_rule_id);
CREATE INDEX idx_recurrence_trigger_executions_event_id ON recurrence_trigger_executions(event_id);
CREATE INDEX idx_recurrence_trigger_executions_schedule_id ON recurrence_trigger_executions(schedule_id);
CREATE INDEX idx_recurrence_trigger_executions_execution_date ON recurrence_trigger_executions(execution_date);
```

**Business Logic:**
- Complete audit log of every trigger rule execution
- `execution_result`: Outcome of trigger execution (SUCCESS, FAILED, SKIPPED, etc.)
- `execution_data`: JSONB containing execution context and results
- `next_due_date`: The deadline date that was calculated/created
- Essential for debugging complex recurrence logic and understanding deadline generation

**Reference:** High Level Product Plan Module 1 - Recurrence Trigger Enhancements

---

## 4.18 enforcement_notices

**Purpose:** Track regulatory enforcement actions with full lifecycle management

**Entity:** Enforcement Notice

**RLS Enabled:** Yes

**Soft Delete:** Yes

```sql
CREATE TABLE enforcement_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    notice_type TEXT NOT NULL
        CHECK (notice_type IN ('ENFORCEMENT_NOTICE', 'SUSPENSION_NOTICE', 'REVOCATION_NOTICE', 'WARNING_LETTER')),
    reference_number TEXT NOT NULL,
    issued_date DATE NOT NULL,
    regulator TEXT NOT NULL CHECK (regulator IN ('EA', 'SEPA', 'NRW')),
    breach_description TEXT NOT NULL,
    required_actions TEXT NOT NULL,
    response_deadline DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ISSUED'
        CHECK (status IN ('ISSUED', 'IN_RESPONSE', 'CLOSED', 'APPEALED')),
    response_text TEXT,
    response_submitted_at TIMESTAMP WITH TIME ZONE,
    corrective_action_evidence_ids UUID[],
    closed_at TIMESTAMP WITH TIME ZONE,
    closure_notes TEXT,
    regulator_approval_document_id UUID REFERENCES documents(id),
    appeal_submitted_at TIMESTAMP WITH TIME ZONE,
    appeal_notes TEXT,
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_enforcement_notices_site_id ON enforcement_notices(site_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_enforcement_notices_company_id ON enforcement_notices(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_enforcement_notices_status ON enforcement_notices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_enforcement_notices_issued_date ON enforcement_notices(issued_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_enforcement_notices_response_deadline ON enforcement_notices(response_deadline) WHERE deleted_at IS NULL;
```

**Field Descriptions:**
- `notice_type`: Type of enforcement action (ENFORCEMENT_NOTICE, SUSPENSION_NOTICE, REVOCATION_NOTICE, WARNING_LETTER)
- `reference_number`: Regulator's reference number for the notice
- `breach_description`: Description of the breach that triggered enforcement
- `required_actions`: Actions required to resolve the breach
- `response_deadline`: Deadline for submitting response
- `status`: Current lifecycle status (ISSUED → IN_RESPONSE → CLOSED or APPEALED)
- `response_submitted_at`: Timestamp when response was submitted to regulator
- `corrective_action_evidence_ids`: Array of evidence item IDs supporting response
- `appeal_submitted_at`: Timestamp if notice is being appealed

**Business Rules:**
- Response must be submitted before response_deadline
- Status transitions: ISSUED → IN_RESPONSE (when response submitted) → CLOSED (when regulator satisfied) or APPEALED (if appealing)
- Escalations triggered if response_deadline approaching with no response
- Linked evidence must be retained for audit trail

---

## 4.19 compliance_decisions

**Purpose:** Track compliance decision records with evidence and reasoning

**Entity:** Compliance Decision

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE compliance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    decision_type TEXT NOT NULL
        CHECK (decision_type IN ('PERMIT_APPROVAL', 'PERMIT_DENIAL', 'VARIATION_APPROVAL', 'VARIATION_DENIAL', 'COMPLIANCE_CONFIRMED', 'NON_COMPLIANCE_IDENTIFIED')),
    decision_date DATE NOT NULL,
    decision_maker TEXT NOT NULL,
    decision_rationale TEXT NOT NULL,
    supporting_evidence_ids UUID[],
    conditions_attached TEXT,
    appeal_deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_compliance_decisions_site_id ON compliance_decisions(site_id);
CREATE INDEX idx_compliance_decisions_company_id ON compliance_decisions(company_id);
CREATE INDEX idx_compliance_decisions_obligation_id ON compliance_decisions(obligation_id);
CREATE INDEX idx_compliance_decisions_decision_date ON compliance_decisions(decision_date);
CREATE INDEX idx_compliance_decisions_decision_type ON compliance_decisions(decision_type);
```

**Field Descriptions:**
- `decision_type`: Type of compliance decision (PERMIT_APPROVAL, PERMIT_DENIAL, VARIATION_APPROVAL, etc.)
- `decision_maker`: Name/role of person making decision
- `decision_rationale`: Detailed reasoning for decision
- `supporting_evidence_ids`: Array of evidence item IDs supporting decision
- `conditions_attached`: Any conditions attached to approval
- `appeal_deadline`: Deadline for appealing decision (if applicable)

**Business Rules:**
- All decisions must have rationale documented
- Supporting evidence should be linked for audit trail
- Appeal deadline calculated based on regulator rules (typically 28 days)

---

## 4.20 condition_evidence_rules

**Purpose:** Define evidence mapping rules at the condition level

**Entity:** Condition Evidence Rule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE condition_evidence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    condition_text TEXT NOT NULL,
    required_evidence_types TEXT[] NOT NULL,
    evidence_frequency TEXT NOT NULL
        CHECK (evidence_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_TRIGGERED', 'CONTINUOUS')),
    rule_description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_condition_evidence_rules_obligation_id ON condition_evidence_rules(obligation_id);
CREATE INDEX idx_condition_evidence_rules_company_id ON condition_evidence_rules(company_id);
CREATE INDEX idx_condition_evidence_rules_site_id ON condition_evidence_rules(site_id);
CREATE INDEX idx_condition_evidence_rules_is_mandatory ON condition_evidence_rules(is_mandatory);
```

**Field Descriptions:**
- `condition_text`: The specific permit condition text
- `required_evidence_types`: Array of evidence types required (e.g., ['LAB_CERTIFICATE', 'MAINTENANCE_RECORD'])
- `evidence_frequency`: How often evidence must be provided
- `is_mandatory`: Whether evidence is mandatory or optional

**Business Rules:**
- Used to automatically flag missing evidence
- Evidence completeness scores calculated based on these rules
- Alerts generated when evidence missing for mandatory rules

---

## 4.21 condition_permissions

**Purpose:** Track permissions at the condition level

**Entity:** Condition Permission

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE condition_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL
        CHECK (permission_type IN ('DISCHARGE_PERMIT', 'OPERATIONAL_HOURS', 'MATERIAL_STORAGE', 'WASTE_HANDLING', 'EMISSIONS_LIMIT')),
    permission_details TEXT NOT NULL,
    granted_date DATE NOT NULL,
    expiry_date DATE,
    renewal_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_condition_permissions_obligation_id ON condition_permissions(obligation_id);
CREATE INDEX idx_condition_permissions_company_id ON condition_permissions(company_id);
CREATE INDEX idx_condition_permissions_site_id ON condition_permissions(site_id);
CREATE INDEX idx_condition_permissions_expiry_date ON condition_permissions(expiry_date);
CREATE INDEX idx_condition_permissions_renewal_required ON condition_permissions(renewal_required);
```

**Field Descriptions:**
- `permission_type`: Type of permission granted (DISCHARGE_PERMIT, OPERATIONAL_HOURS, etc.)
- `permission_details`: Detailed description of what is permitted
- `granted_date`: Date permission was granted
- `expiry_date`: Date permission expires (if applicable)
- `renewal_required`: Whether permission needs periodic renewal

**Business Rules:**
- Alerts generated when permissions approaching expiry
- Renewal deadlines calculated automatically if renewal_required = true

---

## 4.22 evidence_completeness_scores

**Purpose:** Automated evidence completeness calculation per obligation

**Entity:** Evidence Completeness Score

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE evidence_completeness_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    completeness_score INTEGER NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100),
    required_evidence_count INTEGER NOT NULL DEFAULT 0,
    provided_evidence_count INTEGER NOT NULL DEFAULT 0,
    missing_evidence_types TEXT[],
    calculation_method TEXT NOT NULL DEFAULT 'RULE_BASED',
    last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_completeness_scores_obligation_id ON evidence_completeness_scores(obligation_id);
CREATE INDEX idx_evidence_completeness_scores_company_id ON evidence_completeness_scores(company_id);
CREATE INDEX idx_evidence_completeness_scores_site_id ON evidence_completeness_scores(site_id);
CREATE INDEX idx_evidence_completeness_scores_completeness_score ON evidence_completeness_scores(completeness_score);
CREATE INDEX idx_evidence_completeness_scores_last_calculated_at ON evidence_completeness_scores(last_calculated_at);
```

**Field Descriptions:**
- `completeness_score`: Percentage score 0-100 indicating evidence completeness
- `required_evidence_count`: Total number of evidence items required
- `provided_evidence_count`: Number of evidence items actually provided
- `missing_evidence_types`: Array of evidence types that are missing
- `calculation_method`: Method used to calculate score (RULE_BASED, AI_ASSISTED, etc.)
- `last_calculated_at`: Timestamp of last score calculation

**Business Rules:**
- Score recalculated automatically when evidence linked/unlinked
- Score = (provided_evidence_count / required_evidence_count) × 100
- Alerts generated when completeness_score < 80%
- Used in pack generation to flag incomplete obligations

---

# 5. Module 2 Tables (Trade Effluent)

## 5.1 parameters

**Purpose:** Stores discharge parameters from trade effluent consents

**Entity:** Parameter

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    parameter_type TEXT NOT NULL 
        CHECK (parameter_type IN ('BOD', 'COD', 'SS', 'PH', 'TEMPERATURE', 'FOG', 'AMMONIA', 'PHOSPHORUS')),
    limit_value DECIMAL(12, 4) NOT NULL,
    unit TEXT NOT NULL,
    limit_type TEXT NOT NULL DEFAULT 'MAXIMUM' 
        CHECK (limit_type IN ('MAXIMUM', 'AVERAGE', 'RANGE')),
    range_min DECIMAL(12, 4),
    range_max DECIMAL(12, 4),
    sampling_frequency TEXT NOT NULL DEFAULT 'WEEKLY' 
        CHECK (sampling_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
    confidence_score DECIMAL(5, 4) NOT NULL DEFAULT 0 
        CHECK (confidence_score >= 0 AND confidence_score <= 1),
    warning_threshold_percent INTEGER NOT NULL DEFAULT 80,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parameters_document_id ON parameters(document_id);
CREATE INDEX idx_parameters_company_id ON parameters(company_id);
CREATE INDEX idx_parameters_site_id ON parameters(site_id);
CREATE INDEX idx_parameters_module_id ON parameters(module_id);
CREATE INDEX idx_parameters_parameter_type ON parameters(parameter_type);
CREATE INDEX idx_parameters_is_active ON parameters(is_active);
```

## 5.2 lab_results

**Purpose:** Stores laboratory sample results for parameters

**Entity:** LabResult

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    sample_date DATE NOT NULL,
    sample_id TEXT,
    recorded_value DECIMAL(12, 4) NOT NULL,
    unit TEXT NOT NULL,
    percentage_of_limit DECIMAL(8, 4) NOT NULL,
    lab_reference TEXT,
    entry_method TEXT NOT NULL DEFAULT 'MANUAL' 
        CHECK (entry_method IN ('MANUAL', 'CSV', 'PDF_EXTRACTION')),
    source_file_path TEXT,
    is_exceedance BOOLEAN NOT NULL DEFAULT false,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_results_parameter_id ON lab_results(parameter_id);
CREATE INDEX idx_lab_results_company_id ON lab_results(company_id);
CREATE INDEX idx_lab_results_site_id ON lab_results(site_id);
CREATE INDEX idx_lab_results_sample_date ON lab_results(sample_date);
CREATE INDEX idx_lab_results_is_exceedance ON lab_results(is_exceedance);
CREATE UNIQUE INDEX uq_lab_results_parameter_date ON lab_results(parameter_id, sample_date, sample_id);
```

## 5.3 exceedances

**Purpose:** Records parameter limit exceedances

**Entity:** Exceedance

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE exceedances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    recorded_value DECIMAL(12, 4) NOT NULL,
    limit_value DECIMAL(12, 4) NOT NULL,
    percentage_of_limit DECIMAL(8, 4) NOT NULL,
    recorded_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    corrective_action TEXT,
    notified_water_company BOOLEAN NOT NULL DEFAULT false,
    notification_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exceedances_parameter_id ON exceedances(parameter_id);
CREATE INDEX idx_exceedances_lab_result_id ON exceedances(lab_result_id);
CREATE INDEX idx_exceedances_company_id ON exceedances(company_id);
CREATE INDEX idx_exceedances_site_id ON exceedances(site_id);
CREATE INDEX idx_exceedances_status ON exceedances(status);
CREATE INDEX idx_exceedances_recorded_date ON exceedances(recorded_date);
```

## 5.4 consent_states

**Purpose:** Tracks consent validity state machine (Draft → In force → Superseded → Expired)

**Entity:** ConsentState

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE consent_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    state TEXT NOT NULL 
        CHECK (state IN ('DRAFT', 'IN_FORCE', 'SUPERSEDED', 'EXPIRED')),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    previous_state_id UUID REFERENCES consent_states(id) ON DELETE SET NULL,
    state_transition_reason TEXT,
    transitioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    transitioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_states_document_id ON consent_states(document_id);
CREATE INDEX idx_consent_states_company_id ON consent_states(company_id);
CREATE INDEX idx_consent_states_site_id ON consent_states(site_id);
CREATE INDEX idx_consent_states_state ON consent_states(state);
CREATE INDEX idx_consent_states_effective_date ON consent_states(effective_date);
CREATE INDEX idx_consent_states_previous_state_id ON consent_states(previous_state_id);
```

## 5.5 corrective_actions

**Purpose:** Tracks corrective action workflows for exceedances and breaches

**Entity:** CorrectiveAction

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exceedance_id UUID REFERENCES exceedances(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL
        CHECK (action_type IN ('IMMEDIATE_RESPONSE', 'ROOT_CAUSE_ANALYSIS', 'PREVENTIVE_MEASURE', 'PROCESS_CHANGE', 'EQUIPMENT_UPGRADE')),
    action_title TEXT NOT NULL,
    action_description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED')),
    completed_date DATE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    resolution_notes TEXT,
    lifecycle_phase TEXT
        CHECK (lifecycle_phase IN ('TRIGGER', 'INVESTIGATION', 'ACTION', 'RESOLUTION', 'CLOSURE')) DEFAULT 'TRIGGER',
    root_cause_analysis TEXT,
    impact_assessment JSONB,
    regulator_notification_required BOOLEAN NOT NULL DEFAULT false,
    regulator_justification TEXT,
    closure_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closure_approved_at TIMESTAMP WITH TIME ZONE,
    closure_requires_approval BOOLEAN NOT NULL DEFAULT true,
    chain_break_alert_id UUID REFERENCES chain_break_alerts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corrective_actions_exceedance_id ON corrective_actions(exceedance_id);
CREATE INDEX idx_corrective_actions_parameter_id ON corrective_actions(parameter_id);
CREATE INDEX idx_corrective_actions_company_id ON corrective_actions(company_id);
CREATE INDEX idx_corrective_actions_site_id ON corrective_actions(site_id);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX idx_corrective_actions_due_date ON corrective_actions(due_date);
CREATE INDEX idx_corrective_actions_assigned_to ON corrective_actions(assigned_to);
CREATE INDEX idx_corrective_actions_lifecycle_phase ON corrective_actions(lifecycle_phase);
CREATE INDEX idx_corrective_actions_chain_break_alert_id ON corrective_actions(chain_break_alert_id);
```

**Business Logic:**
- `lifecycle_phase`: Tracks progression through corrective action lifecycle (Trigger → Investigation → Action → Resolution → Closure)
- `root_cause_analysis`: Detailed analysis of underlying cause
- `impact_assessment`: JSONB structure assessing impact on operations and compliance
- `regulator_notification_required`: Flag indicating if regulator must be notified
- `regulator_justification`: Explanation for regulator on corrective action and closure
- `closure_approved_by`: User who approved final closure
- `closure_requires_approval`: Flag indicating if management approval needed for closure
- `chain_break_alert_id`: Links to chain break alert if corrective action is for hazardous waste chain breaks

**Reference:** High Level Product Plan Modules 2 & 4 - Corrective Action Lifecycle Enhancements

---

## 5.6 corrective_action_items

**Purpose:** Tracks individual action items within a corrective action workflow

**Entity:** CorrectiveActionItem

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE corrective_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corrective_action_id UUID NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
    item_title TEXT NOT NULL,
    item_description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    status TEXT NOT NULL
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'PENDING',
    completion_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corrective_action_items_corrective_action_id ON corrective_action_items(corrective_action_id);
CREATE INDEX idx_corrective_action_items_assigned_to ON corrective_action_items(assigned_to);
CREATE INDEX idx_corrective_action_items_status ON corrective_action_items(status);
CREATE INDEX idx_corrective_action_items_due_date ON corrective_action_items(due_date);
```

**Business Logic:**
- Breaks down corrective actions into discrete, trackable items
- Each item can be assigned to different users with separate due dates
- `completion_evidence_id`: Links to evidence proving item completion
- Enables granular tracking of complex corrective action workflows

**Reference:** High Level Product Plan Modules 2 & 4 - Corrective Action Items

---

## 5.7 sampling_logistics

**Purpose:** Tracks sampling logistics automation (reminders, collection, courier, lab, certificate ingestion)

**Entity:** SamplingLogistic

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE sampling_logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    sample_id TEXT,
    stage TEXT NOT NULL 
        CHECK (stage IN ('SCHEDULED', 'REMINDER_SENT', 'COLLECTION_SCHEDULED', 'COLLECTED', 'COURIER_BOOKED', 'IN_TRANSIT', 'LAB_RECEIVED', 'LAB_PROCESSING', 'CERTIFICATE_RECEIVED', 'EVIDENCE_LINKED', 'COMPLETED')),
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    collection_scheduled_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE,
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    courier_booked_at TIMESTAMP WITH TIME ZONE,
    courier_reference TEXT,
    in_transit_at TIMESTAMP WITH TIME ZONE,
    lab_received_at TIMESTAMP WITH TIME ZONE,
    lab_reference TEXT,
    lab_processing_at TIMESTAMP WITH TIME ZONE,
    certificate_received_at TIMESTAMP WITH TIME ZONE,
    certificate_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_linked_at TIMESTAMP WITH TIME ZONE,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sampling_logistics_parameter_id ON sampling_logistics(parameter_id);
CREATE INDEX idx_sampling_logistics_company_id ON sampling_logistics(company_id);
CREATE INDEX idx_sampling_logistics_site_id ON sampling_logistics(site_id);
CREATE INDEX idx_sampling_logistics_scheduled_date ON sampling_logistics(scheduled_date);
CREATE INDEX idx_sampling_logistics_stage ON sampling_logistics(stage);
CREATE INDEX idx_sampling_logistics_certificate_document_id ON sampling_logistics(certificate_document_id);
```

## 5.8 discharge_volumes

**Purpose:** Tracks discharge volumes for surcharge calculations

**Entity:** DischargeVolume

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE discharge_volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    recording_date DATE NOT NULL,
    volume_m3 DECIMAL(12, 4) NOT NULL,
    measurement_method TEXT,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discharge_volumes_document_id ON discharge_volumes(document_id);
CREATE INDEX idx_discharge_volumes_company_id ON discharge_volumes(company_id);
CREATE INDEX idx_discharge_volumes_site_id ON discharge_volumes(site_id);
CREATE INDEX idx_discharge_volumes_recording_date ON discharge_volumes(recording_date);
```

## 5.9 reconciliation_rules

**Purpose:** Stores rules for concentration × volume calculations

**Entity:** ReconciliationRule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL 
        CHECK (rule_type IN ('CONCENTRATION_VOLUME', 'MONTHLY_AVERAGE', 'PEAK_CONCENTRATION', 'CUSTOM')),
    calculation_formula TEXT NOT NULL,
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_rules_parameter_id ON reconciliation_rules(parameter_id);
CREATE INDEX idx_reconciliation_rules_document_id ON reconciliation_rules(document_id);
CREATE INDEX idx_reconciliation_rules_company_id ON reconciliation_rules(company_id);
CREATE INDEX idx_reconciliation_rules_site_id ON reconciliation_rules(site_id);
CREATE INDEX idx_reconciliation_rules_rule_type ON reconciliation_rules(rule_type);
CREATE INDEX idx_reconciliation_rules_is_active ON reconciliation_rules(is_active);
```

## 5.10 breach_likelihood_scores

**Purpose:** Tracks calculated breach likelihood per parameter/period

**Entity:** BreachLikelihoodScore

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE breach_likelihood_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    breach_likelihood_score DECIMAL(5, 2) NOT NULL 
        CHECK (breach_likelihood_score >= 0 AND breach_likelihood_score <= 100),
    risk_level TEXT NOT NULL 
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    exposure_value DECIMAL(12, 4),
    calculation_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breach_likelihood_scores_parameter_id ON breach_likelihood_scores(parameter_id);
CREATE INDEX idx_breach_likelihood_scores_company_id ON breach_likelihood_scores(company_id);
CREATE INDEX idx_breach_likelihood_scores_site_id ON breach_likelihood_scores(site_id);
CREATE INDEX idx_breach_likelihood_scores_calculation_date ON breach_likelihood_scores(calculation_date);
CREATE INDEX idx_breach_likelihood_scores_risk_level ON breach_likelihood_scores(risk_level);
```

## 5.11 predictive_breach_alerts

**Purpose:** Stores predictive alerts before breaches occur

**Entity:** PredictiveBreachAlert

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE predictive_breach_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    breach_likelihood_score_id UUID REFERENCES breach_likelihood_scores(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    alert_date DATE NOT NULL,
    predicted_breach_date DATE,
    risk_level TEXT NOT NULL 
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    alert_message TEXT NOT NULL,
    recommended_actions TEXT[] NOT NULL DEFAULT '{}',
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictive_breach_alerts_parameter_id ON predictive_breach_alerts(parameter_id);
CREATE INDEX idx_predictive_breach_alerts_company_id ON predictive_breach_alerts(company_id);
CREATE INDEX idx_predictive_breach_alerts_site_id ON predictive_breach_alerts(site_id);
CREATE INDEX idx_predictive_breach_alerts_alert_date ON predictive_breach_alerts(alert_date);
CREATE INDEX idx_predictive_breach_alerts_risk_level ON predictive_breach_alerts(risk_level);
CREATE INDEX idx_predictive_breach_alerts_is_acknowledged ON predictive_breach_alerts(is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX idx_predictive_breach_alerts_is_resolved ON predictive_breach_alerts(is_resolved) WHERE is_resolved = false;
```

## 5.12 exposure_calculations

**Purpose:** Stores calculated exposure values (concentration × volume)

**Entity:** ExposureCalculation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE exposure_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
    discharge_volume_id UUID REFERENCES discharge_volumes(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    concentration_value DECIMAL(12, 4) NOT NULL,
    volume_value DECIMAL(12, 4) NOT NULL,
    exposure_value DECIMAL(12, 4) NOT NULL,
    limit_value DECIMAL(12, 4) NOT NULL,
    percentage_of_limit DECIMAL(6, 2) NOT NULL,
    calculation_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exposure_calculations_parameter_id ON exposure_calculations(parameter_id);
CREATE INDEX idx_exposure_calculations_lab_result_id ON exposure_calculations(lab_result_id);
CREATE INDEX idx_exposure_calculations_discharge_volume_id ON exposure_calculations(discharge_volume_id);
CREATE INDEX idx_exposure_calculations_company_id ON exposure_calculations(company_id);
CREATE INDEX idx_exposure_calculations_site_id ON exposure_calculations(site_id);
CREATE INDEX idx_exposure_calculations_calculation_date ON exposure_calculations(calculation_date);
CREATE INDEX idx_exposure_calculations_percentage_of_limit ON exposure_calculations(percentage_of_limit);
```

## 5.13 monthly_statements

**Purpose:** Stores water company monthly statements

**Entity:** MonthlyStatement

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE monthly_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    statement_period_start DATE NOT NULL,
    statement_period_end DATE NOT NULL,
    statement_date DATE NOT NULL,
    total_volume_m3 DECIMAL(12, 4) NOT NULL,
    total_charge DECIMAL(10, 2),
    statement_reference TEXT,
    water_company_name TEXT NOT NULL,
    statement_data JSONB NOT NULL DEFAULT '{}',
    document_path TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monthly_statements_document_id ON monthly_statements(document_id);
CREATE INDEX idx_monthly_statements_company_id ON monthly_statements(company_id);
CREATE INDEX idx_monthly_statements_site_id ON monthly_statements(site_id);
CREATE INDEX idx_monthly_statements_statement_period_end ON monthly_statements(statement_period_end);
CREATE INDEX idx_monthly_statements_statement_date ON monthly_statements(statement_date);
```

## 5.14 statement_reconciliations

**Purpose:** Stores reconciliation records (statement vs actual volumes)

**Entity:** StatementReconciliation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE statement_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_statement_id UUID NOT NULL REFERENCES monthly_statements(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    statement_volume_m3 DECIMAL(12, 4) NOT NULL,
    actual_volume_m3 DECIMAL(12, 4) NOT NULL,
    variance_m3 DECIMAL(12, 4) NOT NULL,
    variance_percent DECIMAL(6, 2) NOT NULL,
    reconciliation_status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (reconciliation_status IN ('PENDING', 'IN_PROGRESS', 'RECONCILED', 'DISCREPANCY', 'RESOLVED')),
    reconciliation_notes TEXT,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_statement_reconciliations_monthly_statement_id ON statement_reconciliations(monthly_statement_id);
CREATE INDEX idx_statement_reconciliations_company_id ON statement_reconciliations(company_id);
CREATE INDEX idx_statement_reconciliations_site_id ON statement_reconciliations(site_id);
CREATE INDEX idx_statement_reconciliations_reconciliation_date ON statement_reconciliations(reconciliation_date);
CREATE INDEX idx_statement_reconciliations_reconciliation_status ON statement_reconciliations(reconciliation_status);
```

## 5.15 reconciliation_discrepancies

**Purpose:** Tracks discrepancies found during reconciliation

**Entity:** ReconciliationDiscrepancy

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_reconciliation_id UUID NOT NULL REFERENCES statement_reconciliations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    discrepancy_type TEXT NOT NULL 
        CHECK (discrepancy_type IN ('VOLUME_MISMATCH', 'MISSING_DATA', 'DUPLICATE_ENTRY', 'DATE_MISMATCH', 'OTHER')),
    discrepancy_description TEXT NOT NULL,
    discrepancy_value DECIMAL(12, 4),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' 
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_discrepancies_statement_reconciliation_id ON reconciliation_discrepancies(statement_reconciliation_id);
CREATE INDEX idx_reconciliation_discrepancies_company_id ON reconciliation_discrepancies(company_id);
CREATE INDEX idx_reconciliation_discrepancies_site_id ON reconciliation_discrepancies(site_id);
CREATE INDEX idx_reconciliation_discrepancies_discrepancy_type ON reconciliation_discrepancies(discrepancy_type);
CREATE INDEX idx_reconciliation_discrepancies_severity ON reconciliation_discrepancies(severity);
CREATE INDEX idx_reconciliation_discrepancies_is_resolved ON reconciliation_discrepancies(is_resolved) WHERE is_resolved = false;
```

---

# 6. Module 3 Tables (MCPD/Generators)

## 6.1 generators

**Purpose:** Stores generator/combustion plant information

**Entity:** Generator

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

```sql
CREATE TABLE generators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    generator_identifier TEXT NOT NULL,
    generator_type TEXT NOT NULL 
        CHECK (generator_type IN ('MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'EMERGENCY_GENERATOR')),
    capacity_mw DECIMAL(8, 4) NOT NULL,
    fuel_type TEXT NOT NULL,
    location_description TEXT,
    annual_run_hour_limit INTEGER NOT NULL DEFAULT 500,
    monthly_run_hour_limit INTEGER,
    anniversary_date DATE NOT NULL,
    emissions_nox DECIMAL(12, 4),
    emissions_so2 DECIMAL(12, 4),
    emissions_co DECIMAL(12, 4),
    emissions_particulates DECIMAL(12, 4),
    current_year_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_month_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    next_stack_test_due DATE,
    next_service_due DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_generators_document_id ON generators(document_id);
CREATE INDEX idx_generators_company_id ON generators(company_id);
CREATE INDEX idx_generators_generator_type ON generators(generator_type);
CREATE INDEX idx_generators_anniversary_date ON generators(anniversary_date);
CREATE INDEX idx_generators_is_active ON generators(is_active);
CREATE INDEX idx_generators_next_stack_test_due ON generators(next_stack_test_due);
```

## 6.2 run_hour_records

**Purpose:** Logs generator operating hours

**Entity:** RunHourRecord

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE run_hour_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recording_date DATE NOT NULL,
    hours_recorded DECIMAL(8, 2) NOT NULL CHECK (hours_recorded >= 0),
    running_total_year DECIMAL(10, 2) NOT NULL,
    running_total_month DECIMAL(10, 2) NOT NULL,
    percentage_of_annual_limit DECIMAL(6, 2) NOT NULL,
    percentage_of_monthly_limit DECIMAL(6, 2),
    entry_method TEXT NOT NULL DEFAULT 'MANUAL' 
        CHECK (entry_method IN ('MANUAL', 'CSV', 'MAINTENANCE_RECORD')),
    source_maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_run_hour_records_generator_id ON run_hour_records(generator_id);
CREATE INDEX idx_run_hour_records_company_id ON run_hour_records(company_id);
CREATE INDEX idx_run_hour_records_recording_date ON run_hour_records(recording_date);
CREATE INDEX idx_run_hour_records_percentage_of_annual_limit ON run_hour_records(percentage_of_annual_limit);
```

## 6.3 stack_tests

**Purpose:** Records stack emission test results

**Entity:** StackTest

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE stack_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    test_date DATE NOT NULL,
    test_company TEXT,
    test_reference TEXT,
    nox_result DECIMAL(12, 4),
    so2_result DECIMAL(12, 4),
    co_result DECIMAL(12, 4),
    particulates_result DECIMAL(12, 4),
    compliance_status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (compliance_status IN ('PENDING', 'PASS', 'FAIL', 'NON_COMPLIANT')),
    exceedances_found BOOLEAN NOT NULL DEFAULT false,
    exceedance_details TEXT,
    next_test_due DATE,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stack_tests_generator_id ON stack_tests(generator_id);
CREATE INDEX idx_stack_tests_company_id ON stack_tests(company_id);
CREATE INDEX idx_stack_tests_test_date ON stack_tests(test_date);
CREATE INDEX idx_stack_tests_compliance_status ON stack_tests(compliance_status);
CREATE INDEX idx_stack_tests_next_test_due ON stack_tests(next_test_due);
```

## 6.4 maintenance_records

**Purpose:** Stores generator maintenance/service records

**Entity:** MaintenanceRecord

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL,
    description TEXT,
    run_hours_at_service DECIMAL(10, 2),
    service_provider TEXT,
    service_reference TEXT,
    next_service_due DATE,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_records_generator_id ON maintenance_records(generator_id);
CREATE INDEX idx_maintenance_records_company_id ON maintenance_records(company_id);
CREATE INDEX idx_maintenance_records_maintenance_date ON maintenance_records(maintenance_date);
CREATE INDEX idx_maintenance_records_next_service_due ON maintenance_records(next_service_due);
```

## 6.5 aer_documents

**Purpose:** Stores Annual Emissions Report data and documents

**Entity:** AERDocument

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE aer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    submission_deadline DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'READY', 'SUBMITTED', 'ACKNOWLEDGED')),
    generator_data JSONB NOT NULL DEFAULT '[]',
    fuel_consumption_data JSONB NOT NULL DEFAULT '[]',
    emissions_data JSONB NOT NULL DEFAULT '[]',
    incidents_data JSONB NOT NULL DEFAULT '[]',
    total_run_hours DECIMAL(10, 2),
    is_validated BOOLEAN NOT NULL DEFAULT false,
    validation_errors JSONB NOT NULL DEFAULT '[]',
    generated_file_path TEXT,
    generated_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submission_reference TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aer_documents_document_id ON aer_documents(document_id);
CREATE INDEX idx_aer_documents_company_id ON aer_documents(company_id);
CREATE INDEX idx_aer_documents_reporting_period_end ON aer_documents(reporting_period_end);
CREATE INDEX idx_aer_documents_status ON aer_documents(status);
CREATE INDEX idx_aer_documents_submission_deadline ON aer_documents(submission_deadline);
```

## 6.6 runtime_monitoring

**Purpose:** Tracks automated runtime data capture from generator monitoring systems with alignment to frontend UI fields and Compliance Clock alerts

**Entity:** RuntimeMonitoring

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE runtime_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    runtime_hours DECIMAL(10, 2) NOT NULL CHECK (runtime_hours >= 0), -- Total cumulative runtime hours (for period/aggregation)
    run_duration DECIMAL(10, 2) NOT NULL CHECK (run_duration >= 0), -- Duration of this specific runtime entry in hours (supports partial day tracking, e.g., 8.5 hours)
    reason_code TEXT NOT NULL
        CHECK (reason_code IN ('Test', 'Emergency', 'Maintenance', 'Normal')),
    data_source TEXT NOT NULL
        CHECK (data_source IN ('AUTOMATED', 'MANUAL', 'MAINTENANCE_RECORD', 'INTEGRATION')),
    integration_system TEXT,
    integration_reference TEXT,
    raw_data JSONB,
    evidence_linkage_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    entry_reason_notes TEXT,
    validation_status TEXT
        CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    csv_import_id UUID,
    csv_row_number INTEGER,
    job_escalation_threshold_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_annual_limit_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_monthly_limit_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_runtime_monitoring_generator_id ON runtime_monitoring(generator_id);
CREATE INDEX idx_runtime_monitoring_company_id ON runtime_monitoring(company_id);
CREATE INDEX idx_runtime_monitoring_site_id ON runtime_monitoring(site_id);
CREATE INDEX idx_runtime_monitoring_run_date ON runtime_monitoring(run_date);
CREATE INDEX idx_runtime_monitoring_data_source ON runtime_monitoring(data_source);
CREATE INDEX idx_runtime_monitoring_reason_code ON runtime_monitoring(reason_code);
CREATE INDEX idx_runtime_monitoring_validation_status ON runtime_monitoring(validation_status);
CREATE INDEX idx_runtime_monitoring_csv_import_id ON runtime_monitoring(csv_import_id);
CREATE INDEX idx_runtime_monitoring_evidence_linkage_id ON runtime_monitoring(evidence_linkage_id);
CREATE INDEX idx_runtime_monitoring_job_escalation_flags ON runtime_monitoring(job_escalation_threshold_exceeded, job_escalation_annual_limit_exceeded, job_escalation_monthly_limit_exceeded) WHERE job_escalation_threshold_exceeded = true OR job_escalation_annual_limit_exceeded = true OR job_escalation_monthly_limit_exceeded = true;
```

**Business Logic:**
- `run_date`: Date when the generator runtime occurred (aligned with frontend UI field name)
- `runtime_hours`: Total cumulative runtime hours for the period (used for aggregation, limit checking, and reporting)
- `run_duration`: Duration of this specific runtime entry in hours (supports partial day tracking, e.g., 8.5 hours for a single run within the day)
  - Example: If generator runs 8.5 hours on 2025-01-01, then `run_duration = 8.5` and `runtime_hours = 8.5`
  - Example: If generator runs 4 hours in morning and 4.5 hours in afternoon on same day, create two entries:
    - Entry 1: `run_duration = 4.0`, `runtime_hours = 4.0`
    - Entry 2: `run_duration = 4.5`, `runtime_hours = 8.5` (cumulative for the day)
  - For most use cases, `runtime_hours` and `run_duration` will be the same value
  - `runtime_hours` is used for limit calculations and compliance checks
  - `run_duration` provides granular tracking for partial-day operations
- `reason_code`: Required reason code for runtime entry (Test, Emergency, Maintenance, Normal) - aligns with frontend UI dropdown
- `evidence_linkage_id`: Optional link to evidence item supporting the runtime entry
- `job_escalation_threshold_exceeded`: Flag set by background jobs when threshold is exceeded
- `job_escalation_annual_limit_exceeded`: Flag set by background jobs when annual limit is exceeded
- `job_escalation_monthly_limit_exceeded`: Flag set by background jobs when monthly limit is exceeded
- `job_escalation_notification_sent`: Flag to prevent duplicate notifications for the same exceedance
- `validation_status`: Workflow status for validating manual entries (PENDING, APPROVED, REJECTED)
- `validated_by`: User who validated the entry
- `csv_import_id`: Reference to CSV import batch for bulk imports
- `csv_row_number`: Original row number in CSV for traceability
- Provides audit defensibility for manual runtime data entries
- Escalation flags trigger Compliance Clock alerts and notifications

**Reference:** High Level Product Plan Module 3 - Runtime Monitoring Reason Codes, Compliance Clock Integration

---

## 6.7 exemptions

**Purpose:** Tracks emission exemption logic (testing vs emergency operation classification)

**Entity:** Exemption

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE exemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    exemption_type TEXT NOT NULL 
        CHECK (exemption_type IN ('TESTING', 'EMERGENCY_OPERATION', 'MAINTENANCE', 'OTHER')),
    start_date DATE NOT NULL,
    end_date DATE,
    duration_hours DECIMAL(10, 2),
    exemption_reason TEXT NOT NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    compliance_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exemptions_generator_id ON exemptions(generator_id);
CREATE INDEX idx_exemptions_company_id ON exemptions(company_id);
CREATE INDEX idx_exemptions_site_id ON exemptions(site_id);
CREATE INDEX idx_exemptions_exemption_type ON exemptions(exemption_type);
CREATE INDEX idx_exemptions_start_date ON exemptions(start_date);
CREATE INDEX idx_exemptions_compliance_verified ON exemptions(compliance_verified);
```

> [v1.6 UPDATE – Compliance Clocks Table Removed – 2025-01-01]
> - Removed `compliance_clocks` table (Module 3 specific)
> - Module 3 generator clocks now use `compliance_clocks_universal` table with `entity_type = 'GENERATOR'`
> - See Section 9.3 for `compliance_clocks_universal` table definition

## 6.8 regulation_thresholds

**Purpose:** Stores MW thresholds and corresponding monitoring frequencies

**Entity:** RegulationThreshold

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE regulation_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    threshold_type TEXT NOT NULL 
        CHECK (threshold_type IN ('MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'CUSTOM')),
    capacity_min_mw DECIMAL(8, 4) NOT NULL,
    capacity_max_mw DECIMAL(8, 4),
    monitoring_frequency TEXT NOT NULL 
        CHECK (monitoring_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CONTINUOUS')),
    stack_test_frequency TEXT NOT NULL 
        CHECK (stack_test_frequency IN ('ANNUAL', 'BIENNIAL', 'AS_REQUIRED')),
    reporting_frequency TEXT NOT NULL 
        CHECK (reporting_frequency IN ('ANNUAL', 'QUARTERLY', 'MONTHLY')),
    regulation_reference TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regulation_thresholds_company_id ON regulation_thresholds(company_id);
CREATE INDEX idx_regulation_thresholds_threshold_type ON regulation_thresholds(threshold_type);
CREATE INDEX idx_regulation_thresholds_capacity_range ON regulation_thresholds(capacity_min_mw, capacity_max_mw);
CREATE INDEX idx_regulation_thresholds_is_active ON regulation_thresholds(is_active);
```

## 6.10 threshold_compliance_rules

**Purpose:** Stores threshold-based compliance rules

**Entity:** ThresholdComplianceRule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE threshold_compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_threshold_id UUID NOT NULL REFERENCES regulation_thresholds(id) ON DELETE CASCADE,
    generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL 
        CHECK (rule_type IN ('MONITORING_FREQUENCY', 'STACK_TEST_FREQUENCY', 'REPORTING_FREQUENCY', 'RUN_HOUR_LIMIT', 'CUSTOM')),
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threshold_compliance_rules_regulation_threshold_id ON threshold_compliance_rules(regulation_threshold_id);
CREATE INDEX idx_threshold_compliance_rules_generator_id ON threshold_compliance_rules(generator_id);
CREATE INDEX idx_threshold_compliance_rules_company_id ON threshold_compliance_rules(company_id);
CREATE INDEX idx_threshold_compliance_rules_site_id ON threshold_compliance_rules(site_id);
CREATE INDEX idx_threshold_compliance_rules_rule_type ON threshold_compliance_rules(rule_type);
CREATE INDEX idx_threshold_compliance_rules_is_active ON threshold_compliance_rules(is_active);
```

## 6.11 frequency_calculations

**Purpose:** Stores calculated frequencies based on generator capacity

**Entity:** FrequencyCalculation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE frequency_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    regulation_threshold_id UUID NOT NULL REFERENCES regulation_thresholds(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    generator_capacity_mw DECIMAL(8, 4) NOT NULL,
    calculated_monitoring_frequency TEXT NOT NULL,
    calculated_stack_test_frequency TEXT NOT NULL,
    calculated_reporting_frequency TEXT NOT NULL,
    calculation_details JSONB NOT NULL DEFAULT '{}',
    is_applied BOOLEAN NOT NULL DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_frequency_calculations_generator_id ON frequency_calculations(generator_id);
CREATE INDEX idx_frequency_calculations_regulation_threshold_id ON frequency_calculations(regulation_threshold_id);
CREATE INDEX idx_frequency_calculations_company_id ON frequency_calculations(company_id);
CREATE INDEX idx_frequency_calculations_site_id ON frequency_calculations(site_id);
CREATE INDEX idx_frequency_calculations_calculation_date ON frequency_calculations(calculation_date);
CREATE INDEX idx_frequency_calculations_is_applied ON frequency_calculations(is_applied);
```

## 6.12 fuel_usage_logs

**Purpose:** Tracks daily/monthly fuel consumption for generators (required for MCPD reporting and AER generation)

**Entity:** FuelUsageLog

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE fuel_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    fuel_type TEXT NOT NULL
        CHECK (fuel_type IN ('NATURAL_GAS', 'DIESEL', 'GAS_OIL', 'HEAVY_FUEL_OIL', 'BIOMASS', 'BIOGAS', 'DUAL_FUEL', 'OTHER')),
    quantity DECIMAL(12, 4) NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'LITRES'
        CHECK (unit IN ('LITRES', 'CUBIC_METRES', 'TONNES', 'KILOGRAMS', 'MEGAWATT_HOURS')),
    sulphur_content_percentage DECIMAL(6, 4),
    sulphur_content_mg_per_kg DECIMAL(10, 4),
    entry_method TEXT NOT NULL DEFAULT 'MANUAL'
        CHECK (entry_method IN ('MANUAL', 'CSV', 'INTEGRATION', 'MAINTENANCE_RECORD')),
    source_maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    integration_system TEXT,
    integration_reference TEXT,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fuel_usage_logs_generator_id ON fuel_usage_logs(generator_id);
CREATE INDEX idx_fuel_usage_logs_company_id ON fuel_usage_logs(company_id);
CREATE INDEX idx_fuel_usage_logs_site_id ON fuel_usage_logs(site_id);
CREATE INDEX idx_fuel_usage_logs_log_date ON fuel_usage_logs(log_date);
CREATE INDEX idx_fuel_usage_logs_fuel_type ON fuel_usage_logs(fuel_type);
CREATE INDEX idx_fuel_usage_logs_entry_method ON fuel_usage_logs(entry_method);
```

**Business Logic:**
- `log_date`: Date when fuel was consumed
- `fuel_type`: Type of fuel used (must match generator fuel_type or be compatible)
- `quantity`: Amount of fuel consumed (must be >= 0)
- `unit`: Unit of measurement for quantity
- `sulphur_content_percentage`: Sulphur content as percentage (e.g., 0.0010 for 0.001%)
- `sulphur_content_mg_per_kg`: Sulphur content in mg/kg (alternative measurement)
- At least one sulphur content field should be provided for fuels that require sulphur reporting
- `entry_method`: How the data was captured (MANUAL, CSV, INTEGRATION, MAINTENANCE_RECORD)
- `evidence_id`: Optional link to fuel delivery receipts, invoices, or test certificates
- Used for AER generation and MCPD compliance reporting
- Supports manual entry with validation rules (zero-dependency principle)

**Reference:** High Level Product Plan Module 3 - Fuel usage logs + sulphur content reporting

## 6.13 sulphur_content_reports

**Purpose:** Stores sulphur content test results and compliance reports for fuel batches

**Entity:** SulphurContentReport

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE sulphur_content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL
        CHECK (fuel_type IN ('NATURAL_GAS', 'DIESEL', 'GAS_OIL', 'HEAVY_FUEL_OIL', 'BIOMASS', 'BIOGAS', 'DUAL_FUEL', 'OTHER')),
    test_date DATE NOT NULL,
    batch_reference TEXT,
    supplier_name TEXT,
    sulphur_content_percentage DECIMAL(6, 4) NOT NULL,
    sulphur_content_mg_per_kg DECIMAL(10, 4),
    test_method TEXT,
    test_standard TEXT,
    test_laboratory TEXT,
    test_certificate_reference TEXT,
    regulatory_limit_percentage DECIMAL(6, 4),
    regulatory_limit_mg_per_kg DECIMAL(10, 4),
    compliance_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (compliance_status IN ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXCEEDED')),
    exceedance_details TEXT,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sulphur_content_reports_generator_id ON sulphur_content_reports(generator_id);
CREATE INDEX idx_sulphur_content_reports_company_id ON sulphur_content_reports(company_id);
CREATE INDEX idx_sulphur_content_reports_site_id ON sulphur_content_reports(site_id);
CREATE INDEX idx_sulphur_content_reports_test_date ON sulphur_content_reports(test_date);
CREATE INDEX idx_sulphur_content_reports_fuel_type ON sulphur_content_reports(fuel_type);
CREATE INDEX idx_sulphur_content_reports_compliance_status ON sulphur_content_reports(compliance_status);
CREATE INDEX idx_sulphur_content_reports_batch_reference ON sulphur_content_reports(batch_reference);
```

**Business Logic:**
- `test_date`: Date when sulphur content test was performed
- `batch_reference`: Reference to fuel batch/delivery (links to fuel_usage_logs)
- `sulphur_content_percentage`: Tested sulphur content as percentage
- `sulphur_content_mg_per_kg`: Tested sulphur content in mg/kg
- `regulatory_limit_percentage`: Regulatory limit for sulphur content (percentage)
- `regulatory_limit_mg_per_kg`: Regulatory limit for sulphur content (mg/kg)
- `compliance_status`: Whether the fuel batch meets regulatory requirements
- `evidence_id`: Link to test certificate or laboratory report
- Used for MCPD compliance verification and AER reporting
- Supports manual entry of test certificates with validation

**Reference:** High Level Product Plan Module 3 - Fuel usage logs + sulphur content reporting

---

# 7. Module 4 Tables (Hazardous Waste Chain of Custody)

## 7.1 waste_streams

**Purpose:** Stores waste stream classification (EWC codes)

**Entity:** WasteStream

**RLS Enabled:** Yes

**Soft Delete:** Yes (deleted_at)

```sql
CREATE TABLE waste_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    ewc_code TEXT NOT NULL,
    waste_description TEXT NOT NULL,
    waste_category TEXT,
    hazard_code TEXT,
    permit_reference TEXT,
    volume_limit_m3 DECIMAL(12, 4),
    storage_duration_limit_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_waste_streams_company_id ON waste_streams(company_id);
CREATE INDEX idx_waste_streams_site_id ON waste_streams(site_id);
CREATE INDEX idx_waste_streams_module_id ON waste_streams(module_id);
CREATE INDEX idx_waste_streams_ewc_code ON waste_streams(ewc_code);
CREATE INDEX idx_waste_streams_is_active ON waste_streams(is_active);
```

## 7.2 consignment_notes

**Purpose:** Stores consignment notes (digital capture + validation)

**Entity:** ConsignmentNote

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE consignment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_stream_id UUID NOT NULL REFERENCES waste_streams(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    consignment_note_number TEXT NOT NULL UNIQUE,
    consignment_date DATE NOT NULL,
    carrier_id UUID REFERENCES contractor_licences(id) ON DELETE SET NULL,
    carrier_name TEXT NOT NULL,
    carrier_licence_number TEXT,
    destination_site TEXT NOT NULL,
    waste_description TEXT NOT NULL,
    ewc_code TEXT NOT NULL,
    quantity_m3 DECIMAL(12, 4) NOT NULL,
    quantity_kg DECIMAL(12, 4),
    validation_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED', 'REQUIRES_REVIEW')),
    validation_errors JSONB NOT NULL DEFAULT '[]',
    pre_validation_status TEXT
        CHECK (pre_validation_status IN ('NOT_VALIDATED', 'VALIDATION_PENDING', 'PASSED', 'FAILED')),
    pre_validation_errors JSONB,
    pre_validated_at TIMESTAMP WITH TIME ZONE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consignment_notes_waste_stream_id ON consignment_notes(waste_stream_id);
CREATE INDEX idx_consignment_notes_company_id ON consignment_notes(company_id);
CREATE INDEX idx_consignment_notes_site_id ON consignment_notes(site_id);
CREATE INDEX idx_consignment_notes_consignment_note_number ON consignment_notes(consignment_note_number);
CREATE INDEX idx_consignment_notes_consignment_date ON consignment_notes(consignment_date);
CREATE INDEX idx_consignment_notes_carrier_id ON consignment_notes(carrier_id);
CREATE INDEX idx_consignment_notes_validation_status ON consignment_notes(validation_status);
CREATE INDEX idx_consignment_notes_pre_validation_status ON consignment_notes(pre_validation_status);
```

**Business Logic:**
- `pre_validation_status`: Status of automated pre-validation checks before submission
- `pre_validation_errors`: JSONB array of validation errors detected during pre-validation
- `pre_validated_at`: Timestamp when pre-validation was last run
- Enables early detection of compliance violations before consignment notes are submitted
- Prevents regulatory violations through automated validation rules

**Reference:** High Level Product Plan Module 4 - Validation Rules Engine

---

## 7.3 contractor_licences

**Purpose:** Tracks contractor licence checks + expiry monitoring

**Entity:** ContractorLicence

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE contractor_licences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contractor_name TEXT NOT NULL,
    licence_number TEXT NOT NULL,
    licence_type TEXT NOT NULL,
    waste_types_allowed TEXT[] NOT NULL DEFAULT '{}',
    issued_date DATE,
    expiry_date DATE NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contractor_licences_company_id ON contractor_licences(company_id);
CREATE INDEX idx_contractor_licences_licence_number ON contractor_licences(licence_number);
CREATE INDEX idx_contractor_licences_expiry_date ON contractor_licences(expiry_date);
CREATE INDEX idx_contractor_licences_is_valid ON contractor_licences(is_valid);
```

## 7.4 chain_of_custody

**Purpose:** Tracks complete chain of custody reporting

**Entity:** ChainOfCustody

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE chain_of_custody (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    chain_position INTEGER NOT NULL,
    transfer_date DATE NOT NULL,
    from_party TEXT NOT NULL,
    to_party TEXT NOT NULL,
    transfer_method TEXT,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chain_of_custody_consignment_note_id ON chain_of_custody(consignment_note_id);
CREATE INDEX idx_chain_of_custody_company_id ON chain_of_custody(company_id);
CREATE INDEX idx_chain_of_custody_site_id ON chain_of_custody(site_id);
CREATE INDEX idx_chain_of_custody_is_complete ON chain_of_custody(is_complete);
```

## 7.5 end_point_proofs

**Purpose:** Stores return evidence/end-point proof (destruction/recycling outcome documentation)

**Entity:** EndPointProof

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE end_point_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    end_point_type TEXT NOT NULL 
        CHECK (end_point_type IN ('DESTRUCTION', 'RECYCLING', 'RECOVERY', 'DISPOSAL')),
    end_point_facility TEXT NOT NULL,
    completion_date DATE NOT NULL,
    certificate_reference TEXT,
    certificate_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_end_point_proofs_consignment_note_id ON end_point_proofs(consignment_note_id);
CREATE INDEX idx_end_point_proofs_company_id ON end_point_proofs(company_id);
CREATE INDEX idx_end_point_proofs_site_id ON end_point_proofs(site_id);
CREATE INDEX idx_end_point_proofs_end_point_type ON end_point_proofs(end_point_type);
CREATE INDEX idx_end_point_proofs_completion_date ON end_point_proofs(completion_date);
CREATE INDEX idx_end_point_proofs_is_verified ON end_point_proofs(is_verified);
```

## 7.6 chain_break_alerts

**Purpose:** Tracks chain-break detection (alerts if evidence missing, contractor non-compliance)

**Entity:** ChainBreakAlert

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE chain_break_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID REFERENCES consignment_notes(id) ON DELETE CASCADE,
    chain_of_custody_id UUID REFERENCES chain_of_custody(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL 
        CHECK (alert_type IN ('MISSING_EVIDENCE', 'CONTRACTOR_NON_COMPLIANT', 'CHAIN_GAP', 'VALIDATION_FAILURE', 'EXPIRED_LICENCE')),
    alert_severity TEXT NOT NULL DEFAULT 'WARNING' 
        CHECK (alert_severity IN ('INFO', 'WARNING', 'CRITICAL')),
    alert_message TEXT NOT NULL,
    gap_description TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chain_break_alerts_consignment_note_id ON chain_break_alerts(consignment_note_id);
CREATE INDEX idx_chain_break_alerts_chain_of_custody_id ON chain_break_alerts(chain_of_custody_id);
CREATE INDEX idx_chain_break_alerts_company_id ON chain_break_alerts(company_id);
CREATE INDEX idx_chain_break_alerts_site_id ON chain_break_alerts(site_id);
CREATE INDEX idx_chain_break_alerts_alert_type ON chain_break_alerts(alert_type);
CREATE INDEX idx_chain_break_alerts_is_resolved ON chain_break_alerts(is_resolved) WHERE is_resolved = false;
```

---

## 7.7 validation_rules

**Purpose:** Configurable validation rules for hazardous waste consignment notes (carrier licence validity, volume limits, storage duration)

**Entity:** ValidationRule

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    waste_stream_id UUID REFERENCES waste_streams(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL
        CHECK (rule_type IN ('CARRIER_LICENCE', 'VOLUME_LIMIT', 'STORAGE_DURATION', 'EWC_CODE', 'DESTINATION', 'CUSTOM')),
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    rule_config JSONB NOT NULL,
    severity TEXT NOT NULL
        CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_rules_company_id ON validation_rules(company_id);
CREATE INDEX idx_validation_rules_waste_stream_id ON validation_rules(waste_stream_id);
CREATE INDEX idx_validation_rules_rule_type ON validation_rules(rule_type);
CREATE INDEX idx_validation_rules_is_active ON validation_rules(is_active);
```

**Business Logic:**
- Configurable validation rules per company and optionally per waste stream
- `rule_config`: JSONB structure containing rule parameters (e.g., {"max_volume": 100, "max_duration_days": 30})
- `severity`: Determines if violation blocks submission (ERROR), warns user (WARNING), or is informational (INFO)
- `is_active`: Enables/disables rules without deleting them
- Prevents violations before they occur through automated pre-validation

**Rule Config Examples:**
```json
{
  "rule_type": "CARRIER_LICENCE",
  "rule_config": {
    "check_expiry": true,
    "days_before_expiry_warning": 30
  }
}

{
  "rule_type": "VOLUME_LIMIT",
  "rule_config": {
    "max_volume_m3": 100,
    "permit_reference": "EPR/AB1234CD/V001"
  }
}

{
  "rule_type": "STORAGE_DURATION",
  "rule_config": {
    "max_duration_days": 30,
    "waste_category": "hazardous"
  }
}
```

**Reference:** High Level Product Plan Module 4 - Validation Rules Engine

---

## 7.8 validation_executions

**Purpose:** Tracks validation rule execution results for consignment notes

**Entity:** ValidationExecution

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE validation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    validation_rule_id UUID NOT NULL REFERENCES validation_rules(id) ON DELETE CASCADE,
    validation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    validation_result TEXT NOT NULL
        CHECK (validation_result IN ('PASS', 'FAIL', 'WARNING')),
    validation_message TEXT,
    validation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_executions_consignment_note_id ON validation_executions(consignment_note_id);
CREATE INDEX idx_validation_executions_validation_rule_id ON validation_executions(validation_rule_id);
CREATE INDEX idx_validation_executions_validation_result ON validation_executions(validation_result);
CREATE INDEX idx_validation_executions_validation_date ON validation_executions(validation_date);
```

**Business Logic:**
- Immutable audit log of every validation rule execution
- `validation_result`: Outcome of validation check (PASS, FAIL, WARNING)
- `validation_message`: Human-readable message explaining the result
- `validation_data`: JSONB containing detailed validation context and calculated values
- Enables tracing why a consignment note passed or failed validation
- Supports compliance audits and debugging validation logic

**Reference:** High Level Product Plan Module 4 - Validation Executions

---

# 8. System Tables

## 7.1 notifications

**Purpose:** Stores all notifications/alerts sent to users

**Entity:** Notification

**RLS Enabled:** Yes

**Soft Delete:** No

> [UPDATED - Rich Notification Schema - 2025-01-01]
> 
> **Schema aligned with Notification Messaging Specification for world-class delivery tracking, templates, and escalation support.**

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient Information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT, -- For SMS notifications
    
    -- Notification Details
    notification_type TEXT NOT NULL 
        CHECK (notification_type IN (
            'DEADLINE_WARNING_7D',
            'DEADLINE_WARNING_3D',
            'DEADLINE_WARNING_1D',
            'OVERDUE_OBLIGATION',
            'EVIDENCE_REMINDER',
            'PERMIT_RENEWAL_REMINDER',
            'PARAMETER_EXCEEDANCE_80',
            'PARAMETER_EXCEEDANCE_90',
            'PARAMETER_EXCEEDANCE_100',
            'RUN_HOUR_BREACH_80',
            'RUN_HOUR_BREACH_90',
            'RUN_HOUR_BREACH_100',
            'AUDIT_PACK_READY',
            'REGULATOR_PACK_READY',
            'TENDER_PACK_READY',
            'BOARD_PACK_READY',
            'INSURER_PACK_READY',
            'PACK_DISTRIBUTED',
            'CONSULTANT_CLIENT_ASSIGNED',
            'CONSULTANT_CLIENT_PACK_GENERATED',
            'CONSULTANT_CLIENT_ACTIVITY',
            'SYSTEM_ALERT',
            'ESCALATION',
            'DEADLINE_ALERT',
            'EXCEEDANCE',
            'BREACH',
            'MODULE_ACTIVATION'
        )),
    channel TEXT NOT NULL 
        CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP', 'PUSH')),
    priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT')),
    
    -- Content
    subject TEXT NOT NULL, -- Email subject or SMS preview
    body_html TEXT, -- HTML email body
    body_text TEXT NOT NULL, -- Plain text email body or SMS content
    variables JSONB NOT NULL DEFAULT '{}', -- Template variables used
    
    -- Delivery Tracking
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED')),
    delivery_status TEXT
        CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED')),
    delivery_provider TEXT, -- 'SENDGRID', 'TWILIO', 'SUPABASE_REALTIME'
    delivery_provider_id TEXT, -- Provider's message ID for tracking
    delivery_error TEXT, -- Error message if delivery failed
    
    -- Escalation
    is_escalation BOOLEAN NOT NULL DEFAULT false,
    escalation_level INTEGER CHECK (escalation_level >= 1 AND escalation_level <= 3),
    escalation_state TEXT DEFAULT 'PENDING'
        CHECK (escalation_state IN ('PENDING', 'ESCALATED_LEVEL_1', 'ESCALATED_LEVEL_2', 'ESCALATED_LEVEL_3', 'RESOLVED')),
    escalation_delay_minutes INTEGER DEFAULT 60 
        CHECK (escalation_delay_minutes >= 0),
    max_retries INTEGER DEFAULT 3 
        CHECK (max_retries >= 0),
    
    -- Entity Reference
    entity_type TEXT, -- 'obligation', 'deadline', 'evidence', 'audit_pack', etc.
    entity_id UUID,
    action_url TEXT, -- URL to relevant page
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    actioned_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_site_id ON notifications(site_id);
CREATE INDEX idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX idx_notifications_escalation_state ON notifications(escalation_state);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- Composite index for escalation checks
CREATE INDEX idx_notifications_escalation_check ON notifications(entity_type, entity_id, escalation_state, created_at);
```

## 8.2 background_jobs

**Purpose:** Tracks scheduled and queued background tasks

**Entity:** BackgroundJob

**RLS Enabled:** No (system table)

**Soft Delete:** No

**Special Fields:**
- `dead_letter_queue_id`: UUID, nullable, references dead_letter_queue.id (see PLS Section B.7.4)
- `health_status`: TEXT CHECK ('HEALTHY', 'STALE', 'FAILED') - see PLS Section B.7.4
- `last_heartbeat`: TIMESTAMP WITH TIME ZONE, nullable - see PLS Section B.7.4
- `heartbeat_interval_seconds`: INTEGER, default 60 - see PLS Section B.7.4

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    priority INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    error_stack TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 2,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_backoff_seconds INTEGER NOT NULL DEFAULT 2,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    health_status TEXT NOT NULL DEFAULT 'HEALTHY' 
        CHECK (health_status IN ('HEALTHY', 'STALE', 'FAILED')),
    heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 60,
    dead_letter_queue_id UUID REFERENCES dead_letter_queue(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_scheduled_for ON background_jobs(scheduled_for);
CREATE INDEX idx_background_jobs_priority_scheduled ON background_jobs(priority DESC, scheduled_for ASC);
CREATE INDEX idx_background_jobs_health ON background_jobs(health_status, last_heartbeat) 
    WHERE health_status != 'HEALTHY';
```

## 8.3 dead_letter_queue

**Purpose:** Stores permanently failed jobs that exceeded max retries

**Entity:** DeadLetterQueue

**RLS Enabled:** No (system table)

**Soft Delete:** No

**Reference:** PLS Section B.7.4 (Dead-Letter Queue Implementation)

```sql
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_context JSONB NOT NULL DEFAULT '{}',
    retry_count INTEGER NOT NULL,
    last_attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dead_letter_queue_job_id ON dead_letter_queue(job_id);
CREATE INDEX idx_dead_letter_queue_company_id ON dead_letter_queue(company_id);
CREATE INDEX idx_dead_letter_queue_resolved_at ON dead_letter_queue(resolved_at) 
    WHERE resolved_at IS NULL;
```

## 8.4 audit_logs

**Purpose:** Immutable audit trail of all actions

**Entity:** AuditLog

**RLS Enabled:** Yes (read-only for company)

**Soft Delete:** No (immutable)

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## 8.5 regulator_questions

**Purpose:** Tracks regulator questions, queries, and challenges

**Entity:** RegulatorQuestion

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE regulator_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    question_type TEXT NOT NULL 
        CHECK (question_type IN ('OBLIGATION_CLARIFICATION', 'EVIDENCE_REQUEST', 'COMPLIANCE_QUERY', 'URGENT', 'INFORMAL')),
    question_text TEXT NOT NULL,
    question_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    raised_date DATE NOT NULL DEFAULT CURRENT_DATE,
    response_deadline DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'RESPONSE_SUBMITTED', 'RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED', 'CLOSED', 'RESPONSE_OVERDUE')),
    response_text TEXT,
    response_submitted_date DATE,
    response_evidence_ids UUID[] NOT NULL DEFAULT '{}',
    regulator_acknowledged BOOLEAN NOT NULL DEFAULT false,
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    closed_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regulator_questions_company_id ON regulator_questions(company_id);
CREATE INDEX idx_regulator_questions_site_id ON regulator_questions(site_id);
CREATE INDEX idx_regulator_questions_status ON regulator_questions(status);
CREATE INDEX idx_regulator_questions_response_deadline ON regulator_questions(response_deadline);
CREATE INDEX idx_regulator_questions_assigned_to ON regulator_questions(assigned_to);
```

## 8.6 review_queue_items

**Purpose:** Items flagged for human review

**Entity:** ReviewQueueItem

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE review_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL 
        CHECK (review_type IN ('LOW_CONFIDENCE', 'SUBJECTIVE', 'NO_MATCH', 'DATE_FAILURE', 'DUPLICATE', 'OCR_QUALITY', 'CONFLICT', 'HALLUCINATION')),
    is_blocking BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    hallucination_risk BOOLEAN NOT NULL DEFAULT false,
    original_data JSONB NOT NULL DEFAULT '{}',
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING', 'CONFIRMED', 'EDITED', 'REJECTED', 'PENDING_INTERPRETATION', 'INTERPRETED', 'NOT_APPLICABLE')),
    review_action TEXT 
        CHECK (review_action IN ('confirmed', 'edited', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    edited_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_items_document_id ON review_queue_items(document_id);
CREATE INDEX idx_review_queue_items_obligation_id ON review_queue_items(obligation_id);
CREATE INDEX idx_review_queue_items_company_id ON review_queue_items(company_id);
CREATE INDEX idx_review_queue_items_site_id ON review_queue_items(site_id);
CREATE INDEX idx_review_queue_items_review_status ON review_queue_items(review_status);
CREATE INDEX idx_review_queue_items_is_blocking ON review_queue_items(is_blocking);
CREATE INDEX idx_review_queue_items_priority ON review_queue_items(priority DESC);
```

## 8.7 escalations

**Purpose:** Tracks escalation chains for overdue items

**Entity:** Escalation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL CHECK (current_level >= 1 AND current_level <= 4),
    escalation_reason TEXT NOT NULL,
    escalated_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    previous_escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalations_obligation_id ON escalations(obligation_id);
CREATE INDEX idx_escalations_company_id ON escalations(company_id);
CREATE INDEX idx_escalations_site_id ON escalations(site_id);
CREATE INDEX idx_escalations_escalated_to ON escalations(escalated_to);
CREATE INDEX idx_escalations_current_level ON escalations(current_level);
CREATE INDEX idx_escalations_resolved_at ON escalations(resolved_at)
    WHERE resolved_at IS NULL;
```

---

## 8.8 escalation_workflows

**Purpose:** Configurable escalation rules per company/obligation type with automatic escalation workflows

**Entity:** EscalationWorkflow

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE escalation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_category TEXT,
    level_1_days INTEGER NOT NULL DEFAULT 7,
    level_2_days INTEGER NOT NULL DEFAULT 14,
    level_3_days INTEGER NOT NULL DEFAULT 21,
    level_4_days INTEGER NOT NULL DEFAULT 30,
    level_1_recipients UUID[] NOT NULL DEFAULT '{}',
    level_2_recipients UUID[] NOT NULL DEFAULT '{}',
    level_3_recipients UUID[] NOT NULL DEFAULT '{}',
    level_4_recipients UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_workflows_company_id ON escalation_workflows(company_id);
CREATE INDEX idx_escalation_workflows_obligation_category ON escalation_workflows(obligation_category);
CREATE INDEX idx_escalation_workflows_is_active ON escalation_workflows(is_active);
```

**Business Logic:**
- Configurable escalation rules per company with optional obligation category filtering
- `level_N_days`: Days overdue before triggering escalation level N (e.g., level_1_days = 7 means escalate after 7 days overdue)
- `level_N_recipients`: Array of user IDs to notify at each escalation level
- `obligation_category`: Optional filter to apply different escalation rules to different obligation types (NULL = applies to all)
- `is_active`: Enables/disables escalation workflow without deleting
- Replaces hard-coded escalation logic with configurable company-specific workflows

**Reference:** High Level Product Plan - Escalation Workflow Configuration

---

## 8.9 excel_imports

**Purpose:** Tracks Excel/CSV import operations for bulk obligation creation

**Entity:** ExcelImport

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE excel_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    file_format TEXT NOT NULL CHECK (file_format IN ('XLSX', 'XLS', 'CSV')),
    row_count INTEGER NOT NULL,
    valid_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'PROCESSING', 'PENDING_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED')),
    valid_rows JSONB DEFAULT '[]',
    error_rows JSONB DEFAULT '[]',
    warning_rows JSONB DEFAULT '[]',
    errors JSONB DEFAULT '[]',
    import_options JSONB NOT NULL DEFAULT '{}',
    column_mapping JSONB DEFAULT '{}',
    obligation_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_excel_imports_user_id ON excel_imports(user_id);
CREATE INDEX idx_excel_imports_company_id ON excel_imports(company_id);
CREATE INDEX idx_excel_imports_site_id ON excel_imports(site_id);
CREATE INDEX idx_excel_imports_status ON excel_imports(status);
CREATE INDEX idx_excel_imports_created_at ON excel_imports(created_at);
```

**Field Descriptions:**
- `file_name`: Original filename of uploaded Excel/CSV file
- `file_size_bytes`: Size of uploaded file in bytes
- `storage_path`: Path to file in Supabase Storage
- `file_format`: Format of uploaded file (XLSX, XLS, CSV)
- `row_count`: Total number of rows in file
- `valid_count`: Number of valid rows (ready for import)
- `error_count`: Number of rows with errors
- `success_count`: Number of obligations successfully created
- `status`: Current status of import operation
- `valid_rows`: JSONB array of valid row data (for preview)
- `error_rows`: JSONB array of error row data with error messages
- `warning_rows`: JSONB array of warning row data
- `errors`: JSONB array of error details
- `import_options`: JSONB object with import configuration (create_missing_sites, create_missing_permits, skip_duplicates)
- `column_mapping`: JSONB object mapping Excel columns to system fields
- `obligation_ids`: Array of UUIDs of created obligations

---

## 8.10 system_settings

**Purpose:** Stores system-wide configuration

**Entity:** SystemSetting

**RLS Enabled:** No (global settings)

**Soft Delete:** No

```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_settings_setting_key ON system_settings(setting_key);
```

---

# 9. Cross-Module Tables

## 9.1 compliance_clocks_universal

**Purpose:** Universal compliance countdown clock supporting ALL modules with Red/Amber/Green criticality (replaces module-specific `compliance_clocks` table - Module 3 generator clocks migrated here with `entity_type = 'GENERATOR'`)

**Entity:** ComplianceClockUniversal

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE compliance_clocks_universal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('OBLIGATION', 'DEADLINE', 'PARAMETER', 'GENERATOR', 'CONSENT', 'WASTE_STREAM', 'CONTRACTOR_LICENCE')),
    entity_id UUID NOT NULL,
    clock_type TEXT NOT NULL,
    clock_name TEXT NOT NULL,
    target_date DATE NOT NULL,
    days_remaining INTEGER NOT NULL,
    criticality TEXT
        CHECK (criticality IN ('RED', 'AMBER', 'GREEN')),
    status TEXT
        CHECK (status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
    reminder_days INTEGER[] NOT NULL DEFAULT '{90, 30, 7}',
    reminders_sent INTEGER[] NOT NULL DEFAULT '{}',
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_clocks_universal_company_id ON compliance_clocks_universal(company_id);
CREATE INDEX idx_compliance_clocks_universal_site_id ON compliance_clocks_universal(site_id);
CREATE INDEX idx_compliance_clocks_universal_module_id ON compliance_clocks_universal(module_id);
CREATE INDEX idx_compliance_clocks_universal_entity ON compliance_clocks_universal(entity_type, entity_id);
CREATE INDEX idx_compliance_clocks_universal_target_date ON compliance_clocks_universal(target_date);
CREATE INDEX idx_compliance_clocks_universal_criticality ON compliance_clocks_universal(criticality, status);
CREATE INDEX idx_compliance_clocks_universal_status ON compliance_clocks_universal(status);
CREATE INDEX idx_compliance_clocks_universal_completed_by ON compliance_clocks_universal(completed_by);
CREATE INDEX idx_compliance_clocks_universal_evidence_id ON compliance_clocks_universal(evidence_id);
```

**Business Logic:**
- Universal countdown mechanism for ALL modules (not just Module 3 generators)
- `entity_type`: Type of entity being tracked (OBLIGATION, DEADLINE, PARAMETER, GENERATOR, CONSENT, WASTE_STREAM, CONTRACTOR_LICENCE)
- `entity_id`: UUID of the tracked entity (application layer MUST validate entity_id matches entity_type - no FK constraint possible)
- `clock_type`: Type of clock (e.g., 'RENEWAL_DUE', 'EXPIRY_WARNING', 'COMPLIANCE_DEADLINE', 'LICENCE_EXPIRY', 'STACK_TEST', 'CERTIFICATION_EXPIRY', 'SERVICE_DUE', 'ANNUAL_RETURN')
- `clock_name`: Human-readable clock description
- `criticality`: Red/Amber/Green status based on days_remaining thresholds
  - RED: Critical/urgent (typically < 7 days)
  - AMBER: Warning (typically 7-30 days)
  - GREEN: OK (typically > 30 days)
- `days_remaining`: Calculated days until target_date
- `status`: Current clock state (ACTIVE, COMPLETED, OVERDUE, CANCELLED)
- `completed_by`: User who marked the clock as completed (set when status = 'COMPLETED')
- `completed_at`: Timestamp when clock was completed (set when status = 'COMPLETED')
- `evidence_id`: Optional link to evidence item proving completion (e.g., stack test certificate, renewal document)
- Drives alerts, escalation, and pack readiness across ALL modules

**Criticality Calculation (Default Thresholds):**
- RED: days_remaining < 7 OR status = 'OVERDUE'
- AMBER: 7 <= days_remaining <= 30
- GREEN: days_remaining > 30

**Reference:** High Level Product Plan - Universal Compliance Clock (Cross-Cutting Feature)

---

## 9.2 compliance_clock_dashboard

**Purpose:** Materialized view providing aggregated compliance clock metrics for dashboard display

**Entity:** ComplianceClockDashboard (Materialized View)

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE MATERIALIZED VIEW compliance_clock_dashboard AS
SELECT
    company_id,
    site_id,
    module_id,
    COUNT(*) FILTER (WHERE criticality = 'RED') as red_count,
    COUNT(*) FILTER (WHERE criticality = 'AMBER') as amber_count,
    COUNT(*) FILTER (WHERE criticality = 'GREEN') as green_count,
    COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_count,
    MIN(target_date) FILTER (WHERE status = 'ACTIVE') as next_critical_date,
    MAX(updated_at) as last_updated
FROM compliance_clocks_universal
WHERE status IN ('ACTIVE', 'OVERDUE')
GROUP BY company_id, site_id, module_id;

CREATE UNIQUE INDEX idx_compliance_clock_dashboard_pkey
    ON compliance_clock_dashboard(company_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX idx_compliance_clock_dashboard_company_id ON compliance_clock_dashboard(company_id);
CREATE INDEX idx_compliance_clock_dashboard_site_id ON compliance_clock_dashboard(site_id);
CREATE INDEX idx_compliance_clock_dashboard_module_id ON compliance_clock_dashboard(module_id);
```

**Business Logic:**
- Aggregates compliance clock metrics by company/site/module
- `red_count`, `amber_count`, `green_count`: Count of clocks in each criticality level
- `overdue_count`: Count of overdue items
- `next_critical_date`: Earliest upcoming deadline for active clocks
- `last_updated`: Timestamp of most recent clock update
- Materialized view refreshed periodically (e.g., every hour) for performance
- Powers top-level dashboard with Red/Amber/Green status overview

**Refresh Strategy:**
```sql
-- Refresh materialized view (run via cron or background job)
REFRESH MATERIALIZED VIEW CONCURRENTLY compliance_clock_dashboard;
```

**Reference:** High Level Product Plan - Compliance Clock Dashboard

---

## 9.3 recurring_tasks

**Purpose:** Tracks automated recurring task generation from schedules

**Entity:** RecurringTask

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE recurring_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL 
        CHECK (task_type IN ('MONITORING', 'EVIDENCE_COLLECTION', 'REPORTING', 'MAINTENANCE', 'SAMPLING', 'INSPECTION')),
    task_title TEXT NOT NULL,
    task_description TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completion_notes TEXT,
    trigger_type TEXT NOT NULL 
        CHECK (trigger_type IN ('SCHEDULE', 'EVENT_BASED', 'CONDITIONAL', 'MANUAL')),
    trigger_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_tasks_schedule_id ON recurring_tasks(schedule_id);
CREATE INDEX idx_recurring_tasks_obligation_id ON recurring_tasks(obligation_id);
CREATE INDEX idx_recurring_tasks_company_id ON recurring_tasks(company_id);
CREATE INDEX idx_recurring_tasks_site_id ON recurring_tasks(site_id);
CREATE INDEX idx_recurring_tasks_due_date ON recurring_tasks(due_date);
CREATE INDEX idx_recurring_tasks_status ON recurring_tasks(status);
CREATE INDEX idx_recurring_tasks_assigned_to ON recurring_tasks(assigned_to);
```

## 9.4 evidence_expiry_tracking

**Purpose:** Tracks evidence ageing + expiry rules (expiry tracking, renewal reminders)

**Entity:** EvidenceExpiryTracking

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE evidence_expiry_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    days_until_expiry INTEGER NOT NULL,
    reminder_days INTEGER[] NOT NULL DEFAULT '{90, 30, 7}',
    reminders_sent INTEGER[] NOT NULL DEFAULT '{}',
    is_expired BOOLEAN NOT NULL DEFAULT false,
    expired_at TIMESTAMP WITH TIME ZONE,
    renewal_required BOOLEAN NOT NULL DEFAULT false,
    renewal_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    renewal_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_expiry_tracking_evidence_id ON evidence_expiry_tracking(evidence_id);
CREATE INDEX idx_evidence_expiry_tracking_company_id ON evidence_expiry_tracking(company_id);
CREATE INDEX idx_evidence_expiry_tracking_site_id ON evidence_expiry_tracking(site_id);
CREATE INDEX idx_evidence_expiry_tracking_expiry_date ON evidence_expiry_tracking(expiry_date);
CREATE INDEX idx_evidence_expiry_tracking_is_expired ON evidence_expiry_tracking(is_expired) WHERE is_expired = false;
CREATE INDEX idx_evidence_expiry_tracking_days_until_expiry ON evidence_expiry_tracking(days_until_expiry) WHERE is_expired = false;
```

## 9.5 condition_permissions

**Purpose:** Stores condition-level permissions for users/roles

**Entity:** ConditionPermission

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE condition_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    condition_reference TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL 
        CHECK (permission_type IN ('VIEW', 'EDIT', 'MANAGE', 'FULL')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_condition_permissions_user_id ON condition_permissions(user_id);
CREATE INDEX idx_condition_permissions_document_id ON condition_permissions(document_id);
CREATE INDEX idx_condition_permissions_condition_reference ON condition_permissions(condition_reference);
CREATE INDEX idx_condition_permissions_company_id ON condition_permissions(company_id);
CREATE INDEX idx_condition_permissions_site_id ON condition_permissions(site_id);
CREATE INDEX idx_condition_permissions_is_active ON condition_permissions(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX uq_condition_permissions ON condition_permissions(user_id, document_id, condition_reference) 
    WHERE is_active = true;
```

## 9.4 pack_sharing

> [v1.6 UPDATE – Consolidated Pack Distribution – 2025-01-01]
> - Merged `pack_distributions` functionality into `pack_sharing`
> - Added `distribution_method` field to support EMAIL and SHARED_LINK
> - Added `distributed_to` field for recipient identifier

**Purpose:** Tracks pack sharing and distribution (email sends, shared links, secure access) for analytics and audit

**Entity:** PackSharing

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE pack_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    shared_with_name TEXT,
    distributed_to TEXT, -- Recipient identifier (email address or name) - for distribution tracking
    distribution_method TEXT 
        CHECK (distribution_method IN ('EMAIL', 'SHARED_LINK')), -- NULL for secure access tokens
    access_token TEXT NOT NULL UNIQUE,
    access_type TEXT NOT NULL 
        CHECK (access_type IN ('INSPECTOR', 'AUDITOR', 'CLIENT', 'REGULATOR', 'OTHER')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    first_viewed_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
    shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pack_sharing_pack_id ON pack_sharing(pack_id);
CREATE INDEX idx_pack_sharing_company_id ON pack_sharing(company_id);
CREATE INDEX idx_pack_sharing_access_token ON pack_sharing(access_token);
CREATE INDEX idx_pack_sharing_expires_at ON pack_sharing(expires_at) WHERE is_active = true;
CREATE INDEX idx_pack_sharing_is_active ON pack_sharing(is_active) WHERE is_active = true;
CREATE INDEX idx_pack_sharing_distribution_method ON pack_sharing(distribution_method) WHERE distribution_method IS NOT NULL;
CREATE INDEX idx_pack_sharing_shared_at ON pack_sharing(shared_at);
```

**Business Logic:**
- Tracks pack sharing via secure access tokens (inspector/auditor/client/regulator access)
- Tracks pack distribution via email or shared links (`distribution_method` field)
- `distributed_to`: Recipient identifier (email address or name) - used for distribution tracking
- `distribution_method`: 'EMAIL' or 'SHARED_LINK' - NULL for secure access tokens
- `view_count`, `first_viewed_at`, `last_viewed_at`: Track access/viewing
- Used for analytics and compliance audit trail

**Migration Note:**
- `pack_distributions` table has been merged into this table
- Existing `pack_distributions` records should be migrated with `distribution_method` set appropriately
- `access_token` from `pack_distributions.shared_link_token` maps to `access_token` here

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

## 9.4 module_activations

**Purpose:** Tracks module activation status per company/site

**Entity:** ModuleActivation

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE module_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    compliance_score INTEGER NOT NULL DEFAULT 100 CHECK (compliance_score >= 0 AND compliance_score <= 100),
    compliance_score_updated_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deactivation_reason TEXT,
    billing_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    billing_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_activations_company_id ON module_activations(company_id);
CREATE INDEX idx_module_activations_site_id ON module_activations(site_id);
CREATE INDEX idx_module_activations_module_id ON module_activations(module_id);
CREATE INDEX idx_module_activations_status ON module_activations(status);
CREATE INDEX idx_module_activations_compliance_score ON module_activations(compliance_score);
CREATE UNIQUE INDEX uq_module_activations ON module_activations(company_id, site_id, module_id) 
    WHERE status = 'ACTIVE';
```

## 9.5 cross_sell_triggers

**Purpose:** Records cross-sell opportunities detected in documents

**Entity:** CrossSellTrigger

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE cross_sell_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    target_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    trigger_type TEXT NOT NULL 
        CHECK (trigger_type IN ('KEYWORD', 'USER_REQUEST', 'EXTERNAL_EVENT')),
    trigger_source TEXT NOT NULL,
    detected_keywords TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'CONVERTED', 'DISMISSED')),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_action TEXT,
    dismissed_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cross_sell_triggers_company_id ON cross_sell_triggers(company_id);
CREATE INDEX idx_cross_sell_triggers_site_id ON cross_sell_triggers(site_id);
CREATE INDEX idx_cross_sell_triggers_document_id ON cross_sell_triggers(document_id);
CREATE INDEX idx_cross_sell_triggers_target_module_id ON cross_sell_triggers(target_module_id);
CREATE INDEX idx_cross_sell_triggers_status ON cross_sell_triggers(status);
```

---

# 10. AI/Extraction Tables

## 10.1 extraction_logs

**Purpose:** Logs AI extraction processing

**Entity:** ExtractionLog

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    model_identifier TEXT NOT NULL,
    rule_library_version TEXT NOT NULL,
    segments_processed INTEGER NOT NULL DEFAULT 0,
    obligations_extracted INTEGER NOT NULL DEFAULT 0,
    flagged_for_review INTEGER NOT NULL DEFAULT 0,
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    ocr_required BOOLEAN NOT NULL DEFAULT false,
    ocr_confidence DECIMAL(5, 4),
    errors JSONB NOT NULL DEFAULT '[]',
    warnings JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extraction_logs_document_id ON extraction_logs(document_id);
CREATE INDEX idx_extraction_logs_extraction_timestamp ON extraction_logs(extraction_timestamp);
CREATE INDEX idx_extraction_logs_model_identifier ON extraction_logs(model_identifier);

-- RLS Performance Indexes (required for RLS policy performance)
CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);
CREATE INDEX idx_user_site_assignments_user_id_site_id ON user_site_assignments(user_id, site_id);
CREATE INDEX idx_consultant_client_assignments_consultant_id ON consultant_client_assignments(consultant_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_consultant_client_assignments_client_company_id ON consultant_client_assignments(client_company_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_module_activations_company_id_module_id ON module_activations(company_id, module_id) WHERE status = 'ACTIVE';
```

## 10.2 rule_library_patterns

**Purpose:** Stores learned patterns for document extraction. Patterns improve over time with user corrections.

**Entity:** RuleLibraryPattern

**RLS Enabled:** Yes

**Soft Delete:** No

**Reference:** docs/specs/80_AI_Extraction_Rules_Library.md Section 11.1

```sql
CREATE TABLE rule_library_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT NOT NULL UNIQUE,
  pattern_version TEXT NOT NULL DEFAULT '1.0.0',
  priority INTEGER NOT NULL DEFAULT 500,
  display_name TEXT NOT NULL,
  description TEXT,
  matching JSONB NOT NULL DEFAULT '{}'::JSONB,
  extraction_template JSONB NOT NULL DEFAULT '{}'::JSONB,
  applicability JSONB NOT NULL DEFAULT '{}'::JSONB,
  performance JSONB NOT NULL DEFAULT '{
    "usage_count": 0,
    "success_count": 0,
    "false_positive_count": 0,
    "false_negative_count": 0,
    "user_override_count": 0,
    "success_rate": 1.0,
    "last_used_at": null
  }'::JSONB,
  source_documents TEXT[] DEFAULT '{}',
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  deprecated_reason TEXT,
  replaced_by_pattern_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pattern_version CHECK (pattern_version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT chk_success_rate CHECK (
    (performance->>'success_rate')::DECIMAL >= 0 AND 
    (performance->>'success_rate')::DECIMAL <= 1
  ),
  CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 999)
);

CREATE INDEX idx_rlp_pattern_id ON rule_library_patterns(pattern_id);
CREATE INDEX idx_rlp_is_active ON rule_library_patterns(is_active) WHERE is_active = true;
CREATE INDEX idx_rlp_module_types ON rule_library_patterns USING GIN ((applicability->'module_types'));
CREATE INDEX idx_rlp_regulators ON rule_library_patterns USING GIN ((applicability->'regulators'));
CREATE INDEX idx_rlp_document_types ON rule_library_patterns USING GIN ((applicability->'document_types'));
CREATE INDEX idx_rlp_category ON rule_library_patterns((extraction_template->>'category'));
CREATE INDEX idx_rlp_usage_count ON rule_library_patterns(((performance->>'usage_count')::INTEGER) DESC);
CREATE INDEX idx_rlp_success_rate ON rule_library_patterns(((performance->>'success_rate')::DECIMAL) DESC);
CREATE INDEX idx_rlp_created_at ON rule_library_patterns(created_at);
CREATE INDEX idx_rlp_priority ON rule_library_patterns(priority ASC);
```

## 10.3 pattern_candidates

**Purpose:** Temporary storage for potential new patterns discovered from successful extractions. Queued for admin review.

**Entity:** PatternCandidate

**RLS Enabled:** Yes

**Soft Delete:** No

**Reference:** docs/specs/80_AI_Extraction_Rules_Library.md Section 11.2

```sql
CREATE TABLE pattern_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pattern JSONB NOT NULL,
  source_extractions UUID[] NOT NULL DEFAULT '{}',
  sample_count INTEGER NOT NULL DEFAULT 0,
  match_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_pattern_id TEXT REFERENCES rule_library_patterns(pattern_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_candidate_status CHECK (
    status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MERGED')
  )
);

CREATE INDEX idx_pc_status ON pattern_candidates(status);
CREATE INDEX idx_pc_created_at ON pattern_candidates(created_at DESC);
```

## 10.4 pattern_events

**Purpose:** Audit log for pattern lifecycle events (creation, updates, deprecation).

**Entity:** PatternEvent

**RLS Enabled:** Yes

**Soft Delete:** No

**Reference:** docs/specs/80_AI_Extraction_Rules_Library.md Section 11.3

```sql
CREATE TABLE pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
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

## 10.5 correction_records

**Purpose:** Tracks user corrections to extracted obligations for pattern improvement.

**Entity:** CorrectionRecord

**RLS Enabled:** Yes

**Soft Delete:** No

**Reference:** docs/specs/80_AI_Extraction_Rules_Library.md Section 5.2

```sql
CREATE TABLE correction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_log_id UUID REFERENCES extraction_logs(id) ON DELETE SET NULL,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
  pattern_id_used TEXT,
  original_data JSONB NOT NULL,
  corrected_data JSONB NOT NULL,
  correction_type TEXT NOT NULL,
  corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_correction_type CHECK (
    correction_type IN ('category', 'frequency', 'deadline', 'subjective', 'text', 'other')
  )
);

CREATE INDEX idx_cr_pattern_id ON correction_records(pattern_id_used) WHERE pattern_id_used IS NOT NULL;
CREATE INDEX idx_cr_correction_type ON correction_records(correction_type);
CREATE INDEX idx_cr_corrected_at ON correction_records(corrected_at DESC);
CREATE INDEX idx_cr_obligation_id ON correction_records(obligation_id);
```

---

# 11. Indexes

## 11.1 Primary Key Indexes

All primary keys automatically create indexes with the naming pattern `{table}_pkey`. These are created by PostgreSQL automatically and do not need explicit CREATE INDEX statements.

## 11.2 Foreign Key Indexes

PostgreSQL automatically indexes foreign keys, but explicit indexes are documented for clarity and performance optimization.

## 11.3 Search Indexes

**Full-Text Search on Documents:**

```sql
-- Full-text search on documents (title and extracted_text)
CREATE INDEX idx_documents_fulltext ON documents 
USING gin(to_tsvector('english', title || ' ' || COALESCE(extracted_text, '')));

-- Trigram similarity for fuzzy search on document titles
CREATE INDEX idx_documents_title_trgm ON documents 
USING gin(title gin_trgm_ops);
```

**Full-Text Search on Obligations:**

```sql
-- Full-text search on obligations (obligation_title, obligation_description and original_text)
CREATE INDEX idx_obligations_fulltext ON obligations 
USING gin(to_tsvector('english', obligation_title || ' ' || COALESCE(obligation_description, '') || ' ' || original_text));
```

**Reference:** Technical Architecture Section 1.4

## 11.4 Composite Indexes

**Deadline Queries:**

```sql
-- Composite index for deadline status and due date queries
CREATE INDEX idx_deadlines_status_due_date ON deadlines(status, due_date) 
WHERE status IN ('PENDING', 'DUE_SOON', 'OVERDUE');
```

**Evidence Lookups:**

```sql
-- Composite index for obligation-evidence linking queries
CREATE INDEX idx_obligation_evidence_links_obligation ON obligation_evidence_links(obligation_id, evidence_id);
```

**Module Activation Queries:**

```sql
-- Composite index for module activation lookups
CREATE INDEX idx_module_activations_company_module ON module_activations(company_id, module_id) 
WHERE status = 'ACTIVE';
```

**Background Job Queries:**

```sql
-- Composite index for job status, priority, and scheduling
CREATE INDEX idx_background_jobs_status_priority ON background_jobs(status, priority, scheduled_for) 
WHERE status IN ('PENDING', 'RUNNING');

-- Composite index for job health monitoring
CREATE INDEX idx_background_jobs_health ON background_jobs(health_status, last_heartbeat) 
WHERE health_status != 'HEALTHY';
```

**Reference:** Technical Architecture Section 1.4

## 11.5 Performance Optimization Indexes

**Deadline Calculations:**

```sql
-- Composite index for deadline calculation queries
CREATE INDEX idx_obligations_deadline_calc ON obligations(company_id, site_id, frequency, deadline_date) 
WHERE status != 'COMPLETED';
```

**Evidence Linking:**

```sql
-- Composite index for evidence linking queries
CREATE INDEX idx_evidence_items_obligation_lookup ON evidence_items(company_id, site_id, created_at);
```

**Audit Pack Generation:**

```sql
-- Composite index for audit pack generation queries
CREATE INDEX idx_obligations_audit_pack ON obligations(document_id, status) 
WHERE status IN ('COMPLETED', 'IN_PROGRESS');
```

**Reference:** Technical Architecture Section 1.4

---

# 12. Constraints

## 12.1 Primary Key Constraints

All tables have a primary key constraint on the `id` column:
- Constraint name: `{table}_pkey`
- Type: UUID
- Default: `gen_random_uuid()`

## 12.2 Foreign Key Constraints

All foreign keys follow the naming convention `fk_{table}_{referenced_table}` and include appropriate ON DELETE behavior:

**Common ON DELETE Behaviors:**
- `CASCADE`: Delete child records when parent is deleted (e.g., `sites.company_id → companies.id`)
- `RESTRICT`: Prevent deletion if child records exist (e.g., `documents.module_id → modules.id`)
- `SET NULL`: Set foreign key to NULL when parent is deleted (e.g., `documents.parent_document_id → documents.id`)

**Examples:**
```sql
-- CASCADE example
ALTER TABLE sites ADD CONSTRAINT fk_sites_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- RESTRICT example
ALTER TABLE documents ADD CONSTRAINT fk_documents_module 
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE RESTRICT;

-- SET NULL example
ALTER TABLE documents ADD CONSTRAINT fk_documents_parent 
    FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL;
```

## 12.3 Unique Constraints

Unique constraints follow the naming convention `uq_{table}_{column(s)}`:

**Examples:**
```sql
-- Single column unique
ALTER TABLE companies ADD CONSTRAINT uq_companies_stripe_customer_id 
    UNIQUE (stripe_customer_id);

-- Composite unique
ALTER TABLE user_roles ADD CONSTRAINT uq_user_roles_user_role 
    UNIQUE (user_id, role);

-- Partial unique (with WHERE clause)
ALTER TABLE module_activations ADD CONSTRAINT uq_module_activations 
    UNIQUE (company_id, site_id, module_id) WHERE status = 'ACTIVE';
```

## 12.4 Check Constraints

Check constraints follow the naming convention `chk_{table}_{column}` and enforce enum values:

**Examples:**
```sql
-- Enum check constraint
ALTER TABLE obligations ADD CONSTRAINT chk_obligations_status 
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'INCOMPLETE', 'LATE_COMPLETE', 'NOT_APPLICABLE', 'REJECTED'));

-- Range check constraint
ALTER TABLE sites ADD CONSTRAINT chk_sites_grace_period_days 
    CHECK (grace_period_days >= 0);

-- Multiple condition check
ALTER TABLE run_hour_records ADD CONSTRAINT chk_run_hour_records_hours 
    CHECK (hours_recorded >= 0);
```

## 12.5 NOT NULL Constraints

All fields marked as NOT NULL in the Canonical Dictionary are enforced at the database level. Fields that are nullable are explicitly marked as such.

---

# 13. Enums

## 13.1 Enum Implementation Strategy

**PostgreSQL ENUM Types vs CHECK Constraints:**

The schema uses CHECK constraints instead of PostgreSQL ENUM types for flexibility:
- Easier to add new values without ALTER TYPE
- Better compatibility with ORMs
- Simpler migration path

**Enum Value Format:**
- All enum values use UPPER_SNAKE_CASE
- Values must match Canonical Dictionary exactly

## 13.2 Core System Enums

### obligation_status
- Values: `PENDING`, `IN_PROGRESS`, `DUE_SOON`, `COMPLETED`, `OVERDUE`, `INCOMPLETE`, `LATE_COMPLETE`, `NOT_APPLICABLE`, `REJECTED`
- Used in: `obligations.status`

### obligation_category
- Values: `MONITORING`, `REPORTING`, `RECORD_KEEPING`, `OPERATIONAL`, `MAINTENANCE`
- Used in: `obligations.category`

### obligation_frequency
- Values: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUAL`, `ONE_TIME`, `CONTINUOUS`, `EVENT_TRIGGERED`
- Used in: `obligations.frequency`, `schedules.frequency`

### document_status
- Values: `DRAFT`, `ACTIVE`, `SUPERSEDED`, `EXPIRED`
- Used in: `documents.status`

### document_type
- Values: `ENVIRONMENTAL_PERMIT`, `TRADE_EFFLUENT_CONSENT`, `MCPD_REGISTRATION`
- Used in: `documents.document_type`
- **Note:** New document types can be added via `modules.document_types` JSONB field

### extraction_status
- Values: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REVIEW_REQUIRED`, `OCR_FAILED`, `PROCESSING_FAILED`, `ZERO_OBLIGATIONS`, `EXTRACTION_FAILED`, `MANUAL_MODE`
- Used in: `documents.extraction_status`

### deadline_status
- Values: `PENDING`, `DUE_SOON`, `COMPLETED`, `OVERDUE`, `INCOMPLETE`, `LATE_COMPLETE`, `NOT_APPLICABLE`
- Used in: `deadlines.status`

### schedule_status
- Values: `ACTIVE`, `PAUSED`, `ARCHIVED`
- Used in: `schedules.status`

### review_status
- Values: `PENDING`, `CONFIRMED`, `EDITED`, `REJECTED`, `PENDING_INTERPRETATION`, `INTERPRETED`, `NOT_APPLICABLE`
- Used in: `obligations.review_status`, `review_queue_items.review_status`

### evidence_type
- Values: `PDF`, `IMAGE`, `CSV`, `XLSX`, `ZIP`
- Used in: `evidence_items.file_type`

### job_status
- Values: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`
- Used in: `background_jobs.status`

### health_status
- Values: `HEALTHY`, `STALE`, `FAILED`
- Used in: `background_jobs.health_status`

> [v1 UPDATE – Pack Type Enum – 2024-12-27]

### pack_type
- Values: `AUDIT_PACK`, `REGULATOR_INSPECTION`, `TENDER_CLIENT_ASSURANCE`, `BOARD_MULTI_SITE_RISK`, `INSURER_BROKER`, `COMBINED`
- Used in: `audit_packs.pack_type`
- **v1.0 Pack Types:**
  - `AUDIT_PACK`: Full evidence compilation (all plans)
  - `REGULATOR_INSPECTION`: Inspector-ready pack (Core plan, included)
  - `TENDER_CLIENT_ASSURANCE`: Compliance summary for tenders (Growth plan)
  - `BOARD_MULTI_SITE_RISK`: Multi-site risk summary (Growth plan)
  - `INSURER_BROKER`: Risk narrative for insurance (Growth plan)
  - `COMBINED`: Legacy combined pack type (backward compatibility)

### generation_trigger
- Values: `MANUAL`, `SCHEDULED`, `PRE_INSPECTION`, `DEADLINE_BASED`
- Used in: `audit_packs.generation_trigger`
- **v1.0 Addition:** `DEADLINE_BASED` added for auto-generation before permit renewal

### recipient_type
- Values: `REGULATOR`, `CLIENT`, `BOARD`, `INSURER`, `INTERNAL`
- Used in: `audit_packs.recipient_type`
- **v1.0 Addition:** Identifies pack recipient type

### distribution_method
- Values: `DOWNLOAD`, `EMAIL`, `SHARED_LINK`
- Used in: `audit_packs.distribution_method`, `pack_sharing.distribution_method`
- **v1.0 Addition:** Tracks how pack was distributed

### consultant_assignment_status
- Values: `ACTIVE`, `INACTIVE`
- Used in: `consultant_client_assignments.status`
- **v1.0 Addition:** Tracks consultant client assignment status

## 13.3 Module 2 Enums (Trade Effluent)

### parameter_type
- Values: `BOD`, `COD`, `SS`, `PH`, `TEMPERATURE`, `FOG`, `AMMONIA`, `PHOSPHORUS`
- Used in: `parameters.parameter_type`

### limit_type
- Values: `MAXIMUM`, `AVERAGE`, `RANGE`
- Used in: `parameters.limit_type`

### sampling_frequency
- Values: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUAL`
- Used in: `parameters.sampling_frequency`

### exceedance_status
- Values: `OPEN`, `RESOLVED`, `CLOSED`
- Used in: `exceedances.status`

## 13.4 Module 3 Enums (MCPD/Generators)

### generator_type
- Values: `MCPD_1_5MW`, `MCPD_5_50MW`, `SPECIFIED_GENERATOR`, `EMERGENCY_GENERATOR`
- Used in: `generators.generator_type`

### compliance_status
- Values: `PENDING`, `PASS`, `FAIL`, `NON_COMPLIANT`
- Used in: `stack_tests.compliance_status`

### aer_status
- Values: `DRAFT`, `READY`, `SUBMITTED`, `ACKNOWLEDGED`
- Used in: `aer_documents.status`

## 13.5 System Enums

### user_role
- Values: `OWNER`, `ADMIN`, `STAFF`, `CONSULTANT`, `VIEWER`
- Used in: `user_roles.role`

### notification_type
- Values: See `notifications.notification_type` CHECK constraint for complete list
- Includes: `DEADLINE_WARNING_7D`, `DEADLINE_WARNING_3D`, `DEADLINE_WARNING_1D`, `OVERDUE_OBLIGATION`, `EVIDENCE_REMINDER`, `PERMIT_RENEWAL_REMINDER`, `PARAMETER_EXCEEDANCE_80/90/100`, `RUN_HOUR_BREACH_80/90/100`, `AUDIT_PACK_READY`, `REGULATOR_PACK_READY`, `TENDER_PACK_READY`, `BOARD_PACK_READY`, `INSURER_PACK_READY`, `PACK_DISTRIBUTED`, `CONSULTANT_CLIENT_ASSIGNED`, `CONSULTANT_CLIENT_PACK_GENERATED`, `CONSULTANT_CLIENT_ACTIVITY`, `SYSTEM_ALERT`, `ESCALATION`, `DEADLINE_ALERT`, `EXCEEDANCE`, `BREACH`, `MODULE_ACTIVATION`
- Used in: `notifications.notification_type`
- **Note:** Replaces `alert_type` field. See Notification Messaging Specification for complete notification type definitions.

### priority
- Values: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`, `URGENT`
- Used in: `notifications.priority`
- **Note:** Replaces `severity` field. Maps to severity levels: LOW/NORMAL=INFO, HIGH=WARNING, CRITICAL/URGENT=CRITICAL

### channel
- Values: `EMAIL`, `SMS`, `IN_APP`, `PUSH`
- Used in: `notifications.channel`

**Reference:** Canonical Dictionary Section D (Enums and Status Values)

---

# 14. Database Extensions

## 14.1 Required Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search and trigram similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**Reference:** Technical Architecture Section 1.1

## 14.2 Extension Usage

**uuid-ossp:**
- Provides `gen_random_uuid()` function for UUID primary key defaults
- Alternative: PostgreSQL 13+ has built-in `gen_random_uuid()`, but extension ensures compatibility

**pg_trgm:**
- Provides trigram similarity for fuzzy text search
- Used in: `idx_documents_title_trgm` index
- Enables similarity searches on document titles and obligation text

---

# 15. RLS Enablement

## 15.1 RLS Strategy

**High-Level Approach:**
- RLS enabled on ALL tenant-scoped tables
- RLS policies enforce company/site isolation at database level
- Policies reference PLS Section B.10 (Permissions Matrix) for role-based access

**Reference:** Technical Architecture Section 1.3

## 15.2 RLS Enablement Commands

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_contents ENABLE ROW LEVEL SECURITY;
-- Note: pack_access_logs does NOT have RLS (system table for external access tracking)
ALTER TABLE consultant_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceedances ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_hour_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulator_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

## 15.3 Tables with RLS Disabled

**System Tables (Global):**
- `system_settings` - Global system configuration
- `background_jobs` - System job queue (may be tenant-scoped in future)
- `dead_letter_queue` - System error queue

**Note:** Detailed RLS policy definitions will be provided in Document 2.8 (RLS & Permissions Rules).

---

# 16. Validation Rules

## 16.1 Field Validation

**Email Validation:**
- `users.email`: Must be valid email format (enforced at application level)
- Unique constraint ensures no duplicate emails

**URL Validation:**
- `users.avatar_url`: Must be valid URL format (enforced at application level)
- `notifications.action_url`: Must be valid URL format (enforced at application level)

**Date Validation:**
- All date fields: Must be valid DATE format
- `deadlines.due_date`: Cannot be in the past for new deadlines (enforced at application level)
- `documents.expiry_date`: Must be after `issue_date` if both provided (enforced at application level)

**Numeric Validation:**
- `obligations.confidence_score`: Must be between 0 and 1 (CHECK constraint)
- `sites.grace_period_days`: Must be >= 0 (CHECK constraint)
- `run_hour_records.hours_recorded`: Must be >= 0 (CHECK constraint)

**Text Length Validation:**
- `companies.name`: Max 255 characters (enforced at application level)
- `documents.title`: Max 500 characters (enforced at application level)
- `obligations.original_text`: No limit (TEXT type)

## 16.2 Business Logic Constraints

**Cross-Field Validations:**
- `deadlines.due_date >= deadlines.created_at` (enforced at application level)
- `documents.expiry_date >= documents.issue_date` (enforced at application level)
- `schedules.next_due_date >= schedules.base_date` (enforced at application level)

**Referential Integrity:**
- All foreign keys enforce referential integrity
- ON DELETE behavior ensures data consistency

**State Transition Rules:**
- Obligation status transitions enforced at application level (see PLS Section B.5.3)
- Document status transitions enforced at application level (see PLS Section A.8.2)
- Deadline status transitions enforced at application level (see PLS Section B.3)

**Reference:** Canonical Dictionary for complete validation rules

---

# Summary

This Database Schema document defines the complete database structure for the EcoComply platform. Key features:

- **Complete Coverage:** All tables, fields, indexes, and constraints from Canonical Dictionary
- **PostgreSQL 15+ (Supabase):** Optimized for Supabase platform with RLS support
- **UUID Primary Keys:** All tables use UUID for distributed system compatibility
- **Standard Audit Fields:** All tenant-scoped tables include created_at, updated_at, created_by, updated_by, deleted_at
- **RLS Enabled:** All tenant-scoped tables have Row Level Security enabled
- **Module Extension Pattern:** Data-driven module system via `modules` table
- **Performance Optimized:** Comprehensive indexing strategy from Technical Architecture
- **Special Fields:** Obligation versioning, job health monitoring, and other PLS-required fields

**Next Steps:**
- Document 2.3: Background Jobs Specification
- Document 2.8: RLS & Permissions Rules (detailed RLS policies)

---

**Document Status:** Complete  
**Last Updated:** 2025-01-01  
**Version:** 1.2

> [v1.2 UPDATE – Full High Level Product Plan Alignment – 2025-01-01]
> 
> **All tables have been updated to FULLY align with the High Level Product Plan:**
> - Added 21 additional tables to complete feature coverage
> - Module 1: condition_evidence_rules, evidence_completeness_scores, recurrence_trigger_rules, recurrence_events, recurrence_conditions
> - Module 2: reconciliation_rules, breach_likelihood_scores, predictive_breach_alerts, exposure_calculations, monthly_statements, statement_reconciliations, reconciliation_discrepancies
> - Module 3: regulation_thresholds, threshold_compliance_rules, frequency_calculations
> - Module 4: validation_rules, validation_rule_configs, validation_results
> - Cross-Cutting: condition_permissions
> - Total tables: 80 (up from 59)
> - All table creation orders and foreign key dependencies updated
> - **100% feature coverage** - All features from High Level Product Plan now have corresponding database tables

