'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { NoEvidenceState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Search, Download, Link as LinkIcon, Unlink, Eye, Upload, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface EvidenceItem {
  id: string;
  site_id: string;
  company_id: string;
  file_name: string;
  file_type: string;
  description?: string;
  compliance_period?: string;
  file_size_bytes: number;
  mime_type: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
}

interface Obligation {
  id: string;
  obligation_title: string;
  condition_reference?: string;
  site_id: string;
  sites?: { name: string };
}

export default function EvidencePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Evidence linking modal state
  const [linkingEvidence, setLinkingEvidence] = useState<EvidenceItem | null>(null);
  const [obligationSearch, setObligationSearch] = useState('');
  const [selectedObligation, setSelectedObligation] = useState<string | null>(null);

  // Fetch evidence items
  const { data: evidenceData, isLoading } = useQuery<{
    data: EvidenceItem[];
    pagination: any;
  }>({
    queryKey: ['evidence', searchQuery, selectedSite],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('filter[file_name]', searchQuery);
      if (selectedSite) params.append('filter[site_id]', selectedSite);

      const response = await apiClient.get<EvidenceItem[]>(`/evidence?${params.toString()}`);
      // apiClient.get returns {data: [...], pagination: {...}}, so return the whole response
      return response;
    },
  });

  const evidenceItems: any[] = evidenceData?.data || [];

  // Fetch obligations for linking (only when modal is open)
  const { data: obligationsData, isLoading: obligationsLoading } = useQuery<{
    data: Obligation[];
  }>({
    queryKey: ['obligations', obligationSearch, linkingEvidence?.site_id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (obligationSearch) params.append('filter[obligation_title]', obligationSearch);
      // Filter by same site as evidence for better UX
      if (linkingEvidence?.site_id) params.append('filter[site_id]', linkingEvidence.site_id);
      params.append('page_size', '20');

      const response = await apiClient.get<Obligation[]>(`/obligations?${params.toString()}`);
      return response;
    },
    enabled: !!linkingEvidence,
  });

  const obligations = obligationsData?.data || [];

  // Link evidence mutation
  const linkMutation = useMutation({
    mutationFn: async ({ evidenceId, obligationId }: { evidenceId: string; obligationId: string }) => {
      return apiClient.post(`/evidence/${evidenceId}/link`, { obligation_id: obligationId });
    },
    onSuccess: () => {
      toast.success('Evidence linked to obligation');
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      setLinkingEvidence(null);
      setSelectedObligation(null);
      setObligationSearch('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link evidence');
    },
  });

  const handleLinkEvidence = () => {
    if (linkingEvidence && selectedObligation) {
      linkMutation.mutate({ evidenceId: linkingEvidence.id, obligationId: selectedObligation });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Evidence' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <PageHeader
        title="Evidence"
        description="Manage and link evidence to obligations"
        actions={
          <Link href="/dashboard/evidence/upload">
            <Button variant="primary" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Evidence
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-base p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Evidence Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg shadow-base overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : evidenceItems.length === 0 ? (
        <div className="bg-card rounded-lg shadow-base overflow-hidden">
          <NoEvidenceState onUpload={() => router.push('/dashboard/evidence/upload')} />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {evidenceItems.map((item) => (
        <EvidenceCard
          key={item.id}
          item={item}
          formatFileSize={formatFileSize}
          isImage={isImage}
          onLink={() => setLinkingEvidence(item)}
        />
      ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Preview</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Size</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Uploaded</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {evidenceItems.map((item) => (
                <EvidenceRow
                  key={item.id}
                  item={item}
                  formatFileSize={formatFileSize}
                  isImage={isImage}
                  onLink={() => setLinkingEvidence(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Evidence Linking Modal */}
      <Modal
        isOpen={!!linkingEvidence}
        onClose={() => {
          setLinkingEvidence(null);
          setSelectedObligation(null);
          setObligationSearch('');
        }}
        title="Link Evidence to Obligation"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setLinkingEvidence(null);
                setSelectedObligation(null);
                setObligationSearch('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLinkEvidence}
              disabled={!selectedObligation || linkMutation.isPending}
            >
              {linkMutation.isPending ? 'Linking...' : 'Link Evidence'}
            </Button>
          </>
        }
      >
        {linkingEvidence && (
          <div className="space-y-4">
            {/* Evidence being linked */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Linking evidence:</p>
              <p className="font-medium text-text-primary">{linkingEvidence.file_name}</p>
            </div>

            {/* Search obligations */}
            <div>
              <label htmlFor="obligation-search" className="block text-sm font-medium text-text-secondary mb-2">
                Search obligations
              </label>
              <Input
                id="obligation-search"
                type="text"
                placeholder="Search by title..."
                value={obligationSearch}
                onChange={(e) => setObligationSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Obligations list */}
            <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
              {obligationsLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : obligations.length === 0 ? (
                <div className="p-8 text-center text-text-secondary">
                  No obligations found
                </div>
              ) : (
                <ul className="divide-y divide-border" role="listbox" aria-label="Select obligation">
                  {obligations.map((obligation) => (
                    <li key={obligation.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedObligation(obligation.id)}
                        className={`w-full p-4 text-left hover:bg-muted transition-colors flex items-center justify-between ${
                          selectedObligation === obligation.id ? 'bg-primary/10' : ''
                        }`}
                        role="option"
                        aria-selected={selectedObligation === obligation.id}
                      >
                        <div>
                          <p className="font-medium text-text-primary">{obligation.obligation_title}</p>
                          {obligation.condition_reference && (
                            <p className="text-sm text-text-secondary">
                              Ref: {obligation.condition_reference}
                            </p>
                          )}
                        </div>
                        {selectedObligation === obligation.id && (
                          <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EvidenceCard({
  item,
  formatFileSize,
  isImage,
  onLink,
}: {
  item: EvidenceItem;
  formatFileSize: (bytes: number) => string;
  isImage: (mimeType: string) => boolean;
  onLink: () => void;
}) {
  // Use file_url from API if available, otherwise use download endpoint
  const previewUrl = item.file_url || `/api/v1/evidence/${item.id}/download`;
  const downloadUrl = `/api/v1/evidence/${item.id}/download`;

  return (
    <div className="bg-card rounded-lg shadow-base overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview */}
      <div className="aspect-video bg-background-secondary flex items-center justify-center relative group">
        {isImage(item.mime_type) && item.file_url ? (
          <img
            src={previewUrl}
            alt={item.file_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-text-tertiary">
            <Download className="h-12 w-12 mx-auto" aria-hidden="true" />
            <p className="text-xs mt-2">{item.file_type || item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
          </div>
        )}
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link href={`/dashboard/evidence/${item.id}`}>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" aria-label="View details">
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <a href={downloadUrl} download>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" aria-label="Download file">
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={onLink} aria-label="Link to obligation">
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4">
        <h3 className="font-semibold text-text-primary mb-1 truncate">{item.file_name}</h3>
        {item.description && (
          <p className="text-sm text-text-secondary mb-2 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>{formatFileSize(item.file_size_bytes)}</span>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({
  item,
  formatFileSize,
  isImage,
  onLink,
}: {
  item: EvidenceItem;
  formatFileSize: (bytes: number) => string;
  isImage: (mimeType: string) => boolean;
  onLink: () => void;
}) {
  const previewUrl = item.file_url || `/api/v1/evidence/${item.id}/download`;
  const downloadUrl = `/api/v1/evidence/${item.id}/download`;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <div className="w-16 h-16 bg-background-secondary rounded flex items-center justify-center">
          {isImage(item.mime_type) && item.file_url ? (
            <img
              src={previewUrl}
              alt={item.file_name}
              className="w-full h-full object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Download className="h-6 w-6 text-text-tertiary" aria-hidden="true" />
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-text-primary">{item.file_name}</p>
          {item.description && (
            <p className="text-sm text-text-secondary line-clamp-1">{item.description}</p>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-text-secondary capitalize">
          {item.file_type.toLowerCase()}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary">
        {formatFileSize(item.file_size_bytes)}
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary">
        {new Date(item.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/evidence/${item.id}`}>
            <Button variant="ghost" size="sm" title="View" aria-label="View details">
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <a href={downloadUrl} download>
            <Button variant="ghost" size="sm" title="Download" aria-label="Download file">
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
          <Button variant="ghost" size="sm" title="Link to Obligation" onClick={onLink} aria-label="Link to obligation">
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
