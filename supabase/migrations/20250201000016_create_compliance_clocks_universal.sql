-- Migration: 20250201000016_create_compliance_clocks_universal.sql
-- Description: Create compliance_clocks_universal table and compliance_clock_dashboard materialized view
-- Author: Build System
-- Date: 2025-02-01
-- Order: After core tables and modules

-- 9.2 compliance_clocks_universal
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

-- Add updated_at trigger
CREATE TRIGGER update_compliance_clocks_universal_updated_at
    BEFORE UPDATE ON compliance_clocks_universal
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE compliance_clocks_universal ENABLE ROW LEVEL SECURITY;

-- 9.2 compliance_clock_dashboard (Materialized View)
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

-- Create unique index for materialized view (required for CONCURRENT refresh)
CREATE UNIQUE INDEX idx_compliance_clock_dashboard_pkey
    ON compliance_clock_dashboard(company_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX idx_compliance_clock_dashboard_company_id ON compliance_clock_dashboard(company_id);
CREATE INDEX idx_compliance_clock_dashboard_site_id ON compliance_clock_dashboard(site_id);
CREATE INDEX idx_compliance_clock_dashboard_module_id ON compliance_clock_dashboard(module_id);

