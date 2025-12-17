'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Clock,
  ChevronRight,
  X,
  Loader2,
  MoreHorizontal,
  Calendar,
  Building2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';

interface OverdueItem {
  id: string;
  obligation_id: string;
  site_id: string;
  due_date: string;
  obligations: {
    id: string;
    title: string;
    description?: string;
    category?: string;
  };
  sites: {
    id: string;
    name: string;
  };
}

interface ActionableOverdueItemsProps {
  limit?: number;
  showHeader?: boolean;
}

export function ActionableOverdueItems({ limit = 5, showHeader = true }: ActionableOverdueItemsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch overdue items
  const { data: overdueData, isLoading } = useQuery({
    queryKey: ['overdue-deadlines'],
    queryFn: async () => {
      const response = await apiClient.get(`/deadlines?status=OVERDUE&limit=${limit + 5}`);
      return response as { data: OverdueItem[] };
    },
  });

  const overdueItems = (overdueData?.data || []).slice(0, limit);

  // Mark complete mutation with undo
  const markCompleteMutation = useMutation({
    mutationFn: async (obligationId: string) => {
      await apiClient.post(`/obligations/${obligationId}/complete`);
    },
    onMutate: async (obligationId) => {
      setProcessingId(obligationId);
      // Optimistically update the cache
      await queryClient.cancelQueries({ queryKey: ['overdue-deadlines'] });
      const previousData = queryClient.getQueryData(['overdue-deadlines']);

      queryClient.setQueryData(['overdue-deadlines'], (old: any) => ({
        ...old,
        data: old?.data?.filter((item: OverdueItem) => item.obligation_id !== obligationId) || [],
      }));

      return { previousData };
    },
    onSuccess: (_, obligationId) => {
      setProcessingId(null);
      toast({
        title: 'Marked as complete',
        description: 'Obligation has been marked as complete.',
        action: (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUndo(obligationId)}
            className="text-primary hover:text-primary"
          >
            Undo
          </Button>
        ),
        duration: 8000,
      });
    },
    onError: (_, __, context) => {
      setProcessingId(null);
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['overdue-deadlines'], context.previousData);
      }
      toast({
        title: 'Error',
        description: 'Failed to mark as complete. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleUndo = async (obligationId: string) => {
    try {
      await apiClient.post(`/obligations/${obligationId}/uncomplete`);
      queryClient.invalidateQueries({ queryKey: ['overdue-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Undone',
        description: 'Obligation restored to previous state.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to undo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkComplete = (obligationId: string) => {
    markCompleteMutation.mutate(obligationId);
  };

  const handleUploadEvidence = (siteId: string, obligationId: string) => {
    router.push(`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence/upload`);
  };

  const handleViewDetails = (siteId: string, obligationId: string) => {
    router.push(`/dashboard/sites/${siteId}/permits/obligations?selected=${obligationId}`);
  };

  const getDaysOverdue = (dueDate: string) => {
    const days = Math.ceil((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {showHeader && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        )}
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (overdueItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {showHeader && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-text-tertiary" />
            <h2 className="text-lg font-semibold text-text-primary">Overdue Items</h2>
          </div>
        )}
        <div className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">All caught up!</h3>
          <p className="text-sm text-text-secondary">No overdue items. Great work on staying compliant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Overdue Items</h2>
              <p className="text-xs text-red-600">{overdueItems.length} items need attention</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/deadlines?filter=overdue')}
            className="text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        <AnimatePresence mode="popLayout">
          {overdueItems.map((item) => {
            const daysOverdue = getDaysOverdue(item.due_date);
            const isProcessing = processingId === item.obligation_id;
            const isExpanded = expandedId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, x: -100 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Days Overdue Badge */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-100 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-red-600">{daysOverdue}</span>
                      <span className="text-[10px] text-red-500 uppercase">days</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-text-primary truncate">
                            {item.obligations?.title || 'Untitled Obligation'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-text-secondary truncate">
                              {item.sites?.name || 'Unknown Site'}
                            </span>
                            <span className="text-xs text-text-tertiary">·</span>
                            <Calendar className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">
                              Due {new Date(item.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadEvidence(item.site_id, item.obligation_id)}
                            className="h-8 text-xs"
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Evidence
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkComplete(item.obligation_id)}
                            disabled={isProcessing}
                            className="h-8 text-xs"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </>
                            )}
                          </Button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-text-tertiary" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-gray-100"
                          >
                            {item.obligations?.description && (
                              <p className="text-xs text-text-secondary mb-3">
                                {item.obligations.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(item.site_id, item.obligation_id)}
                                className="text-xs h-7"
                              >
                                View Details
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/sites/${item.site_id}/dashboard`)}
                                className="text-xs h-7"
                              >
                                Go to Site
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {overdueItems.length >= limit && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/deadlines?filter=overdue')}
            className="text-primary"
          >
            View all overdue items
          </Button>
        </div>
      )}
    </div>
  );
}
