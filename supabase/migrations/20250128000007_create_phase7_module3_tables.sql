-- Migration: 20250128000007_create_phase7_module3_tables.sql
-- Description: Create Module 3 tables (MCPD/Generators: generators, run_hour_records, stack_tests, maintenance_records, aer_documents)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 7 - Depends on documents, companies, evidence_items

-- 21. generators table (depends on documents, companies)
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

-- 22. run_hour_records table (depends on generators, companies, maintenance_records - circular dependency handled)
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
    source_maintenance_record_id UUID, -- Will reference maintenance_records(id) after it's created
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_run_hour_records_generator_id ON run_hour_records(generator_id);
CREATE INDEX idx_run_hour_records_company_id ON run_hour_records(company_id);
CREATE INDEX idx_run_hour_records_recording_date ON run_hour_records(recording_date);
CREATE INDEX idx_run_hour_records_percentage_of_annual_limit ON run_hour_records(percentage_of_annual_limit);

-- 23. stack_tests table (depends on generators, companies, evidence_items)
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

-- 24. maintenance_records table (depends on generators, companies, evidence_items)
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

-- Now add the foreign key constraint for run_hour_records.source_maintenance_record_id
ALTER TABLE run_hour_records 
    ADD CONSTRAINT fk_run_hour_records_maintenance_record 
    FOREIGN KEY (source_maintenance_record_id) REFERENCES maintenance_records(id) ON DELETE SET NULL;

-- 25. aer_documents table (depends on documents, companies)
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

