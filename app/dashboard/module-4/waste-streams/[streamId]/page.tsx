'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface WasteStream {
  id: string;
  site_id: string;
  ewc_code: string;
  waste_description: string;
  waste_category: string | null;
  hazard_code: string | null;
  permit_reference: string | null;
  volume_limit_m3: number | null;
  storage_duration_limit_days: number | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ConsignmentNote {
  id: string;
  waste_stream_id: string;
  consignment_note_number: string;
  consignment_date: string;
  carrier_name: string;
  destination_site: string;
  validation_status: string;
  created_at: string;
}

export default function WasteStreamDetailPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: wasteStream, isLoading } = useQuery({
    queryKey: ['waste-stream', streamId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<WasteStream>(`/module-4/waste-streams/${streamId}`);
      return response.data;
    },
  });

  const { data: consignmentNotesData, isLoading: notesLoading } = useQuery({
    queryKey: ['waste-stream-consignment-notes', streamId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ConsignmentNote[] }>(`/module-4/waste-streams/${streamId}/consignment-notes`);
      return response;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/module-4/waste-streams/${streamId}`);
    },
    onSuccess: () => {
      router.push('/dashboard/module-4/waste-streams');
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading waste stream...</div>;
  }

  if (!wasteStream) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Waste stream not found</p>
        <Link href="/dashboard/module-4/waste-streams">
          <Button variant="outline" className="mt-4">
            Back to Waste Streams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-4/waste-streams"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Waste Streams
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {wasteStream.ewc_code}
          </h1>
          <p className="text-text-secondary mt-2">
            {wasteStream.waste_description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="mr-2 h-4 w-4" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Waste Stream Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Waste Stream Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">EWC Code</p>
            <p className="text-text-primary font-medium">{wasteStream.ewc_code}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {wasteStream.is_active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Inactive
              </span>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Waste Description</p>
            <p className="text-text-primary">{wasteStream.waste_description}</p>
          </div>

          {wasteStream.waste_category && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Category</p>
              <p className="text-text-primary">{wasteStream.waste_category}</p>
            </div>
          )}

          {wasteStream.hazard_code && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Hazard Code</p>
              <p className="text-text-primary">{wasteStream.hazard_code}</p>
            </div>
          )}

          {wasteStream.permit_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Permit Reference</p>
              <p className="text-text-primary">{wasteStream.permit_reference}</p>
            </div>
          )}

          {wasteStream.volume_limit_m3 && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Volume Limit</p>
              <p className="text-text-primary">{wasteStream.volume_limit_m3} m³</p>
            </div>
          )}

          {wasteStream.storage_duration_limit_days && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Storage Duration Limit</p>
              <p className="text-text-primary">{wasteStream.storage_duration_limit_days} days</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(wasteStream.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(wasteStream.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Related Consignment Notes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related Consignment Notes</h2>
        {notesLoading ? (
          <p className="text-text-secondary text-sm">Loading consignment notes...</p>
        ) : consignmentNotesData?.data?.data && consignmentNotesData.data.data.length > 0 ? (
          <div className="space-y-3">
            {consignmentNotesData.data.data.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <Link
                    href={`/dashboard/module-4/consignment-notes/${note.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {note.consignment_note_number}
                  </Link>
                  <div className="text-sm text-text-secondary mt-1">
                    {note.carrier_name} • {new Date(note.consignment_date).toLocaleDateString()} • {note.destination_site}
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    note.validation_status === 'VALIDATED'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : note.validation_status === 'REJECTED'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}>
                    {note.validation_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">
            No consignment notes linked to this waste stream yet.
          </p>
        )}
      </div>
    </div>
  );
}

