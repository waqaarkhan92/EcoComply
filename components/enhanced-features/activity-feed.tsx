'use client';

/**
 * Activity Feed Component
 * Real-time activity stream for team awareness
 */

import { useActivityFeed, ActivityFeedItem } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  User,
  Clock,
  Link as LinkIcon,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ActivityFeedProps {
  siteId?: string;
  entityType?: string;
  limit?: number;
  showHeader?: boolean;
}

const activityIcons: Record<string, typeof FileText> = {
  OBLIGATION_CREATED: Plus,
  OBLIGATION_UPDATED: Edit,
  OBLIGATION_COMPLETED: CheckCircle,
  EVIDENCE_UPLOADED: Upload,
  EVIDENCE_LINKED: LinkIcon,
  DOCUMENT_UPLOADED: FileText,
  DOCUMENT_PROCESSED: Eye,
  COMMENT_ADDED: MessageSquare,
  DEADLINE_COMPLETED: CheckCircle,
  DEADLINE_MISSED: AlertCircle,
  USER_ASSIGNED: User,
  STATUS_CHANGED: Clock,
  REVIEW_SUBMITTED: Eye,
  ITEM_DELETED: Trash2,
};

const activityColors: Record<string, string> = {
  OBLIGATION_CREATED: 'bg-blue-100 text-blue-600',
  OBLIGATION_UPDATED: 'bg-yellow-100 text-yellow-600',
  OBLIGATION_COMPLETED: 'bg-green-100 text-green-600',
  EVIDENCE_UPLOADED: 'bg-purple-100 text-purple-600',
  EVIDENCE_LINKED: 'bg-indigo-100 text-indigo-600',
  DOCUMENT_UPLOADED: 'bg-blue-100 text-blue-600',
  DOCUMENT_PROCESSED: 'bg-cyan-100 text-cyan-600',
  COMMENT_ADDED: 'bg-gray-100 text-gray-600',
  DEADLINE_COMPLETED: 'bg-green-100 text-green-600',
  DEADLINE_MISSED: 'bg-red-100 text-red-600',
  USER_ASSIGNED: 'bg-orange-100 text-orange-600',
  STATUS_CHANGED: 'bg-yellow-100 text-yellow-600',
  REVIEW_SUBMITTED: 'bg-teal-100 text-teal-600',
  ITEM_DELETED: 'bg-red-100 text-red-600',
};

export function ActivityFeed({ siteId, entityType, limit = 10, showHeader = true }: ActivityFeedProps) {
  const { data: activities, isLoading } = useActivityFeed({ siteId, entityType, limit });

  if (isLoading) {
    return <ActivityFeedSkeleton showHeader={showHeader} />;
  }

  const hasActivities = activities && activities.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {!hasActivities ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {hasActivities && (
        <div className="p-3 border-t border-gray-100 text-center">
          <Link href="/dashboard/activity" className="text-sm text-primary hover:underline">
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const Icon = activityIcons[activity.activity_type] || Clock;
  const colorClass = activityColors[activity.activity_type] || 'bg-gray-100 text-gray-600';

  const entityUrl = getEntityUrl(activity.entity_type, activity.entity_id);

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            {activity.user?.full_name && (
              <span className="font-medium">{activity.user.full_name} </span>
            )}
            <span className="text-gray-600">{activity.summary}</span>
          </p>

          {activity.entity_title && (
            <p className="text-sm mt-0.5">
              {entityUrl ? (
                <Link href={entityUrl} className="text-primary hover:underline truncate block">
                  {activity.entity_title}
                </Link>
              ) : (
                <span className="text-gray-700 truncate block">{activity.entity_title}</span>
              )}
            </p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

function getEntityUrl(entityType: string, entityId: string): string | null {
  switch (entityType.toLowerCase()) {
    case 'obligation':
      return `/dashboard/obligations/${entityId}`;
    case 'document':
      return `/dashboard/documents/${entityId}`;
    case 'evidence':
      return `/dashboard/evidence/${entityId}`;
    case 'site':
      return `/dashboard/sites/${entityId}`;
    case 'deadline':
      return `/dashboard/deadlines/${entityId}`;
    default:
      return null;
  }
}

function ActivityFeedSkeleton({ showHeader }: { showHeader?: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow-md">
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <Skeleton className="h-6 w-32" />
        </div>
      )}
      <div className="divide-y divide-gray-50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;
