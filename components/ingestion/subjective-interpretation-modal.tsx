'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info, CheckCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface SubjectivePhrase {
  phrase: string;
  category: 'reasonableness' | 'timeliness' | 'judgment' | 'adequacy' | 'condition';
  lineNumber?: number;
  context?: string;
}

export interface InterpretationData {
  phraseInterpretations: Record<string, string>;
  createChecklists: boolean;
  notes?: string;
}

interface SubjectiveInterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InterpretationData) => void;
  obligationTitle: string;
  originalText: string;
  subjectivePhrases: SubjectivePhrase[];
  existingInterpretations?: Record<string, string>;
  isLoading?: boolean;
}

// =============================================================================
// PHRASE CATEGORIES
// =============================================================================

const PHRASE_CATEGORY_INFO: Record<string, { label: string; color: string; examples: string[] }> = {
  reasonableness: {
    label: 'Reasonableness',
    color: 'bg-blue-100 text-blue-700',
    examples: ['reasonable', 'reasonably practicable', 'as appropriate'],
  },
  timeliness: {
    label: 'Timeliness',
    color: 'bg-purple-100 text-purple-700',
    examples: ['as soon as practicable', 'without undue delay', 'promptly'],
  },
  judgment: {
    label: 'Judgment',
    color: 'bg-green-100 text-green-700',
    examples: ['where necessary', 'if required', 'as needed'],
  },
  adequacy: {
    label: 'Adequacy',
    color: 'bg-orange-100 text-orange-700',
    examples: ['adequate', 'sufficient', 'appropriate measures'],
  },
  condition: {
    label: 'Condition-based',
    color: 'bg-pink-100 text-pink-700',
    examples: ['in the event of', 'where applicable', 'if circumstances require'],
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SubjectiveInterpretationModal({
  isOpen,
  onClose,
  onSave,
  obligationTitle,
  originalText,
  subjectivePhrases,
  existingInterpretations = {},
  isLoading = false,
}: SubjectiveInterpretationModalProps) {
  const [interpretations, setInterpretations] = useState<Record<string, string>>(
    existingInterpretations
  );
  const [createChecklists, setCreateChecklists] = useState(false);
  const [notes, setNotes] = useState('');

  const handleInterpretationChange = (phrase: string, value: string) => {
    setInterpretations((prev) => ({
      ...prev,
      [phrase]: value,
    }));
  };

  const handleSave = () => {
    onSave({
      phraseInterpretations: interpretations,
      createChecklists,
      notes: notes || undefined,
    });
  };

  const allPhrasesInterpreted = subjectivePhrases.every(
    (p) => interpretations[p.phrase]?.trim()
  );

  // Highlight subjective phrases in original text with sanitization
  const highlightedText = useMemo(() => {
    // Import DOMPurify dynamically for client-side only
    if (typeof window !== 'undefined') {
      const DOMPurify = require('dompurify');
      return DOMPurify.sanitize(highlightPhrases(originalText, subjectivePhrases));
    }
    return highlightPhrases(originalText, subjectivePhrases);
  }, [originalText, subjectivePhrases]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Interpret Subjective Obligation"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                This obligation contains subjective language
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Define what each subjective phrase means in your operational context.
                This interpretation will be used for compliance tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Obligation Context */}
        <div className="space-y-2">
          <h4 className="font-medium text-text-primary">{obligationTitle}</h4>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-text-secondary mb-2">Original Text:</p>
            <div
              className="text-sm text-text-primary whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
          </div>
        </div>

        {/* Interpretation Guidance */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-text-secondary">
              <p className="font-medium text-primary mb-1">Interpretation Guidance</p>
              <p>
                Define measurable, specific criteria. For example, instead of "reasonable steps",
                specify "daily inspections, secondary containment, spill kits within 10m".
              </p>
            </div>
          </div>
        </div>

        {/* Phrase Interpretations */}
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">Define Each Phrase</h4>

          {subjectivePhrases.map((phraseObj, index) => {
            const categoryInfo = PHRASE_CATEGORY_INFO[phraseObj.category];

            return (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      "{phraseObj.phrase}"
                    </span>
                    {categoryInfo && (
                      <span className={cn('px-2 py-0.5 text-xs rounded-full', categoryInfo.color)}>
                        {categoryInfo.label}
                      </span>
                    )}
                  </div>
                  {interpretations[phraseObj.phrase]?.trim() && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                </div>

                {phraseObj.context && (
                  <p className="text-xs text-text-tertiary italic">
                    Context: "...{phraseObj.context}..."
                  </p>
                )}

                <Textarea
                  placeholder={getPlaceholderForCategory(phraseObj.category, phraseObj.phrase)}
                  value={interpretations[phraseObj.phrase] || ''}
                  onChange={(e) => handleInterpretationChange(phraseObj.phrase, e.target.value)}
                  rows={3}
                />

                {categoryInfo && (
                  <p className="text-xs text-text-tertiary">
                    Similar phrases: {categoryInfo.examples.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Options */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox
              id="createChecklists"
              checked={createChecklists}
              onChange={(checked) => setCreateChecklists(checked)}
            />
            <div>
              <Label htmlFor="createChecklists" className="cursor-pointer">
                Create checklist items from this interpretation
              </Label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically generate actionable checklist items based on your interpretations
              </p>
            </div>
          </div>

          <Textarea
            label="Additional Notes (Optional)"
            placeholder="Add any additional context or notes about this interpretation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {Object.values(interpretations).filter((v) => v?.trim()).length} of{' '}
            {subjectivePhrases.length} phrases interpreted
          </span>
          {!allPhrasesInterpreted && (
            <span className="text-warning text-xs">
              All phrases must be interpreted before saving
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!allPhrasesInterpreted || isLoading}
            loading={isLoading}
          >
            Save Interpretation
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// INTERPRETATION DISPLAY
// =============================================================================

interface InterpretationDisplayProps {
  interpretations: Record<string, string>;
  interpretedBy?: string;
  interpretedAt?: string;
  onEdit?: () => void;
  className?: string;
}

export function InterpretationDisplay({
  interpretations,
  interpretedBy,
  interpretedAt,
  onEdit,
  className,
}: InterpretationDisplayProps) {
  const entries = Object.entries(interpretations).filter(([_, value]) => value?.trim());

  if (entries.length === 0) return null;

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-text-primary">Interpretation</h4>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>

      {interpretedBy && (
        <p className="text-sm text-text-secondary">
          Interpreted by {interpretedBy}
          {interpretedAt && ` on ${new Date(interpretedAt).toLocaleDateString()}`}
        </p>
      )}

      <div className="space-y-3">
        {entries.map(([phrase, interpretation]) => (
          <div key={phrase} className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-text-primary mb-1">
              "{phrase}" means:
            </p>
            <p className="text-sm text-text-secondary">{interpretation}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-success">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">INTERPRETED</span>
      </div>
    </div>
  );
}

// =============================================================================
// SUBJECTIVE INDICATOR
// =============================================================================

interface SubjectiveIndicatorProps {
  phrases: string[];
  onInterpret?: () => void;
  isInterpreted?: boolean;
  className?: string;
}

export function SubjectiveIndicator({
  phrases,
  onInterpret,
  isInterpreted = false,
  className,
}: SubjectiveIndicatorProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      isInterpreted ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20',
      className
    )}>
      <div className="flex items-start gap-3">
        {isInterpreted ? (
          <CheckCircle className="h-5 w-5 text-success mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              isInterpreted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            )}>
              SUBJECTIVE
            </span>
            {isInterpreted && (
              <span className="text-xs text-success font-medium">INTERPRETED</span>
            )}
          </div>

          <p className={cn(
            'text-sm mb-3',
            isInterpreted ? 'text-text-secondary' : 'text-text-primary'
          )}>
            {isInterpreted
              ? 'This obligation has been interpreted and is ready for compliance tracking.'
              : 'Requires interpretation before compliance tracking can begin.'}
          </p>

          <div className="mb-3">
            <p className="text-xs text-text-secondary mb-1">Subjective phrases detected:</p>
            <div className="flex flex-wrap gap-1">
              {phrases.map((phrase, index) => (
                <span
                  key={index}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    isInterpreted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  )}
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>

          {!isInterpreted && onInterpret && (
            <Button variant="primary" size="sm" onClick={onInterpret}>
              Add Interpretation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function highlightPhrases(text: string, phrases: SubjectivePhrase[]): string {
  let result = text;
  phrases.forEach((phraseObj) => {
    const regex = new RegExp(`(${escapeRegex(phraseObj.phrase)})`, 'gi');
    result = result.replace(
      regex,
      '<mark class="bg-warning/30 px-0.5 rounded">$1</mark>'
    );
  });
  return result;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPlaceholderForCategory(category: string, phrase: string): string {
  const placeholders: Record<string, string> = {
    reasonableness: `e.g., "Daily visual inspections, secondary containment for all storage, spill kits within 10m"`,
    timeliness: `e.g., "Within 2 hours during working hours, within 4 hours outside working hours"`,
    judgment: `e.g., "When readings exceed threshold X, or when visual indicators show Y"`,
    adequacy: `e.g., "Capacity of at least 110% of largest container, bunded area with no drains"`,
    condition: `e.g., "When ambient temperature exceeds 25°C, or when wind speed exceeds 20mph"`,
  };

  return placeholders[category] || `Define what "${phrase}" means in your operational context...`;
}
