'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Calendar, CheckCircle2, XCircle, Zap, FileText, AlertTriangle } from 'lucide-react';
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
}

interface RecurrenceEventsResponse {
  data: RecurrenceEvent[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const eventTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  COMMISSIONING: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: Zap },
  PERMIT_ISSUED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: FileText },
  RENEWAL: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Calendar },
  VARIATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: FileText },
  ENFORCEMENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  CUSTOM: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Calendar },
};

export default function RecurrenceEventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    event_type: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['recurrence-events', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<RecurrenceEventsResponse>(`/recurrence-events?${params.toString()}`);
    },
  });

  const events: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.event_name.toLowerCase().includes(query) ||
      event.event_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Recurrence Events</h1>
          <p className="text-text-secondary mt-2">
            Manage events that can trigger recurring tasks and schedules
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recurrence-events/new">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Event Type</label>
            <select
              value={filters.event_type}
              onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="COMMISSIONING">Commissioning</option>
              <option value="PERMIT_ISSUED">Permit Issued</option>
              <option value="RENEWAL">Renewal</option>
              <option value="VARIATION">Variation</option>
              <option value="ENFORCEMENT">Enforcement</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading recurrence events...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading recurrence events. Please try again.
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No recurrence events found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Event Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredEvents.map((event, index) => {
                    const typeStyle = eventTypeColors[event.event_type] || eventTypeColors.CUSTOM;
                    const TypeIcon = typeStyle.icon;

                    return (
                      <tr
                        key={event.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/recurrence-events/${event.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {event.event_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                            <TypeIcon className="w-3.5 h-3.5 mr-1.5" />
                            {event.event_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(event.event_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => nextCursor && setCursor(nextCursor)}
                  disabled={!nextCursor}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

