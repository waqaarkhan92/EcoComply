'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Shield, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ConditionPermission {
  id: string;
  user_id: string;
  document_id: string;
  condition_reference: string;
  permission_type: 'VIEW' | 'EDIT' | 'MANAGE' | 'FULL';
  is_active: boolean;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  users: { id: string; email: string; full_name: string | null };
  documents: { id: string; document_name: string };
  created_at: string;
  updated_at: string;
}

const permissionTypeColors: Record<string, { bg: string; text: string }> = {
  VIEW: { bg: 'bg-blue-50', text: 'text-blue-700' },
  EDIT: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  MANAGE: { bg: 'bg-orange-50', text: 'text-orange-700' },
  FULL: { bg: 'bg-green-50', text: 'text-green-700' },
};

export default function ConditionPermissionDetailPage({
  params,
}: {
  params: Promise<{ permissionId: string }>;
}) {
  const { permissionId } = use(params);
  const queryClient = useQueryClient();

  const { data: permission, isLoading } = useQuery({
    queryKey: ['condition-permission', permissionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConditionPermission>(`/module-1/condition-permissions/${permissionId}`);
      return response.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.put(`/module-1/condition-permissions/${permissionId}`, { is_active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condition-permission', permissionId] });
      queryClient.invalidateQueries({ queryKey: ['condition-permissions'] });
    },
  });

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

  const typeStyle = permissionTypeColors[permission.permission_type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/condition-permissions"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Condition Permissions
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Condition Permission</h1>
          <p className="text-text-secondary mt-2">
            {permission.users.full_name || permission.users.email} • {permission.documents.document_name}
          </p>
        </div>
        <div className="flex gap-2">
          {permission.is_active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to revoke this permission?')) {
                  revokeMutation.mutate();
                }
              }}
              disabled={revokeMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Revoke
            </Button>
          )}
          <Link href={`/dashboard/module-1/condition-permissions/${permissionId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${permission.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Shield className={`w-6 h-6 ${permission.is_active ? 'text-green-700' : 'text-gray-700'}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Status: {permission.is_active ? 'Active' : 'Revoked'}
            </p>
            {permission.revoked_at && (
              <p className="text-sm text-gray-600 mt-1">
                Revoked: {new Date(permission.revoked_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Permission Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Permission Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">User</p>
            <p className="text-text-primary font-medium">{permission.users.full_name || permission.users.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Document</p>
            <p className="text-text-primary">{permission.documents.document_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Condition Reference</p>
            <p className="text-text-primary font-mono">{permission.condition_reference}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Permission Type</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
              {permission.permission_type}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Granted</p>
            <p className="text-text-primary">
              {new Date(permission.granted_at).toLocaleDateString()}
            </p>
          </div>

          {permission.revoked_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Revoked</p>
              <p className="text-text-primary">
                {new Date(permission.revoked_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(permission.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(permission.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

