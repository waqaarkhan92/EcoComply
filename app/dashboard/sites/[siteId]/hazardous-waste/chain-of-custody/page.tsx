'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  Link2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  Building2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface ChainOfCustodyRecord {
  id: string;
  consignment_id: string;
  consignment_number: string;
  waste_description: string;
  ewc_code: string;
  events: CustodyEvent[];
  chain_status: 'COMPLETE' | 'INCOMPLETE' | 'BROKEN';
  created_at: string;
}

interface CustodyEvent {
  id: string;
  event_type: 'CREATED' | 'COLLECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'PROCESSED';
  timestamp: string;
  location?: string;
  party_name: string;
  party_licence?: string;
  notes?: string;
}

const chainStatusConfig = {
  COMPLETE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Complete' },
  INCOMPLETE: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Incomplete' },
  BROKEN: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Broken Chain' },
};

export default function ChainOfCustodyPage() {
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

  const { data: chainData, isLoading } = useQuery({
    queryKey: ['chain-of-custody', siteId, statusFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('siteId', siteId);
      if (statusFilter !== 'all') {
        queryParams.append('chainStatus', statusFilter);
      }
      const response = await apiClient.get(`/module-4/chain-of-custody?${queryParams.toString()}`);
      return response as { data: ChainOfCustodyRecord[] };
    },
    enabled: !!siteId,
  });

  const records: any[] = chainData?.data || [];
  const completeCount = records.filter(r => r.chain_status === 'COMPLETE').length;
  const brokenCount = records.filter(r => r.chain_status === 'BROKEN').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: siteData?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'Chain of Custody' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">Chain of Custody</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Track waste transfer chain from producer to final destination
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm">Total Records</span>
          </div>
          <p className="text-2xl font-bold">{records.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Complete Chains</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{completeCount}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm">Incomplete</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">
            {records.filter(r => r.chain_status === 'INCOMPLETE').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Broken Chains</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{brokenCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'COMPLETE', 'INCOMPLETE', 'BROKEN'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : chainStatusConfig[status as keyof typeof chainStatusConfig]?.label || status}
          </Button>
        ))}
      </div>

      {/* Chain Records List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chain of custody records</h3>
          <p className="text-gray-500 mb-4">
            Chain of custody records are created automatically when consignments are processed.
          </p>
          <Link href={`/dashboard/sites/${siteId}/hazardous-waste/consignments`}>
            <Button variant="outline">
              View Consignments
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const StatusIcon = chainStatusConfig[record.chain_status as keyof typeof chainStatusConfig]?.icon || Clock;
            return (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${chainStatusConfig[record.chain_status as keyof typeof chainStatusConfig]?.bg} ${chainStatusConfig[record.chain_status as keyof typeof chainStatusConfig]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {chainStatusConfig[record.chain_status as keyof typeof chainStatusConfig]?.label}
                      </Badge>
                      <span className="font-mono text-sm text-gray-500">
                        {record.consignment_number}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{record.waste_description}</h3>
                    <p className="text-sm text-gray-600">EWC: {record.ewc_code}</p>
                  </div>
                  <Link href={`/dashboard/sites/${siteId}/hazardous-waste/consignments/${record.consignment_id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </div>

                {/* Chain Timeline */}
                {record.events && record.events.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Transfer Chain</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {record.events.map((event: CustodyEvent, index: number) => (
                        <div key={event.id} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                            <Building2 className="h-3 w-3" />
                            <span>{event.party_name}</span>
                          </div>
                          {index < record.events.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
