/**
 * Ingestion UI Components
 *
 * Components aligned with the UI Specification v1.0 in docs/ingestion_prompts/
 * - Part 1: Navigation & Forms
 * - Part 2: Obligations & Review
 * - Part 3: Evidence & Confidence
 */

// Regulator-specific form fields (EA, SEPA, NRW, NIEA)
export {
  RegulatorFormFields,
  RegulatorSelector,
  REGULATOR_OPTIONS,
  type Regulator,
  type RegulatorFormData,
} from './regulator-form-fields';

// Water company-specific form fields (11 companies including Mogden formula)
export {
  WaterCompanyFormFields,
  WaterCompanySelector,
  WATER_COMPANY_OPTIONS,
  type WaterCompany,
  type WaterCompanyFormData,
  type MogdenFormulaValues,
} from './water-company-form-fields';

// Confidence breakdown and visualization
export {
  ConfidenceBreakdown,
  ConfidenceScoreBar,
  ConfidenceBadgeInline,
  ConfidenceHistory,
  type ConfidenceBreakdownData,
  type ConfidenceDeduction,
} from './confidence-breakdown';

// Escalation badges for review queue items
export {
  EscalationBadge,
  EscalationIndicator,
  EscalationTimeline,
  EscalationSummary,
  getEscalationLevel,
  ESCALATION_CONFIG,
  type EscalationLevel,
} from './escalation-badge';

// Subjective interpretation workflow
export {
  SubjectiveInterpretationModal,
  InterpretationDisplay,
  SubjectiveIndicator,
  type SubjectivePhrase,
  type InterpretationData,
} from './subjective-interpretation-modal';

// Evidence suggestions (AI-powered)
export {
  EvidenceSuggestions,
  EvidenceSuggestionsPanel,
  type EvidenceSuggestion,
} from './evidence-suggestions';

// Chain of custody export
export {
  ChainOfCustodyTab,
  ChainOfCustodyExportModal,
  ChainOfCustodyExportButton,
  type ChainOfCustodyData,
  type ChainOfCustodyEvent,
} from './chain-of-custody-export';

// Site health indicators
export {
  SiteHealthCard,
  SiteHealthOverview,
  ComplianceSummaryCard,
  calculateHealthStatus,
  HEALTH_CONFIG,
  type HealthStatus,
  type SiteHealthData,
} from './site-health-indicator';
