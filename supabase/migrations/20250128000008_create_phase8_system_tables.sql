-- Migration: 20250128000008_create_phase8_system_tables.sql
-- Description: Create system tables (notifications, background_jobs, dead_letter_queue, audit_logs, review_queue_items, escalations, system_settings)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 8 - Depends on users, companies, sites, documents, obligations

-- 26. notifications table (depends on users, companies, sites)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient Information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT,
    
    -- Notification Details
    notification_type TEXT NOT NULL 
        CHECK (notification_type IN (
            'DEADLINE_WARNING_7D',
            'DEADLINE_WARNING_3D',
            'DEADLINE_WARNING_1D',
            'OVERDUE_OBLIGATION',
            'EVIDENCE_REMINDER',
            'PERMIT_RENEWAL_REMINDER',
            'PARAMETER_EXCEEDANCE_80',
            'PARAMETER_EXCEEDANCE_90',
            'PARAMETER_EXCEEDANCE_100',
            'RUN_HOUR_BREACH_80',
            'RUN_HOUR_BREACH_90',
            'RUN_HOUR_BREACH_100',
            'AUDIT_PACK_READY',
            'REGULATOR_PACK_READY',
            'TENDER_PACK_READY',
            'BOARD_PACK_READY',
            'INSURER_PACK_READY',
            'PACK_DISTRIBUTED',
            'CONSULTANT_CLIENT_ASSIGNED',
            'CONSULTANT_CLIENT_PACK_GENERATED',
            'CONSULTANT_CLIENT_ACTIVITY',
            'SYSTEM_ALERT',
            'ESCALATION',
            'DEADLINE_ALERT',
            'EXCEEDANCE',
            'BREACH',
            'MODULE_ACTIVATION'
        )),
    channel TEXT NOT NULL 
        CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP', 'PUSH')),
    priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT')),
    
    -- Content
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}',
    
    -- Delivery Tracking
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED')),
    delivery_status TEXT
        CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED')),
    delivery_provider TEXT,
    delivery_provider_id TEXT,
    delivery_error TEXT,
    
    -- Escalation
    is_escalation BOOLEAN NOT NULL DEFAULT false,
    escalation_level INTEGER CHECK (escalation_level >= 1 AND escalation_level <= 3),
    escalation_state TEXT DEFAULT 'PENDING'
        CHECK (escalation_state IN ('PENDING', 'ESCALATED_LEVEL_1', 'ESCALATED_LEVEL_2', 'ESCALATED_LEVEL_3', 'RESOLVED')),
    escalation_delay_minutes INTEGER DEFAULT 60 
        CHECK (escalation_delay_minutes >= 0),
    max_retries INTEGER DEFAULT 3 
        CHECK (max_retries >= 0),
    
    -- Entity Reference
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    actioned_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_site_id ON notifications(site_id);
CREATE INDEX idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX idx_notifications_escalation_state ON notifications(escalation_state);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_escalation_check ON notifications(entity_type, entity_id, escalation_state, created_at);

-- 27. background_jobs table (no RLS, system table)
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    priority INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    error_stack TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 2,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_backoff_seconds INTEGER NOT NULL DEFAULT 2,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    health_status TEXT NOT NULL DEFAULT 'HEALTHY' 
        CHECK (health_status IN ('HEALTHY', 'STALE', 'FAILED')),
    heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 60,
    dead_letter_queue_id UUID, -- Will reference dead_letter_queue(id) after it's created
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_scheduled_for ON background_jobs(scheduled_for);
CREATE INDEX idx_background_jobs_priority_scheduled ON background_jobs(priority DESC, scheduled_for ASC);
CREATE INDEX idx_background_jobs_health ON background_jobs(health_status, last_heartbeat) 
    WHERE health_status != 'HEALTHY';

-- 28. dead_letter_queue table (no RLS, system table, depends on background_jobs, companies)
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_context JSONB NOT NULL DEFAULT '{}',
    retry_count INTEGER NOT NULL,
    last_attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dead_letter_queue_job_id ON dead_letter_queue(job_id);
CREATE INDEX idx_dead_letter_queue_company_id ON dead_letter_queue(company_id);
CREATE INDEX idx_dead_letter_queue_resolved_at ON dead_letter_queue(resolved_at) 
    WHERE resolved_at IS NULL;

-- Now add the foreign key constraint for background_jobs.dead_letter_queue_id
ALTER TABLE background_jobs 
    ADD CONSTRAINT fk_background_jobs_dead_letter_queue 
    FOREIGN KEY (dead_letter_queue_id) REFERENCES dead_letter_queue(id) ON DELETE SET NULL;

-- 29. audit_logs table (depends on companies, users)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 30. review_queue_items table (depends on documents, obligations, companies, sites)
CREATE TABLE review_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL 
        CHECK (review_type IN ('LOW_CONFIDENCE', 'SUBJECTIVE', 'NO_MATCH', 'DATE_FAILURE', 'DUPLICATE', 'OCR_QUALITY', 'CONFLICT', 'HALLUCINATION')),
    is_blocking BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    hallucination_risk BOOLEAN NOT NULL DEFAULT false,
    original_data JSONB NOT NULL DEFAULT '{}',
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING', 'CONFIRMED', 'EDITED', 'REJECTED', 'PENDING_INTERPRETATION', 'INTERPRETED', 'NOT_APPLICABLE')),
    review_action TEXT 
        CHECK (review_action IN ('confirmed', 'edited', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    edited_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_items_document_id ON review_queue_items(document_id);
CREATE INDEX idx_review_queue_items_obligation_id ON review_queue_items(obligation_id);
CREATE INDEX idx_review_queue_items_company_id ON review_queue_items(company_id);
CREATE INDEX idx_review_queue_items_site_id ON review_queue_items(site_id);
CREATE INDEX idx_review_queue_items_review_status ON review_queue_items(review_status);
CREATE INDEX idx_review_queue_items_is_blocking ON review_queue_items(is_blocking);
CREATE INDEX idx_review_queue_items_priority ON review_queue_items(priority DESC);

-- 31. escalations table (depends on obligations, companies, sites, users)
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL CHECK (current_level >= 1 AND current_level <= 4),
    escalation_reason TEXT NOT NULL,
    escalated_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    previous_escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalations_obligation_id ON escalations(obligation_id);
CREATE INDEX idx_escalations_company_id ON escalations(company_id);
CREATE INDEX idx_escalations_site_id ON escalations(site_id);
CREATE INDEX idx_escalations_escalated_to ON escalations(escalated_to);
CREATE INDEX idx_escalations_current_level ON escalations(current_level);
CREATE INDEX idx_escalations_resolved_at ON escalations(resolved_at) 
    WHERE resolved_at IS NULL;

-- 32. system_settings table (no RLS, global settings)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_settings_setting_key ON system_settings(setting_key);

