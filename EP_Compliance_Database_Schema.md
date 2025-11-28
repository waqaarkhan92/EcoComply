# Database Schema
## Oblicore Platform — Document 2.2

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Canonical Dictionary (1.2) - Complete
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Technical Architecture (2.1) - Complete

**Purpose:** Defines the complete database structure, including all tables, fields, indexes, constraints, and relationships for the Oblicore platform.

> [v1 UPDATE – Version Header – 2024-12-27]

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
15. `regulator_questions`
16. `audit_packs`

**Phase 6: Module 2 Tables**
17. `parameters`
18. `lab_results`
19. `exceedances`
20. `discharge_volumes`

**Phase 7: Module 3 Tables**
21. `generators`
22. `run_hour_records`
23. `stack_tests`
24. `maintenance_records`
25. `aer_documents`

**Phase 8: System Tables**
26. `notifications`
27. `background_jobs`
28. `dead_letter_queue`
29. `audit_logs`
30. `review_queue_items`
31. `escalations`
32. `system_settings`

**Phase 9: Cross-Module Tables**
33. `module_activations`
34. `cross_sell_triggers`
35. `extraction_logs`
36. `consultant_client_assignments`

**Critical Foreign Key Dependencies:**
- `obligations.excel_import_id` → `excel_imports.id` (excel_imports MUST exist first)
- `obligations.document_id` → `documents.id`
- `deadlines.obligation_id` → `obligations.id`
- `obligation_evidence_links.obligation_id` → `obligations.id`
- `obligation_evidence_links.evidence_id` → `evidence_items.id`

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
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sites_company_id ON sites(company_id);
CREATE INDEX idx_sites_is_active ON sites(is_active);
CREATE INDEX idx_sites_regulator ON sites(regulator);
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_items_company_id ON evidence_items(company_id);
CREATE INDEX idx_evidence_items_site_id ON evidence_items(site_id);
CREATE INDEX idx_evidence_items_file_type ON evidence_items(file_type);
CREATE INDEX idx_evidence_items_uploaded_by ON evidence_items(uploaded_by);
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

## 4.8 audit_packs

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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_packs_document_id ON audit_packs(document_id) WHERE document_id IS NOT NULL; -- NULL for Board Pack
CREATE INDEX idx_audit_packs_company_id ON audit_packs(company_id);
CREATE INDEX idx_audit_packs_site_id ON audit_packs(site_id) WHERE site_id IS NOT NULL; -- NULL for Board Pack
CREATE INDEX idx_audit_packs_created_at ON audit_packs(created_at);
CREATE INDEX idx_audit_packs_generated_by ON audit_packs(generated_by);
CREATE INDEX idx_audit_packs_pack_type ON audit_packs(pack_type);
CREATE INDEX idx_audit_packs_shared_link_token ON audit_packs(shared_link_token) WHERE shared_link_token IS NOT NULL;
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

## 4.9 consultant_client_assignments

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

## 4.10 pack_distributions

> [v1 UPDATE – Pack Distribution – 2024-12-27]

**Purpose:** Tracks pack distribution history (email, shared links) for analytics and audit

**Entity:** PackDistribution

**RLS Enabled:** Yes

**Soft Delete:** No

```sql
CREATE TABLE pack_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    distributed_to TEXT NOT NULL,
    distributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    distribution_method TEXT NOT NULL
        CHECK (distribution_method IN ('EMAIL', 'SHARED_LINK')),
    email_address TEXT,
    shared_link_token TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pack_distributions_pack_id ON pack_distributions(pack_id);
CREATE INDEX idx_pack_distributions_distributed_at ON pack_distributions(distributed_at);
CREATE INDEX idx_pack_distributions_shared_link_token ON pack_distributions(shared_link_token) WHERE shared_link_token IS NOT NULL;
```

**Business Logic:**
- Tracks each distribution instance (email send, link generation)
- `distributed_to`: Recipient identifier (email address or name)
- `viewed_at`: Timestamp when shared link was first viewed
- `view_count`: Number of times shared link was accessed
- Used for analytics and compliance audit trail

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

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

## 5.4 discharge_volumes

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

---

# 7. System Tables

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

## 7.2 background_jobs

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

## 7.3 dead_letter_queue

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

## 7.4 audit_logs

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

## 7.5 regulator_questions

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

## 7.6 review_queue_items

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

## 7.7 escalations

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

## 7.8 excel_imports

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

## 7.9 system_settings

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

# 8. Cross-Module Tables

## 8.1 module_activations

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
CREATE UNIQUE INDEX uq_module_activations ON module_activations(company_id, site_id, module_id) 
    WHERE status = 'ACTIVE';
```

## 8.2 cross_sell_triggers

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

# 9. AI/Extraction Tables

## 9.1 extraction_logs

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

---

# 10. Indexes

## 10.1 Primary Key Indexes

All primary keys automatically create indexes with the naming pattern `{table}_pkey`. These are created by PostgreSQL automatically and do not need explicit CREATE INDEX statements.

## 10.2 Foreign Key Indexes

PostgreSQL automatically indexes foreign keys, but explicit indexes are documented for clarity and performance optimization.

## 10.3 Search Indexes

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

## 10.4 Composite Indexes

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

## 10.5 Performance Optimization Indexes

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

# 11. Constraints

## 11.1 Primary Key Constraints

All tables have a primary key constraint on the `id` column:
- Constraint name: `{table}_pkey`
- Type: UUID
- Default: `gen_random_uuid()`

## 11.2 Foreign Key Constraints

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

## 11.3 Unique Constraints

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

## 11.4 Check Constraints

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

## 11.5 NOT NULL Constraints

All fields marked as NOT NULL in the Canonical Dictionary are enforced at the database level. Fields that are nullable are explicitly marked as such.

---

# 12. Enums

## 12.1 Enum Implementation Strategy

**PostgreSQL ENUM Types vs CHECK Constraints:**

The schema uses CHECK constraints instead of PostgreSQL ENUM types for flexibility:
- Easier to add new values without ALTER TYPE
- Better compatibility with ORMs
- Simpler migration path

**Enum Value Format:**
- All enum values use UPPER_SNAKE_CASE
- Values must match Canonical Dictionary exactly

## 12.2 Core System Enums

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
- Used in: `audit_packs.distribution_method`, `pack_distributions.distribution_method`
- **v1.0 Addition:** Tracks how pack was distributed

### consultant_assignment_status
- Values: `ACTIVE`, `INACTIVE`
- Used in: `consultant_client_assignments.status`
- **v1.0 Addition:** Tracks consultant client assignment status

## 12.3 Module 2 Enums (Trade Effluent)

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

## 12.4 Module 3 Enums (MCPD/Generators)

### generator_type
- Values: `MCPD_1_5MW`, `MCPD_5_50MW`, `SPECIFIED_GENERATOR`, `EMERGENCY_GENERATOR`
- Used in: `generators.generator_type`

### compliance_status
- Values: `PENDING`, `PASS`, `FAIL`, `NON_COMPLIANT`
- Used in: `stack_tests.compliance_status`

### aer_status
- Values: `DRAFT`, `READY`, `SUBMITTED`, `ACKNOWLEDGED`
- Used in: `aer_documents.status`

## 12.5 System Enums

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

# 13. Database Extensions

## 13.1 Required Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search and trigram similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**Reference:** Technical Architecture Section 1.1

## 13.2 Extension Usage

**uuid-ossp:**
- Provides `gen_random_uuid()` function for UUID primary key defaults
- Alternative: PostgreSQL 13+ has built-in `gen_random_uuid()`, but extension ensures compatibility

**pg_trgm:**
- Provides trigram similarity for fuzzy text search
- Used in: `idx_documents_title_trgm` index
- Enables similarity searches on document titles and obligation text

---

# 14. RLS Enablement

## 14.1 RLS Strategy

**High-Level Approach:**
- RLS enabled on ALL tenant-scoped tables
- RLS policies enforce company/site isolation at database level
- Policies reference PLS Section B.10 (Permissions Matrix) for role-based access

**Reference:** Technical Architecture Section 1.3

## 14.2 RLS Enablement Commands

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
ALTER TABLE consultant_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_distributions ENABLE ROW LEVEL SECURITY;
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

## 14.3 Tables with RLS Disabled

**System Tables (Global):**
- `system_settings` - Global system configuration
- `background_jobs` - System job queue (may be tenant-scoped in future)
- `dead_letter_queue` - System error queue

**Note:** Detailed RLS policy definitions will be provided in Document 2.8 (RLS & Permissions Rules).

---

# 15. Validation Rules

## 15.1 Field Validation

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

## 15.2 Business Logic Constraints

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

This Database Schema document defines the complete database structure for the Oblicore platform. Key features:

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
**Version:** 1.0

