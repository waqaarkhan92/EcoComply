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

export default function NewExemptionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    generator_id: '',
    exemption_type: 'TESTING' as 'TESTING' | 'EMERGENCY_OPERATION' | 'MAINTENANCE' | 'OTHER',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    duration_hours: '',
    exemption_reason: '',
    evidence_ids: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-3/exemptions', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-3-exemptions'] });
      router.push(`/dashboard/module-3/exemptions/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create exemption:', error);
      alert('Failed to create exemption. Please try again.');
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
      end_date: formData.end_date || undefined,
      duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : undefined,
      evidence_ids: formData.evidence_ids ? formData.evidence_ids.split(',').map(id => id.trim()).filter(Boolean) : [],
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-3/exemptions"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Exemptions
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Exemption</h1>
        <p className="text-text-secondary mt-2">
          Create a new emission exemption for a generator
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="generator_id">Generator ID *</Label>
            <Input
              id="generator_id"
              required
              value={formData.generator_id}
              onChange={(e) => setFormData({ ...formData, generator_id: e.target.value })}
              placeholder="UUID of the generator"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="exemption_type">Exemption Type *</Label>
            <select
              id="exemption_type"
              required
              value={formData.exemption_type}
              onChange={(e) => setFormData({ ...formData, exemption_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="TESTING">Testing</option>
              <option value="EMERGENCY_OPERATION">Emergency Operation</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="duration_hours">Duration (hours)</Label>
            <Input
              id="duration_hours"
              type="number"
              step="0.01"
              min="0"
              value={formData.duration_hours}
              onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
              placeholder="e.g., 24.0"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="exemption_reason">Exemption Reason *</Label>
            <textarea
              id="exemption_reason"
              required
              value={formData.exemption_reason}
              onChange={(e) => setFormData({ ...formData, exemption_reason: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Provide detailed reason for this exemption..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="evidence_ids">Evidence IDs (comma-separated, optional)</Label>
            <Input
              id="evidence_ids"
              value={formData.evidence_ids}
              onChange={(e) => setFormData({ ...formData, evidence_ids: e.target.value })}
              placeholder="UUID1, UUID2, UUID3"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-3/exemptions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Exemption'}
          </Button>
        </div>
      </form>
    </div>
  );
}

