'use client';

import { cn } from '@/lib/utils';
import {
  complianceStatusConfig,
  obligationStatusConfig,
  taskStatusConfig,
  documentStatusConfig,
  packStatusConfig,
  urgencyConfig,
  reviewStatusConfig,
  confidenceLevelConfig,
  extractionStatusConfig,
  jurisdictionConfig,
  conditionTypeConfig,
  getComplianceStatus,
  getConfidenceLevel,
  type ComplianceStatus,
  type ObligationStatus,
  type TaskStatus,
  type DocumentStatus,
  type PackStatus,
  type Urgency,
  type ReviewStatus,
  type ConfidenceLevel,
  type ExtractionStatus,
  type Jurisdiction,
  type ConditionType,
} from '@/lib/utils/status';

// =============================================================================
// TYPES
// =============================================================================

type StatusType = 'compliance' | 'obligation' | 'task' | 'document' | 'pack' | 'urgency' | 'review' | 'confidence' | 'extraction' | 'jurisdiction' | 'conditionType';

interface StatusBadgeProps {
  /** The status value */
  status: string;
  /** Type of status to determine styling */
  type?: StatusType;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show icon */
  showIcon?: boolean;
  /** Show dot indicator instead of icon */
  showDot?: boolean;
  /** Custom label override */
  label?: string;
  /** Additional className */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Unified status badge component that uses centralized status configs
 *
 * @example
 * // Compliance status
 * <StatusBadge status="COMPLIANT" type="compliance" />
 *
 * // Obligation status with icon
 * <StatusBadge status="OVERDUE" type="obligation" showIcon />
 *
 * // Task status with dot
 * <StatusBadge status="IN_PROGRESS" type="task" showDot />
 */
export function StatusBadge({
  status,
  type = 'obligation',
  size = 'md',
  showIcon = false,
  showDot = false,
  label,
  className,
}: StatusBadgeProps) {
  const config = getStatusConfig(status, type);

  if (!config) {
    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600', className)}>
        {label || status}
      </span>
    );
  }

  const Icon = 'icon' in config ? config.icon : undefined;

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        sizeStyles[size],
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {showDot && 'dotColor' in config && (
        <span className={cn('rounded-full', dotSizes[size], config.dotColor)} />
      )}
      {showIcon && Icon && (
        <Icon className={cn(iconSizes[size], 'animate' in config && config.animate && 'animate-spin')} />
      )}
      <span>{label || config.label}</span>
    </span>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusConfig(status: string, type: StatusType) {
  switch (type) {
    case 'compliance':
      return complianceStatusConfig[status as ComplianceStatus];
    case 'obligation':
      return obligationStatusConfig[status as ObligationStatus];
    case 'task':
      return taskStatusConfig[status as TaskStatus];
    case 'document':
      return documentStatusConfig[status as DocumentStatus];
    case 'pack':
      return packStatusConfig[status as PackStatus];
    case 'urgency':
      return urgencyConfig[status as Urgency];
    case 'review':
      return reviewStatusConfig[status as ReviewStatus];
    case 'confidence':
      return confidenceLevelConfig[status as ConfidenceLevel];
    case 'extraction':
      return extractionStatusConfig[status as ExtractionStatus];
    case 'jurisdiction':
      return jurisdictionConfig[status as Jurisdiction];
    case 'conditionType':
      return conditionTypeConfig[status as ConditionType];
    default:
      return null;
  }
}

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

interface ComplianceStatusBadgeProps {
  status?: ComplianceStatus;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ComplianceStatusBadge({ status, score, ...props }: ComplianceStatusBadgeProps) {
  // If score is provided, calculate status from it
  const resolvedStatus = status || (score !== undefined ? getComplianceStatus(score) : 'UNKNOWN');
  return <StatusBadge status={resolvedStatus} type="compliance" showDot {...props} />;
}

interface ObligationStatusBadgeProps {
  status: ObligationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ObligationStatusBadge({ status, showIcon = true, ...props }: ObligationStatusBadgeProps) {
  return <StatusBadge status={status} type="obligation" showIcon={showIcon} {...props} />;
}

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function TaskStatusBadge({ status, showIcon = true, ...props }: TaskStatusBadgeProps) {
  return <StatusBadge status={status} type="task" showIcon={showIcon} {...props} />;
}

interface PackStatusBadgeProps {
  status: PackStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function PackStatusBadge({ status, showIcon = true, ...props }: PackStatusBadgeProps) {
  return <StatusBadge status={status} type="pack" showIcon={showIcon} {...props} />;
}

interface UrgencyBadgeProps {
  urgency: Urgency;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function UrgencyBadge({ urgency, showIcon = true, ...props }: UrgencyBadgeProps) {
  return <StatusBadge status={urgency} type="urgency" showIcon={showIcon} {...props} />;
}

// =============================================================================
// STATUS DOT
// =============================================================================

interface StatusDotProps {
  status: string;
  type?: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple status dot indicator
 *
 * @example
 * <StatusDot status="COMPLIANT" type="compliance" />
 */
export function StatusDot({ status, type = 'compliance', size = 'md', className }: StatusDotProps) {
  const config = getStatusConfig(status, type);

  const sizeStyles = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizeStyles[size],
        (config && 'dotColor' in config ? config.dotColor : null) || 'bg-gray-400',
        className
      )}
    />
  );
}

// =============================================================================
// INGESTION SPECIALIZED VARIANTS
// =============================================================================

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ReviewStatusBadge({ status, showIcon = true, ...props }: ReviewStatusBadgeProps) {
  return <StatusBadge status={status} type="review" showIcon={showIcon} {...props} />;
}

interface ConfidenceBadgeProps {
  /** Confidence score (0-1) or level */
  score?: number;
  level?: ConfidenceLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ConfidenceBadge({ score, level, showIcon = true, ...props }: ConfidenceBadgeProps) {
  const resolvedLevel = level || (score !== undefined ? getConfidenceLevel(score) : 'MEDIUM');
  return <StatusBadge status={resolvedLevel} type="confidence" showIcon={showIcon} {...props} />;
}

interface ExtractionStatusBadgeProps {
  status: ExtractionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ExtractionStatusBadge({ status, showIcon = true, ...props }: ExtractionStatusBadgeProps) {
  return <StatusBadge status={status} type="extraction" showIcon={showIcon} {...props} />;
}

interface ConditionTypeBadgeProps {
  conditionType: ConditionType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConditionTypeBadge({ conditionType, ...props }: ConditionTypeBadgeProps) {
  return <StatusBadge status={conditionType} type="conditionType" {...props} />;
}

// =============================================================================
// TRAFFIC LIGHT INDICATORS (INGESTION UI SPEC)
// =============================================================================

/**
 * Traffic light status types aligned with UI Specification v1.0
 * See: docs/ingestion_prompts/UI_Specification_v1.0_Part3_Evidence_Confidence.md
 */
export type TrafficLightStatus = 'GREEN' | 'AMBER' | 'RED' | 'GREY';

interface TrafficLightProps {
  /** Status to display */
  status: TrafficLightStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label */
  showLabel?: boolean;
  /** Show pulse animation for attention-grabbing */
  pulse?: boolean;
  /** Custom label */
  label?: string;
  /** Additional className */
  className?: string;
}

const trafficLightConfig: Record<TrafficLightStatus, {
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  GREEN: {
    bgColor: 'bg-success',
    borderColor: 'border-success',
    label: 'Good',
  },
  AMBER: {
    bgColor: 'bg-warning',
    borderColor: 'border-warning',
    label: 'Caution',
  },
  RED: {
    bgColor: 'bg-danger',
    borderColor: 'border-danger',
    label: 'Alert',
  },
  GREY: {
    bgColor: 'bg-gray-400',
    borderColor: 'border-gray-400',
    label: 'Unknown',
  },
};

/**
 * Traffic Light Indicator Component
 *
 * Visual traffic light for compliance/status display following the ingestion UI spec.
 * Uses standard Green/Amber/Red coloring for immediate visual comprehension.
 *
 * @example
 * <TrafficLight status="GREEN" />
 * <TrafficLight status="AMBER" showLabel />
 * <TrafficLight status="RED" pulse size="lg" />
 */
export function TrafficLight({
  status,
  size = 'md',
  showLabel = false,
  pulse = false,
  label,
  className,
}: TrafficLightProps) {
  const config = trafficLightConfig[status];

  const sizeStyles = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full shadow-inner',
          sizeStyles[size],
          config.bgColor,
          pulse && status === 'RED' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={cn(
          'text-xs font-medium',
          status === 'GREEN' && 'text-success',
          status === 'AMBER' && 'text-warning',
          status === 'RED' && 'text-danger',
          status === 'GREY' && 'text-text-tertiary'
        )}>
          {label || config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Full traffic light stack showing all three lights
 * Useful for displaying comparison or range visualization
 */
interface TrafficLightStackProps {
  /** Currently active status */
  activeStatus: TrafficLightStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Additional className */
  className?: string;
}

export function TrafficLightStack({
  activeStatus,
  size = 'sm',
  orientation = 'vertical',
  className,
}: TrafficLightStackProps) {
  const sizeStyles = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const lights = ['RED', 'AMBER', 'GREEN'] as const;

  return (
    <div
      className={cn(
        'inline-flex gap-0.5 p-1 bg-gray-800 rounded',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {lights.map((light) => (
        <span
          key={light}
          className={cn(
            'rounded-full transition-opacity',
            sizeStyles[size],
            trafficLightConfig[light].bgColor,
            activeStatus === light ? 'opacity-100' : 'opacity-30'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Helper to convert various scores/statuses to traffic light
 */
export function getTrafficLightFromScore(score: number): TrafficLightStatus {
  if (score >= 85) return 'GREEN';
  if (score >= 70) return 'AMBER';
  return 'RED';
}

export function getTrafficLightFromConfidence(score: number): TrafficLightStatus {
  if (score >= 0.90) return 'GREEN';
  if (score >= 0.70) return 'AMBER';
  if (score >= 0.50) return 'RED';
  return 'GREY';
}

export function getTrafficLightFromDaysRemaining(days: number): TrafficLightStatus {
  if (days < 0) return 'RED'; // Overdue
  if (days <= 7) return 'AMBER';
  return 'GREEN';
}
