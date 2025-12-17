'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Link as LinkIcon, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';

interface UnlinkedEvidence {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  enforcement_status: 'PENDING_LINK' | 'UNLINKED_WARNING' | 'UNLINKED_CRITICAL' | 'UNLINKED_ARCHIVED' | 'LINKED';
  days_since_upload: number;
  suggested_obligations?: Array<{
    id: string;
    title: string;
    match_reason: string;
  }>;
}

export default function UnlinkedEvidencePage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();
  const { user, roles } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data: evidenceData, isLoading } = useQuery<{
    data: UnlinkedEvidence[];
    pagination: any;
  }>({
    queryKey: ['unlinked-evidence', siteId, statusFilter, searchQuery],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('site_id', siteId);
      if (statusFilter !== 'all') {
        params.append('filter[enforcement_status]', statusFilter);
      }
      if (searchQuery) {
        params.append('filter[file_name]', searchQuery);
      }
      return apiClient.get(`/evidence/unlinked?${params.toString()}`);
    },
  });

  const linkMutation = useMutation({
    mutationFn: async ({ evidenceId, obligationId }: { evidenceId: string; obligationId: string }) => {
      return apiClient.post(`/evidence/${evidenceId}/link`, { obligation_id: obligationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlinked-evidence', siteId] });
      setSelectedItems([]);
    },
  });

  const evidenceItems: any[] = evidenceData?.data || [];
  const isAdminOrOwner = roles?.includes('OWNER') || roles?.includes('ADMIN');

  const getEnforcementStatusBadge = (status: string, daysSinceUpload: number) => {
    if (status === 'PENDING_LINK' && daysSinceUpload < 7) {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">Within Grace Period</span>;
    }
    if (status === 'UNLINKED_WARNING') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800">Warning: Link Required</span>;
    }
    if (status === 'UNLINKED_CRITICAL') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">Critical: Link Required</span>;
    }
    if (status === 'UNLINKED_ARCHIVED') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-800">Archived: Requires Restoration</span>;
    }
    return null;
  };

  const getGracePeriodColor = (daysSinceUpload: number) => {
    if (daysSinceUpload < 7) return 'bg-green-500';
    if (daysSinceUpload < 14) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getDaysRemaining = (daysSinceUpload: number) => {
    if (daysSinceUpload < 7) return 7 - daysSinceUpload;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Unlinked Evidence</h1>
          <p className="text-text-secondary mt-2">
            Manage evidence items that haven't been linked to obligations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
            {evidenceItems.length} unlinked
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING_LINK">Within Grace Period</option>
              <option value="UNLINKED_WARNING">Warning (7-13 days)</option>
              <option value="UNLINKED_CRITICAL">Critical (14-29 days)</option>
              <option value="UNLINKED_ARCHIVED">Archived (30+ days)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evidence List */}
      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading unlinked evidence...</div>
      ) : evidenceItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <p className="text-text-secondary mb-4">All evidence is linked to obligations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evidenceItems.map((evidence) => {
            const daysRemaining = getDaysRemaining(evidence.days_since_upload);
            const isOverdue = evidence.days_since_upload >= 7;
            
            return (
              <div key={evidence.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-text-primary">{evidence.file_name}</h3>
                      {getEnforcementStatusBadge(evidence.enforcement_status, evidence.days_since_upload)}
                    </div>
                    
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>Uploaded: {new Date(evidence.uploaded_at).toLocaleDateString()} ({evidence.days_since_upload} days ago)</div>
                      <div>{evidence.file_type} • {(evidence.file_size_bytes / 1024).toFixed(1)} KB</div>
                    </div>

                    {/* Grace Period Countdown */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary">Grace Period</span>
                        {isOverdue ? (
                          <span className="text-red-600 font-medium">{evidence.days_since_upload - 7} days overdue</span>
                        ) : (
                          <span className="text-green-600 font-medium">{daysRemaining} days remaining</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getGracePeriodColor(evidence.days_since_upload)}`}
                          style={{ width: `${Math.min(100, (evidence.days_since_upload / 7) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Suggested Obligations */}
                    {evidence.suggested_obligations && evidence.suggested_obligations.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-900 mb-2">Suggested Obligations</div>
                        <div className="space-y-2">
                          {evidence.suggested_obligations.map((obligation: { id: string; title: string; match_reason: string }) => (
                            <div key={obligation.id} className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-800">{obligation.title}</div>
                                <div className="text-xs text-blue-600">{obligation.match_reason}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => linkMutation.mutate({ evidenceId: evidence.id, obligationId: obligation.id })}
                                disabled={linkMutation.isPending}
                              >
                                Link
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        // Open link modal
                      }}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link to Obligation
                    </Button>
                    {isAdminOrOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Open exemption modal
                        }}
                      >
                        Request Exemption
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

