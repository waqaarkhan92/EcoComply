'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface SLA {
  deadline_id: string;
  sla_target_date: string;
  sla_status: 'COMPLIANT' | 'BREACHED';
  sla_breached_at: string | null;
  sla_breach_duration_hours: number | null;
  escalation_status: string | null;
}

interface SLAEvent {
  id: string;
  event_type: string;
  timestamp: string;
  details: any;
}

interface SLAData {
  deadline: {
    id: string;
    due_date: string;
    obligation_title: string;
  };
  sla: SLA;
  history: SLAEvent[];
}

export default function SLATrackingPage() {
  const params = useParams();
  const router = useRouter();
  const deadlineId = params.deadlineId as string;

  const { data: slaData, isLoading, error, refetch } = useQuery({
    queryKey: ['deadline-sla', deadlineId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: SLAData }>(`/deadlines/${deadlineId}/sla`);
    },
    enabled: !!deadlineId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading SLA tracking...</div>
      </div>
    );
  }

  if (error || !slaData?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading SLA tracking</p>
          <Link href={`/dashboard/deadlines/${deadlineId}`}>
            <Button variant="outline">Back to Deadline</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { deadline, sla, history } = slaData.data as SLAData;
  const isBreached = sla.sla_status === 'BREACHED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/deadlines/${deadlineId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Deadline
          </Link>
          <h1 className="text-2xl font-bold">SLA Tracking</h1>
          <p className="text-gray-600 mt-1">{deadline.obligation_title}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* SLA Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SLA Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700">SLA Target Date</label>
            <p className="text-gray-900 mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {new Date(sla.sla_target_date).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">SLA Status</label>
            <p className="mt-1">
              {isBreached ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
                  <XCircle className="h-4 w-4" />
                  BREACHED
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  COMPLIANT
                </span>
              )}
            </p>
          </div>
          {sla.sla_breached_at && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Breached At</label>
                <p className="text-red-900 mt-1">
                  {new Date(sla.sla_breached_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Breach Duration</label>
                <p className="text-red-900 mt-1">
                  {sla.sla_breach_duration_hours !== null
                    ? `${Math.round(sla.sla_breach_duration_hours)} hours`
                    : 'N/A'}
                </p>
              </div>
            </>
          )}
          {sla.escalation_status && (
            <div>
              <label className="text-sm font-medium text-gray-700">Escalation Status</label>
              <p className="text-amber-900 mt-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {sla.escalation_status}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SLA History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SLA History</h2>
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((event) => (
              <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {event.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    {typeof event.details === 'string' ? event.details : JSON.stringify(event.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No SLA history yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

