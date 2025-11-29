'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GeneratePackPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [packType, setPackType] = useState('AUDIT_PACK');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [recipientType, setRecipientType] = useState('INTERNAL');
  const [recipientName, setRecipientName] = useState('');
  const [purpose, setPurpose] = useState('');

  const generatePack = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/packs/generate', data);
    },
    onSuccess: (response) => {
      const packId = response.data?.id;
      if (packId) {
        router.push(`/dashboard/sites/${siteId}/packs/${packId}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generatePack.mutate({
      site_id: siteId,
      pack_type: packType,
      date_range: {
        start: dateRangeStart,
        end: dateRangeEnd,
      },
      recipient_type: recipientType,
      recipient_name: recipientName,
      purpose: purpose,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/packs`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Generate Pack</h1>
          <p className="text-gray-600 mt-1">Create a new compliance pack</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="pack_type">Pack Type</Label>
          <select
            id="pack_type"
            value={packType}
            onChange={(e) => setPackType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="AUDIT_PACK">Audit Pack</option>
            <option value="REGULATOR_INSPECTION">Regulator Inspection</option>
            <option value="TENDER_CLIENT_ASSURANCE">Tender/Client Assurance</option>
            <option value="BOARD_MULTI_SITE_RISK">Board Multi-Site Risk</option>
            <option value="INSURER_BROKER">Insurer/Broker</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_range_start">Start Date</Label>
            <Input
              id="date_range_start"
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="date_range_end">End Date</Label>
            <Input
              id="date_range_end"
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="mt-1"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="recipient_type">Recipient Type</Label>
          <select
            id="recipient_type"
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="INTERNAL">Internal</option>
            <option value="REGULATOR">Regulator</option>
            <option value="CLIENT">Client</option>
            <option value="BOARD">Board</option>
            <option value="INSURER">Insurer</option>
          </select>
        </div>

        <div>
          <Label htmlFor="recipient_name">Recipient Name</Label>
          <Input
            id="recipient_name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="purpose">Purpose</Label>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/packs`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={generatePack.isPending}>
            {generatePack.isPending ? 'Generating...' : 'Generate Pack'}
          </Button>
        </div>
      </form>
    </div>
  );
}

