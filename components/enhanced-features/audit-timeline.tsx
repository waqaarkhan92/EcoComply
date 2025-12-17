'use client';

/**
 * Audit Timeline Component
 * Visual timeline of all changes and events
 */

import { useObligationTimeline, TimelineEvent } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Unlink,
  Clock,
  AlertCircle,
  MessageSquare,
  User,
  Eye,
  FileText,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditTimelineProps {
  obligationId: string;
  maxItems?: number;
}

const eventConfig: Record<string, { icon: typeof Plus; color: string; bgColor: string }> = {
  OBLIGATION_CREATED: { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  OBLIGATION_UPDATED: { icon: Edit, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  STATUS_CHANGED: { icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  EVIDENCE_LINKED: { icon: LinkIcon, color: 'text-green-600', bgColor: 'bg-green-100' },
  EVIDENCE_UNLINKED: { icon: Unlink, color: 'text-red-600', bgColor: 'bg-red-100' },
  EVIDENCE_UPLOADED: { icon: Upload, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  DEADLINE_COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  DEADLINE_MISSED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  REVIEW_SUBMITTED: { icon: Eye, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  REVIEW_APPROVED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  REVIEW_REJECTED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  COMMENT_ADDED: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  ASSIGNMENT_CHANGED: { icon: User, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  DOCUMENT_ATTACHED: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
};

const defaultEventConfig = { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' };

export function AuditTimeline({ obligationId, maxItems }: AuditTimelineProps) {
  const { data: events, isLoading } = useObligationTimeline(obligationId);

  if (isLoading) {
    return <AuditTimelineSkeleton />;
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Timeline</h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No events recorded yet</p>
        </div>
      </div>
    );
  }

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  // Group events by date
  const groupedEvents = groupEventsByDate(displayEvents);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Audit Timeline</h3>

      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-900">{formatDateLabel(date)}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-4">
                {dayEvents.map((event, index) => (
                  <TimelineEventItem key={event.id} event={event} isLast={index === dayEvents.length - 1} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {maxItems && events.length > maxItems && (
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button className="text-sm text-primary hover:underline">
            View {events.length - maxItems} more events
          </button>
        </div>
      )}
    </div>
  );
}

function TimelineEventItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = eventConfig[event.event_type] || defaultEventConfig;
  const Icon = config.icon;

  return (
    <div className="relative flex gap-4 pl-1">
      {/* Icon */}
      <div className={`relative z-10 p-2 rounded-full ${config.bgColor} flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-gray-900">{event.description}</p>
            {event.user?.full_name && (
              <p className="text-xs text-gray-500 mt-0.5">by {event.user.full_name}</p>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {format(new Date(event.created_at), 'HH:mm')}
          </span>
        </div>

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
            {formatMetadata(event.metadata)}
          </div>
        )}
      </div>
    </div>
  );
}

function groupEventsByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  return events.reduce((groups, event) => {
    const date = event.created_at.split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, TimelineEvent[]>);
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  }
  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  }
  return format(date, 'EEEE, MMMM d, yyyy');
}

function formatMetadata(metadata: Record<string, any>): string {
  const entries = Object.entries(metadata)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
    .slice(0, 3);

  return entries.join(' • ');
}

function AuditTimelineSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="space-y-6">
        {[...Array(2)].map((_, groupIndex) => (
          <div key={groupIndex}>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-24" />
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-4 pl-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditTimeline;
