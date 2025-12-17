'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Search, Plus, Filter, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EndPointProof {
  id: string;
  consignment_note_id: string;
  end_point_type: 'DESTRUCTION' | 'RECYCLING' | 'RECOVERY' | 'DISPOSAL';
  end_point_facility: string;
  completion_date: string;
  certificate_reference: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EndPointProofsResponse {
  data: EndPointProof[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function EndPointProofsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    consignment_note_id: '',
    end_point_type: '',
    is_verified: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-4-end-point-proofs', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.consignment_note_id) params.append('consignment_note_id', filters.consignment_note_id);
      if (filters.end_point_type) params.append('end_point_type', filters.end_point_type);
      if (filters.is_verified !== undefined) params.append('is_verified', filters.is_verified);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<EndPointProofsResponse>(`/module-4/end-point-proofs?${params.toString()}`);
    },
  });

  const proofs: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const verifiedCount = proofs.filter((p) => p.is_verified).length;
  const unverifiedCount = proofs.filter((p) => !p.is_verified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">End-Point Proofs</h1>
          <p className="text-text-secondary mt-2">
            Track end-point proofs for waste disposal, recycling, and recovery
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-4/end-point-proofs/new">
            <Plus className="w-4 h-4 mr-2" />
            New End-Point Proof
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Verified</p>
              <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Unverified</p>
              <p className="text-2xl font-bold text-amber-600">{unverifiedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search end-point proofs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">End-Point Type</label>
            <select
              value={filters.end_point_type}
              onChange={(e) => setFilters({ ...filters, end_point_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="DESTRUCTION">Destruction</option>
              <option value="RECYCLING">Recycling</option>
              <option value="RECOVERY">Recovery</option>
              <option value="DISPOSAL">Disposal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Verification Status</label>
            <select
              value={filters.is_verified}
              onChange={(e) => setFilters({ ...filters, is_verified: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
              {/* TODO: Fetch sites from API */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Consignment Note</label>
            <input
              type="text"
              placeholder="Filter by consignment note ID..."
              value={filters.consignment_note_id}
              onChange={(e) => setFilters({ ...filters, consignment_note_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* End-Point Proofs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading end-point proofs...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading end-point proofs. Please try again.
          </div>
        ) : proofs.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No end-point proofs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      End-Point Facility
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Completion Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Certificate
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {proofs.map((proof, index) => (
                    <tr
                      key={proof.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/module-4/end-point-proofs/${proof.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {proof.end_point_facility}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {proof.end_point_type.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {new Date(proof.completion_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {proof.certificate_reference || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {proof.is_verified ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Unverified
                          </span>
                        )}
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

