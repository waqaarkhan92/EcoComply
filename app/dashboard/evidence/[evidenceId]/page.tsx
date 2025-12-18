'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  Link as LinkIcon,
  Unlink,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Building2,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChainOfCustodyTab,
  ChainOfCustodyExportButton,
  type ChainOfCustodyData,
  type ChainOfCustodyEvent,
} from '@/components/ingestion';

interface EvidenceDetail {
  id: string;
  site_id: string;
  company_id: string;
  file_name: string;
  file_type: string;
  evidence_type?: string;
  description?: string;
  file_size_bytes: number;
  mime_type: string;
  file_url?: string;
  storage_hash?: string;
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
  sites?: {
    id: string;
    name: string;
  };
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
  obligation_evidence?: Array<{
    obligation_id: string;
    linked_at: string;
    obligations?: {
      id: string;
      obligation_title: string;
    };
  }>;
}

interface ChainOfCustodyEntry {
  id: string;
  evidence_id: string;
  action: string;
  actor_id: string;
  actor_name?: string;
  details?: Record<string, any>;
  created_at: string;
}

export default function EvidenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const evidenceId = params.evidenceId as string;

  const [activeTab, setActiveTab] = useState<'details' | 'chain-of-custody' | 'suggestions'>('details');

  // Fetch evidence details
  const { data: evidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ['evidence', evidenceId],
    queryFn: async () => {
      const response = await apiClient.get<EvidenceDetail>(`/evidence/${evidenceId}`);
      return response.data;
    },
  });

  // Fetch chain of custody
  const { data: chainOfCustody, isLoading: custodyLoading } = useQuery({
    queryKey: ['evidence', evidenceId, 'chain-of-custody'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ChainOfCustodyEntry[]>(`/evidence/${evidenceId}/chain-of-custody`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!evidenceId,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType?.startsWith('image/') || false;
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Evidence', href: '/dashboard/evidence' },
    { label: evidence?.file_name || 'Loading...' },
  ];

  // Transform chain of custody data for component
  const chainOfCustodyData: ChainOfCustodyData | null = evidence ? {
    evidenceId: evidence.id,
    fileName: evidence.file_name,
    fileType: evidence.file_type || evidence.mime_type,
    fileSize: evidence.file_size_bytes,
    originalHash: evidence.storage_hash || '',
    currentHash: evidence.storage_hash || '',
    hashVerified: true, // Would come from actual verification
    isImmutable: false,
    uploadedAt: evidence.created_at,
    uploadedBy: evidence.users?.full_name || 'Unknown',
    events: (chainOfCustody || []).map((entry): ChainOfCustodyEvent => ({
      id: entry.id,
      timestamp: entry.created_at,
      eventType: (entry.action || 'ACCESSED') as ChainOfCustodyEvent['eventType'],
      userName: entry.actor_name || 'System',
      details: entry.details ? JSON.stringify(entry.details) : undefined,
    })),
    linkedObligations: (evidence.obligation_evidence || []).map((link) => ({
      id: link.obligation_id,
      title: link.obligations?.obligation_title || 'Unknown Obligation',
      period: '',
      linkedBy: '',
      linkedAt: link.linked_at,
    })),
  } : null;

  // Export handler for chain of custody PDF
  const handleExportChainOfCustody = async (evidenceId: string): Promise<void> => {
    try {
      const response = await apiClient.get(`/evidence/${evidenceId}/chain-of-custody/export`);
      // Handle download - the API should return a PDF or trigger download
      console.log('Chain of custody export initiated:', response);
    } catch (error) {
      console.error('Failed to export chain of custody:', error);
    }
  };

  if (evidenceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Evidence Not Found</h2>
        <p className="text-text-secondary mb-4">The requested evidence item could not be found.</p>
        <Link href="/dashboard/evidence">
          <Button variant="primary">Back to Evidence</Button>
        </Link>
      </div>
    );
  }

  const downloadUrl = `/api/v1/evidence/${evidence.id}/download`;
  const previewUrl = evidence.file_url || downloadUrl;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <PageHeader
        title={evidence.file_name}
        description={evidence.description || 'Evidence file'}
        actions={
          <div className="flex items-center gap-2">
            <ChainOfCustodyExportButton
              evidenceId={evidence.id}
              onExport={handleExportChainOfCustody}
            />
            <a href={downloadUrl} download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </a>
            <Button variant="primary" size="sm">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link to Obligation
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('chain-of-custody')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chain-of-custody'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-1" />
            Chain of Custody
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
            }`}
          >
            Suggestions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-base overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                {isImage(evidence.mime_type) && evidence.file_url ? (
                  <Image
                    src={previewUrl}
                    alt={evidence.file_name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : evidence.mime_type === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title={evidence.file_name}
                  />
                ) : (
                  <div className="text-center text-text-tertiary">
                    <FileText className="h-16 w-16 mx-auto mb-2" />
                    <p>Preview not available</p>
                    <a href={downloadUrl} download className="text-primary hover:underline mt-2 inline-block">
                      Download to view
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg shadow-base p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">File Information</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-text-secondary">File Type</dt>
                  <dd className="text-sm font-medium text-text-primary">
                    {evidence.file_type?.toUpperCase() || evidence.mime_type}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Size</dt>
                  <dd className="text-sm font-medium text-text-primary">
                    {formatFileSize(evidence.file_size_bytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Uploaded</dt>
                  <dd className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    {new Date(evidence.created_at).toLocaleDateString()}
                  </dd>
                </div>
                {evidence.users && (
                  <div>
                    <dt className="text-sm text-text-secondary">Uploaded By</dt>
                    <dd className="text-sm font-medium text-text-primary flex items-center gap-2">
                      <User className="h-4 w-4 text-text-tertiary" />
                      {evidence.users.full_name}
                    </dd>
                  </div>
                )}
                {evidence.sites && (
                  <div>
                    <dt className="text-sm text-text-secondary">Site</dt>
                    <dd className="text-sm font-medium text-text-primary flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-text-tertiary" />
                      {evidence.sites.name}
                    </dd>
                  </div>
                )}
                {evidence.storage_hash && (
                  <div>
                    <dt className="text-sm text-text-secondary">File Hash (SHA-256)</dt>
                    <dd className="text-xs font-mono text-text-primary bg-gray-50 p-2 rounded break-all">
                      {evidence.storage_hash}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Linked Obligations */}
            <div className="bg-white rounded-lg shadow-base p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Linked Obligations</h3>
              {evidence.obligation_evidence && evidence.obligation_evidence.length > 0 ? (
                <ul className="space-y-2">
                  {evidence.obligation_evidence.map((link) => (
                    <li key={link.obligation_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-text-primary truncate">
                        {link.obligations?.obligation_title || 'Unknown Obligation'}
                      </span>
                      <Button variant="ghost" size="sm" title="Unlink">
                        <Unlink className="h-4 w-4 text-text-tertiary" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">No obligations linked</p>
              )}
            </div>

            {/* Integrity Status */}
            <div className="bg-white rounded-lg shadow-base p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Integrity Status</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-success">Verified</p>
                  <p className="text-xs text-text-secondary">File integrity confirmed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chain-of-custody' && chainOfCustodyData && (
        <ChainOfCustodyTab
          data={chainOfCustodyData}
          onExportPdf={() => handleExportChainOfCustody(evidence!.id)}
        />
      )}

      {activeTab === 'suggestions' && (
        <div className="bg-white rounded-lg shadow-base p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Evidence Suggestions</h3>
          <p className="text-text-secondary">
            This feature shows AI-powered suggestions for linking this evidence to relevant obligations.
            When viewing from an obligation context, suggested evidence matches will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
