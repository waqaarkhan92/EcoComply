'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, Settings, Edit } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  billing_email: string;
  created_at: string;
  updated_at: string;
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

export default function CompanyPage() {
  const router = useRouter();
  const { user, company, roles } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'sites' | 'users' | 'modules' | 'settings'>('details');

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

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Company }>(`/companies/${companyId}`);
    },
    enabled: !!companyId && (roles?.includes('OWNER') || roles?.includes('ADMIN')),
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

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading company details...</div>
      </div>
    );
  }

  const companyDetails = companyData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company</h1>
          <p className="text-gray-600 mt-1">{companyDetails?.name || 'Company Management'}</p>
        </div>
        {(roles?.includes('OWNER') || roles?.includes('ADMIN')) && (
          <Button variant="outline">
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
          <h2 className="text-xl font-semibold mb-4">Users</h2>
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
          <p className="text-gray-500">Module management coming soon...</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Company Settings</h2>
          <p className="text-gray-500">Company settings coming soon...</p>
        </div>
      )}
    </div>
  );
}

