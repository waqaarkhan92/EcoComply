'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

interface Client {
  client_company_id: string;
  company_name: string;
  status: string;
  assigned_at: string;
  site_count: number;
  compliance_summary: {
    total_obligations: number;
    overdue_count: number;
    compliance_score: number;
  };
}

interface ClientsResponse {
  data: Client[];
}

export default function ConsultantClientsPage() {
  const { data: clientsData, isLoading } = useQuery<ClientsResponse>({
    queryKey: ['consultant-clients'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<ClientsResponse>('/consultant/clients');
    },
  });

  const clients = clientsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-gray-600 mt-1">Manage your assigned clients</p>
      </div>

      <div className="grid gap-6">
        {clients.map((client) => (
          <Link
            key={client.client_company_id}
            href={`/dashboard/consultant/clients/${client.client_company_id}`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Building2 className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.company_name}</h3>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sites:</span>
                      <span className="ml-2 font-medium">{client.site_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Obligations:</span>
                      <span className="ml-2 font-medium">{client.compliance_summary.total_obligations}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Compliance:</span>
                      <span className={`ml-2 font-medium ${
                        client.compliance_summary.compliance_score >= 0.9 ? 'text-green-600' :
                        client.compliance_summary.compliance_score >= 0.7 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(client.compliance_summary.compliance_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                client.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {client.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

