'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, Edit, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface EndPointProof {
  id: string;
  consignment_note_id: string;
  end_point_type: 'DESTRUCTION' | 'RECYCLING' | 'RECOVERY' | 'DISPOSAL';
  end_point_facility: string;
  completion_date: string;
  certificate_reference: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function EndPointProofDetailPage({
  params,
}: {
  params: Promise<{ proofId: string }>;
}) {
  const { proofId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: proof, isLoading } = useQuery<EndPointProof>({
    queryKey: ['end-point-proof', proofId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<EndPointProof>(`/module-4/end-point-proofs/${proofId}`);
      return response.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (notes?: string) => {
      return apiClient.put(`/module-4/end-point-proofs/${proofId}`, {
        is_verified: true,
        verification_notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['end-point-proof', proofId] });
      queryClient.invalidateQueries({ queryKey: ['module-4-end-point-proofs'] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading end-point proof...</div>;
  }

  if (!proof) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">End-point proof not found</p>
        <Link href="/dashboard/module-4/end-point-proofs">
          <Button variant="outline" className="mt-4">
            Back to End-Point Proofs
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
            href="/dashboard/module-4/end-point-proofs"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to End-Point Proofs
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {proof.end_point_facility}
          </h1>
          <p className="text-text-secondary mt-2">
            {proof.end_point_type.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/module-4/end-point-proofs/${proofId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          {!proof.is_verified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Mark this end-point proof as verified?')) {
                  verifyMutation.mutate(undefined);
                }
              }}
              disabled={verifyMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Verify
            </Button>
          )}
        </div>
      </div>

      {/* End-Point Proof Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">End-Point Proof Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">End-Point Facility</p>
            <p className="text-text-primary font-medium">{proof.end_point_facility}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">End-Point Type</p>
            <p className="text-text-primary">{proof.end_point_type.replace(/_/g, ' ')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Completion Date</p>
            <p className="text-text-primary">
              {new Date(proof.completion_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Verification Status</p>
            {proof.is_verified ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Unverified
              </span>
            )}
          </div>

          {proof.certificate_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Certificate Reference</p>
              <p className="text-text-primary">{proof.certificate_reference}</p>
            </div>
          )}

          {proof.verified_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Verified At</p>
              <p className="text-text-primary">
                {new Date(proof.verified_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Consignment Note</p>
            <Link
              href={`/dashboard/module-4/consignment-notes/${proof.consignment_note_id}`}
              className="text-primary hover:underline"
            >
              View Consignment Note
            </Link>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(proof.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Notes */}
      {proof.verification_notes && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Verification Notes</h2>
          <p className="text-text-primary whitespace-pre-wrap">{proof.verification_notes}</p>
        </div>
      )}
    </div>
  );
}

