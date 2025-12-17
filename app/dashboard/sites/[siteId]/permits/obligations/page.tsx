'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, FileText, Calendar, Plus, AlertCircle, CheckCircle, Clock, Upload, MoreHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SlideOver, useSlideOver } from '@/components/ui/slide-over';
import { BulkActionsBar, useBulkSelection, commonBulkActions } from '@/components/ui/bulk-actions';
import { QuickActionsMenu, quickActionFactories } from '@/components/ui/quick-actions-menu';
import { useKeyboardShortcuts, commonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useToast } from '@/lib/hooks/use-toast';

interface Obligation {
  id: string;
  obligation_title: string;
  obligation_description?: string;
  category: string;
  status: string;
  deadline_date?: string;
  review_status: string;
  frequency?: string;
  confidence_score?: number;
  evidence_count?: number;
}

interface ObligationsResponse {
  data: Obligation[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PermitObligationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const siteId = params.siteId as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // SlideOver for obligation details
  const { isOpen: slideOverOpen, selectedId: selectedObligationId, open: openSlideOver, close: closeSlideOver } = useSlideOver('selected');

  // Read URL params on initial load
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlCategory = searchParams.get('category');
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    if (urlCategory) {
      setCategoryFilter(urlCategory);
    }
  }, [searchParams]);

  const { data: obligationsData, isLoading, error } = useQuery({
    queryKey: ['permit-obligations', siteId, cursor, statusFilter, categoryFilter, searchQuery],
    queryFn: async (): Promise<any> => {
      const urlParams = new URLSearchParams();
      urlParams.append('filter[site_id]', siteId);
      if (statusFilter !== 'all') {
        urlParams.append('filter[status]', statusFilter);
      }
      if (categoryFilter !== 'all') {
        urlParams.append('filter[category]', categoryFilter);
      }
      if (searchQuery) {
        urlParams.append('search', searchQuery);
      }
      if (cursor) urlParams.append('cursor', cursor);
      urlParams.append('limit', '50');

      return apiClient.get<ObligationsResponse>(`/obligations?${urlParams.toString()}`);
    },
    enabled: !!siteId,
  });

  const obligations: any[] = obligationsData?.data || [];
  const hasMore = obligationsData?.pagination?.has_more || false;
  const nextCursor = obligationsData?.pagination?.cursor;

  // Bulk selection
  const {
    selectedIds,
    selectedCount,
    allSelected,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    selectedItems,
  } = useBulkSelection(obligations);

  // Get selected obligation for SlideOver
  const selectedObligation = obligations.find(o => o.id === selectedObligationId);

  // Bulk action mutations
  const bulkCompleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiClient.post(`/obligations/${id}/complete`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-obligations'] });
      toast({ title: `${selectedCount} obligations marked as complete` });
      deselectAll();
    },
    onError: () => {
      toast({ title: 'Failed to complete obligations', variant: 'destructive' });
    },
  });

  const bulkExportMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post('/obligations/export', { obligation_ids: ids });
      return response;
    },
    onSuccess: () => {
      toast({ title: `${selectedCount} obligations exported` });
      deselectAll();
    },
  });

  // Single obligation complete mutation
  const singleCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/obligations/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-obligations'] });
      toast({ title: 'Obligation marked as complete' });
    },
    onError: () => {
      toast({ title: 'Failed to complete obligation', variant: 'destructive' });
    },
  });

  // Keyboard shortcuts for list navigation
  useKeyboardShortcuts([
    commonShortcuts.nextItem(() => {
      if (obligations.length > 0) {
        setFocusedIndex((prev) => Math.min(prev + 1, obligations.length - 1));
      }
    }),
    commonShortcuts.prevItem(() => {
      if (obligations.length > 0) {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    }),
    commonShortcuts.openItem(() => {
      if (obligations[focusedIndex]) {
        openSlideOver(obligations[focusedIndex].id);
      }
    }),
    commonShortcuts.selectItem(() => {
      if (obligations[focusedIndex]) {
        toggle(obligations[focusedIndex].id);
      }
    }),
    commonShortcuts.escape(() => {
      if (slideOverOpen) {
        closeSlideOver();
      } else if (selectedCount > 0) {
        deselectAll();
      }
    }),
  ]);

  // Bulk actions config
  const bulkActions = [
    commonBulkActions.markComplete(() => bulkCompleteMutation.mutate(Array.from(selectedIds))),
    commonBulkActions.export(() => bulkExportMutation.mutate(Array.from(selectedIds))),
  ];

  // Calculate stats
  const totalCount = obligations.length;
  const completedCount = obligations.filter(o => o.status === 'COMPLETED').length;
  const overdueCount = obligations.filter(o => o.status === 'OVERDUE').length;
  const dueSoonCount = obligations.filter(o => o.status === 'DUE_SOON').length;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Clock className="h-3 w-3" /> },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
      DUE_SOON: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
        {category.replace(/_/g, ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
          <p className="text-red-500">Error loading obligations</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sites', href: '/dashboard/sites' },
    { label: 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
    { label: 'Obligations' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Permit Obligations</h1>
          <p className="text-text-secondary mt-1">View and manage environmental permit obligations for this site</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/permits/documents`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload Permit
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Total</p>
          <p className="text-2xl font-bold text-text-primary">{totalCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Completed</p>
          <p className="text-2xl font-bold text-success">{completedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Due Soon</p>
          <p className="text-2xl font-bold text-warning">{dueSoonCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Overdue</p>
          <p className="text-2xl font-bold text-danger">{overdueCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search obligations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="MONITORING">Monitoring</option>
            <option value="REPORTING">Reporting</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="RECORD_KEEPING">Record Keeping</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Obligations List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {obligations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No obligations found</h3>
            <p className="text-text-secondary mb-6 max-w-sm mx-auto">
              Upload an environmental permit to automatically extract obligations.
            </p>
            <Link href={`/dashboard/sites/${siteId}/permits/documents`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Permit
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-text-secondary uppercase tracking-wider items-center">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={allSelected && obligations.length > 0}
                  onChange={() => allSelected ? deselectAll() : selectAll()}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="col-span-3">Obligation</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Obligation Rows */}
            <div className="divide-y divide-gray-100">
              {obligations.map((obligation, index) => {
                const isFocused = index === focusedIndex;
                const isChecked = isSelected(obligation.id);
                const isCompleted = obligation.status === 'COMPLETED';

                // Quick actions for this obligation
                const quickActions = [
                  quickActionFactories.complete(
                    () => singleCompleteMutation.mutate(obligation.id),
                    isCompleted
                  ),
                  quickActionFactories.uploadEvidence(
                    () => router.push(`/dashboard/sites/${siteId}/permits/evidence/upload?obligationId=${obligation.id}`)
                  ),
                  quickActionFactories.reschedule(
                    () => router.push(`/dashboard/sites/${siteId}/obligations/${obligation.id}/schedule`)
                  ),
                  quickActionFactories.view(
                    () => openSlideOver(obligation.id)
                  ),
                ];

                return (
                  <div
                    key={obligation.id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 cursor-pointer transition-colors items-center group ${
                      isFocused ? 'bg-primary/5 ring-2 ring-primary/20' : ''
                    } ${isChecked ? 'bg-primary/10' : 'hover:bg-gray-50'}`}
                    onClick={() => openSlideOver(obligation.id)}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggle(obligation.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>

                    {/* Obligation Info */}
                    <div className="col-span-3">
                      <h3 className="font-medium text-text-primary">{obligation.obligation_title}</h3>
                      {obligation.obligation_description && (
                        <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">
                          {obligation.obligation_description}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      {getCategoryBadge(obligation.category)}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      {getStatusBadge(obligation.status)}
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 text-sm text-text-secondary">
                      {obligation.deadline_date ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(obligation.deadline_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      ) : (
                        <span className="text-text-tertiary">No deadline</span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="col-span-2 flex justify-end">
                      <QuickActionsMenu
                        actions={quickActions}
                        inlineCount={2}
                        menuPosition="right"
                      />
                    </div>
                  </div>
                );
              })}
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
          </>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        totalCount={obligations.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        allSelected={allSelected}
        actions={bulkActions}
      />

      {/* SlideOver for Obligation Details */}
      <SlideOver
        isOpen={slideOverOpen}
        onClose={closeSlideOver}
        title={selectedObligation?.obligation_title || 'Obligation Details'}
        size="lg"
        footer={
          selectedObligation && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/sites/${siteId}/permits/evidence/upload?obligationId=${selectedObligation.id}`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Evidence
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/obligations/${selectedObligation.id}`)}
                >
                  View Full Page
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    await apiClient.post(`/obligations/${selectedObligation.id}/complete`);
                    queryClient.invalidateQueries({ queryKey: ['permit-obligations'] });
                    toast({ title: 'Obligation marked as complete' });
                    closeSlideOver();
                  }}
                  disabled={selectedObligation.status === 'COMPLETED'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedObligation && (
          <div className="p-6 space-y-6">
            {/* Status & Category */}
            <div className="flex items-center gap-3">
              {getStatusBadge(selectedObligation.status)}
              {getCategoryBadge(selectedObligation.category)}
            </div>

            {/* Description */}
            {selectedObligation.obligation_description && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
                <p className="text-text-primary">{selectedObligation.obligation_description}</p>
              </div>
            )}

            {/* Key Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-tertiary uppercase mb-1">Due Date</p>
                <p className="text-sm font-medium text-text-primary">
                  {selectedObligation.deadline_date
                    ? new Date(selectedObligation.deadline_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'No deadline'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-tertiary uppercase mb-1">Frequency</p>
                <p className="text-sm font-medium text-text-primary">
                  {selectedObligation.frequency || 'One-time'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-tertiary uppercase mb-1">Evidence</p>
                <p className="text-sm font-medium text-text-primary">
                  {selectedObligation.evidence_count || 0} files attached
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-tertiary uppercase mb-1">Confidence</p>
                <p className="text-sm font-medium text-text-primary">
                  {selectedObligation.confidence_score
                    ? `${Math.round(selectedObligation.confidence_score * 100)}%`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Keyboard Shortcut Hint */}
            <div className="text-xs text-text-tertiary text-center py-2 border-t border-gray-100">
              Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">Esc</kbd> to close ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">j</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">k</kbd> to navigate ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">x</kbd> to select
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
