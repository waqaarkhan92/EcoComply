'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NotificationItem } from './notification-item';
import { Notification, UnreadCountResponse, NotificationsListResponse } from '@/lib/types/notifications';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function NotificationDropdown({ isOpen, onClose, triggerRef }: NotificationDropdownProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch recent notifications (only when dropdown is open)
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const response = await apiClient.get<NotificationsListResponse>('/notifications?limit=10&filter[read_at]=null');
      return response.data;
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false, // Poll every 10 seconds when open
  });

  const notifications = notificationsData?.data || [];

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
    onClose();

    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.entity_type && notification.entity_id) {
      // Navigate based on entity type
      if (notification.entity_type === 'obligation') {
        router.push(`/dashboard/obligations/${notification.entity_id}`);
      } else if (notification.entity_type === 'audit_pack') {
        router.push(`/dashboard/packs/${notification.entity_id}`);
      } else if (notification.entity_type === 'document') {
        router.push(`/dashboard/documents/${notification.entity_id}`);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-input-border z-50 max-h-[600px] flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-input-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className={cn(
                  'flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors',
                  markAllAsReadMutation.isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="text-sm text-text-secondary mt-4">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-sm text-text-secondary">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-input-border">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-input-border">
            <Link
              href="/dashboard/notifications"
              onClick={onClose}
              className="text-sm text-primary hover:text-primary-dark transition-colors font-medium"
            >
              View all notifications
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
