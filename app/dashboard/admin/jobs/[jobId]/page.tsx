'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Job {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  progress?: number;
  duration_ms?: number;
  input_data?: any;
  output_data?: any;
}

interface JobTimelineEvent {
  timestamp: string;
  event: string;
  details?: any;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'timeline' | 'retry-history'>('details');

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['background-job', jobId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/admin/background-jobs/${jobId}`);
    },
  });

  const { data: timelineData } = useQuery({
    queryKey: ['background-job-timeline', jobId],
    queryFn: async (): Promise<any> => {
      try {
        return apiClient.get(`/admin/background-jobs/${jobId}/timeline`);
      } catch (error) {
        return { data: [] };
      }
    },
    enabled: activeTab === 'timeline',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading job details...</div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Job not found</div>
      </div>
    );
  }

  const job = jobData.data;
  const timeline: Array<{ event: string; timestamp: string; details?: string }> = timelineData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/admin/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Job Details</h1>
            <p className="text-gray-600 mt-1">{job.job_type}</p>
          </div>
        </div>
        {job.status === 'failed' && (
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
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
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeline'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Timeline
          </button>
          {job.status === 'failed' && (
            <button
              onClick={() => setActiveTab('retry-history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'retry-history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Retry History
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Job ID</label>
              <div className="mt-1 text-sm font-mono text-gray-900">{job.id}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Job Type</label>
              <div className="mt-1 text-sm text-gray-900">{job.job_type}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'failed' ? 'bg-red-100 text-red-800' :
                  job.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(job.created_at).toLocaleString()}
              </div>
            </div>
            {job.completed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Completed At</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(job.completed_at).toLocaleString()}
                </div>
              </div>
            )}
            {job.duration_ms && (
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <div className="mt-1 text-sm text-gray-900">{job.duration_ms}ms</div>
              </div>
            )}
          </div>

          {job.progress !== undefined && job.status === 'active' && (
            <div>
              <label className="text-sm font-medium text-gray-500">Progress</label>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-sm text-gray-600">{job.progress}%</div>
              </div>
            </div>
          )}

          {job.error_message && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm font-medium text-red-900 mb-1">Error Message</div>
              <div className="text-sm text-red-800">{job.error_message}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Job Logs</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
            <pre>{JSON.stringify(job, null, 2)}</pre>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Job Timeline</h3>
          {timeline.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No timeline events</div>
          ) : (
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="font-medium">{event.event}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    {event.details && (
                      <div className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(event.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'retry-history' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Retry History</h3>
          <div className="text-center py-12 text-gray-500">Retry history coming soon</div>
        </div>
      )}
    </div>
  );
}

