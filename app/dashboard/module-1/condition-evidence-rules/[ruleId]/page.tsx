'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ConditionEvidenceRule {
  id: string;
  document_id: string;
  obligation_id: string | null;
  condition_reference: string;
  allowed_evidence_types: string[];
  required_evidence_types: string[];
  evidence_requirements: any;
  is_active: boolean;
  documents: { id: string; document_name: string };
  obligations: { id: string; summary: string } | null;
  created_at: string;
  updated_at: string;
}

export default function ConditionEvidenceRuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);

  const { data: rule, isLoading } = useQuery<ConditionEvidenceRule>({
    queryKey: ['condition-evidence-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConditionEvidenceRule>(`/module-1/condition-evidence-rules/${ruleId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading condition evidence rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Condition evidence rule not found</p>
        <Link href="/dashboard/module-1/condition-evidence-rules">
          <Button variant="outline" className="mt-4">
            Back to Condition Evidence Rules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/condition-evidence-rules"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Condition Evidence Rules
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Condition Evidence Rule</h1>
          <p className="text-text-secondary mt-2">
            {rule.documents.document_name} • {rule.condition_reference}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-1/condition-evidence-rules/${ruleId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${rule.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FileText className={`w-6 h-6 ${rule.is_active ? 'text-green-700' : 'text-gray-700'}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Status: {rule.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Condition: {rule.condition_reference}
            </p>
          </div>
        </div>
      </div>

      {/* Rule Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Rule Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Document</p>
            <p className="text-text-primary font-medium">{rule.documents.document_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Condition Reference</p>
            <p className="text-text-primary font-mono">{rule.condition_reference}</p>
          </div>

          {rule.obligations && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Obligation</p>
              <p className="text-text-primary">{rule.obligations.summary}</p>
            </div>
          )}

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Allowed Evidence Types</p>
            <div className="flex flex-wrap gap-2">
              {rule.allowed_evidence_types.length > 0 ? (
                rule.allowed_evidence_types.map((type, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">None configured</span>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Required Evidence Types</p>
            <div className="flex flex-wrap gap-2">
              {rule.required_evidence_types.length > 0 ? (
                rule.required_evidence_types.map((type, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">None configured</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(rule.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(rule.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

