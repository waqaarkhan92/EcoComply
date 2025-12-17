'use client';

/**
 * Consent State Machine Component for Module 2
 * Displays the current state and available transitions for consent management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsentState {
  id: string;
  current_state: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'RENEWED';
  state_entered_at: string;
  previous_state?: string;
  notes?: string;
  changed_by?: { full_name: string };
}

interface StateTransition {
  from_state: string;
  to_state: string;
  action_name: string;
  requires_approval: boolean;
  auto_transition: boolean;
}

interface ConsentStateMachineProps {
  consentId: string;
  siteId: string;
}

export function ConsentStateMachine({ consentId, siteId }: ConsentStateMachineProps) {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<StateTransition | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');

  // Fetch current state
  const { data: stateData, isLoading } = useQuery({
    queryKey: ['consent-state', consentId],
    queryFn: async () => {
      return apiClient.get<ConsentState>('/module-2/consent-states/' + consentId);
    },
  });

  // Fetch available transitions
  const { data: transitionsData } = useQuery({
    queryKey: ['consent-transitions', stateData?.data?.current_state],
    queryFn: async () => {
      if (!stateData?.data?.current_state) return { data: [] as StateTransition[] };
      return apiClient.get<StateTransition[]>('/module-2/consent-states/transitions?from_state=' + stateData.data.current_state);
    },
    enabled: !!stateData?.data?.current_state,
  });

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ toState, notes }: { toState: string; notes: string }) => {
      return apiClient.post('/module-2/consent-states/' + consentId + '/transition', {
        to_state: toState,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-state', consentId] });
      setSelectedTransition(null);
      setTransitionNotes('');
    },
  });

  const state: ConsentState | undefined = stateData?.data;
  const transitions: StateTransition[] = transitionsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading state...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">No state data</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Consent State Machine</h2>

      {/* Current State */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm font-medium text-gray-500">Current State:</span>
          <StateBadge state={state.current_state} large />
        </div>
        <div className="text-sm text-gray-600">
          Entered: {new Date(state.state_entered_at).toLocaleString()}
          {state.changed_by && ' by ' + state.changed_by.full_name}
        </div>
        {state.notes && (
          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {state.notes}
          </div>
        )}
      </div>

      {/* State Flow Visualization */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 mb-4">State Flow</h3>
        <StateFlowDiagram currentState={state.current_state} />
      </div>

      {/* Available Transitions */}
      {transitions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Available Actions</h3>
          <div className="space-y-2">
            {transitions.map((transition) => (
              <button
                key={transition.to_state}
                onClick={() => setSelectedTransition(transition)}
                className="w-full text-left border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{transition.action_name}</div>
                      <div className="text-sm text-gray-600">
                        {transition.from_state} → {transition.to_state}
                      </div>
                    </div>
                  </div>
                  {transition.requires_approval && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Requires Approval
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transition Confirmation Modal */}
      {selectedTransition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Confirm: {selectedTransition.action_name}
            </h3>
            <div className="mb-4 text-sm text-gray-600">
              This will transition the consent from <strong>{selectedTransition.from_state}</strong> to{' '}
              <strong>{selectedTransition.to_state}</strong>.
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Add notes about this transition..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  transitionMutation.mutate({
                    toState: selectedTransition.to_state,
                    notes: transitionNotes,
                  });
                }}
                disabled={transitionMutation.isPending}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTransition(null);
                  setTransitionNotes('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StateFlowDiagram({ currentState }: { currentState: string }) {
  const states = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'EXPIRED'];
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {states.map((state, index) => (
        <div key={state} className="flex items-center">
          <div className={'flex flex-col items-center min-w-24'}>
            <StateBadge state={state} active={state === currentState} />
          </div>
          {index < states.length - 1 && (
            <ArrowRight className={'h-4 w-4 mx-2 ' + (state === currentState ? 'text-primary' : 'text-gray-300')} />
          )}
        </div>
      ))}
    </div>
  );
}

function StateBadge({ state, large = false, active = false }: { state: string; large?: boolean; active?: boolean }) {
  const getConfig = () => {
    switch (state) {
      case 'DRAFT':
        return { icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' };
      case 'SUBMITTED':
        return { icon: Play, color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'UNDER_REVIEW':
        return { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 'APPROVED':
        return { icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' };
      case 'REJECTED':
        return { icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' };
      case 'EXPIRED':
        return { icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' };
      case 'RENEWED':
        return { icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' };
      default:
        return { icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const sizeClass = large ? 'px-3 py-2 text-base' : 'px-2 py-1 text-xs';
  const activeClass = active ? 'ring-2 ring-primary' : '';

  return (
    <span className={'inline-flex items-center font-medium rounded border ' + config.color + ' ' + sizeClass + ' ' + activeClass}>
      <Icon className={'mr-1.5 ' + (large ? 'h-5 w-5' : 'h-3.5 w-3.5')} />
      {state.replace(/_/g, ' ')}
    </span>
  );
}
