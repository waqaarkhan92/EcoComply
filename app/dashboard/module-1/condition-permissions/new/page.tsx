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

export default function NewConditionPermissionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    document_id: '',
    condition_reference: '',
    permission_type: 'VIEW',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/condition-permissions', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['condition-permissions'] });
      router.push(`/dashboard/module-1/condition-permissions/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create condition permission:', error);
      alert('Failed to create condition permission. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Get site_id from document (would need to fetch document first, but for now using a placeholder)
    // In a real implementation, you'd fetch the document to get site_id
    const submitData = {
      ...formData,
      site_id: '', // This should be fetched from document
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/condition-permissions"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Condition Permissions
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Condition Permission</h1>
        <p className="text-text-secondary mt-2">
          Grant condition-level permission to a user
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="user_id">User ID *</Label>
            <Input
              id="user_id"
              required
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              placeholder="UUID of the user"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="document_id">Document ID *</Label>
            <Input
              id="document_id"
              required
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              placeholder="UUID of the document"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="condition_reference">Condition Reference *</Label>
            <Input
              id="condition_reference"
              required
              value={formData.condition_reference}
              onChange={(e) => setFormData({ ...formData, condition_reference: e.target.value })}
              placeholder="e.g., Condition 2.3"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="permission_type">Permission Type *</Label>
            <select
              id="permission_type"
              required
              value={formData.permission_type}
              onChange={(e) => setFormData({ ...formData, permission_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="VIEW">View</option>
              <option value="EDIT">Edit</option>
              <option value="MANAGE">Manage</option>
              <option value="FULL">Full</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/condition-permissions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Permission'}
          </Button>
        </div>
      </form>
    </div>
  );
}

