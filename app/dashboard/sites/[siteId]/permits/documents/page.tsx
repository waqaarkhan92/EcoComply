'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, FileText, Filter } from 'lucide-react';
import Link from 'next/link';

interface PermitDocument {
  id: string;
  title: string;
  document_type: string;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
  extraction_status?: string;
}

interface PermitDocumentsResponse {
  data: PermitDocument[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PermitDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: documentsData, isLoading, error } = useQuery<PermitDocumentsResponse>({
    queryKey: ['permit-documents', siteId, cursor, documentTypeFilter, statusFilter, searchQuery],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('filter[module_id]', '1'); // Module 1 = Permits
      if (documentTypeFilter !== 'all') {
        params.append('filter[document_type]', documentTypeFilter);
      }
      if (statusFilter !== 'all') {
        params.append('filter[status]', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<PermitDocumentsResponse>(`/documents?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const documents = documentsData?.data || [];
  const hasMore = documentsData?.pagination?.has_more || false;
  const nextCursor = documentsData?.pagination?.cursor;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
      REVIEW_REQUIRED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      EXTRACTION_FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading documents</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permit Documents</h1>
          <p className="text-gray-600 mt-1">Manage environmental permit documents for this site</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/documents/upload`}>
          <Button style={{ backgroundColor: '#026A67' }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="all">All Types</option>
            <option value="PERMIT">Permit</option>
            <option value="VARIATION">Variation</option>
            <option value="RENEWAL">Renewal</option>
            <option value="CONSENT">Consent</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="EXTRACTION_FAILED">Extraction Failed</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setDocumentTypeFilter('all');
              setStatusFilter('all');
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No permit documents found.</p>
                    <Link href={`/dashboard/sites/${siteId}/documents/upload`}>
                      <Button variant="outline" className="mt-4">
                        Upload Your First Document
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{document.title}</div>
                          {document.extraction_status && (
                            <div className="text-xs text-gray-500">
                              Extraction: {document.extraction_status}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(document.uploaded_at).toLocaleDateString()}</div>
                      <div className="text-xs">{document.uploaded_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/sites/${siteId}/documents/${document.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCursor(nextCursor)}
              disabled={!nextCursor}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

