'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Activity, Calendar, CheckCircle2, AlertCircle, Wrench, Zap, FileText } from 'lucide-react';
import Link from 'next/link';

interface RuntimeMonitoring {
  id: string;
  generator_id: string;
  site_id: string;
  run_date: string;
  runtime_hours: number;
  run_duration: number;
  reason_code: 'Test' | 'Emergency' | 'Maintenance' | 'Normal';
  data_source: string;
  integration_system: string | null;
  integration_reference: string | null;
  evidence_linkage_id: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  entry_reason_notes: string | null;
  validation_status: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
}

const reasonCodeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  Test: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Zap },
  Emergency: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  Maintenance: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Wrench },
  Normal: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
};

export default function RuntimeMonitoringDetailPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = use(params);

  const { data: record, isLoading } = useQuery({
    queryKey: ['runtime-monitoring', recordId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RuntimeMonitoring>(`/module-3/runtime-monitoring/${recordId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading runtime monitoring record...</div>;
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Runtime monitoring record not found</p>
        <Link href="/dashboard/module-3/runtime-monitoring">
          <Button variant="outline" className="mt-4">
            Back to Runtime Monitoring
          </Button>
        </Link>
      </div>
    );
  }

  const reasonStyle = reasonCodeColors[record.reason_code] || reasonCodeColors.Normal;
  const ReasonIcon = reasonStyle.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-3/runtime-monitoring"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Runtime Monitoring
          </Link>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Runtime Entry
          </h1>
          <p className="text-text-secondary mt-2">
            {new Date(record.run_date).toLocaleDateString()} - {record.reason_code}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-3/runtime-monitoring/${recordId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${reasonStyle.bg} ${reasonStyle.border}`}>
        <div className="flex items-center gap-3">
          <ReasonIcon className={`w-6 h-6 ${reasonStyle.text}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Reason Code: {record.reason_code}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Data Source: {record.data_source}
            </p>
          </div>
        </div>
      </div>

      {/* Record Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Runtime Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Run Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(record.run_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Reason Code</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${reasonStyle.bg} ${reasonStyle.text} border ${reasonStyle.border}`}>
              <ReasonIcon className="w-4 h-4 mr-2" />
              {record.reason_code}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Runtime Hours</p>
            <p className="text-text-primary font-medium text-lg">
              {record.runtime_hours.toFixed(2)} hrs
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Run Duration</p>
            <p className="text-text-primary font-medium text-lg">
              {record.run_duration.toFixed(2)} hrs
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Data Source</p>
            <p className="text-text-primary">{record.data_source}</p>
          </div>

          {record.validation_status && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Validation Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                record.validation_status === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                record.validation_status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {record.validation_status}
              </span>
            </div>
          )}

          {record.entry_reason_notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Entry Reason Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{record.entry_reason_notes}</p>
            </div>
          )}

          {record.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {record.evidence_linkage_id && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Evidence</p>
              <Link
                href={`/dashboard/evidence/${record.evidence_linkage_id}`}
                className="text-primary hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Evidence
              </Link>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(record.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(record.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

