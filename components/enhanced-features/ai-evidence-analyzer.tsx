'use client';

/**
 * AI Evidence Analyzer Component
 * AI-powered evidence gap analysis and suggestions
 */

import { useState } from 'react';
import {
  Sparkles,
  FileCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Upload,
  Info,
} from 'lucide-react';
import {
  useEvidenceSuggestions,
  useAnalyzeEvidence,
  EvidenceSuggestion,
} from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface AIEvidenceAnalyzerProps {
  obligationId: string;
  onUploadEvidence?: () => void;
}

const priorityConfig = {
  HIGH: { color: 'text-red-600', bg: 'bg-red-100', badge: 'danger' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100', badge: 'warning' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-100', badge: 'secondary' },
};

export function AIEvidenceAnalyzer({ obligationId, onUploadEvidence }: AIEvidenceAnalyzerProps) {
  const { data: suggestions, isLoading, refetch } = useEvidenceSuggestions(obligationId);
  const analyzeMutation = useAnalyzeEvidence();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeMutation.mutateAsync(obligationId);
      refetch();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return <AIEvidenceAnalyzerSkeleton />;
  }

  const hasSuggestions = suggestions?.suggestions && suggestions.suggestions.length > 0;

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
              <h3 className="font-semibold text-gray-900">AI Evidence Analysis</h3>
              <p className="text-sm text-gray-600">
                Powered by AI to identify required evidence
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!hasSuggestions ? (
          <div className="text-center py-6">
            <FileCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-gray-900">Evidence looks complete!</p>
            <p className="text-sm text-gray-500 mt-1">
              AI analysis found no missing evidence requirements
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleAnalyze}>
              Run analysis again
            </Button>
          </div>
        ) : (
          <>
            {/* Confidence indicator */}
            {suggestions && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Analysis confidence: <span className="font-medium">{Math.round(suggestions.confidence * 100)}%</span>
                </span>
              </div>
            )}

            {/* Suggestions list */}
            <div className="space-y-3">
              {suggestions?.suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  onUpload={onUploadEvidence}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {suggestions?.generated_at && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          Last analyzed: {new Date(suggestions.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: {
    evidence_type: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  onUpload?: () => void;
}

function SuggestionCard({ suggestion, onUpload }: SuggestionCardProps) {
  const config = priorityConfig[suggestion.priority];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} border-opacity-50`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white`}>
            <AlertCircle className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{suggestion.evidence_type}</span>
              <Badge variant={config.badge as any} className="text-xs">
                {suggestion.priority}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              <span className="font-medium">Why:</span> {suggestion.reason}
            </p>
          </div>
        </div>

        {onUpload && (
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        )}
      </div>
    </div>
  );
}

function AIEvidenceAnalyzerSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default AIEvidenceAnalyzer;
