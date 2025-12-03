'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewRecurrenceEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    site_id: '',
    event_type: 'CUSTOM',
    event_name: '',
    event_date: new Date().toISOString().split('T')[0],
    event_metadata: '{}',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/recurrence-events', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-events'] });
      router.push(`/dashboard/recurrence-events/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create recurrence event:', error);
      alert('Failed to create recurrence event. Please try again.');
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

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/recurrence-events"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Recurrence Events
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Recurrence Event</h1>
        <p className="text-text-secondary mt-2">
          Create a new event that can trigger recurring tasks
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="site_id">Site ID *</Label>
            <Input
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              placeholder="UUID of the site"
              className="mt-1"
            />
          </div>

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
              placeholder="e.g., Generator Commissioning, Permit Renewal"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="event_metadata">Event Metadata (JSON)</Label>
            <textarea
              id="event_metadata"
              value={formData.event_metadata}
              onChange={(e) => setFormData({ ...formData, event_metadata: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
              placeholder='{"key": "value"}'
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/recurrence-events">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}

