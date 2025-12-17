'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Edit, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ContractorLicence {
  id: string;
  contractor_name: string;
  licence_number: string;
  licence_type: string;
  waste_types_allowed: string[];
  issued_date: string | null;
  expiry_date: string;
  is_valid: boolean;
  last_verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ContractorLicenceDetailPage({
  params,
}: {
  params: Promise<{ licenceId: string }>;
}) {
  const { licenceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: licence, isLoading } = useQuery({
    queryKey: ['contractor-licence', licenceId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ContractorLicence>(`/module-4/contractor-licences/${licenceId}`);
      return response.data;
    },
  });

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading contractor licence...</div>;
  }

  if (!licence) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Contractor licence not found</p>
        <Link href="/dashboard/module-4/contractor-licences">
          <Button variant="outline" className="mt-4">
            Back to Contractor Licences
          </Button>
        </Link>
      </div>
    );
  }

  const daysUntil = getDaysUntilExpiry(licence.expiry_date);
  const isExpiringSoon = daysUntil <= 30 && daysUntil > 0;
  const isExpired = daysUntil < 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-4/contractor-licences"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Contractor Licences
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {licence.contractor_name}
          </h1>
          <p className="text-text-secondary mt-2">
            {licence.licence_number}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Expiry Alert */}
      {(isExpired || isExpiringSoon) && (
        <div className={`rounded-lg p-4 ${
          isExpired
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${
              isExpired ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div>
              <p className={`font-semibold ${
                isExpired ? 'text-red-900' : 'text-amber-900'
              }`}>
                {isExpired
                  ? 'Licence Expired'
                  : 'Licence Expiring Soon'}
              </p>
              <p className={`text-sm ${
                isExpired ? 'text-red-800' : 'text-amber-800'
              }`}>
                {isExpired
                  ? `Expired ${Math.abs(daysUntil)} days ago`
                  : `Expires in ${daysUntil} days`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Licence Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Licence Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Contractor Name</p>
            <p className="text-text-primary font-medium">{licence.contractor_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Licence Number</p>
            <p className="text-text-primary font-medium">{licence.licence_number}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Licence Type</p>
            <p className="text-text-primary">{licence.licence_type}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {licence.is_valid ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Valid
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Invalid
              </span>
            )}
          </div>

          {licence.issued_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Issued Date</p>
              <p className="text-text-primary">
                {new Date(licence.issued_date).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Expiry Date</p>
            <div>
              <p className="text-text-primary font-medium">
                {new Date(licence.expiry_date).toLocaleDateString()}
              </p>
              <p className={`text-sm font-medium mt-1 ${
                isExpired
                  ? 'text-red-600'
                  : isExpiringSoon
                  ? 'text-amber-600'
                  : 'text-gray-600'
              }`}>
                {isExpired
                  ? `${Math.abs(daysUntil)} days overdue`
                  : `${daysUntil} days remaining`}
              </p>
            </div>
          </div>

          {licence.last_verified_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Last Verified</p>
              <p className="text-text-primary">
                {new Date(licence.last_verified_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(licence.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Waste Types Allowed */}
      {licence.waste_types_allowed && licence.waste_types_allowed.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Waste Types Allowed</h2>
          <div className="flex flex-wrap gap-2">
            {licence.waste_types_allowed.map((wasteType: string) => (
              <span
                key={wasteType}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200"
              >
                {wasteType}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verification Notes */}
      {licence.verification_notes && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Verification Notes</h2>
          <p className="text-text-primary whitespace-pre-wrap">{licence.verification_notes}</p>
        </div>
      )}
    </div>
  );
}

