'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Edit, AlertCircle, AlertTriangle, Info, History } from 'lucide-react';
import Link from 'next/link';

interface ValidationRule {
  id: string;
  waste_stream_id: string | null;
  site_id: string | null;
  rule_type: 'CARRIER_LICENCE' | 'VOLUME_LIMIT' | 'STORAGE_DURATION' | 'EWC_CODE' | 'DESTINATION' | 'CUSTOM';
  rule_name: string;
  rule_description: string | null;
  rule_config: any;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ValidationRuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: rule, isLoading } = useQuery({
    queryKey: ['validation-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ValidationRule>(`/module-4/validation-rules/${ruleId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading validation rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Validation rule not found</p>
        <Link href="/dashboard/module-4/validation-rules">
          <Button variant="outline" className="mt-4">
            Back to Validation Rules
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
            href="/dashboard/module-4/validation-rules"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Validation Rules
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {rule.rule_name}
          </h1>
          <p className="text-text-secondary mt-2">
            {rule.rule_type.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/module-4/validation-rules/${ruleId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Validation Rule Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Rule Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Rule Name</p>
            <p className="text-text-primary font-medium">{rule.rule_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Rule Type</p>
            <p className="text-text-primary">{rule.rule_type.replace(/_/g, ' ')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Severity</p>
            <SeverityBadge severity={rule.severity} />
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {rule.is_active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                Inactive
              </span>
            )}
          </div>

          {rule.waste_stream_id && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Waste Stream</p>
              <Link
                href={`/dashboard/module-4/waste-streams/${rule.waste_stream_id}`}
                className="text-primary hover:underline"
              >
                View Waste Stream
              </Link>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(rule.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Rule Description */}
      {rule.rule_description && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Description</h2>
          <p className="text-text-primary whitespace-pre-wrap">{rule.rule_description}</p>
        </div>
      )}

      {/* Rule Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Rule Configuration</h2>
        <pre className="bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-x-auto text-sm">
          {JSON.stringify(rule.rule_config, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    ERROR: {
      label: 'Error',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: AlertCircle,
    },
    WARNING: {
      label: 'Warning',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: AlertTriangle,
    },
    INFO: {
      label: 'Info',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: Info,
    },
  };

  const badgeConfig = config[severity as keyof typeof config] || {
    label: severity,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Info,
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

