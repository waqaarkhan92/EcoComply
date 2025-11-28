-- Migration: 20250128000006_create_phase6_module2_tables.sql
-- Description: Create Module 2 tables (Trade Effluent: parameters, lab_results, exceedances, discharge_volumes)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 6 - Depends on documents, companies, sites, modules

-- 17. parameters table (depends on documents, companies, sites, modules)
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

-- 18. lab_results table (depends on parameters, companies, sites)
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

-- 19. exceedances table (depends on parameters, lab_results, companies, sites)
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

-- 20. discharge_volumes table (depends on documents, companies, sites)
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

