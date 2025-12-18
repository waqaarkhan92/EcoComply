'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Bell, Mail, MessageSquare, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  email_daily_digest: boolean;
  email_weekly_summary: boolean;
  deadline_reminders: {
    one_day: boolean;
    three_days: boolean;
    seven_days: boolean;
  };
  notification_types: {
    compliance_alerts: boolean;
    evidence_reminders: boolean;
    deadline_approaching: boolean;
    deadline_overdue: boolean;
    obligation_completed: boolean;
    escalation_triggered: boolean;
    document_uploaded: boolean;
  };
}

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    slack_enabled: false,
    email_daily_digest: true,
    email_weekly_summary: true,
    deadline_reminders: {
      one_day: true,
      three_days: true,
      seven_days: false,
    },
    notification_types: {
      compliance_alerts: true,
      evidence_reminders: true,
      deadline_approaching: true,
      deadline_overdue: true,
      obligation_completed: false,
      escalation_triggered: true,
      document_uploaded: false,
    },
  });

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: NotificationSettings }>('/users/me/notification-preferences');
    },
  });

  // Update settings when data is fetched
  useEffect(() => {
    if (existingSettings?.data) {
      setSettings(existingSettings.data);
    }
  }, [existingSettings]);

  const updateSettings = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      return apiClient.put('/users/me/notification-preferences', data);
    },
    onSuccess: () => {
      toast.success('Notification settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update notification settings');
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <Checkbox
                checked={settings.email_enabled}
                onChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications in the app</p>
                </div>
              </div>
              <Checkbox
                checked={settings.in_app_enabled}
                onChange={(checked) => setSettings({ ...settings, in_app_enabled: checked })}
              />
            </div>
          </div>
        </div>

        {/* Deadline Reminders */}
        {settings.email_enabled && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Deadline Reminders
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choose when you want to receive reminders before deadlines
            </p>
            <div className="space-y-3">
              <Checkbox
                checked={settings.deadline_reminders.one_day}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    deadline_reminders: { ...settings.deadline_reminders, one_day: checked },
                  })
                }
                label="1 day before deadline"
              />
              <Checkbox
                checked={settings.deadline_reminders.three_days}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    deadline_reminders: { ...settings.deadline_reminders, three_days: checked },
                  })
                }
                label="3 days before deadline"
              />
              <Checkbox
                checked={settings.deadline_reminders.seven_days}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    deadline_reminders: { ...settings.deadline_reminders, seven_days: checked },
                  })
                }
                label="7 days before deadline"
              />
            </div>
          </div>
        )}

        {/* Email Preferences */}
        {settings.email_enabled && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preferences
            </h2>
            <div className="space-y-3">
              <Checkbox
                checked={settings.email_daily_digest}
                onChange={(checked) => setSettings({ ...settings, email_daily_digest: checked })}
                label="Daily Digest"
              />
              <p className="text-sm text-gray-500 ml-7 -mt-2">
                Receive a daily summary of notifications
              </p>
              <Checkbox
                checked={settings.email_weekly_summary}
                onChange={(checked) => setSettings({ ...settings, email_weekly_summary: checked })}
                label="Weekly Summary Reports"
              />
              <p className="text-sm text-gray-500 ml-7 -mt-2">
                Receive a weekly summary of compliance status
              </p>
            </div>
          </div>
        )}

        {/* Notification Types */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose which types of notifications you want to receive
          </p>
          <div className="space-y-3">
            <Checkbox
              checked={settings.notification_types.compliance_alerts}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, compliance_alerts: checked },
                })
              }
              label="Compliance Alerts"
            />
            <Checkbox
              checked={settings.notification_types.evidence_reminders}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, evidence_reminders: checked },
                })
              }
              label="Evidence Reminders"
            />
            <Checkbox
              checked={settings.notification_types.deadline_approaching}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, deadline_approaching: checked },
                })
              }
              label="Deadline Approaching"
            />
            <Checkbox
              checked={settings.notification_types.deadline_overdue}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, deadline_overdue: checked },
                })
              }
              label="Deadline Overdue"
            />
            <Checkbox
              checked={settings.notification_types.obligation_completed}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, obligation_completed: checked },
                })
              }
              label="Obligation Completed"
            />
            <Checkbox
              checked={settings.notification_types.escalation_triggered}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, escalation_triggered: checked },
                })
              }
              label="Escalation Triggered"
            />
            <Checkbox
              checked={settings.notification_types.document_uploaded}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  notification_types: { ...settings.notification_types, document_uploaded: checked },
                })
              }
              label="Document Uploaded"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={updateSettings.isPending}
            disabled={updateSettings.isPending}
            icon={<Save className="h-4 w-4" />}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

