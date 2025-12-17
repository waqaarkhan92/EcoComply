'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =============================================================================
// TYPES
// =============================================================================

export interface ConfidenceDeduction {
  reason: string;
  deduction: number;
  details?: string;
  phrases?: string[];
  lineNumber?: number;
}

export interface ConfidenceBreakdownData {
  finalScore: number;
  baseScore: number;
  deductions: ConfidenceDeduction[];
  warnings?: string[];
  isSubjective?: boolean;
  subjectivePhrases?: string[];
}

interface ConfidenceBreakdownProps {
  data: ConfidenceBreakdownData;
  showDetails?: boolean;
  onReviewClick?: () => void;
  onAcceptClick?: () => void;
  className?: string;
}

// =============================================================================
// CONFIDENCE SCORE BAR
// =============================================================================

interface ConfidenceScoreBarProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceScoreBar({
  score,
  size = 'md',
  showLabel = true,
  className,
}: ConfidenceScoreBarProps) {
  const percentage = Math.round(score * 100);
  const { color, bgColor, label, textColor } = getConfidenceColors(score);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', textColor)}>{percentage}%</span>
          <span className={cn('font-medium', textColor)}>{label}</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CONFIDENCE BADGE INLINE
// =============================================================================

interface ConfidenceBadgeInlineProps {
  score: number;
  showBar?: boolean;
  className?: string;
}

export function ConfidenceBadgeInline({
  score,
  showBar = true,
  className,
}: ConfidenceBadgeInlineProps) {
  const percentage = Math.round(score * 100);
  const { color, label, textColor, bgColor } = getConfidenceColors(score);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('text-sm font-medium', textColor)}>
        [{percentage.toString().padStart(2, '0')}%]
      </span>
      {showBar && (
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', color)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      <span className={cn('text-xs font-medium', textColor)}>{label}</span>
    </div>
  );
}

// =============================================================================
// MAIN CONFIDENCE BREAKDOWN COMPONENT
// =============================================================================

export function ConfidenceBreakdown({
  data,
  showDetails = false,
  onReviewClick,
  onAcceptClick,
  className,
}: ConfidenceBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const { finalScore, baseScore, deductions, warnings, isSubjective, subjectivePhrases } = data;
  const { label, textColor, bgColor } = getConfidenceColors(finalScore);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.deduction, 0);

  const needsReview = finalScore < 0.7 || isSubjective;

  return (
    <div className={cn('rounded-lg border', bgColor, className)}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {needsReview ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <CheckCircle className="h-5 w-5 text-success" />
            )}
            <div>
              <p className="font-medium text-text-primary">Confidence Score</p>
              <p className={cn('text-sm', textColor)}>
                {Math.round(finalScore * 100)}% - {label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceScoreBar score={finalScore} size="md" showLabel={false} className="w-24" />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-tertiary" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Score Breakdown */}
          <div className="py-4 space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Score Breakdown</h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Base Extraction Score</span>
                <span className="font-medium text-text-primary">
                  {(baseScore * 100).toFixed(0)}%
                </span>
              </div>

              {deductions.length > 0 && (
                <>
                  <div className="border-t my-2" />
                  <p className="text-xs font-medium text-text-secondary uppercase">Deductions</p>

                  {deductions.map((deduction, index) => (
                    <div key={index} className="pl-2 border-l-2 border-warning/30">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">{deduction.reason}</span>
                        <span className="font-medium text-danger">
                          -{(deduction.deduction * 100).toFixed(0)}%
                        </span>
                      </div>
                      {deduction.details && (
                        <p className="text-xs text-text-tertiary mt-0.5">{deduction.details}</p>
                      )}
                      {deduction.phrases && deduction.phrases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {deduction.phrases.map((phrase, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded"
                            >
                              "{phrase}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="border-t my-2" />
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-text-secondary">Total Deductions</span>
                    <span className="text-danger">-{(totalDeductions * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}

              <div className="border-t my-2" />
              <div className="flex items-center justify-between font-semibold">
                <span className="text-text-primary">Final Score</span>
                <span className={textColor}>{(finalScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Subjective Phrases */}
          {isSubjective && subjectivePhrases && subjectivePhrases.length > 0 && (
            <div className="py-4 border-t space-y-3">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Subjective Phrases Detected
              </h4>
              <div className="flex flex-wrap gap-2">
                {subjectivePhrases.map((phrase, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-warning/10 text-warning border border-warning/20 rounded-full"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-secondary">
                Subjective language requires interpretation before compliance tracking can begin.
              </p>
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="py-4 border-t space-y-2">
              <h4 className="text-sm font-medium text-text-primary">Warnings</h4>
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-text-secondary">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-4 border-t">
            <div className={cn(
              'p-3 rounded-lg text-sm',
              needsReview ? 'bg-warning/10 border border-warning/20' : 'bg-success/10 border border-success/20'
            )}>
              {needsReview ? (
                <p className="text-warning">
                  <strong>Review Required:</strong> This obligation has low confidence or contains subjective language.
                  Human review is recommended before confirmation.
                </p>
              ) : (
                <p className="text-success">
                  <strong>High Confidence:</strong> This extraction appears accurate.
                  You may accept as-is or review for additional validation.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {(onReviewClick || onAcceptClick) && (
              <div className="flex items-center justify-end gap-3 mt-4">
                {onAcceptClick && (
                  <Button variant="outline" size="sm" onClick={onAcceptClick}>
                    Accept As-Is
                  </Button>
                )}
                {onReviewClick && (
                  <Button variant="primary" size="sm" onClick={onReviewClick}>
                    Review Now
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getConfidenceColors(score: number) {
  if (score >= 0.9) {
    return {
      color: 'bg-success',
      bgColor: 'bg-success/5 border-success/20',
      textColor: 'text-success',
      label: 'High Confidence',
    };
  }
  if (score >= 0.7) {
    return {
      color: 'bg-warning',
      bgColor: 'bg-warning/5 border-warning/20',
      textColor: 'text-warning',
      label: 'Medium - Review Recommended',
    };
  }
  if (score >= 0.5) {
    return {
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-600',
      label: 'Low - Review Required',
    };
  }
  return {
    color: 'bg-danger',
    bgColor: 'bg-danger/5 border-danger/20',
    textColor: 'text-danger',
    label: 'Very Low - Manual Check',
  };
}

// =============================================================================
// CONFIDENCE HISTORY
// =============================================================================

interface ConfidenceHistoryEntry {
  timestamp: string;
  action: string;
  previousScore: number;
  newScore: number;
  user?: string;
}

interface ConfidenceHistoryProps {
  entries: ConfidenceHistoryEntry[];
  className?: string;
}

export function ConfidenceHistory({ entries, className }: ConfidenceHistoryProps) {
  if (entries.length === 0) return null;

  const currentScore = entries[entries.length - 1].newScore;

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-text-primary">Confidence History</h4>
        <span className="text-sm text-text-secondary">
          Current: {Math.round(currentScore * 100)}%
        </span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const change = entry.newScore - entry.previousScore;
          const changeText = change > 0 ? `+${(change * 100).toFixed(0)}%` : `${(change * 100).toFixed(0)}%`;
          const changeColor = change > 0 ? 'text-success' : change < 0 ? 'text-danger' : 'text-text-tertiary';

          return (
            <div key={index} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
              <div>
                <p className="text-text-primary">{entry.action}</p>
                <p className="text-xs text-text-tertiary">
                  {new Date(entry.timestamp).toLocaleString()}
                  {entry.user && ` by ${entry.user}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{Math.round(entry.newScore * 100)}%</p>
                <p className={cn('text-xs', changeColor)}>({changeText})</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
