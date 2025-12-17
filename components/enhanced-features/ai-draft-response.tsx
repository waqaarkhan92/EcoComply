'use client';

/**
 * AI Draft Response Component
 * Generate AI-powered draft responses to regulator questions
 */

import { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Edit,
  Send,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useGenerateDraftResponse, DraftResponse } from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface AIDraftResponseProps {
  questionId: string;
  questionText: string;
  onSubmitResponse?: (response: string, evidenceIds?: string[]) => void;
}

export function AIDraftResponse({ questionId, questionText, onSubmitResponse }: AIDraftResponseProps) {
  const generateMutation = useGenerateDraftResponse();
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);

  const handleGenerate = async () => {
    try {
      const response = await generateMutation.mutateAsync(questionId);
      setDraft(response);
      setEditedResponse(response.draft_response);
      setSelectedEvidence(response.evidence_suggestions.map((e) => e.id));
    } catch (error) {
      console.error('Failed to generate draft:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedResponse || draft?.draft_response || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    if (onSubmitResponse) {
      onSubmitResponse(editedResponse || draft?.draft_response || '', selectedEvidence);
    }
  };

  const toggleEvidence = (evidenceId: string) => {
    setSelectedEvidence((prev) =>
      prev.includes(evidenceId)
        ? prev.filter((id) => id !== evidenceId)
        : [...prev, evidenceId]
    );
  };

  // Initial state - no draft yet
  if (!draft && !generateMutation.isPending) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Draft Assistant</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Generate a professional draft response to this regulator question using AI.
            The draft will be based on your permit data and existing evidence.
          </p>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Draft Response
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (generateMutation.isPending) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Generating Draft Response...</h3>
            <p className="text-sm text-gray-500">Analyzing question and reviewing your data</p>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/6" />
        </div>
      </div>
    );
  }

  // Draft generated
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-100/50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI-Generated Draft</h3>
              <p className="text-xs text-gray-500">
                Based on {draft?.context_used.obligations_count} obligations, {draft?.context_used.evidence_count} evidence items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleGenerate}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Draft content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedResponse}
            onChange={(e) => setEditedResponse(e.target.value)}
            className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Edit the draft response..."
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-700">
              {editedResponse || draft?.draft_response}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            {draft?.disclaimer || 'This is an AI-generated draft. Please review and edit before submitting to the regulator.'}
          </p>
        </div>
      </div>

      {/* Evidence suggestions */}
      {draft?.evidence_suggestions && draft.evidence_suggestions.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Suggested Evidence to Attach</p>
          <div className="space-y-2">
            {draft.evidence_suggestions.map((evidence) => (
              <label
                key={evidence.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedEvidence.includes(evidence.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvidence.includes(evidence.id)}
                  onChange={() => toggleEvidence(evidence.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <FileText className="w-4 h-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{evidence.file_name}</p>
                  <p className="text-xs text-gray-500">{evidence.relevance}</p>
                </div>
                <Badge variant="default" className="text-xs">
                  {evidence.evidence_type}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {onSubmitResponse && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Continue Editing
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="w-4 h-4 mr-2" />
            Submit Response
          </Button>
        </div>
      )}
    </div>
  );
}

export default AIDraftResponse;
