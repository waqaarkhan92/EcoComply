'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Building2, AlertCircle, CheckCircle2, Calendar, Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ConsultantClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  interface ClientData {
    company_name: string;
    site_count: number;
    compliance_summary: {
      total_obligations: number;
      overdue_count: number;
      approaching_deadline_count: number;
      compliance_score: number;
    };
    sites: Array<{ id: string; site_name: string; status?: string }>;
    upcoming_deadlines: Array<any>;
  }

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['consultant-client', clientId],
    queryFn: async (): Promise<ClientData> => {
      const response = await apiClient.get(`/consultant/clients/${clientId}`);
      return response.data as ClientData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading client details...</div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Client not found or access denied</p>
        <Link href="/consultant/clients" className="text-primary mt-4 inline-block">
          ← Back to clients
        </Link>
      </div>
    );
  }

  const client = clientData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/consultant/clients">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{client.company_name}</h1>
            <p className="text-text-secondary mt-2">Client company overview and compliance status</p>
          </div>
        </div>
        <Link href={`/consultant/clients/${clientId}/packs/generate`}>
          <Button icon={<Package className="h-4 w-4" />} iconPosition="left">
            Generate Pack
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-base p-6">
          <p className="text-sm text-text-secondary">Sites</p>
          <p className="text-3xl font-bold text-text-primary mt-2">
            {client.site_count}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <p className="text-sm text-text-secondary">Total Obligations</p>
          <p className="text-3xl font-bold text-text-primary mt-2">
            {client.compliance_summary.total_obligations}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <p className="text-sm text-text-secondary">Overdue</p>
          <p className="text-3xl font-bold text-danger mt-2">
            {client.compliance_summary.overdue_count}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <p className="text-sm text-text-secondary">Compliance Score</p>
          <p className={`text-3xl font-bold mt-2 ${
            client.compliance_summary.compliance_score >= 0.9
              ? 'text-success'
              : client.compliance_summary.compliance_score >= 0.7
              ? 'text-warning'
              : 'text-danger'
          }`}>
            {Math.round(client.compliance_summary.compliance_score * 100)}%
          </p>
        </div>
      </div>

      {/* Sites List */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Sites</h2>
        {client.sites.length === 0 ? (
          <p className="text-text-secondary">No sites found</p>
        ) : (
          <div className="space-y-3">
            {client.sites.map((site: any) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-4 border border-input-border rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-text-tertiary" />
                  <span className="font-medium text-text-primary">{site.name}</span>
                </div>
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Upcoming Deadlines</h2>
        {client.upcoming_deadlines.length === 0 ? (
          <p className="text-text-secondary">No upcoming deadlines</p>
        ) : (
          <div className="space-y-3">
            {client.upcoming_deadlines.map((deadline: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 border border-input-border rounded-lg"
              >
                <Calendar className="h-5 w-5 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {deadline.obligation_title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {deadline.site_name}
                  </p>
                </div>
                <p className="text-sm text-text-tertiary">
                  {new Date(deadline.deadline_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Compliance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-text-secondary">Total Obligations</p>
            <p className="text-2xl font-bold text-text-primary mt-2">
              {client.compliance_summary.total_obligations}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Overdue</p>
            <p className="text-2xl font-bold text-danger mt-2">
              {client.compliance_summary.overdue_count}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Approaching Deadlines</p>
            <p className="text-2xl font-bold text-warning mt-2">
              {client.compliance_summary.approaching_deadline_count}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

