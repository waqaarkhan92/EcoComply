'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Link as LinkIcon, Unlink, Eye, Upload } from 'lucide-react';
import Link from 'next/link';

interface EvidenceItem {
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
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
}

export default function EvidencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const evidenceItems = evidenceData?.data || [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Evidence</h1>
          <p className="text-text-secondary mt-2">
            Manage and link evidence to obligations
          </p>
        </div>
        <Link href="/dashboard/evidence/upload">
          <Button variant="primary" size="md" icon={<Upload className="h-4 w-4" />} iconPosition="left">
            Upload Evidence
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-base p-6">
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
        <div className="text-center py-12 text-text-secondary">Loading evidence...</div>
      ) : evidenceItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <p className="text-text-secondary mb-4">No evidence items found</p>
          <Link href="/dashboard/evidence/upload">
            <Button variant="primary" size="md">
              Upload Your First Evidence
            </Button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {evidenceItems.map((item) => (
        <EvidenceCard 
          key={item.id} 
          item={item} 
          formatFileSize={formatFileSize} 
          isImage={isImage}
        />
      ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-input-border bg-background-tertiary">
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  item,
  formatFileSize,
  isImage,
}: {
  item: EvidenceItem;
  formatFileSize: (bytes: number) => string;
  isImage: (mimeType: string) => boolean;
}) {
  // Use file_url from API if available, otherwise use download endpoint
  const previewUrl = item.file_url || `/api/v1/evidence/${item.id}/download`;
  const downloadUrl = `/api/v1/evidence/${item.id}/download`;

  return (
    <div className="bg-white rounded-lg shadow-base overflow-hidden hover:shadow-md transition-shadow">
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
            <Download className="h-12 w-12 mx-auto" />
            <p className="text-xs mt-2">{item.file_type || item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
          </div>
        )}
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link href={`/dashboard/evidence/${item.id}`}>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <a href={downloadUrl} download>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <LinkIcon className="h-4 w-4" />
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
}: {
  item: EvidenceItem;
  formatFileSize: (bytes: number) => string;
  isImage: (mimeType: string) => boolean;
}) {
  const previewUrl = item.file_url || `/api/v1/evidence/${item.id}/download`;
  const downloadUrl = `/api/v1/evidence/${item.id}/download`;

  return (
    <tr className="border-b border-input-border/50 hover:bg-background-tertiary transition-colors">
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
            <Download className="h-6 w-6 text-text-tertiary" />
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
          {item.evidence_type ? item.evidence_type.toLowerCase().replace('_', ' ') : item.file_type.toLowerCase()}
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
            <Button variant="ghost" size="sm" title="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <a href={downloadUrl} download>
            <Button variant="ghost" size="sm" title="Download">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="ghost" size="sm" title="Link to Obligation">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
