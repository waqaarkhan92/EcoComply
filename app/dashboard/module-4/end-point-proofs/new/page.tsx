'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface ConsignmentNote {
  id: string;
  consignment_note_number: string;
  consignment_date: string;
}

export default function NewEndPointProofPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    consignment_note_id: '',
    end_point_type: 'DISPOSAL' as 'DESTRUCTION' | 'RECYCLING' | 'RECOVERY' | 'DISPOSAL',
    end_point_facility: '',
    completion_date: new Date().toISOString().split('T')[0],
    certificate_reference: '',
    is_verified: false,
    verification_notes: '',
  });

  // Fetch consignment notes for dropdown
  const { data: consignmentNotesData } = useQuery({
    queryKey: ['consignment-notes-list'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<{ data: ConsignmentNote[] }>('/module-4/consignment-notes?limit=100');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-4/end-point-proofs', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-4-end-point-proofs'] });
      router.push(`/dashboard/module-4/end-point-proofs/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create end-point proof:', error);
      alert('Failed to create end-point proof. Please try again.');
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
      certificate_reference: formData.certificate_reference || null,
      verification_notes: formData.verification_notes || null,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-4/end-point-proofs"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to End-Point Proofs
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New End-Point Proof</h1>
        <p className="text-text-secondary mt-2">
          Record end-point proof for waste disposal, recycling, or recovery
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="consignment_note_id">Consignment Note *</Label>
            <select
              id="consignment_note_id"
              required
              value={formData.consignment_note_id}
              onChange={(e) => setFormData({ ...formData, consignment_note_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="">Select a consignment note</option>
              {consignmentNotesData?.data.map((note: ConsignmentNote) => (
                <option key={note.id} value={note.id}>
                  {note.consignment_note_number} - {new Date(note.consignment_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="end_point_type">End-Point Type *</Label>
            <select
              id="end_point_type"
              required
              value={formData.end_point_type}
              onChange={(e) => setFormData({ ...formData, end_point_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DISPOSAL">Disposal</option>
              <option value="DESTRUCTION">Destruction</option>
              <option value="RECYCLING">Recycling</option>
              <option value="RECOVERY">Recovery</option>
            </select>
          </div>

          <div>
            <Label htmlFor="end_point_facility">End-Point Facility *</Label>
            <Input
              id="end_point_facility"
              required
              value={formData.end_point_facility}
              onChange={(e) => setFormData({ ...formData, end_point_facility: e.target.value })}
              placeholder="e.g., Waste Treatment Facility Name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="completion_date">Completion Date *</Label>
            <Input
              id="completion_date"
              type="date"
              required
              value={formData.completion_date}
              onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="certificate_reference">Certificate Reference</Label>
            <Input
              id="certificate_reference"
              value={formData.certificate_reference}
              onChange={(e) => setFormData({ ...formData, certificate_reference: e.target.value })}
              placeholder="e.g., CERT-2024-001"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="verification_notes">Verification Notes</Label>
            <textarea
              id="verification_notes"
              value={formData.verification_notes}
              onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Notes about verification..."
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_verified"
                checked={formData.is_verified}
                onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_verified" className="cursor-pointer">
                Verified (proof has been verified)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-4/end-point-proofs">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create End-Point Proof'}
          </Button>
        </div>
      </form>
    </div>
  );
}

