'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Building2, Plus, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string; // API returns 'name' not 'site_name'
  address_line_1: string;
  city: string;
  postcode: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  active_modules?: string[];
  overdue_count?: number;
  upcoming_count?: number;
}

export default function SitesPage() {
  const router = useRouter();

  const { data: sitesData, isLoading } = useQuery<{ data: Site[] }>({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites = sitesData?.data || [];

  const getStatusColor = (status: string, score: number) => {
    if (status === 'COMPLIANT' || score >= 85) return '#2E7D32'; // Green
    if (status === 'AT_RISK' || (score >= 70 && score < 85)) return '#D4A017'; // Yellow
    return '#C44536'; // Red
  };

  const getStatusText = (status: string, score: number) => {
    if (status === 'COMPLIANT' || score >= 85) return 'Compliant';
    if (status === 'AT_RISK' || (score >= 70 && score < 85)) return 'At Risk';
    return 'Non-Compliant';
  };

  const getStatusBadge = (status: string, score: number) => {
    const statusColor = getStatusColor(status, score);
    const statusText = getStatusText(status, score);

    return (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-sm font-medium text-gray-700">{statusText}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-white rounded-lg shadow animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#101314]">Sites</h1>
            <p className="text-gray-600 mt-2 text-lg">
              Manage your sites and view compliance status
            </p>
          </div>
          <Link href="/dashboard/sites/new">
            <Button
              size="lg"
              style={{ backgroundColor: '#104B3A' }}
              className="hover:opacity-90"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Site
            </Button>
          </Link>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sites yet</h3>
                <p className="text-gray-500 mb-6">
                  Get started by adding your first site to track compliance and generate audit packs.
                </p>
                <Link href="/dashboard/sites/new">
                  <Button
                    size="lg"
                    style={{ backgroundColor: '#104B3A' }}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Your First Site
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            sites.map((site) => {
              const statusColor = getStatusColor(site.compliance_status, site.compliance_score);
              const score = site.compliance_score || 0;

              return (
                <div
                  key={site.id}
                  className="
                    bg-white
                    rounded-lg
                    shadow-lg
                    hover:shadow-xl
                    transition-all
                    duration-200
                    overflow-hidden
                    cursor-pointer
                    border-l-4
                  "
                  style={{ borderLeftColor: statusColor }}
                  onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#101314] mb-2">
                          {site.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {site.city}, {site.postcode}
                        </div>
                      </div>
                      {getStatusBadge(site.compliance_status, score)}
                    </div>
                  </div>

                  {/* Compliance Score */}
                  <div className="p-6 bg-gray-50">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          Compliance Score
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-5xl font-bold"
                            style={{ color: statusColor }}
                          >
                            {score}
                          </span>
                          <span className="text-2xl font-medium text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Status</p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: statusColor }}
                        >
                          {getStatusText(site.compliance_status, score)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${score}%`,
                          backgroundColor: statusColor
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="p-6 grid grid-cols-2 gap-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Overdue</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#C44536]">
                          {site.overdue_count || 0}
                        </span>
                        <span className="text-sm text-gray-500">items</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Upcoming</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#D4A017]">
                          {site.upcoming_count || 0}
                        </span>
                        <span className="text-sm text-gray-500">items</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Modules */}
                  <div className="p-6 pt-0">
                    <p className="text-xs font-medium text-gray-500 mb-3">Active Modules</p>
                    <div className="flex flex-wrap gap-2">
                      {site.active_modules && site.active_modules.length > 0 ? (
                        site.active_modules.map((module) => (
                          <span
                            key={module}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                          >
                            {module.replace('MODULE_', 'Module ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No modules activated</span>
                      )}
                    </div>
                  </div>

                  {/* CTA Footer */}
                  <div className="p-6 pt-0">
                    <Button
                      className="w-full group"
                      style={{ backgroundColor: '#104B3A' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/sites/${site.id}/dashboard`);
                      }}
                    >
                      View Site Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        {sites.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-[#101314] mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-[#101314]">{sites.length}</p>
                <p className="text-sm text-gray-600">Total Sites</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-[#2E7D32]">
                  {sites.filter(s => s.compliance_score >= 85).length}
                </p>
                <p className="text-sm text-gray-600">Compliant</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-[#D4A017]">
                  {sites.filter(s => s.compliance_score >= 70 && s.compliance_score < 85).length}
                </p>
                <p className="text-sm text-gray-600">At Risk</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-[#C44536]">
                  {sites.filter(s => s.compliance_score < 70).length}
                </p>
                <p className="text-sm text-gray-600">Non-Compliant</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
