'use client';

import { useState, useEffect } from 'react';
import { Settings, Calendar, Webhook, Bell, User, Shield, Mail, Building2, CheckCircle, KeyRound, Upload, Moon, Sun, Key, Copy, Trash2, Plus, MessageSquare } from 'lucide-react';
import { CalendarSettings, WebhookManagement } from '@/components/enhanced-features';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';

type SettingsTab = 'general' | 'calendar' | 'webhooks' | 'notifications' | 'api-keys';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { user, company, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // API Key state
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast.success(`Theme changed to ${newTheme} mode`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; avatar?: File }) => {
      if (data.avatar) {
        const formData = new FormData();
        formData.append('full_name', data.full_name);
        formData.append('avatar', data.avatar);
        return apiClient.upload('/users/me', formData);
      } else {
        return apiClient.patch('/users/me', { full_name: data.full_name });
      }
    },
    onSuccess: (response) => {
      toast.success('Profile updated successfully');
      if (response.data) {
        updateUser(response.data);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      full_name: fullName,
      avatar: avatarFile || undefined,
    });
  };

  // API Keys queries and mutations
  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      return apiClient.get<ApiKey[]>('/api-keys');
    },
    enabled: activeTab === 'api-keys',
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiClient.post<{ key: string; id: string }>('/api-keys', { name });
    },
    onSuccess: (response) => {
      toast.success('API key created successfully');
      setGeneratedApiKey(response.data.key);
      setNewApiKeyName('');
      setShowNewApiKeyDialog(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create API key');
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/api-keys/${id}`);
    },
    onSuccess: () => {
      toast.success('API key revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke API key');
    },
  });

  const handleCreateApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    createApiKeyMutation.mutate(newApiKeyName);
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const handleDeleteApiKey = (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke the API key "${name}"? This action cannot be undone.`)) {
      deleteApiKeyMutation.mutate(id);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'calendar' as const, label: 'Calendar & iCal', icon: Calendar },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'api-keys' as const, label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-2">Manage your account and application settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Profile Editing */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" aria-hidden="true" />
                Profile Information
              </h2>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary-dark transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Max 2MB
                    </p>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        rightIcon={
                          user?.email_verified ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : undefined
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={updateProfileMutation.isPending}
                    disabled={updateProfileMutation.isPending}
                  >
                    Save Profile
                  </Button>
                </div>
              </form>
            </div>

            {/* Theme Preferences */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5" aria-hidden="true" />
                )}
                Display Preferences
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? (
                      <Sun className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <Moon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Dark Mode</p>
                      <p className="text-sm text-gray-500">
                        {theme === 'dark' ? 'Dark mode is enabled' : 'Switch to dark mode'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      theme === 'dark' ? 'bg-primary' : 'bg-gray-200'
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" aria-hidden="true" />
                Organization
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-gray-500">Organization Name</p>
                    <p className="font-medium text-gray-900">{company?.name || 'Not set'}</p>
                  </div>
                  {company?.subscription_tier && (
                    <span className="ml-auto px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full capitalize">
                      {company.subscription_tier} Plan
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" aria-hidden="true" />
                Security
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-500">Change your account password</p>
                    </div>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    Change Password
                  </Link>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    Your account is secured with email-based authentication.
                    For additional security, ensure you use a strong, unique password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* OAuth Calendar Integration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar Sync</h2>
              <p className="text-gray-500 mb-4">
                Connect Google Calendar or Outlook Calendar to automatically sync your compliance deadlines.
              </p>
              <Link
                href="/dashboard/settings/integrations/calendar"
                className="text-primary hover:underline inline-flex items-center gap-2"
              >
                Manage Calendar Integrations →
              </Link>
            </div>

            {/* iCal Feeds */}
            <CalendarSettings />
          </div>
        )}

        {activeTab === 'webhooks' && (
          <WebhookManagement />
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email & In-App Notifications
              </h2>
              <p className="text-gray-500 mb-4">
                Configure your email and in-app notification preferences.
              </p>
              <Link
                href="/dashboard/settings/notifications"
                className="text-primary hover:underline inline-flex items-center gap-2"
              >
                Go to Notification Settings →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Notifications
              </h2>
              <p className="text-gray-500 mb-4">
                Set up SMS alerts for critical compliance events and deadlines.
              </p>
              <Link
                href="/dashboard/settings/sms"
                className="text-primary hover:underline inline-flex items-center gap-2"
              >
                Go to SMS Settings →
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            {/* API Keys List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="w-5 h-5" aria-hidden="true" />
                    API Keys
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage API keys for programmatic access to your EcoComply account
                  </p>
                </div>
                <Button
                  onClick={() => setShowNewApiKeyDialog(true)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create API Key
                </Button>
              </div>

              {apiKeysLoading ? (
                <div className="text-center py-8 text-gray-500">Loading API keys...</div>
              ) : apiKeysData?.data && apiKeysData.data.length > 0 ? (
                <div className="space-y-3">
                  {apiKeysData.data.map((apiKey: ApiKey) => (
                    <div
                      key={apiKey.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{apiKey.name}</p>
                            <p className="text-sm text-gray-500 font-mono">
                              ••••••••••••{apiKey.key.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                          {apiKey.last_used_at && (
                            <span>
                              Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyApiKey(apiKey.key)}
                          icon={<Copy className="w-4 h-4" />}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                          icon={<Trash2 className="w-4 h-4" />}
                          disabled={deleteApiKeyMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No API keys yet</p>
                  <Button
                    onClick={() => setShowNewApiKeyDialog(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Create Your First API Key
                  </Button>
                </div>
              )}
            </div>

            {/* API Documentation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">API Documentation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Use API keys to authenticate requests to the EcoComply API. Include the key in the
                Authorization header as a Bearer token.
              </p>
              <div className="bg-white rounded border border-gray-200 p-3 font-mono text-xs text-gray-700">
                curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; \<br />
                &nbsp;&nbsp;https://api.ecocomply.com/v1/obligations
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create API Key Dialog */}
      {showNewApiKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key-name">API Key Name</Label>
                <Input
                  id="api-key-name"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="e.g., Production Server"
                  helperText="Choose a descriptive name to identify this API key"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewApiKeyDialog(false);
                    setNewApiKeyName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  loading={createApiKeyMutation.isPending}
                  disabled={createApiKeyMutation.isPending || !newApiKeyName.trim()}
                >
                  Create API Key
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated API Key Dialog */}
      {generatedApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API Key Created</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  Important: Save this API key now
                </p>
                <p className="text-xs text-yellow-700">
                  You won&apos;t be able to see this key again. Make sure to copy it and store it securely.
                </p>
              </div>
              <div>
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input value={generatedApiKey} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    onClick={() => handleCopyApiKey(generatedApiKey)}
                    icon={<Copy className="w-4 h-4" />}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setGeneratedApiKey(null)}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

