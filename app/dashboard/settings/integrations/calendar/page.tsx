'use client';

/**
 * Calendar Integration Settings Page
 * Connect Google Calendar and Outlook Calendar for deadline syncing
 */

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook';
  calendar_id?: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  calendars: Array<{
    id: string;
    summary?: string;
    name?: string;
    primary?: boolean;
    isDefaultCalendar?: boolean;
  }>;
  connected: boolean;
  error?: string;
}

export default function CalendarIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [googleIntegration, setGoogleIntegration] = useState<CalendarIntegration | null>(null);
  const [outlookIntegration, setOutlookIntegration] = useState<CalendarIntegration | null>(null);

  // Fetch integration status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ integrations: CalendarIntegration[] }>(
        '/integrations/calendar/status'
      );

      const google = response.data.integrations.find(i => i.provider === 'google');
      const outlook = response.data.integrations.find(i => i.provider === 'outlook');

      setGoogleIntegration(google || null);
      setOutlookIntegration(outlook || null);
    } catch (error: any) {
      console.error('Failed to fetch status:', error);
      toast.error('Failed to load calendar integrations');
    } finally {
      setLoading(false);
    }
  };

  // Check for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success) {
      toast.success(success);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh status
      fetchStatus();
    } else if (error) {
      toast.error(error);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      fetchStatus();
    }
  }, []);

  // Connect to calendar
  const handleConnect = (provider: 'google' | 'outlook') => {
    window.location.href = `/api/v1/integrations/calendar/authorize?provider=${provider}`;
  };

  // Disconnect calendar
  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'google' ? 'Google' : 'Outlook'} Calendar?`)) {
      return;
    }

    try {
      await apiClient.delete(`/integrations/calendar?provider=${provider}`);
      toast.success(`${provider === 'google' ? 'Google' : 'Outlook'} Calendar disconnected`);

      // Update state
      if (provider === 'google') {
        setGoogleIntegration(null);
      } else {
        setOutlookIntegration(null);
      }
    } catch (error: any) {
      toast.error(`Failed to disconnect: ${error.message}`);
    }
  };

  // Update calendar selection
  const handleCalendarChange = async (provider: 'google' | 'outlook', calendarId: string) => {
    try {
      await apiClient.patch('/integrations/calendar/status', {
        provider,
        calendar_id: calendarId,
      });

      toast.success('Calendar updated');
      fetchStatus();
    } catch (error: any) {
      toast.error(`Failed to update calendar: ${error.message}`);
    }
  };

  // Toggle auto-sync
  const handleToggleSync = async (provider: 'google' | 'outlook', enabled: boolean) => {
    try {
      await apiClient.patch('/integrations/calendar/status', {
        provider,
        sync_enabled: enabled,
      });

      toast.success(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
      fetchStatus();
    } catch (error: any) {
      toast.error(`Failed to toggle sync: ${error.message}`);
    }
  };

  // Manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await apiClient.post<{ synced: number; failed: number; message: string }>(
        '/integrations/calendar/sync',
        {}
      );

      toast.success(response.data.message);
      fetchStatus();
    } catch (error: any) {
      toast.error(`Failed to sync: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Calendar Integration</h1>
        <p className="text-text-secondary mt-2">
          Sync your compliance deadlines with Google Calendar or Outlook Calendar
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">About Calendar Sync</p>
            <p className="text-sm text-blue-700 mt-1">
              Connect your calendar to automatically sync compliance deadlines. Events will be created
              for all assigned deadlines with reminders at 7 days, 3 days, and 1 day before due date.
            </p>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M20,3H19V1H17V3H7V1H5V3H4C2.9,3,2,3.9,2,5v16c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V5C22,3.9,21.1,3,20,3z M20,21H4V10h16V21z M20,8H4V5h16V8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Google Calendar</h2>
              <p className="text-sm text-gray-500">Sync deadlines with your Google Calendar</p>
            </div>
          </div>
          {googleIntegration?.connected ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {!googleIntegration ? (
          <div className="text-center py-4">
            <Button onClick={() => handleConnect('google')}>Connect Google Calendar</Button>
          </div>
        ) : googleIntegration.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Error: {googleIntegration.error}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => handleConnect('google')}>
                Reconnect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDisconnect('google')}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Selection */}
            <div>
              <Label htmlFor="google-calendar">Select Calendar</Label>
              <select
                id="google-calendar"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={googleIntegration.calendar_id || ''}
                onChange={(e) => handleCalendarChange('google', e.target.value)}
              >
                <option value="">Select a calendar...</option>
                {googleIntegration.calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary || cal.name} {cal.primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-sync Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Auto-sync</p>
                <p className="text-sm text-gray-500">
                  Automatically sync new and updated deadlines
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSync('google', !googleIntegration.sync_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  googleIntegration.sync_enabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    googleIntegration.sync_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Last Synced */}
            {googleIntegration.last_synced_at && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(googleIntegration.last_synced_at).toLocaleString()}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect('google')}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Outlook Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M7,6H17A6,6 0 0,1 23,12A6,6 0 0,1 17,18H7C4.24,18 2,15.76 2,13C2,10.24 4.24,8 7,8H7.5C7.5,6.89 8.39,6 9.5,6H7M9.62,10C10.19,10.59 10.5,11.3 10.5,12C10.5,12.7 10.19,13.41 9.62,14C9.05,14.59 8.3,15 7.5,15C6.7,15 5.95,14.59 5.38,14C4.81,13.41 4.5,12.7 4.5,12C4.5,11.3 4.81,10.59 5.38,10C5.95,9.41 6.7,9 7.5,9C8.3,9 9.05,9.41 9.62,10Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Outlook Calendar</h2>
              <p className="text-sm text-gray-500">Sync deadlines with your Outlook Calendar</p>
            </div>
          </div>
          {outlookIntegration?.connected ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {!outlookIntegration ? (
          <div className="text-center py-4">
            <Button onClick={() => handleConnect('outlook')}>Connect Outlook Calendar</Button>
          </div>
        ) : outlookIntegration.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Error: {outlookIntegration.error}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => handleConnect('outlook')}>
                Reconnect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDisconnect('outlook')}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Selection */}
            <div>
              <Label htmlFor="outlook-calendar">Select Calendar</Label>
              <select
                id="outlook-calendar"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={outlookIntegration.calendar_id || ''}
                onChange={(e) => handleCalendarChange('outlook', e.target.value)}
              >
                <option value="">Select a calendar...</option>
                {outlookIntegration.calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name || cal.summary} {cal.isDefaultCalendar ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-sync Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Auto-sync</p>
                <p className="text-sm text-gray-500">
                  Automatically sync new and updated deadlines
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSync('outlook', !outlookIntegration.sync_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  outlookIntegration.sync_enabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    outlookIntegration.sync_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Last Synced */}
            {outlookIntegration.last_synced_at && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(outlookIntegration.last_synced_at).toLocaleString()}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect('outlook')}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Sync */}
      {(googleIntegration || outlookIntegration) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Sync</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manually sync all your assigned deadlines to connected calendars. This will create
            or update calendar events for all pending deadlines.
          </p>
          <Button
            onClick={handleSync}
            loading={syncing}
            disabled={syncing}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}
    </div>
  );
}
