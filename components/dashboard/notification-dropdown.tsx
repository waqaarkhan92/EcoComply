'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Bell, Check, CheckCheck, AlertCircle, FileText, Package, Calendar, Clock } from 'lucide-react';
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

export function NotificationDropdown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data as { unread_count: number };
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = unreadData?.unread_count || 0;

  // Fetch recent notifications (only when dropdown is open)
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications?limit=10&filter[read_at]=null');
      return response as { data: Notification[] };
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false, // Poll every 10 seconds when open
  });

  const notifications: any[] = notificationsData?.data || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
    setIsOpen(false);
    
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.entity_type && notification.entity_id) {
      // Navigate based on entity type
      if (notification.entity_type === 'obligation') {
        router.push(`/dashboard/obligations/${notification.entity_id}`);
      } else if (notification.entity_type === 'audit_pack') {
        router.push(`/dashboard/packs/${notification.entity_id}`);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    const config = NOTIFICATION_ICONS[type] || { icon: Bell, color: 'text-text-tertiary' };
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-primary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-danger rounded-full flex items-center justify-center text-white text-xs font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-input-border z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-input-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-primary hover:text-primary-dark transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-sm text-text-secondary">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-input-border">
                {notifications.map((notification: Notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left hover:bg-background-tertiary transition-colors ${
                      !notification.read_at ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium text-text-primary ${
                            !notification.read_at ? 'font-semibold' : ''
                          }`}>
                            {notification.subject}
                          </p>
                          {!notification.read_at && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-input-border">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

