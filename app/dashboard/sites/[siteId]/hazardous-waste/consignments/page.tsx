'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  FileCheck,
  Plus,
  Truck,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface ConsignmentNote {
  id: string;
  site_id: string;
  consignment_number: string;
  waste_stream_id: string;
  waste_description: string;
  ewc_code: string;
  quantity: number;
  unit: string;
  carrier_name: string;
  carrier_licence: string;
  destination_name: string;
  destination_licence: string;
  collection_date: string;
  status: 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  created_at: string;
}

const statusConfig = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  IN_TRANSIT: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Truck },
  RECEIVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
};

export default function ConsignmentsPage() {
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

  const { data: consignmentsData, isLoading } = useQuery({
    queryKey: ['consignment-notes', siteId, statusFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('siteId', siteId);
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      const response = await apiClient.get(`/module-4/consignment-notes?${queryParams.toString()}`);
      return response as { data: ConsignmentNote[] };
    },
    enabled: !!siteId,
  });

  const consignments: any[] = consignmentsData?.data || [];
  const pendingCount = consignments.filter(c => c.status === 'PENDING' || c.status === 'DRAFT').length;
  const inTransitCount = consignments.filter(c => c.status === 'IN_TRANSIT').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: siteData?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'Consignments' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">Consignment Notes</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Track hazardous waste consignments and transfers
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/hazardous-waste/consignments/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Consignment
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileCheck className="h-5 w-5" />
            <span className="text-sm">Total Consignments</span>
          </div>
          <p className="text-2xl font-bold">{consignments.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Truck className="h-5 w-5" />
            <span className="text-sm">In Transit</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{inTransitCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Received</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {consignments.filter(c => c.status === 'RECEIVED').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'DRAFT', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Consignments List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : consignments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No consignments found</h3>
          <p className="text-gray-500 mb-4">
            Create consignment notes to track waste transfers.
          </p>
          <Link href={`/dashboard/sites/${siteId}/hazardous-waste/consignments/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Consignment
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {consignments.map((consignment) => {
            const StatusIcon = statusConfig[consignment.status as keyof typeof statusConfig]?.icon || Clock;
            return (
              <div
                key={consignment.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${statusConfig[consignment.status as keyof typeof statusConfig]?.bg} ${statusConfig[consignment.status as keyof typeof statusConfig]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {consignment.status.replace('_', ' ')}
                      </Badge>
                      <span className="font-mono text-sm text-gray-500">
                        {consignment.consignment_number}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{consignment.waste_description}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      EWC: {consignment.ewc_code} | {consignment.quantity} {consignment.unit}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(consignment.collection_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        {consignment.carrier_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {consignment.destination_name}
                      </span>
                    </div>
                  </div>
                  <Link href={`/dashboard/sites/${siteId}/hazardous-waste/consignments/${consignment.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
