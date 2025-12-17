'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileText,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

interface WasteStream {
  id: string;
  site_id: string;
  ewc_code: string;
  description: string;
  hazard_codes: string[];
  physical_form: string;
  container_type: string;
  storage_location?: string;
  annual_quantity_estimate?: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_consignment_date?: string;
  created_at: string;
}

const statusConfig = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle },
};

export default function WasteStreamsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: siteData } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as { name: string; [key: string]: unknown };
    },
    enabled: !!siteId,
  });

  const { data: streamsData, isLoading } = useQuery({
    queryKey: ['waste-streams', siteId, statusFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('siteId', siteId);
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      const response = await apiClient.get(`/module-4/waste-streams?${queryParams.toString()}`);
      return response as { data: WasteStream[] };
    },
    enabled: !!siteId,
  });

  const streams: any[] = streamsData?.data || [];
  const activeCount = streams.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: siteData?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'Waste Streams' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">Waste Streams</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Manage hazardous waste streams and EWC codes
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/hazardous-waste/waste-streams/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Waste Stream
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm">Total Streams</span>
          </div>
          <p className="text-2xl font-bold">{streams.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Scale className="h-5 w-5" />
            <span className="text-sm">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-gray-700">{streams.length - activeCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'ACTIVE', 'INACTIVE'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status}
          </Button>
        ))}
      </div>

      {/* Waste Streams List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : streams.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No waste streams found</h3>
          <p className="text-gray-500 mb-4">
            Add waste streams to track your hazardous waste.
          </p>
          <Link href={`/dashboard/sites/${siteId}/hazardous-waste/waste-streams/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Waste Stream
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EWC Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Physical Form</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hazard Codes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {streams.map((stream) => {
                const StatusIcon = statusConfig[stream.status as keyof typeof statusConfig]?.icon || CheckCircle;
                return (
                  <tr key={stream.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium">{stream.ewc_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{stream.description}</p>
                      {stream.storage_location && (
                        <p className="text-sm text-gray-500">Storage: {stream.storage_location}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{stream.physical_form}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {stream.hazard_codes?.map((code: string) => (
                          <Badge key={code} variant="default" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${statusConfig[stream.status as keyof typeof statusConfig]?.bg} ${statusConfig[stream.status as keyof typeof statusConfig]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {stream.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/sites/${siteId}/hazardous-waste/waste-streams/${stream.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
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
