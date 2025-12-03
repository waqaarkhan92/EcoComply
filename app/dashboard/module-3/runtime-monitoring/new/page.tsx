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

export default function NewRuntimeMonitoringPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    generator_id: '',
    run_date: new Date().toISOString().split('T')[0],
    run_duration: '',
    reason_code: 'Normal' as 'Test' | 'Emergency' | 'Maintenance' | 'Normal',
    evidence_linkage_id: '',
    entry_reason_notes: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-3/runtime-monitoring', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-3-runtime-monitoring'] });
      router.push(`/dashboard/module-3/runtime-monitoring/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create runtime monitoring record:', error);
      alert('Failed to create runtime monitoring record. Please try again.');
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
      run_duration: parseFloat(formData.run_duration),
      evidence_linkage_id: formData.evidence_linkage_id || undefined,
      entry_reason_notes: formData.entry_reason_notes || undefined,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-3/runtime-monitoring"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Runtime Monitoring
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Runtime Entry</h1>
        <p className="text-text-secondary mt-2">
          Record generator runtime hours manually
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
            <Label htmlFor="run_date">Run Date *</Label>
            <Input
              id="run_date"
              type="date"
              required
              value={formData.run_date}
              onChange={(e) => setFormData({ ...formData, run_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="run_duration">Run Duration (hours) *</Label>
            <Input
              id="run_duration"
              type="number"
              step="0.01"
              required
              min="0"
              value={formData.run_duration}
              onChange={(e) => setFormData({ ...formData, run_duration: e.target.value })}
              placeholder="e.g., 8.5"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="reason_code">Reason Code *</Label>
            <select
              id="reason_code"
              required
              value={formData.reason_code}
              onChange={(e) => setFormData({ ...formData, reason_code: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="Normal">Normal</option>
              <option value="Test">Test</option>
              <option value="Emergency">Emergency</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <Label htmlFor="evidence_linkage_id">Evidence Linkage ID (optional)</Label>
            <Input
              id="evidence_linkage_id"
              value={formData.evidence_linkage_id}
              onChange={(e) => setFormData({ ...formData, evidence_linkage_id: e.target.value })}
              placeholder="UUID of evidence item"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="entry_reason_notes">Entry Reason Notes (optional)</Label>
            <textarea
              id="entry_reason_notes"
              value={formData.entry_reason_notes}
              onChange={(e) => setFormData({ ...formData, entry_reason_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Additional notes about the reason for this runtime entry..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-3/runtime-monitoring">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Runtime Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}

