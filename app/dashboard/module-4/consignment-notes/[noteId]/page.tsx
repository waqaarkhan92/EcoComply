'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Edit, CheckCircle2, XCircle, Clock, AlertCircle, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ConsignmentNote {
  id: string;
  waste_stream_id: string;
  consignment_note_number: string;
  consignment_date: string;
  carrier_id: string | null;
  carrier_name: string;
  carrier_licence_number: string | null;
  destination_site: string;
  waste_description: string;
  ewc_code: string;
  quantity_m3: number;
  quantity_kg: number | null;
  validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'REQUIRES_REVIEW';
  pre_validation_status: 'NOT_VALIDATED' | 'VALIDATION_PENDING' | 'PASSED' | 'FAILED' | null;
  pre_validation_errors: any;
  created_at: string;
  updated_at: string;
}

interface ChainOfCustody {
  chain_steps: Array<{
    id: string;
    chain_position: number;
    transfer_date: string;
    from_party: string;
    to_party: string;
    transfer_method: string | null;
    is_complete: boolean;
    completed_at: string | null;
  }>;
  total_steps: number;
}

export default function ConsignmentNoteDetailPage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);

  const { data: consignmentNote, isLoading } = useQuery<ConsignmentNote>({
    queryKey: ['consignment-note', noteId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConsignmentNote>(`/module-4/consignment-notes/${noteId}`);
      return response.data;
    },
  });

  const { data: chainOfCustody } = useQuery<ChainOfCustody>({
    queryKey: ['consignment-note-chain', noteId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ChainOfCustody>(`/module-4/consignment-notes/${noteId}/chain-of-custody`);
      return response.data;
    },
    enabled: !!consignmentNote,
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/module-4/consignment-notes/${noteId}/validate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignment-note', noteId] });
      setIsValidating(false);
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading consignment note...</div>;
  }

  if (!consignmentNote) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Consignment note not found</p>
        <Link href="/dashboard/module-4/consignment-notes">
          <Button variant="outline" className="mt-4">
            Back to Consignment Notes
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
            href="/dashboard/module-4/consignment-notes"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Consignment Notes
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {consignmentNote.consignment_note_number}
          </h1>
          <p className="text-text-secondary mt-2">
            Consignment Date: {new Date(consignmentNote.consignment_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsValidating(true);
              validateMutation.mutate();
            }}
            disabled={validateMutation.isPending || isValidating}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Validate
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Validation Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Validation Status</p>
            <ValidationStatusBadge
              validationStatus={consignmentNote.validation_status}
              preValidationStatus={consignmentNote.pre_validation_status}
            />
          </div>
          {consignmentNote.pre_validation_errors && Array.isArray(consignmentNote.pre_validation_errors) && consignmentNote.pre_validation_errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Validation Errors</p>
              <div className="space-y-1">
                {consignmentNote.pre_validation_errors.map((error: string, index: number) => (
                  <p key={index} className="text-sm text-red-600">{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consignment Note Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Consignment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Consignment Note Number</p>
            <p className="text-text-primary font-medium">{consignmentNote.consignment_note_number}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Consignment Date</p>
            <p className="text-text-primary">{new Date(consignmentNote.consignment_date).toLocaleDateString()}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Carrier</p>
            <p className="text-text-primary">{consignmentNote.carrier_name}</p>
            {consignmentNote.carrier_licence_number && (
              <p className="text-sm text-text-secondary">Licence: {consignmentNote.carrier_licence_number}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Destination Site</p>
            <p className="text-text-primary">{consignmentNote.destination_site}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">EWC Code</p>
            <p className="text-text-primary">{consignmentNote.ewc_code}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Waste Description</p>
            <p className="text-text-primary">{consignmentNote.waste_description}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Quantity (m³)</p>
            <p className="text-text-primary font-medium">{consignmentNote.quantity_m3} m³</p>
          </div>

          {consignmentNote.quantity_kg && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Quantity (kg)</p>
              <p className="text-text-primary font-medium">{consignmentNote.quantity_kg} kg</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Waste Stream</p>
            <Link
              href={`/dashboard/module-4/waste-streams/${consignmentNote.waste_stream_id}`}
              className="text-primary hover:underline"
            >
              View Waste Stream
            </Link>
          </div>
        </div>
      </div>

      {/* Chain of Custody */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Chain of Custody</h2>
          <Button variant="outline" size="sm">
            <LinkIcon className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>
        {chainOfCustody && chainOfCustody.chain_steps.length > 0 ? (
          <div className="space-y-4">
            {chainOfCustody.chain_steps.map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {step.chain_position}
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      Step {step.chain_position}
                    </span>
                  </div>
                  {step.is_complete ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Pending
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">From</p>
                    <p className="text-sm text-text-primary">{step.from_party}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">To</p>
                    <p className="text-sm text-text-primary">{step.to_party}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Transfer Date</p>
                    <p className="text-sm text-text-primary">
                      {new Date(step.transfer_date).toLocaleDateString()}
                    </p>
                  </div>
                  {step.transfer_method && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Method</p>
                      <p className="text-sm text-text-primary">{step.transfer_method}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">No chain of custody steps recorded yet.</p>
        )}
      </div>
    </div>
  );
}

function ValidationStatusBadge({
  validationStatus,
  preValidationStatus,
}: {
  validationStatus: string;
  preValidationStatus: string | null;
}) {
  const config: Record<string, { label: string; className: string; icon: any }> = {
    VALIDATED: {
      label: 'Validated',
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: XCircle,
    },
    REQUIRES_REVIEW: {
      label: 'Requires Review',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: AlertCircle,
    },
    PENDING: {
      label: 'Pending',
      className: 'bg-gray-50 text-gray-700 border border-gray-200',
      icon: Clock,
    },
  };

  const badgeConfig = config[validationStatus] || {
    label: validationStatus,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Clock,
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

