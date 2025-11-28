-- Migration: 20250128000003_create_phase3_excel_imports.sql
-- Description: Create excel_imports table (MUST be before obligations)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 3 - Depends on users, companies, sites
-- CRITICAL: This table MUST exist before obligations table

-- 7. excel_imports table (depends on users, companies, sites)
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

