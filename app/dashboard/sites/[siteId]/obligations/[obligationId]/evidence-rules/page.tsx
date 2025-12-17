'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Settings, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EvidenceRule {
  id: string;
  rule_type: string;
  rule_config: any;
  is_active: boolean;
  created_at: string;
}

interface EvidenceRulesResponse {
  data: EvidenceRule[];
}

export default function EvidenceRulesPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: rulesData, isLoading, error } = useQuery({
    queryKey: ['evidence-rules', obligationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<EvidenceRulesResponse>(`/obligations/${obligationId}/evidence-rules`);
    },
    enabled: !!obligationId,
  });

  const rules: any[] = rulesData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading evidence rules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading evidence rules</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/obligations/${obligationId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Obligation
          </Link>
          <h1 className="text-2xl font-bold">Evidence Rules</h1>
          <p className="text-gray-600 mt-1">Configure evidence requirements for this obligation</p>
        </div>
        <Button
          style={{ backgroundColor: '#026A67' }}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow">
        {rules.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No evidence rules configured</h3>
            <p className="text-gray-500 mb-6">Add rules to define evidence requirements for this obligation</p>
            <Button
              style={{ backgroundColor: '#026A67' }}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Rule
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <div key={rule.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {rule.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{rule.rule_type.replace(/_/g, ' ')}</span>
                        {rule.is_active && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Created: {new Date(rule.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/module-1/condition-evidence-rules/${rule.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

