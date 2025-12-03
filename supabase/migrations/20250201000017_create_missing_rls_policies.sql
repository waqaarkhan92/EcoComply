-- Migration: 20250201000017_create_missing_rls_policies.sql
-- Description: Create RLS policies for newly created tables that have RLS enabled but no policies
-- Author: Build System
-- Date: 2025-02-01
-- Order: After all table creation migrations

-- ============================================================================
-- RECURRENCE TRIGGER EXECUTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY recurrence_trigger_executions_select_site_access ON recurrence_trigger_executions
FOR SELECT
USING (
  trigger_rule_id IN (
    SELECT id FROM recurrence_trigger_rules
    WHERE schedule_id IN (
      SELECT id FROM schedules
      WHERE obligation_id IN (
        SELECT id FROM obligations
        WHERE deleted_at IS NULL
        AND site_id IN (
          SELECT site_id FROM user_site_assignments
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY recurrence_trigger_executions_insert_system_access ON recurrence_trigger_executions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- No UPDATE policy - trigger executions are immutable audit records

CREATE POLICY recurrence_trigger_executions_delete_owner_admin_access ON recurrence_trigger_executions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM recurrence_trigger_rules rtr
    JOIN schedules s ON rtr.schedule_id = s.id
    JOIN obligations o ON s.obligation_id = o.id
    JOIN user_site_assignments usa ON usa.site_id = o.site_id
    WHERE rtr.id = recurrence_trigger_executions.trigger_rule_id
    AND o.deleted_at IS NULL
    AND usa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- MODULE 2 ADVANCED TABLES POLICIES
-- ============================================================================

-- RECONCILIATION RULES TABLE POLICIES
CREATE POLICY reconciliation_rules_select_site_module ON reconciliation_rules
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = reconciliation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY reconciliation_rules_insert_staff_module ON reconciliation_rules
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
    WHERE company_id = reconciliation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY reconciliation_rules_update_staff_module ON reconciliation_rules
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
    WHERE company_id = reconciliation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
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
    WHERE company_id = reconciliation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY reconciliation_rules_delete_owner_admin_module ON reconciliation_rules
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
    WHERE company_id = reconciliation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- BREACH LIKELIHOOD SCORES TABLE POLICIES
CREATE POLICY breach_likelihood_scores_select_site_module ON breach_likelihood_scores
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = breach_likelihood_scores.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY breach_likelihood_scores_insert_system_module ON breach_likelihood_scores
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = breach_likelihood_scores.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY breach_likelihood_scores_update_system_module ON breach_likelihood_scores
FOR UPDATE
USING (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = breach_likelihood_scores.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = breach_likelihood_scores.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY breach_likelihood_scores_delete_owner_admin_module ON breach_likelihood_scores
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
    WHERE company_id = breach_likelihood_scores.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- PREDICTIVE BREACH ALERTS TABLE POLICIES
CREATE POLICY predictive_breach_alerts_select_site_module ON predictive_breach_alerts
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = predictive_breach_alerts.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY predictive_breach_alerts_insert_system_module ON predictive_breach_alerts
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = predictive_breach_alerts.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY predictive_breach_alerts_update_staff_module ON predictive_breach_alerts
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
    WHERE company_id = predictive_breach_alerts.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
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
    WHERE company_id = predictive_breach_alerts.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY predictive_breach_alerts_delete_owner_admin_module ON predictive_breach_alerts
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
    WHERE company_id = predictive_breach_alerts.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- EXPOSURE CALCULATIONS TABLE POLICIES
CREATE POLICY exposure_calculations_select_site_module ON exposure_calculations
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = exposure_calculations.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY exposure_calculations_insert_system_module ON exposure_calculations
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = exposure_calculations.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY exposure_calculations_update_system_module ON exposure_calculations
FOR UPDATE
USING (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = exposure_calculations.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = exposure_calculations.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY exposure_calculations_delete_owner_admin_module ON exposure_calculations
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
    WHERE company_id = exposure_calculations.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_2' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- ============================================================================
-- MODULE 4 VALIDATION TABLES POLICIES
-- ============================================================================

-- VALIDATION RULES TABLE POLICIES
CREATE POLICY validation_rules_select_company_access ON validation_rules
FOR SELECT
USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR company_id IN (
    SELECT client_company_id FROM consultant_client_assignments
    WHERE consultant_id = auth.uid()
    AND status = 'ACTIVE'
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = validation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_4' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY validation_rules_insert_staff_module ON validation_rules
FOR INSERT
WITH CHECK (
  (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = validation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_4' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY validation_rules_update_staff_module ON validation_rules
FOR UPDATE
USING (
  (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = validation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_4' LIMIT 1)
    AND status = 'ACTIVE'
  )
)
WITH CHECK (
  (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = validation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_4' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY validation_rules_delete_owner_admin_module ON validation_rules
FOR DELETE
USING (
  (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = validation_rules.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_4' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- VALIDATION EXECUTIONS TABLE POLICIES
CREATE POLICY validation_executions_select_site_access ON validation_executions
FOR SELECT
USING (
  consignment_note_id IN (
    SELECT id FROM consignment_notes
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY validation_executions_insert_system_access ON validation_executions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- No UPDATE policy - validation executions are immutable audit records

CREATE POLICY validation_executions_delete_owner_admin_access ON validation_executions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM consignment_notes cn
    JOIN user_site_assignments usa ON usa.site_id = cn.site_id
    WHERE cn.id = validation_executions.consignment_note_id
    AND usa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- COMPLIANCE CLOCKS UNIVERSAL TABLE POLICIES
-- ============================================================================

CREATE POLICY compliance_clocks_universal_select_site_access ON compliance_clocks_universal
FOR SELECT
USING (
  -- Site-specific clocks: site access required
  (
    site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  OR
  -- Company-level clocks (no site_id): company access required
  (
    site_id IS NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  )
  OR
  -- Consultants: client company access
  (
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY compliance_clocks_universal_insert_system_access ON compliance_clocks_universal
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY compliance_clocks_universal_update_system_access ON compliance_clocks_universal
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY compliance_clocks_universal_delete_owner_admin_access ON compliance_clocks_universal
FOR DELETE
USING (
  -- Site-specific clocks
  (
    site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND site_id = compliance_clocks_universal.site_id
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
  OR
  -- Company-level clocks
  (
    site_id IS NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- COMPLIANCE CLOCK DASHBOARD MATERIALIZED VIEW POLICIES
-- ============================================================================

CREATE POLICY compliance_clock_dashboard_select_site_access ON compliance_clock_dashboard
FOR SELECT
USING (
  -- Site-specific dashboard: site access required
  (
    site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  OR
  -- Company-level dashboard (no site_id): company access required
  (
    site_id IS NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  )
  OR
  -- Consultants: client company access
  (
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

-- No INSERT, UPDATE, or DELETE policies - materialized view is read-only

-- ============================================================================
-- MODULE 3 FUEL USAGE LOGS AND SULPHUR CONTENT REPORTS POLICIES
-- ============================================================================

-- FUEL USAGE LOGS TABLE POLICIES
CREATE POLICY fuel_usage_logs_select_site_module ON fuel_usage_logs
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = fuel_usage_logs.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY fuel_usage_logs_insert_staff_module ON fuel_usage_logs
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
    WHERE company_id = fuel_usage_logs.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY fuel_usage_logs_update_staff_module ON fuel_usage_logs
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
    WHERE company_id = fuel_usage_logs.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
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
    WHERE company_id = fuel_usage_logs.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY fuel_usage_logs_delete_owner_admin_module ON fuel_usage_logs
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
    WHERE company_id = fuel_usage_logs.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

-- SULPHUR CONTENT REPORTS TABLE POLICIES
CREATE POLICY sulphur_content_reports_select_site_module ON sulphur_content_reports
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = sulphur_content_reports.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY sulphur_content_reports_insert_staff_module ON sulphur_content_reports
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
    WHERE company_id = sulphur_content_reports.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY sulphur_content_reports_update_staff_module ON sulphur_content_reports
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
    WHERE company_id = sulphur_content_reports.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
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
    WHERE company_id = sulphur_content_reports.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

CREATE POLICY sulphur_content_reports_delete_owner_admin_module ON sulphur_content_reports
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
    WHERE company_id = sulphur_content_reports.company_id
    AND module_id = (SELECT id FROM modules WHERE name = 'MODULE_3' LIMIT 1)
    AND status = 'ACTIVE'
  )
);

