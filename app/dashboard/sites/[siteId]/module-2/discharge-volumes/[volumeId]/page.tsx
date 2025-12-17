'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

interface DischargeVolume {
  id: string;
  document_id: string;
  site_id: string;
  recording_date: string;
  volume_m3: number;
  measurement_method: string | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
  consent_id: string; // API alias
  date: string; // API alias
}

interface DischargeVolumeResponse {
  data: DischargeVolume;
}

export default function DischargeVolumeDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const volumeId = params.volumeId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-2-discharge-volume', volumeId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<DischargeVolumeResponse>(`/module-2/discharge-volumes/${volumeId}`);
    },
    enabled: !!volumeId,
  });

  const volume = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !volume) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Discharge Volume Not Found</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-800">Error loading discharge volume details. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Discharge Volume Record</h1>
          <p className="text-text-secondary mt-2">
            {new Date(volume.recording_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Volume Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Volume Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Recording Date</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-tertiary" />
              <p className="text-lg font-semibold text-text-primary">
                {new Date(volume.recording_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Volume</p>
            <p className="text-2xl font-bold text-text-primary">
              {volume.volume_m3.toFixed(2)} m³
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Measurement Method</p>
            <p className="text-sm font-medium text-text-primary">
              {volume.measurement_method || 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Recorded</p>
            <p className="text-sm font-medium text-text-primary">
              {new Date(volume.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {volume.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-text-secondary mb-1">Notes</p>
            <p className="text-sm text-text-primary">{volume.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {volume.consent_id && (
          <Link href={`/dashboard/sites/${siteId}/module-2/consents/${volume.consent_id}`}>
            <Button variant="secondary">
              <FileText className="mr-2 h-4 w-4" />
              View Consent
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

