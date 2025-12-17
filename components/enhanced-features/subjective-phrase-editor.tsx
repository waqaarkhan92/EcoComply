'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Lightbulb,
  CheckSquare,
  Plus,
  X,
  Save,
  RotateCcw,
  Info,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface SubjectivePhrase {
  id: string;
  phrase: string;
  context?: string;
  suggestedInterpretation?: string;
}

interface Interpretation {
  interpretation: string;
  operationalDefinition?: string;
  checklistItems: string[];
}

interface SubjectivePhraseEditorProps {
  /** The subjective phrase to interpret */
  phrase: SubjectivePhrase;
  /** Existing interpretation (if any) */
  existingInterpretation?: Interpretation;
  /** Callback when interpretation is saved */
  onSave: (interpretation: Interpretation) => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// COMMON PHRASES SUGGESTIONS
// =============================================================================

const COMMON_INTERPRETATIONS: Record<string, { interpretation: string; checklist: string[] }> = {
  'reasonable': {
    interpretation: 'Within industry-standard practices and timeframes, typically 24-48 hours for routine matters',
    checklist: ['Document decision rationale', 'Compare with industry benchmarks', 'Consider resource availability'],
  },
  'as soon as practicable': {
    interpretation: 'Without undue delay, typically within 24-48 hours or at the earliest operationally feasible time',
    checklist: ['Assess current operational priorities', 'Document any delays and reasons', 'Set target completion date'],
  },
  'regular basis': {
    interpretation: 'At consistent intervals appropriate to the activity, minimum monthly unless specified otherwise',
    checklist: ['Define specific frequency', 'Set up calendar reminders', 'Create inspection schedule'],
  },
  'appropriate measures': {
    interpretation: 'Measures that are proportionate to the risk and aligned with Best Available Techniques (BAT)',
    checklist: ['Conduct risk assessment', 'Review BAT reference documents', 'Document measure selection rationale'],
  },
  'best endeavours': {
    interpretation: 'Doing everything reasonably possible to achieve the objective, within financial and practical constraints',
    checklist: ['Document all attempts made', 'Record any obstacles encountered', 'Demonstrate continuous improvement'],
  },
  'without delay': {
    interpretation: 'Immediately upon becoming aware, with no intervening activities unless safety-critical',
    checklist: ['Set up automated alerts', 'Define escalation procedures', 'Prepare notification templates'],
  },
  'minimise': {
    interpretation: 'Reduce to the lowest level achievable using BAT, with continuous improvement targets',
    checklist: ['Establish baseline measurements', 'Set reduction targets', 'Monitor progress regularly'],
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Editor for interpreting subjective phrases in permit conditions
 *
 * @example
 * <SubjectivePhraseEditor
 *   phrase={{ id: '1', phrase: 'reasonable time', context: 'must respond in reasonable time' }}
 *   onSave={(interpretation) => console.log(interpretation)}
 * />
 */
export function SubjectivePhraseEditor({
  phrase,
  existingInterpretation,
  onSave,
  onCancel,
  readOnly = false,
  className,
}: SubjectivePhraseEditorProps) {
  const [interpretation, setInterpretation] = useState(existingInterpretation?.interpretation || '');
  const [operationalDefinition, setOperationalDefinition] = useState(existingInterpretation?.operationalDefinition || '');
  const [checklistItems, setChecklistItems] = useState<string[]>(existingInterpretation?.checklistItems || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Check for suggested interpretation
  const matchedSuggestion = Object.entries(COMMON_INTERPRETATIONS).find(([key]) =>
    phrase.phrase.toLowerCase().includes(key)
  );

  const handleAddChecklistItem = useCallback(() => {
    if (newChecklistItem.trim()) {
      setChecklistItems(prev => [...prev, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  }, [newChecklistItem]);

  const handleRemoveChecklistItem = useCallback((index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleApplySuggestion = useCallback(() => {
    if (matchedSuggestion) {
      const [, suggestion] = matchedSuggestion;
      setInterpretation(suggestion.interpretation);
      setChecklistItems(suggestion.checklist);
    }
  }, [matchedSuggestion]);

  const handleSave = useCallback(() => {
    onSave({
      interpretation,
      operationalDefinition: operationalDefinition || undefined,
      checklistItems,
    });
  }, [interpretation, operationalDefinition, checklistItems, onSave]);

  const handleReset = useCallback(() => {
    setInterpretation(existingInterpretation?.interpretation || '');
    setOperationalDefinition(existingInterpretation?.operationalDefinition || '');
    setChecklistItems(existingInterpretation?.checklistItems || []);
  }, [existingInterpretation]);

  const isValid = interpretation.trim().length > 0;
  const hasChanges =
    interpretation !== (existingInterpretation?.interpretation || '') ||
    operationalDefinition !== (existingInterpretation?.operationalDefinition || '') ||
    JSON.stringify(checklistItems) !== JSON.stringify(existingInterpretation?.checklistItems || []);

  return (
    <div className={cn('rounded-lg border bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-purple-50/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <MessageSquare className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Subjective Phrase</h3>
            <p className="text-lg font-semibold text-purple-700 mt-1">"{phrase.phrase}"</p>
            {phrase.context && (
              <p className="text-sm text-text-secondary mt-1">
                Context: {phrase.context}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestion */}
      {matchedSuggestion && !readOnly && (
        <div className="p-4 border-b bg-amber-50/50">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-amber-800">Suggested Interpretation</span>
                <Badge variant="default" className="text-xs">AI Suggestion</Badge>
              </div>
              <p className="text-sm text-amber-700 mb-2">{matchedSuggestion[1].interpretation}</p>
              <Button size="sm" variant="outline" onClick={handleApplySuggestion}>
                Apply Suggestion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interpretation Form */}
      <div className="p-4 space-y-4">
        {/* Main Interpretation */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Your Interpretation <span className="text-danger">*</span>
          </label>
          <textarea
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            disabled={readOnly}
            placeholder="Provide a clear, measurable interpretation of this phrase..."
            className={cn(
              'w-full px-3 py-2 border rounded-lg text-sm resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              readOnly && 'bg-gray-50 cursor-not-allowed'
            )}
            rows={3}
          />
          <p className="text-xs text-text-tertiary mt-1">
            Define what this phrase means operationally for your organization.
          </p>
        </div>

        {/* Operational Definition */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Operational Definition
          </label>
          <textarea
            value={operationalDefinition}
            onChange={(e) => setOperationalDefinition(e.target.value)}
            disabled={readOnly}
            placeholder="e.g., Response within 24 hours during business days..."
            className={cn(
              'w-full px-3 py-2 border rounded-lg text-sm resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              readOnly && 'bg-gray-50 cursor-not-allowed'
            )}
            rows={2}
          />
        </div>

        {/* Checklist Items */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <CheckSquare className="h-4 w-4 inline mr-1.5" />
            Compliance Checklist
          </label>

          {checklistItems.length > 0 && (
            <ul className="space-y-2 mb-3">
              {checklistItems.map((item, index) => (
                <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <CheckSquare className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm flex-1">{item}</span>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-4 w-4 text-text-tertiary" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!readOnly && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Add checklist item..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info Notice */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Interpretations are company-specific and help establish consistent compliance standards
            across your organization.
          </p>
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isValid}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Interpretation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// READ-ONLY DISPLAY
// =============================================================================

interface SubjectivePhraseDisplayProps {
  phrase: string;
  interpretation: Interpretation;
  onEdit?: () => void;
  className?: string;
}

/**
 * Read-only display of a subjective phrase interpretation
 */
export function SubjectivePhraseDisplay({
  phrase,
  interpretation,
  onEdit,
  className,
}: SubjectivePhraseDisplayProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Badge variant="default" className="mb-2">
            <MessageSquare className="h-3 w-3 mr-1" />
            Subjective Phrase
          </Badge>
          <p className="font-medium text-purple-700">"{phrase}"</p>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-text-tertiary uppercase mb-1">Interpretation</p>
          <p className="text-sm">{interpretation.interpretation}</p>
        </div>

        {interpretation.operationalDefinition && (
          <div>
            <p className="text-xs font-medium text-text-tertiary uppercase mb-1">Operational Definition</p>
            <p className="text-sm">{interpretation.operationalDefinition}</p>
          </div>
        )}

        {interpretation.checklistItems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-tertiary uppercase mb-1">Checklist</p>
            <ul className="space-y-1">
              {interpretation.checklistItems.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckSquare className="h-4 w-4 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PENDING INTERPRETATION ALERT
// =============================================================================

interface PendingInterpretationAlertProps {
  phrases: string[];
  onInterpret: () => void;
  className?: string;
}

/**
 * Alert banner for obligations with pending interpretations
 */
export function PendingInterpretationAlert({
  phrases,
  onInterpret,
  className,
}: PendingInterpretationAlertProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200', className)}>
      <AlertTriangle className="h-5 w-5 text-purple-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-purple-800">
          {phrases.length} subjective phrase{phrases.length > 1 ? 's' : ''} need{phrases.length === 1 ? 's' : ''} interpretation
        </p>
        <p className="text-xs text-purple-600 mt-0.5">
          {phrases.slice(0, 3).map(p => `"${p}"`).join(', ')}
          {phrases.length > 3 && ` and ${phrases.length - 3} more`}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onInterpret}>
        Interpret
      </Button>
    </div>
  );
}
