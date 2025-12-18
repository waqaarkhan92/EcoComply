'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  MessageSquare,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface SMSSettings {
  phone_number: string | null;
  phone_verified: boolean;
  sms_enabled: boolean;
  preferences: {
    critical_alerts: boolean;
    overdue_notifications: boolean;
    breach_alerts: boolean;
  };
}

export default function SMSSettingsPage() {
  const queryClient = useQueryClient();

  // State for phone verification
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);

  // Fetch SMS settings
  const { data: smsSettings, isLoading } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async (): Promise<SMSSettings> => {
      const response = await apiClient.get<SMSSettings>('/settings/sms');
      return response.data;
    },
  });

  // Send verification code mutation
  const sendVerificationMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiClient.post<{ success: boolean; expires_at: string }>('/users/phone/verify', {
        phone_number: phone,
      });
    },
    onSuccess: (response) => {
      toast.success('Verification code sent to your phone');
      setShowVerificationInput(true);
      setVerificationExpiresAt(response.data.expires_at);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send verification code');
    },
  });

  // Confirm verification mutation
  const confirmVerificationMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiClient.post<{ success: boolean; phone_number: string }>('/users/phone/verify/confirm', {
        code,
        phone_number: phoneNumber,
      });
    },
    onSuccess: () => {
      toast.success('Phone number verified successfully');
      setShowVerificationInput(false);
      setVerificationCode('');
      setPhoneNumber('');
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Invalid verification code');
    },
  });

  // Update SMS settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SMSSettings['preferences'] & { sms_enabled: boolean }>) => {
      return apiClient.put('/settings/sms', settings);
    },
    onSuccess: () => {
      toast.success('SMS settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update SMS settings');
    },
  });

  // Remove phone number mutation
  const removePhoneMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete('/settings/sms');
    },
    onSuccess: () => {
      toast.success('Phone number removed successfully');
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove phone number');
    },
  });

  const handleSendVerification = () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    sendVerificationMutation.mutate(phoneNumber);
  };

  const handleConfirmVerification = () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    confirmVerificationMutation.mutate(verificationCode);
  };

  const handleToggleSMS = (enabled: boolean) => {
    updateSettingsMutation.mutate({ sms_enabled: enabled });
  };

  const handleTogglePreference = (preference: keyof SMSSettings['preferences'], enabled: boolean) => {
    updateSettingsMutation.mutate({ [preference]: enabled });
  };

  const handleRemovePhone = () => {
    if (confirm('Are you sure you want to remove your phone number? This will disable SMS notifications.')) {
      removePhoneMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading SMS settings...</div>
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
          <h1 className="text-2xl font-bold">SMS Notification Settings</h1>
          <p className="text-gray-600 mt-1">Configure SMS alerts for critical compliance events</p>
        </div>
      </div>

      {/* Phone Verification Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Phone Verification
        </h2>

        {smsSettings?.phone_verified ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Phone Number Verified</p>
                  <p className="text-sm text-green-700">{smsSettings.phone_number}</p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemovePhone}
                icon={<Trash2 className="h-4 w-4" />}
                disabled={removePhoneMutation.isPending}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Phone Verification Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to verify your phone number before enabling SMS notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone-number">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    helperText="Enter your phone number in international format (e.g., +1234567890)"
                    disabled={showVerificationInput}
                  />
                  <Button
                    onClick={handleSendVerification}
                    loading={sendVerificationMutation.isPending}
                    disabled={sendVerificationMutation.isPending || showVerificationInput}
                  >
                    Verify
                  </Button>
                </div>
              </div>

              {showVerificationInput && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Verification Code Sent</p>
                      <p className="text-sm text-blue-700">
                        Enter the 6-digit code sent to {phoneNumber}
                      </p>
                      {verificationExpiresAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Code expires at{' '}
                          {new Date(verificationExpiresAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verification-code"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                      />
                      <Button
                        onClick={handleConfirmVerification}
                        loading={confirmVerificationMutation.isPending}
                        disabled={confirmVerificationMutation.isPending || verificationCode.length !== 6}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowVerificationInput(false);
                      setVerificationCode('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SMS Notifications Toggle */}
      {smsSettings?.phone_verified && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Enable SMS Notifications</p>
                  <p className="text-sm text-gray-500">
                    Receive critical alerts via SMS
                  </p>
                </div>
              </div>
              <Checkbox
                checked={smsSettings?.sms_enabled || false}
                onChange={handleToggleSMS}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            {smsSettings?.sms_enabled && (
              <div className="pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">SMS Alert Types</p>

                <div className="space-y-3 pl-4">
                  <Checkbox
                    checked={smsSettings?.preferences.critical_alerts || false}
                    onChange={(checked) => handleTogglePreference('critical_alerts', checked)}
                    disabled={updateSettingsMutation.isPending}
                    label="Critical Alerts"
                  />
                  <p className="text-sm text-gray-500 ml-7 -mt-2">
                    Receive SMS for critical compliance breaches and severe issues
                  </p>

                  <Checkbox
                    checked={smsSettings?.preferences.overdue_notifications || false}
                    onChange={(checked) => handleTogglePreference('overdue_notifications', checked)}
                    disabled={updateSettingsMutation.isPending}
                    label="Overdue Deadline Notifications"
                  />
                  <p className="text-sm text-gray-500 ml-7 -mt-2">
                    Get notified when compliance deadlines are overdue
                  </p>

                  <Checkbox
                    checked={smsSettings?.preferences.breach_alerts || false}
                    onChange={(checked) => handleTogglePreference('breach_alerts', checked)}
                    disabled={updateSettingsMutation.isPending}
                    label="Compliance Breach Alerts"
                  />
                  <p className="text-sm text-gray-500 ml-7 -mt-2">
                    Immediate notification of any compliance violations
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">About SMS Notifications</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>SMS notifications are sent only for critical events to avoid alert fatigue</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Standard messaging rates may apply depending on your carrier</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Messages are kept under 160 characters when possible</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>You can disable SMS notifications at any time</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
