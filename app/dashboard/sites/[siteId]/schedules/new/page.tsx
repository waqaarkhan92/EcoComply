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

interface Obligation {
  id: string;
  obligation_title: string;
}

export default function NewSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [obligationId, setObligationId] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [adjustForBusinessDays, setAdjustForBusinessDays] = useState(false);

  // Fetch obligations for this site
  const { data: obligationsData } = useQuery({
    queryKey: ['obligations', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');
      return apiClient.get<{ data: Obligation[] }>(`/obligations?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const createSchedule = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/schedules', data);
    },
    onSuccess: () => {
      router.push(`/dashboard/sites/${siteId}/schedules`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSchedule.mutate({
      obligation_id: obligationId,
      frequency,
      start_date: startDate,
      custom_schedule: {
        adjust_for_business_days: adjustForBusinessDays,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/schedules`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Schedule</h1>
          <p className="text-gray-600 mt-1">Set up a new monitoring schedule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="obligation_id">Obligation</Label>
          <select
            id="obligation_id"
            value={obligationId}
            onChange={(e) => setObligationId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="">Select an obligation</option>
            {obligationsData?.data?.map((obligation: Obligation) => (
              <option key={obligation.id} value={obligation.id}>
                {obligation.obligation_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>
        </div>

        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            id="adjust_business_days"
            type="checkbox"
            checked={adjustForBusinessDays}
            onChange={(e) => setAdjustForBusinessDays(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="adjust_business_days" className="ml-2">
            Adjust for business days
          </Label>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/schedules`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createSchedule.isPending}>
            {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
          </Button>
        </div>
      </form>
    </div>
  );
}

