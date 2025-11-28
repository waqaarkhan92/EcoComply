-- Migration: 20250128000005_create_phase5_module1_core_tables.sql
-- Description: Create Module 1 core tables (obligations, schedules, deadlines, evidence_items, obligation_evidence_links, regulator_questions, audit_packs)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 5 - Depends on documents, excel_imports, companies, sites, modules

-- 10. obligations table (CRITICAL: depends on documents, excel_imports, companies, sites, modules)
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

-- Prevent duplicate obligations from same condition
CREATE UNIQUE INDEX uq_obligations_document_condition 
  ON obligations(document_id, condition_reference) 
  WHERE deleted_at IS NULL AND condition_reference IS NOT NULL;

-- 11. schedules table (depends on obligations)
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

-- Ensure schedules next_due_date is after base_date
ALTER TABLE schedules ADD CONSTRAINT chk_schedules_next_due_after_base
  CHECK (next_due_date IS NULL OR next_due_date >= base_date);

-- 12. deadlines table (depends on schedules, obligations, companies, sites)
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

-- Ensure deadlines due_date is after created_at
ALTER TABLE deadlines ADD CONSTRAINT chk_deadlines_due_after_created
  CHECK (due_date >= created_at::date);

-- 13. evidence_items table (depends on companies, sites)
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

-- 14. obligation_evidence_links table (depends on obligations, evidence_items)
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

-- 15. regulator_questions table (depends on companies, sites, documents, obligations)
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

-- 16. audit_packs table (depends on documents, companies, sites)
CREATE TABLE audit_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    CHECK ((pack_type = 'BOARD_MULTI_SITE_RISK' AND site_id IS NULL) OR (pack_type != 'BOARD_MULTI_SITE_RISK' AND site_id IS NOT NULL)),
    pack_type TEXT NOT NULL DEFAULT 'AUDIT_PACK'
        CHECK (pack_type IN (
            'AUDIT_PACK',
            'REGULATOR_INSPECTION',
            'TENDER_CLIENT_ASSURANCE',
            'BOARD_MULTI_SITE_RISK',
            'INSURER_BROKER',
            'COMBINED'
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

CREATE INDEX idx_audit_packs_document_id ON audit_packs(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX idx_audit_packs_company_id ON audit_packs(company_id);
CREATE INDEX idx_audit_packs_site_id ON audit_packs(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_audit_packs_created_at ON audit_packs(created_at);
CREATE INDEX idx_audit_packs_generated_by ON audit_packs(generated_by);
CREATE INDEX idx_audit_packs_pack_type ON audit_packs(pack_type);
CREATE INDEX idx_audit_packs_shared_link_token ON audit_packs(shared_link_token) WHERE shared_link_token IS NOT NULL;

