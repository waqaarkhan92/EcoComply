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

interface Exemption {
  id: string;
  exemption_type: 'TESTING' | 'EMERGENCY_OPERATION' | 'MAINTENANCE' | 'OTHER';
  start_date: string;
  end_date: string | null;
  duration_hours: number | null;
  exemption_reason: string;
  evidence_ids: string[];
  compliance_verified: boolean;
  verification_notes: string | null;
}

export default function EditExemptionPage({
  params,
}: {
  params: Promise<{ exemptionId: string }>;
}) {
  const { exemptionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    exemption_type: 'TESTING' as 'TESTING' | 'EMERGENCY_OPERATION' | 'MAINTENANCE' | 'OTHER',
    start_date: '',
    end_date: '',
    duration_hours: '',
    exemption_reason: '',
    evidence_ids: '',
    compliance_verified: false,
    verification_notes: '',
  });

  const { data: exemption, isLoading } = useQuery<Exemption>({
    queryKey: ['exemption', exemptionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Exemption>(`/module-3/exemptions/${exemptionId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (exemption) {
      setFormData({
        exemption_type: exemption.exemption_type,
        start_date: exemption.start_date.split('T')[0],
        end_date: exemption.end_date ? exemption.end_date.split('T')[0] : '',
        duration_hours: exemption.duration_hours ? exemption.duration_hours.toString() : '',
        exemption_reason: exemption.exemption_reason,
        evidence_ids: exemption.evidence_ids?.join(', ') || '',
        compliance_verified: exemption.compliance_verified,
        verification_notes: exemption.verification_notes || '',
      });
    }
  }, [exemption]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-3/exemptions/${exemptionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exemption', exemptionId] });
      queryClient.invalidateQueries({ queryKey: ['module-3-exemptions'] });
      router.push(`/dashboard/module-3/exemptions/${exemptionId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update exemption:', error);
      alert('Failed to update exemption. Please try again.');
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
      verification_notes: formData.verification_notes || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading exemption...</div>;
  }

  if (!exemption) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Exemption not found</p>
        <Link href="/dashboard/module-3/exemptions">
          <Button variant="outline" className="mt-4">
            Back to Exemptions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-3/exemptions/${exemptionId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Exemption
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Exemption</h1>
        <p className="text-text-secondary mt-2">
          Update exemption details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="evidence_ids">Evidence IDs (comma-separated)</Label>
            <Input
              id="evidence_ids"
              value={formData.evidence_ids}
              onChange={(e) => setFormData({ ...formData, evidence_ids: e.target.value })}
              placeholder="UUID1, UUID2, UUID3"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="compliance_verified"
                checked={formData.compliance_verified}
                onChange={(e) => setFormData({ ...formData, compliance_verified: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="compliance_verified" className="cursor-pointer">
                Compliance verified
              </Label>
            </div>
          </div>

          {formData.compliance_verified && (
            <div className="md:col-span-2">
              <Label htmlFor="verification_notes">Verification Notes</Label>
              <textarea
                id="verification_notes"
                value={formData.verification_notes}
                onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-3/exemptions/${exemptionId}`}>
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

