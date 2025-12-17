'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Shield, Search, Plus, Filter, Trash2, Edit, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

interface ValidationRule {
  id: string;
  waste_stream_id: string | null;
  rule_type: 'CARRIER_LICENCE' | 'VOLUME_LIMIT' | 'STORAGE_DURATION' | 'EWC_CODE' | 'DESTINATION' | 'CUSTOM';
  rule_name: string;
  rule_description: string | null;
  rule_config: any;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ValidationRulesResponse {
  data: ValidationRule[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ValidationRulesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    waste_stream_id: '',
    rule_type: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-4-validation-rules', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.waste_stream_id) params.append('waste_stream_id', filters.waste_stream_id);
      if (filters.rule_type) params.append('rule_type', filters.rule_type);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ValidationRulesResponse>(`/module-4/validation-rules?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiClient.delete(`/module-4/validation-rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-4-validation-rules'] });
    },
  });

  const rules: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const activeRules = rules.filter((r) => r.is_active).length;
  const errorRules = rules.filter((r) => r.severity === 'ERROR').length;
  const warningRules = rules.filter((r) => r.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Validation Rules</h1>
          <p className="text-text-secondary mt-2">
            Manage custom validation rules for consignment notes
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-4/validation-rules/new">
            <Plus className="w-4 h-4 mr-2" />
            New Validation Rule
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Active Rules</p>
              <p className="text-2xl font-bold text-green-600">{activeRules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Error Rules</p>
              <p className="text-2xl font-bold text-red-600">{errorRules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Warning Rules</p>
              <p className="text-2xl font-bold text-amber-600">{warningRules}</p>
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
              placeholder="Search validation rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Rule Type</label>
            <select
              value={filters.rule_type}
              onChange={(e) => setFilters({ ...filters, rule_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="CARRIER_LICENCE">Carrier Licence</option>
              <option value="VOLUME_LIMIT">Volume Limit</option>
              <option value="STORAGE_DURATION">Storage Duration</option>
              <option value="EWC_CODE">EWC Code</option>
              <option value="DESTINATION">Destination</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Waste Stream</label>
            <input
              type="text"
              placeholder="Filter by waste stream ID..."
              value={filters.waste_stream_id}
              onChange={(e) => setFilters({ ...filters, waste_stream_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Validation Rules Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading validation rules...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading validation rules. Please try again.
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No validation rules found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Severity
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {rules.map((rule, index) => (
                    <tr
                      key={rule.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/module-4/validation-rules/${rule.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {rule.rule_name}
                        </Link>
                        {rule.rule_description && (
                          <div className="text-xs text-gray-500 mt-1">{rule.rule_description}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {rule.rule_type.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <SeverityBadge severity={rule.severity} />
                      </td>
                      <td className="py-4 px-6">
                        {rule.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/module-4/validation-rules/${rule.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this validation rule?')) {
                                deleteMutation.mutate(rule.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    ERROR: {
      label: 'Error',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: AlertCircle,
    },
    WARNING: {
      label: 'Warning',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: AlertTriangle,
    },
    INFO: {
      label: 'Info',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: Info,
    },
  };

  const badgeConfig = config[severity as keyof typeof config] || {
    label: severity,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Info,
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

