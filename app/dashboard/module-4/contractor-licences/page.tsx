'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Shield, Search, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ContractorLicence {
  id: string;
  contractor_name: string;
  licence_number: string;
  licence_type: string;
  waste_types_allowed: string[];
  issued_date: string | null;
  expiry_date: string;
  is_valid: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ContractorLicencesResponse {
  data: ContractorLicence[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ContractorLicencesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    is_valid: '',
    licence_type: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<ContractorLicencesResponse>({
    queryKey: ['module-4-contractor-licences', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.is_valid) params.append('is_valid', filters.is_valid);
      if (filters.licence_type) params.append('licence_type', filters.licence_type);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ContractorLicencesResponse>(`/module-4/contractor-licences?${params.toString()}`);
    },
  });

  // Fetch expiring licences
  const { data: expiringData } = useQuery({
    queryKey: ['module-4-contractor-licences-expiring'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ licences: ContractorLicence[]; count: number }>('/module-4/contractor-licences/expiring?days_ahead=30');
    },
  });

  const licences = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;
  const expiringLicences = expiringData?.licences || [];

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Contractor Licences</h1>
          <p className="text-text-secondary mt-2">
            Manage contractor licences and track expiry dates
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-4/contractor-licences/new">
            <Plus className="w-4 h-4 mr-2" />
            New Licence
          </Link>
        </Button>
      </div>

      {/* Expiring Licences Alert */}
      {expiringLicences.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">
              {expiringLicences.length} Licence{expiringLicences.length !== 1 ? 's' : ''} Expiring Soon
            </h3>
          </div>
          <div className="space-y-2">
            {expiringLicences.slice(0, 5).map((licence: ContractorLicence) => {
              const daysUntil = getDaysUntilExpiry(licence.expiry_date);
              return (
                <div key={licence.id} className="text-sm text-amber-800">
                  <span className="font-medium">{licence.contractor_name}</span> - {licence.licence_number}
                  {' '}({daysUntil} days)
                </div>
              );
            })}
            {expiringLicences.length > 5 && (
              <div className="text-sm text-amber-700">
                +{expiringLicences.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search contractor licences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_valid}
              onChange={(e) => setFilters({ ...filters, is_valid: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Valid</option>
              <option value="false">Invalid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Licence Type</label>
            <input
              type="text"
              placeholder="Filter by licence type..."
              value={filters.licence_type}
              onChange={(e) => setFilters({ ...filters, licence_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Contractor Licences Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading contractor licences...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading contractor licences. Please try again.
          </div>
        ) : licences.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No contractor licences found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contractor
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Licence Number
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Expiry Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Days Remaining
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {licences.map((licence, index) => {
                    const daysUntil = getDaysUntilExpiry(licence.expiry_date);
                    return (
                      <tr
                        key={licence.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-4/contractor-licences/${licence.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {licence.contractor_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">{licence.licence_number}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{licence.licence_type}</div>
                        </td>
                        <td className="py-4 px-6">
                          {licence.is_valid ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            {new Date(licence.expiry_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`text-sm font-medium ${
                            daysUntil < 0
                              ? 'text-red-600'
                              : daysUntil <= 30
                              ? 'text-amber-600'
                              : 'text-gray-600'
                          }`}>
                            {daysUntil < 0
                              ? `${Math.abs(daysUntil)} days overdue`
                              : `${daysUntil} days`}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

