'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PACK_TYPES = [
  { value: 'AUDIT_PACK', label: 'Audit Pack' },
  { value: 'REGULATOR_INSPECTION', label: 'Regulator Inspection Pack' },
  { value: 'TENDER_CLIENT_ASSURANCE', label: 'Tender Client Assurance Pack' },
  { value: 'INSURER_BROKER', label: 'Insurer/Broker Pack' },
  // Note: BOARD_MULTI_SITE_RISK is NOT available for consultants
];

export default function ConsultantPackGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = params.clientId as string;

  const [packType, setPackType] = useState('');
  const [siteId, setSiteId] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Get client details to fetch sites
  const { data: clientData } = useQuery({
    queryKey: ['consultant-client', clientId],
    queryFn: async () => {
      const response = await apiClient.get(`/consultant/clients/${clientId}`);
      return response.data;
    },
  });

  const sites = clientData?.sites || [];

  // Pack generation mutation
  const generatePackMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/consultant/clients/${clientId}/packs`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-client', clientId] });
      router.push(`/consultant/clients/${clientId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!packType || !siteId) {
      alert('Please select pack type and site');
      return;
    }

    generatePackMutation.mutate({
      pack_type: packType,
      site_id: siteId,
      date_range_start: dateRangeStart || null,
      date_range_end: dateRangeEnd || null,
      recipient_name: recipientName || null,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/consultant/clients/${clientId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Generate Pack</h1>
          <p className="text-text-secondary mt-2">
            Generate a compliance pack for {clientData?.company_name || 'client'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-base p-6 space-y-6">
        {/* Pack Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Pack Type <span className="text-danger">*</span>
          </label>
          <select
            value={packType}
            onChange={(e) => setPackType(e.target.value)}
            className="w-full px-4 py-2 border border-input-border rounded-lg bg-white text-text-primary"
            required
          >
            <option value="">Select pack type</option>
            {PACK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-2">
            Note: Board Packs are not available for consultants (requires Owner/Admin role)
          </p>
        </div>

        {/* Site Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Site <span className="text-danger">*</span>
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full px-4 py-2 border border-input-border rounded-lg bg-white text-text-primary"
            required
          >
            <option value="">Select site</option>
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Recipient Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Recipient Name (Optional)
          </label>
          <Input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Client contact name"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-input-border">
          <Link href={`/consultant/clients/${clientId}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={generatePackMutation.isPending}
            icon={<Package className="h-4 w-4" />}
            iconPosition="left"
          >
            {generatePackMutation.isPending ? 'Generating...' : 'Generate Pack'}
          </Button>
        </div>
      </form>
    </div>
  );
}

