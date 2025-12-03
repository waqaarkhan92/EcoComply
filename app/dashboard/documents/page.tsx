'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Search, Filter } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  site_id: string;
  document_type: string;
  status: string;
  extraction_status: string;
  created_at: string;
  obligation_count?: number;
}

interface DocumentsResponse {
  data: Document[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    document_type: '',
    status: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery<DocumentsResponse>({
    queryKey: ['documents', filters, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.document_type) params.append('document_type', filters.document_type);
      if (filters.status) params.append('status', filters.status);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<DocumentsResponse>(`/documents?${params.toString()}`);
    },
  });

  const documents = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Documents</h1>
          <p className="text-text-secondary mt-2">
            Manage your environmental compliance documents
          </p>
        </div>
        <Link href="/dashboard/documents/upload">
          <Button variant="primary">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Site
            </label>
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
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Document Type
            </label>
            <select
              value={filters.document_type}
              onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="PERMIT">Environmental Permit</option>
              <option value="CONSENT">Trade Effluent Consent</option>
              <option value="MCPD_REGISTRATION">MCPD Registration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading documents...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading documents. Please try again.
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No documents found</p>
            <Link href="/dashboard/documents/upload" className="mt-4 inline-block">
              <Button variant="primary">Upload Your First Document</Button>
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Document Name
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Type
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Extraction
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Obligations
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Uploaded
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-secondary">
                      {doc.document_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-4 px-6">
                      <ExtractionBadge status={doc.extraction_status} />
                    </td>
                    <td className="py-4 px-6 text-sm text-text-secondary">
                      {doc.obligation_count || 0}
                    </td>
                    <td className="py-4 px-6 text-sm text-text-secondary">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { label: 'Active', className: 'bg-success/20 text-success' },
    ARCHIVED: { label: 'Archived', className: 'bg-gray-100 text-gray-800' },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${badgeConfig.className}`}>
      {badgeConfig.label}
    </span>
  );
}

function ExtractionBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Pending', className: 'bg-warning/20 text-warning' },
    PROCESSING: { label: 'Processing', className: 'bg-primary/20 text-primary' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
    FAILED: { label: 'Failed', className: 'bg-danger/20 text-danger' },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${badgeConfig.className}`}>
      {badgeConfig.label}
    </span>
  );
}
