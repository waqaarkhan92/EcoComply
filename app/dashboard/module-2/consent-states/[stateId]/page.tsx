'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ConsentState {
  id: string;
  document_id: string;
  site_id: string;
  state: 'DRAFT' | 'IN_FORCE' | 'SUPERSEDED' | 'EXPIRED';
  effective_date: string;
  expiry_date: string | null;
  previous_state_id: string | null;
  state_transition_reason: string | null;
  transitioned_by: string | null;
  transitioned_at: string;
  documents: { id: string; document_name: string };
  consent_states: { id: string; state: string; effective_date: string } | null;
  created_at: string;
  updated_at: string;
}

const stateColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: FileText },
  IN_FORCE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  SUPERSEDED: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  EXPIRED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

export default function ConsentStateDetailPage({
  params,
}: {
  params: Promise<{ stateId: string }>;
}) {
  const { stateId } = use(params);

  const { data: state, isLoading } = useQuery({
    queryKey: ['consent-state', stateId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConsentState>(`/module-2/consent-states/${stateId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading consent state...</div>;
  }

  if (!state) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Consent state not found</p>
        <Link href="/dashboard/module-2/consent-states">
          <Button variant="outline" className="mt-4">
            Back to Consent States
          </Button>
        </Link>
      </div>
    );
  }

  const stateStyle = stateColors[state.state] || stateColors.DRAFT;
  const StateIcon = stateStyle.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-2/consent-states"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Consent States
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Consent State</h1>
          <p className="text-text-secondary mt-2">
            {state.documents.document_name}
          </p>
        </div>
      </div>

      {/* State Banner */}
      <div className={`rounded-lg p-4 border-2 ${stateStyle.bg} ${stateStyle.border}`}>
        <div className="flex items-center gap-3">
          <StateIcon className={`w-6 h-6 ${stateStyle.text}`} />
          <div>
            <p className={`font-semibold ${stateStyle.text}`}>
              State: {state.state.replace('_', ' ')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Effective: {new Date(state.effective_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* State Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">State Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Document</p>
            <p className="text-text-primary font-medium">{state.documents.document_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">State</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${stateStyle.bg} ${stateStyle.text} border ${stateStyle.border}`}>
              <StateIcon className="w-3.5 h-3.5 mr-1.5" />
              {state.state.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Effective Date</p>
            <p className="text-text-primary">
              {new Date(state.effective_date).toLocaleDateString()}
            </p>
          </div>

          {state.expiry_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Expiry Date</p>
              <p className="text-text-primary">
                {new Date(state.expiry_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {state.state_transition_reason && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Transition Reason</p>
              <p className="text-text-primary whitespace-pre-wrap">{state.state_transition_reason}</p>
            </div>
          )}

          {state.consent_states && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Previous State</p>
              <Link
                href={`/dashboard/module-2/consent-states/${state.previous_state_id}`}
                className="text-primary hover:underline"
              >
                {state.consent_states.state} ({new Date(state.consent_states.effective_date).toLocaleDateString()})
              </Link>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Transitioned</p>
            <p className="text-text-primary">
              {new Date(state.transitioned_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(state.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

