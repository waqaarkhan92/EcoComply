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

interface ConditionPermission {
  id: string;
  permission_type: 'VIEW' | 'EDIT' | 'MANAGE' | 'FULL';
  is_active: boolean;
}

export default function EditConditionPermissionPage({
  params,
}: {
  params: Promise<{ permissionId: string }>;
}) {
  const { permissionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    permission_type: 'VIEW' as 'VIEW' | 'EDIT' | 'MANAGE' | 'FULL',
  });

  const { data: permission, isLoading } = useQuery({
    queryKey: ['condition-permission', permissionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConditionPermission>(`/module-1/condition-permissions/${permissionId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (permission) {
      setFormData({
        permission_type: permission.permission_type,
      });
    }
  }, [permission]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/condition-permissions/${permissionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condition-permission', permissionId] });
      queryClient.invalidateQueries({ queryKey: ['condition-permissions'] });
      router.push(`/dashboard/module-1/condition-permissions/${permissionId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update condition permission:', error);
      alert('Failed to update condition permission. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading condition permission...</div>;
  }

  if (!permission) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Condition permission not found</p>
        <Link href="/dashboard/module-1/condition-permissions">
          <Button variant="outline" className="mt-4">
            Back to Condition Permissions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/condition-permissions/${permissionId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Permission
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Condition Permission</h1>
        <p className="text-text-secondary mt-2">
          Update condition permission details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="permission_type">Permission Type *</Label>
            <select
              id="permission_type"
              required
              value={formData.permission_type}
              onChange={(e) => setFormData({ ...formData, permission_type: e.target.value as any })}
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
          <Link href={`/dashboard/module-1/condition-permissions/${permissionId}`}>
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

