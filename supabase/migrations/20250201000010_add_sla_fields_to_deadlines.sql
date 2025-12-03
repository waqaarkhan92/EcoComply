-- Add SLA tracking fields to deadlines table
-- Cross-cutting feature: SLA Timer Tracking

-- ============================================================================
-- ADD SLA FIELDS TO DEADLINES
-- ============================================================================

ALTER TABLE deadlines 
ADD COLUMN IF NOT EXISTS sla_target_date DATE,
ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_breach_duration_hours INTEGER;

CREATE INDEX IF NOT EXISTS idx_deadlines_sla_breached_at ON deadlines(sla_breached_at) WHERE sla_breached_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deadlines_sla_breach_duration ON deadlines(sla_breach_duration_hours) WHERE sla_breach_duration_hours IS NOT NULL;

