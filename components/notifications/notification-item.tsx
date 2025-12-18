'use client';

import {
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/lib/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  compact?: boolean;
}

// Icon configuration for each notification type
const NOTIFICATION_CONFIGS: Record<NotificationType, { icon: any; color: string; bgColor: string }> = {
  deadline_approaching: {
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10'
  },
  deadline_overdue: {
    icon: AlertTriangle,
    color: 'text-danger',
    bgColor: 'bg-danger/10'
  },
  obligation_completed: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10'
  },
  escalation_triggered: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  document_uploaded: {
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  evidence_reminder: {
    icon: FileSearch,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
};

export function NotificationItem({ notification, onClick, compact = false }: NotificationItemProps) {
  const config = NOTIFICATION_CONFIGS[notification.notification_type as NotificationType] || {
    icon: AlertCircle,
    color: 'text-text-tertiary',
    bgColor: 'bg-background-tertiary',
  };

  const Icon = config.icon;
  const isUnread = !notification.read_at;

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

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full px-4 py-3 text-left hover:bg-background-tertiary transition-colors',
          isUnread && 'bg-primary/5'
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('flex-shrink-0 p-2 rounded-lg mt-0.5', config.bgColor)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                'text-sm text-text-primary',
                isUnread && 'font-semibold'
              )}>
                {notification.subject}
              </p>
              {isUnread && (
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
    );
  }

  // Full page view (non-compact)
  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-4 rounded-lg border border-input-border transition-all cursor-pointer',
        isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-white hover:bg-background-tertiary'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('flex-shrink-0 p-3 rounded-lg', config.bgColor)}>
          <Icon className={cn('h-6 w-6', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={cn(
              'text-base text-text-primary',
              isUnread && 'font-semibold'
            )}>
              {notification.subject}
            </h4>
            {isUnread && (
              <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5"></div>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-text-tertiary">
              {formatTimeAgo(notification.created_at)}
            </p>
            {notification.entity_type && (
              <>
                <span className="text-text-tertiary">•</span>
                <p className="text-xs text-text-tertiary capitalize">
                  {notification.entity_type.replace('_', ' ')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
