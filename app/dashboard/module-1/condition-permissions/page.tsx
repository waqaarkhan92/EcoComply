'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Shield, Edit, X, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ConditionPermission {
  id: string;
  user_id: string;
  document_id: string;
  condition_reference: string;
  permission_type: 'VIEW' | 'EDIT' | 'MANAGE' | 'FULL';
  is_active: boolean;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  users: { id: string; email: string; full_name: string | null };
  documents: { id: string; document_name: string };
  created_at: string;
}

interface ConditionPermissionsResponse {
  data: ConditionPermission[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const permissionTypeColors: Record<string, { bg: string; text: string }> = {
  VIEW: { bg: 'bg-blue-50', text: 'text-blue-700' },
  EDIT: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  MANAGE: { bg: 'bg-orange-50', text: 'text-orange-700' },
  FULL: { bg: 'bg-green-50', text: 'text-green-700' },
};

export default function ConditionPermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    document_id: '',
    condition_reference: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<ConditionPermissionsResponse>({
    queryKey: ['condition-permissions', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.condition_reference) params.append('condition_reference', filters.condition_reference);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ConditionPermissionsResponse>(`/module-1/condition-permissions?${params.toString()}`);
    },
  });

  const permissions = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      return apiClient.put(`/module-1/condition-permissions/${permissionId}`, { is_active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condition-permissions'] });
    },
  });

  const filteredPermissions = permissions.filter((permission) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      permission.users.email.toLowerCase().includes(query) ||
      permission.documents.document_name.toLowerCase().includes(query) ||
      permission.condition_reference.toLowerCase().includes(query) ||
      permission.permission_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Condition Permissions</h1>
          <p className="text-text-secondary mt-2">
            Manage condition-level permissions for users
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/condition-permissions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Permission
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
              placeholder="Search by user, document, condition reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Document</label>
            <input
              type="text"
              placeholder="Document ID"
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Condition Reference</label>
            <input
              type="text"
              placeholder="e.g., Condition 2.3"
              value={filters.condition_reference}
              onChange={(e) => setFilters({ ...filters, condition_reference: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading condition permissions...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading condition permissions. Please try again.
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No condition permissions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Permission Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Granted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPermissions.map((permission, index) => {
                    const typeStyle = permissionTypeColors[permission.permission_type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

                    return (
                      <tr
                        key={permission.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/condition-permissions/${permission.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {permission.users.full_name || permission.users.email}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{permission.documents.document_name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 font-mono">{permission.condition_reference}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {permission.permission_type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {permission.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700">
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(permission.granted_at).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

