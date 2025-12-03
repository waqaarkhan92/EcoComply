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

interface Schedule {
  id: string;
  obligation_id: string;
  frequency: string;
  base_date: string;
  adjust_for_business_days: boolean;
}

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const scheduleId = params.scheduleId as string;

  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [adjustForBusinessDays, setAdjustForBusinessDays] = useState(false);

  const { data: scheduleData, isLoading } = useQuery<{ data: Schedule }>({
    queryKey: ['schedule', scheduleId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Schedule }>(`/schedules/${scheduleId}`);
    },
    enabled: !!scheduleId,
  });

  useEffect(() => {
    if (scheduleData?.data) {
      setFrequency(scheduleData.data.frequency);
      setStartDate(scheduleData.data.base_date);
      setAdjustForBusinessDays(scheduleData.data.adjust_for_business_days);
    }
  }, [scheduleData]);

  const updateSchedule = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/schedules/${scheduleId}`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/sites/${siteId}/schedules/${scheduleId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchedule.mutate({
      frequency,
      start_date: startDate,
      custom_schedule: {
        adjust_for_business_days: adjustForBusinessDays,
      },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/schedules/${scheduleId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Schedule</h1>
          <p className="text-gray-600 mt-1">Update schedule settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
          <Link href={`/dashboard/sites/${siteId}/schedules/${scheduleId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateSchedule.isPending}>
            {updateSchedule.isPending ? 'Updating...' : 'Update Schedule'}
          </Button>
        </div>
      </form>
    </div>
  );
}

