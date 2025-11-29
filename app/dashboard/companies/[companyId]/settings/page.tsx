'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  billing_email: string;
  billing_address: string;
  phone: string;
  subscription_tier: string;
}

export default function CompanySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [name, setName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [phone, setPhone] = useState('');

  const { data: companyData, isLoading } = useQuery<{ data: Company }>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      return apiClient.get<{ data: Company }>(`/companies/${companyId}`);
    },
  });

  useEffect(() => {
    if (companyData?.data) {
      setName(companyData.data.name);
      setBillingEmail(companyData.data.billing_email);
      setBillingAddress(companyData.data.billing_address || '');
      setPhone(companyData.data.phone || '');
    }
  }, [companyData]);

  const updateCompany = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/companies/${companyId}`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/companies/${companyId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany.mutate({
      name,
      billing_email: billingEmail,
      billing_address: billingAddress,
      phone,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/companies/${companyId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Company Settings</h1>
          <p className="text-gray-600 mt-1">Update company information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="billing_email">Billing Email</Label>
          <Input
            id="billing_email"
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="billing_address">Billing Address</Label>
          <textarea
            id="billing_address"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/companies/${companyId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateCompany.isPending}>
            {updateCompany.isPending ? 'Updating...' : 'Update Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}

