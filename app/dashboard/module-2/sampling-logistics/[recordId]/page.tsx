'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FlaskConical, Calendar, CheckCircle2, Clock, Truck, FileText, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface SamplingLogistic {
  id: string;
  parameter_id: string;
  site_id: string;
  scheduled_date: string;
  sample_id: string | null;
  stage: string;
  reminder_sent_at: string | null;
  collection_scheduled_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  courier_booked_at: string | null;
  courier_reference: string | null;
  in_transit_at: string | null;
  lab_received_at: string | null;
  lab_reference: string | null;
  lab_processing_at: string | null;
  certificate_received_at: string | null;
  certificate_document_id: string | null;
  evidence_linked_at: string | null;
  evidence_id: string | null;
  lab_result_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function SamplingLogisticDetailPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showSubmitLabForm, setShowSubmitLabForm] = useState(false);
  const [showLinkCertForm, setShowLinkCertForm] = useState(false);
  const [labReference, setLabReference] = useState('');
  const [courierReference, setCourierReference] = useState('');
  const [certificateDocumentId, setCertificateDocumentId] = useState('');
  const [labResultId, setLabResultId] = useState('');

  const { data: record, isLoading } = useQuery<SamplingLogistic>({
    queryKey: ['sampling-logistic', recordId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<SamplingLogistic>(`/module-2/sampling-logistics/${recordId}`);
      return response.data;
    },
  });

  const submitLabMutation = useMutation({
    mutationFn: async (data: { lab_reference?: string; courier_reference?: string }) => {
      return apiClient.post(`/module-2/sampling-logistics/${recordId}/submit-lab`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampling-logistic', recordId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-sampling-logistics'] });
      setShowSubmitLabForm(false);
      setLabReference('');
      setCourierReference('');
    },
  });

  const linkCertMutation = useMutation({
    mutationFn: async (data: { certificate_document_id?: string; lab_result_id?: string; evidence_id?: string }) => {
      return apiClient.post(`/module-2/sampling-logistics/${recordId}/link-certificate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampling-logistic', recordId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-sampling-logistics'] });
      setShowLinkCertForm(false);
      setCertificateDocumentId('');
      setLabResultId('');
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading sampling logistics record...</div>;
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Sampling logistics record not found</p>
        <Link href="/dashboard/module-2/sampling-logistics">
          <Button variant="outline" className="mt-4">
            Back to Sampling Logistics
          </Button>
        </Link>
      </div>
    );
  }

  const canSubmitToLab = ['SCHEDULED', 'COLLECTED', 'COURIER_BOOKED'].includes(record.stage);
  const canLinkCertificate = ['LAB_RECEIVED', 'LAB_PROCESSING', 'CERTIFICATE_RECEIVED'].includes(record.stage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-2/sampling-logistics"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Sampling Logistics
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {record.sample_id || `Sampling Record ${record.id.slice(0, 8)}`}
          </h1>
          <p className="text-text-secondary mt-2">
            Scheduled: {new Date(record.scheduled_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-2/sampling-logistics/${recordId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stage Banner */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Current Stage</h2>
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {record.stage.replace('_', ' ')}
            </span>
          </div>
          <div className="flex gap-2">
            {canSubmitToLab && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitLabForm(!showSubmitLabForm)}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit to Lab
              </Button>
            )}
            {canLinkCertificate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkCertForm(!showLinkCertForm)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Link Certificate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit to Lab Form */}
      {showSubmitLabForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Submit to Lab</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Courier Reference (optional)
              </label>
              <input
                type="text"
                value={courierReference}
                onChange={(e) => setCourierReference(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Courier tracking number..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Lab Reference (optional)
              </label>
              <input
                type="text"
                value={labReference}
                onChange={(e) => setLabReference(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Lab reference number..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubmitLabForm(false);
                  setLabReference('');
                  setCourierReference('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  submitLabMutation.mutate({
                    courier_reference: courierReference || undefined,
                    lab_reference: labReference || undefined,
                  });
                }}
                disabled={submitLabMutation.isPending}
              >
                {submitLabMutation.isPending ? 'Submitting...' : 'Submit to Lab'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Certificate Form */}
      {showLinkCertForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Link Certificate</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Certificate Document ID *
              </label>
              <input
                type="text"
                value={certificateDocumentId}
                onChange={(e) => setCertificateDocumentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Document UUID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Lab Result ID (optional)
              </label>
              <input
                type="text"
                value={labResultId}
                onChange={(e) => setLabResultId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Lab result UUID"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkCertForm(false);
                  setCertificateDocumentId('');
                  setLabResultId('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  linkCertMutation.mutate({
                    certificate_document_id: certificateDocumentId || undefined,
                    lab_result_id: labResultId || undefined,
                  });
                }}
                disabled={!certificateDocumentId || linkCertMutation.isPending}
              >
                {linkCertMutation.isPending ? 'Linking...' : 'Link Certificate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Record Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Sample ID</p>
            <p className="text-text-primary">{record.sample_id || '—'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Scheduled Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(record.scheduled_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Stage</p>
            <p className="text-text-primary">{record.stage.replace('_', ' ')}</p>
          </div>

          {record.collected_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Collected At</p>
              <p className="text-text-primary">
                {new Date(record.collected_at).toLocaleString()}
              </p>
            </div>
          )}

          {record.lab_received_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Lab Received At</p>
              <p className="text-text-primary">
                {new Date(record.lab_received_at).toLocaleString()}
              </p>
            </div>
          )}

          {record.certificate_received_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Certificate Received At</p>
              <p className="text-text-primary">
                {new Date(record.certificate_received_at).toLocaleString()}
              </p>
            </div>
          )}

          {record.courier_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Courier Reference</p>
              <p className="text-text-primary">{record.courier_reference}</p>
            </div>
          )}

          {record.lab_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Lab Reference</p>
              <p className="text-text-primary">{record.lab_reference}</p>
            </div>
          )}

          {record.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{record.notes}</p>
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

