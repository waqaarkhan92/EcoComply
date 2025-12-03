-- Migration: 20250201000013_create_recurrence_trigger_executions.sql
-- Description: Create recurrence_trigger_executions table for audit trail of trigger executions
-- Author: Build System
-- Date: 2025-02-01
-- Order: After recurrence_trigger_rules, recurrence_events, recurrence_conditions

CREATE TABLE recurrence_trigger_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_rule_id UUID NOT NULL REFERENCES recurrence_trigger_rules(id) ON DELETE CASCADE,
    event_id UUID REFERENCES recurrence_events(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_due_date DATE,
    execution_result TEXT NOT NULL,
    execution_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurrence_trigger_executions_trigger_rule_id ON recurrence_trigger_executions(trigger_rule_id);
CREATE INDEX idx_recurrence_trigger_executions_event_id ON recurrence_trigger_executions(event_id);
CREATE INDEX idx_recurrence_trigger_executions_schedule_id ON recurrence_trigger_executions(schedule_id);
CREATE INDEX idx_recurrence_trigger_executions_execution_date ON recurrence_trigger_executions(execution_date);

-- Enable RLS
ALTER TABLE recurrence_trigger_executions ENABLE ROW LEVEL SECURITY;

