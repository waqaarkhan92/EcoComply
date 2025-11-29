'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Package } from 'lucide-react';
import Link from 'next/link';

interface ClientDetail {
  client_company_id: string;
  company_name: string;
  status: string;
  site_count: number;
  compliance_summary: {
    total_obligations: number;
    overdue_count: number;
    compliance_score: number;
  };
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const { data: clientData, isLoading } = useQuery<{ data: ClientDetail }>({
    queryKey: ['consultant-client', clientId],
    queryFn: async () => {
      return apiClient.get<{ data: ClientDetail }>(`/consultant/clients/${clientId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading client...</div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Client not found</div>
      </div>
    );
  }

  const client = clientData.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/consultant/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Client Details</h1>
            <p className="text-gray-600 mt-1">{client.company_name}</p>
          </div>
        </div>
        <Link href={`/dashboard/consultant/clients/${clientId}/packs`}>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            View Packs
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Company Name</label>
            <div className="mt-1 flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{client.company_name}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                client.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {client.status}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Sites</label>
            <div className="mt-1 text-sm text-gray-900">{client.site_count}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Total Obligations</label>
            <div className="mt-1 text-sm text-gray-900">{client.compliance_summary.total_obligations}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Overdue</label>
            <div className="mt-1 text-sm text-red-600">{client.compliance_summary.overdue_count}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Compliance Score</label>
            <div className="mt-1 text-sm font-medium text-gray-900">
              {(client.compliance_summary.compliance_score * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

