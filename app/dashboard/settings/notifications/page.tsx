'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Mail, MessageSquare, Save } from 'lucide-react';
import Link from 'next/link';

interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  email_daily_digest: boolean;
  email_weekly_summary: boolean;
  notification_types: {
    deadline_approaching: boolean;
    deadline_overdue: boolean;
    obligation_completed: boolean;
    escalation_triggered: boolean;
    document_uploaded: boolean;
  };
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    slack_enabled: false,
    email_daily_digest: true,
    email_weekly_summary: true,
    notification_types: {
      deadline_approaching: true,
      deadline_overdue: true,
      obligation_completed: false,
      escalation_triggered: true,
      document_uploaded: false,
    },
  });

  const { data: existingSettings, isLoading } = useQuery<{ data: NotificationSettings }>({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: NotificationSettings }>('/settings/notifications');
    },
    onSuccess: (data) => {
      if (data?.data) {
        setSettings(data.data);
      }
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      return apiClient.put('/settings/notifications', data);
    },
    onSuccess: () => {
      alert('Notification settings updated successfully');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-gray-600 mt-1">Configure how you receive notifications</p>
        </div>
      </div>

      {/* Notification Channels */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Notification Channels</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">In-App</p>
                  <p className="text-sm text-gray-500">Receive notifications in the app</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.in_app_enabled}
                onChange={(e) => setSettings({ ...settings, in_app_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sms_enabled}
                onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Email Preferences */}
        {settings.email_enabled && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Email Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-gray-500">Receive a daily summary of notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_daily_digest}
                  onChange={(e) => setSettings({ ...settings, email_daily_digest: e.target.checked })}
                  className="rounded border-gray-300"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Summary</p>
                  <p className="text-sm text-gray-500">Receive a weekly summary of compliance status</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_weekly_summary}
                  onChange={(e) => setSettings({ ...settings, email_weekly_summary: e.target.checked })}
                  className="rounded border-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notification Types */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
          <div className="space-y-4">
            {Object.entries(settings.notification_types).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                </div>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notification_types: { ...settings.notification_types, [key]: e.target.checked },
                    })
                  }
                  className="rounded border-gray-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending} style={{ backgroundColor: '#026A67' }}>
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

