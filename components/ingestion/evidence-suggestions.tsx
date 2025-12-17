'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Lightbulb, FileText, Image, FileSpreadsheet, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface EvidenceSuggestion {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  compliancePeriod?: string;
  matchScore: number;
  matchReasons: string[];
  isVerified?: boolean;
  thumbnailUrl?: string;
}

interface EvidenceSuggestionsProps {
  suggestions: EvidenceSuggestion[];
  onLink: (evidenceId: string) => void;
  onBrowseAll: () => void;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EvidenceSuggestions({
  suggestions,
  onLink,
  onBrowseAll,
  isLoading = false,
  className,
}: EvidenceSuggestionsProps) {
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const handleLink = (evidenceId: string) => {
    setLinkedIds((prev) => new Set(prev).add(evidenceId));
    onLink(evidenceId);
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div
        className="p-4 bg-primary/5 border-b cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium text-text-primary">Suggested Evidence</h4>
              <p className="text-xs text-text-secondary">
                AI-powered suggestions based on obligation text
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-tertiary" />
            )}
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-text-secondary">Finding matching evidence...</p>
            </div>
          ) : (
            <>
              {suggestions.map((suggestion) => (
                <EvidenceSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isLinked={linkedIds.has(suggestion.id)}
                  onLink={() => handleLink(suggestion.id)}
                />
              ))}

              <div className="pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBrowseAll}
                  className="w-full"
                >
                  Browse All Evidence Instead
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUGGESTION CARD
// =============================================================================

interface EvidenceSuggestionCardProps {
  suggestion: EvidenceSuggestion;
  isLinked: boolean;
  onLink: () => void;
}

function EvidenceSuggestionCard({
  suggestion,
  isLinked,
  onLink,
}: EvidenceSuggestionCardProps) {
  const FileIcon = getFileIcon(suggestion.fileType);
  const matchPercentage = Math.round(suggestion.matchScore * 100);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        isLinked
          ? 'bg-success/5 border-success/30'
          : 'bg-white hover:bg-gray-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* File Icon / Thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
          {suggestion.thumbnailUrl ? (
            <img
              src={suggestion.thumbnailUrl}
              alt={suggestion.fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <FileIcon className="h-6 w-6 text-text-tertiary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {suggestion.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span>{formatFileSize(suggestion.fileSize)}</span>
                {suggestion.compliancePeriod && (
                  <>
                    <span>•</span>
                    <span>{suggestion.compliancePeriod}</span>
                  </>
                )}
                {suggestion.isVerified && (
                  <>
                    <span>•</span>
                    <span className="text-success">Verified</span>
                  </>
                )}
              </div>
            </div>

            {/* Match Score */}
            <div className="flex-shrink-0 text-right">
              <MatchScoreBadge score={suggestion.matchScore} />
            </div>
          </div>

          {/* Match Reasons */}
          <div className="mt-2 text-xs text-text-secondary">
            <span className="font-medium">Match reasons: </span>
            {suggestion.matchReasons.join(', ')}
          </div>

          {/* Link Button */}
          <div className="mt-3">
            {isLinked ? (
              <span className="inline-flex items-center gap-1 text-sm text-success font-medium">
                <Check className="h-4 w-4" />
                Linked
              </span>
            ) : (
              <Button variant="primary" size="sm" onClick={onLink}>
                Link This
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MATCH SCORE BADGE
// =============================================================================

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const percentage = Math.round(score * 100);

  let color = 'bg-gray-100 text-gray-600';
  if (percentage >= 90) {
    color = 'bg-success/10 text-success';
  } else if (percentage >= 75) {
    color = 'bg-primary/10 text-primary';
  } else if (percentage >= 50) {
    color = 'bg-warning/10 text-warning';
  }

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', color, className)}>
      {percentage}% match
    </span>
  );
}

// =============================================================================
// EVIDENCE SUGGESTIONS PANEL (Standalone)
// =============================================================================

interface EvidenceSuggestionsPanelProps {
  obligationId: string;
  obligationTitle: string;
  compliancePeriod?: string;
  suggestions: EvidenceSuggestion[];
  onLink: (evidenceId: string) => void;
  onUploadNew: () => void;
  onBrowseAll: () => void;
  isLoading?: boolean;
  className?: string;
}

export function EvidenceSuggestionsPanel({
  obligationId,
  obligationTitle,
  compliancePeriod,
  suggestions,
  onLink,
  onUploadNew,
  onBrowseAll,
  isLoading = false,
  className,
}: EvidenceSuggestionsPanelProps) {
  return (
    <div className={cn('rounded-lg border bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-text-primary">Link Evidence</h3>
        </div>
        <p className="text-sm text-text-secondary">
          {obligationTitle}
          {compliancePeriod && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
              {compliancePeriod}
            </span>
          )}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-text-secondary">
              Analyzing obligation to find matching evidence...
            </p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Based on the obligation text and existing evidence patterns:
            </p>
            <EvidenceSuggestions
              suggestions={suggestions}
              onLink={onLink}
              onBrowseAll={onBrowseAll}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-4">
              No matching evidence found for this obligation.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBrowseAll} className="flex-1">
            Browse All Evidence
          </Button>
          <Button variant="primary" size="sm" onClick={onUploadNew} className="flex-1">
            Upload New
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
    return Image;
  }
  if (type.includes('spreadsheet') || ['xlsx', 'csv', 'xls'].includes(type)) {
    return FileSpreadsheet;
  }
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
