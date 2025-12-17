'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Clock, CheckCircle, XCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';

interface JobMetrics {
  total_jobs: number;
  active_jobs: number;
  success_rate: number;
  failed_jobs: number;
  avg_processing_time: number;
  queue_health: 'healthy' | 'degraded' | 'unhealthy';
}

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
}

export default function BackgroundJobsAdminPage() {
  const router = useRouter();
  const { roles } = useAuthStore();
  const isAdmin = roles?.includes('OWNER') || roles?.includes('ADMIN');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');

  const { data: metricsData } = useQuery({
    queryKey: ['jobs-metrics'],
    queryFn: async (): Promise<any> => {
      try {
        return apiClient.get('/admin/background-jobs/metrics');
      } catch (error) {
        // Endpoint might not exist yet
        return {
          data: {
            total_jobs: 0,
            active_jobs: 0,
            success_rate: 0,
            failed_jobs: 0,
            avg_processing_time: 0,
            queue_health: 'healthy' as const,
          },
        };
      }
    },
  });

  const { data: jobsData, isLoading } = useQuery<{
    data: Job[];
    pagination: any;
  }>({
    queryKey: ['background-jobs', statusFilter, jobTypeFilter, searchQuery],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('filter[status]', statusFilter);
      if (jobTypeFilter !== 'all') params.append('filter[job_type]', jobTypeFilter);
      if (searchQuery) params.append('filter[job_type]', searchQuery);
      return apiClient.get(`/admin/background-jobs?${params.toString()}`);
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Access denied. Admin role required.</div>
      </div>
    );
  }

  const metrics = metricsData?.data;
  const jobs: any[] = jobsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Background Jobs</h1>
          <p className="text-text-secondary mt-2">
            Monitor and manage background job processing
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{metrics.total_jobs}</div>
                <div className="text-sm text-gray-600">Total Jobs</div>
              </div>
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{metrics.active_jobs}</div>
                <div className="text-sm text-gray-600">Active Jobs</div>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{metrics.success_rate}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{metrics.failed_jobs}</div>
                <div className="text-sm text-gray-600">Failed Jobs</div>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{metrics.avg_processing_time}ms</div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${
                  metrics.queue_health === 'healthy' ? 'text-green-600' :
                  metrics.queue_health === 'degraded' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {metrics.queue_health.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">Queue Health</div>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="DOCUMENT_PROCESSING">Document Processing</option>
              <option value="MONITORING_SCHEDULE">Monitoring Schedule</option>
              <option value="COMPLIANCE_CLOCK_UPDATE">Compliance Clock Update</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Jobs</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No jobs found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{job.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{job.job_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'failed' ? 'bg-red-100 text-red-800' :
                      job.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                    {job.progress !== undefined && job.status === 'active' && (
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.duration_ms ? `${job.duration_ms}ms` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/jobs/${job.id}`)}
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

