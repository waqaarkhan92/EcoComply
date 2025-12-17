'use client';

import { cn } from '@/lib/utils';
import {
  getConfidenceLevel,
  getConfidenceLevelConfig,
  type ConfidenceLevel
} from '@/lib/utils/status';
import { ConfidenceBadge } from '@/components/ui/status-badge';
import { Info, Eye, FileText, Search, Link2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ConfidenceComponents {
  textClarity: number;
  structureMatch: number;
  keywordPresence: number;
  contextRelevance: number;
}

interface ConfidenceBreakdownPanelProps {
  /** Overall confidence score (0-1) */
  score: number;
  /** Individual component scores */
  components?: ConfidenceComponents;
  /** Show detailed breakdown */
  showBreakdown?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// COMPONENT METADATA
// =============================================================================

const componentMeta = {
  textClarity: {
    label: 'Text Clarity',
    description: 'How clearly the text was parsed',
    icon: Eye,
  },
  structureMatch: {
    label: 'Structure Match',
    description: 'Match with expected permit structure',
    icon: FileText,
  },
  keywordPresence: {
    label: 'Keyword Presence',
    description: 'Required regulatory keywords found',
    icon: Search,
  },
  contextRelevance: {
    label: 'Context Relevance',
    description: 'Relevance to surrounding content',
    icon: Link2,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays a confidence score breakdown for AI extractions
 *
 * @example
 * <ConfidenceBreakdownPanel
 *   score={0.87}
 *   components={{
 *     textClarity: 0.92,
 *     structureMatch: 0.85,
 *     keywordPresence: 0.88,
 *     contextRelevance: 0.83,
 *   }}
 * />
 */
export function ConfidenceBreakdownPanel({
  score,
  components,
  showBreakdown = true,
  compact = false,
  className,
}: ConfidenceBreakdownPanelProps) {
  const level = getConfidenceLevel(score);
  const config = getConfidenceLevelConfig(score);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ConfidenceBadge score={score} size="sm" />
        <span className="text-sm text-text-secondary">
          {Math.round(score * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-4', config.borderColor, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ConfidenceBadge score={score} showIcon />
          <span className="font-medium">{Math.round(score * 100)}% Confidence</span>
        </div>
        <span className={cn('text-sm', config.textColor)}>
          {config.description}
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', config.bgColor?.replace('/10', ''))}
            style={{ width: `${score * 100}%` }}
          />
        </div>
      </div>

      {/* Component Breakdown */}
      {showBreakdown && components && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-sm text-text-secondary mb-2">
            <Info className="h-4 w-4" />
            <span>Score Components</span>
          </div>

          {Object.entries(components).map(([key, value]) => {
            const meta = componentMeta[key as keyof ConfidenceComponents];
            const Icon = meta.icon;
            const componentLevel = getConfidenceLevel(value);
            const componentConfig = getConfidenceLevelConfig(value);

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-text-tertiary" />
                    <span>{meta.label}</span>
                  </div>
                  <span className={cn('font-medium', componentConfig.textColor)}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', componentConfig.dotColor)}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guidance */}
      {level !== 'HIGH' && (
        <div className={cn('mt-4 p-3 rounded-md text-sm', config.bgColor)}>
          <p className={config.textColor}>
            {level === 'MEDIUM' && 'Review recommended before approving this extraction.'}
            {level === 'LOW' && 'Manual verification required. Some content may be incorrect.'}
            {level === 'VERY_LOW' && 'Consider re-extracting this document with different settings.'}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

interface ConfidenceIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Minimal confidence indicator for use in tables/lists
 */
export function ConfidenceIndicator({
  score,
  size = 'md',
  showLabel = true,
  className,
}: ConfidenceIndicatorProps) {
  const config = getConfidenceLevelConfig(score);

  const sizeStyles = {
    sm: 'h-1 w-12',
    md: 'h-1.5 w-16',
    lg: 'h-2 w-20',
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('bg-gray-100 rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn('h-full rounded-full', config.dotColor)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(labelSizes[size], config.textColor)}>
          {Math.round(score * 100)}%
        </span>
      )}
    </div>
  );
}

// =============================================================================
// CONFIDENCE SUMMARY
// =============================================================================

interface ConfidenceSummaryProps {
  high: number;
  medium: number;
  low: number;
  veryLow?: number;
  className?: string;
}

/**
 * Shows a summary of confidence levels across multiple items
 */
export function ConfidenceSummary({
  high,
  medium,
  low,
  veryLow = 0,
  className,
}: ConfidenceSummaryProps) {
  const total = high + medium + low + veryLow;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-sm">{high} High</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-warning" />
        <span className="text-sm">{medium} Medium</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="text-sm">{low} Low</span>
      </div>
      {veryLow > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span className="text-sm">{veryLow} Very Low</span>
        </div>
      )}
      <span className="text-sm text-text-tertiary">({total} total)</span>
    </div>
  );
}
