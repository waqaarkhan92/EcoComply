'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import StateMachineDiagram from '@/components/regulator-questions/StateMachineDiagram';
import StateHistoryTimeline from '@/components/regulator-questions/StateHistoryTimeline';
import ResponseDeadlineCountdown from '@/components/regulator-questions/ResponseDeadlineCountdown';
import { useAuthStore } from '@/lib/store/auth-store';

type RegulatorQuestionState = 
  | 'OPEN' 
  | 'RESPONSE_SUBMITTED' 
  | 'RESPONSE_ACKNOWLEDGED' 
  | 'FOLLOW_UP_REQUIRED' 
  | 'CLOSED' 
  | 'RESPONSE_OVERDUE';

interface RegulatorQuestion {
  id: string;
  question_type: string;
  question_text: string;
  response_deadline: string;
  status: RegulatorQuestionState;
  response_text: string | null;
  response_submitted_date: string | null;
  created_at: string;
}

interface StateTransition {
  id: string;
  from_state: string;
  to_state: string;
  transitioned_at: string;
  transitioned_by: string;
  transition_reason?: string;
}

export default function RegulatorQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;
  const questionId = params.questionId as string;
  const { roles } = useAuthStore();
  const isAdminOrOwner = roles?.includes('OWNER') || roles?.includes('ADMIN');

  const [responseText, setResponseText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'state-machine' | 'history'>('details');

  const { data: questionData, isLoading } = useQuery({
    queryKey: ['regulator-question', questionId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: RegulatorQuestion }>(`/regulator-questions/${questionId}`);
    },
  });

  const { data: stateHistoryData } = useQuery({
    queryKey: ['regulator-question-state-history', questionId],
    queryFn: async (): Promise<any> => {
      try {
        return apiClient.get<{ data: StateTransition[] }>(`/regulator-questions/${questionId}/state-history`);
      } catch (error) {
        // Endpoint might not exist yet, return empty array
        return { data: [] };
      }
    },
    enabled: !!questionId,
  });

  const submitResponse = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/regulator-questions/${questionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulator-question', questionId] });
      queryClient.invalidateQueries({ queryKey: ['regulator-question-state-history', questionId] });
      setResponseText('');
    },
  });

  const transitionState = useMutation({
    mutationFn: async (newState: RegulatorQuestionState) => {
      return apiClient.post(`/regulator-questions/${questionId}/transition`, { new_state: newState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulator-question', questionId] });
      queryClient.invalidateQueries({ queryKey: ['regulator-question-state-history', questionId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading question...</div>
      </div>
    );
  }

  if (!questionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Question not found</div>
      </div>
    );
  }

  const question = questionData.data;
  const canRespond = question.status === 'OPEN' || question.status === 'RESPONSE_OVERDUE';
  
  // Determine available transitions based on current state
  const getAvailableTransitions = (): RegulatorQuestionState[] => {
    switch (question.status) {
      case 'OPEN':
        return ['RESPONSE_SUBMITTED'];
      case 'RESPONSE_SUBMITTED':
        return isAdminOrOwner ? ['RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED'] : [];
      case 'RESPONSE_ACKNOWLEDGED':
        return isAdminOrOwner ? ['FOLLOW_UP_REQUIRED', 'CLOSED'] : [];
      case 'FOLLOW_UP_REQUIRED':
        return ['CLOSED'];
      case 'RESPONSE_OVERDUE':
        return ['RESPONSE_SUBMITTED'];
      default:
        return [];
    }
  };

  const availableTransitions = getAvailableTransitions();
  const stateHistory: any[] = stateHistoryData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/regulator-questions`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Regulator Question</h1>
            <p className="text-gray-600 mt-1">{question.question_type}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('state-machine')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'state-machine'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            State Machine
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Response Deadline Countdown */}
          <ResponseDeadlineCountdown 
            deadline={question.response_deadline} 
            questionType={question.question_type}
          />

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Question</label>
              <div className="mt-1 text-sm text-gray-900">{question.question_text}</div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Response Deadline</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(question.response_deadline).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    question.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                    question.status === 'RESPONSE_OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {question.status}
                  </span>
                </div>
              </div>
            </div>

            {question.response_text && (
              <div>
                <label className="text-sm font-medium text-gray-500">Response</label>
                <div className="mt-1 text-sm text-gray-900">{question.response_text}</div>
                {question.response_submitted_date && (
                  <div className="mt-2 text-xs text-gray-500">
                    Submitted: {new Date(question.response_submitted_date).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {canRespond && (
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm"
                  rows={6}
                  placeholder="Enter your response to the regulator question..."
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => submitResponse.mutate({ response_text: responseText, status: 'RESPONSE_SUBMITTED' })}
                    disabled={submitResponse.isPending || !responseText.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitResponse.isPending ? 'Submitting...' : 'Submit Response'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'state-machine' && (
        <StateMachineDiagram
          currentState={question.status}
          availableTransitions={availableTransitions}
          onTransition={(newState) => transitionState.mutate(newState)}
          readOnly={!isAdminOrOwner && question.status !== 'OPEN' && question.status !== 'RESPONSE_OVERDUE'}
        />
      )}

      {activeTab === 'history' && (
        <StateHistoryTimeline transitions={stateHistory} />
      )}
    </div>
  );
}

