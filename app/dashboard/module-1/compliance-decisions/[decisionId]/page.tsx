'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle2, XCircle, AlertCircle, Clock, Minus, FileText } from 'lucide-react';
import Link from 'next/link';

interface ComplianceDecision {
  id: string;
  company_id: string;
  site_id: string;
  obligation_id: string | null;
  decision_type: 'COMPLIANCE' | 'NON_COMPLIANCE' | 'PARTIAL_COMPLIANCE' | 'NOT_APPLICABLE' | 'DEFERRED';
  decision_date: string;
  decision_maker: string;
  rationale: string;
  evidence_references: string[];
  impact_assessment: string | null;
  review_date: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

const decisionTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  COMPLIANCE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  NON_COMPLIANCE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  PARTIAL_COMPLIANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
  NOT_APPLICABLE: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Minus },
  DEFERRED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
};

export default function ComplianceDecisionDetailPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = use(params);

  const { data: decision, isLoading } = useQuery({
    queryKey: ['compliance-decision', decisionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ComplianceDecision>(`/module-1/compliance-decisions/${decisionId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading compliance decision...</div>;
  }

  if (!decision) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Compliance decision not found</p>
        <Link href="/dashboard/module-1/compliance-decisions">
          <Button variant="outline" className="mt-4">
            Back to Compliance Decisions
          </Button>
        </Link>
      </div>
    );
  }

  const typeStyle = decisionTypeColors[decision.decision_type] || decisionTypeColors.COMPLIANCE;
  const DecisionIcon = typeStyle.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/compliance-decisions"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Compliance Decisions
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            Compliance Decision
          </h1>
          <p className="text-text-secondary mt-2">
            Decision made on {new Date(decision.decision_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-1/compliance-decisions/${decisionId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${typeStyle.bg} ${typeStyle.border}`}>
        <div className="flex items-center gap-3">
          <DecisionIcon className={`w-6 h-6 ${typeStyle.text}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Decision Type: {decision.decision_type.replace('_', ' ')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Status: {decision.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Decision Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Decision Type</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
              <DecisionIcon className="w-4 h-4 mr-2" />
              {decision.decision_type.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Decision Date</p>
            <p className="text-text-primary">
              {new Date(decision.decision_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {decision.is_active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Inactive
              </span>
            )}
          </div>

          {decision.obligation_id && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Related Obligation</p>
              <Link
                href={`/dashboard/obligations/${decision.obligation_id}`}
                className="text-primary hover:underline"
              >
                View Obligation
              </Link>
            </div>
          )}

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Rationale *</p>
            <p className="text-text-primary whitespace-pre-wrap">{decision.rationale}</p>
          </div>

          {decision.impact_assessment && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Impact Assessment</p>
              <p className="text-text-primary whitespace-pre-wrap">{decision.impact_assessment}</p>
            </div>
          )}

          {decision.evidence_references && decision.evidence_references.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Evidence References</p>
              <div className="space-y-2">
                {decision.evidence_references.map((ref: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-text-primary">{ref}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decision.review_date && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Review</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Review Date</p>
                  <p className="text-text-primary">
                    {new Date(decision.review_date).toLocaleDateString()}
                  </p>
                </div>
                {decision.review_notes && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Review Notes</p>
                    <p className="text-text-primary whitespace-pre-wrap">{decision.review_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(decision.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(decision.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

