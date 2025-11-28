-- Migration: 20250128000015_create_rls_policies_module2_3.sql
-- Description: Create RLS policies for Module 2 & 3 tables (with module activation checks)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - After Module 1 policies

-- ============================================================================
-- MODULE 2 TABLES POLICIES (Trade Effluent)
-- All Module 2 tables require module activation check via module_activations table
-- ============================================================================

-- PARAMETERS TABLE POLICIES
CREATE POLICY parameters_select_site_module ON parameters
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND status = 'ACTIVE'
  )
);

CREATE POLICY parameters_insert_staff_module ON parameters
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND status = 'ACTIVE'
  )
);

CREATE POLICY parameters_update_staff_module ON parameters
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND status = 'ACTIVE'
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND status = 'ACTIVE'
  )
);

CREATE POLICY parameters_delete_owner_admin_module ON parameters
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND status = 'ACTIVE'
  )
);

-- LAB RESULTS TABLE POLICIES
CREATE POLICY lab_results_select_site_module ON lab_results
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = lab_results.parameter_id
    WHERE ma.company_id = lab_results.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY lab_results_insert_staff_module ON lab_results
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = lab_results.parameter_id
    WHERE ma.company_id = lab_results.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY lab_results_update_staff_module ON lab_results
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = lab_results.parameter_id
    WHERE ma.company_id = lab_results.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = lab_results.parameter_id
    WHERE ma.company_id = lab_results.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY lab_results_delete_owner_admin_module ON lab_results
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = lab_results.parameter_id
    WHERE ma.company_id = lab_results.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- EXCEEDANCES TABLE POLICIES
CREATE POLICY exceedances_select_site_module ON exceedances
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = exceedances.parameter_id
    WHERE ma.company_id = exceedances.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY exceedances_insert_system_module ON exceedances
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = exceedances.parameter_id
    WHERE ma.company_id = exceedances.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY exceedances_update_staff_module ON exceedances
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = exceedances.parameter_id
    WHERE ma.company_id = exceedances.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = exceedances.parameter_id
    WHERE ma.company_id = exceedances.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY exceedances_delete_owner_admin_module ON exceedances
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN parameters p ON p.id = exceedances.parameter_id
    WHERE ma.company_id = exceedances.company_id
    AND ma.module_id = p.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- DISCHARGE VOLUMES TABLE POLICIES
CREATE POLICY discharge_volumes_select_site_module ON discharge_volumes
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = discharge_volumes.document_id
    WHERE ma.company_id = discharge_volumes.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY discharge_volumes_insert_staff_module ON discharge_volumes
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = discharge_volumes.document_id
    WHERE ma.company_id = discharge_volumes.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY discharge_volumes_update_staff_module ON discharge_volumes
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = discharge_volumes.document_id
    WHERE ma.company_id = discharge_volumes.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = discharge_volumes.document_id
    WHERE ma.company_id = discharge_volumes.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY discharge_volumes_delete_owner_admin_module ON discharge_volumes
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = discharge_volumes.document_id
    WHERE ma.company_id = discharge_volumes.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- ============================================================================
-- MODULE 3 TABLES POLICIES (MCPD/Generators)
-- All Module 3 tables require module activation check via module_activations table
-- ============================================================================

-- GENERATORS TABLE POLICIES
CREATE POLICY generators_select_site_module ON generators
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = generators.document_id
    WHERE ma.company_id = generators.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY generators_insert_staff_module ON generators
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = generators.document_id
    WHERE ma.company_id = generators.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY generators_update_staff_module ON generators
FOR UPDATE
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = generators.document_id
    WHERE ma.company_id = generators.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = generators.document_id
    WHERE ma.company_id = generators.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY generators_delete_owner_admin_module ON generators
FOR DELETE
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = generators.document_id
    WHERE ma.company_id = generators.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- RUN HOUR RECORDS TABLE POLICIES
CREATE POLICY run_hour_records_select_site_module ON run_hour_records
FOR SELECT
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.deleted_at IS NULL
    AND d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = run_hour_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = run_hour_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY run_hour_records_insert_staff_module ON run_hour_records
FOR INSERT
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = run_hour_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = run_hour_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY run_hour_records_update_staff_module ON run_hour_records
FOR UPDATE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = run_hour_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = run_hour_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = run_hour_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = run_hour_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY run_hour_records_delete_owner_admin_module ON run_hour_records
FOR DELETE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = run_hour_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = run_hour_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- STACK TESTS TABLE POLICIES
CREATE POLICY stack_tests_select_site_module ON stack_tests
FOR SELECT
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.deleted_at IS NULL
    AND d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = stack_tests.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = stack_tests.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY stack_tests_insert_staff_module ON stack_tests
FOR INSERT
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = stack_tests.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = stack_tests.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY stack_tests_update_staff_module ON stack_tests
FOR UPDATE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = stack_tests.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = stack_tests.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = stack_tests.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = stack_tests.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY stack_tests_delete_owner_admin_module ON stack_tests
FOR DELETE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = stack_tests.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = stack_tests.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- MAINTENANCE RECORDS TABLE POLICIES
CREATE POLICY maintenance_records_select_site_module ON maintenance_records
FOR SELECT
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.deleted_at IS NULL
    AND d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = maintenance_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = maintenance_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY maintenance_records_insert_staff_module ON maintenance_records
FOR INSERT
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = maintenance_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = maintenance_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY maintenance_records_update_staff_module ON maintenance_records
FOR UPDATE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = maintenance_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = maintenance_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = maintenance_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = maintenance_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY maintenance_records_delete_owner_admin_module ON maintenance_records
FOR DELETE
USING (
  generator_id IN (
    SELECT g.id FROM generators g
    INNER JOIN documents d ON d.id = g.document_id
    WHERE d.site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN generators g ON g.id = maintenance_records.generator_id
    INNER JOIN documents d ON d.id = g.document_id
    WHERE ma.company_id = maintenance_records.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

-- AER DOCUMENTS TABLE POLICIES
CREATE POLICY aer_documents_select_site_module ON aer_documents
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = aer_documents.document_id
    WHERE ma.company_id = aer_documents.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY aer_documents_insert_staff_module ON aer_documents
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = aer_documents.document_id
    WHERE ma.company_id = aer_documents.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY aer_documents_update_staff_module ON aer_documents
FOR UPDATE
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = aer_documents.document_id
    WHERE ma.company_id = aer_documents.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
)
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = aer_documents.document_id
    WHERE ma.company_id = aer_documents.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

CREATE POLICY aer_documents_delete_owner_admin_module ON aer_documents
FOR DELETE
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations ma
    INNER JOIN documents d ON d.id = aer_documents.document_id
    WHERE ma.company_id = aer_documents.company_id
    AND ma.module_id = d.module_id
    AND ma.status = 'ACTIVE'
  )
);

