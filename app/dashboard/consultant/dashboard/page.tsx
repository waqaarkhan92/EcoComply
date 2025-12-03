'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ConsultantDashboard {
  total_clients: number;
  active_clients: number;
  total_sites: number;
  compliance_overview: {
    total_obligations: number;
    overdue_count: number;
    approaching_deadline_count: number;
    avg_compliance_score: number;
  };
}

export default function ConsultantDashboardPage() {
  const { data: dashboardData, isLoading } = useQuery<{ data: ConsultantDashboard }>({
    queryKey: ['consultant-dashboard'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: ConsultantDashboard }>('/consultant/dashboard');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const dashboard = dashboardData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consultant Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of all your clients</p>
      </div>

      {dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.total_clients}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.active_clients}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sites</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.total_sites}</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Compliance</p>
                  <p className="text-2xl font-bold mt-1">
                    {(dashboard.compliance_overview.avg_compliance_score * 100).toFixed(0)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Compliance Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Obligations</p>
                <p className="text-xl font-bold mt-1">{dashboard.compliance_overview.total_obligations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-xl font-bold mt-1 text-red-600">
                  {dashboard.compliance_overview.overdue_count}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Approaching</p>
                <p className="text-xl font-bold mt-1 text-yellow-600">
                  {dashboard.compliance_overview.approaching_deadline_count}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Link href="/dashboard/consultant/clients">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            View All Clients
          </button>
        </Link>
      </div>
    </div>
  );
}

