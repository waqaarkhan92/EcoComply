'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, CheckCircle2, XCircle, Zap, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface RecurrenceEvent {
  id: string;
  site_id: string;
  event_type: 'COMMISSIONING' | 'PERMIT_ISSUED' | 'RENEWAL' | 'VARIATION' | 'ENFORCEMENT' | 'CUSTOM';
  event_name: string;
  event_date: string;
  event_metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const eventTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  COMMISSIONING: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: Zap },
  PERMIT_ISSUED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: FileText },
  RENEWAL: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Calendar },
  VARIATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: FileText },
  ENFORCEMENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  CUSTOM: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Calendar },
};

export default function RecurrenceEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const { data: event, isLoading } = useQuery({
    queryKey: ['recurrence-event', eventId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurrenceEvent>(`/recurrence-events/${eventId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading recurrence event...</div>;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Recurrence event not found</p>
        <Link href="/dashboard/recurrence-events">
          <Button variant="outline" className="mt-4">
            Back to Recurrence Events
          </Button>
        </Link>
      </div>
    );
  }

  const typeStyle = eventTypeColors[event.event_type] || eventTypeColors.CUSTOM;
  const TypeIcon = typeStyle.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/recurrence-events"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Recurrence Events
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {event.event_name}
          </h1>
          <p className="text-text-secondary mt-2">
            {event.event_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/recurrence-events/${eventId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${typeStyle.bg} ${typeStyle.border}`}>
        <div className="flex items-center gap-3">
          <TypeIcon className={`w-6 h-6 ${typeStyle.text}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Event Type: {event.event_type.replace('_', ' ')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Status: {event.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Event Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Event Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Event Name</p>
            <p className="text-text-primary font-medium">{event.event_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Event Type</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
              <TypeIcon className="w-4 h-4 mr-2" />
              {event.event_type.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Event Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(event.event_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {event.is_active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Inactive
              </span>
            )}
          </div>

          {event.event_metadata && Object.keys(event.event_metadata).length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Event Metadata</p>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                {JSON.stringify(event.event_metadata, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(event.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(event.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

