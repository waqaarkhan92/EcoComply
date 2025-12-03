'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, Calendar, CheckCircle2, XCircle, GitBranch, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PermitVersion {
  id: string;
  document_id: string;
  company_id: string;
  site_id: string;
  version_number: number;
  version_date: string;
  effective_date: string | null;
  expiry_date: string | null;
  version_type: 'INITIAL' | 'VARIATION' | 'REVOCATION' | 'SURRENDER' | 'TRANSFER';
  change_summary: string | null;
  redline_document_url: string | null;
  impact_analysis: any;
  is_current: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

const versionTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  INITIAL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  VARIATION: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  REVOCATION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  SURRENDER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  TRANSFER: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function PermitVersionDetailPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = use(params);

  const { data: version, isLoading } = useQuery<PermitVersion>({
    queryKey: ['permit-version', versionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitVersion>(`/module-1/permit-versions/${versionId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading permit version...</div>;
  }

  if (!version) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Permit version not found</p>
        <Link href="/dashboard/module-1/permit-versions">
          <Button variant="outline" className="mt-4">
            Back to Permit Versions
          </Button>
        </Link>
      </div>
    );
  }

  const typeStyle = versionTypeColors[version.version_type] || versionTypeColors.INITIAL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/permit-versions"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Permit Versions
          </Link>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <GitBranch className="w-8 h-8" />
            Version {version.version_number}
          </h1>
          <p className="text-text-secondary mt-2">
            {version.version_type} - {new Date(version.version_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-1/permit-versions/${versionId}/edit`}>
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
            <FileText className={`w-6 h-6 ${typeStyle.text}`} />
            <div>
              <p className="font-semibold text-gray-900">
                Version Type: {version.version_type}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Status: {version.is_current ? 'Current Version' : 'Historical Version'}
              </p>
            </div>
          </div>
          {version.is_current && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Current
            </span>
          )}
        </div>
      </div>

      {/* Version Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Version Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Version Number</p>
            <p className="text-text-primary font-medium text-lg">v{version.version_number}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Version Type</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
              {version.version_type}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Version Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(version.version_date).toLocaleDateString()}
            </p>
          </div>

          {version.effective_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Effective Date</p>
              <p className="text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(version.effective_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {version.expiry_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Expiry Date</p>
              <p className="text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(version.expiry_date).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {version.is_current ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Current Version
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Historical Version
              </span>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Related Document</p>
            <Link
              href={`/dashboard/documents/${version.document_id}`}
              className="text-primary hover:underline flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Document
            </Link>
          </div>

          {version.change_summary && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Change Summary</p>
              <p className="text-text-primary whitespace-pre-wrap">{version.change_summary}</p>
            </div>
          )}

          {version.redline_document_url && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Redline Document</p>
              <a
                href={version.redline_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Redline Document
              </a>
            </div>
          )}

          {version.impact_analysis && Object.keys(version.impact_analysis).length > 0 && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Impact Analysis</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(version.impact_analysis, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(version.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(version.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

