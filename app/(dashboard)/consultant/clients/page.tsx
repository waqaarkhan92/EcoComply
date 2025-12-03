'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ConsultantClientsPage() {
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['consultant-clients'],
    queryFn: async (): Promise<{ data: Array<any> }> => {
      const response = await apiClient.get('/consultant/clients');
      return response.data as { data: Array<any> };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading clients...</div>
      </div>
    );
  }

  const clients = clientsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">My Clients</h1>
        <p className="text-text-secondary mt-2">
          Manage and view all your assigned client companies
        </p>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">No clients assigned yet</p>
          <p className="text-sm text-text-tertiary">
            Clients will appear here once they assign you to their company.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client: any) => (
            <Link
              key={client.client_company_id}
              href={`/consultant/clients/${client.client_company_id}`}
              className="bg-white rounded-lg shadow-base p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    {client.company_name}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {client.site_count} {client.site_count === 1 ? 'site' : 'sites'}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-text-tertiary flex-shrink-0" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Compliance Score</span>
                  <span className={`text-sm font-semibold ${
                    client.compliance_summary.compliance_score >= 0.9
                      ? 'text-success'
                      : client.compliance_summary.compliance_score >= 0.7
                      ? 'text-warning'
                      : 'text-danger'
                  }`}>
                    {Math.round(client.compliance_summary.compliance_score * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Total Obligations</span>
                  <span className="text-sm font-medium text-text-primary">
                    {client.compliance_summary.total_obligations}
                  </span>
                </div>

                {client.compliance_summary.overdue_count > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-input-border">
                    <AlertCircle className="h-4 w-4 text-danger" />
                    <span className="text-sm text-danger">
                      {client.compliance_summary.overdue_count} overdue
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-input-border">
                <span className="text-xs text-text-tertiary">
                  Assigned {new Date(client.assigned_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

