/**
 * Centralized status configuration for consistent styling across the app
 *
 * This replaces all hardcoded hex colors with design tokens
 */

import { AlertCircle, CheckCircle2, Clock, XCircle, AlertTriangle, Circle, Eye, Loader2, HelpCircle, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';

// =============================================================================
// COMPLIANCE STATUS
// =============================================================================

export type ComplianceStatus = 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' | 'UNKNOWN';

export const complianceStatusConfig = {
  COMPLIANT: {
    label: 'Compliant',
    textColor: 'text-success',
    textClass: 'text-success',
    bgColor: 'bg-success/10',
    bgClass: 'bg-success',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
    description: 'All obligations on track',
  },
  AT_RISK: {
    label: 'At Risk',
    textColor: 'text-warning',
    textClass: 'text-warning',
    bgColor: 'bg-warning/10',
    bgClass: 'bg-warning',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
    description: 'Some obligations need attention',
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    textColor: 'text-danger',
    textClass: 'text-danger',
    bgColor: 'bg-danger/10',
    bgClass: 'bg-danger',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
    description: 'Overdue obligations present',
  },
  UNKNOWN: {
    label: 'Unknown',
    textColor: 'text-text-tertiary',
    textClass: 'text-text-tertiary',
    bgColor: 'bg-background-tertiary',
    bgClass: 'bg-muted',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Circle,
    description: 'Status not determined',
  },
  // Lowercase aliases for convenience
  compliant: {
    label: 'Compliant',
    textColor: 'text-success',
    textClass: 'text-success',
    bgColor: 'bg-success/10',
    bgClass: 'bg-success',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
    description: 'All obligations on track',
  },
  'at-risk': {
    label: 'At Risk',
    textColor: 'text-warning',
    textClass: 'text-warning',
    bgColor: 'bg-warning/10',
    bgClass: 'bg-warning',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
    description: 'Some obligations need attention',
  },
  'non-compliant': {
    label: 'Non-Compliant',
    textColor: 'text-danger',
    textClass: 'text-danger',
    bgColor: 'bg-danger/10',
    bgClass: 'bg-danger',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
    description: 'Overdue obligations present',
  },
} as const;

/**
 * Get compliance status from score
 */
export function getComplianceStatus(score: number | undefined | null): ComplianceStatus {
  if (score === undefined || score === null) return 'UNKNOWN';
  if (score >= 85) return 'COMPLIANT';
  if (score >= 70) return 'AT_RISK';
  return 'NON_COMPLIANT';
}

/**
 * Get status config from score
 */
export function getComplianceStatusConfig(score: number | undefined | null) {
  const status = getComplianceStatus(score);
  return complianceStatusConfig[status];
}

// =============================================================================
// OBLIGATION STATUS
// =============================================================================

export type ObligationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'NOT_APPLICABLE'
  | 'CANCELLED';

export const obligationStatusConfig = {
  PENDING: {
    label: 'Pending',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    textColor: 'text-info',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Completed',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: 'Overdue',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
  },
  DUE_SOON: {
    label: 'Due Soon',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
  },
  NOT_APPLICABLE: {
    label: 'N/A',
    textColor: 'text-text-tertiary',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-300',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    textColor: 'text-text-tertiary',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-300',
    icon: XCircle,
  },
} as const;

// =============================================================================
// TASK STATUS
// =============================================================================

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export const taskStatusConfig = {
  PENDING: {
    label: 'Pending',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Completed',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: 'Overdue',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    textColor: 'text-text-tertiary',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-300',
    icon: XCircle,
  },
} as const;

// =============================================================================
// DOCUMENT STATUS
// =============================================================================

export type DocumentStatus = 'ACTIVE' | 'DRAFT' | 'REVIEW_REQUIRED' | 'EXPIRED' | 'EXTRACTION_FAILED';

export const documentStatusConfig = {
  ACTIVE: {
    label: 'Active',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
  },
  DRAFT: {
    label: 'Draft',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Circle,
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
  },
  EXPIRED: {
    label: 'Expired',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: XCircle,
  },
  EXTRACTION_FAILED: {
    label: 'Extraction Failed',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
  },
} as const;

// =============================================================================
// PACK STATUS
// =============================================================================

export type PackStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export const packStatusConfig = {
  PENDING: {
    label: 'Pending',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Clock,
  },
  GENERATING: {
    label: 'Generating',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: Clock,
    animate: true,
  },
  COMPLETED: {
    label: 'Completed',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: XCircle,
  },
} as const;

// =============================================================================
// URGENCY / CRITICALITY
// =============================================================================

export type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const urgencyConfig = {
  CRITICAL: {
    label: 'Critical',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: AlertCircle,
  },
  HIGH: {
    label: 'High',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
    icon: Circle,
  },
  LOW: {
    label: 'Low',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
    icon: Circle,
  },
} as const;

// =============================================================================
// OBLIGATION CATEGORIES
// =============================================================================

export type ObligationCategory =
  | 'MONITORING'
  | 'REPORTING'
  | 'RECORD_KEEPING'
  | 'OPERATIONAL'
  | 'MAINTENANCE'
  | 'INFRASTRUCTURE'
  | 'NOTIFICATION'
  | 'OTHER';

export const obligationCategoryConfig = {
  MONITORING: {
    label: 'Monitoring',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: 'Activity',
  },
  REPORTING: {
    label: 'Reporting',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: 'FileText',
  },
  RECORD_KEEPING: {
    label: 'Record Keeping',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: 'Archive',
  },
  OPERATIONAL: {
    label: 'Operational',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: 'Settings',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: 'Wrench',
  },
  INFRASTRUCTURE: {
    label: 'Infrastructure',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    icon: 'Building',
  },
  NOTIFICATION: {
    label: 'Notification',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    icon: 'Bell',
  },
  OTHER: {
    label: 'Other',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: 'MoreHorizontal',
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate days remaining until a due date
 */
export function getDaysRemaining(dueDate: string | Date): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level from days remaining
 */
export function getUrgencyFromDays(daysRemaining: number): Urgency {
  if (daysRemaining < 0) return 'CRITICAL'; // Overdue
  if (daysRemaining <= 1) return 'CRITICAL'; // Due today or tomorrow
  if (daysRemaining <= 7) return 'HIGH'; // Due within a week
  if (daysRemaining <= 14) return 'MEDIUM'; // Due within 2 weeks
  return 'LOW';
}

/**
 * Get deadline status styling based on days remaining
 */
export function getDeadlineStyle(daysRemaining: number) {
  if (daysRemaining < 0) {
    return {
      textColor: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger',
      label: 'Overdue',
    };
  }
  if (daysRemaining <= 1) {
    return {
      textColor: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger',
      label: 'Due Today',
    };
  }
  if (daysRemaining <= 7) {
    return {
      textColor: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      label: 'Due Soon',
    };
  }
  return {
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    label: 'On Track',
  };
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return `${overdueDays}d overdue`;
  }
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining === 1) return 'Due tomorrow';
  return `${daysRemaining}d remaining`;
}

// =============================================================================
// REVIEW STATUS (INGESTION)
// =============================================================================

export type ReviewStatus =
  | 'PENDING'
  | 'PENDING_INTERPRETATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CLARIFICATION';

export const reviewStatusConfig = {
  PENDING: {
    label: 'Pending Review',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Clock,
  },
  PENDING_INTERPRETATION: {
    label: 'Needs Interpretation',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    dotColor: 'bg-purple-500',
    icon: MessageSquare,
  },
  APPROVED: {
    label: 'Approved',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: XCircle,
  },
  NEEDS_CLARIFICATION: {
    label: 'Needs Clarification',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: HelpCircle,
  },
} as const;

// =============================================================================
// CONFIDENCE LEVEL (INGESTION)
// =============================================================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

/**
 * Confidence thresholds aligned with Ingestion Prompt UI Spec v1.0 Part 3
 * See: docs/ingestion_prompts/UI_Specification_v1.0_Part3_Evidence_Confidence.md Section 6.1
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,    // 0.90 - 1.00: High Confidence (Green)
  MEDIUM: 0.70,  // 0.70 - 0.89: Medium Confidence (Yellow/Review recommended)
  LOW: 0.50,     // 0.50 - 0.69: Low Confidence (Orange/Review required)
  // Below 0.50: Very Low (Red/Manual verification needed)
} as const;

/**
 * Extraction confidence defaults for AI processing
 * Aligned with: docs/ingestion_prompts/Implementation_Blueprint_v1.0.md
 */
export const EXTRACTION_CONFIDENCE_DEFAULTS = {
  // Rule library extraction
  RULE_LIBRARY_BASE: 0.85,           // Base confidence for rule library matches
  RULE_LIBRARY_BOOST: 0.15,          // Additional boost for high-quality matches
  RULE_LIBRARY_THRESHOLD: 0.90,      // Minimum score to use rule library match
  RULE_LIBRARY_EXTRACTION: 0.90,     // Confidence assigned to rule library results

  // LLM extraction
  LLM_DEFAULT: 0.70,                 // Default confidence for LLM extractions
  LLM_PARTIAL: 0.80,                 // Confidence for partial/structured extractions
  LLM_HIGH_QUALITY: 0.85,            // Confidence for high-quality LLM output

  // Document complexity thresholds
  LARGE_DOC_PAGE_COUNT: 50,          // Pages threshold for "large document"
  LARGE_DOC_SIZE_BYTES: 10_000_000,  // 10MB threshold for "large document"
  COMPLEX_DOC_CHAR_COUNT: 30_000,    // Character count for "complex" classification
} as const;

export const confidenceLevelConfig = {
  HIGH: {
    label: 'High Confidence',
    shortLabel: 'High',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
    description: 'Extraction confident',
    minScore: CONFIDENCE_THRESHOLDS.HIGH,
  },
  MEDIUM: {
    label: 'Medium Confidence',
    shortLabel: 'Medium',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
    description: 'Review recommended',
    minScore: CONFIDENCE_THRESHOLDS.MEDIUM,
  },
  LOW: {
    label: 'Low Confidence',
    shortLabel: 'Low',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    dotColor: 'bg-orange-500',
    icon: AlertCircle,
    description: 'Review required',
    minScore: CONFIDENCE_THRESHOLDS.LOW,
  },
  VERY_LOW: {
    label: 'Very Low Confidence',
    shortLabel: 'Very Low',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: XCircle,
    description: 'Manual verification needed',
    minScore: 0,
  },
} as const;

/**
 * Get confidence level from score
 * Thresholds: HIGH >= 0.90, MEDIUM >= 0.70, LOW >= 0.50, VERY_LOW < 0.50
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'LOW';
  return 'VERY_LOW';
}

/**
 * Get confidence config from score
 */
export function getConfidenceLevelConfig(score: number) {
  const level = getConfidenceLevel(score);
  return confidenceLevelConfig[level];
}

// =============================================================================
// EXTRACTION STATUS (INGESTION)
// =============================================================================

export type ExtractionStatus =
  | 'QUEUED'
  | 'EXTRACTING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIALLY_EXTRACTED';

export const extractionStatusConfig = {
  QUEUED: {
    label: 'Queued',
    textColor: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400',
    icon: Clock,
    animate: false,
  },
  EXTRACTING: {
    label: 'Extracting',
    textColor: 'text-info',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
    icon: Sparkles,
    animate: true,
  },
  PROCESSING: {
    label: 'Processing',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    dotColor: 'bg-purple-500',
    icon: Loader2,
    animate: true,
  },
  COMPLETED: {
    label: 'Completed',
    textColor: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    dotColor: 'bg-success',
    icon: CheckCircle2,
    animate: false,
  },
  FAILED: {
    label: 'Failed',
    textColor: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger',
    dotColor: 'bg-danger',
    icon: XCircle,
    animate: false,
  },
  PARTIALLY_EXTRACTED: {
    label: 'Partial',
    textColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
    dotColor: 'bg-warning',
    icon: AlertTriangle,
    animate: false,
  },
} as const;

// =============================================================================
// JURISDICTION (INGESTION)
// =============================================================================

export type Jurisdiction =
  | 'ENGLAND'
  | 'WALES'
  | 'SCOTLAND'
  | 'NORTHERN_IRELAND'
  | 'REPUBLIC_OF_IRELAND';

export const jurisdictionConfig = {
  ENGLAND: {
    label: 'England',
    shortLabel: 'EN',
    regulator: 'EA',
    regulatorName: 'Environment Agency',
    flagColor: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
  },
  WALES: {
    label: 'Wales',
    shortLabel: 'CY',
    regulator: 'NRW',
    regulatorName: 'Natural Resources Wales',
    flagColor: 'bg-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    bilingual: true,
  },
  SCOTLAND: {
    label: 'Scotland',
    shortLabel: 'SC',
    regulator: 'SEPA',
    regulatorName: 'Scottish Environment Protection Agency',
    flagColor: 'bg-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  NORTHERN_IRELAND: {
    label: 'Northern Ireland',
    shortLabel: 'NI',
    regulator: 'NIEA',
    regulatorName: 'Northern Ireland Environment Agency',
    flagColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  REPUBLIC_OF_IRELAND: {
    label: 'Republic of Ireland',
    shortLabel: 'IE',
    regulator: 'EPA',
    regulatorName: 'Environmental Protection Agency',
    flagColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    bilingual: true,
  },
} as const;

// =============================================================================
// CONDITION TYPE (INGESTION)
// =============================================================================

export type ConditionType =
  | 'STANDARD'
  | 'IMPROVEMENT'
  | 'PRE_OPERATIONAL'
  | 'OPERATIONAL'
  | 'PARAMETER_LIMIT'
  | 'RUN_HOUR_LIMIT'
  | 'NOTIFICATION'
  | 'STACK_TEST'
  | 'MONITORING'
  | 'REPORTING'
  | 'RECORD_KEEPING'
  | 'BAT_COMPLIANCE'
  | 'EMISSION_LIMIT'
  | 'DISCHARGE_LIMIT'
  | 'STORAGE_LIMIT'
  | 'TRANSFER_REQUIREMENT'
  | 'QUARTERLY_RETURN'
  | 'ANNUAL_RETURN'
  | 'INCIDENT_NOTIFICATION'
  | 'EQUIPMENT_MAINTENANCE'
  | 'CALIBRATION';

export const conditionTypeConfig: Record<ConditionType, { label: string; textColor: string; bgColor: string; icon: string }> = {
  STANDARD: { label: 'Standard', textColor: 'text-gray-600', bgColor: 'bg-gray-50', icon: 'Circle' },
  IMPROVEMENT: { label: 'Improvement', textColor: 'text-purple-600', bgColor: 'bg-purple-50', icon: 'TrendingUp' },
  PRE_OPERATIONAL: { label: 'Pre-Operational', textColor: 'text-amber-600', bgColor: 'bg-amber-50', icon: 'Clock' },
  OPERATIONAL: { label: 'Operational', textColor: 'text-green-600', bgColor: 'bg-green-50', icon: 'Cog' },
  PARAMETER_LIMIT: { label: 'Parameter Limit', textColor: 'text-blue-600', bgColor: 'bg-blue-50', icon: 'Ruler' },
  RUN_HOUR_LIMIT: { label: 'Run Hour Limit', textColor: 'text-indigo-600', bgColor: 'bg-indigo-50', icon: 'Timer' },
  NOTIFICATION: { label: 'Notification', textColor: 'text-pink-600', bgColor: 'bg-pink-50', icon: 'Bell' },
  STACK_TEST: { label: 'Stack Test', textColor: 'text-cyan-600', bgColor: 'bg-cyan-50', icon: 'TestTube' },
  MONITORING: { label: 'Monitoring', textColor: 'text-blue-600', bgColor: 'bg-blue-50', icon: 'Activity' },
  REPORTING: { label: 'Reporting', textColor: 'text-purple-600', bgColor: 'bg-purple-50', icon: 'FileText' },
  RECORD_KEEPING: { label: 'Record Keeping', textColor: 'text-amber-600', bgColor: 'bg-amber-50', icon: 'Archive' },
  BAT_COMPLIANCE: { label: 'BAT Compliance', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: 'Shield' },
  EMISSION_LIMIT: { label: 'Emission Limit', textColor: 'text-red-600', bgColor: 'bg-red-50', icon: 'Wind' },
  DISCHARGE_LIMIT: { label: 'Discharge Limit', textColor: 'text-blue-600', bgColor: 'bg-blue-50', icon: 'Droplet' },
  STORAGE_LIMIT: { label: 'Storage Limit', textColor: 'text-orange-600', bgColor: 'bg-orange-50', icon: 'Package' },
  TRANSFER_REQUIREMENT: { label: 'Transfer', textColor: 'text-slate-600', bgColor: 'bg-slate-50', icon: 'Truck' },
  QUARTERLY_RETURN: { label: 'Quarterly Return', textColor: 'text-violet-600', bgColor: 'bg-violet-50', icon: 'Calendar' },
  ANNUAL_RETURN: { label: 'Annual Return', textColor: 'text-fuchsia-600', bgColor: 'bg-fuchsia-50', icon: 'CalendarDays' },
  INCIDENT_NOTIFICATION: { label: 'Incident Notification', textColor: 'text-red-600', bgColor: 'bg-red-50', icon: 'AlertOctagon' },
  EQUIPMENT_MAINTENANCE: { label: 'Equipment Maintenance', textColor: 'text-orange-600', bgColor: 'bg-orange-50', icon: 'Wrench' },
  CALIBRATION: { label: 'Calibration', textColor: 'text-teal-600', bgColor: 'bg-teal-50', icon: 'Target' },
} as const;
