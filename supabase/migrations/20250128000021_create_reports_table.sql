-- Migration: 20250128000021_create_reports_table.sql
-- Description: Create reports table for storing generated reports
-- Author: Build System
-- Date: 2025-01-28
-- Order: After system tables

-- ============================================================================
-- CREATE REPORTS TABLE
-- ============================================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('compliance_summary', 'deadline_report', 'obligation_report', 'evidence_report')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
    file_path TEXT, -- Path to generated PDF in storage
    file_size_bytes BIGINT,
    format TEXT NOT NULL DEFAULT 'PDF' CHECK (format IN ('PDF', 'CSV', 'JSON')),
    
    -- Report metadata
    filters JSONB NOT NULL DEFAULT '{}', -- Filters applied (site_id, date_range, etc.)
    generated_data JSONB, -- Cached report data (for quick access without re-generation)
    
    -- Job tracking
    background_job_id UUID REFERENCES background_jobs(id) ON DELETE SET NULL,
    
    -- Generation tracking
    generated_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration for cached reports
    
    -- Error tracking
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_company_id ON reports(company_id);
CREATE INDEX idx_reports_site_id ON reports(site_id);
CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_background_job_id ON reports(background_job_id);

-- RLS policies (will be enabled in RLS policies file)
-- Reports are company-scoped, users can only access reports for their company

-- Trigger for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

