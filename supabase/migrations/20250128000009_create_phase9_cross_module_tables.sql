-- Migration: 20250128000009_create_phase9_cross_module_tables.sql
-- Description: Create cross-module tables (module_activations, cross_sell_triggers, extraction_logs, consultant_client_assignments, pack_distributions)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 9 - Depends on companies, sites, modules, documents, audit_packs, users

-- 33. module_activations table (depends on companies, sites, modules, users)
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

-- 34. cross_sell_triggers table (depends on companies, sites, documents, modules)
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

-- 35. extraction_logs table (depends on documents)
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

-- 36. consultant_client_assignments table (depends on users, companies)
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

-- 37. pack_distributions table (depends on audit_packs)
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

-- RLS Performance Indexes (required for RLS policy performance)
CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);
CREATE INDEX idx_user_site_assignments_user_id_site_id ON user_site_assignments(user_id, site_id);
CREATE INDEX idx_consultant_client_assignments_consultant_id_active ON consultant_client_assignments(consultant_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_consultant_client_assignments_client_company_id_active ON consultant_client_assignments(client_company_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_module_activations_company_id_module_id_active ON module_activations(company_id, module_id) WHERE status = 'ACTIVE';

