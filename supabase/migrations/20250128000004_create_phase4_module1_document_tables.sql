-- Migration: 20250128000004_create_phase4_module1_document_tables.sql
-- Description: Create Module 1 document tables (documents, document_site_assignments)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 4 - Depends on sites, modules

-- 8. documents table (depends on sites, modules)
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

-- 9. document_site_assignments table (depends on documents, sites)
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

