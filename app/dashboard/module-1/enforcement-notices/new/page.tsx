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

export default function NewEnforcementNoticePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    site_id: '',
    document_id: '',
    notice_number: '',
    notice_date: '',
    notice_type: 'WARNING' as 'WARNING' | 'NOTICE' | 'VARIATION' | 'SUSPENSION' | 'REVOCATION' | 'PROSECUTION',
    regulator: '',
    subject: '',
    description: '',
    requirements: '',
    deadline_date: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/enforcement-notices', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-1-enforcement-notices'] });
      router.push(`/dashboard/module-1/enforcement-notices/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create enforcement notice:', error);
      alert('Failed to create enforcement notice. Please try again.');
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
      document_id: formData.document_id || undefined,
      requirements: formData.requirements || undefined,
      deadline_date: formData.deadline_date || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/enforcement-notices"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Enforcement Notices
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Enforcement Notice</h1>
        <p className="text-text-secondary mt-2">
          Record a new enforcement notice from a regulator
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="site_id">Site *</Label>
            <select
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="">Select a site</option>
              {/* TODO: Fetch sites from API */}
            </select>
          </div>

          <div>
            <Label htmlFor="notice_number">Notice Number *</Label>
            <Input
              id="notice_number"
              required
              value={formData.notice_number}
              onChange={(e) => setFormData({ ...formData, notice_number: e.target.value })}
              placeholder="e.g., EN-2024-001"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notice_date">Notice Date *</Label>
            <Input
              id="notice_date"
              type="date"
              required
              value={formData.notice_date}
              onChange={(e) => setFormData({ ...formData, notice_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notice_type">Notice Type *</Label>
            <select
              id="notice_type"
              required
              value={formData.notice_type}
              onChange={(e) => setFormData({ ...formData, notice_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="WARNING">Warning</option>
              <option value="NOTICE">Notice</option>
              <option value="VARIATION">Variation</option>
              <option value="SUSPENSION">Suspension</option>
              <option value="REVOCATION">Revocation</option>
              <option value="PROSECUTION">Prosecution</option>
            </select>
          </div>

          <div>
            <Label htmlFor="regulator">Regulator *</Label>
            <Input
              id="regulator"
              required
              value={formData.regulator}
              onChange={(e) => setFormData({ ...formData, regulator: e.target.value })}
              placeholder="e.g., Environment Agency"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief subject line"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Detailed description of the enforcement notice..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="requirements">Requirements</Label>
            <textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Specific requirements or actions required..."
            />
          </div>

          <div>
            <Label htmlFor="deadline_date">Deadline Date</Label>
            <Input
              id="deadline_date"
              type="date"
              value={formData.deadline_date}
              onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="document_id">Related Document ID (optional)</Label>
            <Input
              id="document_id"
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              placeholder="UUID of related document"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/enforcement-notices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Enforcement Notice'}
          </Button>
        </div>
      </form>
    </div>
  );
}

