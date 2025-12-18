'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './notification-dropdown';
import { UnreadCountResponse } from '@/lib/types/notifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Fetch unread count with polling
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      return response.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds for new notifications
  });

  const unreadCount = unreadData?.unread_count || 0;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 text-white hover:text-primary transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-charcoal"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-danger text-white text-xs font-medium',
              unreadCount > 9 ? 'top-0.5 right-0.5 h-5 w-5' : 'top-1 right-1 h-4 w-4'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={buttonRef}
      />
    </div>
  );
}
