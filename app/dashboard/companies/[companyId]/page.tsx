'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  billing_email: string;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Company }>(`/companies/${companyId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading company...</div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Company not found</div>
      </div>
    );
  }

  const company = companyData.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/companies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Company Details</h1>
            <p className="text-gray-600 mt-1">{company.name}</p>
          </div>
        </div>
        <Link href={`/dashboard/companies/${companyId}/settings`}>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <div className="mt-1 flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{company.name}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Billing Email</label>
            <div className="mt-1 text-sm text-gray-900">{company.billing_email}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Subscription Tier</label>
            <div className="mt-1 text-sm text-gray-900">{company.subscription_tier}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                company.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {company.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Created At</label>
            <div className="mt-1 text-sm text-gray-900">
              {new Date(company.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

