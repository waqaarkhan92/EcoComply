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

interface SamplingLogistic {
  id: string;
  scheduled_date: string;
  sample_id: string | null;
  stage: string;
  notes: string | null;
}

export default function EditSamplingLogisticPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scheduled_date: '',
    sample_id: '',
    stage: 'SCHEDULED',
    notes: '',
  });

  const { data: record, isLoading } = useQuery({
    queryKey: ['sampling-logistic', recordId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<SamplingLogistic>(`/module-2/sampling-logistics/${recordId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (record) {
      setFormData({
        scheduled_date: record.scheduled_date.split('T')[0],
        sample_id: record.sample_id || '',
        stage: record.stage,
        notes: record.notes || '',
      });
    }
  }, [record]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-2/sampling-logistics/${recordId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampling-logistic', recordId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-sampling-logistics'] });
      router.push(`/dashboard/module-2/sampling-logistics/${recordId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update sampling logistics record:', error);
      alert('Failed to update sampling logistics record. Please try again.');
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
      sample_id: formData.sample_id || undefined,
      notes: formData.notes || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading sampling logistics record...</div>;
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Sampling logistics record not found</p>
        <Link href="/dashboard/module-2/sampling-logistics">
          <Button variant="outline" className="mt-4">
            Back to Sampling Logistics
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-2/sampling-logistics/${recordId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Sampling Record
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Sampling Record</h1>
        <p className="text-text-secondary mt-2">
          Update sampling logistics record details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="scheduled_date">Scheduled Date *</Label>
            <Input
              id="scheduled_date"
              type="date"
              required
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="sample_id">Sample ID</Label>
            <Input
              id="sample_id"
              value={formData.sample_id}
              onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="REMINDER_SENT">Reminder Sent</option>
              <option value="COLLECTION_SCHEDULED">Collection Scheduled</option>
              <option value="COLLECTED">Collected</option>
              <option value="COURIER_BOOKED">Courier Booked</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="LAB_RECEIVED">Lab Received</option>
              <option value="LAB_PROCESSING">Lab Processing</option>
              <option value="CERTIFICATE_RECEIVED">Certificate Received</option>
              <option value="EVIDENCE_LINKED">Evidence Linked</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-2/sampling-logistics/${recordId}`}>
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

