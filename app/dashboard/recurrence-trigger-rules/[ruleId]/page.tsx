'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Settings, CheckCircle2, XCircle, Calendar, History } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface RecurrenceTriggerRule {
  id: string;
  schedule_id: string;
  site_id: string;
  rule_type: string;
  rule_config: any;
  trigger_expression: string | null;
  is_active: boolean;
  event_id: string | null;
  next_execution_date: string | null;
  last_executed_at: string | null;
  execution_count: number;
  schedules: { id: string; schedule_name: string };
  recurrence_events: { id: string; event_name: string; event_type: string; event_date: string } | null;
  created_at: string;
  updated_at: string;
}

export default function RecurrenceTriggerRuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);
  const [activeTab, setActiveTab] = useState<'details' | 'execution-history'>('details');

  const { data: rule, isLoading } = useQuery({
    queryKey: ['recurrence-trigger-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurrenceTriggerRule>(`/recurrence-trigger-rules/${ruleId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading trigger rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Trigger rule not found</p>
        <Link href="/dashboard/recurrence-trigger-rules">
          <Button variant="outline" className="mt-4">
            Back to Trigger Rules
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
            href="/dashboard/recurrence-trigger-rules"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Trigger Rules
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            Trigger Rule: {rule.schedules.schedule_name}
          </h1>
          <p className="text-text-secondary mt-2">
            {rule.rule_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/recurrence-trigger-rules/${ruleId}/edit`}>
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
          <Settings className="w-6 h-6 text-gray-700" />
          <div>
            <p className="font-semibold text-gray-900">
              Status: {rule.is_active ? 'Active' : 'Inactive'}
            </p>
            {rule.next_execution_date && (
              <p className="text-sm text-gray-600 mt-1">
                Next Execution: {new Date(rule.next_execution_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rule Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Rule Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Rule Type</p>
            <p className="text-text-primary">{rule.rule_type.replace('_', ' ')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {rule.is_active ? (
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

          {rule.recurrence_events && (
            <>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Linked Event</p>
                <p className="text-text-primary">{rule.recurrence_events.event_name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {rule.recurrence_events.event_type} - {new Date(rule.recurrence_events.event_date).toLocaleDateString()}
                </p>
              </div>
            </>
          )}

          {rule.next_execution_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Next Execution</p>
              <p className="text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(rule.next_execution_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {rule.last_executed_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Last Executed</p>
              <p className="text-text-primary">
                {new Date(rule.last_executed_at).toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Execution Count</p>
            <p className="text-text-primary">{rule.execution_count}</p>
          </div>

          {rule.rule_config && Object.keys(rule.rule_config).length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Rule Configuration</p>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                {JSON.stringify(rule.rule_config, null, 2)}
              </pre>
            </div>
          )}

          {rule.trigger_expression && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Trigger Expression</p>
              <p className="text-text-primary font-mono text-sm bg-gray-50 p-3 rounded-md">{rule.trigger_expression}</p>
            </div>
          )}

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

