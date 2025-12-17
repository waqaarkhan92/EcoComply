'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface RecurrenceTrigger {
  id: string;
  trigger_type: 'DYNAMIC' | 'EVENT_BASED' | 'CONDITIONAL';
  trigger_name: string;
  is_active: boolean;
  next_execution_date: string | null;
  last_executed_at: string | null;
  execution_count: number;
  created_at: string;
}

interface RecurrenceTriggersResponse {
  data: RecurrenceTrigger[];
}

export default function RecurrenceTriggersPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;

  const { data: triggersData, isLoading, error } = useQuery({
    queryKey: ['recurrence-triggers', obligationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<RecurrenceTriggersResponse>(`/obligations/${obligationId}/recurrence-triggers`);
    },
    enabled: !!obligationId,
  });

  const triggers: any[] = triggersData?.data || [];

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case 'DYNAMIC':
        return 'text-blue-600 bg-blue-50';
      case 'EVENT_BASED':
        return 'text-purple-600 bg-purple-50';
      case 'CONDITIONAL':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading recurrence triggers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading recurrence triggers</div>
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
            ← Back to Obligation
          </Link>
          <h1 className="text-2xl font-bold">Recurrence Triggers</h1>
          <p className="text-gray-600 mt-1">Configure automated recurrence triggers for this obligation</p>
        </div>
        <Button
          style={{ backgroundColor: '#026A67' }}
          onClick={() => router.push(`/dashboard/recurrence-trigger-rules/new?obligation_id=${obligationId}`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Trigger
        </Button>
      </div>

      {/* Triggers List */}
      <div className="bg-white rounded-lg shadow">
        {triggers.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recurrence triggers configured</h3>
            <p className="text-gray-500 mb-6">Create triggers to automate obligation recurrence</p>
            <Button
              style={{ backgroundColor: '#026A67' }}
              onClick={() => router.push(`/dashboard/recurrence-trigger-rules/new?obligation_id=${obligationId}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Trigger
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/sites/${siteId}/obligations/${obligationId}/recurrence-triggers/${trigger.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {trigger.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{trigger.trigger_name}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getTriggerTypeColor(trigger.trigger_type)}`}>
                          {trigger.trigger_type.replace(/_/g, ' ')}
                        </span>
                        {trigger.is_active && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {trigger.next_execution_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Next: {new Date(trigger.next_execution_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {trigger.last_executed_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Last: {new Date(trigger.last_executed_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        <span>Executions: {trigger.execution_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/sites/${siteId}/obligations/${obligationId}/recurrence-triggers/${trigger.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm">
                        View
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

