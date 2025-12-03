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

export default function NewConsentStatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    site_id: '',
    state: 'DRAFT',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    previous_state_id: '',
    state_transition_reason: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/consent-states', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['consent-states'] });
      router.push(`/dashboard/module-2/consent-states/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create consent state:', error);
      alert('Failed to create consent state. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      expiry_date: formData.expiry_date || undefined,
      previous_state_id: formData.previous_state_id || undefined,
      state_transition_reason: formData.state_transition_reason || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-2/consent-states"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Consent States
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Consent State Transition</h1>
        <p className="text-text-secondary mt-2">
          Create a new consent state transition (Draft → In Force → Superseded → Expired)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="document_id">Document ID *</Label>
            <Input
              id="document_id"
              required
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              placeholder="UUID of the consent document"
              className="mt-1"
            />
          </div>

          <div>
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
            <Label htmlFor="state">State *</Label>
            <select
              id="state"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DRAFT">Draft</option>
              <option value="IN_FORCE">In Force</option>
              <option value="SUPERSEDED">Superseded</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div>
            <Label htmlFor="effective_date">Effective Date *</Label>
            <Input
              id="effective_date"
              type="date"
              required
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="previous_state_id">Previous State ID</Label>
            <Input
              id="previous_state_id"
              value={formData.previous_state_id}
              onChange={(e) => setFormData({ ...formData, previous_state_id: e.target.value })}
              placeholder="UUID of previous state (for transitions)"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="state_transition_reason">Transition Reason</Label>
            <textarea
              id="state_transition_reason"
              value={formData.state_transition_reason}
              onChange={(e) => setFormData({ ...formData, state_transition_reason: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Reason for this state transition..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-2/consent-states">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create State Transition'}
          </Button>
        </div>
      </form>
    </div>
  );
}

