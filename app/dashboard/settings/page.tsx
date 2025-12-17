'use client';

import { useState } from 'react';
import { Settings, Calendar, Webhook, Bell, User, Shield, Mail, Building2, CheckCircle, KeyRound } from 'lucide-react';
import { CalendarSettings, WebhookManagement } from '@/components/enhanced-features';
import { useAuthStore } from '@/lib/store/auth-store';
import Link from 'next/link';

type SettingsTab = 'general' | 'calendar' | 'webhooks' | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { user, company } = useAuthStore();

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'calendar' as const, label: 'Calendar & iCal', icon: Calendar },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
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
            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" aria-hidden="true" />
                Account Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{user?.full_name || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user?.email || 'Not set'}</p>
                  </div>
                  {user?.email_verified && (
                    <span className="ml-auto flex items-center gap-1 text-sm text-success">
                      <CheckCircle className="w-4 h-4" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-gray-500">Organization</p>
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
          <CalendarSettings />
        )}

        {activeTab === 'webhooks' && (
          <WebhookManagement />
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            <p className="text-gray-500 mb-4">
              Configure your notification preferences in the dedicated notifications settings page.
            </p>
            <Link
              href="/dashboard/settings/notifications"
              className="text-primary hover:underline"
            >
              Go to Notification Settings →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

