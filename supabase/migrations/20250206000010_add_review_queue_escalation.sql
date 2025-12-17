-- Migration: Add Review Queue Escalation Support
-- Purpose: Track escalation of stale review queue items per Implementation Blueprint Section 7.5
-- Escalation thresholds: Level 1 = 48h, Level 2 = 96h, Level 3 = 168h

-- =============================================================================
-- ADD ESCALATION COLUMNS TO REVIEW_QUEUE_ITEMS
-- =============================================================================

ALTER TABLE review_queue_items
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0
    CHECK (escalation_level >= 0 AND escalation_level <= 3),
ADD COLUMN IF NOT EXISTS last_escalation_notification_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the columns
COMMENT ON COLUMN review_queue_items.escalated_at IS 'Timestamp of first escalation (when item became stale after 48 hours)';
COMMENT ON COLUMN review_queue_items.escalation_level IS 'Current escalation level: 0=none, 1=48h stale, 2=96h stale, 3=168h+ stale (critical)';
COMMENT ON COLUMN review_queue_items.last_escalation_notification_at IS 'Last time an escalation notification was sent (for rate limiting)';

-- =============================================================================
-- CREATE INDEX FOR ESCALATION QUERIES
-- =============================================================================

-- Index for finding items that need escalation (PENDING status, ordered by age)
CREATE INDEX IF NOT EXISTS idx_review_queue_items_pending_escalation
ON review_queue_items (created_at ASC)
WHERE review_status = 'PENDING';

-- Index for escalation level reporting
CREATE INDEX IF NOT EXISTS idx_review_queue_items_escalation_level
ON review_queue_items (escalation_level DESC, company_id)
WHERE escalation_level > 0;

-- =============================================================================
-- CREATE ESCALATION AUDIT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_queue_escalation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_queue_item_id UUID NOT NULL REFERENCES review_queue_items(id) ON DELETE CASCADE,
    previous_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    hours_pending NUMERIC(10,2) NOT NULL,
    escalated_to_user_ids UUID[] NOT NULL DEFAULT '{}',
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_history_item_id ON review_queue_escalation_history(review_queue_item_id);
CREATE INDEX idx_escalation_history_created_at ON review_queue_escalation_history(created_at DESC);

COMMENT ON TABLE review_queue_escalation_history IS 'Audit trail of review queue escalations for compliance reporting';

-- =============================================================================
-- ENABLE RLS ON ESCALATION HISTORY
-- =============================================================================

ALTER TABLE review_queue_escalation_history ENABLE ROW LEVEL SECURITY;

-- Only company members can view escalation history for their items
CREATE POLICY "Users can view escalation history for their company items"
ON review_queue_escalation_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_queue_items rqi
        JOIN users u ON u.company_id = rqi.company_id
        WHERE rqi.id = review_queue_item_id
        AND u.id = auth.uid()
    )
);

-- Only system can insert escalation history (via service role)
CREATE POLICY "System can insert escalation history"
ON review_queue_escalation_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTION: Calculate escalation level based on hours pending
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_escalation_level(hours_pending NUMERIC)
RETURNS INTEGER AS $$
BEGIN
    IF hours_pending >= 168 THEN
        RETURN 3; -- Critical: 7+ days
    ELSIF hours_pending >= 96 THEN
        RETURN 2; -- High: 4+ days
    ELSIF hours_pending >= 48 THEN
        RETURN 1; -- Medium: 2+ days
    ELSE
        RETURN 0; -- No escalation needed
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_escalation_level IS 'Returns escalation level based on hours pending: 0=<48h, 1=48h+, 2=96h+, 3=168h+';

-- =============================================================================
-- VIEW: Pending items that need escalation check
-- =============================================================================

CREATE OR REPLACE VIEW review_queue_escalation_candidates AS
SELECT
    rqi.id,
    rqi.document_id,
    rqi.obligation_id,
    rqi.company_id,
    rqi.site_id,
    rqi.review_type,
    rqi.priority,
    rqi.hallucination_risk,
    rqi.escalation_level AS current_escalation_level,
    rqi.escalated_at,
    rqi.last_escalation_notification_at,
    rqi.created_at,
    EXTRACT(EPOCH FROM (NOW() - rqi.created_at)) / 3600 AS hours_pending,
    calculate_escalation_level(EXTRACT(EPOCH FROM (NOW() - rqi.created_at)) / 3600) AS calculated_level,
    c.name AS company_name,
    s.name AS site_name
FROM review_queue_items rqi
JOIN companies c ON c.id = rqi.company_id
JOIN sites s ON s.id = rqi.site_id
WHERE rqi.review_status = 'PENDING'
AND (
    -- Either never escalated and past 48h threshold
    (rqi.escalation_level = 0 AND EXTRACT(EPOCH FROM (NOW() - rqi.created_at)) / 3600 >= 48)
    OR
    -- Or needs level increase
    (rqi.escalation_level < 3 AND calculate_escalation_level(EXTRACT(EPOCH FROM (NOW() - rqi.created_at)) / 3600) > rqi.escalation_level)
)
ORDER BY hours_pending DESC;

COMMENT ON VIEW review_queue_escalation_candidates IS 'View of PENDING review queue items that need escalation level increase';
