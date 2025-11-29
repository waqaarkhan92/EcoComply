'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  notification_type: string;
  subject: string;
  body_text: string;
  status: string;
  read_at: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
}

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const notificationId = params.notificationId as string;

  const { data: notificationData, isLoading } = useQuery<{ data: Notification }>({
    queryKey: ['notification', notificationId],
    queryFn: async () => {
      return apiClient.get<{ data: Notification }>(`/notifications/${notificationId}`);
    },
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      return apiClient.put(`/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  // Mark as read when opened
  useQuery({
    queryKey: ['mark-read', notificationId],
    queryFn: async () => {
      if (notificationData?.data && !notificationData.data.read_at) {
        await markAsRead.mutateAsync();
      }
    },
    enabled: !!notificationData?.data && !notificationData.data.read_at,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading notification...</div>
      </div>
    );
  }

  if (!notificationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Notification not found</div>
      </div>
    );
  }

  const notification = notificationData.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notification</h1>
          <p className="text-gray-600 mt-1">{notification.notification_type}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start space-x-4 mb-6">
          <Bell className="h-6 w-6 text-gray-400 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{notification.subject}</h2>
            <div className="mt-2 text-sm text-gray-500">
              {new Date(notification.created_at).toLocaleString()}
            </div>
          </div>
          {notification.read_at && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Read
            </span>
          )}
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-900 whitespace-pre-wrap">{notification.body_text}</p>
        </div>

        {notification.entity_type && notification.entity_id && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/dashboard/${notification.entity_type}/${notification.entity_id}`}
            >
              <Button variant="outline">
                View Related Item
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

