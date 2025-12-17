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

interface RuntimeMonitoring {
  id: string;
  run_date: string;
  run_duration: number;
  runtime_hours: number;
  reason_code: 'Test' | 'Emergency' | 'Maintenance' | 'Normal';
  evidence_linkage_id: string | null;
  entry_reason_notes: string | null;
  notes: string | null;
  validation_status: string | null;
}

export default function EditRuntimeMonitoringPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    run_date: '',
    run_duration: '',
    reason_code: 'Normal' as 'Test' | 'Emergency' | 'Maintenance' | 'Normal',
    evidence_linkage_id: '',
    entry_reason_notes: '',
    notes: '',
    validation_status: '',
  });

  const { data: record, isLoading } = useQuery({
    queryKey: ['runtime-monitoring', recordId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RuntimeMonitoring>(`/module-3/runtime-monitoring/${recordId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (record) {
      setFormData({
        run_date: record.run_date.split('T')[0],
        run_duration: record.run_duration.toString(),
        reason_code: record.reason_code,
        evidence_linkage_id: record.evidence_linkage_id || '',
        entry_reason_notes: record.entry_reason_notes || '',
        notes: record.notes || '',
        validation_status: record.validation_status || '',
      });
    }
  }, [record]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-3/runtime-monitoring/${recordId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runtime-monitoring', recordId] });
      queryClient.invalidateQueries({ queryKey: ['module-3-runtime-monitoring'] });
      router.push(`/dashboard/module-3/runtime-monitoring/${recordId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update runtime monitoring record:', error);
      alert('Failed to update runtime monitoring record. Please try again.');
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
      validation_status: formData.validation_status || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading runtime monitoring record...</div>;
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Runtime monitoring record not found</p>
        <Link href="/dashboard/module-3/runtime-monitoring">
          <Button variant="outline" className="mt-4">
            Back to Runtime Monitoring
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-3/runtime-monitoring/${recordId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Runtime Entry
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Runtime Entry</h1>
        <p className="text-text-secondary mt-2">
          Update runtime monitoring record details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Label htmlFor="validation_status">Validation Status</Label>
            <select
              id="validation_status"
              value={formData.validation_status}
              onChange={(e) => setFormData({ ...formData, validation_status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <Label htmlFor="evidence_linkage_id">Evidence Linkage ID</Label>
            <Input
              id="evidence_linkage_id"
              value={formData.evidence_linkage_id}
              onChange={(e) => setFormData({ ...formData, evidence_linkage_id: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="entry_reason_notes">Entry Reason Notes</Label>
            <textarea
              id="entry_reason_notes"
              value={formData.entry_reason_notes}
              onChange={(e) => setFormData({ ...formData, entry_reason_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-3/runtime-monitoring/${recordId}`}>
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

