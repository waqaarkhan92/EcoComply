-- Migration: 20250128000018_seed_modules.sql
-- Description: Seed modules table with initial data (Module 1, 2, 3)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.6 - After auth integration

-- ============================================================================
-- SEED MODULES TABLE
-- ============================================================================

-- Module 1: Environmental Permits (Default module, no prerequisite)
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
    'MODULE_1',
    'Environmental Permits',
    'Environmental permit compliance management for EA, SEPA, NRW, and NIEA permits. Extract obligations, track deadlines, manage evidence, and generate compliance packs.',
    NULL, -- No prerequisite
    'per_site',
    149.00, -- £149/month per site
    true,
    true, -- Default module (activated on signup)
    '["ENVIRONMENTAL_PERMIT"]'::JSONB,
    ARRAY[]::TEXT[], -- No cross-sell keywords (this is the entry module)
    '{"extraction_model": "gpt-4o", "confidence_threshold": 0.7, "subjective_obligation_flag": true}'::JSONB
);

-- Module 2: Trade Effluent (Requires Module 1)
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
    'MODULE_2',
    'Trade Effluent',
    'Trade effluent consent compliance and parameter tracking. Monitor discharge limits, track lab results, detect exceedances, and generate water company reports.',
    (SELECT id FROM modules WHERE module_code = 'MODULE_1'), -- Requires Module 1
    'per_site',
    59.00, -- £59/month per site
    true,
    false, -- Not default (requires activation)
    '["TRADE_EFFLUENT_CONSENT"]'::JSONB,
    ARRAY['trade effluent', 'effluent', 'discharge', 'water company', 'consent', 'parameter', 'lab result', 'exceedance', 'surcharge']::TEXT[],
    '{"extraction_model": "gpt-4o", "confidence_threshold": 0.7, "exceedance_threshold": 0.8}'::JSONB
);

-- Module 3: MCPD/Generators (Requires Module 1)
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
    'MODULE_3',
    'MCPD/Generators',
    'Medium Combustion Plant Directive compliance and generator run-hour tracking. Monitor run-hour limits, track maintenance, schedule stack tests, and generate annual returns.',
    (SELECT id FROM modules WHERE module_code = 'MODULE_1'), -- Requires Module 1
    'per_company',
    79.00, -- £79/month per company
    true,
    false, -- Not default (requires activation)
    '["MCPD_REGISTRATION"]'::JSONB,
    ARRAY['generator', 'mcpd', 'run hour', 'run-hour', 'combustion', 'stack test', 'maintenance', 'annual return', 'breach']::TEXT[],
    '{"extraction_model": "gpt-4o", "confidence_threshold": 0.7, "breach_thresholds": {"warning": 0.8, "critical": 0.9, "breach": 1.0}}'::JSONB
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify modules were inserted correctly
DO $$
DECLARE
    module_count INTEGER;
    module_1_id UUID;
    module_2_requires UUID;
    module_3_requires UUID;
BEGIN
    -- Count modules
    SELECT COUNT(*) INTO module_count FROM modules;
    IF module_count != 3 THEN
        RAISE EXCEPTION 'Expected 3 modules, found %', module_count;
    END IF;
    
    -- Verify Module 1 (no prerequisite)
    SELECT id INTO module_1_id FROM modules WHERE module_code = 'MODULE_1';
    IF module_1_id IS NULL THEN
        RAISE EXCEPTION 'Module 1 not found';
    END IF;
    IF EXISTS (SELECT 1 FROM modules WHERE module_code = 'MODULE_1' AND requires_module_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Module 1 should not have a prerequisite';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM modules WHERE module_code = 'MODULE_1' AND is_default = true) THEN
        RAISE EXCEPTION 'Module 1 should be default';
    END IF;
    
    -- Verify Module 2 (requires Module 1)
    SELECT requires_module_id INTO module_2_requires FROM modules WHERE module_code = 'MODULE_2';
    IF module_2_requires IS NULL THEN
        RAISE EXCEPTION 'Module 2 should require Module 1';
    END IF;
    IF module_2_requires != module_1_id THEN
        RAISE EXCEPTION 'Module 2 should require Module 1 (ID mismatch)';
    END IF;
    
    -- Verify Module 3 (requires Module 1)
    SELECT requires_module_id INTO module_3_requires FROM modules WHERE module_code = 'MODULE_3';
    IF module_3_requires IS NULL THEN
        RAISE EXCEPTION 'Module 3 should require Module 1';
    END IF;
    IF module_3_requires != module_1_id THEN
        RAISE EXCEPTION 'Module 3 should require Module 1 (ID mismatch)';
    END IF;
    
    RAISE NOTICE 'Modules seeded successfully: 3 modules created';
END $$;

