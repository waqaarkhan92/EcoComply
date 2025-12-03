'use client';

/**
 * Worker Health Monitoring Widget
 * Displays status of all background workers
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Cpu } from 'lucide-react';

interface WorkerHealth {
  name: string;
  status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';
  workers: number;
  jobs: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  health: 'HEALTHY' | 'WARNING' | 'UNHEALTHY';
  error?: string;
}

export function WorkerHealthWidget() {
  const { data, isLoading } = useQuery<{
    data: {
      workers: WorkerHealth[];
      summary: {
        total_workers: number;
        healthy: number;
        warning: number;
        unhealthy: number;
        total_jobs: {
          waiting: number;
          active: number;
          failed: number;
        };
      };
    };
  }>({
    queryKey: ['worker-health'],
    queryFn: async () => {
      return apiClient.get('/admin/workers/health');
    },
    refetchInterval: 10000,
  });

  const workers = data?.data?.workers || [];
  const summary = data?.data?.summary;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading worker status...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Background Workers</h2>
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">{summary?.total_workers} active</span>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{summary.healthy}</div>
            <div className="text-xs text-green-600">Healthy</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{summary.warning}</div>
            <div className="text-xs text-yellow-600">Warning</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{summary.unhealthy}</div>
            <div className="text-xs text-red-600">Unhealthy</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {workers.map((worker) => (
          <WorkerHealthItem key={worker.name} worker={worker} />
        ))}
      </div>

      {summary && summary.total_jobs.failed > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">
              {summary.total_jobs.failed} failed jobs require attention
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkerHealthItem({ worker }: { worker: WorkerHealth }) {
  const getHealthIcon = () => {
    switch (worker.health) {
      case 'HEALTHY':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'UNHEALTHY':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getHealthColor = () => {
    switch (worker.health) {
      case 'HEALTHY':
        return 'border-green-200 bg-green-50';
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50';
      case 'UNHEALTHY':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className={'border rounded-lg p-3 ' + getHealthColor()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getHealthIcon()}
          <div>
            <div className="font-medium text-sm text-gray-900">
              {worker.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-xs text-gray-600">
              {worker.workers} worker{worker.workers !== 1 ? 's' : ''} • {worker.status}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600">
            {worker.jobs.active > 0 && (
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {worker.jobs.active} active
              </span>
            )}
            {worker.jobs.waiting > 0 && (
              <span className="ml-2 text-gray-500">{worker.jobs.waiting} waiting</span>
            )}
          </div>
          {worker.jobs.failed > 0 && (
            <div className="text-xs text-red-600 mt-1">
              {worker.jobs.failed} failed
            </div>
          )}
        </div>
      </div>
      {worker.error && (
        <div className="mt-2 text-xs text-red-600 bg-white p-2 rounded">
          Error: {worker.error}
        </div>
      )}
    </div>
  );
}
