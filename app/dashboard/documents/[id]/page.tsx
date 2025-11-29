'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  site_id: string;
  document_type: string;
  status: string;
  extraction_status: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

interface Obligation {
  id: string;
  obligation_title: string;
  original_text: string;
  category: string;
  status: string;
  confidence_score: number;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: document, isLoading: docLoading } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await apiClient.get<Document>(`/documents/${id}`);
      return response.data;
    },
  });

  const { data: obligations, isLoading: obligationsLoading } = useQuery<Obligation[]>({
    queryKey: ['document-obligations', id],
    queryFn: async () => {
      // TODO: Create endpoint to get obligations for a document
      // For now, return empty array
      return [];
    },
    enabled: !!document,
  });

  if (docLoading) {
    return (
      <div className="text-center py-12 text-text-secondary">Loading document...</div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Document not found</p>
        <Link href="/dashboard/documents">
          <Button variant="outline" className="mt-4">
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/documents"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            ← Back to Documents
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">{document.title}</h1>
          <p className="text-text-secondary mt-2">
            {document.document_type.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-extract
          </Button>
          <Button variant="danger" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Document Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Document Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-text-secondary">Status</p>
            <p className="mt-1">
              <StatusBadge status={document.status} />
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Extraction Status</p>
            <p className="mt-1">
              <ExtractionBadge status={document.extraction_status} />
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">File Size</p>
            <p className="mt-1 text-text-primary">
              {(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Uploaded</p>
            <p className="mt-1 text-text-primary">
              {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Obligations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Extracted Obligations
        </h2>
        {obligationsLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading obligations...</div>
        ) : obligations && obligations.length > 0 ? (
          <div className="space-y-4">
            {obligations.map((obligation) => (
              <div
                key={obligation.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/obligations/${obligation.id}`}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      {obligation.obligation_title || 'Untitled Obligation'}
                    </Link>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                      {obligation.original_text.substring(0, 200)}...
                    </p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs text-text-tertiary">
                        Category: {obligation.category}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        Confidence: {(obligation.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={obligation.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">
              {document.extraction_status === 'PENDING' || document.extraction_status === 'PROCESSING'
                ? 'Obligations are being extracted...'
                : 'No obligations extracted yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { label: 'Active', className: 'bg-success/20 text-success' },
    ARCHIVED: { label: 'Archived', className: 'bg-gray-100 text-gray-800' },
    PENDING: { label: 'Pending', className: 'bg-warning/20 text-warning' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
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

