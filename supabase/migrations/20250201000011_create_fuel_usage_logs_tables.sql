-- Migration: 20250201000011_create_fuel_usage_logs_tables.sql
-- Description: Create fuel_usage_logs and sulphur_content_reports tables for Module 3
-- Author: Build System
-- Date: 2025-02-01
-- Order: After Module 3 core tables, depends on generators, companies, sites, evidence_items, maintenance_records

-- 6.12 fuel_usage_logs table (depends on generators, companies, sites, evidence_items, maintenance_records)
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

-- 6.13 sulphur_content_reports table (depends on generators, companies, sites, evidence_items)
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

-- Add updated_at trigger for fuel_usage_logs
CREATE TRIGGER update_fuel_usage_logs_updated_at
    BEFORE UPDATE ON fuel_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for sulphur_content_reports
CREATE TRIGGER update_sulphur_content_reports_updated_at
    BEFORE UPDATE ON sulphur_content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE fuel_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sulphur_content_reports ENABLE ROW LEVEL SECURITY;

