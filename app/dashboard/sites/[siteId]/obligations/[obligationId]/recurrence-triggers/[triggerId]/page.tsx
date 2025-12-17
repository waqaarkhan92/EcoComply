'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Settings, Clock, Calendar, CheckCircle, XCircle, History } from 'lucide-react';
import Link from 'next/link';

interface RecurrenceTrigger {
  id: string;
  trigger_type: 'DYNAMIC' | 'EVENT_BASED' | 'CONDITIONAL';
  trigger_name: string;
  trigger_config: any;
  is_active: boolean;
  next_execution_date: string | null;
  last_executed_at: string | null;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

interface TriggerExecution {
  id: string;
  executed_at: string;
  status: string;
  result: any;
  error_message: string | null;
}

interface TriggerExecutionsResponse {
  data: TriggerExecution[];
}

export default function RecurrenceTriggerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;
  const triggerId = params.triggerId as string;
  const [activeTab, setActiveTab] = useState<'details' | 'execution-history' | 'schedule-preview'>('details');

  const { data: trigger, isLoading } = useQuery({
    queryKey: ['recurrence-trigger', triggerId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurrenceTrigger>(`/recurrence-trigger-rules/${triggerId}`);
      return response.data;
    },
    enabled: !!triggerId,
  });

  const { data: executionsData } = useQuery({
    queryKey: ['recurrence-trigger-executions', triggerId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<TriggerExecutionsResponse>(`/recurrence-trigger-rules/${triggerId}/executions`);
    },
    enabled: !!triggerId && activeTab === 'execution-history',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading trigger...</div>
      </div>
    );
  }

  if (!trigger) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Trigger not found</p>
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/recurrence-triggers`}>
            <Button variant="outline">Back to Triggers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const executions: any[] = executionsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/obligations/${obligationId}/recurrence-triggers`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Triggers
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-3xl font-bold">{trigger.trigger_name}</h1>
              <p className="text-gray-600 mt-1">
                {trigger.trigger_type.replace(/_/g, ' ')} • {trigger.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/recurrence-trigger-rules/${triggerId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('execution-history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'execution-history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Execution History
          </button>
          <button
            onClick={() => setActiveTab('schedule-preview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule-preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule Preview
          </button>
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Trigger Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Trigger Type</label>
              <p className="text-gray-900">{trigger.trigger_type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="text-gray-900">
                {trigger.is_active ? (
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </p>
            </div>
            {trigger.next_execution_date && (
              <div>
                <label className="text-sm font-medium text-gray-700">Next Execution</label>
                <p className="text-gray-900 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(trigger.next_execution_date).toLocaleString()}
                </p>
              </div>
            )}
            {trigger.last_executed_at && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Executed</label>
                <p className="text-gray-900 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(trigger.last_executed_at).toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Total Executions</label>
              <p className="text-gray-900">{trigger.execution_count}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Created</label>
              <p className="text-gray-900">{new Date(trigger.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {trigger.trigger_config && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">Configuration</label>
              <pre className="mt-2 p-4 bg-gray-50 rounded text-sm overflow-x-auto">
                {JSON.stringify(trigger.trigger_config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Execution History Tab */}
      {activeTab === 'execution-history' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Execution History</h2>
            <Button variant="outline" size="sm">
              Refresh
            </Button>
          </div>
          {executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No executions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution) => (
                <div key={execution.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {execution.status === 'SUCCESS' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {new Date(execution.executed_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: {execution.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  {execution.error_message && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                      {execution.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Preview Tab */}
      {activeTab === 'schedule-preview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Schedule Preview</h2>
          <p className="text-gray-600">Schedule preview will be displayed here based on trigger configuration.</p>
        </div>
      )}
    </div>
  );
}

