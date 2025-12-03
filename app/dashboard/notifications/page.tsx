'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2, AlertCircle, FileText, Package, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

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

const NOTIFICATION_ICONS: Record<string, { icon: any; color: string }> = {
  DEADLINE_WARNING_7D: { icon: Clock, color: 'text-warning' },
  DEADLINE_WARNING_3D: { icon: Clock, color: 'text-warning' },
  DEADLINE_WARNING_1D: { icon: AlertCircle, color: 'text-danger' },
  OVERDUE_OBLIGATION: { icon: AlertCircle, color: 'text-danger' },
  EVIDENCE_REMINDER: { icon: FileText, color: 'text-primary' },
  PERMIT_RENEWAL_REMINDER: { icon: Calendar, color: 'text-primary' },
  AUDIT_PACK_READY: { icon: Package, color: 'text-success' },
  REGULATOR_PACK_READY: { icon: Package, color: 'text-success' },
  TENDER_PACK_READY: { icon: Package, color: 'text-success' },
  BOARD_PACK_READY: { icon: Package, color: 'text-success' },
  INSURER_PACK_READY: { icon: Package, color: 'text-success' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<{
    data: Notification[];
    pagination: any;
  }>({
    queryKey: ['notifications', filter],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.append('filter[read_at]', 'null');
      } else if (filter === 'read') {
        params.append('filter[read_at][neq]', 'null');
      }
      
      const response = await apiClient.get(`/notifications?${params.toString()}`);
      return response.data;
    },
  });

  const notifications = notificationsData?.data || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.entity_type && notification.entity_id) {
      if (notification.entity_type === 'obligation') {
        router.push(`/dashboard/obligations/${notification.entity_id}`);
      } else if (notification.entity_type === 'audit_pack') {
        router.push(`/dashboard/packs/${notification.entity_id}`);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    const config = NOTIFICATION_ICONS[type] || { icon: Bell, color: 'text-text-tertiary' };
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Notifications</h1>
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
            icon={<CheckCheck className="h-4 w-4" />}
            iconPosition="left"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-base p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <Bell className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          </p>
          <p className="text-sm text-text-tertiary">
            You'll see notifications here when there are updates to your obligations, deadlines, or packs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <div className="divide-y divide-input-border">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-6 py-4 text-left hover:bg-background-tertiary transition-colors ${
                  !notification.read_at ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-medium text-text-primary ${
                            !notification.read_at ? 'font-semibold' : ''
                          }`}>
                            {notification.subject}
                          </p>
                          {!notification.read_at && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-text-tertiary mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          disabled={markAsReadMutation.isPending}
                          title="Mark as read"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

