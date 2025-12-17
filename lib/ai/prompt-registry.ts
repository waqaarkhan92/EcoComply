/**
 * Prompt Registry
 * Maps (documentType, regulator/waterCompany) → promptId
 * Aligned with: docs/09-regulatory/prompts/README.md (Prompt_Index_v2.0)
 */

import type { z } from 'zod';
import type { regulatorSchema, waterCompanySchema } from '@/lib/validation/schemas';

type Regulator = z.infer<typeof regulatorSchema>;
type WaterCompany = z.infer<typeof waterCompanySchema>;

// =============================================================================
// PROMPT REGISTRY - Maps to 23 jurisdiction-specific prompts
// =============================================================================

/**
 * Environmental Permit prompts (4 regulators)
 * Prompt IDs: {REGULATOR}-ENV-INGEST-001
 */
export const ENVIRONMENTAL_PERMIT_PROMPTS: Record<Regulator, string> = {
  EA: 'EA-ENV-INGEST-001',
  NRW: 'NRW-ENV-INGEST-001',
  SEPA: 'SEPA-ENV-INGEST-001',
  NIEA: 'NIEA-ENV-INGEST-001',
  EPA: 'EA-ENV-INGEST-001', // Fallback to EA for Ireland
};

/**
 * MCPD Registration prompts (4 regulators)
 * Prompt IDs: {REGULATOR}-MCPD-INGEST-001
 */
export const MCPD_PROMPTS: Record<Regulator, string> = {
  EA: 'EA-MCPD-INGEST-001',
  NRW: 'NRW-MCPD-INGEST-001',
  SEPA: 'SEPA-MCPD-INGEST-001',
  NIEA: 'NIEA-MCPD-INGEST-001',
  EPA: 'EA-MCPD-INGEST-001', // Fallback
};

/**
 * Hazardous/Special Waste prompts (4 regulators)
 * Prompt IDs: {REGULATOR}-HW-INGEST-001 (or SW for SEPA - "Special Waste" terminology)
 */
export const HAZARDOUS_WASTE_PROMPTS: Record<Regulator, string> = {
  EA: 'EA-HW-INGEST-001',
  NRW: 'NRW-HW-INGEST-001',
  SEPA: 'SEPA-SW-INGEST-001', // Scotland uses "Special Waste" terminology
  NIEA: 'NIEA-HW-INGEST-001',
  EPA: 'EA-HW-INGEST-001', // Fallback
};

/**
 * Trade Effluent Consent prompts (11 water companies)
 * Prompt IDs: {CODE}-TE-INGEST-001
 */
export const TRADE_EFFLUENT_PROMPTS: Record<WaterCompany, string> = {
  THAMES_WATER: 'TW-TE-INGEST-001',
  SEVERN_TRENT: 'ST-TE-INGEST-001',
  UNITED_UTILITIES: 'UU-TE-INGEST-001',
  ANGLIAN_WATER: 'AW-TE-INGEST-001',
  YORKSHIRE_WATER: 'YW-TE-INGEST-001',
  NORTHUMBRIAN_WATER: 'NW-TE-INGEST-001',
  SOUTHERN_WATER: 'SW-TE-INGEST-001',
  SOUTH_WEST_WATER: 'SWW-TE-INGEST-001',
  WESSEX_WATER: 'WX-TE-INGEST-001',
  DWR_CYMRU: 'DC-TE-INGEST-001',
  SCOTTISH_WATER: 'SCW-TE-INGEST-001',
};

// =============================================================================
// PROMPT VERSION REGISTRY
// =============================================================================

/**
 * Current versions for each prompt category
 * Updated when prompts are revised
 */
export const PROMPT_VERSIONS = {
  ENVIRONMENTAL_PERMIT: '1.3',
  MCPD: '1.4',
  HAZARDOUS_WASTE: '1.4',
  TRADE_EFFLUENT: '1.3',
  // Special versions for specific prompts (where different from category default)
  'NRW-MCPD-INGEST-001': '1.5',
  'SEPA-MCPD-INGEST-001': '1.6',
  'NIEA-MCPD-INGEST-001': '1.6',
  'DC-TE-INGEST-001': '1.4',
  'SCW-TE-INGEST-001': '1.5',
} as const;

// =============================================================================
// FALLBACK PROMPTS (in-memory generic prompts)
// =============================================================================

export const FALLBACK_PROMPTS = {
  ENVIRONMENTAL_PERMIT: 'PROMPT_M1_EXTRACT_001',
  TRADE_EFFLUENT_CONSENT: 'PROMPT_M2_EXTRACT_001',
  MCPD_REGISTRATION: 'PROMPT_M3_EXTRACT_001',
  HAZARDOUS_WASTE: 'PROMPT_M1_EXTRACT_001', // Uses M1 as base
} as const;

// =============================================================================
// PROMPT SELECTION FUNCTION
// =============================================================================

export interface PromptSelectionResult {
  promptId: string;
  version: string;
  isJurisdictionSpecific: boolean;
  fallbackReason?: string;
}

/**
 * Select the appropriate prompt ID based on document type and jurisdiction
 *
 * @param documentType - Type of document (ENVIRONMENTAL_PERMIT, TRADE_EFFLUENT_CONSENT, etc.)
 * @param regulator - Regulator (EA, SEPA, NRW, NIEA) for permit types
 * @param waterCompany - Water company for trade effluent consents
 * @returns Prompt selection result with ID, version, and metadata
 */
export function selectPromptId(
  documentType: string,
  regulator?: string,
  waterCompany?: string
): PromptSelectionResult {
  // Trade Effluent: Use water company first
  if (documentType === 'TRADE_EFFLUENT_CONSENT') {
    if (waterCompany && waterCompany in TRADE_EFFLUENT_PROMPTS) {
      const promptId = TRADE_EFFLUENT_PROMPTS[waterCompany as WaterCompany];
      return {
        promptId,
        version: PROMPT_VERSIONS[promptId as keyof typeof PROMPT_VERSIONS] || PROMPT_VERSIONS.TRADE_EFFLUENT,
        isJurisdictionSpecific: true,
      };
    }

    // Fallback to generic
    return {
      promptId: FALLBACK_PROMPTS.TRADE_EFFLUENT_CONSENT,
      version: '1.0',
      isJurisdictionSpecific: false,
      fallbackReason: waterCompany ? `Unknown water company: ${waterCompany}` : 'No water company specified',
    };
  }

  // Environmental Permit
  if (documentType === 'ENVIRONMENTAL_PERMIT') {
    if (regulator && regulator in ENVIRONMENTAL_PERMIT_PROMPTS) {
      const promptId = ENVIRONMENTAL_PERMIT_PROMPTS[regulator as Regulator];
      return {
        promptId,
        version: PROMPT_VERSIONS.ENVIRONMENTAL_PERMIT,
        isJurisdictionSpecific: true,
      };
    }

    return {
      promptId: FALLBACK_PROMPTS.ENVIRONMENTAL_PERMIT,
      version: '1.0',
      isJurisdictionSpecific: false,
      fallbackReason: regulator ? `Unknown regulator: ${regulator}` : 'No regulator specified',
    };
  }

  // MCPD Registration
  if (documentType === 'MCPD_REGISTRATION') {
    if (regulator && regulator in MCPD_PROMPTS) {
      const promptId = MCPD_PROMPTS[regulator as Regulator];
      return {
        promptId,
        version: PROMPT_VERSIONS[promptId as keyof typeof PROMPT_VERSIONS] || PROMPT_VERSIONS.MCPD,
        isJurisdictionSpecific: true,
      };
    }

    return {
      promptId: FALLBACK_PROMPTS.MCPD_REGISTRATION,
      version: '1.0',
      isJurisdictionSpecific: false,
      fallbackReason: regulator ? `Unknown regulator: ${regulator}` : 'No regulator specified',
    };
  }

  // Hazardous Waste
  if (documentType === 'HAZARDOUS_WASTE') {
    if (regulator && regulator in HAZARDOUS_WASTE_PROMPTS) {
      const promptId = HAZARDOUS_WASTE_PROMPTS[regulator as Regulator];
      return {
        promptId,
        version: PROMPT_VERSIONS.HAZARDOUS_WASTE,
        isJurisdictionSpecific: true,
      };
    }

    return {
      promptId: FALLBACK_PROMPTS.HAZARDOUS_WASTE,
      version: '1.0',
      isJurisdictionSpecific: false,
      fallbackReason: regulator ? `Unknown regulator: ${regulator}` : 'No regulator specified',
    };
  }

  // Unknown document type - use environmental permit as default
  return {
    promptId: FALLBACK_PROMPTS.ENVIRONMENTAL_PERMIT,
    version: '1.0',
    isJurisdictionSpecific: false,
    fallbackReason: `Unknown document type: ${documentType}`,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the file path for a jurisdiction-specific prompt
 */
export function getPromptFilePath(promptId: string, version: string): string {
  const baseDir = 'docs/09-regulatory/prompts';
  // Prompt IDs are stored uppercase but files are lowercase
  const lowercasePromptId = promptId.toLowerCase();

  if (promptId.includes('-ENV-')) {
    return `${baseDir}/environmental-permits/${lowercasePromptId}_v${version}.md`;
  } else if (promptId.includes('-MCPD-')) {
    return `${baseDir}/mcpd/${lowercasePromptId}_v${version}.md`;
  } else if (promptId.includes('-HW-') || promptId.includes('-SW-')) {
    // Both HW (Hazardous Waste) and SW (Special Waste - Scottish terminology) go to hazardous-waste folder
    return `${baseDir}/hazardous-waste/${lowercasePromptId}_v${version}.md`;
  } else if (promptId.includes('-TE-')) {
    return `${baseDir}/trade-effluent/${lowercasePromptId}_v${version}.md`;
  }

  return '';
}

/**
 * Get jurisdiction from regulator
 */
export function getJurisdictionFromRegulator(regulator?: string): string | undefined {
  const jurisdictionMap: Record<string, string> = {
    EA: 'ENGLAND',
    NRW: 'WALES',
    SEPA: 'SCOTLAND',
    NIEA: 'NORTHERN_IRELAND',
    EPA: 'REPUBLIC_OF_IRELAND',
  };

  return regulator ? jurisdictionMap[regulator] : undefined;
}

/**
 * Get jurisdiction from water company
 */
export function getJurisdictionFromWaterCompany(waterCompany?: string): string | undefined {
  const jurisdictionMap: Record<string, string> = {
    THAMES_WATER: 'ENGLAND',
    SEVERN_TRENT: 'ENGLAND',
    UNITED_UTILITIES: 'ENGLAND',
    ANGLIAN_WATER: 'ENGLAND',
    YORKSHIRE_WATER: 'ENGLAND',
    NORTHUMBRIAN_WATER: 'ENGLAND',
    SOUTHERN_WATER: 'ENGLAND',
    SOUTH_WEST_WATER: 'ENGLAND',
    WESSEX_WATER: 'ENGLAND',
    DWR_CYMRU: 'WALES',
    SCOTTISH_WATER: 'SCOTLAND',
  };

  return waterCompany ? jurisdictionMap[waterCompany] : undefined;
}

/**
 * Check if a prompt requires Welsh language support
 */
export function requiresWelshLanguageSupport(regulator?: string, waterCompany?: string): boolean {
  return regulator === 'NRW' || waterCompany === 'DWR_CYMRU';
}

/**
 * Get all prompt IDs for a document type
 */
export function getAllPromptIdsForDocumentType(documentType: string): string[] {
  switch (documentType) {
    case 'ENVIRONMENTAL_PERMIT':
      return Object.values(ENVIRONMENTAL_PERMIT_PROMPTS);
    case 'MCPD_REGISTRATION':
      return Object.values(MCPD_PROMPTS);
    case 'HAZARDOUS_WASTE':
      return Object.values(HAZARDOUS_WASTE_PROMPTS);
    case 'TRADE_EFFLUENT_CONSENT':
      return Object.values(TRADE_EFFLUENT_PROMPTS);
    default:
      return [];
  }
}
