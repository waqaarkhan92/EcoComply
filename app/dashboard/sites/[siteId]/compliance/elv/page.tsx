'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
} from 'lucide-react';
import Link from 'next/link';

interface ElvCondition {
  id: string;
  site_id: string;
  parameter_name: string;
  limit_value: number;
  unit: string;
  frequency: string;
  last_reading?: number;
  last_reading_date?: string;
  status: 'COMPLIANT' | 'WARNING' | 'BREACH' | 'PENDING';
  permit_reference?: string;
}

const statusConfig = {
  COMPLIANT: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  WARNING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
  BREACH: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
};

export default function SiteElvPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const { data: siteData } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as { name: string; [key: string]: unknown };
    },
    enabled: !!siteId,
  });

  const { data: elvData, isLoading } = useQuery({
    queryKey: ['site-elv-conditions', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/regulatory/elv/conditions?siteId=${siteId}`);
      return response as { data: ElvCondition[] };
    },
    enabled: !!siteId,
  });

  const conditions: any[] = elvData?.data || [];
  const breachCount = conditions.filter(c => c.status === 'BREACH').length;
  const warningCount = conditions.filter(c => c.status === 'WARNING').length;
  const compliantCount = conditions.filter(c => c.status === 'COMPLIANT').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: siteData?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'ELV Conditions' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">ELV Conditions</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Emission Limit Value monitoring and compliance
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/compliance/elv/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Gauge className="h-5 w-5" />
            <span className="text-sm">Total Conditions</span>
          </div>
          <p className="text-2xl font-bold">{conditions.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Compliant</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{compliantCount}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{warningCount}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Breaches</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{breachCount}</p>
        </div>
      </div>

      {/* Conditions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : conditions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ELV conditions found</h3>
          <p className="text-gray-500 mb-4">
            Add emission limit conditions from your permit.
          </p>
          <Link href={`/dashboard/sites/${siteId}/compliance/elv/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Reading</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conditions.map((condition) => {
                const StatusIcon = statusConfig[condition.status as keyof typeof statusConfig]?.icon || Clock;
                return (
                  <tr key={condition.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{condition.parameter_name}</p>
                      {condition.permit_reference && (
                        <p className="text-sm text-gray-500">{condition.permit_reference}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {condition.limit_value} {condition.unit}
                    </td>
                    <td className="px-6 py-4">
                      {condition.last_reading ? (
                        <div>
                          <p className="font-medium">{condition.last_reading} {condition.unit}</p>
                          <p className="text-sm text-gray-500">
                            {condition.last_reading_date && new Date(condition.last_reading_date).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">No readings</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{condition.frequency}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${statusConfig[condition.status as keyof typeof statusConfig]?.bg} ${statusConfig[condition.status as keyof typeof statusConfig]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {condition.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
