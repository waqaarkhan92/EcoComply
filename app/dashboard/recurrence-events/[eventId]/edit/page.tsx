'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface RecurrenceEvent {
  id: string;
  event_type: string;
  event_name: string;
  event_date: string;
  event_metadata: any;
  is_active: boolean;
}

export default function EditRecurrenceEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    event_type: 'CUSTOM',
    event_name: '',
    event_date: '',
    event_metadata: '{}',
    is_active: true,
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['recurrence-event', eventId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurrenceEvent>(`/recurrence-events/${eventId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (event) {
      setFormData({
        event_type: event.event_type,
        event_name: event.event_name,
        event_date: event.event_date.split('T')[0],
        event_metadata: JSON.stringify(event.event_metadata || {}, null, 2),
        is_active: event.is_active,
      });
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/recurrence-events/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-events'] });
      router.push(`/dashboard/recurrence-events/${eventId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update recurrence event:', error);
      alert('Failed to update recurrence event. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let metadata = {};
    try {
      metadata = JSON.parse(formData.event_metadata);
    } catch (e) {
      alert('Invalid JSON in event metadata');
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      event_metadata: metadata,
    };

    updateMutation.mutate(submitData);
  };

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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/recurrence-events/${eventId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Event
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Recurrence Event</h1>
        <p className="text-text-secondary mt-2">
          Update recurrence event details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="event_type">Event Type *</Label>
            <select
              id="event_type"
              required
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="COMMISSIONING">Commissioning</option>
              <option value="PERMIT_ISSUED">Permit Issued</option>
              <option value="RENEWAL">Renewal</option>
              <option value="VARIATION">Variation</option>
              <option value="ENFORCEMENT">Enforcement</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <Label htmlFor="event_date">Event Date *</Label>
            <Input
              id="event_date"
              type="date"
              required
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="event_name">Event Name *</Label>
            <Input
              id="event_name"
              required
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="event_metadata">Event Metadata (JSON)</Label>
            <textarea
              id="event_metadata"
              value={formData.event_metadata}
              onChange={(e) => setFormData({ ...formData, event_metadata: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/recurrence-events/${eventId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

