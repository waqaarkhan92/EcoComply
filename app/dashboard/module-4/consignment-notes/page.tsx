'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Search, Plus, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ConsignmentNote {
  id: string;
  waste_stream_id: string;
  consignment_note_number: string;
  consignment_date: string;
  carrier_name: string;
  destination_site: string;
  waste_description: string;
  ewc_code: string;
  quantity_m3: number;
  validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'REQUIRES_REVIEW';
  pre_validation_status: 'NOT_VALIDATED' | 'VALIDATION_PENDING' | 'PASSED' | 'FAILED' | null;
  created_at: string;
  updated_at: string;
}

interface ConsignmentNotesResponse {
  data: ConsignmentNote[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

interface Site {
  id: string;
  name: string;
}

interface WasteStream {
  id: string;
  ewc_code: string;
  waste_description: string;
}

export default function ConsignmentNotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    waste_stream_id: '',
    validation_status: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-4-consignment-notes', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.waste_stream_id) params.append('waste_stream_id', filters.waste_stream_id);
      if (filters.validation_status) params.append('validation_status', filters.validation_status);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ConsignmentNotesResponse>(`/module-4/consignment-notes?${params.toString()}`);
    },
  });

  const { data: sitesData, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Site[] }>('/sites');
      return response;
    },
  });

  const { data: wasteStreamsData, isLoading: wasteStreamsLoading } = useQuery({
    queryKey: ['module-4-waste-streams'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: WasteStream[] }>('/module-4/waste-streams');
      return response;
    },
  });

  const consignmentNotes: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;
  const sites = sitesData?.data?.data || [];
  const wasteStreams = wasteStreamsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Consignment Notes</h1>
          <p className="text-text-secondary mt-2">
            Track hazardous waste consignment notes and chain of custody
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-4/consignment-notes/new">
            <Plus className="w-4 h-4 mr-2" />
            New Consignment Note
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search consignment notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sitesLoading}
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Validation Status</label>
            <select
              value={filters.validation_status}
              onChange={(e) => setFilters({ ...filters, validation_status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="VALIDATED">Validated</option>
              <option value="REJECTED">Rejected</option>
              <option value="REQUIRES_REVIEW">Requires Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Waste Stream</label>
            <select
              value={filters.waste_stream_id}
              onChange={(e) => setFilters({ ...filters, waste_stream_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={wasteStreamsLoading}
            >
              <option value="">All Waste Streams</option>
              {wasteStreams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.ewc_code} - {stream.waste_description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Consignment Notes Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading consignment notes...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading consignment notes. Please try again.
          </div>
        ) : consignmentNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No consignment notes found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Note Number
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Carrier
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Validation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {consignmentNotes.map((note, index) => (
                    <tr
                      key={note.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/module-4/consignment-notes/${note.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {note.consignment_note_number}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {new Date(note.consignment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">{note.carrier_name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">{note.destination_site}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">{note.quantity_m3} m³</div>
                      </td>
                      <td className="py-4 px-6">
                        <ValidationStatusBadge
                          validationStatus={note.validation_status}
                          preValidationStatus={note.pre_validation_status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => nextCursor && setCursor(nextCursor)}
                  disabled={!nextCursor}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ValidationStatusBadge({
  validationStatus,
  preValidationStatus,
}: {
  validationStatus: string;
  preValidationStatus: string | null;
}) {
  const config: Record<string, { label: string; className: string; icon: any }> = {
    VALIDATED: {
      label: 'Validated',
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: XCircle,
    },
    REQUIRES_REVIEW: {
      label: 'Review',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: AlertCircle,
    },
    PENDING: {
      label: 'Pending',
      className: 'bg-gray-50 text-gray-700 border border-gray-200',
      icon: Clock,
    },
  };

  const badgeConfig = config[validationStatus] || {
    label: validationStatus,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Clock,
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

