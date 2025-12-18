'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSearch,
  Package,
  Calendar,
  Filter,
  Inbox
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  notification_type: string;
  channel: string;
  subject: string;
  message: string;
  read_at: string | null;
  created_at: string;
  action_url?: string;
  entity_type?: string;
  entity_id?: string;
}

interface NotificationTypeConfig {
  icon: any;
  color: string;
  bg: string;
}

const notificationTypeConfig: Record<string, NotificationTypeConfig> = {
  deadline_approaching: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  deadline_overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  obligation_completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  escalation_triggered: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  document_uploaded: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  evidence_reminder: { icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
  // Legacy notification types from backend
  DEADLINE_WARNING_7D: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  DEADLINE_WARNING_3D: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  DEADLINE_WARNING_1D: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  OVERDUE_OBLIGATION: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  EVIDENCE_REMINDER: { icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
  PERMIT_RENEWAL_REMINDER: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  AUDIT_PACK_READY: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  REGULATOR_PACK_READY: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  TENDER_PACK_READY: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  BOARD_PACK_READY: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  INSURER_PACK_READY: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
};

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch notifications with infinite scroll
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications', filter],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      params.append('limit', '20');

      if (pageParam) {
        params.append('cursor', pageParam);
      }

      if (filter === 'unread') {
        params.append('unread_only', 'true');
      } else if (filter === 'read') {
        params.append('unread_only', 'false');
        params.append('filter[read_at][neq]', 'null');
      }

      const response = await apiClient.get(`/notifications?${params.toString()}`);
      return {
        data: response.data as Notification[],
        pagination: response.pagination,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination?.has_more ? lastPage.pagination.cursor : undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  const notifications = data?.pages.flatMap(page => page.data) || [];
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiClient.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark notification as read');
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark all as read');
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to entity
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.entity_type && notification.entity_id) {
      // Navigate based on entity type
      const entityRoutes: Record<string, string> = {
        obligation: `/dashboard/obligations/${notification.entity_id}`,
        audit_pack: `/dashboard/packs/${notification.entity_id}`,
        pack: `/dashboard/packs/${notification.entity_id}`,
        deadline: `/dashboard/deadlines/${notification.entity_id}`,
        evidence: `/dashboard/evidence/${notification.entity_id}`,
        document: `/dashboard/documents/${notification.entity_id}`,
      };

      const route = entityRoutes[notification.entity_type];
      if (route) {
        router.push(route);
      }
    }
  };

  const getNotificationConfig = (type: string): NotificationTypeConfig => {
    return notificationTypeConfig[type] || {
      icon: Bell,
      color: 'text-gray-600',
      bg: 'bg-gray-50'
    };
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-11 w-40" />
        </div>

        <div className="bg-white rounded-lg shadow-base p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-base p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Notifications</h1>
          <p className="text-text-secondary mt-2">
            Stay updated on your compliance obligations and deadlines
          </p>
        </div>
        <EmptyState
          variant="error"
          title="Failed to load notifications"
          description="We couldn't load your notifications. Please try again."
          action={{
            label: 'Retry',
            onClick: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-text-secondary mt-2">
            Stay updated on your compliance obligations and deadlines
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="md"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            loading={markAllAsReadMutation.isPending}
            icon={<CheckCheck className="h-4 w-4" />}
            iconPosition="left"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-base p-2 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <Filter className="h-5 w-5 text-text-tertiary flex-shrink-0 hidden sm:block" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === 'unread' ? 'bg-white text-primary' : 'bg-primary text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'read'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-16 w-16" />}
          title={filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications'}
          description={
            filter === 'unread'
              ? "You're all caught up! No new notifications to review."
              : filter === 'read'
              ? "You haven't read any notifications yet."
              : "You'll see notifications here when there are updates to your obligations, deadlines, or packs."
          }
          variant="custom"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const config = getNotificationConfig(notification.notification_type);
            const Icon = config.icon;
            const isUnread = !notification.read_at;

            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left bg-white rounded-lg shadow-base hover:shadow-md transition-all duration-200 overflow-hidden group ${
                  isUnread ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full ${config.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-sm sm:text-base font-medium text-text-primary group-hover:text-primary transition-colors ${
                          isUnread ? 'font-semibold' : ''
                        }`}>
                          {notification.subject}
                        </h3>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" title="Unread"></div>
                        )}
                      </div>

                      <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(notification.created_at)}
                        </span>
                        {notification.entity_type && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600 capitalize">
                            {notification.entity_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark as read button (only for unread) */}
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notification.id);
                        }}
                        disabled={markAsReadMutation.isPending}
                        className="flex-shrink-0 p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                loading={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading more...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
