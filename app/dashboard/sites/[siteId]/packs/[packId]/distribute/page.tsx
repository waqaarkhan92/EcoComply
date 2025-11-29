'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

interface Recipient {
  email: string;
  name?: string;
}

export default function DistributePackPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const packId = params.packId as string;

  const [distributionMethod, setDistributionMethod] = useState<'EMAIL' | 'SHARED_LINK'>('EMAIL');
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: '', name: '' }]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);

  const distributePack = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post(`/packs/${packId}/distribute`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/sites/${siteId}/packs/${packId}`);
    },
  });

  const addRecipient = () => {
    setRecipients([...recipients, { email: '', name: '' }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: 'email' | 'name', value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validRecipients = recipients.filter(r => r.email);
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    distributePack.mutate({
      distribution_method: distributionMethod,
      recipients: validRecipients,
      message: message || undefined,
      subject: subject || undefined,
      expires_in_days: distributionMethod === 'SHARED_LINK' ? expiresInDays : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/packs/${packId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Distribute Pack</h1>
          <p className="text-gray-600 mt-1">Share pack via email or shared link</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="distribution_method">Distribution Method</Label>
          <select
            id="distribution_method"
            value={distributionMethod}
            onChange={(e) => setDistributionMethod(e.target.value as 'EMAIL' | 'SHARED_LINK')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="EMAIL">Email</option>
            <option value="SHARED_LINK">Shared Link</option>
          </select>
        </div>

        <div>
          <Label>Recipients</Label>
          <div className="mt-2 space-y-2">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={recipient.email}
                  onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                  className="flex-1"
                  required
                />
                <Input
                  type="text"
                  placeholder="Name (optional)"
                  value={recipient.name || ''}
                  onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                  className="flex-1"
                />
                {recipients.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeRecipient(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addRecipient}>
              Add Recipient
            </Button>
          </div>
        </div>

        {distributionMethod === 'EMAIL' && (
          <>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
                placeholder="Compliance Pack"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={4}
                placeholder="Please find attached compliance pack"
              />
            </div>
          </>
        )}

        {distributionMethod === 'SHARED_LINK' && (
          <div>
            <Label htmlFor="expires_in_days">Link Expires In (Days)</Label>
            <Input
              id="expires_in_days"
              type="number"
              min="1"
              max="365"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/packs/${packId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={distributePack.isPending}>
            {distributePack.isPending ? 'Distributing...' : 'Distribute Pack'}
          </Button>
        </div>
      </form>
    </div>
  );
}

