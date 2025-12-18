'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/modal';
import { Building2, MapPin, Users, Settings, Edit, UserPlus, Upload, Package } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import Link from 'next/link';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  billing_email: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: string;
}

interface Site {
  id: string;
  name: string;
  company_id: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  always_active?: boolean;
  included_in_tier?: boolean;
}

interface CompanySettings {
  logo_url?: string;
  timezone: string;
  date_format: string;
  currency: string;
}

export default function CompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, company, roles } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'sites' | 'users' | 'modules' | 'settings'>('details');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Edit company form state
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    billing_email: '',
  });

  // Invite user form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'USER',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<CompanySettings>({
    logo_url: '',
    timezone: 'America/New_York',
    date_format: 'MM/DD/YYYY',
    currency: 'USD',
  });

  // Check authorization - Consultants blocked
  if (roles?.includes('CONSULTANT')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Access Denied</p>
          <p className="text-gray-600 mb-4">Consultants do not have access to company management</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const companyId = company?.id;
  const canEdit = roles?.includes('OWNER') || roles?.includes('ADMIN');

  // Queries
  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Company }>(`/companies/${companyId}`);
    },
    enabled: !!companyId && canEdit,
  });

  const { data: sitesData } = useQuery({
    queryKey: ['company-sites', companyId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>(`/companies/${companyId}/sites`);
    },
    enabled: !!companyId && activeTab === 'sites',
  });

  const { data: usersData } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: User[] }>(`/companies/${companyId}/users`);
    },
    enabled: !!companyId && activeTab === 'users',
  });

  const { data: modulesData } = useQuery({
    queryKey: ['company-modules', companyId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Module[] }>(`/companies/${companyId}/modules`);
    },
    enabled: !!companyId && activeTab === 'modules',
  });

  const { data: settingsData } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CompanySettings }>(`/companies/${companyId}/settings`);
      return response;
    },
    enabled: !!companyId && activeTab === 'settings',
  });

  // Update settings form when data is loaded
  useEffect(() => {
    if (settingsData?.data?.data) {
      setSettingsForm(settingsData.data.data);
    }
  }, [settingsData]);

  // Mutations
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<Company>) => {
      return apiClient.patch(`/companies/${companyId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Company updated successfully');
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update company');
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) => {
      return apiClient.patch(`/companies/${companyId}/modules/${moduleId}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-modules', companyId] });
      toast.success('Module updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update module');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: CompanySettings) => {
      return apiClient.patch(`/companies/${companyId}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update settings');
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return apiClient.post(`/companies/${companyId}/invites`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
      toast.success('User invitation sent successfully');
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', role: 'USER' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send invitation');
    },
  });

  const companyDetails = companyData?.data;

  // Handlers
  const handleEditCompany = () => {
    if (companyDetails) {
      setEditForm({
        name: companyDetails.name || '',
        address: companyDetails.address || '',
        contact_email: companyDetails.contact_email || '',
        contact_phone: companyDetails.contact_phone || '',
        billing_email: companyDetails.billing_email || '',
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(editForm);
  };

  const handleModuleToggle = (moduleId: string, currentStatus: boolean, alwaysActive?: boolean) => {
    if (alwaysActive) {
      toast.info('Core Compliance module cannot be disabled');
      return;
    }
    if (!canEdit) {
      toast.error('You do not have permission to modify modules');
      return;
    }
    updateModuleMutation.mutate({ moduleId, enabled: !currentStatus });
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUserMutation.mutate(inviteForm);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload the file to a storage service
    // and get back a URL. For now, we'll just show a placeholder message.
    toast.info('Logo upload functionality will be implemented with file storage service');

    // Example implementation:
    // const formData = new FormData();
    // formData.append('logo', file);
    // const response = await apiClient.post(`/companies/${companyId}/logo`, formData);
    // setSettingsForm({ ...settingsForm, logo_url: response.data.url });
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading company details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company</h1>
          <p className="text-gray-600 mt-1">{companyDetails?.name || 'Company Management'}</p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={handleEditCompany}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['details', 'sites', 'users', 'modules', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && companyDetails && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Company Name</label>
              <p className="text-gray-900 mt-1">{companyDetails.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Address</label>
              <p className="text-gray-900 mt-1">{companyDetails.address || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Contact Email</label>
              <p className="text-gray-900 mt-1">{companyDetails.contact_email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Contact Phone</label>
              <p className="text-gray-900 mt-1">{companyDetails.contact_phone || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Billing Email</label>
              <p className="text-gray-900 mt-1">{companyDetails.billing_email || 'Not set'}</p>
            </div>
            {companyDetails.subscription_tier && (
              <div>
                <label className="text-sm font-medium text-gray-700">Subscription Tier</label>
                <p className="text-gray-900 mt-1 capitalize">{companyDetails.subscription_tier}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sites' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sites</h2>
          {sitesData?.data && sitesData.data.length > 0 ? (
            <div className="space-y-3">
              {sitesData.data.map((site: Site) => (
                <Link
                  key={site.id}
                  href={`/dashboard/sites/${site.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{site.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No sites found</p>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Users</h2>
            {canEdit && (
              <Button onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            )}
          </div>
          {usersData?.data && usersData.data.length > 0 ? (
            <div className="space-y-3">
              {usersData.data.map((userItem: User) => (
                <div key={userItem.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{userItem.email}</p>
                        <p className="text-sm text-gray-500">{userItem.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No users found</p>
          )}
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Modules</h2>
          <p className="text-gray-600 mb-6">
            Manage which modules are enabled for your company. Some modules may be restricted based on your subscription tier.
          </p>
          {modulesData?.data && modulesData.data.length > 0 ? (
            <div className="space-y-4">
              {modulesData.data.map((module: Module) => (
                <div key={module.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-lg">{module.name}</h3>
                        {module.always_active && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            Always Active
                          </span>
                        )}
                        {module.included_in_tier && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            Included in Plan
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{module.description}</p>
                    </div>
                    <div className="ml-4">
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={() => handleModuleToggle(module.id, module.enabled, module.always_active)}
                        disabled={!canEdit || module.always_active}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Default modules if API doesn't return data */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-lg">Core Compliance</h3>
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Always Active
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Essential compliance tracking and reporting features
                    </p>
                  </div>
                  <div className="ml-4">
                    <Switch checked={true} onCheckedChange={() => {}} disabled={true} />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-lg">Environmental Monitoring</h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Track environmental parameters and generate monitoring reports
                    </p>
                  </div>
                  <div className="ml-4">
                    <Switch
                      checked={false}
                      onCheckedChange={() => toast.info('Please configure modules via API')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-lg">Permit Management</h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Manage permits, renewals, and compliance deadlines
                    </p>
                  </div>
                  <div className="ml-4">
                    <Switch
                      checked={false}
                      onCheckedChange={() => toast.info('Please configure modules via API')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-lg">Waste Chain of Custody</h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Track waste management from generation to disposal
                    </p>
                  </div>
                  <div className="ml-4">
                    <Switch
                      checked={false}
                      onCheckedChange={() => toast.info('Please configure modules via API')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Company Settings</h2>
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {settingsForm.logo_url && (
                  <img
                    src={settingsForm.logo_url}
                    alt="Company logo"
                    className="h-16 w-16 object-contain border rounded"
                  />
                )}
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={!canEdit}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={!canEdit}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <Select
              label="Default Timezone"
              options={[
                { value: 'America/New_York', label: 'Eastern Time (ET)' },
                { value: 'America/Chicago', label: 'Central Time (CT)' },
                { value: 'America/Denver', label: 'Mountain Time (MT)' },
                { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
                { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
                { value: 'UTC', label: 'UTC' },
              ]}
              value={settingsForm.timezone}
              onChange={(value) => setSettingsForm({ ...settingsForm, timezone: value })}
              disabled={!canEdit}
            />

            {/* Date Format */}
            <Select
              label="Date Format"
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
              ]}
              value={settingsForm.date_format}
              onChange={(value) => setSettingsForm({ ...settingsForm, date_format: value })}
              disabled={!canEdit}
            />

            {/* Currency */}
            <Select
              label="Currency"
              options={[
                { value: 'USD', label: 'US Dollar (USD)' },
                { value: 'EUR', label: 'Euro (EUR)' },
                { value: 'GBP', label: 'British Pound (GBP)' },
                { value: 'CAD', label: 'Canadian Dollar (CAD)' },
                { value: 'AUD', label: 'Australian Dollar (AUD)' },
              ]}
              value={settingsForm.currency}
              onChange={(value) => setSettingsForm({ ...settingsForm, currency: value })}
              disabled={!canEdit}
            />

            {canEdit && (
              <div className="flex justify-end">
                <Button type="submit" loading={updateSettingsMutation.isPending}>
                  Save Settings
                </Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Company"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCompany} loading={updateCompanyMutation.isPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateCompany} className="space-y-4">
          <Input
            label="Company Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            label="Address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <Input
            label="Contact Email"
            type="email"
            value={editForm.contact_email}
            onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
          />
          <Input
            label="Contact Phone"
            type="tel"
            value={editForm.contact_phone}
            onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
          />
          <Input
            label="Billing Email"
            type="email"
            value={editForm.billing_email}
            onChange={(e) => setEditForm({ ...editForm, billing_email: e.target.value })}
          />
        </form>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite User"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} loading={inviteUserMutation.isPending}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteUser} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            required
            placeholder="user@example.com"
          />
          <Select
            label="Role"
            options={[
              { value: 'ADMIN', label: 'Admin - Full company access' },
              { value: 'USER', label: 'User - Standard access' },
              { value: 'VIEWER', label: 'Viewer - Read-only access' },
            ]}
            value={inviteForm.role}
            onChange={(value) => setInviteForm({ ...inviteForm, role: value })}
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              An invitation email will be sent to the user with instructions to join your company.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
