'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, AlertCircle, CheckCircle, XCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface ComplianceClock {
  id: string;
  clock_name: string;
  entity_type: string;
  entity_id: string;
  company_id: string;
  site_id: string | null;
  module_id: string | null;
  target_date: string;
  days_remaining: number;
  status: 'ACTIVE' | 'OVERDUE' | 'COMPLETED';
  criticality: 'RED' | 'AMBER' | 'GREEN';
  created_at: string;
  updated_at: string;
}

export default function ComplianceClockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clockId = params.clockId as string;

  const { data: clockData, isLoading, error } = useQuery<{ data: ComplianceClock }>({
    queryKey: ['compliance-clock', clockId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: ComplianceClock }>(`/compliance-clocks/${clockId}`);
    },
    enabled: !!clockId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading compliance clock...</div>
      </div>
    );
  }

  if (error || !clockData?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading compliance clock</p>
          <Link href="/dashboard/compliance-clocks">
            <Button variant="outline">Back to Compliance Clocks</Button>
          </Link>
        </div>
      </div>
    );
  }

  const clock = clockData.data;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'OVERDUE':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6 text-blue-600" />;
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'RED':
        return 'bg-red-100 text-red-800';
      case 'AMBER':
        return 'bg-yellow-100 text-yellow-800';
      case 'GREEN':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/compliance-clocks"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Compliance Clocks
          </Link>
          <div className="flex items-center gap-3">
            {getStatusIcon(clock.status)}
            <div>
              <h1 className="text-3xl font-bold">{clock.clock_name}</h1>
              <p className="text-gray-600 mt-1">
                {clock.entity_type.replace(/_/g, ' ')} • {clock.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clock Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Clock Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Clock Name</label>
            <p className="text-gray-900 mt-1">{clock.clock_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Entity Type</label>
            <p className="text-gray-900 mt-1">{clock.entity_type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Target Date</label>
            <p className="text-gray-900 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(clock.target_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Days Remaining</label>
            <p className="text-gray-900 mt-1">
              {clock.days_remaining > 0 ? (
                <span className="font-semibold">{clock.days_remaining} days</span>
              ) : (
                <span className="font-semibold text-red-600">Overdue by {Math.abs(clock.days_remaining)} days</span>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <p className="mt-1">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCriticalityColor(clock.criticality)}`}>
                {clock.status}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Criticality</label>
            <p className="mt-1">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCriticalityColor(clock.criticality)}`}>
                {clock.criticality}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation to Entity */}
      {clock.entity_type === 'OBLIGATION' && clock.entity_id && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Related Obligation</h2>
          <Link href={`/dashboard/sites/${clock.site_id}/obligations/${clock.entity_id}`}>
            <Button variant="outline">View Obligation</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

