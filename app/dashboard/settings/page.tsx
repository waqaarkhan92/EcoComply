'use client';

import { useState } from 'react';
import { Settings, Calendar, Webhook, Bell, User, Shield } from 'lucide-react';
import { CalendarSettings, WebhookManagement } from '@/components/enhanced-features';
import Link from 'next/link';

type SettingsTab = 'general' | 'calendar' | 'webhooks' | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Settings
              </h2>
              <p className="text-gray-500">Account settings options will be available here.</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </h2>
              <p className="text-gray-500">Security settings options will be available here.</p>
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

