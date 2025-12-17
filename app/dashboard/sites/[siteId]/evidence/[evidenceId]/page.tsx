'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Link as LinkIcon, Eye, FileText } from 'lucide-react';
import Link from 'next/link';

interface Evidence {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  mime_type: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
  description?: string;
}

interface ChainOfCustodyEvent {
  id: string;
  event_type: string;
  event_timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  ip_address?: string;
  file_hash?: string;
  event_details?: any;
}

export default function EvidenceDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const evidenceId = params.evidenceId as string;
  const [activeTab, setActiveTab] = useState<'details' | 'linked-obligations' | 'chain-of-custody' | 'approval-history'>('details');

  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['evidence', evidenceId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Evidence }>(`/evidence/${evidenceId}`);
    },
  });

  const { data: chainOfCustodyData } = useQuery({
    queryKey: ['evidence-chain-of-custody', evidenceId],
    queryFn: async (): Promise<any> => {
      try {
        return apiClient.get<{ data: ChainOfCustodyEvent[] }>(`/evidence/${evidenceId}/chain-of-custody`);
      } catch (error) {
        return { data: [] };
      }
    },
    enabled: !!evidenceId && activeTab === 'chain-of-custody',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading evidence...</div>
      </div>
    );
  }

  if (!evidenceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Evidence not found</div>
      </div>
    );
  }

  const evidence = evidenceData.data;
  const chainOfCustody: any[] = chainOfCustodyData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/evidence`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Evidence Details</h1>
            <p className="text-gray-600 mt-1">{evidence.file_name}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {evidence.file_url && (
            <a href={evidence.file_url} download>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('linked-obligations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'linked-obligations'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LinkIcon className="inline mr-2 h-4 w-4" />
            Linked Obligations
          </button>
          <button
            onClick={() => setActiveTab('chain-of-custody')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chain-of-custody'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="inline mr-2 h-4 w-4" />
            Chain of Custody
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">File Name</label>
              <div className="mt-1 text-sm text-gray-900">{evidence.file_name}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">File Type</label>
              <div className="mt-1 text-sm text-gray-900">{evidence.file_type}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">File Size</label>
              <div className="mt-1 text-sm text-gray-900">
                {(evidence.file_size_bytes / 1024).toFixed(1)} KB
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Uploaded At</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(evidence.uploaded_at).toLocaleString()}
              </div>
            </div>
            {evidence.description && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <div className="mt-1 text-sm text-gray-900">{evidence.description}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'linked-obligations' && (
        <LinkedObligationsTab evidenceId={evidenceId} />
      )}

      {activeTab === 'chain-of-custody' && (
        <ChainOfCustodyTab evidenceId={evidenceId} events={chainOfCustody} />
      )}
    </div>
  );
}

// Linked Obligations Tab Component
function LinkedObligationsTab({ evidenceId }: { evidenceId: string }) {
  const { data: linksData, isLoading } = useQuery({
    queryKey: ['evidence-obligation-links', evidenceId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/evidence/${evidenceId}/obligations`);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">Loading linked obligations...</div>
      </div>
    );
  }

  const links: any[] = linksData?.data || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Linked Obligations</h3>
        <Button variant="outline" size="sm">
          <LinkIcon className="mr-2 h-4 w-4" />
          Link to Obligation
        </Button>
      </div>
      {links.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No obligations linked</div>
      ) : (
        <div className="space-y-4">
          {links.map((link: any) => (
            <div key={link.id} className="border rounded-lg p-4">
              <div className="font-medium">{link.obligation?.title || 'Unknown Obligation'}</div>
              <div className="text-sm text-gray-600 mt-1">
                Linked: {new Date(link.linked_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to generate CSV
function generateChainOfCustodyCSV(events: ChainOfCustodyEvent[]): string {
  const headers = ['Event Type', 'Timestamp', 'Actor Name', 'Actor Email', 'IP Address', 'File Hash'];
  const rows: string[][] = [headers];

  events.forEach((event) => {
    rows.push([
      event.event_type.replace(/_/g, ' '),
      new Date(event.event_timestamp).toISOString(),
      event.actor_name,
      event.actor_email || 'N/A',
      event.ip_address || 'N/A',
      event.file_hash ? event.file_hash.substring(0, 16) + '...' : 'N/A',
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Chain of Custody Tab Component
function ChainOfCustodyTab({ evidenceId, events }: { evidenceId: string; events: ChainOfCustodyEvent[] }) {
  const eventTypeIcons: Record<string, any> = {
    EVIDENCE_UPLOADED: '📤',
    EVIDENCE_LINKED: '🔗',
    EVIDENCE_UNLINKED: '🔓',
    EVIDENCE_ACCESSED: '👁️',
    EVIDENCE_DOWNLOADED: '⬇️',
    EVIDENCE_APPROVED: '✅',
    EVIDENCE_MODIFICATION_ATTEMPTED: '⚠️',
  };

  const eventTypeColors: Record<string, string> = {
    EVIDENCE_UPLOADED: 'bg-green-500',
    EVIDENCE_LINKED: 'bg-blue-500',
    EVIDENCE_UNLINKED: 'bg-amber-500',
    EVIDENCE_ACCESSED: 'bg-gray-500',
    EVIDENCE_DOWNLOADED: 'bg-blue-600',
    EVIDENCE_APPROVED: 'bg-green-600',
    EVIDENCE_MODIFICATION_ATTEMPTED: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Chain of Custody Summary</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export as PDF report
                  window.open(`/api/v1/evidence/${evidenceId}/chain-of-custody/export?format=pdf`, '_blank');
                }}
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export as CSV
                  const csv = generateChainOfCustodyCSV(events);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `chain-of-custody-${evidenceId}.csv`;
                  a.click();
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{events.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {new Set(events.map(e => e.actor_id)).size}
            </div>
            <div className="text-sm text-gray-600">Unique Actors</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {events.filter(e => e.event_type === 'EVIDENCE_ACCESSED').length}
            </div>
            <div className="text-sm text-gray-600">Access Events</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {events.filter(e => e.event_type === 'EVIDENCE_DOWNLOADED').length}
            </div>
            <div className="text-sm text-gray-600">Downloads</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Chain of Custody Timeline</h3>
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No chain of custody events yet</div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${eventTypeColors[event.event_type] || 'bg-gray-500'}`}></div>
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {event.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {event.actor_name} {event.actor_email && `(${event.actor_email})`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(event.event_timestamp).toLocaleString()}
                        {event.ip_address && ` • IP: ${event.ip_address}`}
                      </div>
                      {event.file_hash && (
                        <div className="text-xs text-gray-500 mt-1 font-mono">
                          Hash: {event.file_hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

