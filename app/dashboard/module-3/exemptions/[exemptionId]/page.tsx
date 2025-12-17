'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Shield, Calendar, CheckCircle2, XCircle, AlertTriangle, Wrench, FileText } from 'lucide-react';
import Link from 'next/link';

interface Exemption {
  id: string;
  generator_id: string;
  site_id: string;
  exemption_type: 'TESTING' | 'EMERGENCY_OPERATION' | 'MAINTENANCE' | 'OTHER';
  start_date: string;
  end_date: string | null;
  duration_hours: number | null;
  exemption_reason: string;
  evidence_ids: string[];
  compliance_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

const exemptionTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  TESTING: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: AlertTriangle },
  EMERGENCY_OPERATION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  MAINTENANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Wrench },
  OTHER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Shield },
};

export default function ExemptionDetailPage({
  params,
}: {
  params: Promise<{ exemptionId: string }>;
}) {
  const { exemptionId } = use(params);

  const { data: exemption, isLoading } = useQuery({
    queryKey: ['exemption', exemptionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Exemption>(`/module-3/exemptions/${exemptionId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading exemption...</div>;
  }

  if (!exemption) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Exemption not found</p>
        <Link href="/dashboard/module-3/exemptions">
          <Button variant="outline" className="mt-4">
            Back to Exemptions
          </Button>
        </Link>
      </div>
    );
  }

  const typeStyle = exemptionTypeColors[exemption.exemption_type] || exemptionTypeColors.OTHER;
  const TypeIcon = typeStyle.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-3/exemptions"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Exemptions
          </Link>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Exemption
          </h1>
          <p className="text-text-secondary mt-2">
            {exemption.exemption_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-3/exemptions/${exemptionId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${typeStyle.bg} ${typeStyle.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TypeIcon className={`w-6 h-6 ${typeStyle.text}`} />
            <div>
              <p className="font-semibold text-gray-900">
                Exemption Type: {exemption.exemption_type.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Compliance Verified: {exemption.compliance_verified ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          {exemption.compliance_verified && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Exemption Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Exemption Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Exemption Type</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
              <TypeIcon className="w-4 h-4 mr-2" />
              {exemption.exemption_type.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Compliance Verified</p>
            {exemption.compliance_verified ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Not Verified
              </span>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Start Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(exemption.start_date).toLocaleDateString()}
            </p>
          </div>

          {exemption.end_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">End Date</p>
              <p className="text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(exemption.end_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {exemption.duration_hours && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Duration</p>
              <p className="text-text-primary font-medium">
                {exemption.duration_hours.toFixed(2)} hours
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Related Generator</p>
            <Link
              href={`/dashboard/module-3/generators/${exemption.generator_id}`}
              className="text-primary hover:underline"
            >
              View Generator
            </Link>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Exemption Reason *</p>
            <p className="text-text-primary whitespace-pre-wrap">{exemption.exemption_reason}</p>
          </div>

          {exemption.evidence_ids && exemption.evidence_ids.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Evidence ({exemption.evidence_ids.length})</p>
              <div className="space-y-1">
                {exemption.evidence_ids.map((evidenceId: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <Link href={`/dashboard/evidence/${evidenceId}`} className="text-primary hover:underline">
                      {evidenceId}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exemption.verified_at && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Verification</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Verified At</p>
                  <p className="text-text-primary">
                    {new Date(exemption.verified_at).toLocaleString()}
                  </p>
                </div>
                {exemption.verification_notes && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Verification Notes</p>
                    <p className="text-text-primary whitespace-pre-wrap">{exemption.verification_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(exemption.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(exemption.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

