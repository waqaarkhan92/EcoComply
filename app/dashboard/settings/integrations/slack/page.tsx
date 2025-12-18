'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Settings, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';

interface SlackIntegration {
  connected: boolean;
  team_id?: string;
  team_name?: string;
  default_channel_id?: string;
  default_channel_name?: string;
  notification_settings?: {
    deadline_reminders: boolean;
    overdue_alerts: boolean;
    compliance_alerts: boolean;
    evidence_uploads: boolean;
  };
  connected_at?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
}

export default function SlackIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [notificationSettings, setNotificationSettings] = useState({
    deadline_reminders: true,
    overdue_alerts: true,
    compliance_alerts: true,
    evidence_uploads: true,
  });

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'connected') {
      toast.success('Slack connected successfully!');
      // Remove query params
      router.replace('/dashboard/settings/integrations/slack');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Slack authorization was cancelled',
        invalid_callback: 'Invalid OAuth callback',
        config_error: 'Slack integration is not properly configured',
        token_exchange_failed: 'Failed to exchange OAuth token',
        database_error: 'Failed to save integration',
        unexpected_error: 'An unexpected error occurred',
      };
      toast.error(errorMessages[error] || 'Failed to connect Slack');
      router.replace('/dashboard/settings/integrations/slack');
    }
  }, [searchParams, router]);

  // Fetch integration status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['slack-status'],
    queryFn: async () => {
      return apiClient.get<SlackIntegration>('/integrations/slack/status');
    },
  });

  // Fetch available channels (only when connected)
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['slack-channels'],
    queryFn: async () => {
      return apiClient.get<{ channels: SlackChannel[] }>('/integrations/slack/channels');
    },
    enabled: statusData?.data?.connected || false,
  });

  // Initialize settings when data is loaded
  useEffect(() => {
    if (statusData && statusData.data && statusData.data.connected) {
      if (statusData.data.default_channel_id) {
        setSelectedChannelId(statusData.data.default_channel_id);
      }
      if (statusData.data.notification_settings) {
        setNotificationSettings(statusData.data.notification_settings);
      }
    }
  }, [statusData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      default_channel_id?: string;
      default_channel_name?: string;
      notification_settings?: any;
    }) => {
      return apiClient.patch('/integrations/slack', data);
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['slack-status'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete('/integrations/slack');
    },
    onSuccess: () => {
      toast.success('Slack disconnected successfully');
      queryClient.invalidateQueries({ queryKey: ['slack-status'] });
      setSelectedChannelId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect Slack');
    },
  });

  const handleConnect = () => {
    window.location.href = '/api/v1/integrations/slack/authorize';
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Slack? This will stop all notifications to your Slack workspace.')) {
      disconnectMutation.mutate();
    }
  };

  const handleSaveSettings = () => {
    const selectedChannel = channelsData?.data?.channels.find(
      (c) => c.id === selectedChannelId
    );

    updateSettingsMutation.mutate({
      default_channel_id: selectedChannelId || undefined,
      default_channel_name: selectedChannel?.name || undefined,
      notification_settings: notificationSettings,
    });
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isConnected = statusData?.data?.connected || false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Slack Integration</h1>
        <p className="text-text-secondary mt-2">
          Connect EcoComply to your Slack workspace to receive compliance notifications
        </p>
      </div>

      {statusLoading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-gray-500 mt-4">Loading integration status...</p>
        </div>
      ) : (
        <>
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
              Connection Status
            </h2>

            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Connected to Slack</p>
                    <p className="text-sm text-green-700 mt-1">
                      Workspace: <strong>{statusData?.data?.team_name}</strong>
                    </p>
                    {statusData?.data?.default_channel_name && (
                      <p className="text-sm text-green-700">
                        Default channel: <strong>#{statusData.data.default_channel_name}</strong>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                    loading={disconnectMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Not Connected</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Connect your Slack workspace to receive real-time compliance notifications
                    </p>
                  </div>
                  <Button onClick={handleConnect}>
                    Connect to Slack
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">What you'll get:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Real-time deadline reminders</li>
                        <li>Overdue obligation alerts</li>
                        <li>Compliance issue notifications</li>
                        <li>Evidence upload notifications</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Channel & Notification Settings */}
          {isConnected && (
            <>
              {/* Channel Selection */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" aria-hidden="true" />
                  Channel Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="slack-channel">Default Notification Channel</Label>
                    <select
                      id="slack-channel"
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={channelsLoading}
                    >
                      <option value="">Select a channel...</option>
                      {channelsData?.data?.channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.is_private ? '🔒' : '#'} {channel.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      All compliance notifications will be sent to this channel
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Deadline Reminders</p>
                      <p className="text-sm text-gray-500">
                        Notify when deadlines are approaching
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle('deadline_reminders')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        notificationSettings.deadline_reminders ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      aria-label="Toggle deadline reminders"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.deadline_reminders ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Overdue Alerts</p>
                      <p className="text-sm text-gray-500">
                        Notify when obligations become overdue
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle('overdue_alerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        notificationSettings.overdue_alerts ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      aria-label="Toggle overdue alerts"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.overdue_alerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Compliance Alerts</p>
                      <p className="text-sm text-gray-500">
                        Notify about compliance issues and violations
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle('compliance_alerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        notificationSettings.compliance_alerts ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      aria-label="Toggle compliance alerts"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.compliance_alerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Evidence Uploads</p>
                      <p className="text-sm text-gray-500">
                        Notify when new evidence is uploaded
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle('evidence_uploads')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        notificationSettings.evidence_uploads ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      aria-label="Toggle evidence upload notifications"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.evidence_uploads ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleSaveSettings}
                    loading={updateSettingsMutation.isPending}
                    disabled={updateSettingsMutation.isPending || !selectedChannelId}
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
