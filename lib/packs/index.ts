/**
 * EcoComply Pack Generation Module
 *
 * This module provides modular PDF pack generation for environmental compliance reporting.
 * Supports 5 pack types:
 * - AUDIT_PACK: Internal audit documentation
 * - REGULATOR_INSPECTION: EA-optimized with CCS band and permit citations
 * - TENDER_CLIENT_ASSURANCE: Commercial pack with compliance showcase
 * - BOARD_MULTI_SITE_RISK: Multi-site risk matrix for board reporting
 * - INSURER_BROKER: Risk-focused pack for insurance underwriting
 */

// Types
export * from './types';

// Utilities
export * from './utils';

// Renderers
export * from './renderers';
