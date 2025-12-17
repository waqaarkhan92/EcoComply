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

interface EnforcementNotice {
  id: string;
  notice_number: string;
  notice_date: string;
  notice_type: 'WARNING' | 'NOTICE' | 'VARIATION' | 'SUSPENSION' | 'REVOCATION' | 'PROSECUTION';
  regulator: string;
  subject: string;
  description: string;
  requirements: string | null;
  deadline_date: string | null;
  document_id: string | null;
}

export default function EditEnforcementNoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    notice_number: '',
    notice_date: '',
    notice_type: 'WARNING' as 'WARNING' | 'NOTICE' | 'VARIATION' | 'SUSPENSION' | 'REVOCATION' | 'PROSECUTION',
    regulator: '',
    subject: '',
    description: '',
    requirements: '',
    deadline_date: '',
  });

  const { data: notice, isLoading } = useQuery({
    queryKey: ['enforcement-notice', noticeId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<EnforcementNotice>(`/module-1/enforcement-notices/${noticeId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (notice) {
      setFormData({
        notice_number: notice.notice_number,
        notice_date: notice.notice_date.split('T')[0],
        notice_type: notice.notice_type,
        regulator: notice.regulator,
        subject: notice.subject,
        description: notice.description,
        requirements: notice.requirements || '',
        deadline_date: notice.deadline_date ? notice.deadline_date.split('T')[0] : '',
      });
    }
  }, [notice]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/enforcement-notices/${noticeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enforcement-notice', noticeId] });
      queryClient.invalidateQueries({ queryKey: ['module-1-enforcement-notices'] });
      router.push(`/dashboard/module-1/enforcement-notices/${noticeId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update enforcement notice:', error);
      alert('Failed to update enforcement notice. Please try again.');
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
      requirements: formData.requirements || undefined,
      deadline_date: formData.deadline_date || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading enforcement notice...</div>;
  }

  if (!notice) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Enforcement notice not found</p>
        <Link href="/dashboard/module-1/enforcement-notices">
          <Button variant="outline" className="mt-4">
            Back to Enforcement Notices
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/enforcement-notices/${noticeId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Enforcement Notice
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Enforcement Notice</h1>
        <p className="text-text-secondary mt-2">
          Update enforcement notice details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="notice_number">Notice Number *</Label>
            <Input
              id="notice_number"
              required
              value={formData.notice_number}
              onChange={(e) => setFormData({ ...formData, notice_number: e.target.value })}
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
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/enforcement-notices/${noticeId}`}>
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

