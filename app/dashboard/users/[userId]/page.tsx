'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, User } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: userData, isLoading } = useQuery<{ data: User }>({
    queryKey: ['user', userId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: User }>(`/users/${userId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading user...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">User not found</div>
      </div>
    );
  }

  const user = userData.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">User Details</h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
        </div>
        <Link href={`/dashboard/users/${userId}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <div className="mt-1 flex items-center">
              <User className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{user.full_name || 'N/A'}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <div className="mt-1 text-sm text-gray-900">{user.email}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Role</label>
            <div className="mt-1 text-sm text-gray-900">{user.role}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Created At</label>
            <div className="mt-1 text-sm text-gray-900">
              {new Date(user.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

