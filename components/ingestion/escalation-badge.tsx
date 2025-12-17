'use client';

import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, AlertCircle, Flame } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';

// =============================================================================
// TYPES
// =============================================================================

export type EscalationLevel = 0 | 1 | 2 | 3;

interface EscalationBadgeProps {
  level: EscalationLevel;
  hoursPending?: number;
  escalatedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTime?: boolean;
  className?: string;
}

// =============================================================================
// ESCALATION CONFIG
// =============================================================================

const ESCALATION_CONFIG: Record<EscalationLevel, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
  description: string;
}> = {
  0: {
    label: 'No Escalation',
    shortLabel: 'None',
    color: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Clock,
    description: 'Item is within normal review timeframe',
  },
  1: {
    label: 'Level 1 - Medium',
    shortLabel: 'L1',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    icon: AlertCircle,
    description: 'Pending for 48+ hours. Company admins notified.',
  },
  2: {
    label: 'Level 2 - High',
    shortLabel: 'L2',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: AlertTriangle,
    description: 'Pending for 96+ hours (4 days). Requires immediate attention.',
  },
  3: {
    label: 'Level 3 - Critical',
    shortLabel: 'L3',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/30',
    icon: Flame,
    description: 'Pending for 168+ hours (7 days). Critical priority.',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function EscalationBadge({
  level,
  hoursPending,
  escalatedAt,
  size = 'md',
  showLabel = true,
  showTime = false,
  className,
}: EscalationBadgeProps) {
  const config = ESCALATION_CONFIG[level];
  const Icon = config.icon;

  // Don't render for level 0 unless explicitly showing time
  if (level === 0 && !showTime) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const formatTime = (hours: number): string => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        sizeClasses[size],
        config.bgColor,
        config.borderColor,
        config.color,
        level >= 2 && 'animate-pulse',
        className
      )}
    >
      <Icon className={cn(iconSizes[size])} />
      {showLabel && <span>{config.shortLabel}</span>}
      {showTime && hoursPending !== undefined && (
        <span className="opacity-75">{formatTime(hoursPending)}</span>
      )}
    </span>
  );

  // Wrap in tooltip for additional context
  return (
    <SimpleTooltip content={config.description}>
      {badge}
    </SimpleTooltip>
  );
}

// =============================================================================
// ESCALATION INDICATOR (for lists)
// =============================================================================

interface EscalationIndicatorProps {
  level: EscalationLevel;
  hoursPending?: number;
  className?: string;
}

export function EscalationIndicator({
  level,
  hoursPending,
  className,
}: EscalationIndicatorProps) {
  if (level === 0) return null;

  const config = ESCALATION_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon className={cn('h-4 w-4', config.color)} />
      <div>
        <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
        {hoursPending !== undefined && (
          <p className="text-xs text-text-tertiary">
            Pending for {formatHoursToDaysHours(hoursPending)}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ESCALATION TIMELINE
// =============================================================================

interface EscalationTimelineProps {
  hoursPending: number;
  level: EscalationLevel;
  className?: string;
}

export function EscalationTimeline({
  hoursPending,
  level,
  className,
}: EscalationTimelineProps) {
  const thresholds = [
    { hours: 48, level: 1 as EscalationLevel, label: '48h (L1)' },
    { hours: 96, level: 2 as EscalationLevel, label: '96h (L2)' },
    { hours: 168, level: 3 as EscalationLevel, label: '168h (L3)' },
  ];

  const maxHours = 200;
  const progress = Math.min(hoursPending / maxHours * 100, 100);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">Time Pending</span>
        <span className="font-medium text-text-primary">
          {formatHoursToDaysHours(hoursPending)}
        </span>
      </div>

      <div className="relative">
        {/* Background */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Progress */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              level === 0 && 'bg-gray-400',
              level === 1 && 'bg-warning',
              level === 2 && 'bg-orange-500',
              level === 3 && 'bg-danger'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Threshold markers */}
        <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
          {thresholds.map((threshold) => (
            <div
              key={threshold.hours}
              className="absolute top-0 h-full w-0.5 bg-gray-400"
              style={{ left: `${(threshold.hours / maxHours) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="relative h-4">
        {thresholds.map((threshold) => (
          <span
            key={threshold.hours}
            className={cn(
              'absolute text-xs transform -translate-x-1/2',
              level >= threshold.level ? ESCALATION_CONFIG[threshold.level].color : 'text-text-tertiary'
            )}
            style={{ left: `${(threshold.hours / maxHours) * 100}%` }}
          >
            {threshold.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ESCALATION SUMMARY CARD
// =============================================================================

interface EscalationSummaryProps {
  counts: Record<EscalationLevel, number>;
  onLevelClick?: (level: EscalationLevel) => void;
  className?: string;
}

export function EscalationSummary({
  counts,
  onLevelClick,
  className,
}: EscalationSummaryProps) {
  const totalEscalated = counts[1] + counts[2] + counts[3];

  return (
    <div className={cn('bg-white rounded-lg border p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-text-primary">Escalation Summary</h4>
        {totalEscalated > 0 && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-danger/10 text-danger">
            {totalEscalated} escalated
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as EscalationLevel[]).map((level) => {
          const config = ESCALATION_CONFIG[level];
          const count = counts[level];
          const Icon = config.icon;

          return (
            <button
              key={level}
              onClick={() => onLevelClick?.(level)}
              disabled={count === 0}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                count > 0
                  ? `${config.bgColor} ${config.borderColor} hover:opacity-80 cursor-pointer`
                  : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-4 w-4', count > 0 ? config.color : 'text-gray-400')} />
                <span className={cn('text-2xl font-bold', count > 0 ? config.color : 'text-gray-400')}>
                  {count}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{config.shortLabel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatHoursToDaysHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  return `${days}d ${remainingHours}h`;
}

export function getEscalationLevel(hoursPending: number): EscalationLevel {
  if (hoursPending >= 168) return 3;
  if (hoursPending >= 96) return 2;
  if (hoursPending >= 48) return 1;
  return 0;
}

export { ESCALATION_CONFIG };
