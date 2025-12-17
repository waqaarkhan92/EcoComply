'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExtractionStatusBadge } from '@/components/ui/status-badge';
import {
  extractionStatusConfig,
  type ExtractionStatus,
} from '@/lib/utils/status';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ExtractionStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface ExtractionProgress {
  sessionId: string;
  documentId: string;
  documentName: string;
  status: ExtractionStatus;
  progress: number; // 0-100
  currentStep?: string;
  steps: ExtractionStep[];
  startedAt: string;
  completedAt?: string;
  processingTimeMs?: number;
  results?: {
    totalObligations: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    subjective: number;
    flaggedForReview: number;
  };
  error?: string;
}

interface ExtractionProgressTrackerProps {
  /** Extraction progress data */
  extraction: ExtractionProgress;
  /** Callback when retry is requested */
  onRetry?: () => void;
  /** Callback to view results */
  onViewResults?: () => void;
  /** Callback to download results */
  onDownload?: () => void;
  /** Show expanded details */
  defaultExpanded?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// STEP ICON
// =============================================================================

function StepIcon({ status }: { status: ExtractionStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'in_progress':
      return <RefreshCw className="h-5 w-5 text-info animate-spin" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-danger" />;
    default:
      return <Clock className="h-5 w-5 text-text-tertiary" />;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Tracks and displays AI extraction progress
 *
 * @example
 * <ExtractionProgressTracker
 *   extraction={extractionProgress}
 *   onRetry={() => handleRetry()}
 *   onViewResults={() => navigate('/results')}
 * />
 */
export function ExtractionProgressTracker({
  extraction,
  onRetry,
  onViewResults,
  onDownload,
  defaultExpanded = false,
  className,
}: ExtractionProgressTrackerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusConfig = extractionStatusConfig[extraction.status];
  const isComplete = extraction.status === 'COMPLETED';
  const isFailed = extraction.status === 'FAILED';
  const isProcessing = ['EXTRACTING', 'PROCESSING'].includes(extraction.status);

  // Format processing time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className={cn('rounded-lg border bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          'p-3 rounded-lg',
          isProcessing ? 'bg-blue-50' : statusConfig.bgColor
        )}>
          {isProcessing ? (
            <Sparkles className="h-6 w-6 text-info animate-pulse" />
          ) : isComplete ? (
            <CheckCircle2 className="h-6 w-6 text-success" />
          ) : isFailed ? (
            <AlertCircle className="h-6 w-6 text-danger" />
          ) : (
            <FileText className="h-6 w-6 text-text-tertiary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{extraction.documentName}</h3>
            <ExtractionStatusBadge status={extraction.status} size="sm" />
          </div>
          <p className="text-sm text-text-secondary">
            {extraction.currentStep || 'Waiting to start...'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              {onViewResults && (
                <Button size="sm" variant="outline" onClick={onViewResults}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  View
                </Button>
              )}
              {onDownload && (
                <Button size="sm" variant="ghost" onClick={onDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {isFailed && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-success' : isFailed ? 'bg-danger' : 'bg-info'
            )}
            style={{ width: `${extraction.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-text-tertiary">
          <span>{extraction.progress}% complete</span>
          {extraction.processingTimeMs && (
            <span>Time: {formatTime(extraction.processingTimeMs)}</span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t">
          {/* Steps */}
          <div className="p-4">
            <h4 className="text-sm font-medium mb-3">Extraction Steps</h4>
            <div className="space-y-3">
              {extraction.steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <StepIcon status={step.status} />
                    {index < extraction.steps.length - 1 && (
                      <div className={cn(
                        'w-0.5 flex-1 mt-1',
                        step.status === 'completed' ? 'bg-success' : 'bg-gray-200'
                      )} />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className={cn(
                      'font-medium text-sm',
                      step.status === 'in_progress' && 'text-info',
                      step.status === 'failed' && 'text-danger'
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-text-secondary">{step.description}</p>
                    {step.error && (
                      <p className="text-xs text-danger mt-1">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          {isComplete && extraction.results && (
            <div className="p-4 border-t bg-gray-50">
              <h4 className="text-sm font-medium mb-3">Extraction Results</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ResultCard
                  label="Total Obligations"
                  value={extraction.results.totalObligations}
                />
                <ResultCard
                  label="High Confidence"
                  value={extraction.results.highConfidence}
                  variant="success"
                />
                <ResultCard
                  label="Medium Confidence"
                  value={extraction.results.mediumConfidence}
                  variant="warning"
                />
                <ResultCard
                  label="Low Confidence"
                  value={extraction.results.lowConfidence}
                  variant="danger"
                />
                <ResultCard
                  label="Subjective"
                  value={extraction.results.subjective}
                  variant="purple"
                />
                <ResultCard
                  label="Flagged for Review"
                  value={extraction.results.flaggedForReview}
                  variant="info"
                />
              </div>
            </div>
          )}

          {/* Error Details */}
          {isFailed && extraction.error && (
            <div className="p-4 border-t bg-danger/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-danger">Extraction Failed</p>
                  <p className="text-sm text-danger/80 mt-1">{extraction.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RESULT CARD
// =============================================================================

interface ResultCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

function ResultCard({ label, value, variant = 'default' }: ResultCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-danger/30 bg-danger/5',
    info: 'border-blue-300 bg-blue-50',
    purple: 'border-purple-300 bg-purple-50',
  };

  const valueStyles = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={cn('p-3 rounded-lg border', variantStyles[variant])}>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={cn('text-xl font-semibold', valueStyles[variant])}>{value}</p>
    </div>
  );
}

// =============================================================================
// BATCH PROGRESS
// =============================================================================

interface BatchExtractionProgressProps {
  extractions: ExtractionProgress[];
  className?: string;
}

/**
 * Shows progress for multiple concurrent extractions
 */
export function BatchExtractionProgress({
  extractions,
  className,
}: BatchExtractionProgressProps) {
  const completed = extractions.filter(e => e.status === 'COMPLETED').length;
  const failed = extractions.filter(e => e.status === 'FAILED').length;
  const processing = extractions.filter(e => ['EXTRACTING', 'PROCESSING'].includes(e.status)).length;
  const queued = extractions.filter(e => e.status === 'QUEUED').length;
  const total = extractions.length;

  const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn('rounded-lg border bg-white p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Batch Extraction Progress</h3>
        <Badge variant="default">{completed}/{total} Complete</Badge>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
          <div
            className="h-full bg-info transition-all"
            style={{ width: `${(processing / total) * 100}%` }}
          />
          <div
            className="h-full bg-danger transition-all"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-2xl font-semibold text-success">{completed}</p>
          <p className="text-xs text-text-secondary">Completed</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-info">{processing}</p>
          <p className="text-xs text-text-secondary">Processing</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-text-tertiary">{queued}</p>
          <p className="text-xs text-text-secondary">Queued</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-danger">{failed}</p>
          <p className="text-xs text-text-secondary">Failed</p>
        </div>
      </div>
    </div>
  );
}
