'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ValidationExecution {
  id: string;
  validation_rule_id: string;
  consignment_note_id: string;
  executed_at: string;
  execution_status: 'PASSED' | 'FAILED' | 'WARNING';
  validation_result: any;
  error_message: string | null;
  duration_ms: number;
}

export default function ValidationExecutionHistoryPage({
  params,
}: {
  params: Promise<{ siteId: string; ruleId: string }>;
}) {
  const { siteId, ruleId } = use(params);
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: executionsData, isLoading } = useQuery<{
    data: ValidationExecution[];
    pagination: any;
    stats: {
      total_executions: number;
      success_rate: number;
      failure_rate: number;
      avg_execution_time: number;
    };
  }>({
    queryKey: ['validation-executions', ruleId, statusFilter],
    queryFn: async (): Promise<any> => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('filter[execution_status]', statusFilter);
        }
        return apiClient.get(`/module-4/validation-rules/${ruleId}/executions?${params.toString()}`);
      } catch (error) {
        return {
          data: [],
          stats: {
            total_executions: 0,
            success_rate: 0,
            failure_rate: 0,
            avg_execution_time: 0,
          },
        };
      }
    },
  });

  const executions: any[] = executionsData?.data || [];
  const stats = executionsData?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/hazardous-waste/validation-rules/${ruleId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Validation Execution History</h1>
            <p className="text-gray-600 mt-1">View validation rule execution history</p>
          </div>
        </div>
      </div>

      {/* Execution Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-primary">{stats.total_executions}</div>
            <div className="text-sm text-gray-600">Total Executions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.success_rate}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failure_rate}%</div>
            <div className="text-sm text-gray-600">Failure Rate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-primary">{stats.avg_execution_time}ms</div>
            <div className="text-sm text-gray-600">Avg Execution Time</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Execution History</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading executions...</div>
        ) : executions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No executions yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Execution Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consignment Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {executions.map((execution) => (
                <tr key={execution.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(execution.executed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <Link
                      href={`/dashboard/sites/${siteId}/hazardous-waste/consignment-notes/${execution.consignment_note_id}`}
                      className="text-primary hover:underline"
                    >
                      {execution.consignment_note_id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                      execution.execution_status === 'PASSED' ? 'bg-green-100 text-green-800' :
                      execution.execution_status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {execution.execution_status === 'PASSED' && <CheckCircle className="h-3 w-3" />}
                      {execution.execution_status === 'FAILED' && <XCircle className="h-3 w-3" />}
                      {execution.execution_status === 'WARNING' && <AlertCircle className="h-3 w-3" />}
                      {execution.execution_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {execution.duration_ms}ms
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Open execution detail modal
                      }}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

