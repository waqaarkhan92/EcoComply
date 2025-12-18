'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ClipboardList, Link as LinkIcon, Unlink, Edit, X, Download, FileText, BookOpen, Calendar, Clock, Activity, Settings, Wrench, CheckCircle2, AlertCircle, XCircle, GitCompare, History, Sparkles, DollarSign } from 'lucide-react';
import Link from 'next/link';
import {
  DiffViewer,
  AuditTimeline,
  AIEvidenceAnalyzer,
  ObligationCostList,
} from '@/components/enhanced-features';
import { Modal } from '@/components/ui/modal';
import { CommentThread } from '@/components/comments/comment-thread';

interface Obligation {
  id: string;
  obligation_title: string;
  original_text: string;
  obligation_description: string | null;
  category: string;
  status: string;
  confidence_score: number;
  deadline_date: string | null;
  frequency: string | null;
  document_id: string;
  site_id: string;
  condition_reference?: string | null;
  page_reference?: number | null;
  evidence_count?: number;
}

interface Evidence {
  id: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

interface Deadline {
  id: string;
  due_date: string;
  status: string;
}

export default function ObligationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showLinkEvidence, setShowLinkEvidence] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'ai' | 'costs' | 'versions'>('details');

  const { data: obligation, isLoading: obligationLoading } = useQuery({
    queryKey: ['obligation', id],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Obligation>(`/obligations/${id}`);
      return response.data;
    },
  });

  const { data: evidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ['obligation-evidence', id],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get<Evidence[]>(`/obligations/${id}/evidence`);
        return response.data || [];
      } catch (error: any) {
        // Evidence endpoint might not exist yet or return 404 - return empty array
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!obligation,
    retry: false, // Don't retry on 404
  });

  const { data: deadlines } = useQuery({
    queryKey: ['obligation-deadlines', id],
    queryFn: async (): Promise<any> => {
      // TODO: Create endpoint to get deadlines for an obligation
      return [];
    },
    enabled: !!obligation,
  });

  const markNaMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/obligations/${id}/mark-na`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligation', id] });
      queryClient.invalidateQueries({ queryKey: ['obligations'] });
    },
  });

  const unlinkEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return apiClient.delete(`/obligations/${id}/evidence/${evidenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligation-evidence', id] });
    },
  });

  const handleDownloadEvidence = (evidenceId: string) => {
    window.open(`/api/v1/evidence/${evidenceId}/download`, '_blank');
  };

  const handleUnlinkEvidence = (evidenceId: string) => {
    if (window.confirm('Are you sure you want to unlink this evidence from this obligation?')) {
      unlinkEvidenceMutation.mutate(evidenceId);
    }
  };

  const getDaysUntilDeadline = (deadlineDate: string | null): number | null => {
    if (!deadlineDate) return null;
    const today = new Date();
    const deadline = new Date(deadlineDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (obligationLoading) {
    return (
      <div className="text-center py-12 text-text-secondary">Loading obligation...</div>
    );
  }

  if (!obligation) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Obligation not found</p>
        <Link href="/dashboard/obligations">
          <Button variant="outline" className="mt-4">
            Back to Obligations
          </Button>
        </Link>
      </div>
    );
  }

  const daysUntil = getDaysUntilDeadline(obligation.deadline_date);
  const effectiveStatus =
    obligation.status === 'COMPLETED' || obligation.status === 'NOT_APPLICABLE'
      ? obligation.status
      : !obligation.deadline_date
      ? 'PENDING'
      : daysUntil !== null && daysUntil < 0
      ? 'OVERDUE'
      : daysUntil !== null && daysUntil <= 7
      ? 'DUE_SOON'
      : 'PENDING';

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sites', href: '/dashboard/sites' },
    { label: 'Obligations', href: obligation.site_id ? `/dashboard/sites/${obligation.site_id}/permits/obligations` : '/dashboard/sites' },
    { label: obligation.obligation_title || 'Obligation Details' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {obligation.obligation_title || 'Obligation Details'}
          </h1>
          <p className="text-text-secondary mt-1">
            {obligation.category.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/sites/${obligation.site_id}/permits/obligations/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {obligation.status !== 'NOT_APPLICABLE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markNaMutation.mutate()}
              disabled={markNaMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Mark N/A
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg shadow-md">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'details' as const, label: 'Details', icon: FileText },
            { id: 'timeline' as const, label: 'Timeline', icon: History },
            { id: 'ai' as const, label: 'AI Suggestions', icon: Sparkles },
            { id: 'costs' as const, label: 'Costs', icon: DollarSign },
            { id: 'versions' as const, label: 'Version History', icon: GitCompare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <>
      {/* Obligation Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Obligation Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            <StatusBadge status={effectiveStatus} />
          </div>

          {/* Category */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Category</p>
            <CategoryBadge category={obligation.category} />
          </div>

          {/* Confidence Score */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Confidence Score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${obligation.confidence_score * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-text-primary min-w-[3rem]">
                {(obligation.confidence_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Deadline */}
          {obligation.deadline_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Deadline</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-text-primary font-medium">
                    {new Date(obligation.deadline_date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {daysUntil !== null && (
                    <p className={`text-sm font-medium ${
                      daysUntil < 0 
                        ? 'text-red-600' 
                        : daysUntil === 0 
                        ? 'text-orange-600'
                        : daysUntil <= 7 
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}>
                      {daysUntil < 0
                        ? `${Math.abs(daysUntil)} days overdue`
                        : daysUntil === 0
                        ? 'Due today'
                        : `${daysUntil} days remaining`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Frequency */}
          {obligation.frequency && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Frequency</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-text-primary font-medium">
                  {obligation.frequency.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Condition Reference */}
          {obligation.condition_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Condition Reference</p>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <p className="text-text-primary font-medium">
                  Clause {obligation.condition_reference}
                </p>
              </div>
            </div>
          )}

          {/* Page Reference */}
          {obligation.page_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Page Reference</p>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <p className="text-text-primary font-medium">
                  Page {obligation.page_reference}
                </p>
              </div>
            </div>
          )}

          {/* Evidence Count */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Linked Evidence</p>
            <p className="text-text-primary font-medium">
              {obligation.evidence_count || evidence?.length || 0} {obligation.evidence_count === 1 || evidence?.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      {/* Obligation Text */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Full Obligation Text</h2>
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
            {obligation.obligation_description || obligation.original_text}
          </p>
        </div>
      </div>

      {/* Linked Evidence */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Linked Evidence</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowLinkEvidence(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Link Evidence
          </Button>
        </div>
        {evidenceLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading evidence...</div>
        ) : evidence && evidence.length > 0 ? (
          <div className="space-y-4">
            {evidence.map((item: Evidence) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-md">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{item.title || item.file_name}</p>
                    <p className="text-sm text-text-secondary">
                      {(item.file_size_bytes / 1024 / 1024).toFixed(2)} MB •{' '}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadEvidence(item.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkEvidence(item.id)}
                    disabled={unlinkEvidenceMutation.isPending}
                    title="Unlink evidence"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary mb-4">No evidence linked to this obligation</p>
            <Button
              variant="outline"
              onClick={() => setShowLinkEvidence(true)}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Link Evidence
            </Button>
          </div>
        )}
      </div>

      {/* Schedule Information */}
      {obligation.frequency && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Schedule</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-text-secondary">Frequency</p>
              <p className="text-text-primary">{obligation.frequency}</p>
            </div>
            {deadlines && deadlines.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-secondary">Next Due Date</p>
                <p className="text-text-primary">
                  {new Date(deadlines[0].due_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <CommentThread
          entityType="obligation"
          entityId={id}
          currentUserId={undefined}
        />
      </div>
        </>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <AuditTimeline obligationId={id} />
      )}

      {/* AI Suggestions Tab */}
      {activeTab === 'ai' && (
        <AIEvidenceAnalyzer obligationId={id} />
      )}

      {/* Costs Tab */}
      {activeTab === 'costs' && (
        <ObligationCostList obligationId={id} />
      )}

      {/* Version History Tab */}
      {activeTab === 'versions' && (
        <DiffViewer obligationId={id} />
      )}

      {/* Link Evidence Modal */}
      <Modal
        isOpen={showLinkEvidence}
        onClose={() => setShowLinkEvidence(false)}
        title="Link Evidence"
        size="lg"
      >
        <LinkEvidenceContent
          obligationId={id}
          siteId={obligation.site_id}
          onClose={() => setShowLinkEvidence(false)}
          onSuccess={() => {
            setShowLinkEvidence(false);
            queryClient.invalidateQueries({ queryKey: ['obligation-evidence', id] });
          }}
        />
      </Modal>
    </div>
  );
}

function LinkEvidenceContent({
  obligationId,
  siteId,
  onClose,
  onSuccess,
}: {
  obligationId: string;
  siteId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);

  const { data: availableEvidence, isLoading } = useQuery({
    queryKey: ['available-evidence', siteId],
    queryFn: async () => {
      const response = await apiClient.get<any[]>(`/evidence?filter[site_id]=${siteId}&filter[unlinked]=true`);
      return (response.data || []) as any[];
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (evidenceIds: string[]) => {
      return Promise.all(
        evidenceIds.map((evidenceId) =>
          apiClient.post(`/obligations/${obligationId}/evidence`, { evidence_id: evidenceId })
        )
      );
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleLink = () => {
    if (selectedEvidence.length > 0) {
      linkMutation.mutate(selectedEvidence);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-text-secondary">Loading available evidence...</div>;
  }

  const evidenceList = availableEvidence || [];

  return (
    <div className="space-y-4">
      {evidenceList.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">No unlinked evidence available</p>
          <Link href={`/dashboard/evidence/upload?siteId=${siteId}`}>
            <Button variant="outline">Upload New Evidence</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {evidenceList.map((item: any) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedEvidence.includes(item.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvidence.includes(item.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEvidence([...selectedEvidence, item.id]);
                    } else {
                      setSelectedEvidence(selectedEvidence.filter((id) => id !== item.id));
                    }
                  }}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{item.title || item.file_name}</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLink}
              disabled={selectedEvidence.length === 0 || linkMutation.isPending}
              loading={linkMutation.isPending}
            >
              Link {selectedEvidence.length > 0 ? `(${selectedEvidence.length})` : ''}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { 
      label: 'Pending', 
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      icon: Clock
    },
    DUE_SOON: { 
      label: 'Due Soon', 
      className: 'bg-orange-50 text-orange-700 border border-orange-200',
      icon: AlertCircle
    },
    OVERDUE: { 
      label: 'Overdue', 
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: XCircle
    },
    COMPLETED: { 
      label: 'Completed', 
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: CheckCircle2
    },
    NOT_APPLICABLE: { 
      label: 'Not Applicable', 
      className: 'bg-gray-50 text-gray-600 border border-gray-200',
      icon: XCircle
    },
    ACTIVE: { 
      label: 'Active', 
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: CheckCircle2
    },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Clock
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${badgeConfig.className}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const categoryConfig: Record<string, { 
    label: string; 
    bg: string; 
    text: string; 
    border: string;
    icon: any;
  }> = {
    MONITORING: { 
      label: 'Monitoring', 
      bg: 'bg-blue-50', 
      text: 'text-blue-700', 
      border: 'border-blue-200',
      icon: Activity
    },
    REPORTING: { 
      label: 'Reporting', 
      bg: 'bg-purple-50', 
      text: 'text-purple-700', 
      border: 'border-purple-200',
      icon: FileText
    },
    RECORD_KEEPING: { 
      label: 'Record Keeping', 
      bg: 'bg-green-50', 
      text: 'text-green-700', 
      border: 'border-green-200',
      icon: BookOpen
    },
    OPERATIONAL: { 
      label: 'Operational', 
      bg: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-200',
      icon: Settings
    },
    MAINTENANCE: { 
      label: 'Maintenance', 
      bg: 'bg-yellow-50', 
      text: 'text-yellow-700', 
      border: 'border-yellow-200',
      icon: Wrench
    },
  };

  const config = categoryConfig[category] || {
    label: category.replace(/_/g, ' '),
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: FileText
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${config.bg} ${config.text} border ${config.border}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {config.label}
    </span>
  );
}

