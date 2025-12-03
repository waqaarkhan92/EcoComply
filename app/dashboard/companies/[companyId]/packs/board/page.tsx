'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';

interface Company {
  id: string;
  name: string;
  site_count?: number;
}

export default function BoardPackGenerationPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const { user, roles } = useAuthStore();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');

  // Check role and plan
  const isAuthorized = roles?.includes('OWNER') || roles?.includes('ADMIN');
  const hasPlanAccess = true; // TODO: Check Growth Plan or Consultant Edition

  const { data: companyData, isLoading } = useQuery<{ data: Company }>({
    queryKey: ['company', companyId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Company }>(`/companies/${companyId}`);
    },
    enabled: !!companyId && isAuthorized,
  });

  const generatePack = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post<{ data: { id: string } }>('/packs', {
        company_id: companyId,
        site_id: null,
        pack_type: 'BOARD_MULTI_SITE_RISK',
        date_range_start: data.startDate,
        date_range_end: data.endDate,
        recipient_name: data.recipientName,
        purpose: data.purpose,
      });
    },
    onSuccess: (response: any) => {
      const packId = response.data?.id;
      if (packId) {
        router.push(`/dashboard/packs/${packId}`);
      }
    },
  });

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Board Pack requires Owner or Admin role</p>
          <Link href="/dashboard/packs">
            <Button variant="outline">Back to Packs</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPlanAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-bold mb-2">Upgrade Required</h2>
          <p className="text-gray-600 mb-4">Upgrade to Growth Plan to generate Board Packs</p>
          <Link href="/dashboard/settings">
            <Button variant="outline">View Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !recipientName) {
      alert('Please fill in all required fields');
      return;
    }
    generatePack.mutate({ startDate, endDate, recipientName, purpose });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/companies/${companyId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Company
          </Link>
          <h1 className="text-2xl font-bold">Generate Board Pack</h1>
          <p className="text-gray-600 mt-1">
            {companyData?.data?.name || 'Company'} • {companyData?.data?.site_count || 0} sites
          </p>
        </div>
      </div>

      {/* Pack Configuration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Board Pack (Multi-Site Risk)</h3>
              <p className="text-sm text-blue-700">
                This pack aggregates compliance data across all sites in the company. All sites are automatically included.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="date_range_start">Start Date *</Label>
          <Input
            id="date_range_start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="date_range_end">End Date *</Label>
          <Input
            id="date_range_end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked
              disabled
              className="rounded border-gray-300"
            />
            <Label>Include All Sites (Board Pack always includes all sites)</Label>
          </div>
          <p className="text-sm text-gray-600 ml-6">
            All {companyData?.data?.site_count || 0} sites in {companyData?.data?.name || 'the company'} will be included
          </p>
        </div>

        <div>
          <Label htmlFor="recipient_name">Recipient Name *</Label>
          <Input
            id="recipient_name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1"
            placeholder="e.g., Board of Directors"
            required
          />
        </div>

        <div>
          <Label htmlFor="purpose">Purpose (Optional)</Label>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., Quarterly compliance review for Board meeting"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/companies/${companyId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={generatePack.isPending} style={{ backgroundColor: '#026A67' }}>
            {generatePack.isPending ? 'Generating...' : 'Generate Board Pack'}
          </Button>
        </div>
      </form>
    </div>
  );
}

