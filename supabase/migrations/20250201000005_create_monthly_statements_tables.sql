-- Monthly Statements and Reconciliation Tables
-- Module 2: Trade Effluent

-- ============================================================================
-- 1. MONTHLY STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    statement_period_start DATE NOT NULL,
    statement_period_end DATE NOT NULL,
    statement_date DATE NOT NULL,
    total_volume_m3 DECIMAL(12, 4) NOT NULL,
    total_charge DECIMAL(10, 2),
    statement_reference TEXT,
    water_company_name TEXT NOT NULL,
    statement_data JSONB NOT NULL DEFAULT '{}',
    document_path TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_statements_document_id ON monthly_statements(document_id);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_company_id ON monthly_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_site_id ON monthly_statements(site_id);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_statement_period_end ON monthly_statements(statement_period_end);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_statement_date ON monthly_statements(statement_date);

-- ============================================================================
-- 2. STATEMENT RECONCILIATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS statement_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_statement_id UUID NOT NULL REFERENCES monthly_statements(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    statement_volume_m3 DECIMAL(12, 4) NOT NULL,
    actual_volume_m3 DECIMAL(12, 4) NOT NULL,
    variance_m3 DECIMAL(12, 4) NOT NULL,
    variance_percent DECIMAL(6, 2) NOT NULL,
    reconciliation_status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (reconciliation_status IN ('PENDING', 'IN_PROGRESS', 'RECONCILED', 'DISCREPANCY', 'RESOLVED')),
    reconciliation_notes TEXT,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_reconciliations_monthly_statement_id ON statement_reconciliations(monthly_statement_id);
CREATE INDEX IF NOT EXISTS idx_statement_reconciliations_company_id ON statement_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_statement_reconciliations_site_id ON statement_reconciliations(site_id);
CREATE INDEX IF NOT EXISTS idx_statement_reconciliations_reconciliation_date ON statement_reconciliations(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_statement_reconciliations_reconciliation_status ON statement_reconciliations(reconciliation_status);

-- ============================================================================
-- 3. RECONCILIATION DISCREPANCIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_reconciliation_id UUID NOT NULL REFERENCES statement_reconciliations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    discrepancy_type TEXT NOT NULL
        CHECK (discrepancy_type IN ('VOLUME_MISMATCH', 'MISSING_DATA', 'DUPLICATE_ENTRY', 'DATE_MISMATCH', 'OTHER')),
    discrepancy_description TEXT NOT NULL,
    discrepancy_value DECIMAL(12, 4),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' 
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_statement_reconciliation_id ON reconciliation_discrepancies(statement_reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_company_id ON reconciliation_discrepancies(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_site_id ON reconciliation_discrepancies(site_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_discrepancy_type ON reconciliation_discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_is_resolved ON reconciliation_discrepancies(is_resolved) WHERE is_resolved = false;

-- ============================================================================
-- RLS POLICIES - CONDITIONAL (Only if view exists)
-- ============================================================================

ALTER TABLE monthly_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

-- monthly_statements policies (conditional on view existence)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    CREATE POLICY IF NOT EXISTS monthly_statements_select_site_module ON monthly_statements
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = monthly_statements.site_id
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS monthly_statements_insert_staff_module ON monthly_statements
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = monthly_statements.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS monthly_statements_update_staff_module ON monthly_statements
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = monthly_statements.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS monthly_statements_delete_owner_admin_module ON monthly_statements
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = monthly_statements.site_id
          AND usa.role IN ('OWNER', 'ADMIN')
          AND ma.is_active = true
        )
      );
  END IF;
END $$;

-- statement_reconciliations policies (conditional on view existence)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    CREATE POLICY IF NOT EXISTS statement_reconciliations_select_site_module ON statement_reconciliations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = statement_reconciliations.site_id
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS statement_reconciliations_insert_staff_module ON statement_reconciliations
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = statement_reconciliations.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS statement_reconciliations_update_staff_module ON statement_reconciliations
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = statement_reconciliations.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS statement_reconciliations_delete_owner_admin_module ON statement_reconciliations
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = statement_reconciliations.site_id
          AND usa.role IN ('OWNER', 'ADMIN')
          AND ma.is_active = true
        )
      );
  END IF;
END $$;

-- reconciliation_discrepancies policies (conditional on view existence)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    CREATE POLICY IF NOT EXISTS reconciliation_discrepancies_select_site_module ON reconciliation_discrepancies
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = reconciliation_discrepancies.site_id
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS reconciliation_discrepancies_insert_staff_module ON reconciliation_discrepancies
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = reconciliation_discrepancies.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );

    CREATE POLICY IF NOT EXISTS reconciliation_discrepancies_update_staff_module ON reconciliation_discrepancies
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access usa
          JOIN module_activations ma ON ma.site_id = usa.site_id
          JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_2'
          WHERE usa.user_id = auth.uid()
          AND usa.site_id = reconciliation_discrepancies.site_id
          AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
          AND ma.is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for monthly_statements
CREATE OR REPLACE FUNCTION update_monthly_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_statements_updated_at
    BEFORE UPDATE ON monthly_statements
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_statements_updated_at();

-- Update updated_at for statement_reconciliations
CREATE OR REPLACE FUNCTION update_statement_reconciliations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_statement_reconciliations_updated_at
    BEFORE UPDATE ON statement_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_statement_reconciliations_updated_at();

-- Update updated_at for reconciliation_discrepancies
CREATE OR REPLACE FUNCTION update_reconciliation_discrepancies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reconciliation_discrepancies_updated_at
    BEFORE UPDATE ON reconciliation_discrepancies
    FOR EACH ROW
    EXECUTE FUNCTION update_reconciliation_discrepancies_updated_at();



-- Deferred Foreign Key Constraints
-- Deferred FK: monthly_statement_id -> monthly_statements
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monthly_statements') THEN
    ALTER TABLE monthly_statements 
    ADD CONSTRAINT fk_monthly_statements_monthly_statement_id
    FOREIGN KEY (monthly_statement_id) REFERENCES monthly_statements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Deferred FK: statement_reconciliation_id -> statement_reconciliations
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statement_reconciliations') THEN
    ALTER TABLE monthly_statements 
    ADD CONSTRAINT fk_monthly_statements_statement_reconciliation_id
    FOREIGN KEY (statement_reconciliation_id) REFERENCES statement_reconciliations(id) ON DELETE CASCADE;
  END IF;
END $$;