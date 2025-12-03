'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('STAFF');
  const [isActive, setIsActive] = useState(true);

  const { data: userData, isLoading } = useQuery<{ data: User }>({
    queryKey: ['user', userId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: User }>(`/users/${userId}`);
    },
  });

  useEffect(() => {
    if (userData?.data) {
      setFullName(userData.data.full_name);
      setRole(userData.data.role);
      setIsActive(userData.data.is_active);
    }
  }, [userData]);

  const updateUser = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/users/${userId}`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/users/${userId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      full_name: fullName,
      role,
      is_active: isActive,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/users/${userId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-gray-600 mt-1">Update user information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
            <option value="CONSULTANT">Consultant</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            id="is_active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="is_active" className="ml-2">
            Active
          </Label>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/users/${userId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateUser.isPending}>
            {updateUser.isPending ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      </form>
    </div>
  );
}

