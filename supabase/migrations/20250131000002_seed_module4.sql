-- Migration: 20250131000002_seed_module4.sql
-- Description: Seed Module 4 (Hazardous Waste Chain of Custody) in modules table
-- Author: Build System
-- Date: 2025-01-31
-- Order: After Module 4 tables created

-- ============================================================================
-- SEED MODULE 4
-- ============================================================================

-- Module 4: Hazardous Waste Chain of Custody (Requires Module 1)
INSERT INTO modules (
    module_code,
    module_name,
    module_description,
    requires_module_id,
    pricing_model,
    base_price,
    is_active,
    is_default,
    document_types,
    cross_sell_keywords,
    workflow_config
) VALUES (
    'MODULE_4',
    'Hazardous Waste Chain of Custody',
    'Hazardous waste chain of custody tracking and compliance. Track consignment notes, monitor chain of custody, validate contractor licences, detect chain breaks, and generate compliance reports.',
    (SELECT id FROM modules WHERE module_code = 'MODULE_1'), -- Requires Module 1
    'per_site',
    87.50, -- £87.50/month per site
    true,
    false, -- Not default (requires activation)
    '[]'::JSONB, -- Module 4 doesn't parse documents (manual entry only)
    ARRAY['waste', 'consignment', 'chain of custody', 'EWC', 'hazardous waste', 'waste stream', 'contractor', 'licence', 'chain break', 'end point proof']::TEXT[],
    '{"validation_enabled": true, "chain_break_detection": true, "licence_expiry_alerts": true}'::JSONB
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    module_4_id UUID;
    module_1_id UUID;
    module_4_requires UUID;
BEGIN
    -- Verify Module 4 exists
    SELECT id INTO module_4_id FROM modules WHERE module_code = 'MODULE_4';
    IF module_4_id IS NULL THEN
        RAISE EXCEPTION 'Module 4 not found';
    END IF;
    
    -- Verify Module 4 requires Module 1
    SELECT requires_module_id INTO module_4_requires FROM modules WHERE module_code = 'MODULE_4';
    IF module_4_requires IS NULL THEN
        RAISE EXCEPTION 'Module 4 should require Module 1';
    END IF;
    
    -- Verify Module 1 exists
    SELECT id INTO module_1_id FROM modules WHERE module_code = 'MODULE_1';
    IF module_1_id IS NULL THEN
        RAISE EXCEPTION 'Module 1 not found (Module 4 prerequisite)';
    END IF;
    
    -- Verify Module 4 requires Module 1 (ID match)
    IF module_4_requires != module_1_id THEN
        RAISE EXCEPTION 'Module 4 should require Module 1 (ID mismatch)';
    END IF;
    
    -- Verify Module 4 is not default
    IF EXISTS (SELECT 1 FROM modules WHERE module_code = 'MODULE_4' AND is_default = true) THEN
        RAISE EXCEPTION 'Module 4 should not be default';
    END IF;
    
    RAISE NOTICE 'Module 4 seeded successfully';
END $$;

