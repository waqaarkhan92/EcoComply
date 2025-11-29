'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';

export default function NewSitePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [regulator, setRegulator] = useState('EA');
  const [waterCompany, setWaterCompany] = useState('');

  const createSite = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/sites', data);
    },
    onSuccess: (response) => {
      const siteId = response.data?.id;
      if (siteId) {
        router.push(`/dashboard/sites/${siteId}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSite.mutate({
      company_id: user?.company_id,
      name,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city,
      postcode,
      country,
      regulator,
      water_company: waterCompany,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Site</h1>
          <p className="text-gray-600 mt-1">Add a new site to your organization</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="name">Site Name</Label>
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
          <Label htmlFor="address_line_1">Address Line 1</Label>
          <Input
            id="address_line_1"
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="address_line_2">Address Line 2</Label>
          <Input
            id="address_line_2"
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="regulator">Regulator</Label>
          <select
            id="regulator"
            value={regulator}
            onChange={(e) => setRegulator(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="EA">Environment Agency (EA)</option>
            <option value="SEPA">Scottish Environment Protection Agency (SEPA)</option>
            <option value="NRW">Natural Resources Wales (NRW)</option>
            <option value="NIEA">Northern Ireland Environment Agency (NIEA)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="water_company">Water Company</Label>
          <Input
            id="water_company"
            type="text"
            value={waterCompany}
            onChange={(e) => setWaterCompany(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/dashboard">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createSite.isPending}>
            {createSite.isPending ? 'Creating...' : 'Create Site'}
          </Button>
        </div>
      </form>
    </div>
  );
}

